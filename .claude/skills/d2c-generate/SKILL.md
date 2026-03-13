---
name: d2c-generate
description: Generate frontend code from a design specification, adapting to the detected framework (Vue 3, React, Svelte, Angular, or Vanilla). Use after d2c-extract has produced a design spec, or when you have design information to convert to code.
---

# D2C Generate — 代码生成

## 输入
- 设计规格（由 `d2c-extract` 产出，存在于对话上下文中）
- 偏差报告（迭代时由 `d2c-verify` 产出，可选）

## 流程

### Step 1: 加载上下文

读取以下文件获取编码规范和项目配置：
- `.d2c/context/design-system.md` — 设计 token 定义
- `.d2c/context/component-library.md` — 可复用业务组件
- `.d2c/context/project-config.md` — 项目配置与约定

**从 `project-config.md` 顶部「检测到的技术栈」章节提取以下关键字段**：
- `framework`: vue3 | react | svelte | angular | vanilla
- `language`: typescript | javascript
- `cssStrategy`: scoped | css-modules | tailwind | styled-components | sass | less | vanilla

如果 `.d2c/context/` 目录不存在或文件缺失，使用以下默认值并提示用户运行 `/d2c-init`：
- 默认框架：Vue 3
- 默认语言：TypeScript
- 默认 CSS 方案：Scoped CSS

### Step 2: 组件分解策略

根据设计规格中的 Component Tree 确定组件拆分方案：

**拆分原则**：
- 每个独立 UI 区域作为一个组件
- 可复用的 UI 模式提取为独立组件
- 列表项提取为独立组件
- 设计中超过 5 个独立区域时必须分解为子组件

**命名规则**：
- 组件名使用 PascalCase
- 文件名与组件名一致（扩展名按框架决定）
- 使用有语义的名称而非通用名（`HeroSection` 而非 `Section1`）

**文件扩展名对照**：

| 框架 | 组件扩展名 | 入口文件 |
|------|-----------|---------|
| vue3 | `.vue` | `App.vue` |
| react | `.tsx` / `.jsx` | `App.tsx` / `App.jsx` |
| svelte | `.svelte` | `App.svelte` |
| angular | `.component.ts` + `.component.html` + `.component.css` | `app.component.ts` |
| vanilla | `.html` + `.css` + `.js` | `index.html` |

### Step 3: 生成组件代码（按框架分支）

---

#### Vue 3（framework = vue3）

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

---

#### React（framework = react）

对每个组件生成 `.tsx`（TypeScript）或 `.jsx`（JavaScript）文件：

```tsx
import type { FC } from 'react'
import styles from './ComponentName.module.css'
import ChildComponent from './ChildComponent'

interface ComponentNameProps {
  title: string
  items?: ItemType[]
  onClick?: (id: string) => void
}

const ComponentName: FC<ComponentNameProps> = ({ title, items = [], onClick }) => {
  return (
    <div className={styles.componentName}>
      <ChildComponent />
    </div>
  )
}

export default ComponentName
```

**CSS Modules 文件**（`ComponentName.module.css`）：
```css
.componentName {
  display: flex;
  padding: var(--spacing-4);
  color: var(--color-text-primary);
  background-color: var(--color-background);
}
```

**如果 cssStrategy = tailwind**，则不生成 CSS Modules，直接在 JSX 中使用 Tailwind 类名：
```tsx
const ComponentName: FC<ComponentNameProps> = ({ title }) => {
  return (
    <div className="flex p-4 text-gray-900 bg-white">
      {/* ... */}
    </div>
  )
}
```

**App.tsx 更新规则**：
```tsx
import Header from './components/Header'
import HeroSection from './components/HeroSection'

function App() {
  return (
    <div className="app">
      <Header />
      <HeroSection />
    </div>
  )
}

export default App
```

---

#### Svelte（framework = svelte）

对每个组件生成 `.svelte` 文件：

```svelte
<script lang="ts">
  // Props（Svelte 5 runes 语法）
  interface Props {
    title: string
    items?: ItemType[]
  }
  let { title, items = [] }: Props = $props()

  // 子组件导入
  import ChildComponent from './ChildComponent.svelte'

  // 响应式状态
  // let count = $state(0)
</script>

<div class="component-name">
  <ChildComponent />
</div>

<style>
  /* Svelte 自动 scoped */
  .component-name {
    display: flex;
    padding: var(--spacing-4);
    color: var(--color-text-primary);
    background-color: var(--color-background);
  }
</style>
```

**App.svelte 更新规则**：
```svelte
<script lang="ts">
  import Header from './components/Header.svelte'
  import HeroSection from './components/HeroSection.svelte'
</script>

<main class="app">
  <Header />
  <HeroSection />
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
</style>
```

---

#### Angular（framework = angular）

每个组件生成三个文件：

**`component-name.component.ts`**：
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core'
import { ChildComponent } from './child/child.component'

@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [ChildComponent],
  templateUrl: './component-name.component.html',
  styleUrl: './component-name.component.css'
})
export class ComponentNameComponent {
  @Input() title = ''
  @Input() items: ItemType[] = []
  @Output() clicked = new EventEmitter<string>()
}
```

**`component-name.component.html`**：
```html
<div class="component-name">
  <app-child></app-child>
</div>
```

**`component-name.component.css`**：
```css
.component-name {
  display: flex;
  padding: var(--spacing-4);
  color: var(--color-text-primary);
  background-color: var(--color-background);
}
```

---

#### Vanilla（framework = vanilla）

生成纯 HTML + CSS + JS 文件：

**`src/components/component-name.js`**（或 `.ts`）：
```js
export function createComponentName(container) {
  container.innerHTML = `
    <div class="component-name">
      <!-- 结构 -->
    </div>
  `
}
```

**`src/components/component-name.css`**：
```css
/* BEM 命名 */
.component-name {
  display: flex;
  padding: var(--spacing-4);
  color: var(--color-text-primary);
  background-color: var(--color-background);
}
.component-name__title { /* ... */ }
.component-name__content { /* ... */ }
```

**`src/main.js` 更新规则**：
```js
import './style.css'
import './components/component-name.css'
import { createComponentName } from './components/component-name.js'

const app = document.getElementById('app')
createComponentName(app)
```

---

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

将生成的文件写入 `.d2c/preview/src/` 目录：
- 组件文件：`.d2c/preview/src/components/<ComponentName>.<ext>`
- 更新入口组件（`App.vue` / `App.tsx` / `App.svelte` / `app.component.*` / `main.js`）导入并使用所有组件
- 如有 CSS 变量需要全局定义，写入 `.d2c/preview/src/style.css`

### Step 6: 迭代修改（当有偏差报告时）

如果输入中包含偏差报告（来自 `d2c-verify`）：

1. **分析偏差报告**：逐条理解每个偏差项
2. **定位修改文件**：确定需要修改的组件文件
3. **针对性修改**：
   - 只修改与偏差相关的代码
   - 不要重写整个文件
   - 使用 Edit 工具做精确修改
4. **记录修改**：列出所有修改内容

## 文档记录

每次执行完成后，将代码生成过程记录到 `.d2c/docs/generation-logs/` 目录。

**文件命名**：`<YYYY-MM-DD>-<design-name>.md`
- 日期使用当天日期
- `<design-name>` 从设计规格中的名称派生，使用 kebab-case
- 迭代修改时更新同一文件（追加迭代记录），不创建新文件

**文档内容模板**：

```markdown
# 代码生成记录：<设计稿名称>

## 基本信息
- **日期**：<YYYY-MM-DD>
- **设计规格来源**：d2c-extract 对话上下文
- **迭代次数**：<首次生成 / 第 N 次迭代>
- **技术栈**：<framework> + <language> + <cssStrategy>
- **Context 加载状态**：
  - design-system.md：<已加载/使用默认值>
  - component-library.md：<已加载/使用默认值>
  - project-config.md：<已加载/使用默认值>

## 组件分解方案
| 组件名 | 职责 | 文件路径 | 子组件 |
|--------|------|----------|--------|
| <PascalCase> | <描述> | .d2c/preview/src/components/<name>.<ext> | <子组件列表> |

## 生成文件清单
| 文件路径 | 类型 | 状态 |
|----------|------|------|
| .d2c/preview/src/components/<name>.<ext> | 组件 | 新建/更新 |
| .d2c/preview/src/App.<ext> | 根组件 | 更新 |
| .d2c/preview/src/style.css | 全局样式 | 新建/更新 |

## Token 使用情况
| CSS 变量 | 使用位置 | 来源 |
|----------|----------|------|
| var(--color-primary) | Header .logo | design-system.md |
| 16px | HeroSection .title | 无匹配 token（TODO） |

## 迭代修改记录
### 迭代 N（仅迭代修改时记录）
- **偏差来源**：d2c-verify 偏差报告
- **修改项**：
  1. <文件名> — <修改内容描述>
  2. <文件名> — <修改内容描述>
```

**写入时机**：在 Step 5 文件写入完成后（或 Step 6 迭代修改完成后），使用 Write 工具将文档写入 `.d2c/docs/generation-logs/<YYYY-MM-DD>-<design-name>.md`。迭代修改时，读取已有文件并追加「迭代修改记录」章节。

确保先检查 `.d2c/docs/generation-logs/` 目录存在（如不存在则创建）。

## 错误处理
- 设计规格缺失：提示先运行 `/d2c-extract`
- 组件库组件不存在：使用原生 HTML 元素替代，添加 TODO 注释
- 设计 token 无匹配：使用具体值并添加注释标记
- `.d2c/context/` 不存在：使用默认值，提示运行 `/d2c-init`

---

## 编码规范参考

代码生成应遵循 `.claude/rules/coding-conventions.md` 中对应框架的编码规范。
