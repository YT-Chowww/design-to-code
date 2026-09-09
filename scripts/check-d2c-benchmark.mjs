#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillPath = ".claude/skills/d2c-benchmark/SKILL.md";
const scenariosPath = ".claude/skills/d2c-benchmark/references/scenarios.md";
const pcTemplatePath = ".claude/skills/d2c-benchmark/templates/pc-react-antd";
const mobileTemplatePath = ".claude/skills/d2c-benchmark/templates/mobile-vue-vant";
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

function checkPcTemplate() {
  const packagePath = path.join(pcTemplatePath, "package.json");
  const appPath = path.join(pcTemplatePath, "src/App.tsx");

  if (!fs.existsSync(absolute(packagePath))) {
    return;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(absolute(packagePath), "utf8"));
  } catch (error) {
    errors.push(`invalid JSON: ${packagePath} (${error.message})`);
    return;
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const dependency of ["react", "react-dom", "antd", "echarts"]) {
    if (!dependencies[dependency]) {
      errors.push(`${packagePath} must declare ${dependency}`);
    }
  }

  if (dependencies["react-router"] || dependencies["react-router-dom"]) {
    errors.push(`${packagePath} must not add React Router`);
  }

  if (!fs.existsSync(absolute(appPath))) {
    errors.push(`missing required file: ${appPath}`);
    return;
  }

  const app = fs.readFileSync(absolute(appPath), "utf8");
  for (const route of ["/data-management", "/chart-analytics"]) {
    if (!app.includes(route)) {
      errors.push(`${appPath} must expose route: ${route}`);
    }
  }
}

function checkMobileTemplate() {
  const packagePath = path.join(mobileTemplatePath, "package.json");
  const appPath = path.join(mobileTemplatePath, "src/App.vue");
  const indexPath = path.join(mobileTemplatePath, "index.html");

  if (!fs.existsSync(absolute(packagePath))) {
    return;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(absolute(packagePath), "utf8"));
  } catch (error) {
    errors.push(`invalid JSON: ${packagePath} (${error.message})`);
    return;
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const dependency of ["vue", "vant", "echarts"]) {
    if (!dependencies[dependency]) {
      errors.push(`${packagePath} must declare ${dependency}`);
    }
  }

  if (dependencies["vue-router"]) {
    errors.push(`${packagePath} must not add Vue Router`);
  }

  if (!fs.existsSync(absolute(appPath))) {
    errors.push(`missing required file: ${appPath}`);
  } else {
    const app = fs.readFileSync(absolute(appPath), "utf8");
    for (const route of ["/content-display", "/form-interaction"]) {
      if (!app.includes(route)) {
        errors.push(`${appPath} must expose route: ${route}`);
      }
    }
  }

  if (!fs.existsSync(absolute(indexPath))) {
    errors.push(`missing required file: ${indexPath}`);
  } else {
    const index = fs.readFileSync(absolute(indexPath), "utf8");
    if (!/<meta\s+[^>]*name=["']viewport["'][^>]*>/iu.test(index)) {
      errors.push(`${indexPath} must declare viewport metadata`);
    }
  }
}

checkRequiredFiles();
checkLatestIsIgnored();
checkDirectScenarioLink();
checkScenarioReferenceDoesNotLinkToReference();
checkPcTemplate();
checkMobileTemplate();

if (errors.length > 0) {
  console.error("D2C Benchmark contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("D2C Benchmark contract passed.");
}
