# D2C 真实项目验收记录

> 状态：`PENDING_EXTERNAL_INPUT`
>
> 记录日期：2026-09-09
>
> 适用范围：轻量 `d2c` Skill 的真实 React/Vue 项目与两种 Figma Provider 端到端验收

## 当前结论

真实项目验收尚未执行。当前会话没有用户明确提供的 React 或 Vue 业务项目路径、目标路由/文件范围及对应 Figma 节点，因此不能推断 E-Space 或其他业务仓库，不能复用已有凭据，也不能选择业务模块代替用户授权。

这一状态只表示“真实项目与 Provider 的端到端证据待补充”，不否定已经完成的仓库内静态检查与行为场景检查，也不表示官方 Figma MCP 或 Figma-Context-MCP 已通过真实流程验收。

## 开始验收所需的最小外部输入

两次验收分别需要用户明确提供：

1. 可操作的项目绝对路径。
2. 允许修改的目标路由、页面或文件范围，以及禁止修改的范围。
3. 包含具体 `node-id` 的 Figma URL。
4. 本次指定的 Provider；React 流程使用官方 Figma MCP，Vue 流程使用 Figma-Context-MCP。
5. 当前会话中已由用户完成相应 Provider 的可用配置或认证；验收过程不读取、复制或记录凭据值。
6. 真实页面的启动方式或可从项目说明中确认的启动入口，以及必要的登录/访问前提。

## 验收执行顺序

每次验收都按以下顺序取证，缺少前置输入时停止并记录为未执行：

```text
确认用户提供的项目与修改范围
→ 校验 Figma URL 的 node-id 与 Provider 可调用性
→ 明确提示本次 Provider
→ 读取结构化设计上下文
→ 有界分析项目
→ D2C.md 缺失时展示候选内容并等待第一次确认
→ 展示 ASCII 图、核心布局/样式、组件与 Token 影响并等待第二次确认
→ 仅在确认范围内写入
→ 执行 changed-surface 工程检查
→ 打开真实路由并进行视觉复核
→ 仅在已识别具体偏差后使用 Chrome 辅助定位
→ 记录结果、差异、未执行项与人工边界
```

## React + TypeScript + Ant Design / 官方 Figma MCP

| 字段 | 记录 |
| --- | --- |
| 状态 | `PENDING_EXTERNAL_INPUT` |
| 日期 | 未执行 |
| 用户提供的项目路径 | 未提供 |
| 技术栈 | React + TypeScript + Ant Design（待真实项目确认） |
| Provider | 官方 Figma MCP（待当前会话可调用性确认） |
| Figma URL | 未提供 |
| 目标路由/文件范围 | 未提供 |
| Provider 提示 | 未观察 |
| D2C.md 确认 | 未观察；项目是否已有该文件未知 |
| 实现预览确认 | 未观察 |
| 修改文件 | 无 |
| 命令与退出码 | 未执行 |
| 真实页面 URL | 未提供/未打开 |
| 视觉复核方式 | 未执行；应按 Figma Frame 视口对比真实页面，发现具体偏差后才使用 Chrome |
| 已知差异 | 尚无可比较结果 |
| 未执行检查 | Provider 调用、项目分析、两次确认、代码写入、类型检查、Lint、测试、构建、真实路由、视觉复核 |

执行后应把每项“未执行/未观察”替换为实际证据；认证、权限或环境错误单独记录，不能写成 Skill 行为失败，也不能静默切换到另一个 Provider。

## Vue 3 + TypeScript + Vant / Figma-Context-MCP

| 字段 | 记录 |
| --- | --- |
| 状态 | `PENDING_EXTERNAL_INPUT` |
| 日期 | 未执行 |
| 用户提供的项目路径 | 未提供 |
| 技术栈 | Vue 3 + TypeScript + Vant（待真实项目确认） |
| Provider | Figma-Context-MCP（待当前会话可调用性确认） |
| Figma URL | 未提供 |
| 目标路由/文件范围 | 未提供 |
| Provider 提示 | 未观察 |
| D2C.md 确认 | 未观察；项目是否已有该文件未知 |
| 实现预览确认 | 未观察 |
| 修改文件 | 无 |
| 命令与退出码 | 未执行 |
| 真实页面 URL | 未提供/未打开 |
| 视觉复核方式 | 未执行；应按 Figma Frame 视口对比真实页面，发现具体偏差后才使用 Chrome |
| 已知差异 | 尚无可比较结果 |
| 未执行检查 | Provider 调用、项目分析、两次确认、代码写入、类型检查、Lint、测试、构建、真实路由、视觉复核 |

执行后应把每项“未执行/未观察”替换为实际证据；认证、权限或环境错误单独记录，不能写成 Skill 行为失败，也不能静默切换到官方 Figma MCP。

## 已完成的仓库内证据

- `npm test` 已用于验证轻量 Skill 的结构约束、退役目录、Reference 链接、模板中立性及活动文档中的旧流程禁用项。
- 五个 forward 场景已覆盖缺少 `node-id`、Provider 失败、缺少 `D2C.md`、公共组件/全局 Token 冲突及非多模态视觉修正分支。
- 上述证据只验证仓库内规则和模型行为，不替代真实业务项目、真实 Provider 调用、真实路由或视觉结果。

## 待验收边界

- 未验证 React + TypeScript + Ant Design 真实项目完整流程。
- 未验证 Vue 3 + TypeScript + Vant 真实项目完整流程。
- 未验证官方 Figma MCP 和 Figma-Context-MCP 各自一次真实端到端调用。
- 未观察真实项目中 `D2C.md` 与实现预览的两次确认是否严格阻止提前写入。
- 未验证 changed-surface 命令、真实页面可达性、视觉复核和条件性 Chrome 定位。
- 不包含任何 OAuth、Token、环境变量或其他凭据值。

补齐外部输入后，应在独立验收执行中更新本文件，并只对可重复出现且能归因于 Skill 的失败新增 RED 场景和最小修正。
