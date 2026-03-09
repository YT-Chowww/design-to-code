#!/bin/bash
# D2C 测试运行器 — 运行所有层级的测试
set -e

cd "$(dirname "$0")/.."

TOTAL_PASS=0
TOTAL_FAIL=0

run_layer() {
  local name="$1"
  local script="$2"
  local required="$3"  # "required" or "optional"

  echo ""
  echo "╔══════════════════════════════════════╗"
  echo "  Layer: $name"
  echo "╚══════════════════════════════════════╝"
  echo ""

  if bash "$script"; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    if [ "$required" = "required" ]; then
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
    else
      echo "  (optional layer, not counted as failure)"
    fi
  fi
}

echo "=== D2C Test Suite ==="

# 第 1 层：结构校验（必需，无外部依赖）
run_layer "Structure Validation" "tests/test-structure.sh" "required"

# 第 2 层：模板构建（必需，依赖 Node.js）
if command -v node &> /dev/null; then
  run_layer "Template Build" "tests/test-template-build.sh" "required"
else
  echo ""
  echo "⚠ Skipping Layer 2 (Node.js not found)"
fi

# 第 3 层：Skill 行为评估（可选，依赖 claude CLI）
if command -v claude &> /dev/null; then
  if [ "${RUN_EVALS:-0}" = "1" ]; then
    run_layer "Skill Evals" "tests/evals/run-eval.sh" "optional"
  else
    echo ""
    echo "⚠ Skipping Layer 3 (set RUN_EVALS=1 to enable)"
  fi
else
  echo ""
  echo "⚠ Skipping Layer 3 (claude CLI not found)"
fi

# 第 4 层：端到端测试（可选，依赖 claude CLI）
if command -v claude &> /dev/null; then
  if [ "${RUN_E2E:-0}" = "1" ]; then
    run_layer "E2E Test" "tests/e2e/test-simple-card.sh" "optional"
  else
    echo ""
    echo "⚠ Skipping Layer 4 (set RUN_E2E=1 to enable)"
  fi
else
  echo ""
  echo "⚠ Skipping Layer 4 (claude CLI not found)"
fi

echo ""
echo "╔══════════════════════════════════════╗"
echo "  Final Results"
echo "  Layers passed: $TOTAL_PASS"
echo "  Layers failed: $TOTAL_FAIL"
echo "╚══════════════════════════════════════╝"

[ "$TOTAL_FAIL" -eq 0 ] && echo "All required tests passed!" || echo "Some required tests failed!"
exit "$TOTAL_FAIL"
