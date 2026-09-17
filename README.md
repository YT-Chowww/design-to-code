# design-to-code

D2C 是一个面向可识别的现有 Web 前端项目的轻量 Design-to-Code Skill。它读取指定 Figma 节点和当前项目证据，先让用户确认实现方案，再修改代码并在真实页面中验证结果。首版实际验证范围为 React + TypeScript 和 Vue 3 + TypeScript。

## 日常入口

日常实现只使用一个入口：

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

- Figma URL 必须包含具体 `node-id`。
- 未提供 `target-directory` 时，以当前工作目录作为目标项目。
- 目标必须是可识别的现有 Web 前端项目；超出首版已验证技术栈时会明确说明验证边界。
- 日常流程不创建独立预览工作区，也不生成阶段报告链。

## Figma Provider 与认证

D2C 支持官方 Figma MCP 和 Figma-Context-MCP，选择顺序为：用户明确指定、官方 Figma MCP、Figma-Context-MCP。两者都可用且用户未指定时使用官方 Figma MCP。

首次使用 Claude Code 时，可以选择以下模式：

| 模式 | 本地配置 | 启动后的操作 |
| --- | --- | --- |
| 仅官方（推荐） | 保留 `figma-official`，无需 Token | 重启 Claude 后执行 `/mcp`，完成 OAuth |
| 仅社区 | 保留 `figma-context`，在本地填写 Personal Access Token | 重启 Claude |
| 两者都配置 | 保留两个 Provider，并在本地填写社区 Token | 重启 Claude 后执行 `/mcp`，完成官方 OAuth |

具体顺序：

1. 在项目根目录将 `.mcp.example.json` 复制为本地 `.mcp.json`。
2. 按上表保留需要的 Provider；使用社区方案时，在本地把 `--figma-api-key=<YOUR_FIGMA_API_KEY>` 替换为新生成的 Personal Access Token。
3. 从项目根目录启动或重启 Claude Code，使项目级 MCP 配置生效。
4. 使用官方方案时，在 Claude Code 中通过 `/mcp` 完成 OAuth。

如果已经启动 Claude 后才调用 D2C Skill，Skill 会检查 `.mcp.json` 是否存在；缺失时从随 Skill 分发的无凭据模板创建该文件，并引导用户选择“仅官方 / 仅社区 / 两者都配置”。已有 `.mcp.json` 时只展示需要核对的配置片段，不覆盖文件，也不读取、接收或代填 Token。

重启后，Skill 只根据当前会话中实际可调用的工具判断配置是否生效：官方不可用时引导用户检查 `/mcp` 和 OAuth；社区不可用时引导用户在本地核对 Token 占位符、`npx` 和重启状态，但不读取 Token 内容。

`figma-official` 连接 Figma 官方远程 MCP；`figma-context` 运行社区方案。`.mcp.json` 已被 Git 忽略，不得提交或分享；仓库只维护不含真实凭据的模板。

已有克隆从旧版本升级时，先在仓库外保存原 `.mcp.json` 的本地配置，确认备份后把仓库内该文件恢复为当前提交的版本，再拉取更新。更新完成后基于 `.mcp.example.json` 重建本地 `.mcp.json`，使用新生成的 Token，不要把备份加入 Git。

MCP 的安装和认证由用户管理；Skill 仅能在配置缺失时创建无凭据模板。Skill 不读取、保存、复制或输出 OAuth、Token 等凭据。用户未指定 Provider、默认官方返回 OAuth 未授权、授权被拒绝或授权已过期，且社区 Provider 可用时，D2C 会先提示，再丢弃官方结果并用社区 Provider 从目标 `node-id` 重新读取且不混用结果。其他 OAuth 故障、Provider 错误和还原偏差都不会触发切换。用户显式指定官方时，上述三类授权状态也会停止。

## 首次使用的两次确认

项目根目录使用 `D2C.md` 保存团队长期维护的技术栈、组件、Token、布局、资源、修改边界和验证规则。

首次执行时：

1. D2C 对当前项目做有界分析，在对话中展示 `D2C.md` 候选内容；用户确认后才写入项目根目录。
2. D2C 读取指定设计节点和任务相关代码，在对话中展示 ASCII 结构图、组件与 Token 方案、资源与数据边界、预计修改文件；用户确认后才修改业务代码。

后续执行会读取已有 `D2C.md`，但不会自行更新它。若规则与当前代码冲突，以当前代码为事实，并在实现预览中说明。

## 验证方式

实现后按目标项目提供的命令执行适用的类型检查、Lint、测试和构建，并在目标项目的真实路由进行视觉复核。独立演示页不能替代真实页面验证。

Chrome MCP 只在已经识别出具体视觉偏差后用于检查相关元素的尺寸、盒模型、计算样式、父级布局、资源和源码；它不是每次执行的固定步骤。页面无法打开或当前能力不足时，交付结果会明确标注未验证范围和原因。

## 可选 Benchmark

`d2c-benchmark` 与日常 `d2c` 相互独立。它一次使用四个固定节点生成 PC 数据、PC 图表、移动内容和移动表单场景，只写入每轮重建的 `.d2c-benchmark/latest/`，不修改业务项目。PC 使用 React + Ant Design + ECharts，移动端使用 Vue 3 + Vant，场景数据均为本地模拟数据。

统一预览在 `http://127.0.0.1:4172`，左右并排显示 Figma 原稿与真实页面；PC 页面运行在 `4173`，移动页面运行在 `4174`。预览不评分、不排名、不判定通过，结果由用户自行判断。若单场景失败，其余场景继续并保留失败页签；全局 Figma MCP 或脚手架前置条件缺失时整轮停止。

## Agent 使用方式

仓库根目录的 `skills/` 是唯一 Skill 源。OpenClaw 等支持工作区 Agent Skills 的工具可以直接发现它；Claude Code 和 Codex 使用同步脚本安装到各自的用户目录：

```bash
bash scripts/sync-claude-skills.sh
bash scripts/sync-codex-skills.sh
```

同步脚本只创建指向 `skills/` 的符号链接，不复制项目配置或认证信息。

## 仓库检查

修改日常或 Benchmark Skill 后运行静态检查：

```bash
npm run check:d2c-skill
npm run check:d2c-benchmark
```
