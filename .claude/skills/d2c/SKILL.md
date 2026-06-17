---
name: d2c
description: Main orchestrator for the Design-to-Code workflow. Converts a Figma design into production-ready frontend code with visual verification. Uses file artifacts instead of conversation-only context so runs can be resumed, audited, and compared.
---

# D2C — 主编排器

## 输入
- 参数格式：`<figma-url> [target-directory]`
- `figma-url`：Figma 设计稿链接（必需）
- `target-directory`：目标项目目录路径（可选，不提供则默认合入当前工作目录 CWD）

## 配置
- 最大迭代次数：3
- 视觉验证通过阈值：90%

## 工件协议

每次运行都要生成以下标识：
- `designId`：由 `figma file key + node-id` 组成
- `runId`：建议使用 `<YYYY-MM-DDTHH-mm-ss>` 时间戳

每次运行都要维护以下核心工件：
- `.d2c/docs/reference/<designId>/<runId>-figma-raw.json`
- `.d2c/docs/reference/<designId>/<runId>-assets.json`
- `.d2c/docs/design-specs/<designId>/<runId>-normalized.json`
- `.d2c/docs/design-specs/<designId>/<runId>-design-spec.md`
- `.d2c/docs/sessions/<runId>/manifest.json`
- `.d2c/docs/sessions/<runId>/summary.md`

`manifest.json` 是整次 D2C 运行的总索引，后续 `generate`、`validate`、`verify`、`merge` 都应优先从 manifest 读取路径，形成可恢复的文件工件链路。`validate` 和 `verify` 分为 preview 与 target 两个阶段：preview 阶段保证还原基线可运行，target 阶段保证合入项目后的真实代码可运行且视觉效果可接受。

### 阶段门禁（必须严格执行）

D2C 是工件驱动流程，不是事后补文档流程。每个阶段必须满足以下门禁，才能进入下一阶段：

1. **初始化门禁**
   - 必须先创建 `.d2c/docs/sessions/<runId>/manifest.json`，状态写为 `PENDING`，工件路径先写入预期路径。
   - 在 manifest 初始化完成前，禁止修改 `.d2c/preview/src/` 或目标项目业务代码。

2. **Extract 门禁**
   - 必须先产出 raw figma、assets manifest、normalized design、design spec。
   - 必须立即校验这些 JSON/Markdown 文件存在且非空，并将实际路径和 `status.extract` 写回 manifest。
   - 在 `normalizedDesign` 和 `designSpec` 写入 manifest 前，禁止执行代码生成、preview 编辑或目标项目编辑。

3. **Generate 门禁**
   - 必须从 manifest 读取 `normalizedDesign`，不得从会话记忆或临时分析结果直接生成代码。
   - 必须先生成 `.d2c/preview/src/` 代码和 generation log，并将 `status.generate` 写回 manifest。
   - 在 generation log 写入 manifest 前，禁止合入目标项目代码。
   - 图表候选要求契约评估时，generation log 必须记录候选组件、匹配与缺失契约、选择结果、option、adapter、静态数据状态和 fallback 原因。

4. **Validate / Verify 门禁**
   - 每次 validate / verify 后必须立即生成报告文件，并写回 manifest 对应 `artifacts` 与 `status`。
   - Chrome DevTools MCP 不可用时可以 `SKIPPED`，但必须在 verify 报告中记录不可用原因、人工检查入口和已完成的静态校验。

5. **Merge 门禁**
   - 只有 `status.previewVerify` 为 `PASSED`、`SKIPPED`，或具有完整 `previewAcceptance.status=ACCEPTED_WITH_VISUAL_DIFF` 且 `scopeAssessment.missingRequirements=[]` 的 `DEGRADED` 时才能进入 merge。
   - merge 必须从 manifest 读取 preview、normalized design、generation log 和 target directory。
   - 修改目标项目业务代码前，必须先说明将修改的目标文件；修改后必须立即写 merge report 并回写 manifest。

6. **最终门禁**
   - 最终回答前必须读取 manifest，确认所有已执行阶段都有对应报告路径和状态。
   - 如果某些工件是追溯补写的，必须在 `summary.md` 和最终回答中明确标记为 `BACKFILLED`，不能写成正常 `OK`。

禁止事项：
- 禁止先修改目标项目代码，再补写 extract / normalized / design spec / generation log。
- 禁止把从 Figma raw 临时解析出的结果当作正式 generate 输入，除非它已经落到 normalized design 并写入 manifest。
- 禁止在 manifest 未初始化时开始 preview 或 target 代码编辑。
- 禁止在 summary 中把未实际按顺序执行的阶段标记为无备注 `OK`。

推荐执行方式：
- 每进入一个阶段前，先读取 `.d2c/docs/sessions/<runId>/manifest.json`。
- 每完成一个阶段后，立刻运行最小文件校验（存在、非空、JSON 可解析），再更新 manifest。
- 如果用户中途要求跳过某阶段，manifest 中该阶段状态必须写为 `SKIPPED`，并记录用户原因或环境原因。

## 代码质量规则
- 使用明确类型，降级处理时记录原因
- 使用框架对应的样式隔离方案
- 设计中超过 5 个独立区域时，必须分解为子组件
- 迭代修改时做针对性修改，保留无关代码
- TypeScript 错误修复上限：2 次（超过后降级处理）

## MCP 降级策略
- Figma provider 不可用：按 `figma-official-mcp -> framelink-context-mcp -> figma-rest -> figma-image-fallback -> manual-input` 逐层降级
- MCP-first 顺序不变；预挂载 MCP 限流后仍须用目标项目 `.mcp.json` 中的 repo-local dev token 独立探测 file-scoped REST，`/v1/me` 的 identity scope 失败不能短路 nodes/images 请求
- 只有所有结构化 provider 和 image export 都不可用时，才提示用户手动提供设计信息（截图 + 描述）
- Chrome DevTools MCP 不可用：跳过视觉验证，仅做静态校验，输出警告

## 主流程

### Pre-flight Check: 初始化检查

检查 `.d2c/` 目录是否存在且结构完整：

```bash
ls .d2c/preview/package.json
ls .d2c/context/project-config.json
ls .d2c/context/design-system.json
```

如果 `.d2c/` 不存在或结构不完整：
- 自动调用 `/d2c-init` 初始化工作目录
- 等待初始化完成后继续

### 初始化

1. **解析参数**
   - 提取 Figma URL 和目标目录路径
   - 验证 Figma URL 格式（应包含 `figma.com`）
   - 目标目录：如果提供了路径，验证其存在；如果未提供，默认为 CWD

2. **读取项目配置**
   - 优先读取 `.d2c/context/project-config.json`
   - 回退读取 `.d2c/context/project-config.md`
   - 提取 `framework`、`language`、`cssStrategy`、`tooling`

3. **生成 `runId` 和 `designId`**
   - `runId` 用于本次运行的完整追踪
   - `designId` 用于同一设计的多轮比对

4. **初始化 manifest**
   - 创建 `.d2c/docs/sessions/<runId>/manifest.json`
   - 先写入输入参数、目标目录、技术栈、预期工件路径和阶段状态占位
   - 所有阶段状态初始为 `PENDING`
   - 初始化后立即校验 manifest JSON 可解析；失败则中止，不得继续

5. **输出流程概览**
```text
=== D2C: Design to Code ===
Figma URL: <url>
Target: <directory or CWD>
Framework: <framework>
Run ID: <runId>
Design ID: <designId>
Max iterations: 3

Starting design-to-code conversion...
```

### Step 1/7: 提取设计信息

调用 `/d2c-extract` skill：

```text
[Step 1/7] Extracting design information...
```

- 传入 `figma-url`、`runId`、`designId`
- 产出 raw figma、assets manifest、normalized design、design spec 文档
- `normalized-design.json` 包含 `requiredStyle`、`tokenCandidates`、`uiPatternCandidates`、`source.provider`、`source.mode`、`source.providerAttempts` 和必要的 `fieldSources`
- 将产出路径回写到 `manifest.json`
- 运行门禁校验：raw/assets/normalized/spec 存在且非空，JSON 文件可解析
- 如果结构化 provider 失败但 image export 成功，允许 `/d2c-extract` 使用 `figma-image-fallback` 产出降级工件；此时 `status.extract` 必须为 `DEGRADED`，后续阶段必须在报告中保留降级说明
- 如果失败，中止流程并报告错误

### Step 2/7: 生成代码

调用 `/d2c-generate` skill：

```text
[Step 2/7] Generating <framework> code...
```

- 输入为 `manifest.json` 中记录的 `normalized-design.json`
- `d2c-generate` 读取 `project-config.json` 自动适配框架和样式策略
- `d2c-generate` 将候选整理为 `tokenHints`、`componentMappings`、`styleFit`
- 生成组件文件到 `.d2c/preview/src/`，preview 样式优先使用 Figma raw value 保证视觉还原
- 将生成日志路径回写到 `manifest.json`
- 运行门禁校验：generation log 存在且可解析，preview 至少存在一个入口组件或页面文件

### Step 3/7: Preview 代码校验

调用 `/d2c-validate` skill：

```text
[Step 3/7] Validating preview code...
```

- 传入 `phase=preview`
- 类型检查（按框架适配命令）
- 预览工程最小 lint（仅在存在可用 linter 时执行）
- 构建验证
- 启动开发服务器
- 将校验报告路径和 `status.previewValidate` 回写到 `manifest.json`
- 运行门禁校验：validation report 存在且可解析；失败命令必须写入报告
- 如果校验失败且无法自动修复，报告错误但继续到验证步骤

### Step 4/7: Preview 视觉验证（迭代循环）

进入迭代验证循环：

```text
[Step 4/7] Preview visual verification (iteration 1/3)...
```

循环逻辑：
- `/d2c-verify` 从 `manifest.json` 读取原始 Figma 参考、设计规格文档、预览地址
- 传入 `phase=preview`
- 如果结果为 `PASSED`：写回得分并退出循环
- 如果结果为 `SKIPPED`：记录原因并退出循环
- 如果结果为 `FAILED` 且未达到上限：
  - 将偏差报告路径和摘要写回 `manifest.json`
  - 调用 `/d2c-generate`，传入偏差报告路径
  - 再次调用 `/d2c-validate`
- 如果达到迭代上限：保留当前状态并提示用户介入

### Step 5/7: 合入项目代码

仅在视觉验证通过（PASSED）或跳过（SKIPPED）时执行。

调用 `/d2c-merge` skill：

```text
[Step 5/7] Merging into project...
```

- 如果提供了目标目录路径，传入该路径
- 如果未提供目标目录，默认合入 CWD（当前业务项目）
- 执行代码合并
- 基于 `tokenHints` 和目标项目上下文生成最终 `resolvedTokens`；只有具备可靠 `currentValue`、`matchType` 和 `confidence` 证据的候选才替换 raw value，否则保留 raw value 并记录 `fallbackReason`
- 根据目标项目真实工具链决定是否运行 format / lint --fix
- 将合并报告路径回写到 `manifest.json`
- 运行门禁校验：merge report 存在且可解析，列出所有新增/修改文件和 token fallback

### Step 6/7: Target 代码校验

合入完成后再次调用 `/d2c-validate` skill：

```text
[Step 6/7] Validating target project...
```

- 传入 `phase=target` 和目标目录
- 从 merge report 的 `mergedFiles[].targetPath` 获取本次新增/修改文件
- 使用目标项目真实依赖和配置，仅校验本次 changed-files 的导入路径、类型、样式引用和资源路径
- 不默认运行全项目 type-check 或 build；项目级命令仅作为用户明确要求时的附加诊断，不得因既有全局错误降级本次 changed-files 结果
- 将校验报告路径和 `status.targetValidate` 回写到 `manifest.json`
- 运行门禁校验：target validation report 存在且可解析；报告必须记录 `validationScope.mode=changed-files`、文件清单、实际 scoped 命令；未运行项目级构建时记录原因
- 如果 changed-files 校验失败，中止自动完成状态，要求先修复本次合入文件

### Step 7/7: Target 视觉验证

目标项目校验通过后再次调用 `/d2c-verify` skill：

```text
[Step 7/7] Target visual verification...
```

- 传入 `phase=target`、目标项目访问地址和目标目录
- 使用合入后的页面截图对比 Figma 参考
- 重点复核 `resolvedTokens`、业务组件替换、全局样式优先级、字体加载和资源路径
- 将验证报告路径、分数和 `status.targetVerify` 回写到 `manifest.json`
- 最终完成状态以 target 验证结果为准；Chrome MCP 不可用时记录 `SKIPPED` 和人工检查地址
- 运行最终门禁校验：manifest 中所有非 `PENDING` 阶段必须有报告或产物路径；summary 必须与 manifest 状态一致

### 最终输出

```text
=== D2C Complete ===

Summary:
- Framework: <framework>
- Components generated: <N>
- Iterations: <N/3>
- Preview score: <N>%
- Target score: <N>% / SKIPPED
- Files merged: <N>
- Run ID: <runId>

Preview: 根据项目生成地址进行预览
Manifest: .d2c/docs/sessions/<runId>/manifest.json
```

## 文档记录

每次完整 D2C 流程执行完成后，至少落以下两个会话级文件：

### 1. `manifest.json`

用于机器读取的索引文件：

```json
{
  "runId": "<runId>",
  "designId": "<designId>",
  "input": {
    "figmaUrl": "<url>",
    "targetDirectory": "<cwd or target>"
  },
  "project": {
    "framework": "<framework>",
    "language": "<language>",
    "cssStrategy": "<cssStrategy>"
  },
  "artifacts": {
    "rawFigma": "<path>",
    "assetsManifest": "<path>",
    "normalizedDesign": "<path>",
    "designSpec": "<path>",
    "generationLog": "<path>",
    "previewValidationReport": "<path>",
    "previewVerificationReport": "<path>",
    "targetValidationReport": "<path>",
    "targetVerificationReport": "<path>",
    "mergeReport": "<path>"
  },
  "status": {
    "extract": "OK",
    "generate": "OK",
    "previewValidate": "WARN",
    "previewVerify": "PASSED",
    "merge": "OK",
    "targetValidate": "OK",
    "targetVerify": "PASSED"
  }
}
```

### 2. `summary.md`

用于人工阅读的摘要文件：

```markdown
# D2C 会话记录：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **Figma URL**：<url>
- **目标目录**：<target-directory or CWD>
- **技术栈**：<framework> + <language> + <cssStrategy>

## 执行概要
| 步骤 | Skill | 状态 | 备注 |
|------|-------|------|------|
| 1/7 Extract | d2c-extract | OK/ERROR | <raw + normalized 路径> |
| 2/7 Generate | d2c-generate | OK | <N 个文件生成> |
| 3/7 Preview Validate | d2c-validate | OK/WARN | <preview 校验结果摘要> |
| 4/7 Preview Verify | d2c-verify | PASSED/FAILED/SKIPPED | <preview 得分 / 迭代次数> |
| 5/7 Merge | d2c-merge | OK/SKIPPED | <N 个文件合并> |
| 6/7 Target Validate | d2c-validate | OK/WARN/FAILED | <target 校验结果摘要> |
| 7/7 Target Verify | d2c-verify | PASSED/FAILED/SKIPPED | <target 得分> |

## 关联工件
- Raw Figma：`<path>`
- Normalized Design：`<path>`
- Generation Log：`<path>`
- Preview Validation Report：`<path>`
- Preview Verification Report：`<path>`
- Merge Report：`<path>`
- Target Validation Report：`<path>`
- Target Verification Report：`<path>`
```

## 错误处理汇总

| 阶段 | 错误 | 处理 |
|------|------|------|
| Pre-flight | `.d2c/` 不存在 | 自动调用 `/d2c-init` |
| 初始化 | Figma URL 格式无效 | 提示正确格式并中止 |
| Extract | Figma MCP 不可用 | 降级到手动输入 |
| Extract | 设计数据为空 | 提示检查 node-id 并中止 |
| Generate | `normalized-design.json` 缺失 | 提示先完成 Extract |
| Validate | `npm install` 失败 | 报告错误，建议手动安装 |
| Validate | TypeScript 错误 | 自动修复，最多 2 次 |
| Verify | Chrome MCP 不可用 | 跳过视觉验证 |
| Verify | 迭代 3 次仍未通过 | 展示状态，请用户介入 |
| Merge | 目标目录无效 | 提示检查路径 |
| Merge | 文件冲突 | 提示用户确认 |
| Target Validate | 合入后类型 / 构建失败 | 停止完成状态，记录失败命令和修复建议 |
| Target Verify | 合入后视觉低于阈值 | 记录 target 偏差，优先检查 `resolvedTokens` 和业务组件样式覆盖 |

## 中止与恢复

- 任何步骤可以通过用户中断停止
- 已生成的代码保留在 `.d2c/preview/src/` 中
- 可通过 `manifest.json` 恢复中断步骤，恢复判断不得依赖对话记忆
- dev server 启动后必须写入 `manifest.runtimeProcesses[]`。最终门禁运行 `node scripts/cleanup-d2c-servers.mjs <manifest>` 并确认本轮端口无监听。
- merge 前后用 `manifest.writeBoundary.allow/deny` 和 `node scripts/check-write-boundary.mjs --manifest=<manifest> --root=<target-root>` 审计新增改动。

恢复时先读取 `.d2c/docs/sessions/<runId>/manifest.json`，检查状态和工件存在性，再按下表选择下一步：

| Manifest 状态 | 下一步 |
| --- | --- |
| `manifest.json` 不存在 | 重新执行初始化门禁，创建 manifest |
| `status.extract` 未完成或 extract 产物缺失 | 从 Step 1/7 `d2c-extract` 恢复 |
| `status.generate` 未完成或 generation log 缺失 | 从 Step 2/7 `d2c-generate` 恢复 |
| `status.previewValidate` 未完成或 preview validation report 缺失 | 从 Step 3/7 `d2c-validate phase=preview` 恢复 |
| `status.previewVerify=FAILED` 且未达到最大迭代次数 | 用偏差报告重新进入 `d2c-generate` 迭代 |
| `status.previewVerify=FAILED` 且已达到最大迭代次数 | 停止自动恢复，等待用户介入 |
| `status.previewVerify=DEGRADED` 且存在完整 `ACCEPTED_WITH_VISUAL_DIFF`、scope 无缺失 | 从 Step 5/7 `d2c-merge` 恢复；target 截图仍必须执行 |
| `status.previewVerify` 未完成或 preview verification report 缺失 | 从 Step 4/7 `d2c-verify phase=preview` 恢复 |
| `status.previewVerify=PASSED/SKIPPED` 且 `status.merge` 未完成 | 从 Step 5/7 `d2c-merge` 恢复 |
| `status.targetValidate=FAILED/DEGRADED` | 停止完成声明，先修复 target 校验问题 |
| `status.targetValidate` 未完成或 target validation report 缺失 | 从 Step 6/7 `d2c-validate phase=target` 恢复 |
| `status.targetVerify` 未完成或 target verification report 缺失 | 从 Step 7/7 `d2c-verify phase=target` 恢复 |
| 所有阶段完成且工件校验通过 | 输出最终 summary |

恢复前建议执行基线校验：

```bash
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json --next-step
```

第 0 阶段的 manifest、阶段门禁和恢复规则由 `docs/baseline-protocol.md` 固化；对应测试后续在统一测试建设中补齐。
