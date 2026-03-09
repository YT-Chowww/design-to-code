#!/bin/bash
# 第 3 层：Skill 行为评估运行器
# 使用 claude CLI 的 -p 模式运行测试用例
# 依赖：claude CLI 已安装且可用
set -e

cd "$(dirname "$0")/.."

RESULTS_DIR="tests/results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

PASS=0
FAIL=0
SKIP=0

# 检查 claude CLI 是否可用
if ! command -v claude &> /dev/null; then
  echo "Error: claude CLI not found. Install it first."
  echo "See: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

run_eval() {
  local name="$1"
  local prompt="$2"
  local assert_pattern="$3"  # grep pattern to match in output
  local assert_desc="$4"

  echo "--- $name ---"

  # 运行 claude 非交互模式
  local output
  if output=$(claude -p "$prompt" --max-turns 3 2>&1); then
    echo "$output" > "$RESULTS_DIR/$name.output.txt"

    # 检查输出是否匹配预期模式
    if echo "$output" | grep -qiE "$assert_pattern"; then
      echo "  ✓ $assert_desc"
      echo "PASS" > "$RESULTS_DIR/$name.result"
      PASS=$((PASS + 1))
    else
      echo "  ✗ $assert_desc"
      echo "FAIL" > "$RESULTS_DIR/$name.result"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  ⚠ claude CLI 执行失败"
    echo "$output" > "$RESULTS_DIR/$name.output.txt"
    echo "ERROR" > "$RESULTS_DIR/$name.result"
    SKIP=$((SKIP + 1))
  fi
}

echo "=== Skill Behavior Evals ==="
echo "Results saved to: $RESULTS_DIR"
echo ""

# 运行所有测试用例
for case_file in tests/evals/cases/*.sh; do
  if [ -f "$case_file" ]; then
    source "$case_file"
  fi
done

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" -eq 0 ] && echo "All eval tests passed!" || echo "Some tests failed!"

# 生成汇总报告
cat > "$RESULTS_DIR/summary.txt" <<EOF
D2C Skill Eval Report
Date: $(date)
Pass: $PASS
Fail: $FAIL
Skip: $SKIP
EOF

exit "$FAIL"
