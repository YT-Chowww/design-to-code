#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const skillPath = ".claude/skills/d2c-benchmark/SKILL.md";
const scenariosPath = ".claude/skills/d2c-benchmark/references/scenarios.md";
const pcTemplatePath = ".claude/skills/d2c-benchmark/templates/pc-react-antd";
const mobileTemplatePath = ".claude/skills/d2c-benchmark/templates/mobile-vue-vant";
const reviewTemplatePath = ".claude/skills/d2c-benchmark/templates/review";
const resetScriptPath = ".claude/skills/d2c-benchmark/scripts/reset-latest.sh";
const startScriptPath = ".claude/skills/d2c-benchmark/scripts/start-preview.sh";
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

function checkReviewTemplate() {
  const indexPath = path.join(reviewTemplatePath, "index.html");
  const stylePath = path.join(reviewTemplatePath, "style.css");
  const appPath = path.join(reviewTemplatePath, "app.js");

  if (![indexPath, stylePath, appPath].every((file) => fs.existsSync(absolute(file)))) {
    return;
  }

  const index = fs.readFileSync(absolute(indexPath), "utf8");
  const style = fs.readFileSync(absolute(stylePath), "utf8");
  const app = fs.readFileSync(absolute(appPath), "utf8");
  const expectedScenarios = [
    ["pc-data", "references/pc-data.png", "http://127.0.0.1:4173/data-management"],
    ["pc-chart", "references/pc-chart.png", "http://127.0.0.1:4173/chart-analytics"],
    ["mobile-content", "references/mobile-content.png", "http://127.0.0.1:4174/content-display"],
    ["mobile-form", "references/mobile-form.png", "http://127.0.0.1:4174/form-interaction"],
  ];
  const declaredScenarioIds = [...app.matchAll(/^\s*\[['"]([^'"]+)['"],/gmu)]
    .map((match) => match[1]);
  const expectedScenarioIds = expectedScenarios.map(([id]) => id);
  if (JSON.stringify(declaredScenarioIds) !== JSON.stringify(expectedScenarioIds)) {
    errors.push(`${appPath} must declare exactly the four stable scenario IDs in order`);
  }

  for (const scenario of expectedScenarios) {
    for (const value of scenario) {
      if (!app.includes(value)) {
        errors.push(`${appPath} must contain stable scenario value: ${value}`);
      }
    }
  }

  if (!index.includes("app.js") || !index.includes("style.css")) {
    errors.push(`${indexPath} must load the review application and stylesheet`);
  }
  const rendersImage = /<img\b/iu.test(app) || /createElement\(["']img["']\)/u.test(app);
  const rendersFrame = /<iframe\b/iu.test(app) || /createElement\(["']iframe["']\)/u.test(app);
  if (!rendersImage || !rendersFrame) {
    errors.push(`${appPath} must render a Figma image and a real-page iframe`);
  }
  if (!/overflow\s*:\s*auto/iu.test(style)) {
    errors.push(`${stylePath} must provide independently scrollable panes`);
  }
  if (!/(onerror|addEventListener\(["']error)/u.test(app) || !/error/iu.test(app)) {
    errors.push(`${appPath} must display per-scenario load errors`);
  }
  if (/\b(score|threshold|ranking|classification)\b/iu.test(`${index}\n${app}`)) {
    errors.push(`${reviewTemplatePath} must not calculate or display model evaluation`);
  }
}

function checkResetScriptBehavior() {
  const script = absolute(resetScriptPath);
  if (!fs.existsSync(script)) {
    return;
  }

  const temporaryParent = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-benchmark-check-"));
  const target = path.join(temporaryParent, "latest");

  try {
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "stale.txt"), "remove me\n");
    const reset = spawnSync("bash", [script, target], { cwd: root, encoding: "utf8" });
    if (reset.status !== 0) {
      errors.push(`${resetScriptPath} failed for an explicit temporary target: ${reset.stderr.trim()}`);
      return;
    }

    const entries = fs.readdirSync(target, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const expected = ["mobile", "pc", "references", "review"];
    if (JSON.stringify(entries) !== JSON.stringify(expected)) {
      errors.push(`${resetScriptPath} must create exactly pc/mobile/review/references directories`);
    }
    if (fs.existsSync(path.join(target, "stale.txt"))) {
      errors.push(`${resetScriptPath} must replace the validated target`);
    }

    const noTarget = spawnSync("bash", [script], { cwd: root, encoding: "utf8" });
    if (noTarget.status === 0) {
      errors.push(`${resetScriptPath} must reject a missing target`);
    }
    const repoRoot = spawnSync("bash", [script, root], { cwd: root, encoding: "utf8" });
    if (repoRoot.status === 0) {
      errors.push(`${resetScriptPath} must reject the repository root`);
    }
    for (const unsafeTarget of ["/", os.homedir(), "/Applications/d2c-benchmark-outside-check"]) {
      const unsafe = spawnSync("bash", [script, unsafeTarget], { cwd: root, encoding: "utf8" });
      if (unsafe.status === 0) {
        errors.push(`${resetScriptPath} must reject unsafe target: ${unsafeTarget}`);
      }
    }
  } finally {
    fs.rmSync(temporaryParent, { recursive: true, force: true });
  }
}

function checkStartScript() {
  const scriptPath = absolute(startScriptPath);
  if (!fs.existsSync(scriptPath)) {
    return;
  }
  const script = fs.readFileSync(scriptPath, "utf8");
  for (const port of ["4172", "4173", "4174"]) {
    if (!script.includes(port)) {
      errors.push(`${startScriptPath} must use port ${port}`);
    }
  }
  if (!/trap\s+[^\n]*(INT|TERM)/u.test(script) || !/kill/u.test(script) || !/wait/u.test(script)) {
    errors.push(`${startScriptPath} must forward termination and clean up child processes`);
  }
  if (!/review_reference_link/u.test(script) || !/ln\s+-s/u.test(script)) {
    errors.push(`${startScriptPath} must expose sibling references at the review server root`);
  }
  if (/curl\s+-[^\n]*f/u.test(script)) {
    errors.push(`${startScriptPath} must not stop all review services for one scenario HTTP error`);
  }
  const invalid = spawnSync("bash", [scriptPath, root], { cwd: root, encoding: "utf8" });
  if (invalid.status === 0) {
    errors.push(`${startScriptPath} must reject an invalid workspace`);
  }
}

checkRequiredFiles();
checkLatestIsIgnored();
checkDirectScenarioLink();
checkScenarioReferenceDoesNotLinkToReference();
checkPcTemplate();
checkMobileTemplate();
checkReviewTemplate();
checkResetScriptBehavior();
checkStartScript();

if (errors.length > 0) {
  console.error("D2C Benchmark contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("D2C Benchmark contract passed.");
}
