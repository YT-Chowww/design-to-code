---
name: d2c-generate
description: Generate Vue 3 + TypeScript code from a design specification. Use after d2c-extract has produced a design spec, or when you have design information to convert to code.
---

# D2C Generate — Vue 3 代码生成

## 输入
- 设计规格（由 `d2c-extract` 产出，存在于对话上下文中）
- 偏差报告（迭代时由 `d2c-verify` 产出，可选）

## 流程

### Step 1: 加载上下文

读取以下文件获取编码规范和项目配置：
- `context/design-system.md` — 设计 token 定义
- `context/component-library.md` — 可复用业务组件
- `context/project-config.md` — 项目配置与约定

### Step 2: 组件分解策略

根据设计规格中的 Component Tree 确定组件拆分方案：

**拆分原则**：
- 每个独立 UI 区域作为一个组件
- 可复用的 UI 模式提取为独立组件
- 列表项提取为独立组件
- 设计中超过 5 个独立区域时必须分解为子组件

**命名规则**：
- 组件名使用 PascalCase
- 文件名与组件名一致：`ComponentName.vue`
- 使用有语义的名称而非通用名（`HeroSection.vue` 而非 `Section1.vue`）

### Step 3: 生成 Vue 3 SFC 文件

对每个组件生成 `.vue` 文件，严格遵循以下模板结构：

```vue
<script setup lang="ts">
// 1. 类型导入
import type { PropType } from 'vue'

// 2. 组件导入
import ChildComponent from './ChildComponent.vue'

// 3. 业务组件导入（来自 component-library.md）
// import Button from '@/components/Button.vue'

// 4. Props 接口定义
interface Props {
  title: string
  items?: ItemType[]
}

// 5. Props 声明
const props = withDefaults(defineProps<Props>(), {
  items: () => []
})

// 6. Emits 声明
const emit = defineEmits<{
  (e: 'click', id: string): void
}>()

// 7. 响应式状态（如需要）
// const state = ref<StateType>(initialValue)

// 8. 计算属性（如需要）
// const computed = computed(() => ...)

// 9. 方法
// const handleClick = (id: string) => { emit('click', id) }
</script>

<template>
  <!-- 使用语义化 HTML 标签 -->
  <!-- 使用 CSS 类而非内联样式 -->
  <div class="component-name">
    <ChildComponent />
  </div>
</template>

<style scoped>
/* CSS 属性按以下顺序排列：
   1. 布局（display, position, flex, grid）
   2. 盒模型（width, height, margin, padding）
   3. 排版（font, color, text-align）
   4. 视觉（background, border, shadow, opacity）
   5. 动画（transition, animation）
*/

.component-name {
  display: flex;
  /* 使用设计 token CSS 变量 */
  padding: var(--spacing-4);
  color: var(--color-text-primary);
  background-color: var(--color-background);
}
</style>
```

### Step 4: 样式指南

**优先使用设计 token**：
- 颜色：`var(--color-primary)` 而非硬编码 `#3B82F6`
- 字体：`var(--font-size-base)` 而非硬编码 `16px`
- 间距：`var(--spacing-4)` 而非硬编码 `16px`
- 只有在 design-system.md 中无匹配 token 时才使用具体值

**布局实现**：
- 优先使用 Flexbox（`display: flex`）
- 复杂网格使用 CSS Grid（`display: grid`）
- 避免使用 `float`、`position: absolute`（除非确实需要）
- 响应式使用 media query

**尺寸处理**：
- 容器宽度优先使用 `max-width` + `width: 100%`
- 固定尺寸元素使用 `px`
- 字体使用 `px` 或设计 token
- 间距使用设计 token 或 `px`

### Step 5: 写入文件

将生成的文件写入 `templates/vite-preview/src/` 目录：
- 组件文件：`templates/vite-preview/src/components/ComponentName.vue`
- 更新 `templates/vite-preview/src/App.vue` 导入并使用所有组件
- 如有 CSS 变量需要全局定义，写入 `templates/vite-preview/src/style.css`

**App.vue 更新规则**：
```vue
<script setup lang="ts">
import Header from './components/Header.vue'
import HeroSection from './components/HeroSection.vue'
// ... 其他组件
</script>

<template>
  <div class="app">
    <Header />
    <HeroSection />
    <!-- ... 其他组件按设计稿顺序排列 -->
  </div>
</template>

<style>
/* 全局样式：CSS 变量定义 */
:root {
  /* 从 design-system.md 引入的 token */
}

/* 全局 reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
```

### Step 6: 迭代修改（当有偏差报告时）

如果输入中包含偏差报告（来自 `d2c-verify`）：

1. **分析偏差报告**：逐条理解每个偏差项
2. **定位修改文件**：确定需要修改的组件文件
3. **针对性修改**：
   - 只修改与偏差相关的代码
   - 不要重写整个文件
   - 使用 Edit 工具做精确修改
4. **记录修改**：列出所有修改内容

## 错误处理
- 设计规格缺失：提示先运行 `/d2c-extract`
- 组件库组件不存在：使用原生 HTML 元素替代，添加 TODO 注释
- 设计 token 无匹配：使用具体值并添加注释标记
