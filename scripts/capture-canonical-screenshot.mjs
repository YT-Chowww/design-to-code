#!/usr/bin/env node

import path from "node:path";
import { cropAndResize, createDiff, decodePng, encodePng } from "./lib/png-rgba.mjs";

function args(argv) {
  return Object.fromEntries(argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }));
}

const options = args(process.argv);
for (const field of ["input", "reference", "rect", "dpr", "actual", "diff"]) {
  if (!options[field]) {
    console.error("Usage: node scripts/capture-canonical-screenshot.mjs --input=<viewport.png> --reference=<reference.png> --rect=<x,y,width,height> --dpr=<number> --actual=<actual.png> --diff=<diff.png>");
    process.exit(2);
  }
}
const values = options.rect.split(",").map(Number);
const dpr = Number(options.dpr);
if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || !Number.isFinite(dpr) || dpr <= 0) {
  throw new Error("--rect and --dpr must contain finite positive values");
}
const [x, y, width, height] = values;
const tolerance = Number(options.tolerance ?? 16);
const reference = decodePng(path.resolve(options.reference));
const input = decodePng(path.resolve(options.input));
const actual = cropAndResize(input, { x, y, width, height }, reference.width, reference.height, dpr);
for (const image of [reference, actual]) {
  for (let index = 0; index < image.width * image.height; index += 1) {
    const offset = index * 4;
    const alpha = image.data[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      image.data[offset + channel] = Math.round(image.data[offset + channel] * alpha + 255 * (1 - alpha));
    }
    image.data[offset + 3] = 255;
  }
}
const diff = createDiff(reference, actual, tolerance);
encodePng(actual, path.resolve(options.actual));
encodePng(diff, path.resolve(options.diff));
console.log(JSON.stringify({
  input: { width: input.width, height: input.height },
  cropCssRect: { x, y, width, height },
  dpr,
  tolerance,
  output: { width: actual.width, height: actual.height },
  reference: { width: reference.width, height: reference.height },
  changedPixels: diff.changedPixels,
  totalPixels: diff.totalPixels,
  pixelRatio: diff.pixelRatio
}, null, 2));
