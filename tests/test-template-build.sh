#!/bin/bash
# 第 2 层：模板项目构建验证
# 验证 Vite 预览项目能正常安装依赖、类型检查、构建
# 依赖：Node.js >= 18
set -e

cd "$(dirname "$0")/.."

WORK_DIR=$(mktemp -d)
PASS=0
FAIL=0

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

assert() {
  local desc="$1"
  shift
  if eval "$@"; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Template Build Test ==="
echo "Working directory: $WORK_DIR"
echo ""

# 复制模板到临时目录
TMPL=".claude/skills/d2c-init/templates/preview"
cp -r "$TMPL"/* "$WORK_DIR/"
cd "$WORK_DIR"

echo "--- npm install ---"
assert "npm install 成功" "npm install --loglevel=error 2>&1"

echo ""
echo "--- TypeScript Check ---"
assert "vue-tsc 类型检查通过" "npx vue-tsc --noEmit 2>&1"

echo ""
echo "--- Vite Build ---"
assert "Vite 构建成功" "npx vite build 2>&1"

echo ""
echo "--- Build Output ---"
assert "dist 目录生成" "[ -d dist ]"
assert "dist/index.html 存在" "[ -f dist/index.html ]"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "All build tests passed!" || echo "Some tests failed!"
exit "$FAIL"
