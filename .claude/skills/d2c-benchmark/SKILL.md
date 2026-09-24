---
name: d2c-benchmark
description: Use when a user wants to preview the current model's Figma-to-code output across the fixed PC and mobile benchmark scenarios.
---

# D2C Benchmark

## 目的与边界

一次把固定四个节点生成到隔离的 `.d2c-benchmark/latest/`，向用户提供一个 Figma 原稿与真实页面并排查看的入口。它是日常 `d2c` 之外的可选能力：不修改业务项目，不逐场景请求实现确认，也不评分、排名、分类或判断模型是否通过。

开始前必须读取[固定场景](references/scenarios.md)及[日常 D2C](../d2c/SKILL.md)的 Provider 与 Design context 规则，沿用其设计读取和系统 UI 排除边界；并排查看按[视觉复核指南](../d2c/references/visual-review.md)的应用内容区域对齐原则解释差异，保留原始参考图。不执行项目分析、`D2C.md`、实现预览确认、业务项目合入或业务路由验证。

## 一次执行流程

1. **全局预检。** 在提取设计或重置目录前，确认一个受支持的 Figma MCP Provider 能读取四个节点的结构化上下文并导出参考图。按“用户指定 → 官方 Figma MCP → Figma-Context-MCP”选择并明确提示。再确认两个提交内脚手架、`reset-latest.sh`、`start-preview.sh`、Bash、Git、Python 3、curl、Node/npm、锁文件和构建命令可用，并确认本机端口 `4172`、`4173`、`4174` 可用。不得读取配置、OAuth、Token、环境变量或凭据文件。全局失败时停止全部场景，不创建或重置输出。
2. **只重置一次。** 以仓库的 `.d2c-benchmark/latest/` 为参数运行 `scripts/reset-latest.sh`。场景之间不再重置，也不保留历史。
3. **读取全部设计。** 只使用已选 Provider，分别取得四个节点的结构化上下文和 PNG。完整成功时，将四张参考图写到 `references/pc-data.png`、`references/pc-chart.png`、`references/mobile-content.png`、`references/mobile-form.png`。仅临时超时、限流或资源下载失败可安全重试一次；不得自动切换 Provider 或混用部分结果。
4. **隔离生成。** 即使发生单场景失败，也继续处理其他场景。PC 只写 React + Ant Design 脚手架的指定模块，移动端只写 Vue 3 + Vant 脚手架的指定模块；样式必须限定在当前场景。只使用页面内本地模拟数据和可见交互，不虚构 API、认证、权限、Store、路由或埋点。ECharts 是固定依赖，不得安装、替换或补充其他图表库。
5. **显示单场景失败。** 缺少结构化数据时不得猜页面。保留对应页签，在指定路由显示包含节点、失败阶段和原因的简洁错误面板；不增加重试按钮或总体状态。
6. **安装并构建。** 在两个复制后的应用中使用锁文件安装依赖并分别执行已有构建命令。一个应用构建失败只影响它的两个场景：保留已下载参考图，记录受影响页签和构建原因；必要服务仍能启动时继续展示 review shell。不得改依赖或弱化检查来制造成功。
7. **启动预览。** 运行 `scripts/start-preview.sh .d2c-benchmark/latest`。四个页签左侧显示 Figma，右侧显示真实交互路由；应用或场景无法加载时，保留可用参考和错误证据。
8. **只报告一个入口。** 只把 `http://127.0.0.1:4172` 作为查看入口，同时简述实际生成或构建失败。结果由用户自行判断，不给出分数、阈值、通过/失败、排名、能力标签或总体完成分类。

## 失败处理

| 失败 | 处理 |
|---|---|
| 提取前 Figma MCP 不可用 | 在重置和生成前停止全部场景。 |
| 预检发现重置或构建工具链不可用 | 在重置和生成前停止全部场景。 |
| 一个节点读取或生成失败 | 在该页签记录原因，继续其余三个。 |
| 一个应用构建失败 | 保留参考图、标记该应用的两个场景，条件允许时继续 review shell。 |
| 用户要求给出结论 | 指向并排预览，由用户自行判断。 |

## 固定约束

- 每次执行全部四个节点，不新增、省略或替换。
- `pc-chart` 原稿只是 500 × 320 组件；将它承载在真实 React 路由中，不虚构外围分析页内容。
- 不增加结果 manifest、重试 UI、评分、状态、模型对比或依赖例外。
