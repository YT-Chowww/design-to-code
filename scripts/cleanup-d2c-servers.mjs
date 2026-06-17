#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const manifestArg = process.argv[2];
if (!manifestArg) {
  console.error("Usage: node scripts/cleanup-d2c-servers.mjs <manifest.json>");
  process.exit(2);
}
const manifestPath = path.resolve(manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const processes = manifest.runtimeProcesses ?? [];

function listeningPids(port) {
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
  return result.stdout.split(/\s+/).filter(Boolean).map(Number);
}

for (const entry of processes) {
  const pids = new Set([entry.pid, ...listeningPids(entry.port)].filter(Number.isFinite));
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}
await new Promise((resolve) => setTimeout(resolve, 400));
const remaining = processes.flatMap((entry) => listeningPids(entry.port).map((pid) => ({ port: entry.port, pid })));
if (remaining.length > 0) {
  for (const { pid } of remaining) {
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
const stillListening = processes.flatMap((entry) => listeningPids(entry.port).map((pid) => ({ port: entry.port, pid })));
if (stillListening.length > 0) {
  console.error(`D2C server cleanup failed: ${JSON.stringify(stillListening)}`);
  process.exit(1);
}
console.log(`OK cleaned ${processes.length} registered D2C server entries`);
