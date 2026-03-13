---
name: d2c-merge
description: Merge generated frontend components into a target project directory. Adapts imports, design tokens, file placement, and routing suggestions to match the target project's framework and conventions. Use after visual verification passes.
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

读取 `.d2c/context/project-config.md`，获取检测到的技术栈（`framework`、`cssStrategy` 等）。

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
   - `vite.config.ts` / `next.config.*` / `angular.json` — 构建配置
   - `.eslintrc.*` / `eslint.config.*` — ESLint 配置
   - `.prettierrc.*` — Prettier 配置

3. **读取 `.d2c/context/project-config.md`** 获取用户声明的项目约定

### Step 3: 制定合并方案

根据分析结果，确定每个文件的目标位置：

**文件扩展名对照**（按 framework）：

| 框架 | 组件扩展名 | 入口文件（跳过合并） |
|------|-----------|-------------------|
| vue3 | `.vue` | `App.vue`, `main.ts` |
| react | `.tsx` / `.jsx` | `App.tsx`, `main.tsx` |
| svelte | `.svelte` | `App.svelte`, `main.ts` |
| angular | `.component.ts` + `.component.html` + `.component.css` | `app.component.*` |
| vanilla | `.js` + `.css` | `main.js`, `index.html` |

**文件分类规则**：
- 通用展示组件 → `src/components/` （或 `src/components/common/`）
- 业务组件 → `src/components/business/` （如目录存在）
- 页面级组件 → `src/views/` 或 `src/pages/`
- 全局样式 → `src/assets/styles/` 或 `src/styles/`
- 图片资源 → `src/assets/images/`

**自合并保护**：当目标目录为 CWD（即合入业务项目自身）时：
- **不复制**入口文件（`App.*`、`main.*`、`index.html`）——这些是预览项目的入口文件，不应覆盖业务项目的入口
- 只合并 `components/` 目录下的组件文件和样式文件
- 图片资源从 `.d2c/assets/` 复制到 `src/assets/images/`

**向用户展示合并方案**：
```
=== Merge Plan ===
Source: .d2c/preview/src/
Target: <target-directory>
Framework: <framework>

Files to merge:
  components/Header.<ext>      → <target>/src/components/Header.<ext>
  components/HeroSection.<ext> → <target>/src/components/HeroSection.<ext>
  components/FeatureList.<ext> → <target>/src/components/FeatureList.<ext>
  components/Footer.<ext>      → <target>/src/components/Footer.<ext>
  style.css                    → <target>/src/assets/styles/d2c-generated.css

Skipped (self-merge protection):
  App.<ext>   — target project entry file
  main.<ext>  — target project entry file

Proceed with merge? (Waiting for confirmation)
```

### Step 4: 执行合并

对每个文件执行以下操作：

1. **适配导入路径**：
   - 根据目标项目的路径别名更新 import 语句
   - 例如：`./components/Header.vue` → `@/components/Header.vue`
   - 更新组件间的相对导入路径
   - React：适配 `.tsx` 导入（可能省略扩展名）
   - Angular：适配 standalone imports

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

根据框架和路由库建议路由配置：

#### Vue Router（vue3 + vue-router）
读取路由配置文件（`src/router/index.ts`），建议添加：
```typescript
{
  path: '/new-page',
  name: 'NewPage',
  component: () => import('@/views/NewPage.vue')
}
```

#### React Router（react + react-router-dom）
建议在路由配置中添加：
```tsx
<Route path="/new-page" element={<NewPage />} />
```

#### Angular Router（angular + angular-router）
建议在路由模块中添加：
```typescript
{ path: 'new-page', component: NewPageComponent }
```

#### Svelte（svelte + svelte-routing / SvelteKit）
如果使用 SvelteKit，建议创建 `src/routes/new-page/+page.svelte`。

向用户展示建议，由用户决定是否添加。

### Step 6: 运行目标项目的格式化工具

```bash
cd <target-directory>

# 运行 Prettier（如配置存在）
npx prettier --write "src/components/Header.<ext>" "src/components/HeroSection.<ext>" ...

# 运行 ESLint fix（如配置存在）
npx eslint --fix "src/components/Header.<ext>" "src/components/HeroSection.<ext>" ...
```

### Step 7: 输出合并报告

```
=== D2C Merge Report ===

Framework: <framework>
Files merged:
  ✓ src/components/Header.<ext> (new)
  ✓ src/components/HeroSection.<ext> (new)
  ✓ src/components/FeatureList.<ext> (new)
  ✓ src/components/Footer.<ext> (new)
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
- **技术栈**：<framework> + <language> + <cssStrategy>
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
| components/<name>.<ext> | <target>/src/components/<name>.<ext> | 新建/覆盖/跳过 |
| style.css | <target>/src/assets/styles/d2c-generated.css | 新建 |

## 适配记录
### 导入路径适配
| 原路径 | 适配后路径 |
|--------|------------|
| ./components/Header.<ext> | @/components/Header.<ext> |

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
<按框架输出对应路由代码片段>

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
| 自合并时入口文件 | 自动跳过，不覆盖业务项目入口 |
