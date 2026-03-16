# 测试：d2c-generate 迭代修改时是否做针对性修改
# 使用真实 fixture 生成的组件做迭代修改断言

TARGET_DIR="$PROJECT_ROOT/.d2c/preview/src/components"
FIXTURE_SPEC="$PROJECT_ROOT/tests/fixtures/mobile-app-onboarding-spec.md"
SPEC_CONTENT=$(cat "$FIXTURE_SPEC")

mkdir -p "$TARGET_DIR"

# 先生成一个基础组件文件（模拟 Step 2 产物）
cat > "$TARGET_DIR/OnboardingScreen.vue" <<'VUEEOF'
<script setup lang="ts">
interface Props {
  currentPage?: number
}
const props = withDefaults(defineProps<Props>(), {
  currentPage: 0
})
</script>

<template>
  <div class="onboarding-screen">
    <div class="illustration-area">
      <div class="illustration-placeholder" />
    </div>
    <div class="pagination-dots">
      <span v-for="i in 3" :key="i"
        :class="['dot', { active: i - 1 === props.currentPage }]" />
    </div>
    <div class="content-area">
      <h1 class="title">Create a prototype in just a few minutes</h1>
      <p class="description">Quickly create interactive prototypes with pre-built components and templates.</p>
    </div>
    <button class="next-button">Next</button>
  </div>
</template>

<style scoped>
.onboarding-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 375px;
  height: 812px;
  background: #FFFFFF;
}
.illustration-area {
  width: 100%;
  height: 400px;
  background: #EAF2FF;
}
.next-button {
  background: #0055CC;
  color: #FFFFFF;
  border-radius: 8px;
  padding: 16px 0;
  width: calc(100% - 48px);
  border: none;
  font-size: 14px;
}
</style>
VUEEOF

run_eval \
  "generate-iteration" \
  "使用 /d2c-generate skill 进行迭代修改。以下是偏差报告：

=== Deviation Report ===
### Color Issues
1. [OnboardingScreen] 按钮背景色应为 #006FFD，当前为 #0055CC
   → 修改 .next-button 的 background-color 为 #006FFD

### Layout Issues
1. [OnboardingScreen] 按钮圆角应为 12px，当前为 8px
   → 修改 .next-button 的 border-radius 为 12px

请根据偏差报告对 .d2c/preview/src/components/OnboardingScreen.vue 做针对性修改，不要全量重写。" \
  "#006FFD|12px|修改|fix|update|针对|specific|Edit" \
  "根据偏差报告做针对性修改而非全量重写"

# 额外断言：检查文件是否被正确修改
echo "  [file checks]"
COMP_FILE="$TARGET_DIR/OnboardingScreen.vue"
if [ -f "$COMP_FILE" ]; then
  if grep -q '#006FFD' "$COMP_FILE" 2>/dev/null; then
    echo "    ✓ 按钮颜色已修改为 #006FFD"
  else
    echo "    ✗ 按钮颜色未修改为 #006FFD"
    FAIL=$((FAIL + 1))
  fi
  if grep -q 'border-radius: 12px' "$COMP_FILE" 2>/dev/null; then
    echo "    ✓ 按钮圆角已修改为 12px"
  else
    echo "    ✗ 按钮圆角未修改为 12px"
    FAIL=$((FAIL + 1))
  fi
  # 确认 script setup 仍在（未被全量重写丢失）
  if grep -q 'script setup' "$COMP_FILE" 2>/dev/null; then
    echo "    ✓ script setup 保留（非全量重写）"
  else
    echo "    ✗ script setup 丢失（可能被全量重写）"
    FAIL=$((FAIL + 1))
  fi
else
  echo "    ✗ OnboardingScreen.vue 不存在"
  FAIL=$((FAIL + 1))
fi

# 清理
rm -f "$COMP_FILE"
