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
  { label: "numeric visual gate", matches: hasNumericVisualGate },
  { label: "automatic Provider degradation", matches: hasAutomaticProviderSwitch },
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

function proseSegments(document) {
  return document
    .split(/[\r\n!?。！？；;]+|(?<!\d)\.(?!\d)/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hasGateNumber(segment) {
  return [...segment.matchAll(/\d+(?:\.\d+)?/gu)]
    .some(([rawNumber]) => {
      const value = Number(rawNumber);
      return value >= 0 && value <= 100;
    });
}

function hasNumericVisualGate(document) {
  const visualMetric = /\b(?:visual|similarity|fidelity|matching|pixel)\b|视觉|相似度|匹配度|还原度|评分|得分/iu;
  const gateDecision = /\b(?:pass(?:es|ed)?|fail(?:s|ed)?|threshold|gate|minimum|maximum|at least|below|above|exceed(?:s|ed)?|reach(?:es|ed)?|qualif(?:y|ies|ied)|accept(?:ed|ance)?)\b|通过|失败|阈值|门槛|合格|达标|至少|不低于|低于|高于|达到|超过|小于|大于|判定|(?:>=|<=|>|<|≥|≤)/iu;

  return proseSegments(document).some((segment) => (
    visualMetric.test(segment)
    && gateDecision.test(segment)
    && hasGateNumber(segment)
  ));
}

function explicitlyNegatesProviderSwitch(segment) {
  const englishNegation = /\b(?:no|never)\s+(?:automatic(?:ally)?\s+)?(?:Provider\s+)?(?:fallback|fall\s+back|switch(?:ing)?|degradation paths?)\b|\b(?:do(?:es)?|will|must|should|can|is|are)\s+not\b.{0,40}\b(?:automatically\s+)?(?:fall\s+back|switch|degrad\w*|use\b.{0,24}\binstead)\b|\b(?:fallback|fall\s+back|switch(?:ing)?|degradation paths?)\b.{0,24}\b(?:(?:is|are)\s+not|isn['’]t|aren['’]t)\s+automatic\b/iu;
  const chineseNegation = /(?:不会|不得|禁止|无|没有|不允许)[^。！？；\n]{0,32}(?:自动|静默)?(?:回退|降级|切换|改用|转用|兜底)|不(?:再)?(?:自动|静默)?(?:回退|降级|切换|改用|转用|兜底)/u;

  return englishNegation.test(segment) || chineseNegation.test(segment);
}

function hasAutomaticProviderSwitch(document) {
  const provider = /\bProvider\b|\bFigma(?:-Context)?-MCP\b|\b(?:official|context)\s+(?:Figma\s+)?MCP\b|官方\s*(?:Figma\s*)?(?:MCP|Provider)|上下文\s*MCP/iu;
  const switchAction = /\b(?:fallback|fall(?:s|ing)?\s+back|switch(?:es|ed|ing)?|degrad\w*|use\b.{0,40}\binstead)\b|回退|降级|切换|改用|转用|兜底/iu;
  const automaticTrigger = /\bautomatic(?:ally)?\b|\b(?:if|when|on)\b.{0,80}\b(?:fail(?:s|ed|ure)?|unavailable|missing)\b|(?:失败|不可用|缺失|异常)(?:时|后)?|自动|静默/iu;
  const implicitFallback = /\b(?:fallback|fall(?:s|ing)?\s+back|degradation paths?)\b|回退|降级|兜底/iu;

  return proseSegments(document).some((segment) => {
    if (explicitlyNegatesProviderSwitch(segment) || !switchAction.test(segment)) {
      return false;
    }

    if (/\bdegradation paths?\b/iu.test(segment)) {
      return true;
    }

    return provider.test(segment)
      && (automaticTrigger.test(segment) || implicitFallback.test(segment));
  });
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
    for (const { label, pattern, matches } of forbiddenLegacyLanguage) {
      if ((pattern && pattern.test(document)) || (matches && matches(document))) {
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
