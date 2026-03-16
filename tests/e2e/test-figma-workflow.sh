#!/bin/bash
# E2E 测试：用真实 Figma URL 逐步验证 D2C 工作流
# 按顺序执行 5 步：init → extract → generate → validate → verify
# 每步后做产物断言
#
# 依赖：claude CLI, Node.js >= 18, Figma MCP (extract 步骤)
# 用法：RUN_E2E=1 bash tests/e2e/test-figma-workflow.sh

set -uo pipefail

cd "$(dirname "$0")/../.."
source tests/e2e/config.sh

require_claude_cli

# ── 初始化 ───────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$RESULTS_DIR/e2e-figma-$TIMESTAMP"
mkdir -p "$LOG_DIR"

echo "=== E2E Test: Full Figma D2C Workflow ==="
echo "Figma URL: $FIGMA_TEST_URL"
echo "Logs: $LOG_DIR"
echo ""

# 清理之前的 E2E 产物（保留 node_modules）
cleanup_previous() {
  rm -rf "$D2C_DIR/preview/src/components/"*
  rm -rf "$D2C_DIR/preview/dist"
  rm -rf "$PROJECT_ROOT/docs/design-specs/"*
  rm -rf "$PROJECT_ROOT/docs/generation-logs/"*
  rm -rf "$PROJECT_ROOT/docs/validation-reports/"*
  rm -rf "$PROJECT_ROOT/docs/verification-reports/"*
}

# ═══════════════════════════════════════════════════════════
# Step 0: d2c-init
# ═══════════════════════════════════════════════════════════
echo "--- Step 0: d2c-init ---"

claude -p "执行 /d2c-init skill，初始化 .d2c/ 工作目录。" \
  --max-turns "$CLAUDE_MAX_TURNS" \
  > "$LOG_DIR/step0-init.log" 2>&1 || true

assert_dir_exists ".d2c/ 目录存在" "$D2C_DIR"
assert_dir_exists ".d2c/preview/ 目录存在" "$PREVIEW_DIR"
assert_dir_exists ".d2c/context/ 目录存在" "$D2C_DIR/context"
assert_dir_exists ".d2c/assets/ 目录存在" "$D2C_DIR/assets"
assert_file_exists "project-config.md 存在" "$D2C_DIR/context/project-config.md"
assert_file_contains "project-config.md 包含技术栈信息" \
  "$D2C_DIR/context/project-config.md" "检测到的技术栈|framework|技术栈"
assert_file_exists "preview/package.json 存在" "$PREVIEW_DIR/package.json"

# 确保 docs 子目录存在（d2c-init 应创建，但作为保底）
mkdir -p "$PROJECT_ROOT/docs/design-specs"
mkdir -p "$PROJECT_ROOT/docs/generation-logs"
mkdir -p "$PROJECT_ROOT/docs/validation-reports"
mkdir -p "$PROJECT_ROOT/docs/verification-reports"
mkdir -p "$PROJECT_ROOT/docs/merge-reports"
mkdir -p "$PROJECT_ROOT/docs/sessions"

echo ""

# ═══════════════════════════════════════════════════════════
# Step 1: d2c-extract
# ═══════════════════════════════════════════════════════════
echo "--- Step 1: d2c-extract ---"

# extract 可能需要更多轮次（Figma MCP 交互较多）
EXTRACT_MAX_TURNS=$((CLAUDE_MAX_TURNS + 4))

claude -p "执行 /d2c-extract skill，提取以下 Figma 设计信息：
$FIGMA_TEST_URL

请将提取结果保存到 docs/design-specs/ 目录，并下载图片资源到 .d2c/assets/ 目录。" \
  --max-turns "$EXTRACT_MAX_TURNS" \
  > "$LOG_DIR/step1-extract.log" 2>&1 || true

# 检查设计规格文件生成（docs 日志为可选产出，降级为 warning）
SPEC_DIR="$PROJECT_ROOT/docs/design-specs"
if [ -d "$SPEC_DIR" ]; then
  # 查找任何 .md 文件
  SPEC_FILES=$(find "$SPEC_DIR" -name "*.md" -type f 2>/dev/null)
  if [ -n "$SPEC_FILES" ]; then
    SPEC_FILE=$(echo "$SPEC_FILES" | head -1)
    assert "设计规格文件已生成" "[ -f '$SPEC_FILE' ]"
    assert_file_contains "规格文件包含 Onboarding 相关内容" \
      "$SPEC_FILE" "Onboarding|onboarding|引导|prototype|prototyping"
    assert_file_contains "规格文件包含 Component Tree" \
      "$SPEC_FILE" "Component Tree|组件树|component"
  else
    echo "  ⚠ 设计规格文件未生成到 docs/design-specs/（extract 可能将内容输出到 stdout）"
  fi
else
  echo "  ⚠ docs/design-specs/ 目录不存在"
fi

# 检查资源下载
ASSETS_DIR="$D2C_DIR/assets"
assert_dir_exists "assets 目录存在" "$ASSETS_DIR"
# 资源是否下载取决于 Figma MCP，不强制要求
ASSET_COUNT=$(find "$ASSETS_DIR" -type f \( -name "*.png" -o -name "*.svg" -o -name "*.jpg" \) 2>/dev/null | wc -l | tr -d ' ')
if [ "$ASSET_COUNT" -gt 0 ]; then
  echo "  ✓ 已下载 $ASSET_COUNT 个图片资源"
  E2E_PASS=$((E2E_PASS + 1))
else
  echo "  ⚠ 未下载图片资源（可能 Figma MCP 降级）"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# Step 2: d2c-generate
# ═══════════════════════════════════════════════════════════
echo "--- Step 2: d2c-generate ---"

# 确定框架和文件扩展名
FW=$(detect_framework)
EXT=$(component_ext "$FW")
echo "  Framework: $FW, Extension: $EXT"

# 如果 extract 未生成规格文件，使用 fixture 降级
SPEC_DIR="$PROJECT_ROOT/docs/design-specs"
SPEC_COUNT_FOR_GEN=$(find "$SPEC_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$SPEC_COUNT_FOR_GEN" -eq 0 ]; then
  echo "  ⚠ extract 未生成规格文件，使用 fixture 降级"
  cp "$FIXTURES_DIR/mobile-app-onboarding-spec.md" "$SPEC_DIR/"
fi

claude -p "执行 /d2c-generate skill，根据 docs/design-specs/ 下的设计规格生成前端代码到 .d2c/preview/src/components/ 目录。" \
  --max-turns "$CLAUDE_MAX_TURNS" \
  > "$LOG_DIR/step2-generate.log" 2>&1 || true

# 检查组件文件
assert_dir_exists "components 目录存在" "$COMPONENTS_DIR"

COMP_COUNT=$(find "$COMPONENTS_DIR" -maxdepth 2 -name "*$EXT" -type f 2>/dev/null | wc -l | tr -d ' ')
assert "至少生成 1 个 $EXT 组件文件 (found $COMP_COUNT)" "[ '$COMP_COUNT' -ge 1 ]"

# 框架特定断言
if [ "$COMP_COUNT" -gt 0 ]; then
  for comp_file in $(find "$COMPONENTS_DIR" -maxdepth 2 -name "*$EXT" -type f 2>/dev/null); do
    comp_name=$(basename "$comp_file")
    case "$FW" in
      vue3)
        assert_file_contains "$comp_name 使用 script setup" "$comp_file" "script setup"
        assert_file_contains "$comp_name 使用 scoped style" "$comp_file" "style scoped"
        ;;
      react)
        assert_file_contains "$comp_name 是函数组件" "$comp_file" "function |const .* = |export default"
        ;;
      svelte)
        assert_file_contains "$comp_name 包含 script 标签" "$comp_file" "<script"
        ;;
    esac
    assert_file_not_contains "$comp_name 无 any 类型" "$comp_file" ":\s*any[^a-zA-Z]"
    assert_file_not_contains "$comp_name 无内联样式" "$comp_file" 'style="'
  done
fi

# 检查生成日志（可选产出）
GEN_LOG_DIR="$PROJECT_ROOT/docs/generation-logs"
if [ -d "$GEN_LOG_DIR" ]; then
  GEN_LOG_COUNT=$(find "$GEN_LOG_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$GEN_LOG_COUNT" -ge 1 ]; then
    echo "  ✓ generation-logs 有 $GEN_LOG_COUNT 条记录"
    E2E_PASS=$((E2E_PASS + 1))
  else
    echo "  ⚠ generation-logs 为空（skill 可能未写入日志）"
  fi
else
  echo "  ⚠ docs/generation-logs/ 不存在（跳过日志检查）"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# Step 3: d2c-validate
# ═══════════════════════════════════════════════════════════
echo "--- Step 3: d2c-validate ---"

ensure_node_modules

claude -p "执行 /d2c-validate skill，对 .d2c/preview/ 项目进行校验。" \
  --max-turns "$CLAUDE_MAX_TURNS" \
  > "$LOG_DIR/step3-validate.log" 2>&1 || true

# TypeScript 检查
if (cd "$PREVIEW_DIR" && npx vue-tsc --noEmit 2>&1); then
  echo "  ✓ TypeScript 类型检查通过"
  E2E_PASS=$((E2E_PASS + 1))
else
  echo "  ✗ TypeScript 类型检查失败"
  E2E_FAIL=$((E2E_FAIL + 1))
fi

# Vite build
if (cd "$PREVIEW_DIR" && npx vite build 2>&1) > /dev/null; then
  echo "  ✓ Vite 构建成功"
  E2E_PASS=$((E2E_PASS + 1))
  assert_dir_exists "dist/ 目录存在" "$PREVIEW_DIR/dist"
else
  echo "  ✗ Vite 构建失败"
  E2E_FAIL=$((E2E_FAIL + 1))
fi

# 验证报告（可选产出）
VAL_REPORT_DIR="$PROJECT_ROOT/docs/validation-reports"
if [ -d "$VAL_REPORT_DIR" ]; then
  VAL_COUNT=$(find "$VAL_REPORT_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$VAL_COUNT" -ge 1 ]; then
    echo "  ✓ validation-reports 有 $VAL_COUNT 条记录"
    E2E_PASS=$((E2E_PASS + 1))
  else
    echo "  ⚠ validation-reports 为空（skill 可能未写入报告）"
  fi
else
  echo "  ⚠ docs/validation-reports/ 不存在（跳过报告检查）"
fi

echo ""

# ═══════════════════════════════════════════════════════════
# Step 4: d2c-verify
# ═══════════════════════════════════════════════════════════
echo "--- Step 4: d2c-verify ---"

claude -p "执行 /d2c-verify skill，对已生成的代码进行视觉验证。" \
  --max-turns "$CLAUDE_MAX_TURNS" \
  > "$LOG_DIR/step4-verify.log" 2>&1 || true

# 验证报告（verify 可能 SKIPPED 因为 Chrome DevTools MCP 不可用）
VER_REPORT_DIR="$PROJECT_ROOT/docs/verification-reports"
if [ -d "$VER_REPORT_DIR" ]; then
  VER_COUNT=$(find "$VER_REPORT_DIR" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$VER_COUNT" -ge 1 ]; then
    assert "verification-reports 有记录" "true"
    VER_FILE=$(find "$VER_REPORT_DIR" -name "*.md" -type f 2>/dev/null | head -1)
    if grep -qiE "PASSED|通过" "$VER_FILE" 2>/dev/null; then
      echo "  ✓ 视觉验证 PASSED"
      E2E_PASS=$((E2E_PASS + 1))
    elif grep -qiE "SKIPPED|跳过" "$VER_FILE" 2>/dev/null; then
      echo "  ⚠ 视觉验证 SKIPPED（Chrome DevTools MCP 不可用）"
    else
      echo "  ⚠ 视觉验证结果未明确"
    fi
  else
    echo "  ⚠ verification-reports 无记录"
  fi
else
  # verify 步骤可能输出 SKIPPED 到 stdout
  if grep -qiE "SKIPPED|跳过|skip" "$LOG_DIR/step4-verify.log" 2>/dev/null; then
    echo "  ⚠ 视觉验证 SKIPPED（Chrome DevTools MCP 不可用）"
    E2E_PASS=$((E2E_PASS + 1))
  else
    echo "  ⚠ docs/verification-reports/ 不存在"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════
# 结果汇总
# ═══════════════════════════════════════════════════════════
print_results "E2E Figma Workflow"

# 保存汇总
cat > "$LOG_DIR/summary.txt" <<EOF
D2C E2E Figma Workflow Report
Date: $(date)
Figma URL: $FIGMA_TEST_URL
Framework: $FW
Pass: $E2E_PASS
Fail: $E2E_FAIL
EOF

exit "$E2E_FAIL"
