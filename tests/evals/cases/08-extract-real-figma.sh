# 测试：用真实 Figma URL 测试 d2c-extract，验证产出完整
# 需要 Figma MCP 可用；不可用时测试降级行为

FIGMA_URL="https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-–-Prototyping-Kit--Community-?node-id=240-6278"
SPEC_DIR="$PROJECT_ROOT/docs/design-specs"

run_eval \
  "extract-real-figma" \
  "执行 /d2c-extract skill，提取以下 Figma 设计信息：
$FIGMA_URL

请将提取的设计规格保存到 docs/design-specs/ 目录。" \
  "Onboarding|onboarding|Component Tree|组件|引导|prototype|manual|screenshot|手动|降级" \
  "成功提取 Figma 设计信息或正确降级"

# 额外断言：检查产出文件
echo "  [file checks]"
if [ -d "$SPEC_DIR" ]; then
  SPEC_COUNT=$(find "$SPEC_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SPEC_COUNT" -ge 1 ]; then
    echo "    ✓ design-specs/ 下有 $SPEC_COUNT 个规格文件"
    SPEC_FILE=$(find "$SPEC_DIR" -name "*.md" -type f 2>/dev/null | head -1)
    # 检查关键内容
    if grep -qiE "375|812|mobile|移动" "$SPEC_FILE" 2>/dev/null; then
      echo "    ✓ 规格文件包含移动端尺寸信息"
    fi
    if grep -qiE "#006FFD|#EAF2FF|蓝色|blue" "$SPEC_FILE" 2>/dev/null; then
      echo "    ✓ 规格文件包含颜色信息"
    fi
    if grep -qiE "Next|button|按钮" "$SPEC_FILE" 2>/dev/null; then
      echo "    ✓ 规格文件包含按钮信息"
    fi
  else
    echo "    ⚠ design-specs/ 目录为空（可能 Figma MCP 降级到手动模式）"
  fi
else
  echo "    ⚠ docs/design-specs/ 目录不存在（extract 可能未执行或降级）"
fi
