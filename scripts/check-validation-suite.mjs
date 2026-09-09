#!/usr/bin/env node

import { spawnSync } from "node:child_process";

console.log("Legacy artifact validation is archived; running the active lightweight D2C contract instead.");

const result = spawnSync(process.execPath, ["scripts/check-lightweight-d2c.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "inherit",
});

process.exitCode = result.status ?? 1;
