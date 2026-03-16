# 测试：给定真实设计规格后，d2c-generate 是否生成正确格式的代码
# 使用 mobile-app-onboarding-spec.md 真实 fixture
# 断言检查实际生成的文件内容而非 stdout 输出

FIXTURE_SPEC="$PROJECT_ROOT/tests/fixtures/mobile-app-onboarding-spec.md"
SPEC_CONTENT=$(cat "$FIXTURE_SPEC")
TARGET_DIR="$PROJECT_ROOT/.d2c/preview/src/components"

# 确保 preview 目录存在
mkdir -p "$TARGET_DIR"

run_eval \
  "generate-format" \
  "使用 /d2c-generate skill，根据以下设计规格生成代码到 .d2c/preview/src/components/ 目录：

$SPEC_CONTENT" \
  "script setup lang=.ts.|<style scoped>|defineProps|interface" \
  "生成的代码包含 script setup + scoped style + TypeScript"

# 额外断言：检查实际文件内容
echo "  [file checks]"
FOUND_VUE=0
for f in "$TARGET_DIR"/*.vue; do
  [ -f "$f" ] || continue
  FOUND_VUE=1
  fname=$(basename "$f")
  if grep -q 'script setup' "$f" 2>/dev/null; then
    echo "    ✓ $fname: script setup"
  else
    echo "    ✗ $fname: missing script setup"
    FAIL=$((FAIL + 1))
  fi
  if grep -q 'style scoped' "$f" 2>/dev/null; then
    echo "    ✓ $fname: scoped style"
  else
    echo "    ✗ $fname: missing scoped style"
    FAIL=$((FAIL + 1))
  fi
  if grep -qE ':\s*any[^a-zA-Z]' "$f" 2>/dev/null; then
    echo "    ✗ $fname: contains 'any' type"
    FAIL=$((FAIL + 1))
  else
    echo "    ✓ $fname: no 'any' type"
  fi
  if grep -q 'style="' "$f" 2>/dev/null; then
    echo "    ✗ $fname: contains inline style"
    FAIL=$((FAIL + 1))
  else
    echo "    ✓ $fname: no inline style"
  fi
done

if [ "$FOUND_VUE" -eq 0 ]; then
  echo "    ✗ No .vue files generated in $TARGET_DIR"
  FAIL=$((FAIL + 1))
fi

# 清理生成的组件
rm -f "$TARGET_DIR"/Onboarding*.vue "$TARGET_DIR"/onboarding*.vue
