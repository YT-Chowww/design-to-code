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
  "docs/skill-evals/d2c-forward-extended.md",
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
const activeRepositoryDocuments = [
  "README.md",
  "CLAUDE.md",
  "package.json",
  "docs/README.md",
  "docs/operation-guide.md",
  "docs/verification.md",
];
const forbiddenLegacyLanguage = [
  { label: "runId", pattern: /\brunId\b/u },
  { label: "manifest.json", pattern: /manifest\.json/iu },
  { label: "normalized design", pattern: /normalized\s+(?:design|artifact|JSON)|标准化设计/iu },
  { label: "/d2c-init", pattern: /\/d2c-init\b/iu },
  { label: "retired D2C sub-skill", pattern: /\/d2c-(?:extract|generate|merge|validate|verify)\b/iu },
  { label: ".d2c artifact workspace", pattern: /\.d2c\//iu },
  { label: "artifact-stage pipeline", matches: hasActiveArtifactPipeline },
  { label: "credential probing or storage", matches: hasUnsafeCredentialGuidance },
  { label: "numeric visual gate", matches: hasNumericVisualGate },
  { label: "automatic Provider degradation", matches: hasAutomaticProviderSwitch },
];
const errors = [];

const behaviorScenarios = [
  { label: "both Providers", pattern: /both providers|两种 Provider|两个 Provider/iu },
  { label: "official-only Provider", pattern: /official[- ]only|只有官方|仅官方/iu },
  { label: "Context-only Provider", pattern: /context[- ]only|只有 Context|仅 Context/iu },
  { label: "neither Provider", pattern: /neither provider|两者都不可用|均不可用/iu },
  { label: "explicit Provider unavailable/auth failure", pattern: /explicit provider unavailable|显式指定.{0,20}不可用|authentication failure|认证失败/iu },
  { label: "user adjustment conflicts with Figma", pattern: /adjustment conflicts with Figma|用户调整.{0,20}Figma|最新用户要求.{0,20}Figma/iu },
  { label: "missing fonts/assets", pattern: /missing fonts? or assets?|字体或资源缺失|缺少字体|资源缺失/iu },
  { label: "known mismatch with Chrome unavailable", pattern: /known mismatch with Chrome unavailable|已知偏差.{0,24}Chrome.{0,16}不可用/iu },
];

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

function hasActiveArtifactPipeline(document) {
  const pipeline = /(?:file artifacts?|stage reports?|artifact pipeline|工件链|运行工件|阶段报告|阶段状态)/iu;
  const negation = /(?:do(?:es)? not|never|no longer|without|不|不会|不再|无需|没有)[^\n。]{0,32}(?:file artifacts?|stage reports?|artifact pipeline|工件链|运行工件|阶段报告|阶段状态)/iu;
  return proseSegments(document).some((segment) => pipeline.test(segment) && !negation.test(segment));
}

function hasUnsafeCredentialGuidance(document) {
  const credentialAction = /(?:figma[- ]token[- ]probe|--figma-api-key|X-Figma-Token)|(?:read|store|save|copy|output|读取|保存|复制|输出)[^\n。]{0,32}(?:credentials?|OAuth|凭据)/iu;
  const negation = /(?:do(?:es)? not|never|不|不会|不得|禁止)[^\n。]{0,32}(?:read|store|save|copy|output|读取|保存|复制|输出)[^\n。]{0,32}(?:credentials?|OAuth|凭据)/iu;
  return proseSegments(document).some((segment) => credentialAction.test(segment) && !negation.test(segment));
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

function checkBehaviorScenarios() {
  const relativePath = "docs/skill-evals/d2c-scenarios.md";
  const filePath = absolute(relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`missing behavior scenarios: ${relativePath}`);
    return;
  }

  const document = fs.readFileSync(filePath, "utf8");
  if (/Forward evaluation:\s*`?PENDING`?/iu.test(document)) {
    errors.push(`forward evaluation remains PENDING: ${relativePath}`);
  }
  for (const scenario of behaviorScenarios) {
    if (!scenario.pattern.test(document)) {
      errors.push(`behavior scenario is missing: ${scenario.label}`);
    }
  }
}

function checkFrameworkScope() {
  const document = fs.readFileSync(absolute(skillPath), "utf8");
  const description = document.match(/^description:\s*(.+)$/mu)?.[1] ?? "";
  const identifiableWebProject = /identifiable existing Web frontend project|可识别的现有 Web 前端项目/iu;
  const initialValidatedScope = /initial validated scope[^\n]*(?:React[^\n]*TypeScript[^\n]*Vue\s*3[^\n]*TypeScript)|首版实际验证范围[^\n]*(?:React[^\n]*TypeScript[^\n]*Vue\s*3[^\n]*TypeScript)/iu;

  if (!identifiableWebProject.test(description) || !initialValidatedScope.test(document)) {
    errors.push(`framework scope must target an identifiable existing Web frontend project and state the initial validated scope: ${skillPath}`);
  }
}

function checkCodeConnectGuidance() {
  const relativePath = ".claude/skills/d2c/references/provider-official.md";
  const document = fs.readFileSync(absolute(relativePath), "utf8");
  const verifiesCurrentCode = /Code Connect[^\n。]*(?:verify|match|核对|验证)[^\n。]*(?:current project code|当前项目代码)/iu;
  const creationDeferred = /(?:creat(?:e|ing)|创建)[^\n。]*(?:out of scope|TODO|待办|不在本次范围)/iu;

  if (!verifiesCurrentCode.test(document) || !creationDeferred.test(document)) {
    errors.push(`Code Connect guidance must verify mappings against current project code and defer creation: ${relativePath}`);
  }
}

function checkSkillBehaviorRules() {
  const skill = fs.readFileSync(absolute(skillPath), "utf8");
  const providers = [
    skill,
    fs.readFileSync(absolute(".claude/skills/d2c/references/provider-official.md"), "utf8"),
    fs.readFileSync(absolute(".claude/skills/d2c/references/provider-context-mcp.md"), "utf8"),
  ].join("\n");
  const visual = fs.readFileSync(absolute(".claude/skills/d2c/references/visual-review.md"), "utf8");
  const rules = [
    { label: "both Providers", document: skill, pattern: /(?:both Providers|两者都可用|两种 Provider 都可用)[^\n。]{0,80}(?:official|官方)/iu },
    { label: "official-only Provider", document: skill, pattern: /(?:official only|只有官方|仅官方)[^\n。]{0,80}(?:use|选择|使用)[^\n。]{0,24}(?:official|官方)/iu },
    { label: "Context-only Provider", document: skill, pattern: /(?:Context only|只有 Context|仅 Context)[^\n。]{0,80}(?:use|选择|使用)[^\n。]{0,32}(?:Context|Figma-Context-MCP)/iu },
    { label: "neither Provider", document: skill, pattern: /(?:neither Provider|两者都不可用|均不可用)[^\n。]{0,80}(?:stop|停止)/iu },
    { label: "explicit Provider unavailable/auth failure", document: providers, pattern: /(?:explicitly selected|显式选择|显式指定|用户指定)[^\n。]{0,80}(?:unavailable|不可用)[^\n。]{0,80}(?:stop|停止)/iu },
    { label: "Provider authentication failure", document: providers, pattern: /(?:authentication|authorization|OAuth|Token)[^\n。]{0,64}(?:failure|problem|失败|问题|过期|无效)[^\n。]{0,100}(?:stop|等待|停止)/iu },
    { label: "user adjustment", document: skill, pattern: /(?:user adjustment|用户调整)[\s\S]{0,500}(?:latest user request wins over Figma|最新要求为准|最新用户要求为准)/iu },
    { label: "missing fonts/assets", document: skill, pattern: /(?:missing fonts? or assets?|字体[^\n。]{0,16}(?:缺失|缺少)|资源[^\n。]{0,16}(?:缺失|下载失败))[^\n。]{0,120}(?:user|用户|选择|替代)/iu },
    { label: "Chrome unavailable", document: visual, pattern: /Chrome[^\n。]{0,24}(?:unavailable|不可用)[^\n。]{0,120}(?:unverified|未验证|保留已识别偏差|不凭猜测)/iu },
  ];

  for (const rule of rules) {
    if (!rule.pattern.test(rule.document)) {
      errors.push(`Skill behavior rule is missing: ${rule.label}`);
    }
  }
}

checkRequiredFiles();
checkRetiredDirectories();
checkSkillLinks();
checkReferenceLinks();
checkTemplateNeutrality();
checkActiveRepositoryDocuments();
checkBehaviorScenarios();
checkFrameworkScope();
checkCodeConnectGuidance();
checkSkillBehaviorRules();

if (errors.length > 0) {
  console.error("Lightweight D2C skill contract failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("Lightweight D2C skill contract passed.");
}
