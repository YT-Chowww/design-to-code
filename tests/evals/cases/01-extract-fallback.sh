# 测试：Figma MCP 不可用时 d2c-extract 是否正确降级
run_eval \
  "extract-fallback" \
  "使用 /d2c-extract skill 处理这个 URL: https://www.figma.com/design/fake123/Test?node-id=0-1 。注意：如果 Figma MCP 不可用，请按照 skill 中的降级策略处理。" \
  "手动|manual|截图|screenshot|粘贴|paste|不可用|unavailable|提供|provide" \
  "MCP 不可用时提示用户手动提供设计信息"
