#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const suitePath = path.resolve(root, process.argv[2] ?? "docs/validation-fixtures/validation-suite.json");
const errors = [];
const results = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireFile(relativePath, scope) {
  const filePath = path.resolve(root, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${scope}: missing ${relativePath}`);
    return false;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    errors.push(`${scope}: empty or non-file ${relativePath}`);
    return false;
  }
  return true;
}

function runNode(script, fixture, scope, extraArgs = []) {
  requireFile(script, scope);
  requireFile(fixture, scope);

  const result = spawnSync(process.execPath, [script, fixture, ...extraArgs], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    errors.push(`${scope}: ${script} failed for ${fixture}${output ? `\n${output}` : ""}`);
    return;
  }

  results.push(`${scope}: ${script} ${fixture}`);
}

function checkStructure(testCase) {
  for (const relativePath of testCase.checks ?? []) {
    requireFile(relativePath, testCase.id);
  }

  const roadmap = fs.readFileSync(path.resolve(root, "docs/capability-roadmap.md"), "utf8");
  if (!roadmap.includes("## 8. 自动验证建设清单")) {
    errors.push(`${testCase.id}: roadmap is missing module 8`);
  }
  if (!roadmap.includes("scripts/check-validation-suite.mjs")) {
    errors.push(`${testCase.id}: roadmap must mention scripts/check-validation-suite.mjs`);
  }
}

function checkTemplateStatic(testCase) {
  for (const relativePath of testCase.checks ?? []) {
    requireFile(relativePath, testCase.id);
  }

  const packagePath = path.resolve(root, ".claude/skills/d2c-init/templates/preview/package.json");
  const packageJson = readJson(packagePath);
  for (const scriptName of ["dev", "build", "type-check"]) {
    if (typeof packageJson.scripts?.[scriptName] !== "string" || packageJson.scripts[scriptName].trim() === "") {
      errors.push(`${testCase.id}: preview package.json must define scripts.${scriptName}`);
    }
  }
  if (!isObject(packageJson.dependencies) || Object.keys(packageJson.dependencies).length === 0) {
    errors.push(`${testCase.id}: preview package.json must define dependencies`);
  }
  if (!isObject(packageJson.devDependencies) || Object.keys(packageJson.devDependencies).length === 0) {
    errors.push(`${testCase.id}: preview package.json must define devDependencies`);
  }
}

function checkProtocol(testCase) {
  for (const fixture of testCase.fixtures ?? []) {
    requireFile(fixture, testCase.id);
  }
  runNode("scripts/check-baseline-manifest.mjs", "docs/validation-fixtures/protocol/manifest.json", testCase.id, [
    "--expect-next-step=TARGET_VALIDATE"
  ]);
  runNode("scripts/check-extract-normalized.mjs", "docs/validation-fixtures/protocol/normalized.json", testCase.id);
  runNode("scripts/check-generate-decisions.mjs", "docs/validation-fixtures/protocol/generation-log.json", testCase.id);
  runNode("scripts/check-validate-report.mjs", "docs/validation-fixtures/protocol/preview-validation-report.json", testCase.id);
  runNode("scripts/check-verify-report.mjs", "docs/validation-fixtures/protocol/preview-verification-report.json", testCase.id);
  runNode("scripts/check-merge-report.mjs", "docs/validation-fixtures/protocol/merge-report.json", testCase.id);
}

function checkMockExtract(testCase) {
  requireFile(testCase.rawFixture, testCase.id);
  const raw = readJson(path.resolve(root, testCase.rawFixture));
  if (!isObject(raw.nodes) || Object.keys(raw.nodes).length === 0) {
    errors.push(`${testCase.id}: rawFixture must include nodes`);
  }
  runNode("scripts/check-extract-normalized.mjs", testCase.normalizedFixture, testCase.id);
}

function checkMockGenerate(testCase) {
  runNode("scripts/check-extract-normalized.mjs", testCase.inputFixture, testCase.id);
  runNode("scripts/check-generate-decisions.mjs", testCase.outputFixture, testCase.id);
}

function checkMockMerge(testCase) {
  runNode("scripts/check-generate-decisions.mjs", testCase.inputFixture, testCase.id);
  runNode("scripts/check-merge-report.mjs", testCase.outputFixture, testCase.id);
}

function checkSkillEval(testCase) {
  requireFile(testCase.fixture, testCase.id);
  const fixture = readJson(path.resolve(root, testCase.fixture));
  if (!Array.isArray(fixture.skills) || fixture.skills.length === 0) {
    errors.push(`${testCase.id}: fixture.skills must be a non-empty array`);
    return;
  }

  for (const skill of fixture.skills) {
    if (typeof skill.name !== "string" || skill.name.trim() === "") {
      errors.push(`${testCase.id}: each skill must have a name`);
      continue;
    }
    requireFile(`.claude/skills/${skill.name}/SKILL.md`, testCase.id);
    if (!Array.isArray(skill.requiredArtifacts) || skill.requiredArtifacts.length === 0) {
      errors.push(`${testCase.id}: ${skill.name}.requiredArtifacts must be non-empty`);
    }
  }
}

function checkRealFigmaRegistry(testCase) {
  runNode("scripts/check-figma-examples.mjs", testCase.fixture, testCase.id);
  const registry = readJson(path.resolve(root, testCase.fixture));
  const registered = registry.examples?.filter((example) => example.roadmapStatus === "[>]") ?? [];
  if (registered.length === 0) {
    errors.push(`${testCase.id}: registry must include at least one [>] example`);
  }
  if (!registered.some((example) => example.targetProjectRequired === true)) {
    errors.push(`${testCase.id}: registry should include target-project-required examples`);
  }
}

function checkVisualRegression(testCase) {
  runNode("scripts/check-verify-report.mjs", testCase.fixture, testCase.id);
  const report = readJson(path.resolve(root, testCase.fixture));
  if (!Array.isArray(report.diff?.regions) || report.diff.regions.length === 0) {
    errors.push(`${testCase.id}: visual fixture must include diff.regions`);
  }
  const breakpoints = new Set((report.screenshots ?? []).map((item) => item.breakpoint));
  for (const breakpoint of ["desktop", "tablet", "mobile"]) {
    if (!breakpoints.has(breakpoint)) {
      errors.push(`${testCase.id}: visual fixture must include ${breakpoint}`);
    }
  }
}

function checkDegraded(testCase) {
  for (const fixture of testCase.fixtures ?? []) {
    requireFile(fixture, testCase.id);
  }
  runNode("scripts/check-extract-normalized.mjs", "docs/validation-fixtures/degraded/image-fallback-normalized.json", testCase.id);
  runNode("scripts/check-verify-report.mjs", "docs/validation-fixtures/degraded/chrome-mcp-skipped-verification.json", testCase.id);
  runNode("scripts/check-validate-report.mjs", "docs/validation-fixtures/degraded/target-build-degraded-validation.json", testCase.id);
}

function validateCase(testCase) {
  if (!isObject(testCase)) {
    errors.push("suite.cases must contain objects");
    return;
  }
  for (const field of ["id", "roadmapItem", "status", "kind"]) {
    if (typeof testCase[field] !== "string" || testCase[field].trim() === "") {
      errors.push(`case is missing ${field}`);
    }
  }
  if (testCase.status !== "[>]") {
    errors.push(`${testCase.id}: module 8 suite cases must be [>] until real validation upgrades them`);
  }
  if (typeof testCase.requiresFigma !== "boolean") {
    errors.push(`${testCase.id}: requiresFigma must be boolean`);
  }
  if (typeof testCase.requiresTargetProject !== "boolean") {
    errors.push(`${testCase.id}: requiresTargetProject must be boolean`);
  }

  switch (testCase.kind) {
    case "structure":
      checkStructure(testCase);
      break;
    case "template-static":
      checkTemplateStatic(testCase);
      break;
    case "protocol":
      checkProtocol(testCase);
      break;
    case "mock-extract":
      checkMockExtract(testCase);
      break;
    case "mock-generate":
      checkMockGenerate(testCase);
      break;
    case "mock-merge":
      checkMockMerge(testCase);
      break;
    case "skill-eval":
      checkSkillEval(testCase);
      break;
    case "real-figma-registry":
      checkRealFigmaRegistry(testCase);
      break;
    case "visual-regression":
      checkVisualRegression(testCase);
      break;
    case "degraded":
      checkDegraded(testCase);
      break;
    default:
      errors.push(`${testCase.id}: unsupported kind ${testCase.kind}`);
  }
}

let suite;
try {
  suite = readJson(suitePath);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!isObject(suite)) {
  errors.push("suite root must be an object");
} else {
  if (suite.version !== 1) {
    errors.push("suite.version must be 1");
  }
  if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
    errors.push("suite.cases must be a non-empty array");
  } else {
    suite.cases.forEach(validateCase);
  }
}

if (errors.length > 0) {
  console.error(`Validation suite check failed: ${path.relative(root, suitePath)}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`OK ${path.relative(root, suitePath)}`);
for (const result of results) {
  console.log(`- ${result}`);
}
