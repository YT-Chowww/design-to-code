# D2C 本地验证数据（Validation Fixtures）

这些测试数据支撑 `docs/capability-roadmap.md` 中模块 8 的自动验证。
它们刻意放在 `tests/` 之外，这样当前能力路线图工作可以验证协议层，
但不需要恢复旧测试目录。

简单说，这个目录放的是一组前端同学更熟悉的“假数据”和“示例报告文件”，
用来检查 D2C 各阶段写出来的文件格式对不对。它类似项目里的 mock 数据：

- 不需要真的连接 Figma、Chrome 或目标业务项目。
- 可以快速检查 manifest、normalized design、validate/verify/merge report
  这些文件格式和关键字段是否符合约定。
- 可以防止 roadmap 状态被误标为 `[x]`，因为 `[x]` 必须带可复查证据。
- 它只能证明“文件格式和检查规则能被本地脚本跑通”，不能证明真实页面已经生成、
  截图通过或成功合入业务项目。

## 验证逻辑分类

当前验证实现分成几类，它们证明的事情不同，不能互相替代。

| 分类 | 入口 | 证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| 状态和证据检查 | `scripts/check-validation-suite.mjs` | 能力路线图模块 8 中 `[x]` case 必须带 `validationEvidence`，且证据文件存在 | 不证明真实 Figma 页面已经跑通 |
| 仓库结构验证 | `kind: structure` | D2C skill、docs、核心脚本没有缺失 | 不检查 skill 内容是否能执行成功 |
| 模板静态验证 | `kind: template-static` | preview 模板有 package scripts、入口文件和依赖声明 | 不安装依赖，也不代表 preview build 真实通过 |
| 协议快照验证 | `kind: protocol` | manifest、normalized、generation log、validate/verify/merge report 的测试数据符合协议 | 不代表真实 Figma 运行产出了这些文件 |
| Mock 流程验证 | `kind: mock-extract` / `mock-generate` / `mock-merge` | 离线测试数据能覆盖 extract、generate、merge 的关键字段和决策结构 | 不验证 MCP、Chrome、目标项目构建 |
| Figma 登记验证 | `scripts/check-figma-examples.mjs` | Figma 示例登记表的 Figma URL、nodeId、required stages、状态枚举合法 | 不验证该示例已经完成视觉或目标项目验证 |
| 真实运行证据验证 | `scripts/check-real-run-evidence.mjs` | 当示例标为 `[x]` / `verified` 时，必须有 runId、manifest、stage reports，且 required stages 全为 `PASSED` | 不主动执行 D2C，只审计已登记证据 |
| 视觉报告验证 | `scripts/check-verify-report.mjs` | verification report 中 Chrome MCP、截图、diff、分数和状态关系合法 | 不自己打开浏览器截图 |
| 降级场景验证 | `kind: degraded` | image fallback、Chrome skipped、target degraded 等降级报告格式可回归 | 降级通过不等于真实能力完成 |
| 目标项目 Init 验证 | `scripts/run-d2c-init-target.mjs` + `scripts/check-init-context.mjs` | 目标项目能生成 `.d2c/context`、preview 工程和 init report，并通过 context 校验 | 只覆盖 Init；不覆盖 Extract/Generate/Verify/Merge |

### 什么时候能改状态

- 离线测试数据通过后，只能说明对应的文件格式、脚本检查或检查规则有效。
- 真实 Figma 示例要升级 `[x]`，必须先执行 D2C skill 并登记真实运行证据。
- `SKIPPED`、`DEGRADED`、缺少 Chrome screenshot diff、缺少 target validate report，都不能作为 `[x]` 证据。
- `protocol/accepted-visual-diff-verification-report.json` 固定人工接受差异后的 `DEGRADED` 恢复格式；`protocol/target-runtime-bootstrap-verification-report.json` 固定 browser-document-only stub schema。
- `canonical-screenshot/dpr-2.json` 固定 CSS rect + DPR 裁剪、下采样与 diff 输出。
- target validation report 必须声明 `validationScope.mode=changed-files`，文件清单来自 merge report；项目级全量 type-check / build 仅作为可选诊断。
- `check-real-run-evidence.mjs` 对待验证示例会通过并统计 pending；只有示例已声明 `verified` 或 `[x]` 时，才强制检查完整证据。

运行本地检查：

```bash
node scripts/check-validation-suite.mjs
```

审计真实 Figma 运行证据：

```bash
node scripts/check-real-run-evidence.mjs docs/figma-examples.json --target-root=/Applications/work/wm/espace/pc/ms-fe-basic
```

本地检查会看这些内容：

- 仓库结构，以及必需的 skill、docs、scripts。
- preview 模板的静态构建前置条件。
- manifest、normalized design、generation、validate、verify、merge report 的协议快照。
- 不依赖 Figma、Chrome MCP 或业务目标项目的 mock extract/generate/merge 测试数据。
- 后续可能升级为 `[x]` 的 Figma 示例真实运行证据结构。
- 用于真实运行证据检查的正向 verified 示例数据。
- provider、browser、target build 失败的固定降级场景。

模块 8 中的 `[x]` 表示该测试数据或静态检查已经在
`validation-suite.json` 中登记 `validationEvidence`，并通过本地检查。
它不表示真实 Figma 端到端、浏览器截图 diff 或目标项目验证已经通过；
这些能力在各自运行工件证明完整链路前仍保持 `[>]`。
# 图表契约评估

`chart-contract/` 提供 line、bar、donut 的完整与缺字段成对测试数据。完整测试数据证明业务 wrapper 契约匹配和 donut 本地 wrapper 回退；缺字段测试数据必须被 generation / merge checker 拒绝。
