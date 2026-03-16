# 测试：d2c-generate 在复杂设计时是否进行组件拆分
# 使用 mobile-app-onboarding-spec.md（含多个子组件）做实际文件生成断言

FIXTURE_SPEC="$PROJECT_ROOT/tests/fixtures/mobile-app-onboarding-spec.md"
SPEC_CONTENT=$(cat "$FIXTURE_SPEC")
TARGET_DIR="$PROJECT_ROOT/.d2c/preview/src/components"

mkdir -p "$TARGET_DIR"

run_eval \
  "generate-decomposition" \
  "使用 /d2c-generate skill，根据以下设计规格生成代码。注意组件拆分规则：超过 5 个独立区域时必须分解为子组件。请将代码写入 .d2c/preview/src/components/ 目录。

## Design Specification（落地页 — 7 个独立区域）

一个完整的落地页，包含以下 7 个独立区域：
1. Header：导航栏，Logo + 菜单链接
2. HeroBanner：大图 + 标题 + 副标题 + CTA 按钮
3. FeatureSection：3 列特性展示，每列有图标+标题+描述
4. PricingSection：3 个价格卡片
5. TestimonialSection：用户评价轮播
6. FAQSection：折叠问答列表
7. Footer：底部链接 + 版权信息

### Component Tree
- LandingPage
  - NavHeader
  - HeroBanner
  - FeatureSection
    - FeatureCard (x3)
  - PricingSection
    - PricingCard (x3)
  - TestimonialSection
  - FAQSection
  - Footer" \
  "Header|HeroBanner|Hero|Feature|Pricing|Footer|子组件|sub.?component|拆分|decompos" \
  "复杂设计被正确拆分为多个子组件"

# 额外断言：检查实际生成的文件数量
echo "  [file checks]"
VUE_COUNT=$(find "$TARGET_DIR" -maxdepth 2 -name "*.vue" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$VUE_COUNT" -ge 2 ]; then
  echo "    ✓ 生成了 $VUE_COUNT 个 .vue 组件文件 (>= 2)"
else
  echo "    ✗ 仅生成了 $VUE_COUNT 个 .vue 文件 (expected >= 2)"
  FAIL=$((FAIL + 1))
fi

# 列出生成的文件
for f in $(find "$TARGET_DIR" -maxdepth 2 -name "*.vue" -type f 2>/dev/null); do
  echo "    → $(basename "$f")"
done

# 清理
rm -f "$TARGET_DIR"/*.vue "$TARGET_DIR"/**/*.vue 2>/dev/null || true
