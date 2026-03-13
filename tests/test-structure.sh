#!/bin/bash
# 第 1 层：结构校验
# 验证所有文件存在、格式正确，无需任何外部依赖
set -e

cd "$(dirname "$0")/.."

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

echo "=== Skill Files ==="
for skill in d2c d2c-init d2c-extract d2c-generate d2c-validate d2c-verify d2c-merge; do
  FILE=".claude/skills/$skill/SKILL.md"
  assert "Skill 文件存在: $skill" "[ -f '$FILE' ]"
  assert "Skill 有 YAML frontmatter: $skill" "head -1 '$FILE' | grep -q '^---'"
  assert "Skill 有 name 字段: $skill" "grep -q 'name:.*${skill#d2c}' '$FILE'"
  assert "Skill 有 description 字段: $skill" "grep -q 'description:' '$FILE'"
done

echo ""
echo "=== D2C Init Templates ==="
TMPL=".claude/skills/d2c-init/templates"
assert "package.json 存在" "[ -f $TMPL/preview/package.json ]"
assert "package.json 是合法 JSON" "python3 -c \"import json; json.load(open('$TMPL/preview/package.json'))\""
assert "vite.config.ts 存在" "[ -f $TMPL/preview/vite.config.ts ]"
assert "tsconfig.json 存在" "[ -f $TMPL/preview/tsconfig.json ]"
assert "tsconfig.node.json 存在" "[ -f $TMPL/preview/tsconfig.node.json ]"
assert "index.html 存在" "[ -f $TMPL/preview/index.html ]"
assert "main.ts 存在" "[ -f $TMPL/preview/src/main.ts ]"
assert "App.vue 存在" "[ -f $TMPL/preview/src/App.vue ]"
assert "env.d.ts 存在" "[ -f $TMPL/preview/src/env.d.ts ]"
assert "App.vue 使用 script setup" "grep -q 'script setup' $TMPL/preview/src/App.vue"

echo ""
echo "=== Config Files ==="
assert ".mcp.json 存在" "[ -f .mcp.json ]"
assert ".mcp.json 是合法 JSON" "python3 -c \"import json; json.load(open('.mcp.json'))\""
assert ".mcp.json 包含 figma 配置" "grep -q 'figma' .mcp.json"
assert ".mcp.json 包含 chrome-devtools 配置" "grep -q 'chrome-devtools' .mcp.json"
assert "settings.json 存在" "[ -f .claude/settings.json ]"
assert "settings.json 是合法 JSON" "python3 -c \"import json; json.load(open('.claude/settings.json'))\""
assert "CLAUDE.md 存在" "[ -f CLAUDE.md ]"

echo ""
echo "=== Rules ==="
assert "vue3-conventions.md 存在" "[ -f .claude/rules/vue3-conventions.md ]"
assert "d2c-workflow.md 存在" "[ -f .claude/rules/d2c-workflow.md ]"
assert "工作流规则包含迭代上限" "grep -q '3' .claude/rules/d2c-workflow.md"
assert "工作流规则包含通过阈值" "grep -q '90' .claude/rules/d2c-workflow.md"

echo ""
echo "=== Context Templates ==="
assert "design-system.md 存在" "[ -f $TMPL/context/design-system.md ]"
assert "design-system.md 包含颜色定义" "grep -q 'color' $TMPL/context/design-system.md"
assert "design-system.md 包含字体定义" "grep -q 'font' $TMPL/context/design-system.md"
assert "design-system.md 包含间距定义" "grep -q 'spacing' $TMPL/context/design-system.md"
assert "component-library.md 存在" "[ -f $TMPL/context/component-library.md ]"
assert "project-config.md 存在" "[ -f $TMPL/context/project-config.md ]"

echo ""
echo "=== Documentation Generation ==="
for skill in d2c d2c-extract d2c-generate d2c-validate d2c-verify d2c-merge; do
  FILE=".claude/skills/$skill/SKILL.md"
  assert "Skill 包含文档记录章节: $skill" "grep -q '## 文档记录' '$FILE'"
done
assert "d2c-init 包含 docs 目录创建" "grep -q 'docs/reference' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 design-specs 目录" "grep -q 'docs/design-specs' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 generation-logs 目录" "grep -q 'docs/generation-logs' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 validation-reports 目录" "grep -q 'docs/validation-reports' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 verification-reports 目录" "grep -q 'docs/verification-reports' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 merge-reports 目录" "grep -q 'docs/merge-reports' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c-init 包含 sessions 目录" "grep -q 'docs/sessions' '.claude/skills/d2c-init/SKILL.md'"
assert "d2c 主编排器记录到 sessions 目录" "grep -q 'sessions/' '.claude/skills/d2c/SKILL.md'"
assert "d2c-extract 记录到 design-specs 目录" "grep -q 'design-specs/' '.claude/skills/d2c-extract/SKILL.md'"
assert "d2c-generate 记录到 generation-logs 目录" "grep -q 'generation-logs/' '.claude/skills/d2c-generate/SKILL.md'"
assert "d2c-validate 记录到 validation-reports 目录" "grep -q 'validation-reports/' '.claude/skills/d2c-validate/SKILL.md'"
assert "d2c-verify 记录到 verification-reports 目录" "grep -q 'verification-reports/' '.claude/skills/d2c-verify/SKILL.md'"
assert "d2c-merge 记录到 merge-reports 目录" "grep -q 'merge-reports/' '.claude/skills/d2c-merge/SKILL.md'"

echo ""
echo "=== Scripts ==="
assert "validate.sh 存在" "[ -f scripts/validate.sh ]"
assert "validate.sh 可执行" "[ -x scripts/validate.sh ]"
assert "create-preview-project.sh 存在" "[ -f scripts/create-preview-project.sh ]"
assert "create-preview-project.sh 可执行" "[ -x scripts/create-preview-project.sh ]"

echo ""
echo "=== Docs ==="
for doc in README.md requirements.md architecture.md task-breakdown.md operation-guide.md verification.md; do
  assert "docs/$doc 存在" "[ -f docs/$doc ]"
done

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "All structure tests passed!" || echo "Some tests failed!"
exit "$FAIL"
