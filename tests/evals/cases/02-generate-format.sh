# 测试：给定设计规格后，d2c-generate 是否生成正确格式的 Vue 3 代码
run_eval \
  "generate-format" \
  "使用 /d2c-generate skill，根据以下设计规格生成代码并写入 .d2c/preview/src/components/ 目录：

## Design Specification
- 组件名：SimpleCard
- 尺寸：320px x auto
- 背景：白色 (#FFFFFF)
- 圆角：8px
- 阴影：0 2px 8px rgba(0,0,0,0.1)
- 内边距：24px
- 子元素：
  1. 标题：18px, font-weight 700, color #1F2937
  2. 描述：14px, font-weight 400, color #6B7280, margin-top 8px
  3. 按钮：蓝色背景 #3B82F6, 白色文字, 圆角 6px, padding 8px 16px, margin-top 16px" \
  "script setup lang=.ts.|<style scoped>|defineProps|interface" \
  "生成的代码包含 script setup + scoped style + TypeScript"
