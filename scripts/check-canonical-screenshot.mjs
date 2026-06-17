#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { decodePng, encodePng } from "./lib/png-rgba.mjs";

const fixturePath = path.resolve(process.argv[2] ?? "docs/validation-fixtures/canonical-screenshot/dpr-2.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-canonical-"));
const paths = Object.fromEntries(["input", "reference", "actual", "diff"].map((name) => [name, path.join(directory, `${name}.png`)]));
const rgba = (colors) => Buffer.from(colors.flatMap((color) => color));
encodePng({ width: fixture.input.width, height: fixture.input.height, data: rgba(fixture.input.pixels) }, paths.input);
encodePng({ width: fixture.reference.width, height: fixture.reference.height, data: rgba(fixture.reference.pixels) }, paths.reference);
const result = spawnSync(process.execPath, [
  "scripts/capture-canonical-screenshot.mjs",
  `--input=${paths.input}`,
  `--reference=${paths.reference}`,
  `--rect=${fixture.rect.join(",")}`,
  `--dpr=${fixture.dpr}`,
  `--actual=${paths.actual}`,
  `--diff=${paths.diff}`
], { cwd: process.cwd(), encoding: "utf8" });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
const summary = JSON.parse(result.stdout);
const actual = decodePng(paths.actual);
if (summary.pixelRatio !== fixture.expected.pixelRatio || actual.width !== fixture.expected.width || actual.height !== fixture.expected.height) {
  console.error(`Canonical screenshot fixture failed: ${result.stdout}`);
  process.exit(1);
}
console.log(`OK ${path.relative(process.cwd(), fixturePath)} pixelRatio=${summary.pixelRatio}`);
