# D2C Baseline Protocol

这份文档固化第 0 阶段“流程基线设计”的可实现协议。真实 Figma 验证和统一测试补齐前，所有基线能力先以 skill 协议和本地校验脚本进入“已实现，待验证”状态。

## Manifest 必填结构

`manifest.json` 必须包含：

- `runId`：本次运行标识。
- `designId`：设计标识，通常由 Figma file key 和 node id 组成。
- `input`：至少记录 `figmaUrl` 和 `targetDirectory`。
- `project`：至少记录 `framework`、`language`、`cssStrategy`。
- `artifacts`：记录各阶段产物路径。
- `status`：记录各阶段状态。

## 阶段顺序

阶段顺序固定为：

1. `extract`
2. `generate`
3. `previewValidate`
4. `previewVerify`
5. `merge`
6. `targetValidate`
7. `targetVerify`

后续阶段不能早于前置阶段完成。`merge` 只能在 `previewVerify` 为 `PASSED`、`SKIPPED` 或明确追溯的 `BACKFILLED` 后执行。

## 状态语义

通用状态：

- `PENDING`：尚未执行。
- `OK`：阶段正常完成。
- `WARN`：阶段完成但有警告。
- `PASSED`：验证类阶段通过。
- `FAILED`：阶段失败。
- `SKIPPED`：按用户或环境原因跳过。
- `DEGRADED`：降级完成，证据不足以视为正常通过。
- `BACKFILLED`：追溯补写的工件或报告。

## 阶段产物

完成状态的阶段必须有对应非空产物：

| 阶段 | 必需产物 |
| --- | --- |
| `extract` | `rawFigma`、`assetsManifest`、`normalizedDesign`、`designSpec` |
| `generate` | `generationLog` |
| `previewValidate` | `previewValidationReport` |
| `previewVerify` | `previewVerificationReport` |
| `merge` | `mergeReport` |
| `targetValidate` | `targetValidationReport` |
| `targetVerify` | `targetVerificationReport` |

JSON 产物必须可解析，Markdown 报告必须非空。

## 恢复点推断

中断恢复只从 manifest 和产物存在性推断，不依赖对话记忆：

| 当前状态 | 下一步 |
| --- | --- |
| `extract` 未完成 | `EXTRACT` |
| `generate` 未完成 | `GENERATE` |
| `previewValidate` 未完成 | `PREVIEW_VALIDATE` |
| `previewVerify=FAILED` 且未达到迭代上限 | `GENERATE_FROM_DRIFT` |
| `previewVerify=FAILED` 且达到迭代上限 | `WAIT_FOR_USER` |
| `previewVerify` 未完成 | `PREVIEW_VERIFY` |
| `previewVerify=PASSED/SKIPPED` 且 `merge` 未完成 | `MERGE` |
| `targetValidate=FAILED/DEGRADED` | `STOP_TARGET_VALIDATE_FAILED` |
| `targetValidate` 未完成 | `TARGET_VALIDATE` |
| `targetVerify` 未完成 | `TARGET_VERIFY` |
| 全部完成 | `COMPLETE` |

## 校验命令

```bash
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json
node scripts/check-baseline-manifest.mjs .d2c/docs/sessions/<runId>/manifest.json --next-step
```
