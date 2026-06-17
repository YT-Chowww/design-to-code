# 需求说明

本文定义 D2C 的产品目标和能力边界，不作为当前实现状态或验收证据。
能力建设状态以 `docs/capability-roadmap.md` 为准；示例证据以
`docs/figma-examples.json`、`docs/validation-fixtures/` 和真实运行工件
为准。

## 功能需求

### FR-1: Figma 设计提取

- 优先通过 Figma MCP 获取设计稿结构化数据，并记录实际 provider。
- Figma MCP 不可用时，可按配置降级到 repo-local dev token 的 file-scoped REST、image export 或人工输入。REST nodes API `200` 仍是完整结构化提取；image export 或人工输入必须标记为 `DEGRADED`。
- `/v1/me` 仅用于可选账号信息探测。缺少 `current_user:read` scope 不能阻止 file-scoped nodes、images 或 assets 请求。
- 预挂载 MCP 的限流结论不得直接套用到 repo-local dev token；raw 工件只记录 token 来源、脱敏指纹、接口状态和错误摘要。
- 保存 raw Figma JSON 或降级来源记录，作为后续审计和回放依据。
- 下载或记录图片、图标等资源，生成 assets manifest。
- 生成 normalized design JSON，包含组件树、布局、视觉要求、`requiredStyle`、`tokenCandidates`、`uiPatternCandidates`。
- 复合节点示例记录 `scopeAssessment`；缺少需求时只能保留 `partially-verified`。
- 输出人工可读设计规格文档。

### FR-2: Preview 代码生成

- 支持 Vue 3 和 React preview 代码生成。
- 以 normalized design JSON 为主输入，不直接依赖会话记忆。
- Preview 样式优先使用 Figma raw value，保证视觉还原基线稳定。
- 生成 `tokenHints`、`componentMappings`、`styleFit`，供 merge 和 verify 使用。
- 图表候选需要契约评估时，记录候选组件、匹配与缺失契约、选择结果、option、adapter、静态数据状态和 fallback 原因。
- 图表 preview 测试数据保持静态，不生成 API、store、hook 或 proxy 修改。
- 迭代时根据 preview 偏差报告做针对性修改。

### FR-3: 代码校验与运行

- `phase=preview`：校验 `.d2c/preview/`，执行类型检查、可用 lint、构建和 dev server。
- `phase=target`：从 merge report 获取本次新增/修改文件，使用目标项目真实依赖执行 changed-files 校验。项目级全量命令仅作为可选诊断。
- 每次校验写入 validation report，并更新 manifest 状态。

### FR-4: 视觉验证

- 通过 Chrome DevTools MCP 截图并与 Figma 参考对比。
- 支持 preview 与 target 两阶段验证。
- 评估布局、字体、颜色、圆角、阴影、资源和组件渲染。
- 评分 ≥90% 且具备截图、diff 或明确人工审核证据时通过，否则输出偏差报告。
- Chrome MCP 不可用时允许 `SKIPPED`，但必须记录原因和人工检查入口；`SKIPPED` 不能作为能力路线图 `[x]` 或示例 `verified` 的证据。
- 自动 diff 超阈值但用户明确接受时保留真实失败 diff，报告写 `DEGRADED` 和 `ACCEPTED_WITH_VISUAL_DIFF`；人工接受不能绕过节点范围检查。

### FR-5: 项目集成

- 读取目标项目结构、别名、工具链、样式策略和组件库配置。
- 将 preview 产物适配并合入目标项目目录。
- 基于 `tokenHints` 和项目上下文生成 `resolvedTokens`。
- 只有证据可靠时才替换为项目 token；否则保留 raw value 并记录 fallback 原因。
- 合并后运行 target validate / verify。
- merge 仅允许修改 manifest `writeBoundary.allow` 内文件，默认禁止 `.mcp.json`、正式 `config/routes.ts`、业务 API、store 和 hook。
- target 浏览器临时 stub 只允许文档内 storage、XHR 或 fetch 覆盖；修改待验证组件输入时 target verify 只能写 `DEGRADED`。
- 图表 wrapper 仅在公开 props 契约匹配时采用；donut 等未覆盖类型回退项目内本地 wrapper，并记录缺失契约。

### FR-6: 运行恢复与审计

- 每次运行生成 `runId` 和 `designId`。
- 使用 `.d2c/docs/sessions/<runId>/manifest.json` 串联所有阶段。
- 所有阶段报告、产物路径、命令结果和降级原因必须写回 manifest 或关联 report。
- 中断后可通过 manifest 恢复。

## 非功能需求

### NFR-1: 可配置性

- `.d2c/context/*.json` 为机器主数据，用户可维护。
- `.md` 文件作为人工镜像和备注。
- 支持不同 CSS 策略、路径别名、组件库和目标项目工具链。

### NFR-2: 容错性

- Figma MCP 不可用时支持可审计降级，但降级结果不得冒充完整通过。
- Chrome MCP 不可用时跳过视觉验证并记录，但不得把跳过结果作为完成证据。
- 当前 D2C run 的 changed-files TypeScript、导入、样式或资源问题多次修复失败时降级并留痕。
- 目标项目历史错误不得降级本次 changed-files 校验结果。

### NFR-3: 模块化

- 每个子 skill 可独立调用。
- 主编排器通过 manifest 协调阶段，而不是耦合子 skill 内部实现。

### NFR-4: 代码质量

- 生成代码遵循 Vue 3 或 React 项目规范。
- 合入阶段遵循目标项目真实编码规范和工具链。
- 目标项目校验失败时不得声明流程完成。

### NFR-5: 证据检查规则

- 示例只有在 required stages 均有可解析报告、状态为 `PASSED`，并登记 `runId`、manifest、artifact paths、validator command、validatedAt 后，才能标记为 `verified`。
- 能力路线图 `[x]` 只能由测试数据、脚本或真实运行证据支撑；`SKIPPED`、`DEGRADED`、缺少截图闭环或 target validate 失败只能保留在待验证状态。
- Markdown 摘要与机器源冲突时，以机器源和实际 artifacts 为准。
