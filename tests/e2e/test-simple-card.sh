#!/bin/bash
# 第 4 层：端到端测试
# 使用固件数据测试完整的 generate → validate 流程
# 不依赖 Figma MCP，使用预定义的设计规格
# 依赖：Node.js >= 18, claude CLI
set -e

cd "$(dirname "$0")/../.."

PASS=0
FAIL=0

assert() {
  local desc="$1"
  shift
  if eval "$@" > /dev/null 2>&1; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"
    FAIL=$((FAIL + 1))
  fi
}

# 检查 claude CLI
if ! command -v claude &> /dev/null; then
  echo "Error: claude CLI not found"
  exit 1
fi

# 确保 .d2c/preview 目录存在
if [ ! -d .d2c/preview ]; then
  echo "Initializing .d2c/preview from templates..."
  mkdir -p .d2c/preview/src/components
  mkdir -p .d2c/preview/src/assets
  TMPL=".claude/skills/d2c-init/templates/preview"
  cp "$TMPL/package.json" .d2c/preview/
  cp "$TMPL/vite.config.ts" .d2c/preview/
  cp "$TMPL/tsconfig.json" .d2c/preview/
  cp "$TMPL/tsconfig.node.json" .d2c/preview/
  cp "$TMPL/index.html" .d2c/preview/
  cp "$TMPL/src/main.ts" .d2c/preview/src/
  cp "$TMPL/src/App.vue" .d2c/preview/src/
  cp "$TMPL/src/env.d.ts" .d2c/preview/src/
fi

echo "=== E2E Test: SimpleCard generate → validate ==="
echo ""

# Step 1: 用固件数据生成代码
SPEC=$(cat tests/fixtures/simple-card-spec.md)

echo "--- Step 1: Generate code from fixture ---"
claude -p "使用 /d2c-generate skill，根据以下设计规格生成代码到 .d2c/preview/src/components/ 目录：

$SPEC" --max-turns 5 > tests/results/e2e-generate.log 2>&1

assert "SimpleCard.vue 已生成" \
  "[ -f .d2c/preview/src/components/SimpleCard.vue ]"

if [ -f .d2c/preview/src/components/SimpleCard.vue ]; then
  assert "使用 script setup" \
    "grep -q 'script setup' .d2c/preview/src/components/SimpleCard.vue"
  assert "使用 scoped style" \
    "grep -q 'style scoped' .d2c/preview/src/components/SimpleCard.vue"
  assert "不包含 any 类型" \
    "! grep -q ': any' .d2c/preview/src/components/SimpleCard.vue"
  assert "不包含内联样式" \
    "! grep -q 'style=\"' .d2c/preview/src/components/SimpleCard.vue"
fi

# Step 2: 运行校验
echo ""
echo "--- Step 2: Validate generated code ---"
if [ -d .d2c/preview/node_modules ]; then
  echo "  node_modules exists, skipping install"
else
  echo "  Installing dependencies..."
  (cd .d2c/preview && npm install --loglevel=error 2>&1)
fi

assert "TypeScript 检查通过" \
  "(cd .d2c/preview && npx vue-tsc --noEmit 2>&1)"

assert "Vite 构建成功" \
  "(cd .d2c/preview && npx vite build 2>&1)"

# 清理生成的组件（不影响其他测试）
rm -f .d2c/preview/src/components/SimpleCard.vue

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "E2E test passed!" || echo "Some tests failed!"
exit "$FAIL"
