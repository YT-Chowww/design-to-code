---
name: d2c-validate
description: Validate generated Vue 3 code with TypeScript checking, ESLint, and Vite build. Also starts the dev server for preview. Use after d2c-generate has produced code.
---

# D2C Validate — 代码校验与运行

## 输入
- 已生成的 Vue 3 代码（位于 `.d2c/preview/src/`）

## 流程

### Step 0: 确保预览项目存在

检查 `.d2c/preview/package.json` 是否存在：

```bash
ls .d2c/preview/package.json
```

如果不存在，自动从内联模板创建预览项目骨架：

1. 创建目录：
```bash
mkdir -p .d2c/preview/src/components
mkdir -p .d2c/preview/src/assets
```

2. 创建以下文件（使用 Write 工具）：

**`.d2c/preview/package.json`**:
```json
{
  "name": "d2c-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.ts,.tsx",
    "type-check": "vue-tsc --noEmit"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "~5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.1.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "eslint-plugin-vue": "^9.28.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

**`.d2c/preview/vite.config.ts`**:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
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
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`.d2c/preview/tsconfig.node.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "composite": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
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
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

**`.d2c/preview/src/env.d.ts`**:
```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
```

### Step 1: 确保预览项目就绪

检查预览项目依赖是否已安装：

```bash
ls .d2c/preview/node_modules
```

如果 `node_modules` 不存在：
```bash
cd .d2c/preview && npm install
```

### Step 2: TypeScript 检查

运行 TypeScript 类型检查：
```bash
cd .d2c/preview && npx vue-tsc --noEmit
```

**如果失败**：
1. 分析错误信息，确定具体问题
2. 修复 TypeScript 错误（修改生成的 `.vue` 文件）
3. 重新运行检查
4. 如果修复 2 次仍然失败：
   - 在问题行添加 `// @ts-ignore`
   - 添加 `// TODO: Fix TypeScript error - [具体错误描述]` 注释
   - 继续后续步骤

### Step 3: ESLint 检查

运行 ESLint 代码规范检查：
```bash
cd .d2c/preview && npx eslint src/ --ext .vue,.ts,.tsx
```

**如果失败**：
1. 分析 ESLint 错误
2. 自动修复可修复的问题：`npx eslint src/ --ext .vue,.ts,.tsx --fix`
3. 手动修复剩余问题
4. 如果是规则冲突：在特定行添加 `// eslint-disable-next-line` 注释

注意：如果 ESLint 配置文件不存在，跳过此步骤并告知用户。

### Step 4: Vite 构建检查

运行 Vite 构建验证代码可以正确打包：
```bash
cd .d2c/preview && npx vite build
```

**如果失败**：
1. 分析构建错误（通常是导入路径、语法错误等）
2. 修复问题并重新构建
3. 如果涉及第三方依赖缺失：`npm install <package>`

### Step 5: 启动开发服务器

检查端口 5173 是否已被占用：
```bash
lsof -i :5173
```

如果已占用，先停止已有进程。然后启动 Vite 开发服务器：
```bash
cd .d2c/preview && npx vite --port 5173 &
```

等待服务器启动就绪（检查输出包含 `Local:` URL）。

### Step 6: 输出验证结果

**成功输出格式**：
```
=== D2C Validate Results ===
✓ TypeScript check: PASSED
✓ ESLint check: PASSED
✓ Vite build: PASSED
✓ Dev server: Running at http://localhost:5173

All validations passed. Ready for visual verification.
```

**失败输出格式**：
```
=== D2C Validate Results ===
✓ TypeScript check: PASSED
✗ ESLint check: FAILED
  - src/components/Header.vue:15 - 'unused-var' is defined but never used
✓ Vite build: PASSED
✓ Dev server: Running at http://localhost:5173

Some validations failed. See errors above.
```

## 文档记录

每次执行完成后，将校验结果记录到 `.d2c/docs/validation-reports/` 目录。

**文件命名**：`<YYYY-MM-DD>-<design-name>.md`
- 日期使用当天日期
- `<design-name>` 从当前任务的设计稿名称派生，使用 kebab-case
- 同一设计的多次校验（迭代）更新同一文件（追加记录）

**文档内容模板**：

```markdown
# 校验报告：<设计稿名称>

## 基本信息
- **日期**：<YYYY-MM-DD>
- **校验轮次**：<第 N 次校验>
- **预览项目状态**：<已存在/自动创建>
- **依赖安装**：<已就绪/重新安装>

## TypeScript 检查
- **状态**：PASSED / DEGRADED / FAILED
- **错误数量**：<N>
- **修复尝试**：<N/2>
- **修复详情**：
  1. <文件:行号> — <错误描述> → <修复方式>
- **降级处理**（如有）：
  1. <文件:行号> — 添加 @ts-ignore（原因：<描述>）

## ESLint 检查
- **状态**：PASSED / PARTIAL / SKIPPED
- **错误数量**：<N>
- **自动修复**：<N 项>
- **剩余问题**：
  1. <文件:行号> — <规则名> — <描述>

## Vite 构建
- **状态**：PASSED / FAILED
- **构建耗时**：<ms>
- **产出大小**：<KB>
- **缺失依赖安装**（如有）：<包名>

## 开发服务器
- **状态**：Running / Failed
- **地址**：http://localhost:5173
- **端口处理**：<空闲直接启动/停止已有进程后重启>

## 综合结果
- TypeScript: <PASSED/DEGRADED/FAILED>
- ESLint: <PASSED/PARTIAL/SKIPPED>
- Vite build: <PASSED/FAILED>
- Dev server: <Running/Failed>
```

**写入时机**：在 Step 6 输出验证结果后，使用 Write 工具将文档写入 `.d2c/docs/validation-reports/<YYYY-MM-DD>-<design-name>.md`。多次校验时，读取已有文件并追加新一轮的校验记录。

确保先检查 `.d2c/docs/validation-reports/` 目录存在（如不存在则创建）。

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| `.d2c/preview/` 不存在 | Step 0 自动创建预览项目 |
| `node_modules` 不存在 | 运行 `npm install` |
| TypeScript 错误修复 2 次仍失败 | 添加 `@ts-ignore` + TODO |
| ESLint 配置缺失 | 跳过 ESLint 检查 |
| Vite 构建失败（依赖缺失） | 安装缺失依赖 |
| 端口 5173 被占用 | 停止占用进程后重新启动 |
| `npm install` 失败 | 报告错误，建议用户手动安装 |
