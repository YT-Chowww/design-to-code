#!/bin/bash
# 第 4 层：端到端测试（SimpleCard）
# 使用固件数据测试完整的 generate → validate 流程
# 从 project-config.md 读取 framework 后适配断言
# 依赖：Node.js >= 18, claude CLI
set -e

cd "$(dirname "$0")/../.."
source tests/e2e/config.sh

require_claude_cli
ensure_preview_dir

echo "=== E2E Test: SimpleCard generate → validate ==="

# 检测框架
FW=$(detect_framework)
EXT=$(component_ext "$FW")
echo "  Framework: $FW, Extension: $EXT"
echo ""

# Step 1: 用固件数据生成代码
SPEC=$(cat tests/fixtures/simple-card-spec.md)

echo "--- Step 1: Generate code from fixture ---"
claude -p "使用 /d2c-generate skill，根据以下设计规格生成代码到 .d2c/preview/src/components/ 目录：

$SPEC" --max-turns 5 > tests/results/e2e-generate.log 2>&1 || true

# 根据框架查找生成的组件文件
COMP_FILE=""
case "$FW" in
  vue3)
    COMP_FILE="$COMPONENTS_DIR/SimpleCard.vue"
    ;;
  react)
    # React 可能是 .tsx 或 .jsx
    COMP_FILE=$(find "$COMPONENTS_DIR" -maxdepth 1 -name "SimpleCard.tsx" -o -name "SimpleCard.jsx" 2>/dev/null | head -1)
    ;;
  svelte)
    COMP_FILE="$COMPONENTS_DIR/SimpleCard.svelte"
    ;;
  angular)
    COMP_FILE=$(find "$COMPONENTS_DIR" -maxdepth 2 -name "simple-card.component.ts" 2>/dev/null | head -1)
    ;;
  vanilla)
    COMP_FILE=$(find "$COMPONENTS_DIR" -maxdepth 1 -name "SimpleCard.js" -o -name "simple-card.js" 2>/dev/null | head -1)
    ;;
esac

assert "SimpleCard 组件文件已生成 ($EXT)" \
  "[ -n '$COMP_FILE' ] && [ -f '$COMP_FILE' ]"

if [ -n "$COMP_FILE" ] && [ -f "$COMP_FILE" ]; then
  # 框架特定断言
  case "$FW" in
    vue3)
      assert "使用 script setup" \
        "grep -q 'script setup' '$COMP_FILE'"
      assert "使用 scoped style" \
        "grep -q 'style scoped' '$COMP_FILE'"
      ;;
    react)
      assert "是函数组件或箭头函数" \
        "grep -qE 'function SimpleCard|const SimpleCard|export default' '$COMP_FILE'"
      ;;
    svelte)
      assert "包含 script 标签" \
        "grep -q '<script' '$COMP_FILE'"
      ;;
    angular)
      assert "包含 @Component 装饰器" \
        "grep -q '@Component' '$COMP_FILE'"
      ;;
  esac

  # 通用断言
  assert "不包含 any 类型" \
    "! grep -qE ':\s*any[^a-zA-Z]' '$COMP_FILE'"
  assert "不包含内联样式" \
    "! grep -q 'style=\"' '$COMP_FILE'"
fi

# Step 2: 运行校验
echo ""
echo "--- Step 2: Validate generated code ---"
ensure_node_modules

# TypeScript 检查（仅 Vue3 使用 vue-tsc；其他框架用 tsc）
case "$FW" in
  vue3)
    assert "TypeScript 检查通过" \
      "(cd '$PREVIEW_DIR' && npx vue-tsc --noEmit 2>&1)"
    ;;
  react|svelte|angular)
    assert "TypeScript 检查通过" \
      "(cd '$PREVIEW_DIR' && npx tsc --noEmit 2>&1)"
    ;;
esac

assert "Vite 构建成功" \
  "(cd '$PREVIEW_DIR' && npx vite build 2>&1)"

# 清理生成的组件（不影响其他测试）
rm -f "$COMPONENTS_DIR"/SimpleCard.* "$COMPONENTS_DIR"/simple-card.* 2>/dev/null || true

print_results "E2E SimpleCard"
exit "$E2E_FAIL"
