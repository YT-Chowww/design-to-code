---
name: d2c-init
description: Initialize the .d2c/ directory structure for Vue 3 or React business projects. Detects framework, tooling, and path conventions; creates a Vite preview skeleton and machine-readable context files. Run this before other d2c skills.
---

# D2C Init - 初始化 D2C 工作目录

## 适用范围

- 在目标业务项目根目录执行，无参数。
- 框架检测只输出 `vue3` 或 `react`，默认值为 `vue3`。
- 预览工程统一使用 Vite + TypeScript，承担 D2C 生成、构建、类型校验和视觉验证。
- Context 采用 `md + json` 双轨：`json` 是机器读取主数据，`md` 是人工摘要和约束说明。

## 模板位置

从本 SKILL.md 所在目录解析模板目录：

- `templates/preview/`：Vue 3 Vite 预览工程模板。
- `templates/context/`：默认 context 模板。

目标目录固定为当前业务项目下的 `.d2c/`。

## 流程

### Step 1: 检查现有结构

检查 `.d2c/`：

```bash
ls .d2c/
```

完整初始化标记：

- `.d2c/preview/package.json`
- `.d2c/context/project-config.json`
- `.d2c/context/design-system.json`

处理规则：

- 已完整：提示用户已初始化，并在重置前取得确认。
- 缺少关键文件：创建缺失目录和文件，保留已有 context 内容，优先补齐缺口。

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

### Step 3: 检测项目配置

读取当前目录的 `package.json`，并用 `rg --files` 或等价工具查找配置文件。Monorepo 项目向上查找到仓库根目录，记录 `projectRoot` 与 `repoRoot`。

```bash
cat package.json
rg --files -g 'tsconfig.json' -g 'vite.config.*' -g 'webpack.config.*' -g 'config/config.*' -g '.umirc.*' -g 'tailwind.config.*' -g 'components.json'
```

`package.json` 缺失时使用默认值：`vue3 + typescript + vite + scoped`。

检测规则：

| 字段 | 规则 | 默认值 |
| --- | --- | --- |
| `framework` | `react` / `react-dom` / `@vitejs/plugin-react` / Umi React 项目 -> `react`；`vue` / `@vitejs/plugin-vue` / `vue-router` -> `vue3` | `vue3` |
| `language` | `typescript` 依赖或 `tsconfig.json` -> `typescript`；其余 -> `javascript` | `typescript` |
| `buildTool` | `umi` / `.umirc.*` / `config/config.*` -> `umi`；`vite` / `vite.config.*` -> `vite`；`next` -> `next`；`webpack` / `webpack.config.*` -> `webpack` | `vite` |
| `cssStrategy` | `tailwindcss` / `tailwind.config.*` -> `tailwind`；`less` 或 `.less` 入口 -> `less`；`sass` / `node-sass` -> `sass`；`styled-components` / `@emotion/styled` -> `styled-components`；CSS Modules 命名 -> `css-modules` | Vue: `scoped`；React: `css-modules` |
| `componentLibrary` | Vue: `element-plus` / `ant-design-vue` / `vuetify`；React: `antd` / `@mui/material` / `@shadcn/ui` 或 `components.json` | `none` |
| `router` | Vue: `vue-router`；React: `react-router-dom` / `react-router`；Umi 项目记录 `umi-router` | `none` |
| `stateManagement` | Vue: `pinia` / `vuex`；React: `dva` / `@reduxjs/toolkit` / `redux` / `zustand` / `jotai` | `none` |
| `reactMajor` | 从 `react` 版本解析主版本号，用于选择预览入口 | 空 |
| `linter` | `.eslintrc.*` / `eslint.config.*` / `biome.json` | `none` |
| `formatter` | `.prettierrc.*` / `prettier.config.*` / `biome.json` / `dprint.json` | `none` |
| `styleLinter` | `.stylelintrc.*` / `stylelint.config.*` | `none` |
| `toolCommands` | 记录 `package.json scripts` 中的 `lint`、`format`、`check`、`type-check`、`build` | `{}` |

同时记录路径约定：

- `srcRoot`
- `componentDirs`
- `pageDirs`
- `styleDirs`
- `assetDirs`
- `aliases`
- `packageManager`

输出检测摘要：

```text
=== Project Detection ===
framework:        react
language:         typescript
buildTool:        umi
cssStrategy:      less
componentLibrary: antd
router:           umi-router
stateManagement:  dva
reactMajor:       17
linter:           eslint
formatter:        prettier
styleLinter:      stylelint
projectRoot:      .
repoRoot:         ..
```

### Step 4: 创建预览工程

预览工程策略：

- 必备 scripts：`dev`、`build`、`preview`、`type-check`。
- `lint` 在检测到可用 linter 时加入。
- `format` 由 `d2c-merge` 阶段对齐业务项目。
- 依赖版本优先复用业务项目 `package.json` 中的 semver；缺失时使用模板默认值。

#### Vue 3

将 `templates/preview/` 下的文件复制到 `.d2c/preview/`：

| 模板源文件 | 目标文件 |
| --- | --- |
| `templates/preview/package.json` | `.d2c/preview/package.json` |
| `templates/preview/vite.config.ts` | `.d2c/preview/vite.config.ts` |
| `templates/preview/tsconfig.json` | `.d2c/preview/tsconfig.json` |
| `templates/preview/tsconfig.node.json` | `.d2c/preview/tsconfig.node.json` |
| `templates/preview/index.html` | `.d2c/preview/index.html` |
| `templates/preview/src/main.ts` | `.d2c/preview/src/main.ts` |
| `templates/preview/src/App.vue` | `.d2c/preview/src/App.vue` |
| `templates/preview/src/env.d.ts` | `.d2c/preview/src/env.d.ts` |

写入后按检测结果更新 `package.json` 的 scripts 和依赖版本。

#### React

直接生成最小 Vite + React 预览工程。写入前替换所有 `<...>` 占位符。

`.d2c/preview/package.json`：

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
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "<detected react version or ^18.2.0>",
    "react-dom": "<detected react-dom version or ^18.2.0>"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "<detected version or ^4.3.0>",
    "typescript": "<detected version or ~5.6.0>",
    "vite": "<detected version or ^6.0.0>",
    "@types/node": "<detected version or ^20.0.0>",
    "@types/react": "<detected version or matching react major>",
    "@types/react-dom": "<detected version or matching react major>"
  }
}
```

检测到 ESLint 时，在 `scripts` 增加：

```json
"lint": "eslint . --ext .tsx,.ts,.jsx,.js"
```

同时复制业务项目已有 ESLint 相关 devDependencies，例如 `eslint`、`@typescript-eslint/*`、`typescript-eslint`、`@eslint/js`。相关依赖缺失时记录到 context，由后续补充后启用。

`.d2c/preview/vite.config.ts`：

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

`.d2c/preview/tsconfig.json`：

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
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

`.d2c/preview/index.html`：

```html
<!doctype html>
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

React 18+ 使用 `.d2c/preview/src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

React 17 使用 `.d2c/preview/src/main.tsx`：

```tsx
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './style.css'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
```

`.d2c/preview/src/App.tsx`：

```tsx
function App() {
  return (
    <main className="app">
      <h1>D2C Preview</h1>
      <p>Generated components will appear here.</p>
    </main>
  )
}

export default App
```

`.d2c/preview/src/style.css`：

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app {
  padding: 24px;
}
```

`.d2c/preview/src/vite-env.d.ts`：

```ts
/// <reference types="vite/client" />
```

### Step 5: 复制默认 context 文件

将 `templates/context/` 下的文件写入 `.d2c/context/`：

| 模板源文件 | 目标文件 |
| --- | --- |
| `templates/context/design-system.md` | `.d2c/context/design-system.md` |
| `templates/context/design-system.json` | `.d2c/context/design-system.json` |
| `templates/context/component-library.md` | `.d2c/context/component-library.md` |
| `templates/context/component-library.json` | `.d2c/context/component-library.json` |
| `templates/context/project-config.md` | `.d2c/context/project-config.md` |
| `templates/context/project-config.json` | `.d2c/context/project-config.json` |
| `templates/context/project-adapter.json` | `.d2c/context/project-adapter.json` |

已有文件优先保留内容，通过精确编辑补齐字段。全新初始化时直接复制模板。

回填规则：

- `project-config.json`：写入技术栈、工具链、目录、alias、包管理器和 scripts。
- `design-system.json`：写入 `sources`、`tokens`、`tokenResolutionRules`、`helpers`、`rules.outputStrategyByCss`，字段需与 `d2c-generate` 读取契约一致。
- `component-library.json`：写入基础组件库信息、组件候选、`matchingRules`、`styleContract`、`overridePolicy`；检测到 Ant Design、Element Plus 等常见组件库时预置高频组件契约，业务组件等待后续补充。
- `project-adapter.json`：写入路径候选、配置候选、`tokenSources`、样式约定、alias、mergeTargets、validationCommands 和项目特例。
- `.md` 文件写对应 JSON 的人工可读镜像，保留摘要、人工说明和维护约束。

### Step 6: 自动回填设计上下文

自动回填只写入可从当前项目文件中直接推断的事实，并为每条关键结论记录 `evidence`。无法确认的内容保留空值或 `unknown`，不要把示例值当成项目事实。

通用输入：

- `package.json` dependencies / devDependencies / scripts。
- `project-config.json` 的 `framework`、`cssStrategy`、`componentLibrary`、`paths`、`tooling`。
- `rg --files` 找到的样式入口、主题配置、组件目录、页面目录、构建配置、lint/format 配置。

按 `cssStrategy` 选择提取策略：

- `less`：读取变量文件、mixin 文件、入口 `index.less`；识别主题配置中的颜色、间距、排版、圆角、阴影、断点、zIndex 和组件级 token。
- `tailwind`：读取 `tailwind.config.*` 的 theme、extend 和 plugins。
- `sass`：读取变量、mixin 和全局入口。
- `styled-components`：读取 theme 文件、token json 和 provider 配置。
- `css-modules` / `scoped`：记录样式文件命名、局部样式约定和全局 token 来源。

回填要求：

- `tokens.*[]` 中每个 token 记录 `name`、`value`、`type`、`source`、`usage`、`cssStrategy`。
- `tokenResolutionRules[]` 将常见 Figma 候选语义记录为项目 token 候选解析规则，包含 `semantic`、`propertyTypes`、`targets[].target`、`strategy`、`source`、`currentValue`、`matchType`、`confidence`、`evidence`、`notes`。
- `helpers[]` 记录可复用 mixin、工具样式、主题入口和使用场景。
- `component-library.components[]` 至少包含常见 UI 模式的 `patterns`、`propsMapping`、`styleContract`、`overridePolicy`。
- `project-adapter` 记录目标项目的路径、别名、样式共址规则、token 来源和验证命令。

#### design-system 自动回填

回填 `design-system.json`：

- `sourceType`：按实际来源写 `less`、`tailwind`、`sass`、`styled-components`、`css-modules`、`scoped`、`css-variables` 或 `mixed`。
- `sources[]`：每个来源记录 `path`、`sourceType`、`cssStrategy`、`exports`、`evidence`、`confidence`。
- `tokens.color[]`：识别 hex、rgb、rgba、hsl、CSS var、Less/Sass 变量、Tailwind theme color。
- `tokens.spacing[]`、`radius[]`、`shadow[]`、`breakpoint[]`、`zIndex[]`：识别变量名、theme key、mixin 参数和常量。
- `tokens.typography[]`：识别字号、行高、字重、字体族 token。
- `tokens.component[]`：识别组件级 token，例如 Button 高度、Table padding、Modal radius。
- `helpers[]`：记录 mixin、工具 class、theme helper、provider、函数式 token helper。
- `rules.outputStrategyByCss`：必须覆盖 less、tailwind、sass、styled-components、css-modules、scoped、css-variables 和 default。

#### component-library 自动回填

根据 `project-config.componentLibrary` 和依赖检测写入 `component-library.json`：

| 检测结果 | library.name | 高频契约 |
| --- | --- | --- |
| `antd` | `antd` | Button、Form、Input、Select、Table、Modal、Tabs、Tag、Pagination |
| `ant-design-vue` | `ant-design-vue` | Button、Form、Input、Select、Table、Modal、Tabs、Tag、Pagination |
| `element-plus` | `element-plus` | Button、Form、Input、Select、Table、Dialog、Tabs、Tag、Pagination |

组件契约要求：

- `patterns[]` 写设计稿识别特征，例如 `primary-action`、`data-table`、`filter-form`。
- `propsMapping` 写从设计语义到组件 props 的映射，不写无法确认的业务 props。
- `styleContract.covered[]` 写组件默认样式可覆盖的维度。
- `styleContract.variableByProps[]` 写可通过 props 调整的维度。
- `styleContract.tokenSlots[]` 写可对接项目 token 的槽位。
- `styleContract.layoutLimits[]` 写不适合复用组件的布局限制。
- `overridePolicy.allowed[]` 写允许覆盖方式，例如 `className`、`style`、`tokenOverride`、`themeConfig`。
- `overridePolicy.fallbackWhenMismatch` 写 styleFit 低于阈值时的 fallback 策略。

#### project-adapter 自动回填

回填 `project-adapter.json`：

- `pathCandidates`：来自 `project-config.paths` 和实际目录扫描，分别记录 components、pages、layouts、assets、styles。
- `configCandidates`：记录 framework、typescript、eslint、prettier、stylelint、tailwind、vite、webpack、umi、next 配置文件。
- `tokenSources`：从 `design-system.sources` 派生 theme、less、cssVariables、tailwind、sass、styledComponents。
- `styleConventions`：记录样式语言、组件样式是否共址、全局样式入口、className 命名模式。
- `aliasResolution`：从 tsconfig、vite、webpack、umi、next 或 package 配置中提取 alias。
- `mergeTargets`：选择默认组件、页面、样式、资源落位目录；多个候选时记录最保守路径。
- `validationCommands`：从 package scripts 和 tooling 中提取 `typeCheck`、`build`、`lint`、`stylelint`、`formatCheck`。
- `projectSpecifics`：仅记录已验证的项目特例，并写入 `evidence`。

结构校验：

```bash
node scripts/check-init-context.mjs .d2c/context
node scripts/check-init-context.mjs .d2c/context --strict-autofill
```

`--strict-autofill` 用于项目化初始化后检查自动回填是否真的写入来源、组件契约、tokenSources、mergeTargets 和 validationCommands；模板态允许保持空结构。

提取失败时保留模板默认结构，并在最终输出中标注需要补全的 context json 文件。初始化流程继续执行。

### Step 6.1: 同步 Markdown 摘要

项目化回填 JSON 后，同步更新对应 Markdown：

- `design-system.md` 从 `design-system.json` 派生，写入真实来源、核心 token、组件级 token、token 候选解析规则、输出策略、helper 和维护约束。
- `component-library.md` 从 `component-library.json` 派生，写入基础组件库、预置组件契约和业务组件补充说明。
- `project-config.md` 从 `project-config.json` 派生，写入检测结果、关键路径和可用命令。

同步规则：

- JSON 是机器主数据。
- Markdown 是人工可读镜像。
- Markdown 内容必须反映当前项目，避免保留模板占位。
- 项目化摘要只写已验证来源；不确定内容写入待补充项，并指向对应 JSON 字段。

Markdown 校验：

```bash
rg -n "sourceType: unknown|<project-token>|<hex>|<helper-name>|待回填" .d2c/context/*.md
```

有命中时继续同步 Markdown，直到占位内容清空。

### Step 7: 更新 .gitignore

检查项目根目录 `.gitignore`，追加以下条目并避免重复：

```gitignore
# D2C preview artifacts
.d2c/preview/node_modules/
.d2c/preview/dist/
```

`.gitignore` 缺失时创建文件并写入上述内容。

### Step 8: 安装依赖

根据 `packageManager` 选择命令，默认使用 npm：

```bash
cd .d2c/preview && npm install
```

常见映射：

- `pnpm-lock.yaml` -> `pnpm install`
- `yarn.lock` -> `yarn install`
- `package-lock.json` 或缺省 -> `npm install`

### Step 9: 输出结果

```text
=== D2C Init Complete ===

Tech Stack:
  framework:        <detected-value>
  language:         <detected-value>
  buildTool:        <detected-value>
  cssStrategy:      <detected-value>
  componentLibrary: <detected-value>
  router:           <detected-value>
  stateManagement:  <detected-value>

Created:
  .d2c/
  ├── preview/          # Vue 3 或 React Vite 预览工程
  ├── context/          # md + json 上下文
  ├── assets/           # Figma 图片资源
  └── docs/             # 执行文档记录

Next steps:
  1. 检查 .d2c/context/project-config.json
  2. 检查 .d2c/context/design-system.json
  3. 补充 .d2c/context/component-library.json
  4. 根据项目特例更新 .d2c/context/project-adapter.json
  5. 确认 Figma MCP 配置
  6. 运行 /d2c <figma-url> 开始转换
```

### MCP 配置提示

项目中需要 `.mcp.json` 时，提示用户配置：

```text
D2C 依赖以下 MCP 服务：

1. Figma MCP（必需）：用于提取设计信息，需要 FIGMA_API_KEY。
2. Chrome DevTools MCP（可选）：用于视觉验证。
```
