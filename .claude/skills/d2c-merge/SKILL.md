---
name: d2c-merge
description: Merge generated frontend components into a target project directory. Adapts imports, tokens, file placement, and post-merge tooling to match the target project's conventions.
---

# D2C Merge — 合入项目代码

## 输入
- 参数：目标项目目录路径（可选，默认为当前工作目录 CWD）
- 已验证通过的生成代码（位于 `.d2c/preview/src/`）
- `.d2c/context/project-config.json`
- `.d2c/docs/sessions/<runId>/manifest.json`

## 流程

### Step 1: 确定目标目录

1. 如果提供了目标目录参数，使用该路径
2. 如果未提供参数，默认合入当前工作目录（CWD）

确认目标目录存在且是有效前端项目：

```bash
ls <target-directory>/package.json
ls <target-directory>/src/
```

如果目标目录缺少有效前端项目结构：
- 提示用户检查目录路径
- 中止合并流程

### Step 1.1: 固定写入边界

merge 前读取 `manifest.writeBoundary.allow`、`deny` 和 `baselineStatus`。默认禁止修改 `.mcp.json`、正式 `config/routes.ts`、业务 API、store 和 hook。合入后执行：

```bash
node scripts/check-write-boundary.mjs --manifest=<manifest.json> --root=<target-directory>
```

边界检查失败时停止 target validate，不得把 merge 写成通过。

### Step 2: 分析目标项目结构

优先读取：
- `.d2c/context/project-config.json`
- 目标项目的 `package.json`
- 目标项目的 `tsconfig.json`
- 目标项目的构建配置
- 目标项目的 lint / format 配置

分析重点：

1. **目录结构**
   - 组件目录：`src/components/`、`src/components/common/`、`src/components/business/` 等
   - 页面目录：`src/views/`、`src/pages/` 等
   - 样式目录：`src/assets/styles/`、`src/styles/` 等

2. **路径别名**
   - 读取 `tsconfig.json paths`
   - 读取构建工具 alias

3. **目标项目工具链**
   - `tooling.linter`
   - `tooling.formatter`
   - `tooling.styleLinter`

> 这一阶段使用“目标项目真实配置”，以 preview 工程的最小配置作为参考信息。

### Step 3: 制定合并方案

根据分析结果，确定每个文件的目标位置：

| 框架 | 组件扩展名 | 入口文件（跳过合并） |
|------|-----------|-------------------|
| vue3 | `.vue` | `App.vue`, `main.ts` |
| react | `.tsx` / `.jsx` | `App.tsx`, `main.tsx` |

**文件分类规则**：
- 通用展示组件 → `src/components/`
- 业务组件 → `src/components/business/`（如目录存在）
- 页面级组件 → `src/views/` 或 `src/pages/`
- 全局样式 → `src/assets/styles/` 或 `src/styles/`
- 图片资源 → `src/assets/images/` 或项目既有资源目录

**自合并保护**：
- 当目标目录为 CWD 时，跳过 preview 入口文件
- 只合并组件文件、样式文件和静态资源

### Step 4: 执行合并

对每个文件执行以下操作：

1. **适配导入路径**
   - 根据目标项目 alias 更新 import
   - 更新组件间相对路径

2. **适配设计 token**
   - 读取 `generate` 阶段记录的 `tokenHints` 和 preview raw value
   - 结合目标目录已有样式、`design-system.json`、`project-adapter.json` 和业务组件上下文，生成最终 `resolvedTokens`
   - 只在候选目标具备可靠证据时，将 raw value 转换为项目 token、业务变量、mixin、CSS Modules 或 Tailwind utility
   - 可靠证据包括 token 当前值与 `rawValue` 一致、名称与语义一致、明确人工规则，或目标组件上下文已证明该 token 不会破坏视觉还原
   - 对每个 `resolvedTokens` 记录 `source`、`currentValue`、`matchType`、`confidence`、`status` 和必要的 `fallbackReason`
   - 无可靠项目表达或 token 当前值会改变视觉结果时保留 raw value，并在合并报告中说明原因

3. **复制文件**
   - 创建目标子目录
   - 写入适配后的版本
   - 同名文件冲突时提示用户确认

4. **复制资源**
   - 图片、图标等从 `.d2c/assets/` 复制到目标资源目录
   - 更新代码中的资源引用路径

5. **适配开源组件库**
   - 读取 `generate` 阶段的 `componentMappings`、`styleFit` 和目标项目 `component-library.json`
   - 对 Ant Design、Ant Design Vue、Element Plus 等组件，优先保留目标项目已安装版本和既有 import 风格
   - 若目标项目已有主题变量、ConfigProvider、插件注册或全局样式入口，按项目约定接入，不新增平行主题入口
   - 局部覆盖必须落在目标组件同目录样式、CSS Modules、scoped style 或项目既有 override 文件中
   - 报告 `openSourceComponentMerges`：`nodeId`、`component`、`importFrom`、`importName`、`themeBindings`、`styleOverrides`、`styleFitScore`、`decision`、`evidence`
   - 当目标项目未安装该库、版本不兼容或 styleFit 低于可接受阈值时，使用 native / preview fallback，并记录 `fallbackReason`

6. **适配业务组件库**
   - 读取 `component-library.json` 中的业务组件 `importPath`、`propsContract`、`styleContract`、`overridePolicy` 和示例用法
   - 只在 props、事件、插槽、数据结构能从 `componentMappings` 或目标上下文可靠映射时替换为业务组件
   - 对需要业务数据源的字段，生成 adapter 层或 TODO 占位，不伪造真实接口返回
   - 报告 `businessComponentMerges`：`nodeId`、`component`、`importPath`、`propsMapping`、`contractEvidence`、`dataBindingStatus`、`overridePolicy`、`decision`、`fallbackReason`
   - 业务组件替换后必须把替换证据写入 merge report，供 target validate / verify 追踪

7. **适配图标与 iconfont**
   - 读取 `generate` 阶段的 `iconMappings` 和 `.d2c/assets/*-assets.json`
   - 优先使用目标项目已有图标组件、iconfont class 前缀或全局 iconfont 样式入口
   - iconfont class 只能来自项目配置、已有代码、`component-library.json` 或明确人工规则，不得根据图标语义凭空编造
   - 如果目标项目没有可靠 iconfont 或组件映射，保留 SVG / image fallback，并迁移资源到目标资产目录
   - 报告 `iconMerges`：`nodeId`、`strategy`、`component`、`importFrom`、`className`、`assetPath`、`targetAssetPath`、`decision`、`evidence`、`fallbackReason`

8. **适配图表库**
   - 读取 `generate` 阶段的 `chartMappings`、目标项目依赖和 `project-adapter.json`
   - 优先接入目标项目已有图表封装，例如 `ReactECharts`、`VueECharts`、业务 ChartCard 或项目图表 adapter
   - preview 阶段的示例数据只能作为静态结构占位；默认禁止生成 API、store、query hook 或 proxy 修改
   - `requiresChartContractAssessment=true` 时，先记录候选组件与公开 props 匹配结果；折线/柱图可以选择覆盖 `chartType`、`dateList`、`dataSource`、`legendList`、`option`、`seriesList` 的业务 wrapper，donut 契约缺失时回退本地 wrapper
   - 报告 `chartMerges`：`nodeId`、`chartType`、`requiresChartContractAssessment`、`candidateComponents`、`matchedContract`、`missingContract`、`selectedComponent`、`libraryVersion`、`library`、`component`、`importFrom`、`optionPath`、`dataAdapter`、`dataBindingStatus`、`containerStyle`、`decision`、`fallbackReason`
   - 目标项目没有可靠图表库或数据契约时，保留静态 preview chart / placeholder，并记录后续人工接入点

9. **处理合并冲突**
   - 所有同名文件、路径别名、import 命名、样式选择器、资源文件名、token 表达和组件 props 冲突都必须进入 `conflictResolutions`
   - 默认策略为保留目标项目已有代码，新增 D2C 文件使用后缀、子目录、局部 class、alias 或 adapter 隔离
   - 只有用户明确确认或目标文件由当前 D2C run 生成时，才允许覆盖
   - 每条冲突记录包含 `type`、`source`、`target`、`affectedFiles`、`strategy`、`decision`、`status`、`reason`

### Step 5: 路由建议（如适用）

根据框架和路由库生成建议，路由文件由用户确认后更新：

- Vue Router：建议 route config
- React Router：建议 `<Route />`

### Step 6: 运行目标项目的工具链

根据 `project-config.json.tooling` 决定执行合入整理命令。此步骤用于格式化和自动修复，完整类型检查、构建检查和视觉复核由主流程在 merge 后调用 `d2c-validate phase=target` 与 `d2c-verify phase=target` 执行。

1. **Formatter**
   - 若 `formatter.name = none` 或命令为空：跳过
   - 否则执行目标项目实际 formatter

2. **Linter / Lint Fix**
   - 若 `linter.name = none` 或命令为空：跳过
   - 否则执行目标项目的 lint fix 命令，或等价的 `npx <tool> --fix`

3. **Style Linter**
   - 仅在目标项目已配置时执行

> 命令来源应以目标项目检测结果为准。

### Step 7: 输出合并报告

写入：

```text
.d2c/docs/merge-reports/<designId>/<runId>.md
.d2c/docs/merge-reports/<designId>/<runId>.json
```

并将路径和状态写回 `manifest.json`。

同时写回 target 阶段所需信息：
- 合入文件清单
- 目标页面入口或候选访问路径
- `resolvedTokens`
- `openSourceComponentMerges`
- 业务组件替换记录
- `iconMerges`
- `chartMerges`
- `conflictResolutions`
- 后续 target validate / verify 的建议命令和 URL

JSON 报告是机器校验源，Markdown 报告是人工审阅镜像。完成 merge 后运行：

```bash
node scripts/check-merge-report.mjs .d2c/docs/merge-reports/<designId>/<runId>.json
```

## 文档模板

```markdown
# 合并报告：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **目标目录**：<target-directory or CWD>
- **技术栈**：<framework> + <language> + <cssStrategy>
- **自合并保护**：<是/否>

## 目标项目分析
- **组件目录**：<...>
- **页面目录**：<...>
- **样式目录**：<...>
- **路径别名**：<...>
- **工具链**：<formatter / linter / styleLinter>

## 合并方案
| 源文件 | 目标路径 | 操作 |
|--------|----------|------|

## 适配记录
### 导入路径适配
| 原路径 | 适配后路径 |
|--------|------------|

### Token 解析
| 节点 | 属性 | Raw 值 | 采用表达 | 当前值 | 匹配方式 | 置信度 | 状态 | 说明 |
|------|------|--------|----------|--------|----------|--------|------|------|

### Token 最终适配
| Raw 值 | 候选语义 | 目标表达 | 使用位置 | 决策 |
|--------|----------|----------|----------|------|

### 开源组件库适配
| 节点 | 组件 | import | 主题绑定 | 覆盖文件 | 决策 |
|------|------|--------|----------|----------|------|

### 业务组件适配
| 节点 | 组件 | import | Props 映射 | 数据绑定 | 决策 |
|------|------|--------|------------|----------|------|

### 图标与 iconfont 适配
| 节点 | 策略 | 组件 / class / 资源 | 目标路径 | 决策 |
|------|------|----------------------|----------|------|

### 图表库适配
| 节点 | 类型 | 图表库 | 组件 | Option | 数据适配 | 决策 |
|------|------|--------|------|--------|----------|------|

### 冲突处理
| 类型 | 源 | 目标 | 策略 | 状态 | 说明 |
|------|----|------|------|------|------|

### 工具链执行结果
- **Formatter**：<执行/跳过> — <结果>
- **Linter**：<执行/跳过> — <结果>
- **Style Linter**：<执行/跳过> — <结果>

### Target 校验交接
- **建议 type-check 命令**：<command>
- **建议 build 命令**：<command>
- **建议启动命令**：<command>
- **建议验证地址**：<targetUrl or 待人工确认>
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 目标目录不存在 | 提示用户检查路径 |
| 同名文件已存在 | 提示用户确认是否覆盖 |
| 路径别名未知 | 使用相对路径，并记录 TODO |
| format / lint 失败 | 报告错误，保留已合并文件 |
| 无写入权限 | 提示权限问题 |
| 自合并时入口文件 | 自动跳过，不覆盖业务项目入口 |
| 组件库未安装或版本不兼容 | 回退到 native / preview 实现，记录 `fallbackReason` |
| 业务组件 props 无法可靠映射 | 保留生成组件或 adapter 占位，记录缺失契约 |
| iconfont class 无证据 | 保留 SVG / image fallback，不编造 class |
| 图表数据契约缺失 | 保留 preview option 或 placeholder，记录 `dataBindingStatus` |
| 文件 / 样式 / token 冲突 | 记录 `conflictResolutions`，默认隔离而非覆盖 |
