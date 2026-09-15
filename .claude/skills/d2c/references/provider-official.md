# 官方 Figma MCP

## 可用性判断

只根据当前会话真实可调用的工具和本次所需操作判断官方 Provider 是否可用，不读取 MCP 配置、OAuth 信息、环境变量或本地凭据。

- 必须存在能按 Figma URL 与具体 `node-id` 取得结构化设计上下文的操作，例如官方 MCP 暴露的 `get_design_context`。
- 需要截图、变量或资源时，相应操作也必须在当前会话可调用；不要因为看见 Server 名称就假定能力存在。
- 用户显式选择官方 Provider 而必需操作不可调用时，将其报告为 Provider unavailable 并停止。

## 读取设计证据

1. 用 URL 中的具体 `node-id` 请求结构化设计上下文，取得布局、尺寸、间距、样式、文本、组件提示、Variants、Constraints 及可用的变量信息。
2. 大节点先请求顶层结构或 metadata，识别主要子节点，再分别请求这些子节点的设计上下文。不要扩大到整份文件，也不要用一次超大请求反复碰限流。
3. 取得与目标 Frame 匹配的截图作为视觉参照。截图只支持复核，不替代结构化上下文。
4. 按需取得图片、图标等真实资源，并保留资源与节点的对应关系。下载失败时说明具体资源，不用占位图或截图手绘结果替代。
5. 官方 MCP 返回的参考代码、组件片段或 Code Connect 提示只属于设计证据。已有 Code Connect 映射必须先核对它是否匹配当前项目代码，匹配后才优先采用；不匹配时以当前代码为准。创建 Code Connect 映射仍是 TODO，不在本次 Skill 范围。所有设计证据都必须结合目标项目的框架、组件、Token、业务逻辑和可访问性要求重新实现，不能直接当作目标项目代码写入。

## 失败分类与重试

- OAuth 未登录、授权过期或授权被拒绝：说明这是 OAuth/authorization 问题和受阻操作；不查看、复制、输出或尝试修复凭据，等待用户在工具侧处理。
- 权限不足或节点不可访问：报告 permission/not-found，并确认请求的文件和 `node-id`，不改猜其他节点。
- 临时超时、限流或资源下载失败：可以对同一操作安全重试一次，并在报告中说明已重试；第二次失败后停止。
- 结构化内容为空、截断或不对应目标节点：报告 structured-context missing/incomplete；可在同一 Provider 内按已知子节点拆分读取，但不能用截图补猜缺失结构。
- Provider 失败后不自动改用 Figma-Context-MCP，也不把官方 Provider 的部分结果与另一 Provider 拼接。

```text
Report provider, failed operation, error category, and whether one safe retry was used.
Stop and ask the user whether to retry later or explicitly select the other Provider.
Do not combine partial results.
```
