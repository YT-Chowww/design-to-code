---
name: d2c-extract
description: Extract framework-neutral design facts from a Figma URL and persist raw data, assets, and normalized candidate artifacts for downstream code generation. Requires a Figma URL, runId, and designId.
---

# D2C Extract - Figma 设计信息提取

## 输入

- `figma-url`
- `runId`（由 `d2c` 主编排器生成）
- `designId`（由 `d2c` 主编排器生成）

## 输出

本 skill 必须产出以下文件，并把路径回写到 `.d2c/docs/sessions/<runId>/manifest.json`：

- `.d2c/docs/reference/<designId>/<runId>-figma-raw.json`
- `.d2c/docs/reference/<designId>/<runId>-assets.json`
- `.d2c/docs/design-specs/<designId>/<runId>-normalized.json`
- `.d2c/docs/design-specs/<designId>/<runId>-design-spec.md`

维护字段协议和示例时，读取 `../d2c/references/artifact-boundary-and-style-fit.md`。

## Provider 分层与提取模式

D2C Extract 使用多层 provider，而不是绑定某一个 MCP。所有 provider 的输出都必须收敛到同一组工件：raw、assets、normalized、design spec。

Provider 优先级：

1. `figma-official-mcp`
   - Figma 官方 MCP / Dev Mode MCP。
   - 优先获取 Dev Mode 语义、变量、组件、Code Connect / design context。
   - 成功时 `source.mode` 通常为 `structured`。

2. `framelink-context-mcp`
   - GLips/Figma-Context-MCP / Framelink / `figma-developer-mcp` 这类 coding-agent-oriented provider。
   - 优先获取精简后的 layout、style、text、component context。
   - 成功时 `source.mode` 通常为 `structured-context`。

3. `figma-rest`
   - Figma REST nodes/images API。
   - 优先获取原始 node JSON、图片导出 URL、assets。
   - 成功时 `source.mode` 通常为 `structured-raw`。

4. `figma-image-fallback`
   - Figma image export 成功，但所有结构化 provider 失败。
   - 使用导出 PNG + 模型视觉理解生成降级标准化工件。
   - 成功时 `source.mode` 必须为 `image-fallback`，`manifest.status.extract` 必须为 `DEGRADED`。

5. `manual-input`
   - 用户提供截图和文字描述。
   - 成功时 `source.mode` 必须为 `manual`，`manifest.status.extract` 必须为 `DEGRADED`。

`source.provider` 记录实际采用的 provider，`source.providerAttempts` 记录每一层尝试结果。`source.mode` 记录最终输入形态：

- `structured`：官方 MCP 或同等结构化设计上下文。
- `structured-context`：面向 coding agent 的精简上下文。
- `structured-raw`：REST node 原始结构。
- `image-fallback`：图片降级。
- `manual`：人工输入。

降级模式不是正常通过。使用 `figma-image-fallback` 或 `manual-input` provider 时：

- `manifest.status.extract` 必须写为 `DEGRADED`，不能写 `OK`。
- `raw figma` 文件必须保留失败原因、可用输入、人工/视觉观察结果和字段来源。
- `normalized.json` 中所有由图像估算的尺寸、字号、间距、颜色、图层关系都必须带来源和置信度。
- `design-spec.md` 必须显式标注降级模式，以及哪些字段不是来自 Figma nodes API。
- 后续 `d2c-generate` 可以继续执行，但必须在 generation log 记录降级来源；`d2c-verify` 不能因为 generate/build 通过而推断视觉通过。

结构化 provider 可以互相补充，但必须有一个 `source.provider` 作为主 provider。补充数据写入 `source.auxiliaryProviders`，不得覆盖主 provider 的原始证据。

## 流程

### Step 1: Provider 探测与选择

按优先级尝试 provider，并把每次尝试写入 `providerAttempts`：

```json
[
  {
    "provider": "figma-official-mcp",
    "status": "FAILED",
    "reason": "MCP server unavailable"
  },
  {
    "provider": "framelink-context-mcp",
    "status": "FAILED",
    "reason": "tool unavailable"
  },
  {
    "provider": "figma-rest",
    "status": "PASSED",
    "mode": "structured-raw"
  }
]
```

选择规则：

- 第一个能提供有效结构化设计数据的 provider 作为主 provider。
- 如果官方 MCP 返回 Dev Mode context，但缺少图片/资源，可继续调用 REST image export 作为辅助 provider。
- 如果 Framelink context 返回 layout/style，但缺少 asset binary，可继续调用 REST image export 作为辅助 provider。
- 如果所有结构化 provider 失败，尝试 `figma-image-fallback`。
- 只有 image export 也失败，才要求用户手动提供截图和描述，进入 `manual-input`。

### Step 2: 获取并持久化原始设计数据

1. 调用选定 provider 的设计数据工具。
2. 获取 provider 原始响应。
3. 原样写入：

```text
.d2c/docs/reference/<designId>/<runId>-figma-raw.json
```

原始文件保存未经 D2C 二次解释的输入，便于后续分析、diff 和回放。

raw 文件必须记录 provider 元数据：

```json
{
  "source": {
    "provider": "figma-rest",
    "mode": "structured-raw",
    "figmaUrl": "<url>",
    "fileKey": "<file-key>",
    "nodeId": "<node-id>",
    "providerAttempts": [],
    "auxiliaryProviders": []
  },
  "raw": {}
}
```

如果所有结构化 provider 失败，按以下规则处理：

1. 记录失败响应或错误摘要，不得把错误 JSON 当作有效 raw figma。
2. 使用 Figma image export 导出目标 node PNG，优先 `scale=2`。
3. 下载 PNG 到 `.d2c/assets/<designId>_2x.png`。
4. 写入 `raw figma` 降级包装文件，保留：
   - `provider: "figma-image-fallback"`
   - `mode: "image-fallback"`
   - 原 Figma URL、file key、node id
   - nodes API 的失败状态和错误信息
   - image export 的下载结果、PNG 路径、导出 scale、PNG 像素尺寸
   - `manualObservation`：由模型视觉理解得到的文本、角色、布局和视觉样式摘要
5. 若 image export 也失败，才进入 `manual-input`，并在 raw 文件记录用户提供的截图路径和描述。

`figma-image-fallback` 的 raw 文件示例：

```json
{
  "source": {
    "provider": "figma-image-fallback",
    "mode": "image-fallback",
    "figmaUrl": "<url>",
    "fileKey": "<figma-file-key>",
    "nodeId": "<node-id>",
    "providerAttempts": [
      {
        "provider": "figma-official-mcp",
        "status": "FAILED",
        "reason": "unavailable"
      },
      {
        "provider": "framelink-context-mcp",
        "status": "FAILED",
        "reason": "unavailable"
      },
      {
        "provider": "figma-rest",
        "status": "FAILED",
        "reason": "Rate limit exceeded"
      }
    ]
  },
  "figmaApi": {
    "nodesEndpoint": {
      "status": 429,
      "error": "Rate limit exceeded"
    },
    "imageEndpoint": {
      "status": 200,
      "assetPath": ".d2c/assets/<designId>_2x.png",
      "exportScale": 2,
      "exportedImageWidth": 332,
      "exportedImageHeight": 64
    }
  },
  "manualObservation": {
    "model": "current-codex-vision",
    "frame": {
      "name": "<observed name>",
      "type": "<observed ui type>",
      "width": 166,
      "height": 32
    },
    "text": ["<visible text>"],
    "visual": {
      "backgroundColor": "#306EFF",
      "color": "#FFFFFF",
      "borderRadius": "4px"
    }
  }
}
```

### Step 3: 导出资源清单

识别需要导出的图片 / 图标：

- 调用 `download_figma_images` 下载资源到 `.d2c/assets/`
- 将下载结果、资源名称、用途、失败原因写入：

```text
.d2c/docs/reference/<designId>/<runId>-assets.json
```

### Step 4: 解析并标准化设计数据

从 raw figma 中提取跨框架设计事实：

1. **Component Tree**
   - 顶层 Frame
   - 组件边界与分组关系
   - 组件命名建议（PascalCase）

2. **Layout**
   - Flex / Grid / Auto Layout
   - 对齐方式
   - gap / padding / margin
   - 尺寸和约束

3. **Visual Styles**
   - 颜色
   - 字体
   - 圆角
   - 阴影
   - 透明度

4. **Required Style**
   - 每个可生成节点的必要视觉约束
   - 记录原始值、单位、来源节点
   - 示例字段：`width`、`height`、`backgroundColor`、`borderRadius`、`fontSize`、`fontWeight`、`paddingX`、`paddingY`

5. **Token Candidates**
   - Figma 原始值
   - 可能的语义 token
   - 置信度和证据
   - 只表达候选，目标项目表达由 `d2c-generate` 解析

6. **UI Pattern Candidates**
   - 通用 UI 角色或组合模式
   - 示例：`button`、`primary-action`、`form-field`、`table`、`card`、`tabs`、`modal`
   - 跨节点模式可用 `nodeIds` 表达
   - 置信度和证据
   - 具体组件、导入路径、props 和样式适配由 `d2c-generate` 解析

7. **Icon Candidates**
   - 识别可作为图标处理的 SVG/vector、component instance、文本 iconfont 占位和命名候选
   - 记录 `nodeId`、`kind`、`nameCandidates`、`assetRef` 或 `componentRef`、尺寸、颜色、置信度和证据
   - Extract 只记录图标事实和候选名称，不决定组件库 Icon、iconfont class 或 SVG fallback 的最终表达

8. **Chart Candidates**
   - 识别折线图、柱状图、环图、饼图、面积图、指标图等 chart pattern
   - 记录 `nodeIds`、`chartType`、`axes`、`series`、`legend`、`dataShape`、可视元素证据、置信度
   - Extract 只描述图表结构和数据形状，不生成 ECharts、Recharts 或目标项目图表配置

9. **Responsive Frames**
   - 识别同一设计在 desktop、tablet、mobile 等断点下的 frame 关联
   - 记录 `frameNodeId`、`breakpoint`、`width`、`height`、`contentSignature`、`matchedFrameIds`、匹配证据、置信度
   - 无法可靠确认内容一致性时只记录独立 frame，不强行建立响应式关系

10. **Interaction States**
    - 识别 Figma variants、component set、prototype state 或命名约定中的 default、hover、active、disabled、selected、open
    - 记录 `nodeIds`、`componentSetId`、`control`、`state`、`variantProperties`、状态差异、置信度和证据
    - Extract 不生成 props、class 或本地 state；状态表达由后续 `d2c-generate` 决定

Provider 标准化规则：

1. **统一输出**
   - 无论 provider 返回官方 MCP context、Framelink context、REST raw JSON、图片降级还是人工输入，都必须转成统一 normalized schema。
   - provider 原始响应只能保存在 raw 文件，不得让 `d2c-generate` 直接读取 provider 私有格式。

2. **证据优先级**
   - `figma-official-mcp` 的变量、组件、Dev Mode context 优先用于语义判断。
   - `framelink-context-mcp` 的 layout/style context 优先用于生成友好的结构判断。
   - `figma-rest` 的 node JSON 和 image export 优先用于可审计原始证据、尺寸和 assets。
   - `figma-image-fallback` 与 `manual-input` 只能作为降级证据。

3. **字段来源**
   - 每个关键字段必须能追溯到 provider：`figma-official-mcp`、`framelink-context-mcp`、`figma-rest-node`、`figma-rest-image`、`image-export-metadata`、`image-vision`、`image-vision-estimate`、`manual-input`。
   - 当多个 provider 给出同一字段且不一致时，不要静默覆盖；选择一个主值，并在 `fieldSources[].alternatives` 记录差异。

`figma-image-fallback` 额外标准化规则：

1. **尺寸折算**
   - 如果 PNG 由 Figma image export `scale=2` 得到，CSS 逻辑尺寸必须用 `exportedImageWidth / 2`、`exportedImageHeight / 2`。
   - 不得直接把 2x PNG 像素尺寸写入 CSS width/height。

2. **字段来源**
   - 来自 PNG 文件元数据或 image export 响应的字段：`source: "image-export-metadata"`，置信度通常不低于 `0.9`。
   - 来自模型视觉理解的文本、颜色、角色、层级：`source: "image-vision"` 或 `source: "image-vision-estimate"`。
   - 字号、间距、圆角等视觉估算字段：`source: "image-vision-estimate"`，置信度通常不高于 `0.8`，除非有像素测量证据。
   - 来自项目 design system / token context 的语义：只能写入 `tokenCandidates`，不得伪装为 Figma 原始值。

3. **图层树约束**
   - `componentTree` 只能表达可从图像中可靠判断的语义层级。
   - 不得伪造 Figma group/component instance/auto layout 信息。
   - 无法确认的布局约束必须省略，或写为低置信度估算。

4. **候选语义**
   - `uiPatternCandidates` 可以基于图像角色判断，例如 button、stat-card、form-field。
   - `confidence` 必须反映降级事实；仅凭图像判断的复杂业务组件一般不得高于 `0.85`。
   - `iconCandidates` 可以基于图像角色判断，但不能伪造 component instance 或 iconfont class。
   - `chartCandidates` 可以记录可见的图表类型和图例结构，但数据值、series key 和坐标轴刻度必须标注为估算或省略。
   - `responsiveFrames` 与 `interactionStates` 依赖结构化 Figma 关系；图片降级模式通常只能记录单帧观察，不得声称已识别 variants、prototype state 或跨断点 frame 关联。

5. **后续重跑**
   - 在 `normalized.meta` 或 `source` 中记录 `requiresStructuredExtractRerun: true`。
   - design spec 中必须提示：Figma nodes API 恢复后应重新运行 extract 并比对。

### Step 5: 产出标准化工件

将标准化结果写入：

```json
{
  "designId": "<designId>",
  "runId": "<runId>",
  "source": {
    "figmaUrl": "<url>",
    "rawPath": "<raw-figma.json path>",
    "assetsPath": "<assets.json path>",
    "provider": "figma-rest",
    "mode": "structured-raw",
    "providerAttempts": [],
    "auxiliaryProviders": [],
    "requiresStructuredExtractRerun": false
  },
  "meta": {
    "pageName": "<name>",
    "frameName": "<name>",
    "dimensions": {
      "width": 1440,
      "height": 900
    }
  },
  "componentTree": [],
  "components": [
    {
      "nodeId": "<node-id>",
      "name": "<ComponentName>",
      "role": "<semantic-role>",
      "layout": {},
      "requiredStyle": {},
      "children": []
    }
  ],
  "assets": [],
  "tokenCandidates": [],
  "fieldSources": [
    {
      "path": "components[0].requiredStyle.width",
      "source": "figma-rest-node",
      "confidence": 1,
      "evidence": ["absoluteBoundingBox.width"]
    }
  ],
  "uiPatternCandidates": [
    {
      "nodeIds": ["<node-id>"],
      "kind": "role",
      "role": "button",
      "pattern": "primary-action",
      "text": "<text>",
      "confidence": 0.86,
      "evidence": []
    }
  ],
  "iconCandidates": [
    {
      "nodeId": "<icon-node-id>",
      "kind": "svg",
      "nameCandidates": ["search", "magnifier"],
      "assetRef": "<asset-id-or-path>",
      "size": {
        "width": 16,
        "height": 16
      },
      "colors": ["#666666"],
      "confidence": 0.82,
      "evidence": ["vector node with icon-like bounds", "layer name contains Search"]
    }
  ],
  "chartCandidates": [
    {
      "nodeIds": ["<chart-root-node-id>"],
      "chartType": "line",
      "axes": {
        "x": "category",
        "y": "value"
      },
      "series": [
        {
          "name": "<series-name>",
          "shape": "polyline"
        }
      ],
      "legend": ["<legend-label>"],
      "dataShape": "category-value-series",
      "confidence": 0.78,
      "evidence": ["axis labels", "polyline marks", "legend swatches"]
    }
  ],
  "responsiveFrames": [
    {
      "frameNodeId": "<frame-node-id>",
      "breakpoint": "desktop",
      "width": 1440,
      "height": 900,
      "contentSignature": "<stable-content-hash-or-text-signature>",
      "matchedFrameIds": ["<tablet-frame-id>", "<mobile-frame-id>"],
      "confidence": 0.8,
      "evidence": ["shared text nodes", "same section names", "matching component instances"]
    }
  ],
  "interactionStates": [
    {
      "nodeIds": ["<variant-node-id>"],
      "componentSetId": "<component-set-id>",
      "control": "Button",
      "state": "hover",
      "variantProperties": {
        "state": "hover"
      },
      "differences": ["backgroundColor", "borderColor"],
      "confidence": 0.9,
      "evidence": ["variant property state=hover", "same component set"]
    }
  ]
}
```

`figma-image-fallback` 下的字段来源示例：

```json
{
  "source": {
    "provider": "figma-image-fallback",
    "mode": "image-fallback",
    "requiresStructuredExtractRerun": true
  },
  "fieldSources": [
    {
      "path": "meta.dimensions.width",
      "source": "image-export-metadata",
      "confidence": 0.95,
      "evidence": ["exportedImageWidth 332 / exportScale 2"]
    },
    {
      "path": "components[0].requiredStyle.fontSize",
      "source": "image-vision-estimate",
      "confidence": 0.7,
      "evidence": ["estimated from PNG text height"]
    }
  ]
}
```

目标路径：

```text
.d2c/docs/design-specs/<designId>/<runId>-normalized.json
```

`d2c-generate` 必须以这个文件为主输入，并读取 `.d2c/context/` 完成项目级解析。

### Step 6: 输出人工可读设计规格

根据 `normalized.json` 生成 Markdown 规格文档：

```markdown
# 设计规格：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **Figma URL**：<url>
- **Page/Frame**：<名称>
- **尺寸**：<宽 x 高>
- **Raw 数据**：`<raw-figma.json path>`
- **Provider**：<figma-official-mcp / framelink-context-mcp / figma-rest / figma-image-fallback / manual-input>
- **提取模式**：<structured / structured-context / structured-raw / image-fallback / manual>
- **Provider 尝试记录**：<各 provider 成功/失败摘要>
- **降级说明**：<仅在 image-fallback / manual 时填写，说明失败原因、可用输入和需重跑事项>

## 组件树
<标准化后的组件层级>

## 组件详情
<每个组件的 Role、Layout、Required Style、Children>

## Token 候选
| 节点 | 属性 | Figma 值 | 语义候选 | 置信度 |
|------|------|----------|----------|--------|

## 资源清单
| 文件名 | 用途 | 下载状态 |
|--------|------|----------|

## UI 模式候选
| 节点 | 类型 | 角色 | 模式 | 证据 | 置信度 |
|------|------|------|------|------|--------|

## 图标候选
| 节点 | 类型 | 命名候选 | 资源/组件引用 | 证据 | 置信度 |
|------|------|----------|----------------|------|--------|

## 图表候选
| 节点 | 图表类型 | 坐标轴 | 系列 | 图例 | 数据形状 | 置信度 |
|------|----------|--------|------|------|----------|--------|

## 响应式 Frame 候选
| Frame | 断点 | 尺寸 | 关联 Frame | 匹配证据 | 置信度 |
|-------|------|------|------------|----------|--------|

## 交互状态候选
| 节点 | 控件 | 状态 | Variant 属性 | 差异 | 证据 | 置信度 |
|------|------|------|--------------|------|------|--------|
```

目标路径：

```text
.d2c/docs/design-specs/<designId>/<runId>-design-spec.md
```

## 文档记录

额外建议在 `.d2c/docs/reference/<designId>/` 下写入一份简要摘要：

```markdown
# Figma 数据摘要：<设计稿名称>

- Raw 文件：`<path>`
- Assets 文件：`<path>`
- Top Frames：<N>
- Nodes：<N>
- Components：<N>
- Assets：<N>
```

raw json 和 normalized json 必须存在。

## 错误处理

- Figma URL 无效：提示用户检查 URL 格式
- MCP 连接失败：记录该 provider 失败，继续尝试下一层 provider
- Figma nodes API 限流 / 失败：记录 `figma-rest` 失败，继续尝试 image export；成功则使用 `figma-image-fallback`
- 设计数据为空：提示用户检查 node-id 参数
- 资源下载失败：记录到 assets manifest，继续标准化结构数据
- `figma-image-fallback` 中模型无法识别关键文本或结构：停止 generate，要求用户补充截图说明或等待 Figma nodes API 恢复
