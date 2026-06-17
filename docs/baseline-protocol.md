# D2C 基线协议（Baseline Protocol）

本文定义一次 D2C 运行的最低协议：运行清单如何索引工件、阶段如何推进、状态如何解释、恢复点如何推断。它不是能力完成状态表；能力是否完成以 `docs/capability-roadmap.md` 和真实验证证据为准。

## 文档边界

| 文档 | 负责内容 |
| --- | --- |
| `requirements.md` | 产品目标和能力边界 |
| `architecture.md` | skill 架构、上下文系统和工件链总览 |
| `baseline-protocol.md` | 基线协议：单次 run 的 manifest、阶段、状态、产物和恢复规则 |
| `verification.md` | 各 skill 应如何被验证 |
| `capability-roadmap.md` | 能力路线图、建设状态和后续任务 |

## Manifest 索引

`.d2c/docs/sessions/<runId>/manifest.json` 是一次运行的机器索引。恢复、校验和状态判断都先读 manifest，不依赖对话记忆。

必填顶层字段：

| 字段 | 含义 |
| --- | --- |
| `runId` | 本次运行标识，建议使用时间戳 |
| `designId` | 设计标识，通常由 Figma file key 和 node id 组成 |
| `input` | 运行输入，至少记录 `figmaUrl` 和 `targetDirectory` |
| `project` | 目标项目信息，至少记录框架、语言和构建工具或样式策略 |
| `artifacts` | 各阶段产物路径 |
| `status` | 各阶段状态 |

常用可选字段：

| 字段 | 含义 |
| --- | --- |
| `config.maxIterations` | preview verify 失败后允许回到 generate 的最大次数 |
| `iteration.previewVerify` / `iterations.previewVerify` | 当前 preview verify 迭代次数 |

## 阶段协议

阶段顺序固定为：

| 顺序 | 阶段 | 负责 skill | 阶段目标 |
| --- | --- | --- | --- |
| 1 | `extract` | `d2c-extract` | 提取 Figma/design facts，写入 raw、assets、normalized 和 design spec |
| 2 | `generate` | `d2c-generate` | 基于 normalized design 生成 preview 代码和 generation log |
| 3 | `previewValidate` | `d2c-validate phase=preview` | 校验 preview 类型、lint、build 和运行入口 |
| 4 | `previewVerify` | `d2c-verify phase=preview` | 截图对比 preview 与 Figma 参考，输出视觉报告 |
| 5 | `merge` | `d2c-merge` | 将 preview 产物适配到目标项目 |
| 6 | `targetValidate` | `d2c-validate phase=target` | 从 merge report 获取新增/修改文件，使用目标项目真实依赖执行 changed-files 校验；项目级检查仅作为可选诊断 |
| 7 | `targetVerify` | `d2c-verify phase=target` | 截图或人工审核目标页面视觉结果 |

阶段顺序检查：

- 后续阶段不能早于前置阶段完成。
- `merge` 只能在 `previewVerify` 为 `PASSED`、`SKIPPED` 或明确追溯的 `BACKFILLED` 后执行。
- `targetValidate` 为 `FAILED` 或 `DEGRADED` 时，`targetVerify` 不能标记为 `PASSED`。

## 状态语义

所有阶段只允许以下状态：

| 状态 | 含义 | 是否能作为完成证据 |
| --- | --- | --- |
| `PENDING` | 尚未执行 | 否 |
| `OK` | 阶段正常完成 | 取决于阶段和产物 |
| `WARN` | 阶段完成但有警告 | 取决于阶段和报告 |
| `PASSED` | 验证类阶段通过 | 是，但仍需报告和工件存在 |
| `FAILED` | 阶段失败 | 否 |
| `SKIPPED` | 因用户或环境原因跳过 | 否，不能支撑能力路线图 `[x]` |
| `DEGRADED` | 降级完成，证据不足以视为正常通过 | 否，不能支撑能力路线图 `[x]` |
| `BACKFILLED` | 追溯补写的工件或报告 | 只能作为恢复依据，不能单独作为真实验证证据 |

`check-baseline-manifest.mjs` 会把部分非通过状态视为“流程上已走到下一步”，例如 `previewVerify=SKIPPED` 后允许进入 `merge`。这只表示可恢复流程继续推进，不表示该能力已经完成验证。

## 完成状态

脚本用“阶段完成状态”判断是否需要检查该阶段产物：

| 阶段 | 会触发产物检查的状态 |
| --- | --- |
| `extract` | `OK`、`DEGRADED`、`BACKFILLED` |
| `generate` | `OK`、`BACKFILLED` |
| `previewValidate` | `OK`、`WARN`、`PASSED`、`DEGRADED`、`BACKFILLED` |
| `previewVerify` | `PASSED`、`FAILED`、`SKIPPED`、`BACKFILLED` |
| `merge` | `OK`、`SKIPPED`、`BACKFILLED` |
| `targetValidate` | `OK`、`WARN`、`PASSED`、`FAILED`、`DEGRADED`、`SKIPPED`、`BACKFILLED` |
| `targetVerify` | `PASSED`、`FAILED`、`SKIPPED`、`BACKFILLED` |

`previewVerify` 和 `targetVerify` 也允许 `DEGRADED` 表示人工接受视觉差异后的恢复状态。此状态不能支撑能力路线图 `[x]`。

注意：这里的“完成”是流程恢复语义，不等同于能力路线图的 `[x]`。能力路线图 `[x]` 还要求示例、测试数据、脚本或真实运行证据满足对应检查规则。

## 阶段产物

当某阶段处于完成状态时，manifest 中必须登记对应非空产物：

| 阶段 | `artifacts` 必需字段 |
| --- | --- |
| `extract` | `rawFigma`、`assetsManifest`、`normalizedDesign`、`designSpec` |
| `generate` | `generationLog` |
| `previewValidate` | `previewValidationReport` |
| `previewVerify` | `previewVerificationReport` |
| `merge` | `mergeReport` |
| `targetValidate` | `targetValidationReport` |
| `targetVerify` | `targetVerificationReport` |

产物校验规则：

- 路径可以是绝对路径，也可以相对当前工作目录、manifest 所在目录或 `.d2c/docs/sessions/<runId>/` 的上级工件根目录解析。
- JSON 产物必须可解析。
- Markdown 或其他文本报告必须是非空文件。
- 报告内部字段由对应 checker 继续校验，例如 validate report、verify report、merge report。

## 恢复规则

中断恢复只从 manifest 状态和产物存在性推断：

| 条件 | 下一步 |
| --- | --- |
| `extract` 未完成 | `EXTRACT` |
| `generate` 未完成 | `GENERATE` |
| `previewValidate` 未完成 | `PREVIEW_VALIDATE` |
| `previewVerify=FAILED` 且未达到迭代上限 | `GENERATE_FROM_DRIFT` |
| `previewVerify=FAILED` 且达到迭代上限 | `WAIT_FOR_USER` |
| `previewVerify=DEGRADED` 且 `previewAcceptance.status=ACCEPTED_WITH_VISUAL_DIFF`、scope 无缺失 | `MERGE` |
| `previewVerify` 未完成 | `PREVIEW_VERIFY` |
| `previewVerify=PASSED/SKIPPED/BACKFILLED` 且 `merge` 未完成 | `MERGE` |
| `targetValidate=FAILED/DEGRADED` | `STOP_TARGET_VALIDATE_FAILED` |
| `targetValidate` 未完成 | `TARGET_VALIDATE` |
| `targetVerify` 未完成 | `TARGET_VERIFY` |
| 全部阶段完成 | `COMPLETE` |

## P0 安全协议

- normalized design 可写入 `scopeAssessment.selectedNodeCoverage`、`missingRequirements`、`verificationCeiling` 和 `reason`。新复合示例必须填写；历史工件保持兼容。
- 自动 diff 超阈值后必须保留 `diff.status=FAILED` 和真实 `pixelRatio`。用户明确接受时，screenshot 与整体报告写 `DEGRADED`，并记录 `humanReview`、`acceptanceOverride.status=ACCEPTED_WITH_VISUAL_DIFF`、reviewer、时间、范围和原因。
- 图表 `chartMappings` / `chartMerges` 在 `requiresChartContractAssessment=true` 时必须记录候选组件、匹配契约、缺失契约、选择组件、版本、option、adapter、静态数据状态、容器样式、决策和 fallback 原因。旧 report 不强制补齐。
- 复合图表 canonical diff 最多自动迭代三轮；第三轮仍超阈值时写 `previewVerify=FAILED`、`next=WAIT_FOR_USER`，不得自动继承旧 run 的人工接受记录。
- 人工接受只能允许 preview 继续进入 merge，不能绕过 `scopeAssessment`，也不能自动升级 registry `verified` 或路线图 `[x]`。target 截图仍必须执行。
- manifest 可登记 `writeBoundary.allow`、`writeBoundary.deny`、`writeBoundary.baselineStatus` 和 `runtimeProcesses`。merge 后运行 `scripts/check-write-boundary.mjs`，最终运行 `scripts/cleanup-d2c-servers.mjs`。

## 校验入口

校验 manifest：

```bash
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json
```

输出下一步恢复点：

```bash
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json --next-step
```

在测试数据中固定期望恢复点：

```bash
node scripts/check-baseline-manifest.mjs docs/validation-fixtures/protocol/manifest.json --expect-next-step=TARGET_VALIDATE
```

## 示例

`docs/validation-fixtures/protocol/manifest.json` 是当前协议测试数据。它已经完成 extract、generate、preview validate、preview verify 和 merge，`targetValidate` 仍是 `PENDING`，因此校验脚本推断下一步为 `TARGET_VALIDATE`。
