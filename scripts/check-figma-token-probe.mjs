#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fixturePath = path.resolve(root, process.argv[2] ?? "docs/validation-fixtures/figma-token-probe/scenarios.json");
const scenarios = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const errors = [];

for (const scenario of scenarios.scenarios ?? []) {
  const scenarioPath = path.resolve(os.tmpdir(), `d2c-${scenario.id}.json`);
  fs.writeFileSync(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`);
  const result = spawnSync(process.execPath, ["scripts/probe-figma-token.mjs", `--fixture=${scenarioPath}`], {
    cwd: root,
    encoding: "utf8"
  });
  fs.unlinkSync(scenarioPath);

  if (result.status !== 0) {
    errors.push(`${scenario.id}: probe failed\n${result.stderr}`);
    continue;
  }

  const output = JSON.parse(result.stdout);
  if (result.stdout.includes(scenario.config.mcpServers.figma.args[2])) {
    errors.push(`${scenario.id}: output leaked the token`);
  }
  for (const [key, expected] of Object.entries(scenario.expected ?? {})) {
    const actual = key.split(".").reduce((value, part) => value?.[part], output);
    if (actual !== expected) {
      errors.push(`${scenario.id}: expected ${key}=${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Figma token probe regression check failed");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`OK ${path.relative(root, fixturePath)}`);
