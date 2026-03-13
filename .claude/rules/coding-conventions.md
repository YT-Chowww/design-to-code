# 前端编码规范

> D2C 根据 `project-config.md` 中检测到的 `framework` 字段选择对应的规范章节。
> 未检测到框架时默认使用 Vue 3 规范。

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
- 使用 CSS 变量引用设计 token
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

## Svelte 规范（framework = svelte）

### 组件文件格式
- 使用 `.svelte` 文件
- 顺序：`<script lang="ts">` → 模板 → `<style>`

### Script 规范
- 使用 `<script lang="ts">`
- Props 使用 `export let propName: Type`（Svelte 4）或 `$props()`（Svelte 5）
- 响应式声明：`$:` 或 `$derived()`

### 模板规范
- 条件渲染：`{#if}` / `{:else if}` / `{:else}` / `{/if}`
- 列表渲染：`{#each items as item (item.id)}` / `{/each}`
- 事件绑定：`on:click` 或 `onclick`（Svelte 5）

### 样式规范
- `<style>` 自动 scoped（Svelte 默认行为）
- 全局样式使用 `:global()`

### 命名约定
- 组件文件名：PascalCase（`UserProfile.svelte`）
- Props 名：camelCase

---

## Angular 规范（framework = angular）

### 组件文件格式
- 每个组件包含：`.component.ts` + `.component.html` + `.component.css`
- 使用 `@Component` 装饰器

### TypeScript 规范
- 使用 `@Input()` / `@Output()` 装饰器
- 或 Signal-based：`input()` / `output()`（Angular 17+）
- 依赖注入通过构造函数

### 模板规范
- 条件渲染：`*ngIf` 或 `@if`（Angular 17+）
- 列表渲染：`*ngFor` 或 `@for`（Angular 17+）
- 事件绑定：`(click)="handler()"`
- 属性绑定：`[property]="value"`

### 样式规范
- ViewEncapsulation.Emulated（默认 scoped）
- 每个组件独立 CSS 文件

### 命名约定
- 文件名：kebab-case + 类型后缀（`user-profile.component.ts`）
- 类名：PascalCase + 后缀（`UserProfileComponent`）
- 选择器：kebab-case 带前缀（`app-user-profile`）

---

## Vanilla 规范（framework = vanilla）

### 文件格式
- HTML：`index.html`
- CSS：独立 `.css` 文件
- JS：独立 `.js` 或 `.ts` 文件

### CSS 规范
- 使用 BEM 命名约定（`.block__element--modifier`）
- 避免深层嵌套选择器
- 使用 CSS 变量管理设计 token

### JavaScript 规范
- 使用 ES Modules（`import` / `export`）
- DOM 操作使用 `querySelector` / `createElement`
- 事件委托优于逐个绑定
