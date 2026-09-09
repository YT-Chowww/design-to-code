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

function checkBenchmarkInstructions() {
  const skillFile = absolute(skillPath);
  const scenariosFile = absolute(scenariosPath);

  if (!fs.existsSync(skillFile) || !fs.existsSync(scenariosFile)) {
    return;
  }

  const skill = fs.readFileSync(skillFile, "utf8");
  const scenarios = fs.readFileSync(scenariosFile, "utf8");
  const requiredSkillMarkers = [
    "reset-latest.sh",
    "start-preview.sh",
    ".d2c-benchmark/latest/",
    "http://127.0.0.1:4172",
    "Figma MCP",
    "ECharts",
    "本地模拟数据",
    "四个节点",
    "四张参考图",
    "单场景",
    "用户自行判断",
  ];

  for (const marker of requiredSkillMarkers) {
    if (!skill.includes(marker)) {
      errors.push(`${skillPath} must encode Benchmark workflow marker: ${marker}`);
    }
  }

  const expectedRows = [
    ["pc-data", "h6yGJDAcQ4vX3fO93nYCLh", "node-id=320-13867", "width 1400, content height", "/data-management", "React + Ant Design"],
    ["pc-chart", "Ln2fBahqlpYrUZmwQG4vNy", "node-id=212-8232", "500 × 320", "/chart-analytics", "React + Ant Design + ECharts"],
    ["mobile-content", "oKc2utjTB5orau6YuvPi4r", "node-id=240-6278", "375 × 812", "/content-display", "Vue 3 + Vant"],
    ["mobile-form", "oKc2utjTB5orau6YuvPi4r", "node-id=267-5066", "375 × 812", "/form-interaction", "Vue 3 + Vant"],
  ];

  for (const row of expectedRows) {
    for (const value of row) {
      if (!scenarios.includes(value)) {
        errors.push(`${scenariosPath} must contain fixed scenario value: ${value}`);
      }
    }
  }

  for (const interaction of ["tabs", "table controls", "tooltip", "legend", "next-button", "login field", "login button"]) {
    if (!scenarios.toLowerCase().includes(interaction)) {
      errors.push(`${scenariosPath} must define visible interaction: ${interaction}`);
    }
  }

  if (!scenarios.includes("500 × 320") || !scenarios.includes("真实 React 路由")) {
    errors.push(`${scenariosPath} must preserve the pc-chart component-scope ruling`);
  }
}

function checkActiveDocumentation() {
  for (const documentationPath of ["README.md", "CLAUDE.md"]) {
    const content = fs.readFileSync(absolute(documentationPath), "utf8");
    for (const marker of ["d2c-benchmark", ".d2c-benchmark/latest/", "4172", "4173", "4174"]) {
      if (!content.includes(marker)) {
        errors.push(`${documentationPath} must document Benchmark marker: ${marker}`);
      }
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
    const traversalParent = path.join(temporaryParent, "traversal-parent");
    const traversalChild = path.join(traversalParent, "child");
    const traversalMarker = path.join(traversalParent, "parent-marker.txt");
    fs.mkdirSync(traversalChild, { recursive: true });
    fs.writeFileSync(traversalMarker, "must survive\n");
    const traversal = spawnSync("bash", [script, `${traversalChild}${path.sep}..`], {
      cwd: root,
      encoding: "utf8",
    });
    if (traversal.status === 0 || !fs.existsSync(traversalMarker)) {
      errors.push(`${resetScriptPath} must reject child/.. without replacing its parent`);
    }

    const dotParent = path.join(temporaryParent, "dot-parent");
    fs.mkdirSync(dotParent, { recursive: true });
    const dotted = spawnSync("bash", [script, `${dotParent}${path.sep}.${path.sep}latest`], {
      cwd: root,
      encoding: "utf8",
    });
    if (dotted.status === 0 || fs.existsSync(path.join(dotParent, "latest"))) {
      errors.push(`${resetScriptPath} must reject explicit dot path components`);
    }

    const duplicateParent = path.join(temporaryParent, "duplicate-parent");
    fs.mkdirSync(duplicateParent);
    const duplicateTarget = `${temporaryParent}${path.sep}${path.sep}duplicate-parent${path.sep}${path.sep}latest${path.sep}`;
    const duplicate = spawnSync("bash", [script, duplicateTarget], {
      cwd: root,
      encoding: "utf8",
    });
    if (duplicate.status !== 0 || !fs.existsSync(path.join(duplicateParent, "latest/review"))) {
      errors.push(`${resetScriptPath} must preserve a safe explicit leaf across duplicate or trailing separators`);
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
  const temporaryParent = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-preview-safety-"));
  const fakeBin = path.join(temporaryParent, "bin");
  const externalMutationMarker = path.join(temporaryParent, "external-mutated.txt");
  const externalReview = path.join(temporaryParent, "external-review");
  const externalReviewLink = path.join(externalReview, "references");
  const testEnvironment = {
    ...process.env,
    D2C_EXTERNAL_LINK: externalReviewLink,
    D2C_MUTATION_MARKER: externalMutationMarker,
  };

  function writeExecutable(name, content) {
    const executable = path.join(fakeBin, name);
    fs.writeFileSync(executable, content, { mode: 0o755 });
    return executable;
  }

  function createWorkspace(name) {
    const workspace = path.join(temporaryParent, name);
    for (const directory of ["pc", "mobile", "review", "references"]) {
      fs.mkdirSync(path.join(workspace, directory), { recursive: true });
    }
    for (const application of ["pc", "mobile"]) {
      const vite = path.join(workspace, application, "node_modules/vite/bin/vite.js");
      fs.mkdirSync(path.dirname(vite), { recursive: true });
      fs.writeFileSync(vite, "// isolated validation fixture\n");
    }
    return workspace;
  }

  try {
    fs.mkdirSync(fakeBin);
    writeExecutable("node", "#!/bin/sh\nif [ -L \"$D2C_EXTERNAL_LINK\" ]; then touch \"$D2C_MUTATION_MARKER\"; fi\nexit 1\n");
    writeExecutable("python3", "#!/bin/sh\nexit 1\n");
    writeExecutable("curl", "#!/bin/sh\nexit 0\n");
    testEnvironment.PATH = `${fakeBin}${path.delimiter}${process.env.PATH}`;

    const invalid = spawnSync("bash", [scriptPath, temporaryParent], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
    });
    if (invalid.status === 0) {
      errors.push(`${startScriptPath} must reject an invalid isolated workspace`);
    }

    const symlinkWorkspace = createWorkspace("symlink-child");
    const externalPc = path.join(temporaryParent, "external-pc");
    fs.renameSync(path.join(symlinkWorkspace, "pc"), externalPc);
    fs.symlinkSync(externalPc, path.join(symlinkWorkspace, "pc"), "dir");
    const symlinkChild = spawnSync("bash", [scriptPath, symlinkWorkspace], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
    });
    if (symlinkChild.status !== 2 || !symlinkChild.stderr.includes("Unsafe workspace child")) {
      errors.push(`${startScriptPath} must reject a symlinked workspace child before launch`);
    }

    const escapedExecutableWorkspace = createWorkspace("escaped-executable");
    const pcVite = path.join(escapedExecutableWorkspace, "pc/node_modules/vite/bin/vite.js");
    const externalVite = path.join(temporaryParent, "external-vite.js");
    fs.writeFileSync(externalVite, "// must never execute\n");
    fs.rmSync(pcVite);
    fs.symlinkSync(externalVite, pcVite);
    const escapedExecutable = spawnSync("bash", [scriptPath, escapedExecutableWorkspace], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
    });
    if (escapedExecutable.status !== 2 || !escapedExecutable.stderr.includes("Unsafe Vite executable")) {
      errors.push(`${startScriptPath} must reject a Vite executable escaping its application directory`);
    }

    const crossedExecutableWorkspace = createWorkspace("crossed-executable");
    const crossedPcNodeModules = path.join(crossedExecutableWorkspace, "pc/node_modules");
    fs.rmSync(crossedPcNodeModules, { recursive: true });
    fs.symlinkSync(path.join(crossedExecutableWorkspace, "mobile/node_modules"), crossedPcNodeModules, "dir");
    const crossedExecutable = spawnSync("bash", [scriptPath, crossedExecutableWorkspace], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
    });
    if (crossedExecutable.status !== 2 || !crossedExecutable.stderr.includes("Unsafe Vite executable")) {
      errors.push(`${startScriptPath} must keep each Vite executable inside its own application directory`);
    }

    const externalReviewWorkspace = createWorkspace("external-review-workspace");
    fs.mkdirSync(externalReview);
    fs.rmSync(path.join(externalReviewWorkspace, "review"), { recursive: true });
    fs.symlinkSync(externalReview, path.join(externalReviewWorkspace, "review"), "dir");
    const externalReviewResult = spawnSync("bash", [scriptPath, externalReviewWorkspace], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
    });
    if (
      externalReviewResult.status !== 2
      || !externalReviewResult.stderr.includes("Unsafe workspace child")
      || fs.existsSync(externalMutationMarker)
    ) {
      errors.push(`${startScriptPath} must reject an external review directory without mutating it`);
    }
  } finally {
    fs.rmSync(temporaryParent, { recursive: true, force: true });
  }
}

checkRequiredFiles();
checkLatestIsIgnored();
checkDirectScenarioLink();
checkScenarioReferenceDoesNotLinkToReference();
checkBenchmarkInstructions();
checkActiveDocumentation();
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
