# 测试：d2c-generate 迭代修改时是否做针对性修改
run_eval \
  "generate-iteration" \
  "使用 /d2c-generate skill 进行迭代修改。以下是偏差报告：

=== Deviation Report ===
### Layout Issues
1. [SimpleCard] 卡片宽度应为 320px，当前为 100%
   → 修改 SimpleCard.vue 的 .card 宽度为 320px

### Color Issues
1. [SimpleCard] 按钮背景色应为 #3B82F6，当前为 #2563EB
   → 修改 .card-button 的 background-color

请根据偏差报告对 templates/vite-preview/src/components/SimpleCard.vue 做针对性修改，不要全量重写。" \
  "320px|#3B82F6|修改|fix|update|针对|specific|Edit" \
  "根据偏差报告做针对性修改而非全量重写"
