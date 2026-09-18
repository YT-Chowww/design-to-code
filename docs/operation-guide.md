# 操作指南

## 使用前提

- 提供包含具体 `node-id` 的 Figma URL。
- 在目标项目根目录执行，或显式提供目标目录。
- 目标是可识别的现有 Web 前端项目。首版实际验证范围为 React + TypeScript 和 Vue 3 + TypeScript。
- 用户已安装并认证官方 Figma MCP 或 Figma-Context-MCP；Skill 只检查当前会话中所需工具是否可调用。

缺少节点、项目或结构化设计上下文时停止。显式选择的 Provider 不可用或认证失败时，报告原因并停止，不自动换用另一个 Provider。只有用户未显式指定 Provider、默认官方返回 OAuth 未授权、授权被拒绝或授权已过期，且社区 Provider 可用时，才提示后丢弃官方结果，从目标节点用社区 Provider 重新读取且不混用结果。

## 日常入口

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

执行顺序：

```text
前置检查 → Provider → 设计上下文 → 项目规则 → 项目分析
→ 实现预览 → 确认后写入 → 工程验证 → 视觉复核 → 交付
```

首次使用且项目根目录没有 `D2C.md` 时，Skill 会先分析稳定项目规则，在对话中展示候选内容，并等待第一次确认。写入 `D2C.md` 后仍需展示实现预览，等待第二次确认后才修改业务代码。

## Provider

未显式指定时，按“官方 Figma MCP、Figma-Context-MCP、停止”的顺序选择，并在读取前说明本轮 Provider。用户未显式指定 Provider、默认官方返回 OAuth 未授权、授权被拒绝或授权已过期，且社区 Provider 可用时，提示原因、丢弃官方结果，并从目标节点重新读取且不混用结果。临时超时、可恢复限流或资源下载失败最多重试一次；明确额度耗尽时不重试。

首次使用时从 `.mcp.example.json` 创建项目级 `.mcp.json`，选择“仅官方（推荐）”“仅社区”或“两者都配置”，完成本地设置后重启 Claude。Skill 只创建缺失的无凭据模板，不覆盖已有配置；重启后以实际可调用工具判断 Provider 是否生效。完整步骤见 [MCP 配置引导](../.claude/skills/d2c/references/mcp-setup.md)。

## 实现与复核

项目分析只覆盖当前任务相关的说明、配置、组件、Token、样式、路由、数据和验证命令。实现预览会展示 ASCII 布局、关键样式、组件分类、Token 影响、资源状态、数据与交互缺口以及预计修改范围。

用户调整方案后，必须重新读取受影响的 Figma 与项目证据；与 Figma 冲突时以用户最新要求为准，再展示更新后的预览并等待确认。

写入后运行目标项目适用的检查。视觉复核使用真实页面：能直接查看 Figma 与真实页面截图时，发现具体偏差后再用 Chrome 定位；不能直接查看两张截图时，用 Chrome 对比 Figma 结构与 DOM/计算样式，但不据此声称视觉一致。Chrome 不可用时明确记录未验证边界。

## 本仓库维护

```bash
npm test
npm run check:d2c-skill
bash scripts/sync-codex-skills.sh
bash scripts/sync-claude-skills.sh
```

同步脚本只维护指向本仓库的链接。它们会清理六个已退役 Skill 的本仓库链接，但保留普通文件、目录和指向其他来源的链接。
