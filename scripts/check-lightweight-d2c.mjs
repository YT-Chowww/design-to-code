#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const required = [
  "skills/d2c/SKILL.md",
  "skills/d2c/references/provider-official.md",
  "skills/d2c/references/provider-context-mcp.md",
  "skills/d2c/references/mcp-setup.md",
  "skills/d2c/references/project-analysis-guide.md",
  "skills/d2c/references/visual-review.md",
  "skills/d2c/templates/D2C.md",
  "skills/d2c/assets/mcp.example.json",
  "docs/skill-evals/d2c-forward-extended.md",
];

const retired = [
  "skills/d2c-init",
  "skills/d2c-extract",
  "skills/d2c-generate",
  "skills/d2c-merge",
  "skills/d2c-validate",
  "skills/d2c-verify",
];

const root = process.cwd();
const skillPath = "skills/d2c/SKILL.md";
const referencesDirectory = "skills/d2c/references";
const forbiddenTemplateTerms = ["Ant Design", "Vant", "E-Space", "React", "Vue"];
const activeRepositoryDocuments = [
  "README.md",
  "CLAUDE.md",
  "package.json",
  "docs/README.md",
  "docs/operation-guide.md",
  "docs/verification.md",
  "docs/提供外部使用.md",
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
  { label: "default official OAuth fallback", pattern: /default official OAuth fallback|默认官方.{0,24}OAuth.{0,24}(?:降级|切换|社区)/iu },
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
  const switchAction = /\b(?:fallback|fall(?:s|ing)?\s+back|switch(?:es|ed|ing)?|degrad\w*|restart(?:s|ed|ing)?\b.{0,64}\bwith|use\b.{0,40}\binstead)\b|回退|降级|切换|改用|转用|兜底/iu;
  const automaticTrigger = /\bautomatic(?:ally)?\b|\b(?:if|when|on)\b.{0,80}\b(?:fail(?:s|ed|ure)?|unavailable|missing|unauthorized|denied|expired)\b|\bHTTP\s+[45]\d\d\b|\bnetwork\s+(?:outage|failure|error)\b|\bconnection\s+(?:failure|error)\b|(?:失败|不可用|缺失|异常|未授权|被拒绝|过期)(?:时|后)?|自动|静默/iu;
  const implicitFallback = /\b(?:fallback|fall(?:s|ing)?\s+back|degradation paths?)\b|回退|降级|兜底/iu;
  const contradictorySwitch = /\b(?:but|however|yet)\b.{0,120}\b(?:automatic(?:ally)?\s+)?(?:fallback|fall\s+back|switch|use\b.{0,32}\binstead)\b|(?:但|但是|然而|仍然?|却)[^。！？\n]{0,120}(?:自动|静默)?(?:回退|降级|切换|改用|转用|兜底)/iu;

  const sentenceSegments = document
    .split(/[\r\n!?。！？]+|(?<!\d)\.(?!\d)/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const providerSwitchSegments = [...sentenceSegments, ...proseSegments(document)];

  return providerSwitchSegments.some((segment) => {
    if (isAllowedDefaultOAuthFallback(segment) || !switchAction.test(segment)) {
      return false;
    }

    if (explicitlyNegatesProviderSwitch(segment) && !contradictorySwitch.test(segment)) {
      return false;
    }

    if (/\bdegradation paths?\b/iu.test(segment)) {
      return true;
    }

    return provider.test(segment)
      && (automaticTrigger.test(segment) || implicitFallback.test(segment));
  });
}

function isAllowedDefaultOAuthFallback(segment) {
  const defaultSelection = /(?:no Provider was explicitly selected|without an explicit Provider|未显式指定(?:\s*Provider)?(?:时)?|未指定\s*Provider)/iu;
  const officialOAuthStatus = /(?:official|官方)[^\n。]{0,48}(?:OAuth|authorization|授权)[^\n。]{0,32}(?:unauthorized|denied|expired|未授权|被拒绝|拒绝|已?过期)/iu;
  const contextProvider = /Figma-Context-MCP|Context Provider|社区\s*(?:方案|Provider|MCP)/iu;
  const contextAvailable = /(?:(?:Figma-Context-MCP|Context Provider|社区\s*(?:方案|Provider|MCP))[^\n。]{0,40}(?:\b(?:available|callable)\b|可用|可调用)|(?:\b(?:available|callable)\b|可用|可调用)[^\n。]{0,40}(?:Figma-Context-MCP|Context Provider|社区\s*(?:方案|Provider|MCP)))/iu;
  const discardOfficial = /(?:discard[^\n.]{0,40}official(?:[^\n.]{0,16}results?)?|丢弃[^\n。]{0,40}官方[^\n。]{0,24}结果)/iu;
  const targetNodeRestart = /(?:(?:restart|from scratch|重新读取|从头)[^\n。]{0,48}(?:target[- ]node|node-id|目标节点)|(?:target[- ]node|node-id|目标节点)[^\n。]{0,48}(?:restart|from scratch|重新读取|从头))/iu;
  const noMix = /without mixing|never mix|do not mix|不混用|不拼接/iu;
  const notice = /announce|notify|提示|说明/iu;
  const additionalTrigger = /\brate[ -]?limits?\b|\btimeouts?\b|\b(?:server|service)\s+(?:failure|error|unavailable)\b|\bHTTP\s+[45]\d\d\b|\bnetwork\s+(?:outage|failure|error)\b|\bconnection\s+(?:failure|error)\b|\bpermission(?:s| errors?)?\b|\bnode\s+(?:error|failure|not found|unavailable)\b|\b(?:incomplete|missing|truncated)\s+(?:data|content|results?)\b|\b(?:restoration|fidelity)\s+(?:difference|mismatch|error|issue)\b|限流|超时|服务(?:异常|错误|不可用)|网络(?:中断|异常|错误)|连接(?:失败|异常|错误)|权限不足|节点(?:错误|不存在|不可访问)|数据(?:为空|缺失|不完整|截断)|结构化(?:内容|数据)?(?:为空|缺失|不完整|截断)|还原(?:偏差|不准)/iu;

  return defaultSelection.test(segment)
    && officialOAuthStatus.test(segment)
    && contextProvider.test(segment)
    && contextAvailable.test(segment)
    && discardOfficial.test(segment)
    && targetNodeRestart.test(segment)
    && noMix.test(segment)
    && notice.test(segment)
    && !additionalTrigger.test(segment);
}

function hasActiveArtifactPipeline(document) {
  const pipeline = /(?:file artifacts?|stage reports?|artifact pipeline|工件链|运行工件|阶段报告|阶段状态)/iu;
  const negation = /(?:do(?:es)? not|never|no longer|without|不|不会|不再|无需|没有)[^\n。]{0,32}(?:file artifacts?|stage reports?|artifact pipeline|工件链|运行工件|阶段报告|阶段状态)/iu;
  return proseSegments(document).some((segment) => pipeline.test(segment) && !negation.test(segment));
}

function hasUnsafeCredentialGuidance(document) {
  const placeholderArgument = /--figma-api-key=<YOUR_FIGMA_API_KEY>(?=$|[\s`'",.;:，。；：）)\]])/gu;
  const content = document.replace(placeholderArgument, "");
  const credentialAction = /(?:figma[- ]token[- ]probe|--figma-api-key|X-Figma-Token)|(?:read|store|save|copy|output|读取|保存|复制|输出)[^\n。]{0,32}(?:credentials?|OAuth|凭据)/iu;
  const negation = /(?:do(?:es)? not|never|不|不会|不得|禁止)[^\n。]{0,32}(?:read|store|save|copy|output|读取|保存|复制|输出)[^\n。]{0,32}(?:credentials?|OAuth|凭据)/iu;
  return proseSegments(content).some((segment) => credentialAction.test(segment) && !negation.test(segment));
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
  const templatePath = absolute("skills/d2c/templates/D2C.md");
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
  const baselineOnly = /baseline[- ]only wrapper|仅用于[^\n。]{0,24}(?:baseline|基线)|基线专用/iu;
  const forwardEvidenceLink = /\[[^\]]+\]\(d2c-forward-extended\.md\)/iu;
  if (!baselineOnly.test(document) || !forwardEvidenceLink.test(document)) {
    errors.push(`scenario wrapper boundary must label the no-Skill wrapper as baseline-only and link forward evidence: ${relativePath}`);
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
  const relativePath = "skills/d2c/references/provider-official.md";
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
    fs.readFileSync(absolute("skills/d2c/references/provider-official.md"), "utf8"),
    fs.readFileSync(absolute("skills/d2c/references/provider-context-mcp.md"), "utf8"),
  ].join("\n");
  const visual = fs.readFileSync(absolute("skills/d2c/references/visual-review.md"), "utf8");
  const mcpSetup = fs.readFileSync(absolute("skills/d2c/references/mcp-setup.md"), "utf8");
  const rules = [
    { label: "missing MCP config bootstrap", document: skill, pattern: /(?:(?:\.mcp\.json[^\n。]{0,80}(?:missing|不存在|缺失))|(?:(?:missing|不存在|缺少|缺失)[^\n。]{0,80}\.mcp\.json))(?=[\s\S]{0,700}(?:copy|复制))(?=[\s\S]{0,900}(?:restart|重启))(?=[\s\S]{0,900}(?:do not|never|不得|不)[^\n。]{0,48}(?:read|request|fill|读取|Token|凭据))/iu },
    { label: "Provider setup choices", document: mcpSetup, pattern: /(?:仅官方|official only)[\s\S]{0,300}(?:仅社区|Context only)[\s\S]{0,300}(?:两者|both)/iu },
    { label: "official MCP setup", document: mcpSetup, pattern: /figma-official[\s\S]{0,500}(?:restart|重启)[\s\S]{0,300}\/mcp[\s\S]{0,200}OAuth/iu },
    { label: "Context MCP setup", document: mcpSetup, pattern: /figma-context[\s\S]{0,500}(?:Personal Access Token|PAT)[\s\S]{0,500}(?:restart|重启)/iu },
    { label: "post-restart Provider verification", document: mcpSetup, pattern: /(?:restart|重启)[\s\S]{0,500}(?:实际可调用|really callable|callable tools?)[\s\S]{0,300}(?:配置文件|config)/iu },
    { label: "both Providers", document: skill, pattern: /(?:both Providers|两者都可用|两种 Provider 都可用)[^\n。]{0,80}(?:official|官方)/iu },
    { label: "official-only Provider", document: skill, pattern: /(?:official only|只有官方|仅官方)[^\n。]{0,80}(?:use|选择|使用)[^\n。]{0,24}(?:official|官方)/iu },
    { label: "Context-only Provider", document: skill, pattern: /(?:Context only|只有 Context|仅 Context)[^\n。]{0,80}(?:use|选择|使用)[^\n。]{0,32}(?:Context|Figma-Context-MCP)/iu },
    { label: "neither Provider", document: skill, pattern: /(?:neither Provider|两者都不可用|均不可用)[^\n。]{0,80}(?:stop|停止)/iu },
    { label: "explicit Provider unavailable/auth failure", document: providers, pattern: /(?:explicitly selected|显式选择|显式指定|用户指定)[^\n。]{0,80}(?:unavailable|不可用)[^\n。]{0,80}(?:stop|停止)/iu },
    { label: "default official OAuth fallback", document: skill, pattern: /(?:未显式指定\s*Provider|no Provider was explicitly selected|did not explicitly (?:choose|select) a Provider)(?=[^\n。]{0,500}(?:official|官方))(?=[^\n。]{0,500}(?:OAuth|authorization|授权))(?=[^\n。]{0,500}(?:Figma-Context-MCP|Context Provider))(?=[^\n。]{0,500}(?:重新读取|restart))/iu },
    { label: "explicit official OAuth stop", document: providers, pattern: /(?:显式指定|显式选择|explicitly selected)[^\n。]{0,48}(?:官方|official)[^\n。]{0,80}(?:OAuth|authorization|授权)[^\n。]{0,80}(?:停止|stop)/iu },
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
