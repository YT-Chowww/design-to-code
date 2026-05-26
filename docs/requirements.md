# 需求说明

## 功能需求

### FR-1: Figma 设计提取

- 通过 Figma MCP 获取设计稿结构化数据。
- 保存 raw Figma JSON，作为后续审计和回放依据。
- 下载或记录图片、图标等资源，生成 assets manifest。
- 生成 normalized design JSON，包含组件树、布局、视觉要求、`requiredStyle`、`tokenCandidates`、`uiPatternCandidates`。
- 输出人工可读设计规格文档。

### FR-2: Preview 代码生成

- 支持 Vue 3 和 React preview 代码生成。
- 以 normalized design JSON 为主输入，不直接依赖会话记忆。
- Preview 样式优先使用 Figma raw value，保证视觉还原基线稳定。
- 生成 `tokenHints`、`componentMappings`、`styleFit`，供 merge 和 verify 使用。
- 迭代时根据 preview 偏差报告做针对性修改。

### FR-3: 代码校验与运行

- `phase=preview`：校验 `.d2c/preview/`，执行类型检查、可用 lint、构建和 dev server。
- `phase=target`：校验合入后的目标项目，使用目标项目真实命令和依赖。
- 每次校验写入 validation report，并更新 manifest 状态。

### FR-4: 视觉验证

- 通过 Chrome DevTools MCP 截图并与 Figma 参考对比。
- 支持 preview 与 target 两阶段验证。
- 评估布局、字体、颜色、圆角、阴影、资源和组件渲染。
- 评分 ≥90% 通过，否则输出偏差报告。
- Chrome MCP 不可用时允许 `SKIPPED`，但必须记录原因和人工检查入口。

### FR-5: 项目集成

- 读取目标项目结构、别名、工具链、样式策略和组件库配置。
- 将 preview 产物适配并合入目标项目目录。
- 基于 `tokenHints` 和项目上下文生成 `resolvedTokens`。
- 只有证据可靠时才替换为项目 token；否则保留 raw value 并记录 fallback 原因。
- 合并后运行 target validate / verify。

### FR-6: 运行恢复与审计

- 每次运行生成 `runId` 和 `designId`。
- 使用 `.d2c/docs/sessions/<runId>/manifest.json` 串联所有阶段。
- 所有阶段报告和产物路径必须写回 manifest。
- 中断后可通过 manifest 恢复。

## 非功能需求

### NFR-1: 可配置性

- `.d2c/context/*.json` 为机器主数据，用户可维护。
- `.md` 文件作为人工镜像和备注。
- 支持不同 CSS 策略、路径别名、组件库和目标项目工具链。

### NFR-2: 容错性

- Figma MCP 不可用时支持手动输入。
- Chrome MCP 不可用时跳过视觉验证并记录。
- TypeScript 或构建问题多次修复失败时降级并留痕。

### NFR-3: 模块化

- 每个子 skill 可独立调用。
- 主编排器通过 manifest 协调阶段，而不是耦合子 skill 内部实现。

### NFR-4: 代码质量

- 生成代码遵循 Vue 3 或 React 项目规范。
- 合入阶段遵循目标项目真实编码规范和工具链。
- 目标项目校验失败时不得声明流程完成。
