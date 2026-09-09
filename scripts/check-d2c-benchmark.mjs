#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillPath = ".claude/skills/d2c-benchmark/SKILL.md";
const scenariosPath = ".claude/skills/d2c-benchmark/references/scenarios.md";
const required = [
  skillPath,
  scenariosPath,
  ".claude/skills/d2c-benchmark/templates/pc-react-antd/package.json",
  ".claude/skills/d2c-benchmark/templates/mobile-vue-vant/package.json",
  ".claude/skills/d2c-benchmark/templates/review/index.html",
  ".claude/skills/d2c-benchmark/scripts/reset-latest.sh",
  ".claude/skills/d2c-benchmark/scripts/start-preview.sh",
];
const errors = [];

function absolute(relativePath) {
  return path.resolve(root, relativePath);
}

function isLocalMarkdownTarget(target) {
  return target
    && !target.startsWith("#")
    && !/^[a-z][a-z\d+.-]*:/iu.test(target)
    && !target.startsWith("//");
}

function markdownLinkTargets(markdown) {
  const targets = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;

  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    const target = rawTarget.startsWith("<")
      ? rawTarget.slice(1, rawTarget.indexOf(">"))
      : rawTarget.split(/\s+/u)[0];
    const pathTarget = target.split("#", 1)[0];

    if (isLocalMarkdownTarget(pathTarget)) {
      targets.push(pathTarget);
    }
  }

  return targets;
}

function checkRequiredFiles() {
  for (const relativePath of required) {
    const filePath = absolute(relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      errors.push(`missing required file: ${relativePath}`);
    }
  }
}

function checkLatestIsIgnored() {
  const gitignorePath = absolute(".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    errors.push("missing required file: .gitignore");
    return;
  }

  const ignored = fs.readFileSync(gitignorePath, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .some((line) => line === ".d2c-benchmark/latest/" || line === "/.d2c-benchmark/latest/");

  if (!ignored) {
    errors.push(".d2c-benchmark/latest/ must be ignored by Git");
  }
}

function checkDirectScenarioLink() {
  const filePath = absolute(skillPath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return;
  }

  const targets = markdownLinkTargets(fs.readFileSync(filePath, "utf8"));
  const expectedTarget = path.resolve(path.dirname(filePath), "references/scenarios.md");
  const hasDirectLink = targets.some((target) => (
    path.resolve(path.dirname(filePath), target) === expectedTarget
  ));

  if (!hasDirectLink) {
    errors.push(`${skillPath} must link directly to references/scenarios.md`);
  }
}

function checkScenarioReferenceDoesNotLinkToReference() {
  const filePath = absolute(scenariosPath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return;
  }

  const referenceDirectory = path.dirname(filePath);
  for (const target of markdownLinkTargets(fs.readFileSync(filePath, "utf8"))) {
    const resolved = path.resolve(referenceDirectory, target);
    const relativeTarget = path.relative(referenceDirectory, resolved);
    const remainsInReferenceDirectory = relativeTarget
      && !relativeTarget.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativeTarget);

    if (remainsInReferenceDirectory && path.extname(resolved).toLowerCase() === ".md") {
      errors.push(`${scenariosPath} must not link to another Reference: ${target}`);
    }
  }
}

checkRequiredFiles();
checkLatestIsIgnored();
checkDirectScenarioLink();
checkScenarioReferenceDoesNotLinkToReference();

if (errors.length > 0) {
  console.error("D2C Benchmark contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("D2C Benchmark contract passed.");
}
