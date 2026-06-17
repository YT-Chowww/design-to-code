import fs from "node:fs";
import zlib from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(filePath) {
  const png = fs.readFileSync(filePath);
  if (!png.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error(`Not a PNG file: ${filePath}`);
  }
  let offset = 8;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let palette;
  let transparency;
  const dataChunks = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error("Interlaced PNG files are not supported");
    } else if (type === "PLTE") {
      palette = data;
    } else if (type === "tRNS") {
      transparency = data;
    } else if (type === "IDAT") {
      dataChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8 || ![0, 2, 3, 4, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth} colorType=${colorType}`);
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const rowBytes = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(dataChunks));
  const raw = Buffer.alloc(rowBytes * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset++];
    for (let x = 0; x < rowBytes; x += 1) {
      const value = inflated[sourceOffset++];
      const left = x >= channels ? raw[y * rowBytes + x - channels] : 0;
      const up = y > 0 ? raw[(y - 1) * rowBytes + x] : 0;
      const upperLeft = y > 0 && x >= channels ? raw[(y - 1) * rowBytes + x - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3
        ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : null;
      if (predictor === null) throw new Error(`Unsupported PNG filter: ${filter}`);
      raw[y * rowBytes + x] = (value + predictor) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const source = index * channels;
    const target = index * 4;
    if (colorType === 0) {
      rgba.fill(raw[source], target, target + 3);
      rgba[target + 3] = 255;
    } else if (colorType === 2) {
      rgba[target] = raw[source];
      rgba[target + 1] = raw[source + 1];
      rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = 255;
    } else if (colorType === 3) {
      const paletteIndex = raw[source];
      rgba[target] = palette?.[paletteIndex * 3] ?? 0;
      rgba[target + 1] = palette?.[paletteIndex * 3 + 1] ?? 0;
      rgba[target + 2] = palette?.[paletteIndex * 3 + 2] ?? 0;
      rgba[target + 3] = transparency?.[paletteIndex] ?? 255;
    } else if (colorType === 4) {
      rgba.fill(raw[source], target, target + 3);
      rgba[target + 3] = raw[source + 1];
    } else {
      raw.copy(rgba, target, source, source + 4);
    }
  }
  return { width, height, data: rgba };
}

export function encodePng({ width, height, data }, filePath) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * width * 4;
    const targetOffset = y * (width * 4 + 1);
    raw[targetOffset] = 0;
    data.copy(raw, targetOffset + 1, sourceOffset, sourceOffset + width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  fs.writeFileSync(filePath, Buffer.concat([
    SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

export function cropAndResize(image, rect, width, height, dpr) {
  const sourceX = Math.round(rect.x * dpr);
  const sourceY = Math.round(rect.y * dpr);
  const sourceWidth = Math.round(rect.width * dpr);
  const sourceHeight = Math.round(rect.height * dpr);
  if (sourceX < 0 || sourceY < 0 || sourceX + sourceWidth > image.width || sourceY + sourceHeight > image.height) {
    throw new Error("Crop rectangle exceeds input image bounds");
  }
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const inputX = sourceX + Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / width));
      const inputY = sourceY + Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / height));
      image.data.copy(data, (y * width + x) * 4, (inputY * image.width + inputX) * 4, (inputY * image.width + inputX) * 4 + 4);
    }
  }
  return { width, height, data };
}

export function createDiff(reference, actual, tolerance = 16) {
  if (reference.width !== actual.width || reference.height !== actual.height) {
    throw new Error("Reference and actual images must have the same dimensions");
  }
  const data = Buffer.alloc(reference.data.length);
  let changedPixels = 0;
  for (let index = 0; index < reference.width * reference.height; index += 1) {
    const offset = index * 4;
    const changed = reference.data.subarray(offset, offset + 4).some((value, channel) => Math.abs(value - actual.data[offset + channel]) > tolerance);
    if (changed) {
      changedPixels += 1;
      data[offset] = 255;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 255;
    } else {
      const gray = Math.round((reference.data[offset] + reference.data[offset + 1] + reference.data[offset + 2]) / 3);
      data[offset] = gray;
      data[offset + 1] = gray;
      data[offset + 2] = gray;
      data[offset + 3] = 80;
    }
  }
  const totalPixels = reference.width * reference.height;
  return { width: reference.width, height: reference.height, data, changedPixels, totalPixels, pixelRatio: changedPixels / totalPixels };
}
