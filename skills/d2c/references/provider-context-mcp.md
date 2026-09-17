# Figma-Context-MCP

## 可用性判断

只根据当前会话真实可调用的工具和本次所需操作判断 Context Provider 是否可用。可以检查 Provider 配置和认证状态，但不得读取、输出或保存 OAuth、Token、环境变量等凭据值。

- 必须存在能按 Figma 文件与具体 `node-id` 返回结构化布局和样式的操作，例如该 Provider 暴露的 `get_figma_data` 或等价能力。
- 需要下载截图或资源时，确认当前会话实际存在对应操作，例如 `download_figma_images` 或等价能力；不要根据 Server 名称推断。
- 用户显式选择 Figma-Context-MCP 而必需操作不可调用时，将其报告为 Provider unavailable 并停止。

## 读取设计证据

1. 用 URL 中的文件和具体 `node-id` 请求结构化布局、尺寸、间距、样式、文本、组件提示及可提供的约束信息。
2. 大节点先请求浅层或限定深度的结构，识别主要子节点，再逐个请求相关子节点。保持在用户确认的目标范围内，避免全文件扫描和重复超大响应。
3. 按需取得目标 Frame 截图以及图片、图标等真实资源，记录它们对应的节点。截图只用于参照，不能替代缺少的结构化布局或样式。
4. 直接使用 Provider 返回的结构化上下文指导项目适配；不转换、不保存统一 normalized 中间格式，也不创建 `.d2c` 工件链。
5. 任何参考代码或组件提示都必须通过当前项目证据校正，不能覆盖现有业务逻辑或直接写成目标项目实现。

## 失败分类与重试

- Token 缺失、无效或过期：说明这是 Token/authentication 问题和受阻操作；不得读取配置、环境变量、Token 文件或要求用户把 Token 发到对话中，等待用户在 Provider 侧处理。
- 权限不足或节点不可访问：报告 permission/not-found，并确认请求的文件和 `node-id`，不改猜其他节点。
- 临时超时、限流或资源下载失败：可以对同一操作安全重试一次，并在报告中说明已重试；第二次失败后停止。
- 结构化布局或样式为空、截断或不对应目标节点：报告 structured-context missing/incomplete；可在同一 Provider 内按已知子节点拆分读取，不能用截图补猜。
- Provider 失败后不自动改用官方 Figma MCP，也不把 Context Provider 的部分结果与另一 Provider 拼接。

```text
Report provider, failed operation, error category, and whether one safe retry was used.
Stop and ask the user whether to retry later or explicitly select the other Provider.
Do not combine partial results.
```
