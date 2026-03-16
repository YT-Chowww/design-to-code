#!/bin/bash
# E2E 测试公共配置
# 集中管理测试 URL、参数、超时、公共工具函数

# ── Figma 测试 URL ──────────────────────────────────────
FIGMA_TEST_URL="https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-–-Prototyping-Kit--Community-?node-id=240-6278"
FIGMA_FILE_KEY="oKc2utjTB5orau6YuvPi4r"
FIGMA_NODE_ID="240-6278"

# ── 测试参数 ────────────────────────────────────────────
CLAUDE_MAX_TURNS=8
CLAUDE_TIMEOUT=300       # 秒
PREVIEW_PORT=5173
VERIFY_THRESHOLD=90      # 视觉验证通过阈值 %

# ── 目录常量 ────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
D2C_DIR="$PROJECT_ROOT/.d2c"
PREVIEW_DIR="$D2C_DIR/preview"
COMPONENTS_DIR="$PREVIEW_DIR/src/components"
RESULTS_DIR="$PROJECT_ROOT/tests/results"
FIXTURES_DIR="$PROJECT_ROOT/tests/fixtures"

# ── 公共工具函数 ─────────────────────────────────────────

# 断言计数器（sourcing 时初始化）
E2E_PASS=0
E2E_FAIL=0

# 带描述的断言函数（始终返回 0，通过计数器跟踪失败）
assert() {
  local desc="$1"
  shift
  if eval "$@" > /dev/null 2>&1; then
    echo "  ✓ $desc"
    E2E_PASS=$((E2E_PASS + 1))
  else
    echo "  ✗ $desc"
    E2E_FAIL=$((E2E_FAIL + 1))
  fi
}

# 断言文件存在
assert_file_exists() {
  local desc="$1"
  local path="$2"
  assert "$desc" "[ -f '$path' ]"
}

# 断言目录存在
assert_dir_exists() {
  local desc="$1"
  local path="$2"
  assert "$desc" "[ -d '$path' ]"
}

# 断言文件包含内容（grep -q）
assert_file_contains() {
  local desc="$1"
  local path="$2"
  local pattern="$3"
  assert "$desc" "grep -qiE '$pattern' '$path'"
}

# 断言文件不包含内容
assert_file_not_contains() {
  local desc="$1"
  local path="$2"
  local pattern="$3"
  assert "$desc" "! grep -qiE '$pattern' '$path'"
}

# 断言目录下有匹配文件（至少 N 个）
assert_file_count_gte() {
  local desc="$1"
  local dir="$2"
  local pattern="$3"
  local min_count="$4"
  local count
  count=$(find "$dir" -maxdepth 1 -name "$pattern" 2>/dev/null | wc -l | tr -d ' ')
  assert "$desc (found $count, need >= $min_count)" "[ '$count' -ge '$min_count' ]"
}

# 打印测试结果摘要
print_results() {
  local label="${1:-Test}"
  echo ""
  echo "================================"
  echo "$label Results: $E2E_PASS passed, $E2E_FAIL failed"
  if [ "$E2E_FAIL" -eq 0 ]; then
    echo "$label passed!"
  else
    echo "Some tests failed!"
  fi
}

# 检测框架（从 project-config.md 读取）
detect_framework() {
  local config="$D2C_DIR/context/project-config.md"
  if [ -f "$config" ]; then
    local fw
    fw=$(grep -oiE 'framework:\s*(vue3|react|svelte|angular|vanilla)' "$config" | head -1 | sed 's/.*:\s*//')
    echo "${fw:-vue3}"
  else
    echo "vue3"
  fi
}

# 根据框架返回组件文件扩展名
component_ext() {
  local fw="${1:-$(detect_framework)}"
  case "$fw" in
    vue3)    echo ".vue" ;;
    react)   echo ".tsx" ;;
    svelte)  echo ".svelte" ;;
    angular) echo ".component.ts" ;;
    vanilla) echo ".js" ;;
    *)       echo ".vue" ;;
  esac
}

# 检查 claude CLI 可用性
require_claude_cli() {
  if ! command -v claude &> /dev/null; then
    echo "Error: claude CLI not found"
    exit 1
  fi
}

# 确保 .d2c/preview 目录存在（从模板初始化）
ensure_preview_dir() {
  if [ ! -d "$PREVIEW_DIR" ]; then
    echo "Initializing .d2c/preview from templates..."
    mkdir -p "$COMPONENTS_DIR"
    mkdir -p "$PREVIEW_DIR/src/assets"
    local tmpl="$PROJECT_ROOT/.claude/skills/d2c-init/templates/preview"
    cp "$tmpl/package.json" "$PREVIEW_DIR/"
    cp "$tmpl/vite.config.ts" "$PREVIEW_DIR/"
    cp "$tmpl/tsconfig.json" "$PREVIEW_DIR/"
    cp "$tmpl/tsconfig.node.json" "$PREVIEW_DIR/"
    cp "$tmpl/index.html" "$PREVIEW_DIR/"
    cp "$tmpl/src/main.ts" "$PREVIEW_DIR/src/"
    cp "$tmpl/src/App.vue" "$PREVIEW_DIR/src/"
    cp "$tmpl/src/env.d.ts" "$PREVIEW_DIR/src/"
  fi
}

# 确保 node_modules 安装
ensure_node_modules() {
  if [ ! -d "$PREVIEW_DIR/node_modules" ]; then
    echo "  Installing dependencies..."
    (cd "$PREVIEW_DIR" && npm install --loglevel=error 2>&1)
  else
    echo "  node_modules exists, skipping install"
  fi
}
