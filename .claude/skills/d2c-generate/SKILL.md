---
name: d2c-generate
description: Generate Vue 3 or React preview code from a normalized D2C design artifact. Uses raw design values for visual restoration, records token hints, and computes component mappings and style fit.
---

# D2C Generate - 代码生成

## 输入

- `.d2c/docs/design-specs/<designId>/<runId>-normalized.json`
- `.d2c/context/project-config.json`
- `.d2c/context/design-system.json`
- `.d2c/context/component-library.json`
- 偏差报告（迭代时由 `d2c-verify` 产出，可选）

## 输入原则

- `normalized-design.json` 是主输入。
- `tokenCandidates` 与 `uiPatternCandidates` 来自 `d2c-extract`。
- `tokenHints`、`componentMappings`、`styleFit` 在本阶段产生。
- 预览样式默认使用 Figma raw value，保证视觉还原不依赖目标项目 token 是否可用。
- 最终项目 token 投影由 `d2c-merge` 完成。
- 阶段交接依靠文件工件和 manifest。

维护字段协议和示例时，读取 `../d2c/references/artifact-boundary-and-style-fit.md`。

## 流程

### Step 1: 加载项目上下文

优先读取以下 JSON 文件；缺失时回退到对应 Markdown：

- `.d2c/context/project-config.json`
- `.d2c/context/design-system.json`
- `.d2c/context/component-library.json`
- `.d2c/context/project-adapter.json`

读取重点：

- `framework`: `vue3` 或 `react`
- `language`: `typescript` 或 `javascript`
- `cssStrategy`: `scoped`、`css-modules`、`tailwind`、`styled-components`、`sass`、`less`
- `paths.aliasMap`
- `design-system.tokenResolutionRules`
- `design-system.tokens`
- `design-system.rules.outputStrategyByCss`
- `project-adapter.tokenSources`
- `component-library.components`
- `component-library.matchingRules`
- `component-library.components[].styleContract`
- `component-library.components[].overridePolicy`

context 缺失时使用默认值：

- 默认框架：Vue 3
- 默认语言：TypeScript
- 默认 CSS 方案：Scoped CSS
- 默认组件库：原生元素

### Step 2: 读取标准化设计工件

从 `normalized-design.json` 读取：

- `componentTree`
- `components[].requiredStyle`
- `tokenCandidates`
- `uiPatternCandidates`
- `iconCandidates`
- `chartCandidates`
- `responsiveFrames`
- `interactionStates`
- `assets`
- `source.provider`
- `source.mode`
- `source.providerAttempts`
- `fieldSources`

职责边界：

- `extract` 负责设计事实和候选识别。
- `generate` 负责 preview 视觉还原、token 候选提示、组件选择、样式适配评分和代码表达。
- `merge` 负责目标项目 token、业务组件、编码规范和工具链适配。

如果 `source.provider` 是 `figma-image-fallback` 或 `manual-input`，或 `source.mode` 是 `image-fallback` / `manual`：

- generate 可以继续执行，但必须把该模式和降级原因写入 generation log。
- preview 样式仍以 `requiredStyle` 的 raw value 为主，但所有来自 `image-vision-estimate` 的字段都应被视为近似值。
- 不得把图像估算字段描述成 Figma 精确值。
- 不得基于图像 fallback 推断 Figma auto layout、组件实例、variants、constraints 等结构化事实。
- 组件映射的 `styleFit` 应把字段来源纳入判断：关键 required style 低置信度时，降低 styleFit 或回退原生结构。

### Step 3: 生成 token 候选提示

用 `design-system.json` 和 `project-adapter.json` 将 `tokenCandidates` 转换成 `tokenHints`。`tokenHints` 只作为后续 merge 的适配依据，preview 代码继续使用 `rawValue`。generate 阶段只能产出候选解析，不能把项目 token 当成确定映射：

```json
{
  "nodeId": "<node-id>",
  "property": "backgroundColor",
  "rawValue": "#1677ff",
  "previewValue": "#1677ff",
  "semanticCandidates": [
    {
      "semantic": "color-primary",
      "target": "@primary-color",
      "strategy": "less-token",
      "source": "theme variables",
      "currentValue": "#1677ff",
      "matchType": "value-and-name",
      "confidence": 0.93,
      "status": "candidate",
      "evidence": ["token name matches primary", "current value equals rawValue"]
    }
  ],
  "status": "candidate"
}
```

提示规则：

- preview 样式以 `rawValue` 为默认输出，颜色、间距、圆角、字号等基础属性不强制投影到项目 token。
- 语义候选与 `tokenResolutionRules` 匹配时写入 `semanticCandidates[].target`、`source`、`currentValue`、`matchType`、`confidence` 和 `evidence`，供 `d2c-merge` 选择。
- `matchType` 可使用 `value-and-name`、`value-only`、`name-only`、`near-value`、`manual`；只有值和语义均可靠时才给出高置信度。
- generate 阶段默认将候选标记为 `candidate`；`confirmed`、`resolved` 只能由 `d2c-merge` 在目标上下文中写入。
- 映射缺失或证据不足时保留候选和原因，将 `status` 标记为 `raw-only` 或 `pending-project-adapter`，并写入生成日志。
- 业务组件私有 token、状态色、图表色板、模块局部变量等需要目标目录上下文的信息，统一标记为 `pending-project-adapter`。
- 如果项目 token 的 `currentValue` 与 Figma `rawValue` 不一致，除非存在明确人工规则，否则保持 `candidate` 并记录差异，不得影响 preview 输出。

### Step 4: 选择组件并计算 styleFit

用 `uiPatternCandidates` 和 `component-library.json` 生成 `componentMappings`。每个候选模式必须计算 `styleFit`：

```json
{
  "nodeId": "<node-id>",
  "component": "Button",
  "importFrom": "antd",
  "props": {
    "type": "primary",
    "size": "middle"
  },
  "styleFit": {
    "score": 0.91,
    "covered": ["height", "backgroundColor", "fontSize", "padding"],
    "needsOverride": ["borderRadius"],
    "decision": "use-component-with-class"
  }
}
```

`styleFit` 计算输入：

- `components[].requiredStyle`
- `fieldSources`
- `uiPatternCandidates[].confidence`
- `uiPatternCandidates[].role`
- `uiPatternCandidates[].pattern`
- `component-library.components[].styleContract`
- `component-library.components[].overridePolicy`
- `tokenHints`

判定规则：

- `styleFit.score >= 0.85`：使用组件，添加少量 class 修正。
- `0.65 <= styleFit.score < 0.85`：使用组件，添加局部样式覆盖，并记录覆盖项。
- `styleFit.score < 0.65`：生成原生结构或新组件。
- 当 `source.mode` 是 `image-fallback` / `manual` 且关键字段来自 `image-vision-estimate` 或 `manual-input` 时，除非 UI 模式非常明确，不建议给出高于 `0.9` 的 `styleFit.score`。

组件库生成规则：

- 开源组件库生成：当 `component-library.componentLibrary` 或 `project-config.componentLibrary` 指向 `antd`、`ant-design-vue`、`element-plus` 等已知库时，优先使用 `component-library.components[]` 的 `importFrom`、`propsByRole`、`styleContract` 和 `overridePolicy` 生成组件导入、props 和局部覆盖。
- 业务组件库生成：当 `component-library.components[]` 包含业务组件时，仅在 `matchRoles`、`propsMapping`、`styleContract`、`dataContract` 和 `overridePolicy` 证据足够时使用；否则生成原生结构并在 `componentMappings[].fallbackReason` 中记录缺口。
- 所有组件映射必须记录 `source`：`open-source-library`、`business-library`、`native` 或 `generated-component`。
- 不允许在 generate 阶段猜测目标业务数据接口；业务数据字段缺失时使用静态 preview data，并把 `dataContract.status` 写为 `preview-only` 或 `pending-merge-adapter`。
- 组件样式覆盖必须服从 `overridePolicy`：禁止 `style` 覆盖时只能使用 class、token override 或回退原生结构。

开源组件库映射示例：

```json
{
  "nodeId": "12:34",
  "source": "open-source-library",
  "component": "Button",
  "importFrom": "antd",
  "props": {
    "type": "primary",
    "size": "middle"
  },
  "styleFit": {
    "score": 0.91,
    "covered": ["height", "backgroundColor", "fontSize", "padding"],
    "needsOverride": ["borderRadius"],
    "decision": "use-component-with-class"
  },
  "evidence": ["role=button", "component-library Button matchRoles includes primary-action"]
}
```

业务组件库映射示例：

```json
{
  "nodeId": "24:10",
  "source": "business-library",
  "component": "MetricCard",
  "importFrom": "@/components/MetricCard",
  "props": {
    "title": "成交金额",
    "value": "128.6万"
  },
  "dataContract": {
    "status": "preview-only",
    "requiredFields": ["title", "value", "trend"]
  },
  "styleFit": {
    "score": 0.82,
    "covered": ["title", "value", "layout"],
    "needsOverride": ["gap", "captionColor"],
    "decision": "use-component-with-overrides"
  },
  "evidence": ["business component matchRoles includes metric-card"]
}
```

### Step 5: 生成 icon / iconfont / SVG fallback

用 `iconCandidates` 生成 `iconMappings`，并把图标表达写入组件代码和生成日志。

决策顺序：

1. 如果候选来自组件实例，且 `component-library.components[]` 或 `iconSets[]` 中有匹配图标组件，生成组件库 Icon 导入。
2. 如果候选 `kind` 是 `iconfont-text`，且 `component-library.iconfont` 或 `project-adapter` 给出 class 规则，生成 iconfont class。
3. 如果存在 `assetRef` 或可下载 SVG/vector 资源，生成 SVG fallback 或 `<img>` 引用。
4. 证据不足时生成占位 SVG，并在 `fallbackReason` 里记录需要补充的图标名或资源。

输出字段：

```json
{
  "iconMappings": [
    {
      "nodeId": "12:35",
      "source": "component-library-icon",
      "name": "SearchOutlined",
      "importFrom": "@ant-design/icons",
      "renderAs": "component",
      "props": {
        "aria-hidden": true
      },
      "fallback": null,
      "confidence": 0.86,
      "evidence": ["iconCandidates nameCandidates includes search", "antd icon set available"]
    }
  ]
}
```

生成规则：

- 图标尺寸、颜色、对齐优先取 `iconCandidates.size`、`colors` 和所在节点 `requiredStyle`。
- 不把图标语义硬编码为业务含义；只使用节点名称、候选名和组件库证据。
- iconfont class 只在上下文明确提供前缀、字体文件或 class 命名规则时生成。
- SVG fallback 必须引用 `.d2c/assets/` 或 preview 内联安全 SVG；不得伪造不存在的资产路径。

### Step 6: 生成图表代码

用 `chartCandidates` 生成 `chartMappings`，并选择图表组件、option/config 和容器样式。

决策顺序：

1. 优先匹配 `component-library.components[]` 中 `matchRoles` 包含 `chart`、`line-chart`、`bar-chart` 等角色的业务或开源图表组件。
2. 如果项目上下文提供图表库候选，如 `echarts`、`recharts`、`ant-design-charts`，生成对应 preview config。
3. 如果没有图表库上下文，生成语义化 HTML/SVG fallback，并在 `fallbackReason` 中记录 `missing-chart-library`。

输出字段：

```json
{
  "chartMappings": [
    {
      "nodeIds": ["20:10"],
      "chartType": "line",
      "source": "open-source-library",
      "component": "ReactECharts",
      "importFrom": "echarts-for-react",
      "option": {
        "xAxis": {
          "type": "category",
          "data": ["Q1", "Q2", "Q3"]
        },
        "yAxis": {
          "type": "value"
        },
        "series": [
          {
            "type": "line",
            "data": [120, 180, 160]
          }
        ]
      },
      "containerStyle": {
        "width": 480,
        "height": 260
      },
      "confidence": 0.78,
      "evidence": ["chartCandidates chartType=line", "legend and axis labels found"]
    }
  ]
}
```

生成规则：

- `chartMappings[].requiresChartContractAssessment=true` 时必须同时记录 `candidateComponents`、`matchedContract`、`missingContract`、`selectedComponent`、`libraryVersion`、`optionPath`、`dataAdapter`、`dataBindingStatus`、`containerStyle`、`decision` 和 `fallbackReason`。
- 折线图与柱状图可以选择公开 props 已覆盖 `chartType`、`dateList`、`dataSource`、`legendList`、`option` 和 `seriesList` 的业务 wrapper。
- donut 等 wrapper 未覆盖的类型必须记录缺失契约，并回退到项目内已有本地图表 wrapper。
- 图表容器宽高、标题、图例、坐标轴样式优先取 Figma raw value。
- 图像 fallback 或低置信度数据只能生成示意 data，并把 `dataStatus` 标为 `estimated-preview-data`。
- preview 测试数据保持静态；不在 generate 阶段生成 API、store、hook 或 proxy 修改。真实数据接入由 merge 或人工完成。

### Step 7: 生成响应式代码

用 `responsiveFrames` 生成 `responsiveRules`，并输出 media/container rules，确保 desktop 基线不被破坏。

输出字段：

```json
{
  "responsiveRules": [
    {
      "frameNodeId": "30:1",
      "breakpoint": "desktop",
      "matchedFrameIds": ["30:2", "30:3"],
      "strategy": "media-query",
      "selector": ".pricingGrid",
      "rules": [
        {
          "media": "(max-width: 768px)",
          "declarations": {
            "grid-template-columns": "1fr",
            "gap": "16px"
          }
        }
      ],
      "confidence": 0.8,
      "evidence": ["desktop/mobile frames share contentSignature"]
    }
  ]
}
```

生成规则：

- 默认先生成 desktop raw-value 样式，再追加响应式覆盖。
- 当 `responsiveFrames` 置信度不足或只有单一 frame 时，不生成强响应式关系，只保留 fluid constraints，例如 `max-width`、`min-width`、`flex-wrap`。
- 响应式规则必须局部作用于 preview 组件选择器，不改全局 reset。
- `image-fallback` / `manual` 模式下不得声称已还原多断点关系，除非 normalized artifact 中已经有明确多 frame 证据。

### Step 8: 生成 variants / state 代码

用 `interactionStates` 生成 `stateMappings`，并映射为 props、class 或本地 state。

决策顺序：

1. 组件库已有状态 props 时使用 props，例如 `disabled`、`loading`、`open`、`selected`。
2. 视觉状态只影响 hover/focus/active 时，生成 CSS pseudo-class 或 state class。
3. 需要点击切换或展开收起时，生成最小本地 state，仅用于 preview 展示。
4. 证据不足时只生成默认态，并在 `fallbackReason` 中记录 `missing-interaction-state-evidence`。

输出字段：

```json
{
  "stateMappings": [
    {
      "nodeIds": ["40:2"],
      "control": "Button",
      "state": "hover",
      "strategy": "css-pseudo-class",
      "target": ".submitButton:hover",
      "props": {},
      "className": "submitButton",
      "differences": ["backgroundColor", "borderColor"],
      "confidence": 0.9,
      "evidence": ["variant property state=hover"]
    }
  ]
}
```

生成规则：

- 默认态必须完整可用；状态代码不能破坏默认截图对齐。
- 状态差异来源于 `interactionStates[].differences`，只生成有证据的属性。
- 本地 state 只服务 preview 交互，不推断目标项目业务状态管理。

### Step 9: 组件分解策略

根据 `componentTree` 确定组件拆分方案：

- 每个独立 UI 区域作为一个组件
- 可复用 UI 模式提取为独立组件
- 列表项提取为独立组件
- 设计中超过 5 个独立区域时拆分为子组件

命名规则：

- 组件名使用 PascalCase
- 文件名与组件名一致
- 使用有语义的名称

### Step 10: 按框架生成组件

| 框架 | 组件文件 | 入口文件 |
| --- | --- | --- |
| vue3 | `.vue` | `App.vue` |
| react | `.tsx` / `.jsx` | `App.tsx` / `App.jsx` |

生成要求：

- 优先使用 `componentMappings` 中选定的业务组件或 UI 组件
- 使用 `iconMappings`、`chartMappings`、`responsiveRules`、`stateMappings` 作为生成代码的辅助决策
- 使用语义化 HTML
- 使用类名表达样式
- 导入路径遵循 `project-config.json.paths.aliasMap`
- 迭代修复时只改偏差相关代码

### Step 11: 输出 preview 样式

| `cssStrategy` | 输出策略 |
| --- | --- |
| `less` | 样式文件可使用 `.less`，属性值默认使用 raw value |
| `sass` | 输出 `.scss` / `.sass`，属性值默认使用 raw value |
| `css-modules` | React 组件生成 `*.module.css` / `*.module.scss` |
| `scoped` | Vue 单文件组件生成 scoped style |
| `tailwind` | 可以使用确定无歧义的 utility class；未覆盖项写入 raw value 局部样式 |
| `styled-components` | React 生成 CSS-in-JS 片段 |

样式输出规则：

- 以 `requiredStyle` 和 `tokenCandidates[].rawValue` 为首选表达，保证 preview 与设计稿一致。
- `tokenHints` 写入生成日志和 manifest 关联工件，不作为 preview 样式的强依赖。
- `responsiveRules` 只能追加局部响应式覆盖，不改写 desktop 基线 raw value。
- `stateMappings` 对应的 hover/focus/active/disabled 等状态样式必须与默认态分层，避免影响默认截图。
- 全局 token、业务变量、mixin、CSS Modules 命名等目标项目表达留给 `d2c-merge`。
- 全局样式文件扩展名与 `cssStrategy` 对齐。

### Step 12: 写入预览工程

将生成的文件写入 `.d2c/preview/src/`：

- 组件文件：`.d2c/preview/src/components/<ComponentName>.<ext>`
- 更新入口组件：`App.vue` / `App.tsx`
- 全局样式：根据 `cssStrategy` 选择 `.css` / `.less` / `.scss`
- 静态资源：使用 `.d2c/assets/` 中已下载的资源

### Step 13: 写入生成决策工件

除 Markdown 生成日志外，建议同步写入机器可校验的 JSON 决策工件：

```text
.d2c/docs/generation-logs/<designId>/<runId>-decisions.json
```

最低字段：

```json
{
  "designId": "<designId>",
  "runId": "<runId>",
  "source": {
    "provider": "framelink-context-mcp",
    "mode": "structured-context"
  },
  "tokenHints": [],
  "componentMappings": [],
  "iconMappings": [],
  "chartMappings": [],
  "responsiveRules": [],
  "stateMappings": [],
  "generatedFiles": []
}
```

校验命令：

```bash
node scripts/check-generate-decisions.mjs .d2c/docs/generation-logs/<designId>/<runId>-decisions.json
```

### Step 14: 迭代修改

输入包含偏差报告时：

1. 读取偏差报告文件路径或内容摘要
2. 定位需要修改的组件文件
3. 修改与偏差相关的布局、排版、颜色、资源引用
4. 更新生成日志中的迭代记录

## 文档记录

每次执行完成后，将生成过程记录到：

```text
.d2c/docs/generation-logs/<designId>/<runId>.md
```

建议内容模板：

```markdown
# 代码生成记录：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **设计规格来源**：`<normalized-design.json path>`
- **Provider**：<figma-official-mcp / framelink-context-mcp / figma-rest / figma-image-fallback / manual-input>
- **提取模式**：<structured / structured-context / structured-raw / image-fallback / manual>
- **Provider 尝试记录**：<各 provider 成功/失败摘要>
- **降级说明**：<image-fallback/manual 时记录字段估算来源、置信度和需重跑事项>
- **技术栈**：<framework> + <language> + <cssStrategy>

## 组件分解方案
| 组件名 | 职责 | 文件路径 | 子组件 |
|--------|------|----------|--------|

## Token 候选提示
| 节点 | 属性 | Raw 值 | 候选语义 / 目标表达 | 匹配方式 | 置信度 | Preview 表达 | 状态 |
|------|------|--------|----------------------|----------|--------|--------------|------|

## 组件映射与 styleFit
| 设计区域 | 复用组件 | styleFit | 覆盖项 | 决策 |
|----------|----------|----------|--------|------|

## 图标生成决策
| 节点 | 表达方式 | 名称 / class / 资源 | importFrom | fallback | 置信度 |
|------|----------|---------------------|------------|----------|--------|

## 图表生成决策
| 节点 | 图表类型 | 组件 | option/config 状态 | 容器样式 | 置信度 |
|------|----------|------|--------------------|----------|--------|

## 响应式规则
| Frame | Breakpoint | 策略 | Selector | 规则摘要 | 置信度 |
|-------|------------|------|----------|----------|--------|

## 状态映射
| 节点 | 控件 | 状态 | 策略 | props/class/state | 差异 |
|------|------|------|------|-------------------|------|

## Preview 生成文件清单
| 文件路径 | 类型 | 状态 |
|----------|------|------|

## 迭代修改记录
### Iteration N
- **偏差来源**：`<verification report path>`
- **修改项**：
  1. <文件名> - <修改内容描述>
```

## 错误处理

- `normalized-design.json` 缺失：提示先运行 `/d2c-extract`
- context 缺失：使用默认值，并提示运行 `/d2c-init`
- token 映射缺失：使用原始值并记录 TODO
- 组件库候选缺失：生成原生结构或新组件
- 样式策略与模板冲突：服从 `project-config.json.cssStrategy`

## 编码规范参考

代码生成应遵循 `.claude/rules/coding-conventions.md` 中对应框架的编码规范。
