---
name: d2c-validate
description: Validate generated frontend code with type checking, linting, and build verification. Adapts validation commands to the detected framework (Vue 3, React, Svelte, Angular, or Vanilla). Also starts the dev server for preview. Use after d2c-generate has produced code.
---

# D2C Validate — 代码校验与运行

## 输入
- 已生成的代码（位于 `.d2c/preview/src/`）

## 流程

### Step 0: 读取技术栈配置

读取 `.d2c/context/project-config.md`，从「检测到的技术栈」章节提取：
- `framework`: vue3 | react | svelte | angular | vanilla
- `language`: typescript | javascript
- `buildTool`: vite | next | webpack | angular-cli | none

如果文件不存在或未检测到，使用默认值 vue3 + typescript + vite。

### Step 0.5: 确保预览项目存在

检查 `.d2c/preview/package.json` 是否存在：

```bash
ls .d2c/preview/package.json
```

如果不存在，需要按照检测到的框架创建预览项目骨架。以下按框架分支列出内联模板：

#### Vue 3 预览项目骨架（framework = vue3）

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

其他文件（vite.config.ts, tsconfig.json, tsconfig.node.json, index.html, src/main.ts, src/env.d.ts）与 d2c-init 的 Vue 3 模板保持一致。

#### React 预览项目骨架（framework = react）

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

其他文件（vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/vite-env.d.ts）与 d2c-init 的 React 模板保持一致。

#### Svelte / Angular / Vanilla

参考 d2c-init SKILL.md 中对应框架的模板创建预览项目骨架。

### Step 1: 确保预览项目就绪

检查预览项目依赖是否已安装：

```bash
ls .d2c/preview/node_modules
```

如果 `node_modules` 不存在：
```bash
cd .d2c/preview && npm install
```

### Step 2: 类型检查（按框架分支）

根据框架和语言选择对应的类型检查命令：

| 框架 | 命令 | 条件 |
|------|------|------|
| vue3 | `cd .d2c/preview && npx vue-tsc --noEmit` | language = typescript |
| react | `cd .d2c/preview && npx tsc --noEmit` | language = typescript |
| svelte | `cd .d2c/preview && npx svelte-check --tsconfig ./tsconfig.json` | language = typescript |
| angular | `cd .d2c/preview && npx ng build` | 始终执行（Angular CLI 内含 TS 检查） |
| vanilla | 跳过 | language = javascript 时也跳过 |

如果 `language = javascript`（非 Angular），跳过类型检查步骤。

**如果失败**：
1. 分析错误信息，确定具体问题
2. 修复错误（修改生成的组件文件）
3. 重新运行检查
4. 如果修复 2 次仍然失败：
   - 在问题行添加 `// @ts-ignore`（Vue/React/Svelte）
   - 添加 `// TODO: Fix TypeScript error - [具体错误描述]` 注释
   - 继续后续步骤

### Step 3: ESLint 检查

根据框架选择对应的 ESLint 扩展名：

| 框架 | 命令 |
|------|------|
| vue3 | `cd .d2c/preview && npx eslint src/ --ext .vue,.ts,.tsx` |
| react | `cd .d2c/preview && npx eslint src/ --ext .tsx,.ts,.jsx,.js` |
| svelte | `cd .d2c/preview && npx eslint src/ --ext .svelte,.ts,.js` |
| angular | `cd .d2c/preview && npx ng lint`（如配置了 ESLint） |
| vanilla | `cd .d2c/preview && npx eslint src/ --ext .js,.ts` |

**如果失败**：
1. 分析 ESLint 错误
2. 自动修复可修复的问题：追加 `--fix`
3. 手动修复剩余问题
4. 如果是规则冲突：在特定行添加 `// eslint-disable-next-line` 注释

注意：如果 ESLint 配置文件不存在，跳过此步骤并告知用户。

### Step 4: 构建检查（按框架分支）

| 框架 | 命令 |
|------|------|
| vue3 | `cd .d2c/preview && npx vite build` |
| react | `cd .d2c/preview && npx vite build` |
| svelte | `cd .d2c/preview && npx vite build` |
| angular | `cd .d2c/preview && npx ng build`（已在 Step 2 执行则跳过） |
| vanilla | `cd .d2c/preview && npx vite build` |

**如果失败**：
1. 分析构建错误（通常是导入路径、语法错误等）
2. 修复问题并重新构建
3. 如果涉及第三方依赖缺失：`npm install <package>`

### Step 5: 启动开发服务器

检查端口 5173 是否已被占用：
```bash
lsof -i :5173
```

如果已占用，先停止已有进程。然后启动开发服务器：

| 框架 | 命令 |
|------|------|
| vue3 / react / svelte / vanilla | `cd .d2c/preview && npx vite --port 5173 &` |
| angular | `cd .d2c/preview && npx ng serve --port 5173 &` |

等待服务器启动就绪（检查输出包含 `Local:` URL）。

### Step 6: 输出验证结果

**成功输出格式**：
```
=== D2C Validate Results ===
Framework: <framework>
✓ Type check: PASSED
✓ ESLint check: PASSED
✓ Build: PASSED
✓ Dev server: Running at http://localhost:5173

All validations passed. Ready for visual verification.
```

**失败输出格式**：
```
=== D2C Validate Results ===
Framework: <framework>
✓ Type check: PASSED
✗ ESLint check: FAILED
  - src/components/Header.tsx:15 - 'unused-var' is defined but never used
✓ Build: PASSED
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
- **技术栈**：<framework> + <language>
- **预览项目状态**：<已存在/自动创建>
- **依赖安装**：<已就绪/重新安装>

## 类型检查
- **状态**：PASSED / DEGRADED / SKIPPED
- **检查命令**：<实际执行的命令>
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

## 构建检查
- **状态**：PASSED / FAILED
- **构建命令**：<实际执行的命令>
- **构建耗时**：<ms>
- **产出大小**：<KB>
- **缺失依赖安装**（如有）：<包名>

## 开发服务器
- **状态**：Running / Failed
- **地址**：http://localhost:5173
- **端口处理**：<空闲直接启动/停止已有进程后重启>

## 综合结果
- Type check: <PASSED/DEGRADED/SKIPPED>
- ESLint: <PASSED/PARTIAL/SKIPPED>
- Build: <PASSED/FAILED>
- Dev server: <Running/Failed>
```

**写入时机**：在 Step 6 输出验证结果后，使用 Write 工具将文档写入 `.d2c/docs/validation-reports/<YYYY-MM-DD>-<design-name>.md`。多次校验时，读取已有文件并追加新一轮的校验记录。

确保先检查 `.d2c/docs/validation-reports/` 目录存在（如不存在则创建）。

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| `.d2c/preview/` 不存在 | Step 0.5 自动创建预览项目 |
| `node_modules` 不存在 | 运行 `npm install` |
| 类型错误修复 2 次仍失败 | 添加 `@ts-ignore` + TODO |
| ESLint 配置缺失 | 跳过 ESLint 检查 |
| 构建失败（依赖缺失） | 安装缺失依赖 |
| 端口 5173 被占用 | 停止占用进程后重新启动 |
| `npm install` 失败 | 报告错误，建议用户手动安装 |
