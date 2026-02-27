# design-to-code

## 使用和测试指南

  前置准备

  1. 配置 Figma API Key

  编辑 .mcp.json，替换 <YOUR_FIGMA_API_KEY>：

  # 获取 Key: Figma → Settings → Personal access tokens → Generate new token

  2. 确认 MCP 服务器可用

  在 Claude Code 中启动新会话，MCP 服务器会自动连接。你可以通过 /mcp 命令查看连接状态。

  3. 自定义上下文文件（可选）

  根据你的目标项目编辑 context/ 下的三个文件：
  - context/design-system.md — 你的设计 token
  - context/component-library.md — 你的业务组件
  - context/project-config.md — 你的项目结构

  ---
  使用方式

  完整流程（推荐）

  /d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100 /path/to/my-vue-project

  这会自动执行：提取设计 → 生成代码 → 校验 → 视觉验证 → 合入项目

  仅预览，不合入项目

  /d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100

  不传目标目录时，代码只生成到 templates/vite-preview/，可在 http://localhost:5173 预览。

  单独调用子 skill

  /d2c-extract <figma-url>     # 只提取设计信息，查看解析结果
  /d2c-generate                 # 只生成代码（需先 extract）
  /d2c-validate                 # 只做校验 + 启动 dev server
  /d2c-verify                   # 只做视觉对比（需 dev server 运行中）
  /d2c-merge /path/to/project   # 只合入代码

  ---
  测试建议

  第一步：用简单组件测试

  在 Figma 中创建一个简单卡片（标题 + 描述 + 按钮），复制链接后运行：

  /d2c-extract <简单卡片的 figma-url>

  确认设计信息能正确提取，再逐步测试 generate → validate → verify。

  第二步：测试完整流程

  /d2c <figma-url>

  观察 5 个步骤是否顺利完成，特别关注：
  - 视觉验证是否能识别偏差
  - 迭代循环是否正常修正问题

  第三步：测试降级场景

  - 断开 Figma MCP → 运行 /d2c-extract，确认会提示手动输入
  - 断开 Chrome MCP → 运行 /d2c-verify，确认会跳过视觉验证

  ---
  关于 Figma URL

  URL 格式示例：
  https://www.figma.com/design/ABC123/ProjectName?node-id=1-100

  node-id 参数指定要转换的具体 Frame/组件。你可以在 Figma 中右键点击一个 Frame → "Copy link" 获取带 node-id 的链接。