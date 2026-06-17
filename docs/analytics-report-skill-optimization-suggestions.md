# Analytics Report 执行复盘与 Skill 优化建议

## 1. 文档目的

本文记录 `Analytics Report` 环图节点的实际 D2C 执行流程，并整理后续可逐项优化的 skill 内容。本文只描述建议，不直接修改 `.claude/skills/`。

本次 run：

```text
runId: 2026-06-01T21-35-46-analytics-report
designId: M3lJODRvpEqL78AZdnzwYX_5601-71250
target: /Applications/work/wm/espace/pc/ms-fe-basic
target route: /#/d2c-lab/analytics-report
```

范围说明：

- 注册节点 `5601:71250` 实际是一个 `116 x 116` 双层环图，不是完整 Analytics Report 页面。
- 本次只验证了环图识别、ECharts 代码生成、隔离合入、changed-files 检查和 target 截图。
- 本次没有验证折线图、柱状图、图例和 Tooltip 展示态。

## 2. 实际执行流程

### 2.1 固定输入与写入边界

执行前先固定 Figma file key、node id、目标项目、合入目录和实验路由。

允许写入：

```text
.d2c/
src/pages/d2c-lab/analytics-report/
config/routes.dev.ts
```

禁止修改：

```text
config/routes.ts
业务页面
API
store
查询 hook
.mcp.json
```

### 2.2 Figma provider 探测

按 MCP-first 顺序执行：

```text
当前预挂载 Figma MCP
-> repo-local figma-developer-mcp stdio
-> repo-local dev token file-scoped REST
-> image fallback
```

本次结果：

1. 当前预挂载 MCP 返回 `429`。
2. repo-local stdio MCP 在本地 Node 18 环境下未能在限定时间内完成初始化。
3. 使用目标项目 `.mcp.json` 中的 dev token 执行脱敏探测。
4. `/v1/me` 返回 `403 missing current_user:read`，只记录为 `INCONCLUSIVE_IDENTITY_SCOPE`。
5. nodes API 和 images API 均返回 `200`。
6. 正式采用：

```text
source.provider=figma-rest
source.mode=structured-raw
status.extract=OK
```

探测工件只记录 token 来源、脱敏指纹、接口状态和错误摘要，不记录明文 token。

### 2.3 Extract 与范围识别

Extract 生成 raw、assets、normalized design 和 design spec，并写回 manifest。

normalized artifact 中写入 `chartCandidates`。本次节点识别为：

```text
chartType: donut
axes: null
series: 双层环图
legend: []
tooltip: 不存在
confidence: 0.98
```

这里有一个关键结论：示例名称是 `Analytics Report`，但所选节点只覆盖环图。后续流程必须以节点真实内容为准，不能自动推断完整报表能力。

### 2.4 Generate 与 Preview

Preview 使用目标项目已存在的版本：

```text
echarts@4.9.0
echarts-for-react@2.0.16
```

图表适配决策：

- `@/components/multiple-legend-chart` 更适合折线图和柱状图，不适用于当前环图。
- 当前环图使用本地 `ReactEchartsCore` wrapper。
- fixture 使用静态数据，不接真实接口。
- generation log 记录 option、容器尺寸、静态数据来源和 fallback 原因。

Preview 执行：

```bash
cd .d2c/preview
npm run type-check
npm run build
npm run dev
```

### 2.5 Preview 视觉验证与人工接受差异

使用 Chrome DevTools MCP 完成 navigation、resize、snapshot、screenshot 和 evaluate。

固定尺寸 canonical diff 共执行三轮。最终结果：

```text
changedPixels: 1078 / 13456
pixelRatio: 0.08011296076099882
threshold: 0.02
```

自动 diff 仍失败，因此流程停止在 `WAIT_FOR_USER`，没有自动 merge。

用户明确接受差异后：

1. preview verify 报告保留 `diff.status=FAILED`。
2. screenshot 状态记录为 `DEGRADED`。
3. 追加 `humanReview.status=PASSED` 和 `acceptanceOverride`。
4. manifest 恢复到 merge 阶段。

### 2.6 隔离合入与 changed-files 检查

目标项目新增：

```text
src/pages/d2c-lab/analytics-report/
  index.tsx
  index.less
  chart-options.ts
  adapters.ts
  fixtures.ts
```

只向 `config/routes.dev.ts` 追加实验路由，没有修改正式 `config/routes.ts`。

merge report 中写入非空 `chartMerges`，记录本地 ECharts wrapper、option 路径、fixture adapter、容器样式和 fallback 原因。

changed-files 检查：

```bash
npx tsc --noEmit --skipLibCheck --jsx react-jsx --esModuleInterop \
  --moduleResolution node \
  config/routes.dev.ts \
  src/pages/d2c-lab/analytics-report/index.tsx \
  src/pages/d2c-lab/analytics-report/chart-options.ts \
  src/pages/d2c-lab/analytics-report/adapters.ts \
  src/pages/d2c-lab/analytics-report/fixtures.ts

./node_modules/.bin/lessc \
  src/pages/d2c-lab/analytics-report/index.less \
  >/tmp/analytics-report.css
```

### 2.7 Target 运行与截图验证

启动目标项目：

```bash
ROUTE_MODE=minimal npm run start
```

目标项目壳层依赖远端登录、菜单和 dev server 接口。本地隔离环境下接口不可用，页面初始出现空白或重定向到 `/#/exceptionPage/noMenu`。

为完成真实路由截图，本次只在浏览器文档内注入临时 stub：

```text
sessionStorage ms-config
sessionStorage menuTree
sessionStorage menuDatas
XMLHttpRequest /api/*
XMLHttpRequest /crm-base-service/*
XMLHttpRequest localhost:7000/dev-server/info
```

临时 stub 没有写入项目文件，也没有修改业务 API、store 或查询 hook。

Chrome MCP 确认：

```text
main.analytics-report: 116 x 116
.echarts-for-react: 116 x 116
```

截图时浏览器 `devicePixelRatio=2`。MCP viewport 截图需要按元素 rect 裁剪，再将 `232 x 232` 图像下采样为 `116 x 116` 后与 Figma 参考图比较。

Target diff：

```text
changedPixels: 1093 / 13456
pixelRatio: 0.08122770511296076
threshold: 0.02
```

该差异与用户已接受的 preview 差异同类，没有新增布局偏移，因此 target verify 记录人工接受并完成闭环。

### 2.8 Registry 与最终状态

manifest 最终状态：

```text
extract: OK
generate: OK
previewValidate: PASSED
previewVerify: PASSED
merge: OK
targetValidate: PASSED
targetVerify: PASSED
next: COMPLETE
```

Registry 仍保留：

```text
status=partially-verified
roadmapStatus=[>]
targetProjectStatus=target-verified-donut-scope
```

原因：本次 run 只关闭环图范围，不能把完整 Analytics Report 能力升级为 `[x]`。

最后停止 preview 和 target dev server，并确认 `5173`、`7001` 无残留监听进程。

## 3. Skill 优化建议

### 3.1 P0：补齐必须稳定执行的协议

#### 建议 1：把 provider 探测变成单一确定性入口

当前状态：

- `d2c-extract` 已写入 `/v1/me` 与 file-scoped API 的分类规则。
- 已新增 `scripts/probe-figma-token.mjs` 和离线回归数据。
- skill 中的命令写成相对路径，跨目标项目执行时仍可能出现脚本定位歧义。

建议：

- 明确探测脚本从 design-to-code 仓库执行，或在 skill 目录中提供稳定 wrapper。
- 增加统一 provider probe 脚本，按顺序执行 mounted MCP、repo-local stdio MCP、repo-local REST 和 image export。
- 将结果统一写入 `providerAttempts`，避免 agent 在对话中临时拼装判断。

建议输出字段：

```text
provider
tokenSource
tokenFingerprint
identityProbe
nodesProbe
imagesProbe
capabilities
recommendedProvider
recommendedMode
status
reason
```

#### 建议 2：增加“节点范围是否满足示例要求”的检查

问题：

- 注册名称 `Analytics Report` 容易让执行者默认它是一张完整报表。
- 实际节点只有一个环图。

建议在 normalized artifact 和 registry evidence 中增加：

```json
{
  "scopeAssessment": {
    "selectedNodeCoverage": ["环图"],
    "missingRequirements": ["折线图", "柱状图", "图例", "Tooltip 展示态"],
    "verificationCeiling": "partially-verified",
    "reason": "The selected Figma node only contains a donut chart."
  }
}
```

并增加本地检查规则：

- `missingRequirements` 非空时，示例不能升级为 `verified / [x]`。
- 子能力可以记录已关闭，但整体能力仍保留 `[>]`。

#### 建议 3：固化 `WAIT_FOR_USER` 与接受差异后的恢复协议

问题：

- 三轮 diff 失败后的停止逻辑已有描述。
- 用户接受差异后的恢复动作尚未形成完整协议，容易遗漏 report、manifest 和 registry 的一致性更新。

建议在 `d2c` 和 `d2c-verify` 中增加明确状态：

```text
WAIT_FOR_USER
ACCEPTED_WITH_VISUAL_DIFF
```

用户接受后必须执行：

1. 保留自动 diff 原始失败结果。
2. 写入 `humanReview`、`acceptanceOverride`、reviewer、时间、范围和原因。
3. 将 screenshot 状态写为 `DEGRADED`，不能伪装为自动 diff 通过。
4. 更新 manifest 恢复点。
5. target 截图仍必须执行，不能直接沿用 preview 截图。
6. registry 是否升级由范围检查决定，不能因为人工接受而自动升级 `[x]`。

#### 建议 4：增加 target 壳层依赖的浏览器内验证协议

问题：

- 目标项目本地启动后，登录、菜单和远端服务不可用。
- 为截图临时绕过依赖是合理的，但必须证明没有污染生产代码。

建议在 `d2c-verify` 中增加 `runtimeBootstrap` 协议：

```json
{
  "runtimeBootstrap": {
    "scope": "browser-document-only",
    "reason": "Remote shell dependencies are unavailable in isolated local runtime.",
    "writesProjectFiles": false,
    "stubs": []
  }
}
```

规则：

- 仅允许浏览器文档内 `sessionStorage`、`localStorage`、XHR/fetch 临时 stub。
- 禁止为了截图修改正式 API、store、查询 hook、proxy 和业务组件。
- target verify 报告必须记录 stub 范围。
- 如果 stub 改变了待验证组件本身的数据契约或样式输入，target verify 只能记为 `DEGRADED`。

#### 建议 5：提供统一 canonical screenshot 脚本

问题：

- Chrome MCP 截图受 viewport、元素位置和 DPR 影响。
- 本次临时编写裁剪脚本时遇到 ESM 加载和 `116 x 116` / `232 x 232` 尺寸差异。

建议新增：

```text
scripts/capture-canonical-screenshot.mjs
```

建议参数：

```bash
node scripts/capture-canonical-screenshot.mjs \
  --input=<mcp-viewport.png> \
  --reference=<reference.png> \
  --rect=64,104,116,116 \
  --dpr=2 \
  --actual=<actual.png> \
  --diff=<diff.png>
```

脚本职责：

- 按 CSS rect 和 DPR 裁剪。
- 必要时下采样到参考图尺寸。
- 生成 diff 图。
- 输出 `changedPixels`、`totalPixels`、`pixelRatio` 和尺寸信息。
- 固定 ESM 加载方式，避免每次临时调试。

#### 建议 6：把 dev server 生命周期纳入最终门禁

问题：

- Preview 和 target verify 都会启动服务。
- 中断、恢复或人工接受差异后容易遗留监听进程。

建议：

- manifest 记录 `runtimeProcesses`：阶段、端口、启动命令、PID 或 session id。
- `d2c-validate` 启动服务后登记。
- `d2c` 最终门禁统一清理本次启动的服务。
- 最终检查至少覆盖 preview 端口和 target URL 实际端口。

可新增：

```text
scripts/cleanup-d2c-servers.mjs
```

### 3.2 P1：完善图表与 target 合入规则

#### 建议 7：图表组件适配增加契约匹配清单

本次判断：

- 折线图和柱状图优先评估 `@/components/multiple-legend-chart`。
- 环图契约不匹配，回退本地 `ReactEchartsCore` wrapper。

建议 `chartMappings` 和 `chartMerges` 固化：

```text
chartType
candidateComponents
matchedContract
missingContract
selectedComponent
libraryVersion
optionPath
dataAdapter
dataBindingStatus
containerStyle
decision
fallbackReason
```

避免只因为目标项目存在某个图表组件，就强行复用不匹配的封装。

#### 建议 8：明确 preview fixture 与真实数据接入边界

规则建议：

- preview fixture 只用于视觉还原。
- merge 时 adapter 可以保留静态数据，但必须标记 `dataBindingStatus=static-preview`。
- 禁止生成真实 API、store 或 query hook。
- 真正业务接入由后续开发任务处理，不计入 D2C 视觉闭环。

#### 建议 9：路由修改增加 allowlist

本次边界是：

```text
允许修改 config/routes.dev.ts
禁止修改 config/routes.ts
```

建议在 manifest 增加：

```json
{
  "writeBoundary": {
    "allow": [".d2c/", "src/pages/d2c-lab/analytics-report/", "config/routes.dev.ts"],
    "deny": ["config/routes.ts", ".mcp.json", "src/services/", "src/models/"]
  }
}
```

merge 后增加 changed-files 检查，发现越界修改立即停止。

#### 建议 10：统一 validation report 状态枚举

本次 target dev server 已启动成功，但报告字段使用 `PASSED` 时 checker 要求写成 `Running`。

建议统一状态协议：

```text
checks.devServer.status: Running | Failed | NEEDS_MANUAL_START | SKIPPED
stage overallStatus: PASSED | FAILED | DEGRADED
```

并在 skill 示例、checker 和 validation fixtures 中只保留同一套枚举。

### 3.3 P2：控制 skill 体积，减少重复上下文

当前 `d2c`、`d2c-extract`、`d2c-generate`、`d2c-merge`、`d2c-validate` 和 `d2c-verify` 已包含较多 JSON 示例、错误表和细节协议。继续直接扩写 `SKILL.md` 会增加每次运行的上下文成本。

建议按“核心流程留在 SKILL.md，详细协议按需读取”的方式拆分：

```text
.claude/skills/d2c/references/
  evidence-status-protocol.md
  write-boundary-protocol.md

.claude/skills/d2c-extract/references/
  provider-probing.md
  normalized-scope-assessment.md

.claude/skills/d2c-generate/references/
  chart-adaptation.md

.claude/skills/d2c-verify/references/
  visual-acceptance.md
  target-runtime-bootstrap.md
  canonical-screenshot.md
```

`SKILL.md` 中只保留：

- 触发条件。
- 阶段顺序。
- 必须执行的门禁。
- 何时读取对应 reference。
- 何时调用确定性脚本。

详细 JSON schema、长示例和异常分类移入 reference 或脚本，避免多份文档重复维护。

## 4. 建议新增或扩展的本地检查

| 优先级 | 检查 | 目的 |
| --- | --- | --- |
| P0 | token probe 四场景回归 | 已落地，防止 `/v1/me=403` 误判 token 无效 |
| P0 | normalized scope assessment fixture | 防止局部节点误升级完整示例 |
| P0 | visual acceptance resume fixture | 防止接受差异后丢失 diff 原始失败证据 |
| P0 | canonical screenshot DPR fixture | 覆盖 CSS rect、DPR 裁剪和下采样 |
| P0 | write boundary checker | 防止误改正式路由、API、store 和 `.mcp.json` |
| P1 | runtime bootstrap report checker | 使用浏览器临时 stub 时强制记录范围 |
| P1 | chart contract mapping fixture | 覆盖业务封装可复用与本地 wrapper fallback |
| P1 | dev server cleanup checker | 最终门禁确认无残留监听进程 |
| P1 | validation status enum fixture | 保证 skill 示例、checker 和报告字段一致 |

## 5. 推荐实施顺序

后续优化可以按以下顺序逐项执行：

1. 增加 `scopeAssessment` schema 和 checker，先防止状态误升级。
2. 固化 `WAIT_FOR_USER -> 用户接受 -> target verify` 恢复协议。
3. 新增 canonical screenshot 脚本，统一 DPR 裁剪和 diff。
4. 增加 write boundary 与 dev server cleanup 检查。
5. 为 target 浏览器临时 stub 增加 `runtimeBootstrap` 协议。
6. 补齐 chart contract mapping fixture。
7. 最后拆分过长 `SKILL.md`，将细节迁移到 references 和 scripts。

## 6. 本次复盘的核心结论

1. `/v1/me=403 missing current_user:read` 不能作为 token 无效结论，file-scoped nodes/images 才是当前设计稿能力判断依据。
2. 示例名称不能替代 Figma 节点事实。局部节点只能关闭局部能力。
3. 自动 diff 失败后允许用户接受差异，但必须保留原始失败证据，并继续执行 target 截图。
4. 为截图使用浏览器内临时 stub 可以接受，但不能污染正式业务代码，且必须进入报告。
5. 截图 diff 需要统一处理 viewport、元素 rect 和 DPR。
6. 完成声明不仅要看页面截图，还要检查 manifest、registry、changed-files 和残留监听进程。
