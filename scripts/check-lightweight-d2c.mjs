#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const required = [
  ".claude/skills/d2c/SKILL.md",
  ".claude/skills/d2c/references/provider-official.md",
  ".claude/skills/d2c/references/provider-context-mcp.md",
  ".claude/skills/d2c/references/project-analysis-guide.md",
  ".claude/skills/d2c/references/visual-review.md",
  ".claude/skills/d2c/templates/D2C.md",
];

const retired = [
  ".claude/skills/d2c-init",
  ".claude/skills/d2c-extract",
  ".claude/skills/d2c-generate",
  ".claude/skills/d2c-merge",
  ".claude/skills/d2c-validate",
  ".claude/skills/d2c-verify",
];

const root = process.cwd();
const skillPath = ".claude/skills/d2c/SKILL.md";
const referencesDirectory = ".claude/skills/d2c/references";
const forbiddenTemplateTerms = ["Ant Design", "Vant", "E-Space", "React", "Vue"];
const activeRepositoryDocuments = ["README.md", "CLAUDE.md", "package.json"];
const forbiddenLegacyLanguage = [
  { label: "runId", pattern: /\brunId\b/u },
  { label: "manifest.json", pattern: /manifest\.json/iu },
  { label: "normalized design", pattern: /normalized\s+(?:design|artifact|JSON)|标准化设计/iu },
  { label: "/d2c-init", pattern: /\/d2c-init\b/iu },
  { label: "90% threshold", pattern: /\b90\s*%/u },
  {
    label: "automatic Provider degradation",
    pattern: /(?:automatic(?:ally)?|explicit)\s+(?:Provider\s+)?degradations?\b|\bdegradation paths?\b|(?:自动|静默)(?:\s*Provider)?(?:降级|切换)/iu,
  },
];
const errors = [];

function absolute(relativePath) {
  return path.resolve(root, relativePath);
}

function isLocalMarkdownTarget(target) {
  return target
    && !target.startsWith("#")
    && !/^[a-z][a-z\d+.-]*:/i.test(target)
    && !target.startsWith("//");
}

function markdownLinkTargets(markdown) {
  const targets = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    const target = rawTarget.startsWith("<")
      ? rawTarget.slice(1, rawTarget.indexOf(">"))
      : rawTarget.split(/\s+/)[0];
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

function checkRetiredDirectories() {
  for (const relativePath of retired) {
    const directoryPath = absolute(relativePath);
    if (fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory()) {
      errors.push(`retired directory remains: ${relativePath}`);
    }
  }
}

function checkSkillLinks() {
  const filePath = absolute(skillPath);
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const target of markdownLinkTargets(fs.readFileSync(filePath, "utf8"))) {
    const resolved = path.resolve(path.dirname(filePath), target);
    if (!fs.existsSync(resolved)) {
      errors.push(`missing Markdown link from ${skillPath}: ${target}`);
    }
  }
}

function checkReferenceLinks() {
  const directoryPath = absolute(referencesDirectory);
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const referencePath = path.join(directoryPath, entry.name);
    for (const target of markdownLinkTargets(fs.readFileSync(referencePath, "utf8"))) {
      const resolved = path.resolve(path.dirname(referencePath), target);
      const relativeTarget = path.relative(directoryPath, resolved);
      if (relativeTarget && !relativeTarget.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeTarget)) {
        errors.push(`Reference links to another Reference: ${path.relative(root, referencePath)} -> ${target}`);
      }
    }
  }
}

function checkTemplateNeutrality() {
  const templatePath = absolute(".claude/skills/d2c/templates/D2C.md");
  if (!fs.existsSync(templatePath)) {
    return;
  }

  const template = fs.readFileSync(templatePath, "utf8");
  for (const term of forbiddenTemplateTerms) {
    if (template.includes(term)) {
      errors.push(`template contains forbidden project-specific term: ${term}`);
    }
  }
}

function checkActiveRepositoryDocuments() {
  for (const relativePath of activeRepositoryDocuments) {
    const filePath = absolute(relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      errors.push(`missing active repository document: ${relativePath}`);
      continue;
    }

    const document = fs.readFileSync(filePath, "utf8");
    for (const { label, pattern } of forbiddenLegacyLanguage) {
      if (pattern.test(document)) {
        errors.push(`active repository document describes legacy ${label}: ${relativePath}`);
      }
    }
  }
}

checkRequiredFiles();
checkRetiredDirectories();
checkSkillLinks();
checkReferenceLinks();
checkTemplateNeutrality();
checkActiveRepositoryDocuments();

if (errors.length > 0) {
  console.error("Lightweight D2C skill contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("Lightweight D2C skill contract passed.");
}
