# 测试：d2c-generate 在复杂设计时是否进行组件拆分
run_eval \
  "generate-decomposition" \
  "使用 /d2c-generate skill，根据以下设计规格生成代码。注意组件拆分规则：超过 5 个独立区域时必须分解为子组件。

## Design Specification
一个完整的落地页，包含以下 7 个独立区域：
1. Header：导航栏，Logo + 菜单链接
2. HeroBanner：大图 + 标题 + 副标题 + CTA 按钮
3. FeatureSection：3 列特性展示，每列有图标+标题+描述
4. PricingSection：3 个价格卡片
5. TestimonialSection：用户评价轮播
6. FAQSection：折叠问答列表
7. Footer：底部链接 + 版权信息

请分析组件结构并说明拆分方案。" \
  "Header|HeroBanner|Hero|Feature|Pricing|Footer|子组件|sub.?component|拆分|decompos" \
  "复杂设计被正确拆分为多个子组件"
