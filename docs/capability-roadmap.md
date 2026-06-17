# D2C 能力路线图（Capability Roadmap）

这份能力路线图用来跟踪 D2C skill 的长期能力建设。它按流程阶段组织能力项，并为每项能力绑定建议的 Figma 示例、建设位置和验收标准，方便后续逐步标记状态。

## 状态约定

| 状态 | 含义 |
| --- | --- |
| `[ ]` | 未开始 |
| `[~]` | 设计中或部分实现 |
| `[>]` | 已实现，待验证 |
| `[x]` | 已完成并通过验证 |
| `[!]` | 阻塞或需要重新设计 |

## 当前评估口径

本次状态基于现有 `.claude/skills/d2c*` skill 文档、context 模板、docs 协议，以及 `ms-fe-basic` 中已执行的普通模板 D2C 运行评估。当前仍不轻易标记 `[x]`：只有能力已经沉淀到 skill/脚本，并通过示例、测试数据或端到端验证后，才升级为 `[x]`。

2026-05-24 补充事实：

- `ms-fe-basic` 已完成普通模板节点 `M3lJODRvpEqL78AZdnzwYX / 5362:136850` 的两轮真实运行。
- 首轮使用 `figma-rest` 完成 extract/generate/preview validate/merge，target 聚焦测试通过，但 visual verify 因 Chrome MCP 不可用标记 `SKIPPED`，target validate 因项目既有类型/测试问题标记 `DEGRADED`。
- 次轮已按目标项目 `.mcp.json` 拉起 `figma-developer-mcp`，通过 stdio MCP `tools/list` 发现 `get_figma_data` / `download_figma_images`，并成功用 `get_figma_data` 获取同一 Figma 节点数据，raw provider 记录为 `framelink-context-mcp`。
- MCP 自动发现/调用目前已验证可行，但尚未完整沉淀为 skill 内置脚本或强制执行入口；Chrome DevTools MCP 的 stdio 探测被中断，未形成截图验证闭环。

2026-05-26 补充事实：

- `scripts/check-validation-suite.mjs` 已支持 `[x]` 状态检查规则，但 `[x]` case 必须提供 `validationEvidence`，包括验证时间、命令、结果和可复查工件。
- `scripts/check-real-run-evidence.mjs` 已补充真实示例证据审计：真实 Figma 示例只有登记 runId、manifest、required stage report 且状态全为 `PASSED` 时，才能作为 `[x]` 依据。
- 离线检查脚本已复查通过，可升级结构、preview 模板静态检查、协议快照、mock extract/generate/merge、skill eval、视觉回归测试数据和降级测试数据。
- `docs/figma-examples.json` 的真实 Figma 示例仍未升级 `[x]`：目前缺少 Chrome 截图 diff 或可审计人工视觉审核，以及部分 target 项目的完整 validate/verify 闭环。
- `ms-fe-basic` 仍作为默认目标项目；目标项目能力只能在 `.d2c` 工件和 D2C 实验区形成完整 manifest/report 证据后升级。

2026-05-27 补充事实：

- Phase 1 preview-only 闭环已完成 4 个真实 Figma 示例：`D2C Baseline Card`、`Plain Marketing Section`、`Image Card`、`Interactive Component Set`。
- 4 个示例均已产出 `.d2c/docs/sessions/<runId>/manifest.json`、Figma MCP extract 工件、normalized/design spec、generation log、preview validation report、Chrome element screenshot verification report 和截图工件。
- `scripts/check-real-run-evidence.mjs docs/figma-examples.json` 当前返回 `4 verified, 6 pending`；`scripts/check-validation-suite.mjs` 复查通过。
- 本次只关闭不依赖目标项目的 preview 能力；`普通模板 5362:136850` 以及开源组件库、业务组件库、图表、复杂业务页面仍需要 target validate / target verify 后才能升 `[x]`。

2026-05-30 补充事实：

- `普通模板 5362:136850` 已使用更新后的 Figma token 重新执行导出。两个仓库本地 `.mcp.json` 的 token 指纹与用户提供值一致。
- File-scoped Figma export 已成功下载 reference PNG 和帮助图标 SVG。`/v1/me` 返回 `403`，但不能据此否定本次相关文件导出能力。
- 新增 reference-backed diff：`5406 / 63360` 像素不同，比例 `0.0853219696969697`，高于阈值 `0.02`。当前 manifest 恢复点为 `GENERATE_FROM_DRIFT`，路线图继续保持 `[>]`。
- Chrome DevTools MCP 已于 `2026-05-30T15:44:42+08:00` 重新执行自动截图验证，`list_pages -> navigate_page -> resize_page -> take_snapshot -> take_screenshot -> evaluate_script` 全部通过。旧 profile 锁占错误无法复现；Chrome 最小 viewport 限制使 MCP 截图作为能力证据保留，不替换现有 canonical diff 输入。
- Target Validate 已改为 merge report changed-files 策略，并于 `2026-05-30T15:59:50+08:00` 重新执行：`index.tsx` focused TypeScript compilation、`index.less` 样式引用和资源路径检查均通过。全项目 type-check / build 仅作为可选诊断，历史错误不再降级本次 D2C run。

| 状态 | 本文中的判定口径 |
| --- | --- |
| `[x]` | 已有 skill/脚本实现，并通过示例、测试数据或端到端验证；相关 JSON 登记必须带可复查证据 |
| `[>]` | skill 中已有明确流程、输入输出和工件协议，但缺少验证 |
| `[~]` | 已有入口、上下文或部分规则，但跨阶段链路不完整 |
| `[ ]` | 当前 skill 中尚无明确协议或实现路径 |

## 总体阶段

总体阶段状态汇总自下方阶段能力、Figma 示例登记和自动验证测试数据。`[>]` 表示能力协议、脚本、报告结构或示例登记已落地，仍需真实 Figma E2E、目标项目 validate/merge 或浏览器视觉验证后才能升级为 `[x]`。

| 状态 | 阶段 | 目标 | 主要验收 |
| --- | --- | --- | --- |
| `[>]` | 0. 流程基线设计 | 建立可恢复、可审计、可检查的 D2C 主流程 | preview 阶段 manifest/report 已由真实 Figma 示例验证；merge/target 与中断恢复仍需闭环 |
| `[>]` | 1. Init 初始化与上下文能力 | 初始化 `.d2c/` 工作区、检测目标项目、生成 preview 工程和 context | project-config、design-system、component-library、project-adapter 可供后续阶段读取 |
| `[x]` | 2. 基础模板能力 | 支持不依赖组件库的普通页面生成 | 真实 Figma 示例已完成 extract、React preview generate、preview validate 和 Chrome 截图 verify |
| `[x]` | 3. 开源组件库能力 | 支持 Ant Design、Ant Design Vue、Element Plus 等组件映射 | `Open UI Admin Page` 已完成 Ant Design componentMappings、隔离 merge 和 changed-files target validate |
| `[x]` | 4. 业务组件库能力 | 支持项目自定义组件、样式契约和覆盖策略 | `Business Dashboard` 已完成候选评估、真实 `BasicDataTable` 采用、fixture adapter、隔离 merge 和 changed-files target validate |
| `[>]` | 5. 复杂 UI 能力 | 支持表单、表格、弹窗、抽屉、状态页、组合布局 | 组件拆分、路由建议、冲突处理和 target validate 报告协议已落地，复杂页面真实运行待验证 |
| `[>]` | 6. Token 与主题能力 | 支持 token candidates、tokenHints、resolvedTokens | 只在证据可靠时替换项目 token，否则保留 raw value |
| `[>]` | 7. 图标与 iconfont 能力 | 支持 SVG、组件库 Icon、iconfont class 映射 | iconCandidates、iconMappings、iconMerges 和 SVG/image fallback 协议已落地，真实 Icon Toolbar 示例待补充验证 |
| `[>]` | 8. 图表能力 | 支持 chart pattern 识别与图表库代码生成 | chartCandidates、图表生成、chart merge 和视觉验证测试数据已落地，真实图表库接入待验证 |
| `[>]` | 9. 响应式能力 | 支持多断点 frame 与响应式样式输出 | responsiveFrames、响应式生成、多断点 verify 和视觉回归测试数据已落地，真实多 frame 示例待验证 |
| `[x]` | 10. 交互与变体能力 | 支持 variants、hover、active、disabled、selected、open state | `Interactive Component Set` 已完成 variants / interactionStates extract、状态生成和 Chrome 截图验证 |
| `[>]` | 11. 自动验证体系 | 建立测试数据、mock、真实 Figma E2E 和视觉验证闭环 | 离线测试数据与校验脚本已落地，4 个真实 Figma preview 示例已验证；目标项目闭环待验证 |

## 0. 流程基线设计

| 状态 | 能力项 | 建设位置 | Figma 示例 | 验收标准 |
| --- | --- | --- | --- | --- |
| `[x]` | runId / designId 生成 | `d2c` | 任意单 frame | 4 个 Phase 1 run 均有稳定会话标识和设计标识 |
| `[x]` | manifest 工件索引 | `d2c` | `D2C Baseline Card` | `D2C Baseline Card` 已产出 manifest，阶段状态、输入、输出路径可复查 |
| `[x]` | 阶段顺序检查 | `d2c` | `D2C Baseline Card` | `extract -> generate -> preview validate -> preview verify` 已按 manifest 工件顺序执行 |
| `[x]` | normalized design 协议 | `d2c-extract` | `D2C Baseline Card` | normalized artifact 已通过 `scripts/check-extract-normalized.mjs` |
| `[x]` | generation log 协议 | `d2c-generate` | `D2C Baseline Card` | generation log 已通过 `scripts/check-generate-decisions.mjs` |
| `[x]` | validation report 协议 | `d2c-validate` | `D2C Baseline Card` | preview validation report 已通过 `scripts/check-validate-report.mjs` |
| `[x]` | verification report 协议 | `d2c-verify` | `D2C Baseline Card` | preview verification report 已通过 `scripts/check-verify-report.mjs`，并包含 Chrome 截图 |
| `[>]` | merge report 协议 | `d2c-merge` | `D2C Baseline Card` | 记录目标文件、imports、assets、resolvedTokens |
| `[>]` | 中断恢复 | `d2c` | `Interrupted Run Fixture` | 可从 manifest 判断下一步并恢复执行 |

## 1. Init 阶段能力

Init 的职责是把目标业务项目转换成 D2C 可理解、可生成、可验证的工作区。它不处理单个 Figma 设计稿，而是建立后续 Extract / Generate / Validate / Merge 需要依赖的项目上下文。

| 状态 | 能力项 | 建设位置 | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | `.d2c/` 目录初始化 | `d2c-init` | 创建 preview、context、assets、docs/reference、design-specs、generation-logs、validation-reports、verification-reports、merge-reports、sessions |
| `[>]` | 已有结构检查与补齐 | `d2c-init` | 检查 `.d2c/preview/package.json`、`project-config.json`、`design-system.json`，缺失时补齐且保留已有 context |
| `[>]` | 项目技术栈检测 | `d2c-init` | 识别 framework、language、buildTool、cssStrategy、componentLibrary、router、stateManagement、reactMajor |
| `[>]` | 项目路径与工具链检测 | `d2c-init` | 记录 srcRoot、componentDirs、pageDirs、styleDirs、assetDirs、aliases、packageManager、scripts、linter、formatter、styleLinter |
| `[>]` | Vue 3 preview 模板 | `d2c-init` | 生成 Vite + TypeScript + Vue preview 模板，包含 dev、build、preview、type-check scripts |
| `[>]` | React preview 模板 | `d2c-init` | 根据 React 版本生成 Vite + TypeScript + React preview 模板，包含 React 17/18 入口差异 |
| `[>]` | JSON 优先 context 生成 | `d2c-init` | 生成 `project-config.json`、`design-system.json`、`component-library.json`、`project-adapter.json` |
| `[>]` | Markdown 人工镜像同步 | `d2c-init` | 生成或同步 project-config、design-system、component-library 的 Markdown 摘要 |
| `[>]` | design-system 自动回填 | `d2c-init` | 根据 less、tailwind、sass、styled-components、css-modules、scoped 提取 token 来源和 helper |
| `[>]` | component-library 自动回填 | `d2c-init` | 检测 Ant Design、Ant Design Vue、Element Plus 等常见组件库并预置高频组件契约 |
| `[>]` | project-adapter 自动回填 | `d2c-init` | 记录 tokenSources、mergeTargets、validationCommands、样式共址规则和项目特例 |
| `[>]` | preview 依赖安装策略 | `d2c-init` | 按 lockfile 或默认 npm 选择 npm/pnpm/yarn 安装 preview 依赖 |
| `[>]` | `.gitignore` 维护 | `d2c-init` | 追加 `.d2c/preview/node_modules/` 与 `.d2c/preview/dist/`，避免重复 |
| `[>]` | MCP 配置提示 | `d2c-init` | 提示 Figma MCP 与 Chrome DevTools MCP 的用途和配置需求 |

## 2. Extract 阶段能力

| 状态 | 能力项 | Figma 示例 | 验收标准 |
| --- | --- | --- | --- |
| `[x]` | Figma raw 数据持久化 | `D2C Baseline Card` | Figma MCP raw/context 工件已保存并写入 manifest |
| `[>]` | `.mcp.json` Figma MCP 连接探测 | `普通模板 5362:136850` | 能按目标项目 `.mcp.json` 拉起 stdio MCP，完成 `initialize`、`tools/list` 和 `get_figma_data` |
| `[x]` | assets manifest | `Image Card` | `Image Card` 已导出参考图和 image fill，assets manifest 已写入运行证据 |
| `[x]` | Auto Layout 解析 | `Plain Marketing Section` | `Plain Marketing Section` 已从 Figma MCP 结构中提取 column/row、gap、padding、alignment 并生成 preview |
| `[>]` | 约束与尺寸解析 | `Responsive Pricing Page` | 能提取 width、height、min/max、constraints |
| `[>]` | requiredStyle 提取 | `Token Playground` | 颜色、字号、字重、行高、圆角、阴影等可生成值完整 |
| `[>]` | tokenCandidates | `Token Playground` | 原始值、候选语义、置信度、证据完整 |
| `[>]` | uiPatternCandidates | `Open UI Admin Page` | button、form-field、table、tabs、modal 等模式可识别 |
| `[>]` | iconCandidates | `Icon Toolbar` | 识别 SVG、icon component、iconfont 命名候选 |
| `[>]` | chartCandidates | `Analytics Report` | 保留 `5601:71250` 双层环图历史证据；`Analytics Report Full` 三节点 structured-raw 候选覆盖折线、柱状、五项环图、图例和 Tooltip 展示态。新 visual-convergence run 已固化组件契约评估；三轮 preview diff 仍超阈值，用户于 `2026-06-06` 人工接受当前差异后继续完成 target verify，但 target diff 仍超阈值 |
| `[>]` | responsiveFrames | `Responsive Pricing Page` | 关联 desktop/tablet/mobile frames |
| `[x]` | variants / interactionStates | `Interactive Component Set` | `Interactive Component Set` 已识别 default、hover、disabled、focus 并生成状态验证报告 |

## 3. Generate 阶段能力

| 状态 | 能力项 | Figma 示例 | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | Vue 3 preview 生成 | `D2C Baseline Card` | `.vue` 组件和入口可构建 |
| `[x]` | React preview 生成 | `D2C Baseline Card` | Phase 1 React preview 已通过 `npm run type-check` 和 `npm run build` |
| `[x]` | 普通 HTML/CSS 模板 | `Plain Marketing Section` | `Plain Marketing Section` 使用原生结构和 CSS raw values 完成 preview 验证 |
| `[>]` | 组件拆分 | `Order Management Console` | 超过 5 个独立区域时拆分子组件 |
| `[>]` | tokenHints 生成 | `Token Playground` | preview 保留 raw value，同时产出候选 tokenHints |
| `[x]` | componentMappings | `Open UI Admin Page` | 已输出 Ant Design 组件选择、props、styleFit 和局部覆盖决策 |
| `[x]` | 开源组件库生成 | `Open UI Admin Page` | 已使用 Ant Design 组件生成 React preview 并保留必要覆盖 |
| `[x]` | 业务组件库生成 | `Business Dashboard` | 已根据目标项目公开 props 契约采用 `BasicDataTable`；`FormBar`、`block-card` 和业务语义不足的候选均记录 fallback |
| `[>]` | icon / iconfont 生成 | `Icon Toolbar` | 输出组件库 Icon、iconfont class 或 SVG fallback |
| `[>]` | 图表代码生成 | `Analytics Report` | 历史环图已生成 `ReactEchartsCore` preview；复合示例已生成三个稳定 selector。新协议记录 line / bar 匹配 `MultipleLegendChart` 公开 props 契约，donut 缺少业务 wrapper 契约并回退本地 `ReactEchartsCore`。视觉 diff 未过阈值 |
| `[>]` | 响应式代码生成 | `Responsive Pricing Page` | 输出 media/container rules，不破坏 desktop 基线 |
| `[x]` | variants/state 代码生成 | `Interactive Component Set` | 状态映射为 preview state class，默认、hover、disabled、focus 已截图验证 |
| `[>]` | 偏差报告回灌 | `D2C Baseline Card - Drift` | verify 失败后只修改偏差相关代码 |

## 4. Validate 阶段能力

| 状态 | 能力项 | 验收标准 |
| --- | --- | --- |
| `[>]` | preview 依赖安装 | `.d2c/preview/node_modules` 缺失时可安装并记录 |
| `[x]` | preview type-check | Vue 使用 `vue-tsc`，React 使用 `tsc` |
| `[x]` | preview build | Vite build 通过或报告失败原因 |
| `[>]` | preview lint | 检测到 linter 时执行，缺失时明确 SKIPPED |
| `[x]` | preview dev server | 记录可访问 previewUrl |
| `[x]` | target changed-files type-check | `Open UI Admin Page` 和 `Business Dashboard` 已从 merge report 获取新增文件，并使用目标项目真实依赖完成 scoped TypeScript 与 LESS 校验 |
| `[>]` | target project-wide diagnostics | 全项目 type-check / build 仅按需执行，不因历史错误降级 changed-files 结果 |
| `[>]` | target lint / format / stylelint | 按目标项目配置执行或跳过 |
| `[>]` | 命令自动检测矩阵 | 覆盖 npm/pnpm/yarn、Vite/Umi/Next/Webpack |
| `[>]` | 降级与失败状态 | target validate 失败时不得声明流程完成 |

## 5. Verify 阶段能力

| 状态 | 能力项 | Figma 示例 | 验收标准 |
| --- | --- | --- | --- |
| `[x]` | Chrome MCP 可用性检测 | 任意示例 | Phase 1 已使用 Chrome DevTools 对 4 个 preview 示例完成元素截图 |
| `[>]` | `.mcp.json` Chrome MCP 连接探测 | 任意示例 | 能按目标项目 `.mcp.json` 拉起 Chrome DevTools MCP 并完成工具枚举；报告记录 `mcpProbe`、工具缺口和人工检查地址 |
| `[x]` | preview 截图验证 | `D2C Baseline Card` | 4 个 Phase 1 示例已按设计稿尺寸保存 reference/actual/diff 工件并通过 verify report 校验 |
| `[>]` | target 截图验证 | `Open UI Admin Page` | `Analytics Report` 环图已完成 target Chrome MCP 截图和 canonical diff；完整页面仍需继续复核组件库、token、资源路径影响 |
| `[>]` | 多断点验证 | `Responsive Pricing Page` | desktop/tablet/mobile 分别截图和评分；缺少断点时写 SKIPPED 原因且整体降级 |
| `[x]` | 状态验证 | `Interactive Component Set` | 默认、hover、disabled、focus 已写入 stateChecks，触发方式和截图路径可复查 |
| `[>]` | 视觉 diff 自动化 | 全部示例 | 固定阈值、报告截图、偏差定位可重复；JSON 报告可用 `scripts/check-verify-report.mjs` 校验 |
| `[>]` | 偏差分类 | 全部示例 | layout、typography、color、component 分类清晰 |
| `[>]` | verify 到 generate 的闭环 | `D2C Baseline Card - Drift` | 偏差报告可作为下一轮 generate 输入 |

## 6. Merge 阶段能力

| 状态 | 能力项 | Figma 示例 | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | 目标项目结构分析 | 任意 target 测试数据 | 识别 src、components、pages/views、styles、assets |
| `[>]` | 文件落位 | `Plain Marketing Section` | preview 入口不覆盖目标项目入口，组件/样式/资源落到合理目录 |
| `[>]` | import / alias 适配 | `Plain Marketing Section` | 根据 tsconfig/vite/webpack alias 更新路径 |
| `[>]` | 资源迁移 | `Image Card` | 图片、SVG 等迁移到目标资源目录并更新引用 |
| `[>]` | resolvedTokens | `Token Playground` | 证据可靠才替换 token，不可靠保留 raw value |
| `[x]` | 开源组件库 merge | `Open UI Admin Page` | 报告已记录 `openSourceComponentMerges`、目标 import、主题绑定、局部覆盖、styleFit 证据和 fallback 原因 |
| `[x]` | 业务组件库 merge | `Business Dashboard` | 报告已记录 `businessComponentMerges`、业务组件路径、props contract、数据绑定状态、overridePolicy 和替换证据；真实采用 `BasicDataTable` |
| `[>]` | iconfont merge | `Icon Toolbar` | 报告记录 `iconMerges`，只接入有证据的 iconfont class / 图标组件；无证据时保留 SVG/image fallback |
| `[>]` | 图表库 merge | `Analytics Report` | 历史 `DEGRADED` run 已隔离合入目标项目。新 visual-convergence run 固化完整 chart contract 字段，并在人工接受 preview 差异后生成新 merge report、通过 changed-files target validate、完成 target verify；target diff 仍超阈值，状态保持 `DEGRADED` |
| `[>]` | 路由建议 | `Order Management Console` | 输出 Vue Router / React Router / Umi 路由建议 |
| `[>]` | 冲突处理策略 | 任意 target 测试数据 | 报告记录 `conflictResolutions`，覆盖文件、路径、import、样式、资源、token、组件 props 冲突且可用 `scripts/check-merge-report.mjs` 校验 |

## 7. Figma 示例建设清单

本节示例的登记源为 `docs/figma-examples.json`，阅读摘要见 `docs/figma-examples.md`。`[>]` 表示已登记真实 Figma 节点，待按所需阶段执行 D2C 验证；登记数据可用 `scripts/check-figma-examples.mjs` 校验。

| 状态 | 示例 | 覆盖能力 | 设计内容要求 |
| --- | --- | --- | --- |
| `[x]` | `D2C Baseline Card` | 流程基线、基础 extract/generate/validate/verify | 已完成 Phase 1 preview 闭环，证据见 `docs/figma-examples.json` |
| `[x]` | `Plain Marketing Section` | 普通模板、布局、组件拆分 | 已完成 Phase 1 preview 闭环，证据见 `docs/figma-examples.json` |
| `[>]` | `普通模板 5362:136850` | 基础模板、Figma MCP extract、React preview、target merge | Phase 2 已完成结构化 Figma MCP extract、preview validate、早期隔离 merge和 changed-files target validate；新 token 已成功导出 reference PNG 和 SVG，但 reference-backed diff 比例 `0.08532` 高于阈值 `0.02`，当前恢复点为 `GENERATE_FROM_DRIFT` |
| `[x]` | `Image Card` | 资源下载与迁移 | 已完成 Phase 1 preview 闭环，证据见 `docs/figma-examples.json` |
| `[x]` | `Open UI Admin Page` | 开源组件库 | 已完成 MCP-first extract、Ant Design preview、人工视觉放行、隔离 merge 和 changed-files target validate；证据见 `docs/figma-examples.json` |
| `[x]` | `Business Dashboard` | 业务组件库 | 已完成 image-fallback extract、业务组件候选评估、人工视觉放行、隔离 merge 和 changed-files target validate；target 截图因不注册路由明确记为 `SKIPPED` |
| `[>]` | `Token Playground` | Design Token | 已登记组件库 Figma 节点 `5340:375412`；待验证 tokenCandidates、tokenHints 和 resolvedTokens |
| `[ ]` | `Icon Toolbar` | 图标与 iconfont | 工具栏、菜单、状态图标、空状态图标 |
| `[>]` | `Analytics Report` | 图表 | repo-local REST 已完成 structured-raw extract；`5601:71250` 实际只覆盖 `116 x 116` 双层环图。用户接受 ECharts raster 差异后，已完成 preview、隔离 merge、changed-files 检查和 target Chrome MCP 截图；完整报表节点仍待补充 |
| `[>]` | `Analytics Report Full` | 复合图表 | 旧 `DEGRADED` run 保留可审计。新 `2026-06-02T16-40-15-analytics-report-full-visual-convergence` 已完成 chart contract 固化、三轮 preview diff、人工接受当前差异、隔离 merge、target validate 和 target verify；preview 第三轮比例为 `0.054535`、`0.048865`、`0.033401`，target 比例为 `0.055451`、`0.048681`、`0.033471`，均仍高于 `0.02`，因此不升级 `[x]` |
| `[>]` | `Order Management Console` | 复杂业务页面 | 已登记企微客户列表 Figma 节点 `320:13867`；待验证路由建议、冲突处理、target validate 和状态覆盖 |
| `[ ]` | `Responsive Pricing Page` | 响应式 | 1440、768、375 三个 frame，内容一致布局不同 |
| `[x]` | `Interactive Component Set` | 交互与变体 | 已完成 Phase 1 preview 闭环，证据见 `docs/figma-examples.json` |
| `[ ]` | `Stress Cases` | 边界场景 | 深层 Auto Layout、长文本、多语言、绝对定位、低 styleFit |

## 8. 自动验证建设清单

本节自动验证入口为 `scripts/check-validation-suite.mjs`，测试数据登记源为 `docs/validation-fixtures/validation-suite.json`。当前阶段不恢复或新增 `tests/` 内容；`[x]` 表示离线测试数据或脚本检查已带 `validationEvidence` 并通过本仓库校验，`[>]` 表示仍需要真实 Figma E2E、目标项目 validate 或浏览器视觉验证进一步闭环。

| 状态 | 验证层级 | 覆盖内容 | 验收标准 |
| --- | --- | --- | --- |
| `[x]` | 结构测试 | skill 文件、模板文件、docs 基础结构 | `scripts/check-validation-suite.mjs` 校验必备 skill、docs、scripts 和 module 8 引用，并在本地检查中登记验证证据 |
| `[x]` | preview 模板静态检查 | preview Vue/React 模板 | 静态校验 preview 模板 package scripts、入口文件和依赖声明；真实安装/构建仍归真实 E2E 验证 |
| `[x]` | 协议快照测试 | manifest、normalized、generation log、report schema | `docs/validation-fixtures/protocol/*` 可被各 `scripts/check-*.mjs` 稳定校验，并在本地检查中登记验证证据 |
| `[x]` | mock extract 测试 | mock raw Figma 到 normalized | `docs/validation-fixtures/mock/raw-figma.json` 与 normalized 测试数据不依赖 MCP 可回归 |
| `[x]` | mock generate 测试 | normalized 到 preview code | generation log 测试数据覆盖 component/icon/chart/responsive/state 决策，并可被脚本复查 |
| `[x]` | mock merge 测试 | preview 到 target 测试数据 | merge report 测试数据覆盖文件落位、组件库、业务组件、icon、chart、token 和冲突策略 |
| `[x]` | skill eval | 通过 CLI 检查子 skill 行为 | `docs/validation-fixtures/skill-eval/expected-artifacts.json` 固定各子 skill 预期工件，并通过本地检查校验 |
| `[>]` | 真实 Figma E2E | 使用真实 Figma URL 跑全流程 | `docs/figma-examples.json` 已有 4 个 preview-only verified 示例；Chrome MCP 与 changed-files target validate 已验证，普通模板仍需关闭 preview diff 和 target verify |
| `[x]` | 真实运行证据检查 | manifest、required stage report、示例 `[x]` 证据 | `docs/validation-fixtures/real-run/verified-example-registry.json` 覆盖 `[x]` 正路径，防止真实示例缺证据时被误标完成 |
| `[x]` | 视觉回归测试数据 | 截图与参考图 diff | `docs/validation-fixtures/visual/visual-regression-report.json` 固定多断点 diff、评分和偏差定位协议，并通过本地检查校验 |
| `[x]` | 降级场景测试数据 | Figma MCP / Chrome MCP / target build 失败 | `docs/validation-fixtures/degraded/*` 固定 image fallback、Chrome SKIPPED、target build DEGRADED 回归，并通过本地检查校验 |
| `[x]` | 图表组件契约匹配检查 | line / bar / donut 完整与缺字段测试数据 | `docs/validation-fixtures/chart-contract/*` 覆盖业务 wrapper 契约匹配、donut 本地 wrapper 回退和缺字段拒绝路径 |

## 维护规则

- 新增能力时，必须同时补充所属流程阶段、Figma 示例、验收标准和状态。
- 能力完成不能只看代码存在，至少需要一个示例或测试数据验证后才标记 `[x]`。
- Init 负责项目级上下文，不负责单个 Figma 设计稿；Extract 之后的阶段必须优先读取 Init 生成的 JSON context。
- Preview 阶段默认使用 Figma raw value 保证视觉基线；项目 token、业务组件、iconfont 和图表库适配放在 merge 阶段完成。
- Extract 只做事实提取和候选识别；Generate 负责 preview 表达；Merge 负责目标项目表达；Validate/Verify 负责可运行和视觉质量。
- 遇到跨阶段能力时，在每个阶段分别建子项，例如“图表”必须同时覆盖 extract 的 chartCandidates、generate 的图表代码、merge 的图表库适配、verify 的截图复核。
