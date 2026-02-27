---
name: d2c-merge
description: Merge generated Vue 3 components into a target project directory. Adapts imports, design tokens, and file placement to match the target project's conventions. Use after visual verification passes.
---

# D2C Merge — 合入项目代码

## 输入
- 参数：目标项目目录路径（如 `/path/to/my-project`）
- 已验证通过的生成代码（位于 `templates/vite-preview/src/`）

## 流程

### Step 1: 验证目标项目

1. 确认目标目录存在且是一个有效的前端项目：
   ```bash
   ls <target-directory>/package.json
   ls <target-directory>/src/
   ```

2. 如果目标目录不存在或不是有效项目：
   - 提示用户检查目录路径
   - 中止合并流程

### Step 2: 分析目标项目结构

读取目标项目的关键配置，理解其约定：

1. **目录结构**：
   ```bash
   ls <target-directory>/src/
   ```
   - 确定组件目录：`src/components/`、`src/components/common/`、`src/components/business/` 等
   - 确定页面目录：`src/views/`、`src/pages/` 等
   - 确定样式目录：`src/assets/styles/`、`src/styles/` 等

2. **读取项目配置**（如存在）：
   - `tsconfig.json` — 路径别名配置
   - `vite.config.ts` / `vue.config.js` — 构建配置
   - `.eslintrc.*` / `eslint.config.*` — ESLint 配置
   - `.prettierrc.*` — Prettier 配置

3. **读取 `context/project-config.md`** 获取用户声明的项目约定

### Step 3: 制定合并方案

根据分析结果，确定每个文件的目标位置：

**文件分类规则**：
- 通用展示组件 → `src/components/` （或 `src/components/common/`）
- 业务组件 → `src/components/business/` （如目录存在）
- 页面级组件 → `src/views/` 或 `src/pages/`
- 全局样式 → `src/assets/styles/` 或 `src/styles/`
- 图片资源 → `src/assets/images/`

**向用户展示合并方案**：
```
=== Merge Plan ===
Source: templates/vite-preview/src/

Files to merge:
  components/Header.vue      → <target>/src/components/Header.vue
  components/HeroSection.vue → <target>/src/components/HeroSection.vue
  components/FeatureList.vue → <target>/src/components/FeatureList.vue
  components/Footer.vue      → <target>/src/components/Footer.vue
  style.css                  → <target>/src/assets/styles/d2c-generated.css

Proceed with merge? (Waiting for confirmation)
```

### Step 4: 执行合并

对每个文件执行以下操作：

1. **适配导入路径**：
   - 根据目标项目的路径别名更新 import 语句
   - 例如：`./components/Header.vue` → `@/components/Header.vue`
   - 更新组件间的相对导入路径

2. **替换设计 token**：
   - 如果目标项目使用不同的 CSS 变量名，做映射替换
   - 如果目标项目使用 Tailwind CSS，将 CSS 变量转换为 Tailwind 类名
   - 保留无法映射的值并添加注释

3. **复制文件到目标目录**：
   - 创建目标子目录（如不存在）
   - 写入文件内容（适配后的版本）
   - 不覆盖已存在的同名文件（提示用户确认）

4. **复制资源文件**：
   - 图片、图标等静态资源复制到 `src/assets/` 对应目录
   - 更新代码中的资源引用路径

### Step 5: 配置路由（如适用）

如果目标项目使用 Vue Router 且生成的是页面级组件：

1. 读取路由配置文件（`src/router/index.ts`）
2. 建议添加的路由条目：
   ```typescript
   {
     path: '/new-page',
     name: 'NewPage',
     component: () => import('@/views/NewPage.vue')
   }
   ```
3. 向用户展示建议，由用户决定是否添加

### Step 6: 运行目标项目的格式化工具

```bash
cd <target-directory>

# 运行 Prettier（如配置存在）
npx prettier --write "src/components/Header.vue" "src/components/HeroSection.vue" ...

# 运行 ESLint fix（如配置存在）
npx eslint --fix "src/components/Header.vue" "src/components/HeroSection.vue" ...
```

### Step 7: 输出合并报告

```
=== D2C Merge Report ===

Files merged:
  ✓ src/components/Header.vue (new)
  ✓ src/components/HeroSection.vue (new)
  ✓ src/components/FeatureList.vue (new)
  ✓ src/components/Footer.vue (new)
  ✓ src/assets/styles/d2c-generated.css (new)

Adaptations:
  - Import paths updated to use '@/' alias
  - Design tokens mapped to project variables
  - Formatted with project's Prettier config

Suggested next steps:
  1. Import the new components in your page/layout file
  2. Review the generated CSS variables in d2c-generated.css
  3. Run your project's test suite to verify no regressions

=== Merge Complete ===
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 目标目录不存在 | 提示用户检查路径 |
| 同名文件已存在 | 提示用户确认是否覆盖 |
| 路径别名未知 | 使用相对路径，添加 TODO 注释 |
| lint/format 失败 | 报告错误但不阻塞合并 |
| 无写入权限 | 提示权限问题 |
