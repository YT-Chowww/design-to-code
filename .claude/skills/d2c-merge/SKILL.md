---
name: d2c-merge
description: Merge generated Vue 3 components into a target project directory. Adapts imports, design tokens, and file placement to match the target project's conventions. Use after visual verification passes.
---

# D2C Merge — 合入项目代码

## 输入
- 参数：目标项目目录路径（可选，默认为当前工作目录 CWD）
- 已验证通过的生成代码（位于 `.d2c/preview/src/`）

## 流程

### Step 1: 确定目标目录

1. 如果提供了目标目录参数，使用该路径
2. 如果未提供参数，默认合入当前工作目录（CWD）

确认目标目录存在且是一个有效的前端项目：
```bash
ls <target-directory>/package.json
ls <target-directory>/src/
```

如果目标目录不存在或不是有效项目：
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

3. **读取 `.d2c/context/project-config.md`** 获取用户声明的项目约定

### Step 3: 制定合并方案

根据分析结果，确定每个文件的目标位置：

**文件分类规则**：
- 通用展示组件 → `src/components/` （或 `src/components/common/`）
- 业务组件 → `src/components/business/` （如目录存在）
- 页面级组件 → `src/views/` 或 `src/pages/`
- 全局样式 → `src/assets/styles/` 或 `src/styles/`
- 图片资源 → `src/assets/images/`

**自合并保护**：当目标目录为 CWD（即合入业务项目自身）时：
- **不复制** `App.vue` 和 `main.ts`（这些是预览项目的入口文件，不应覆盖业务项目的入口）
- 只合并 `components/` 目录下的组件文件和样式文件
- 图片资源从 `.d2c/assets/` 复制到 `src/assets/images/`

**向用户展示合并方案**：
```
=== Merge Plan ===
Source: .d2c/preview/src/
Target: <target-directory>

Files to merge:
  components/Header.vue      → <target>/src/components/Header.vue
  components/HeroSection.vue → <target>/src/components/HeroSection.vue
  components/FeatureList.vue → <target>/src/components/FeatureList.vue
  components/Footer.vue      → <target>/src/components/Footer.vue
  style.css                  → <target>/src/assets/styles/d2c-generated.css

Skipped (self-merge protection):
  App.vue   — target project entry file
  main.ts   — target project entry file

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
   - 图片、图标等静态资源从 `.d2c/assets/` 复制到 `src/assets/` 对应目录
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

## 文档记录

每次执行完成后，将合并过程记录到 `.d2c/docs/merge-reports/` 目录。

**文件命名**：`<YYYY-MM-DD>-<design-name>.md`
- 日期使用当天日期
- `<design-name>` 从当前任务的设计稿名称派生，使用 kebab-case

**文档内容模板**：

```markdown
# 合并报告：<设计稿名称>

## 基本信息
- **日期**：<YYYY-MM-DD>
- **目标目录**：<target-directory or CWD>
- **自合并保护**：<是/否>

## 目标项目分析
- **组件目录**：<src/components/ 等>
- **页面目录**：<src/views/ 等>
- **样式目录**：<src/assets/styles/ 等>
- **路径别名**：<@ → src/>
- **格式化工具**：<Prettier + ESLint 等>

## 合并方案
| 源文件 | 目标路径 | 操作 |
|--------|----------|------|
| components/<name>.vue | <target>/src/components/<name>.vue | 新建/覆盖/跳过 |
| style.css | <target>/src/assets/styles/d2c-generated.css | 新建 |

## 适配记录
### 导入路径适配
| 原路径 | 适配后路径 |
|--------|------------|
| ./components/Header.vue | @/components/Header.vue |

### Token 映射
| 原 Token | 目标 Token |
|----------|------------|
| var(--color-primary) | var(--brand-blue) |

### Tailwind 转换（如适用）
| CSS 属性 | Tailwind 类 |
|----------|-------------|
| display: flex | class="flex" |

## 资源文件
| 源文件 | 目标路径 | 状态 |
|--------|----------|------|
| .d2c/assets/<name> | src/assets/images/<name> | OK |

## 路由建议（如适用）
```typescript
{
  path: '<path>',
  name: '<name>',
  component: () => import('<import-path>')
}
```

## 格式化结果
- **Prettier**：<执行/跳过> — <结果>
- **ESLint --fix**：<执行/跳过> — <结果>
```

**写入时机**：在 Step 7 输出合并报告后，使用 Write 工具将文档写入 `.d2c/docs/merge-reports/<YYYY-MM-DD>-<design-name>.md`。

确保先检查 `.d2c/docs/merge-reports/` 目录存在（如不存在则创建）。

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 目标目录不存在 | 提示用户检查路径 |
| 同名文件已存在 | 提示用户确认是否覆盖 |
| 路径别名未知 | 使用相对路径，添加 TODO 注释 |
| lint/format 失败 | 报告错误但不阻塞合并 |
| 无写入权限 | 提示权限问题 |
| 自合并时 App.vue/main.ts | 自动跳过，不覆盖业务项目入口 |
