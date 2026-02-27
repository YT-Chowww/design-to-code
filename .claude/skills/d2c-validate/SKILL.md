---
name: d2c-validate
description: Validate generated Vue 3 code with TypeScript checking, ESLint, and Vite build. Also starts the dev server for preview. Use after d2c-generate has produced code.
---

# D2C Validate — 代码校验与运行

## 输入
- 已生成的 Vue 3 代码（位于 `templates/vite-preview/src/`）

## 流程

### Step 1: 确保预览项目就绪

检查预览项目是否存在且依赖已安装：

```bash
# 检查 node_modules 是否存在
ls templates/vite-preview/node_modules
```

如果 `node_modules` 不存在：
```bash
cd templates/vite-preview && npm install
```

### Step 2: TypeScript 检查

运行 TypeScript 类型检查：
```bash
cd templates/vite-preview && npx vue-tsc --noEmit
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
cd templates/vite-preview && npx eslint src/ --ext .vue,.ts,.tsx
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
cd templates/vite-preview && npx vite build
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
cd templates/vite-preview && npx vite --port 5173 &
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

## 错误处理

| 错误 | 处理方式 |
|------|----------|
| `node_modules` 不存在 | 运行 `npm install` |
| TypeScript 错误修复 2 次仍失败 | 添加 `@ts-ignore` + TODO |
| ESLint 配置缺失 | 跳过 ESLint 检查 |
| Vite 构建失败（依赖缺失） | 安装缺失依赖 |
| 端口 5173 被占用 | 停止占用进程后重新启动 |
| `npm install` 失败 | 报告错误，建议用户手动安装 |
