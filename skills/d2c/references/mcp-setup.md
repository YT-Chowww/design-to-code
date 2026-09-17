# MCP 配置引导

仅在项目缺少 `.mcp.json`，或用户选择的 Provider 在重启后的当前会话中不可调用时读取本 Reference。

## 安全边界

- `.mcp.json` 已存在时不覆盖、不自动合并，只展示相关片段供用户在本地核对或合并。
- 不读取、接收、填写、保存、复制或输出 OAuth、Personal Access Token（PAT）等凭据。
- 不要求用户把 Token 粘贴到对话中；Token 只由用户在本地编辑器中填写。
- 配置文件存在不代表 Provider 可用。重启后必须以当前会话中的实际可调用工具为准。

## 让用户选择

创建无凭据模板后，明确展示以下选择；用户未指定时推荐“仅官方”：

1. **仅官方（推荐）**：配置 `figma-official`，无需 Token，重启 Claude 后完成 OAuth。
2. **仅社区**：配置 `figma-context`，用户在本地填写 PAT 后重启 Claude。
3. **两者都配置**：同时完成官方 OAuth 和社区 PAT；两者都可用时仍默认官方。

随 Skill 分发的模板包含两个 Provider。选择“仅官方”或“仅社区”时，提示用户在本地删除不使用的另一个 Provider 配置；选择“两者都配置”时保留两者。

## 仅官方 Figma MCP

现有 `.mcp.json` 缺少官方配置时，展示下面的 Server 片段，让用户手动合并到 `mcpServers`：

```json
"figma-official": {
  "type": "http",
  "url": "https://mcp.figma.com/mcp"
}
```

引导顺序：

1. 用户保存本地 `.mcp.json`。
2. 从项目根目录启动或重启 Claude Code。
3. 执行 `/mcp`，选择 `figma-official`，在浏览器完成 OAuth。
4. 返回对话重新调用 D2C Skill。

## 仅 Figma-Context-MCP

现有 `.mcp.json` 缺少社区配置时，展示下面的 Server 片段，让用户手动合并到 `mcpServers`：

```json
"figma-context": {
  "command": "npx",
  "args": [
    "-y",
    "figma-developer-mcp",
    "--figma-api-key=<YOUR_FIGMA_API_KEY>",
    "--stdio"
  ]
}
```

引导顺序：

1. 用户在 Figma 账号设置中创建 Personal Access Token（PAT）。
2. 用户只在本地 `.mcp.json` 中替换 `<YOUR_FIGMA_API_KEY>`；不得在对话中提供 Token。
3. 从项目根目录启动或重启 Claude Code。
4. 返回对话重新调用 D2C Skill。

## 两者都配置

保留模板中的 `figma-official` 和 `figma-context`，先在本地填写社区 PAT，再重启 Claude 并通过 `/mcp` 完成官方 OAuth。两者的选择和降级仍遵守主 Skill 的 Provider 规则，不因配置同时存在而混用结果。

## 重启后验证

- 只根据当前会话中完成目标节点读取所需的实际可调用工具判断 Provider 是否生效，不根据 `.mcp.json` 配置文件文本、Server 名称或凭据占位符推断。
- 选择的 Provider 可调用：说明验证结果并继续正常 D2C 流程。
- 官方不可调用：提示用户用 `/mcp` 查看 `figma-official` 状态并重新完成 OAuth，然后停止。
- 社区不可调用：提示用户在本地核对 PAT 占位符是否已替换、`npx` 是否可执行，并再次重启 Claude，然后停止；不得检查 Token 内容。
