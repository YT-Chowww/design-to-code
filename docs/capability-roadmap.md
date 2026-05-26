# D2C 能力建设 Roadmap

这份 roadmap 用来跟踪 D2C skill 的长期能力建设。它按流程阶段组织能力项，并为每项能力绑定建议的 Figma example、建设位置和验收标准，方便后续逐步标记状态。

## 状态约定

| 状态 | 含义 |
| --- | --- |
| `[ ]` | 未开始 |
| `[~]` | 设计中或部分实现 |
| `[>]` | 已实现，待验证 |
| `[x]` | 已完成并通过验证 |
| `[!]` | 阻塞或需要重新设计 |

## 当前评估口径

本次状态基于现有 `.claude/skills/d2c*` skill 文档、context 模板、docs 协议，以及 `ms-fe-basic` 中已执行的普通模板 D2C run 评估。当前仍不轻易标记 `[x]`：只有能力已经沉淀到 skill/脚本，并通过 example、fixture 或端到端验证后，才升级为 `[x]`。

2026-05-24 补充事实：

- `ms-fe-basic` 已完成普通模板节点 `M3lJODRvpEqL78AZdnzwYX / 5362:136850` 的两轮真实 run。
- 首轮使用 `figma-rest` 完成 extract/generate/preview validate/merge，target 聚焦测试通过，但 visual verify 因 Chrome MCP 不可用标记 `SKIPPED`，target validate 因项目既有类型/测试问题标记 `DEGRADED`。
- 次轮已按目标项目 `.mcp.json` 拉起 `figma-developer-mcp`，通过 stdio MCP `tools/list` 发现 `get_figma_data` / `download_figma_images`，并成功用 `get_figma_data` 获取同一 Figma 节点数据，raw provider 记录为 `framelink-context-mcp`。
- MCP 自动发现/调用目前已验证可行，但尚未完整沉淀为 skill 内置脚本或强制执行入口；Chrome DevTools MCP 的 stdio 探测被中断，未形成截图验证闭环。

| 状态 | 本文中的判定口径 |
| --- | --- |
| `[>]` | skill 中已有明确流程、输入输出和工件协议，但缺少验证 |
| `[~]` | 已有入口、上下文或部分规则，但跨阶段链路不完整 |
| `[ ]` | 当前 skill 中尚无明确协议或实现路径 |

## 总体阶段

| 状态 | 阶段 | 目标 | 主要验收 |
| --- | --- | --- | --- |
| `[>]` | 0. 流程基线设计 | 建立可恢复、可审计、可门禁的 D2C 主流程 | manifest 与阶段工件协议完整，所有阶段有状态和报告路径 |
| `[>]` | 1. Init 初始化与上下文能力 | 初始化 `.d2c/` 工作区、检测目标项目、生成 preview 工程和 context | project-config、design-system、component-library、project-adapter 可供后续阶段读取 |
| `[>]` | 2. 基础模板能力 | 支持不依赖组件库的普通页面生成 | Vue/React preview 可构建，raw value 视觉还原稳定 |
| `[~]` | 3. 开源组件库能力 | 支持 Ant Design、Ant Design Vue、Element Plus 等组件映射 | componentMappings 与 styleFit 可解释，低匹配自动回退 |
| `[~]` | 4. 业务组件库能力 | 支持项目自定义组件、样式契约和覆盖策略 | merge 后能可靠替换业务组件，并记录替换证据 |
| `[~]` | 5. 复杂 UI 能力 | 支持表单、表格、弹窗、抽屉、状态页、组合布局 | 复杂页面组件拆分合理，target validate 通过 |
| `[>]` | 6. Token 与主题能力 | 支持 token candidates、tokenHints、resolvedTokens | 只在证据可靠时替换项目 token，否则保留 raw value |
| `[~]` | 7. 图标与 iconfont 能力 | 支持 SVG、组件库 Icon、iconfont class 映射 | 图标资源来源清晰，target 可按项目约定接入 |
| `[ ]` | 8. 图表能力 | 支持 chart pattern 识别与图表库代码生成 | 识别图表结构，生成 ECharts/Recharts 等配置 |
| `[ ]` | 9. 响应式能力 | 支持多断点 frame 与响应式样式输出 | desktop/tablet/mobile 截图验证可执行 |
| `[ ]` | 10. 交互与变体能力 | 支持 variants、hover、active、disabled、selected、open state | 状态映射为 props/class/state，关键状态可验证 |
| `[>]` | 11. 自动验证体系 | 建立 fixture、mock、真实 Figma E2E 和视觉验证闭环 | 离线 fixture 与校验脚本已落地，真实 Figma/目标项目/视觉闭环待验证 |

## 0. 流程基线设计

| 状态 | 能力项 | 建设位置 | Figma Example | 验收标准 |
| --- | --- | --- | --- | --- |
| `[>]` | runId / designId 生成 | `d2c` | 任意单 frame | 每次运行有稳定会话标识和设计标识 |
| `[>]` | manifest 工件索引 | `d2c` | `D2C Baseline Card` | 阶段状态、输入、输出路径写入 manifest |
| `[>]` | 阶段门禁 | `d2c` | `D2C Baseline Card` | extract/generate/validate/verify/merge 顺序不可绕过 |
| `[>]` | normalized design 协议 | `d2c-extract` | `D2C Baseline Card` | 包含 componentTree、requiredStyle、tokenCandidates、uiPatternCandidates |
| `[>]` | generation log 协议 | `d2c-generate` | `D2C Baseline Card` | 记录组件拆分、tokenHints、componentMappings、styleFit |
| `[>]` | validation report 协议 | `d2c-validate` | `D2C Baseline Card` | 记录 type-check、lint、build、server 状态 |
| `[>]` | verification report 协议 | `d2c-verify` | `D2C Baseline Card` | 记录评分、偏差、跳过原因和人工检查入口 |
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

| 状态 | 能力项 | Figma Example | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | Figma raw 数据持久化 | `D2C Baseline Card` | raw JSON 原样保存，路径写入 manifest |
| `[>]` | `.mcp.json` Figma MCP 连接探测 | `普通模板 5362:136850` | 能按目标项目 `.mcp.json` 拉起 stdio MCP，完成 `initialize`、`tools/list` 和 `get_figma_data` |
| `[>]` | assets manifest | `Image Card` | 图片、图标、下载状态和失败原因完整记录 |
| `[>]` | Auto Layout 解析 | `Plain Marketing Section` | 能提取方向、gap、padding、alignment |
| `[>]` | 约束与尺寸解析 | `Responsive Pricing Page` | 能提取 width、height、min/max、constraints |
| `[>]` | requiredStyle 提取 | `Token Playground` | 颜色、字号、字重、行高、圆角、阴影等可生成值完整 |
| `[>]` | tokenCandidates | `Token Playground` | 原始值、候选语义、置信度、证据完整 |
| `[>]` | uiPatternCandidates | `Open UI Admin Page` | button、form-field、table、tabs、modal 等模式可识别 |
| `[>]` | iconCandidates | `Icon Toolbar` | 识别 SVG、icon component、iconfont 命名候选 |
| `[>]` | chartCandidates | `Analytics Report` | 识别 chart 类型、坐标轴、系列、图例、数据形状 |
| `[>]` | responsiveFrames | `Responsive Pricing Page` | 关联 desktop/tablet/mobile frames |
| `[>]` | variants / interactionStates | `Interactive Component Set` | 识别 default、hover、active、disabled、selected、open |

## 3. Generate 阶段能力

| 状态 | 能力项 | Figma Example | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | Vue 3 preview 生成 | `D2C Baseline Card` | `.vue` 组件和入口可构建 |
| `[>]` | React preview 生成 | `D2C Baseline Card` | `.tsx` 组件和入口可构建 |
| `[>]` | 普通 HTML/CSS 模板 | `Plain Marketing Section` | 不依赖组件库即可还原布局和视觉 |
| `[>]` | 组件拆分 | `Order Management Console` | 超过 5 个独立区域时拆分子组件 |
| `[>]` | tokenHints 生成 | `Token Playground` | preview 保留 raw value，同时产出候选 tokenHints |
| `[>]` | componentMappings | `Open UI Admin Page` | 输出组件选择、props、styleFit 和回退决策 |
| `[>]` | 开源组件库生成 | `Open UI Admin Page` | 使用 Ant Design / Element Plus 组件并保留必要覆盖 |
| `[>]` | 业务组件库生成 | `Business Dashboard` | 根据 component-library 契约使用业务组件 |
| `[>]` | icon / iconfont 生成 | `Icon Toolbar` | 输出组件库 Icon、iconfont class 或 SVG fallback |
| `[>]` | 图表代码生成 | `Analytics Report` | 输出图表组件、option/config 和样式容器 |
| `[>]` | 响应式代码生成 | `Responsive Pricing Page` | 输出 media/container rules，不破坏 desktop 基线 |
| `[>]` | variants/state 代码生成 | `Interactive Component Set` | 状态映射为 props、class 或本地 state |
| `[>]` | 偏差报告回灌 | `D2C Baseline Card - Drift` | verify 失败后只修改偏差相关代码 |

## 4. Validate 阶段能力

| 状态 | 能力项 | 验收标准 |
| --- | --- | --- |
| `[>]` | preview 依赖安装 | `.d2c/preview/node_modules` 缺失时可安装并记录 |
| `[>]` | preview type-check | Vue 使用 `vue-tsc`，React 使用 `tsc` |
| `[>]` | preview build | Vite build 通过或报告失败原因 |
| `[>]` | preview lint | 检测到 linter 时执行，缺失时明确 SKIPPED |
| `[>]` | preview dev server | 记录可访问 previewUrl |
| `[>]` | target type-check | 使用目标项目真实命令优先 |
| `[>]` | target build | 使用目标项目真实 build script 优先 |
| `[>]` | target lint / format / stylelint | 按目标项目配置执行或跳过 |
| `[>]` | 命令自动检测矩阵 | 覆盖 npm/pnpm/yarn、Vite/Umi/Next/Webpack |
| `[>]` | 降级与失败状态 | target validate 失败时不得声明流程完成 |

## 5. Verify 阶段能力

| 状态 | 能力项 | Figma Example | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | Chrome MCP 可用性检测 | 任意 example | 不可用时报告 SKIPPED 和人工检查地址 |
| `[>]` | `.mcp.json` Chrome MCP 连接探测 | 任意 example | 能按目标项目 `.mcp.json` 拉起 Chrome DevTools MCP 并完成工具枚举；报告记录 `mcpProbe`、工具缺口和人工检查地址 |
| `[>]` | preview 截图验证 | `D2C Baseline Card` | 能按设计稿尺寸截图并给出评分 |
| `[>]` | target 截图验证 | `Open UI Admin Page` | 合入后复核组件库、token、资源路径影响 |
| `[>]` | 多断点验证 | `Responsive Pricing Page` | desktop/tablet/mobile 分别截图和评分；缺少断点时写 SKIPPED 原因且整体降级 |
| `[>]` | 状态验证 | `Interactive Component Set` | 默认、hover、disabled、open 等关键状态可检查；报告记录触发方式、截图和回退语义 |
| `[>]` | 视觉 diff 自动化 | 全部 examples | 固定阈值、报告截图、偏差定位可重复；JSON 报告可用 `scripts/check-verify-report.mjs` 校验 |
| `[>]` | 偏差分类 | 全部 examples | layout、typography、color、component 分类清晰 |
| `[>]` | verify 到 generate 的闭环 | `D2C Baseline Card - Drift` | 偏差报告可作为下一轮 generate 输入 |

## 6. Merge 阶段能力

| 状态 | 能力项 | Figma Example | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | 目标项目结构分析 | 任意 target fixture | 识别 src、components、pages/views、styles、assets |
| `[>]` | 文件落位 | `Plain Marketing Section` | preview 入口不覆盖目标项目入口，组件/样式/资源落到合理目录 |
| `[>]` | import / alias 适配 | `Plain Marketing Section` | 根据 tsconfig/vite/webpack alias 更新路径 |
| `[>]` | 资源迁移 | `Image Card` | 图片、SVG 等迁移到目标资源目录并更新引用 |
| `[>]` | resolvedTokens | `Token Playground` | 证据可靠才替换 token，不可靠保留 raw value |
| `[>]` | 开源组件库 merge | `Open UI Admin Page` | 报告记录 `openSourceComponentMerges`、目标 import、主题绑定、局部覆盖、styleFit 证据和 fallback 原因 |
| `[>]` | 业务组件库 merge | `Business Dashboard` | 报告记录 `businessComponentMerges`、业务组件路径、props contract、数据绑定状态、overridePolicy 和替换证据 |
| `[>]` | iconfont merge | `Icon Toolbar` | 报告记录 `iconMerges`，只接入有证据的 iconfont class / 图标组件；无证据时保留 SVG/image fallback |
| `[>]` | 图表库 merge | `Analytics Report` | 报告记录 `chartMerges`、目标图表库封装、option/config、dataAdapter、数据绑定状态和 fallback 原因 |
| `[>]` | 路由建议 | `Order Management Console` | 输出 Vue Router / React Router / Umi 路由建议 |
| `[>]` | 冲突处理策略 | 任意 target fixture | 报告记录 `conflictResolutions`，覆盖文件、路径、import、样式、资源、token、组件 props 冲突且可用 `scripts/check-merge-report.mjs` 校验 |

## 7. Figma Example 建设清单

本节 example 的登记源为 `docs/figma-examples.json`，阅读摘要见 `docs/figma-examples.md`。`[>]` 表示已登记真实 Figma 节点，待按所需阶段执行 D2C 验证；登记数据可用 `scripts/check-figma-examples.mjs` 校验。

| 状态 | Example | 覆盖能力 | 设计内容要求 |
| --- | --- | --- | --- |
| `[>]` | `D2C Baseline Card` | 流程基线、基础 extract/generate/validate/verify | 已登记真实 Figma 节点 `5301:76004`；待跑 extract、generate、preview validate、preview verify |
| `[>]` | `Plain Marketing Section` | 普通模板、布局、组件拆分 | 已登记 Ant Design Figma 节点 `39889:87855`；待验证布局提取、组件拆分和 preview 生成 |
| `[>]` | `普通模板 5362:136850` | 基础模板、Figma MCP extract、React preview、target merge | 已用真实 Figma 节点完成 MCP extract 与 preview/target 聚焦校验；视觉截图和完整 target validate 未通过 |
| `[>]` | `Image Card` | 资源下载与迁移 | 已登记真实 Figma 节点 `5308:125805`；待验证资源下载、assets manifest 和图片 fallback |
| `[>]` | `Open UI Admin Page` | 开源组件库 | 已登记 Ant Design Figma 节点 `64462:1762`；待验证组件候选、开源组件生成与目标项目 merge |
| `[>]` | `Business Dashboard` | 业务组件库 | 已登记真实 Figma 节点 `5601:71203`；待验证业务组件候选、props contract、数据 adapter 与 merge |
| `[>]` | `Token Playground` | Design Token | 已登记组件库 Figma 节点 `5340:375412`；待验证 tokenCandidates、tokenHints 和 resolvedTokens |
| `[ ]` | `Icon Toolbar` | 图标与 iconfont | 工具栏、菜单、状态图标、空状态图标 |
| `[>]` | `Analytics Report` | 图表 | 已登记真实 Figma 节点 `5601:71250`；待验证 chartCandidates、图表生成、视觉复核与目标图表库 merge |
| `[>]` | `Order Management Console` | 复杂业务页面 | 已登记企微客户列表 Figma 节点 `320:13867`；待验证路由建议、冲突处理、target validate 和状态覆盖 |
| `[ ]` | `Responsive Pricing Page` | 响应式 | 1440、768、375 三个 frame，内容一致布局不同 |
| `[>]` | `Interactive Component Set` | 交互与变体 | 已登记组件库 Figma 节点 `54:208176`；待验证 variants / interactionStates 提取和状态生成 |
| `[ ]` | `Stress Cases` | 边界场景 | 深层 Auto Layout、长文本、多语言、绝对定位、低 styleFit |

## 8. 自动验证建设清单

本节自动验证入口为 `scripts/check-validation-suite.mjs`，fixture 登记源为 `docs/validation-fixtures/validation-suite.json`。当前阶段不恢复或新增 `tests/` 内容；`[>]` 表示已具备离线协议/fixture/脚本门禁，待真实 Figma E2E、目标项目 validate 或浏览器视觉验证进一步升级为 `[x]`。

| 状态 | 验证层级 | 覆盖内容 | 验收标准 |
| --- | --- | --- | --- |
| `[>]` | 结构测试 | skill 文件、模板文件、docs 基础结构 | `scripts/check-validation-suite.mjs` 校验必备 skill、docs、scripts 和 module 8 引用 |
| `[>]` | 模板构建 | preview Vue/React 模板 | 静态校验 preview 模板 package scripts、入口文件和依赖声明；真实安装/构建待后续统一测试 |
| `[>]` | 协议快照测试 | manifest、normalized、generation log、report schema | `docs/validation-fixtures/protocol/*` 可被各 `scripts/check-*.mjs` 稳定校验 |
| `[>]` | mock extract 测试 | mock raw Figma 到 normalized | `docs/validation-fixtures/mock/raw-figma.json` 与 normalized fixture 不依赖 MCP 可回归 |
| `[>]` | mock generate 测试 | normalized 到 preview code | generation log fixture 覆盖 component/icon/chart/responsive/state 决策 |
| `[>]` | mock merge 测试 | preview 到 target fixture | merge report fixture 覆盖文件落位、组件库、业务组件、icon、chart、token 和冲突策略 |
| `[>]` | skill eval | 通过 CLI 检查子 skill 行为 | `docs/validation-fixtures/skill-eval/expected-artifacts.json` 固定各子 skill 预期工件 |
| `[>]` | 真实 Figma E2E | 使用真实 Figma URL 跑全流程 | `docs/figma-examples.json` 已登记真实 Figma 样例并可校验；Chrome 视觉验证和完整 target validate 尚未闭环 |
| `[>]` | 视觉回归 | 截图与参考图 diff | `docs/validation-fixtures/visual/visual-regression-report.json` 固定多断点 diff、评分和偏差定位协议 |
| `[>]` | 降级场景 | Figma MCP / Chrome MCP / target build 失败 | `docs/validation-fixtures/degraded/*` 固定 image fallback、Chrome SKIPPED、target build DEGRADED 回归 |

## 维护规则

- 新增能力时，必须同时补充所属流程阶段、Figma example、验收标准和状态。
- 能力完成不能只看代码存在，至少需要一个 example 或 fixture 验证后才标记 `[x]`。
- Init 负责项目级上下文，不负责单个 Figma 设计稿；Extract 之后的阶段必须优先读取 Init 生成的 JSON context。
- Preview 阶段默认使用 Figma raw value 保证视觉基线；项目 token、业务组件、iconfont 和图表库适配放在 merge 阶段完成。
- Extract 只做事实提取和候选识别；Generate 负责 preview 表达；Merge 负责目标项目表达；Validate/Verify 负责可运行和视觉质量。
- 遇到跨阶段能力时，在每个阶段分别建子项，例如“图表”必须同时覆盖 extract 的 chartCandidates、generate 的图表代码、merge 的图表库适配、verify 的截图复核。
