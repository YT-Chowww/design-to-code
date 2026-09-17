# MCP 配置引导

仅在项目缺少 `.mcp.json`，或用户选择的 Provider 在重启后仍不可调用时读取。

## 边界

- `.mcp.json` 已存在时不覆盖、不自动合并。
- 可以检查配置是否存在、Provider 是否配置及认证状态；不得读取、输出或保存 OAuth、PAT、环境变量等凭据值。
- 不要求用户把 Token 粘贴到对话中，社区 Token 只由用户在本地填写。
- 配置内容以 [无凭据模板](../assets/mcp.example.json) 为唯一基准；本 Reference 不维护配置副本。

## 选择模式

| 模式 | 保留配置 | 用户操作 |
| --- | --- | --- |
| 仅官方（推荐） | `figma-official` | 重启 Claude，通过 `/mcp` 完成 OAuth |
| 仅社区 | `figma-context` | 在本地填写 PAT，重启 Claude |
| 两者都配置 | 两个 Provider | 填写社区 PAT，重启 Claude，再完成官方 OAuth |

两者都可用时仍默认官方。选择单一 Provider 时，提示用户在本地删除模板中不使用的另一个 Provider。

## 操作步骤

缺少 `.mcp.json`：

1. 从无凭据模板创建项目根目录 `.mcp.json`。
2. 让用户选择模式并在本地完成配置。
3. 提示用户从项目根目录重启 Claude；官方模式还需通过 `/mcp` 完成 OAuth。
4. 停止，等待用户重启后重新调用 D2C Skill。

已有 `.mcp.json` 但缺少所选 Provider：

1. 从无凭据模板展示对应的 `figma-official` 或 `figma-context` 条目，让用户手动合并。
2. 社区模式提示用户在本地替换 `<YOUR_FIGMA_API_KEY>`；不得接收或检查实际 PAT。
3. 提示重启 Claude，并按上面的认证步骤操作，然后停止。

## 重启后验证

- 只根据当前会话中完成目标节点读取所需的实际可调用工具判断 Provider 是否生效，不能根据配置文件文本、Server 名称或已保存凭据推断。
- Provider 可调用：说明结果并继续 D2C 流程。
- 官方不可调用：提示用户通过 `/mcp` 检查 `figma-official` 和 OAuth 状态，然后停止。
- 社区不可调用：提示用户在本地确认占位符已替换、`npx` 可执行并再次重启 Claude，然后停止。
