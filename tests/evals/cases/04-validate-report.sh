# 测试：d2c-validate 是否生成检查报告文件
# 断言改为检查报告文件实际生成，而非仅 grep stdout

REPORT_DIR="$PROJECT_ROOT/docs/validation-reports"

run_eval \
  "validate-report" \
  "使用 /d2c-validate skill 对 .d2c/preview/ 项目进行校验。请按照 skill 定义的流程执行检查并输出结构化结果。" \
  "TypeScript|ESLint|Vite|check|build|通过|passed|失败|failed|install" \
  "输出包含 TypeScript/ESLint/Vite 检查结果"

# 额外断言：检查报告文件是否实际生成
echo "  [file checks]"
if [ -d "$REPORT_DIR" ]; then
  REPORT_COUNT=$(find "$REPORT_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$REPORT_COUNT" -ge 1 ]; then
    echo "    ✓ validation-reports/ 下有 $REPORT_COUNT 个报告文件"
    # 检查报告内容
    REPORT_FILE=$(find "$REPORT_DIR" -name "*.md" -type f 2>/dev/null | head -1)
    if grep -qiE "TypeScript|Vite|build|check" "$REPORT_FILE" 2>/dev/null; then
      echo "    ✓ 报告包含检查结果关键词"
    else
      echo "    ⚠ 报告内容缺少检查结果关键词"
    fi
  else
    echo "    ✗ validation-reports/ 目录为空"
    FAIL=$((FAIL + 1))
  fi
else
  echo "    ⚠ docs/validation-reports/ 目录不存在（skill 可能未创建）"
fi
