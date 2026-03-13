---
name: d2c-init
description: Initialize the .d2c/ directory structure in a business project. Auto-detects tech stack from package.json, creates a framework-appropriate preview project skeleton, default context files, and assets directory. Run this before using other d2c skills.
---

# D2C Init — 初始化 D2C 工作目录

## 输入
- 无参数（在当前业务项目目录下执行）

## 模板文件位置
模板文件位于本 skill 目录下的 `templates/` 子目录：
- `templates/preview/` — 预览项目模板文件（Vue 3 默认）
- `templates/context/` — 默认 context 文件

定位模板目录：找到本 SKILL.md 所在目录下的 `templates/` 文件夹。即 `.claude/skills/d2c-init/templates/`。

## 流程

### Step 1: 检查现有结构

检查当前目录下是否已存在 `.d2c/` 目录：

```bash
ls .d2c/
```

- 如果存在且完整，提示用户已初始化，询问是否重置
- 如果不存在或不完整，继续创建

### Step 2: 创建目录结构

```bash
mkdir -p .d2c/preview/src/components
mkdir -p .d2c/preview/src/assets
mkdir -p .d2c/context
mkdir -p .d2c/assets
mkdir -p .d2c/docs/reference
mkdir -p .d2c/docs/design-specs
mkdir -p .d2c/docs/generation-logs
mkdir -p .d2c/docs/validation-reports
mkdir -p .d2c/docs/verification-reports
mkdir -p .d2c/docs/merge-reports
mkdir -p .d2c/docs/sessions
```

### Step 2.5: 检测项目技术栈

读取当前目录（即目标业务项目）的 `package.json`，自动检测技术栈，并将结果写入 `project-config.md`。

**检测逻辑**：

1. **读取 `package.json`**（如果存在）：
```bash
cat package.json
```
如果不存在 `package.json`，跳过检测，使用全部默认值（vue3 + typescript + vite + scoped）。

2. **逐项检测**（从 `dependencies` 和 `devDependencies` 中判断）：

| 字段 | 检测规则 | 默认值 |
|------|----------|--------|
| **framework** | `vue` → `vue3`；`react` / `react-dom` → `react`；`svelte` → `svelte`；`@angular/core` → `angular`；均无 → `vue3` | `vue3` |
| **language** | `typescript` 在 devDeps 或存在 `tsconfig.json` → `typescript`；否则 → `javascript` | `typescript` |
| **buildTool** | `vite` → `vite`；`next` → `next`；`webpack` → `webpack`；`@angular/cli` 或存在 `angular.json` → `angular-cli`；均无 → `vite` | `vite` |
| **cssStrategy** | `tailwindcss` → `tailwind`；`styled-components` / `@emotion/styled` → `styled-components`；`sass` / `node-sass` → `sass`；`less` → `less`；均无 → 按框架默认（vue3: `scoped`, react: `css-modules`, svelte: `scoped`, angular: `scoped`, vanilla: `vanilla`） | 按框架 |
| **componentLibrary** | `element-plus` → `element-plus`；`ant-design-vue` → `ant-design-vue`；`vuetify` → `vuetify`；`@mui/material` → `mui`；`antd` → `antd`；`@shadcn/ui` 或存在 `components.json` → `shadcn`；均无 → `none` | `none` |
| **router** | `vue-router` → `vue-router`；`react-router-dom` / `react-router` → `react-router-dom`；`@angular/router` → `angular-router`；`svelte-routing` / `@sveltejs/kit` → `svelte-routing`；均无 → `none` | `none` |
| **stateManagement** | `pinia` → `pinia`；`vuex` → `vuex`；`@reduxjs/toolkit` / `redux` → `redux`；`zustand` → `zustand`；`jotai` → `jotai`；`@ngrx/store` → `ngrx`；均无 → `none` | `none` |

3. **检查额外配置文件**（辅助判断）：
```bash
ls tsconfig.json 2>/dev/null
ls tailwind.config.* 2>/dev/null
ls angular.json 2>/dev/null
ls next.config.* 2>/dev/null
ls svelte.config.* 2>/dev/null
ls components.json 2>/dev/null
```

4. **输出检测结果**：
```
=== Tech Stack Detection ===
framework:        react       (detected from package.json → react-dom)
language:         typescript  (detected from devDependencies → typescript)
buildTool:        vite        (detected from devDependencies → vite)
cssStrategy:      tailwind    (detected from devDependencies → tailwindcss)
componentLibrary: none
router:           react-router-dom (detected from dependencies → react-router-dom)
stateManagement:  zustand     (detected from dependencies → zustand)
```

### Step 3: 复制预览项目文件（按检测到的框架）

根据 Step 2.5 检测到的 `framework` 字段，创建对应的预览项目。

#### Vue 3（framework = vue3）

读取 `templates/preview/` 下的每个文件，写入到 `.d2c/preview/` 对应位置：

| 模板源文件 | 目标文件 |
|-----------|---------|
| `templates/preview/package.json` | `.d2c/preview/package.json` |
| `templates/preview/vite.config.ts` | `.d2c/preview/vite.config.ts` |
| `templates/preview/tsconfig.json` | `.d2c/preview/tsconfig.json` |
| `templates/preview/tsconfig.node.json` | `.d2c/preview/tsconfig.node.json` |
| `templates/preview/index.html` | `.d2c/preview/index.html` |
| `templates/preview/src/main.ts` | `.d2c/preview/src/main.ts` |
| `templates/preview/src/App.vue` | `.d2c/preview/src/App.vue` |
| `templates/preview/src/env.d.ts` | `.d2c/preview/src/env.d.ts` |

对每个文件：使用 Read 工具读取模板文件内容，然后使用 Write 工具写入目标路径。

#### React（framework = react）

无模板文件，使用内联模板直接生成：

**`.d2c/preview/package.json`**:
```json
{
  "name": "d2c-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .tsx,.ts,.jsx,.js",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

**`.d2c/preview/vite.config.ts`**:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: false
  }
})
```

**`.d2c/preview/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**`.d2c/preview/index.html`**:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>D2C Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`.d2c/preview/src/main.tsx`**:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**`.d2c/preview/src/App.tsx`**:
```tsx
function App() {
  return (
    <div className="app">
      <h1>D2C Preview</h1>
      <p>Generated components will appear here.</p>
    </div>
  )
}

export default App
```

**`.d2c/preview/src/vite-env.d.ts`**:
```ts
/// <reference types="vite/client" />
```

#### Svelte（framework = svelte）

**`.d2c/preview/package.json`**:
```json
{
  "name": "d2c-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "type-check": "svelte-check --tsconfig ./tsconfig.json"
  },
  "dependencies": {},
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "~5.6.0",
    "vite": "^6.0.0"
  }
}
```

**`.d2c/preview/vite.config.ts`**:
```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    open: false
  }
})
```

**`.d2c/preview/tsconfig.json`**:
```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`.d2c/preview/index.html`**:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>D2C Preview</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**`.d2c/preview/src/main.ts`**:
```ts
import App from './App.svelte'

const app = new App({
  target: document.getElementById('app')!
})

export default app
```

**`.d2c/preview/src/App.svelte`**:
```svelte
<script lang="ts">
  // Generated components will be imported here
</script>

<main class="app">
  <h1>D2C Preview</h1>
  <p>Generated components will appear here.</p>
</main>

<style>
  .app {
    font-family: sans-serif;
  }
</style>
```

#### Angular（framework = angular）

Angular 不使用 Vite 预览。提示用户：
```
Angular 项目检测到。D2C 预览将使用 Angular CLI 的开发服务器。
请确保已全局安装 @angular/cli：npm install -g @angular/cli

正在使用 ng new 创建预览项目...
```

```bash
cd .d2c && npx @angular/cli new preview --skip-git --style=css --routing=false --ssr=false --skip-tests && cd ..
```

#### Vanilla（framework = vanilla）

**`.d2c/preview/package.json`**:
```json
{
  "name": "d2c-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

**`.d2c/preview/index.html`**:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>D2C Preview</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

**`.d2c/preview/src/main.js`**:
```js
import './style.css'

document.getElementById('app').innerHTML = `
  <h1>D2C Preview</h1>
  <p>Generated code will appear here.</p>
`
```

**`.d2c/preview/src/style.css`**:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
```

### Step 4: 复制默认 context 文件

读取 `templates/context/` 下的每个文件，写入到 `.d2c/context/` 对应位置：

| 模板源文件 | 目标文件 |
|-----------|---------|
| `templates/context/design-system.md` | `.d2c/context/design-system.md` |
| `templates/context/component-library.md` | `.d2c/context/component-library.md` |
| `templates/context/project-config.md` | `.d2c/context/project-config.md` |

写入 `project-config.md` 后，将 Step 2.5 的检测结果更新到文件中的「检测到的技术栈」字段区。使用 Edit 工具将默认值替换为检测到的值。

### Step 5: 更新 .gitignore

检查项目根目录的 `.gitignore`，如果存在则追加以下条目（避免重复）：

```
# D2C preview artifacts
.d2c/preview/node_modules/
.d2c/preview/dist/
```

如果 `.gitignore` 不存在，创建并写入上述内容。

### Step 6: 安装依赖

```bash
cd .d2c/preview && npm install
```

### Step 7: 输出结果

```
=== D2C Init Complete ===

Tech Stack:
  framework:        <detected-value>
  language:         <detected-value>
  buildTool:        <detected-value>
  cssStrategy:      <detected-value>
  componentLibrary: <detected-value>

Created:
  .d2c/
  ├── preview/          # <framework> + Vite 预览项目
  │   ├── package.json
  │   ├── vite.config.ts (或 angular.json)
  │   ├── tsconfig.json
  │   ├── index.html
  │   └── src/
  │       ├── main.<ext>
  │       ├── App.<ext>
  │       └── components/
  ├── context/          # 上下文配置（已填入检测结果）
  │   ├── design-system.md
  │   ├── component-library.md
  │   └── project-config.md
  ├── assets/           # Figma 图片资源
  └── docs/             # 执行文档记录
      ├── reference/
      ├── design-specs/
      ├── generation-logs/
      ├── validation-reports/
      ├── verification-reports/
      ├── merge-reports/
      └── sessions/

Next steps:
  1. 检查 .d2c/context/project-config.md 中的检测结果是否准确
  2. 编辑 .d2c/context/design-system.md 填入你的设计 token
  3. 编辑 .d2c/context/component-library.md 填入你的业务组件
  4. 确保 Figma MCP 已配置（.mcp.json 中包含 figma 服务）
  5. 运行 /d2c <figma-url> 开始转换
```

### MCP 配置指引

如果项目中没有 `.mcp.json`，提示用户需要配置：

```
提示：D2C 依赖以下 MCP 服务：

1. Figma MCP（必需）— 用于提取设计信息
   在 .mcp.json 中添加 figma 服务配置，并设置 FIGMA_API_KEY

2. Chrome DevTools MCP（可选）— 用于视觉验证
   如未配置，将跳过视觉验证步骤
```
