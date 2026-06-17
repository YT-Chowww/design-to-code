# Figma 示例登记表（Figma Example Registry）

这份清单是 `docs/capability-roadmap.md` 第 7 节的机器可追踪依据。`docs/figma-examples.json` 是权威数据源；本文件只提供阅读摘要。

## 状态规则

- `planned`：能力路线图中有计划，但尚未登记真实 Figma 节点。
- `registered-pending-verification`：已经登记真实 Figma 节点，可以开始 D2C extract/generate/validate/verify。
- `partially-verified`：至少跑通过一个真实 D2C 阶段，但完整闭环还没完成。
- `verified`：完成所需 D2C 阶段，并在 `verification.evidence` 中登记 runId、manifest、stage report 和验证命令后，才可以作为 `[x]` 依据。

## 已登记示例

| 示例 | Figma | Node | 状态 | 下一步 |
| --- | --- | --- | --- | --- |
| `D2C Baseline Card` | 客群全景台 明日 | `5301:76004` | `verified` | 已完成 extract、generate、preview validate、preview verify；证据见 registry |
| `Plain Marketing Section` | Ant Design Open Source Community | `39889:87855` | `verified` | 已完成布局提取、组件拆分和 preview 截图验证；证据见 registry |
| `普通模板 5362:136850` | 客群全景台 明日 | `5362:136850` | `partially-verified` | 新 token 已成功导出 reference PNG 和 SVG；Chrome MCP 自动截图复测已通过；changed-files target validate 已通过；reference-backed diff 为 `0.08532`，高于 `0.02`，恢复点为 `GENERATE_FROM_DRIFT` |
| `Image Card` | 客群全景台 明日 | `5308:125805` | `verified` | 已完成资源下载、assets manifest、preview 生成和截图验证；证据见 registry |
| `Open UI Admin Page` | Ant Design Open Source Community | `64462:1762` | `verified` | 已完成 MCP-first extract、Ant Design preview、人工视觉放行、隔离 merge 和 changed-files target validate；target 截图因不注册路由明确记为 `SKIPPED` |
| `Business Dashboard` | 客群全景台 明日 | `5601:71203` | `verified` | 已完成 image-fallback extract、业务组件候选评估、人工视觉放行、隔离 merge 和 changed-files target validate；真实采用 `BasicDataTable`，target 截图因不注册路由明确记为 `SKIPPED` |
| `Token Playground` | 中金财富B端 PC组件库 | `5340:375412` | `registered-pending-verification` | 跑 tokenCandidates、tokenHints、resolvedTokens 验证 |
| `Analytics Report` | 客群全景台 明日 | `5601:71250` | `partially-verified` | repo-local REST 已完成 structured-raw extract；该节点实际只是 `116 x 116` 双层环图，不含折线图、柱状图、图例或 Tooltip；用户接受 ECharts raster 差异后已完成隔离 merge、changed-files 检查和 target Chrome MCP 截图，完整报表测试数据仍待补充 |
| `Analytics Report Full` | 投顾B端图表规范 | `212:8232` + `214:6780` + `229:8356` | `partially-verified` | 旧 `DEGRADED` run 保留可审计。新 visual-convergence run 固化 line / bar 业务 wrapper 与 donut 本地 wrapper 契约，Tooltip 来自 `212:8232` 展示态；三轮 preview diff 第三轮为 `0.054535`、`0.048865`、`0.033401`。用户已于 `2026-06-06` 人工接受当前差异，随后完成隔离 merge、target validate 和 target verify；target diff 为 `0.055451`、`0.048681`、`0.033471`，仍高于 `0.02`，所以保持 `DEGRADED` / `[>]` |
| `Order Management Console` | 【PRD】企微客户列表 | `320:13867` | `registered-pending-verification` | 需要目标项目验证路由建议、冲突处理、target validate 和状态覆盖 |
| `Interactive Component Set` | 中金财富B端 PC组件库 | `54:208176` | `verified` | 已完成 variants / interactionStates extract、状态生成和截图验证；证据见 registry |

## 暂缓示例

| 示例 | 原因 |
| --- | --- |
| `Responsive Pricing Page` | 用户指定先不考虑 |

## 校验命令

```bash
node scripts/check-figma-examples.mjs docs/figma-examples.json
node scripts/check-real-run-evidence.mjs docs/figma-examples.json --target-root=/Applications/work/wm/espace/pc/ms-fe-basic
```

第一个命令校验示例登记格式；第二个命令校验 `[x]` 所需的真实运行证据。两者通过但示例仍是 `[>]` 时，只表示证据结构可审计，不能代表 D2C 视觉或目标项目验证已经通过。
