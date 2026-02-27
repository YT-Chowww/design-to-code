# Vue 3 + TypeScript 编码规范

## 组件文件格式
- 使用 Single File Component (SFC) 格式 `.vue`
- 顺序：`<script setup lang="ts">` → `<template>` → `<style scoped>`

## Script 规范
- 必须使用 `<script setup lang="ts">`
- 使用 Composition API（`ref`, `computed`, `watch`, `onMounted` 等）
- Props 使用 `defineProps<T>()` 配合 TypeScript 接口
- Emits 使用 `defineEmits<T>()`
- 组件名使用 PascalCase

## TypeScript 规范
- 所有 props 和 emits 必须有类型定义
- 使用 `interface` 定义复杂类型
- 避免使用 `any`，优先使用具体类型
- Ref 类型：`const count = ref<number>(0)`

## 模板规范
- 属性绑定使用简写：`:prop` 而非 `v-bind:prop`
- 事件绑定使用简写：`@event` 而非 `v-on:event`
- 条件渲染：`v-if` / `v-else-if` / `v-else`
- 列表渲染：`v-for` 必须配合 `:key`
- 自闭合组件：`<MyComponent />`

## 样式规范
- 默认使用 `<style scoped>` 防止样式泄漏
- CSS 属性按以下顺序排列：
  1. 布局（display, position, flex, grid）
  2. 盒模型（width, height, margin, padding）
  3. 排版（font, color, text-align）
  4. 视觉（background, border, shadow, opacity）
  5. 动画（transition, animation）
- 使用 CSS 变量引用设计 token
- 响应式使用 media query 或 CSS 容器查询

## 命名约定
- 组件文件名：PascalCase（`UserProfile.vue`）
- CSS 类名：kebab-case（`.user-profile`）
- 事件名：kebab-case（`@update-value`）
- Props 名：camelCase（`userName`）

## 组件拆分策略
- 单一职责：每个组件负责一个明确的 UI 区域
- 复杂设计（>5 个独立区域）应分解为子组件
- 纯展示组件与逻辑组件分离
- 可复用组件提取到独立文件
