# design-to-code

D2C 是一个面向现有 React 或 Vue Web 项目的轻量 Design-to-Code Skill。它读取指定 Figma 节点和当前项目证据，先让用户确认实现方案，再修改代码并在真实页面中验证结果。

## 日常入口

日常实现只使用一个入口：

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

- Figma URL 必须包含具体 `node-id`。
- 未提供 `target-directory` 时，以当前工作目录作为目标项目。
- 目标必须是可识别的现有 React 或 Vue Web 前端项目。
- 日常流程不创建独立预览工作区，也不生成阶段报告链。

## Figma Provider 与认证

D2C 支持官方 Figma MCP 和 Figma-Context-MCP，选择顺序为：用户明确指定、官方 Figma MCP、Figma-Context-MCP。两者都可用且用户未指定时使用官方 Figma MCP；必需工具不可用时停止并说明缺失能力。

MCP 的安装、配置和认证由用户管理。Skill 不读取、保存、复制或输出 OAuth、Token 等凭据。Provider 不可用或认证失败时，D2C 会停止，由用户决定修复当前 Provider 或明确改选另一 Provider。

## 首次使用的两次确认

项目根目录使用 `D2C.md` 保存团队长期维护的技术栈、组件、Token、布局、资源、修改边界和验证规则。

首次执行时：

1. D2C 对当前项目做有界分析，在对话中展示 `D2C.md` 候选内容；用户确认后才写入项目根目录。
2. D2C 读取指定设计节点和任务相关代码，在对话中展示 ASCII 结构图、组件与 Token 方案、资源与数据边界、预计修改文件；用户确认后才修改业务代码。

后续执行会读取已有 `D2C.md`，但不会自行更新它。若规则与当前代码冲突，以当前代码为事实，并在实现预览中说明。

## 验证方式

实现后按目标项目提供的命令执行适用的类型检查、Lint、测试和构建，并在目标项目的真实路由进行视觉复核。独立演示页不能替代真实页面验证。

Chrome MCP 只在已经识别出具体视觉偏差后用于检查相关元素的尺寸、盒模型、计算样式、父级布局、资源和源码；它不是每次执行的固定步骤。页面无法打开或当前能力不足时，交付结果会明确标注未验证范围和原因。

## 安装与仓库检查

把仓库内的 Skills 同步到 Claude Code 或 Codex：

```bash
bash scripts/sync-claude-skills.sh
bash scripts/sync-codex-skills.sh
```

修改 D2C Skill 后运行静态检查：

```bash
npm run check:d2c-skill
```
