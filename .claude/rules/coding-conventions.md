# 前端编码规范

> D2C 根据 `project-config.json` 中检测到的 `framework` 字段选择对应的规范章节。
> 当前生成目标支持 Vue 3 和 React。未检测到框架时默认使用 Vue 3 规范。

---

## 通用规范（适用于所有框架）

### TypeScript 规范
- 所有 props 和事件回调必须有类型定义
- 使用 `interface` 定义复杂类型
- 避免使用 `any`，优先使用具体类型

### 样式规范
- CSS 属性按以下顺序排列：
  1. 布局（display, position, flex, grid）
  2. 盒模型（width, height, margin, padding）
  3. 排版（font, color, text-align）
  4. 视觉（background, border, shadow, opacity）
  5. 动画（transition, animation）
- preview 阶段优先使用 Figma raw value 保证视觉还原
- merge 阶段在证据可靠时使用项目 token、CSS 变量、Less/Sass 变量、theme 字段或工具类
- 响应式使用 media query 或 CSS 容器查询

### 命名约定
- 组件文件名：PascalCase
- CSS 类名：kebab-case（`.user-profile`）
- 工具函数：camelCase

### 组件拆分策略
- 单一职责：每个组件负责一个明确的 UI 区域
- 复杂设计（>5 个独立区域）应分解为子组件
- 纯展示组件与逻辑组件分离
- 可复用组件提取到独立文件

---

## Vue 3 规范（framework = vue3）

### 组件文件格式
- 使用 Single File Component (SFC) 格式 `.vue`
- 顺序：`<script setup lang="ts">` → `<template>` → `<style scoped>`

### Script 规范
- 必须使用 `<script setup lang="ts">`
- 使用 Composition API（`ref`, `computed`, `watch`, `onMounted` 等）
- Props 使用 `defineProps<T>()` 配合 TypeScript 接口
- Emits 使用 `defineEmits<T>()`
- 组件名使用 PascalCase

### TypeScript 规范
- Ref 类型：`const count = ref<number>(0)`

### 模板规范
- 属性绑定使用简写：`:prop` 而非 `v-bind:prop`
- 事件绑定使用简写：`@event` 而非 `v-on:event`
- 条件渲染：`v-if` / `v-else-if` / `v-else`
- 列表渲染：`v-for` 必须配合 `:key`
- 自闭合组件：`<MyComponent />`

### 样式规范
- 默认使用 `<style scoped>` 防止样式泄漏

### 命名约定
- 组件文件名：PascalCase（`UserProfile.vue`）
- 事件名：kebab-case（`@update-value`）
- Props 名：camelCase（`userName`）

---

## React 规范（framework = react）

### 组件文件格式
- 使用 `.tsx`（TypeScript）或 `.jsx`（JavaScript）
- 一个文件一个组件，默认导出

### 函数组件规范
- 使用函数声明或箭头函数
- Props 使用 TypeScript interface 定义
- 使用 Hooks：`useState`, `useEffect`, `useMemo`, `useCallback` 等
- 自定义 Hook 以 `use` 开头

### TSX 规范
- 条件渲染：三元运算符或 `&&`
- 列表渲染：`.map()` 配合 `key`
- 事件处理：`onClick`, `onChange` 等 camelCase
- className 而非 class

### 样式隔离
- 优先 CSS Modules（`*.module.css`）
- 或 Tailwind CSS（如项目已配置）
- 避免全局 CSS 污染

### 命名约定
- 组件文件名：PascalCase（`UserProfile.tsx`）
- Hook 文件名：camelCase 以 `use` 开头（`useAuth.ts`）
- Props 接口名：`{ComponentName}Props`

---

## 非目标框架

Svelte、Angular 和 Vanilla 不是当前生成目标。遇到这些项目时，先通过 `d2c-init` 记录检测结果和限制，再要求用户选择 Vue 3/React 预览基线或后续扩展策略。
