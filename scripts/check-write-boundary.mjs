#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  return Object.fromEntries(argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }));
}

function normalize(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function matches(filePath, pattern) {
  const normalizedPattern = normalize(pattern);
  return normalizedPattern.endsWith("/")
    ? filePath.startsWith(normalizedPattern)
    : filePath === normalizedPattern || filePath.startsWith(`${normalizedPattern}/`);
}

const args = parseArgs(process.argv);
if (!args.manifest) {
  console.error("Usage: node scripts/check-write-boundary.mjs --manifest=<manifest.json> [--root=<git-root>]");
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(path.resolve(args.manifest), "utf8"));
const root = path.resolve(args.root ?? manifest.input?.targetDirectory ?? process.cwd());
const gitRootResult = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8" });
if (gitRootResult.status !== 0) {
  throw new Error(gitRootResult.stderr || "git rev-parse failed");
}
const rootPrefix = normalize(path.relative(gitRootResult.stdout.trim(), root));
const status = spawnSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, encoding: "utf8" });
if (status.status !== 0) {
  throw new Error(status.stderr || "git status failed");
}
const current = status.stdout.split("\n").filter(Boolean);
const baseline = new Set(manifest.writeBoundary?.baselineStatus ?? []);
const changed = current
  .filter((line) => !baseline.has(line))
  .map((line) => normalize(line.slice(3)))
  .map((filePath) => rootPrefix && filePath.startsWith(`${rootPrefix}/`) ? filePath.slice(rootPrefix.length + 1) : filePath);
const allow = manifest.writeBoundary?.allow ?? [];
const deny = manifest.writeBoundary?.deny ?? [
  ".mcp.json",
  "config/routes.ts",
  "src/api/",
  "src/services/",
  "src/store/",
  "src/hooks/"
];
const errors = [];
for (const filePath of changed) {
  if (deny.some((pattern) => matches(filePath, pattern))) {
    errors.push(`${filePath} matches deny list`);
  } else if (!allow.some((pattern) => matches(filePath, pattern))) {
    errors.push(`${filePath} is outside allow list`);
  }
}
if (errors.length > 0) {
  console.error("Write boundary check failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`OK write boundary: ${changed.length} new paths inside allow list`);
