# 测试：Chrome DevTools MCP 不可用时 d2c-verify 是否跳过验证
run_eval \
  "verify-skip" \
  "使用 /d2c-verify skill 进行视觉验证。注意：如果 Chrome DevTools MCP 不可用，请按 skill 中的降级策略处理。" \
  "跳过|skip|不可用|unavailable|警告|warning|手动|manual|SKIPPED" \
  "Chrome MCP 不可用时跳过视觉验证并给出警告"
