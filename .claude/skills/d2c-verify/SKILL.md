---
name: d2c-verify
description: Visually verify preview or target-project code by comparing a browser screenshot against the original Figma design. Uses Chrome DevTools MCP to capture screenshots and reads design references from persisted D2C artifacts.
---

# D2C Verify — 视觉验证

## 输入
- `phase`：`preview` 或 `target`，默认为 `preview`
- `previewUrl` 或 `targetUrl`：待验证页面地址
- `targetDirectory`：`phase=target` 时用于定位合入文件和业务样式
- `.d2c/docs/sessions/<runId>/manifest.json`
- `.d2c/docs/design-specs/<designId>/<runId>-design-spec.md`
- `.d2c/docs/reference/<designId>/<runId>-figma-raw.json`
- `.d2c/docs/reference/<designId>/<runId>-assets.json`
- `.d2c/docs/generation-logs/<designId>/<runId>.md`（用于读取 `styleFit` 决策，可选）
- `.d2c/docs/merge-reports/<designId>/<runId>.md`（target 阶段用于读取 `resolvedTokens` 和合入路径）

## 流程

### Step 1: 检查 Chrome DevTools MCP 可用性

优先从目标项目根目录读取 `.mcp.json` 并定位 Chrome DevTools MCP server：

1. 解析 `mcpServers`，优先选择名称包含 `chrome`、`devtools`、`browser` 的 server
2. 使用其 `command`、`args` 和 `env` 拉起 stdio MCP
3. 发送 JSON-RPC `initialize`
4. 调用 `tools/list` 并记录可用工具
5. 按工具名识别 `navigate`、`resize`、`screenshot`、`evaluate`、`click` / `hover` 等能力

报告中必须记录 `mcpProbe`：

```json
{
  "configPath": ".mcp.json",
  "serverName": "chrome-devtools",
  "status": "AVAILABLE",
  "tools": ["navigate", "screenshot", "resize", "evaluate"],
  "missingTools": [],
  "fallbackManualUrl": "http://localhost:5173"
}
```

如果 `.mcp.json` 不存在、server 未配置、MCP 拉起失败或工具不完整：
- 输出警告：`⚠ Chrome DevTools MCP 不可用，跳过视觉验证。仅依赖静态校验结果。`
- 建议用户手动打开当前阶段 URL 检查
- 返回结果标记为 `SKIPPED`
- `mcpProbe.status` 写为 `MISSING_CONFIG`、`MISSING_SERVER`、`FAILED` 或 `PARTIAL`
- `mcpProbe.fallbackManualUrl` 必须写入待检查 URL

### Step 2: 获取设计稿参考

优先从 `manifest.json` 和相关工件中获取：
- 设计稿尺寸
- page / frame 名称
- 原始 Figma 节点信息
- 已下载的设计图片资源
- `source.provider`、`source.mode`、`source.providerAttempts` 和 `fieldSources`
- `responsiveFrames` 和 `interactionStates`

参考优先级：
1. `.d2c/docs/reference/<designId>/<runId>-assets.json` 中的设计参考图
2. raw figma 中可用于截图或节点对比的信息
3. `design-spec.md` 中的文字规格

如果所有图像参考都不可用，仍可基于设计规格文字描述做弱校验，但要在报告中标记为 `PARTIAL REFERENCE`。

如果 `source.provider` 是 `figma-image-fallback`，或 `source.mode` 是 `image-fallback`：

- 设计参考图就是主要真值来源，优先使用 assets manifest 中的 PNG。
- 报告必须标记 `DEGRADED REFERENCE`，并列出哪些字段来自 `image-vision-estimate`。
- 可以基于页面截图与参考 PNG 做视觉评分，但不能声称已验证 Figma auto layout、组件实例、variants 或 constraints。
- 如果没有实际截图对比或明确人工审核，状态只能是 `SKIPPED` 或 `FAILED`，不能因为 build 通过而写 `PASSED`。

### Step 3: 截取页面截图

使用 Chrome DevTools MCP：

1. 调整浏览器窗口尺寸到设计稿尺寸
2. 导航到当前阶段 URL（preview 使用 `previewUrl`，target 使用 `targetUrl`）
3. 等待页面加载完成
4. 截取页面截图

如果 normalized artifact 包含 `responsiveFrames`，必须按 `desktop`、`tablet`、`mobile` 或自定义 breakpoint 分别截图。缺少对应 frame 或 viewport 时写 `SKIPPED`，并说明原因；不能用单一 desktop 截图冒充多断点验证。

每个断点记录：

```json
{
  "breakpoint": "mobile",
  "viewport": { "width": 375, "height": 812 },
  "referenceFrameId": "30:3",
  "screenshotPath": ".d2c/docs/verification-reports/<designId>/screenshots/<runId>-preview-mobile.png",
  "status": "PASSED"
}
```

如果 normalized artifact 包含 `stateMappings` 或 `interactionStates`，必须对默认态和关键状态执行状态验证：

- `hover`：优先用 MCP hover 工具；不可用时用 CSS pseudo/state class 的可复现方式触发
- `disabled` / `selected` / `open`：优先通过组件 props、DOM attribute、query 参数或测试专用状态入口触发
- 每个状态都要记录触发方式、截图路径、状态得分和是否回到默认态

状态触发必须只用于验证截图，不应修改生产代码；如果目标页面没有可复现触发入口，状态项写 `SKIPPED` 并把需要人工检查的入口写入报告。

### Step 4: 多模态对比分析

先读取生成日志中的 `styleFit`、`componentMappings` 和 `tokenHints`，把低分组件和 raw value 覆盖较多的区域作为重点检查对象。`styleFit` 是静态预估，截图对比结果是最终判定依据。

`phase=target` 时同时读取 merge report：
- 复核 `resolvedTokens` 对颜色、字号、间距、圆角和阴影的影响，重点检查 `currentValue` 与 Figma raw value 不一致、`matchType=name-only`、低 `confidence` 和 `fallback-raw` 项
- 复核业务组件替换后的默认样式、全局 CSS 优先级和主题变量
- 复核图片、图标、字体等资源迁移后的实际渲染

逐项评估：

1. **布局准确性（30%）**
   - 布局结构
   - 元素位置
   - 元素间距
   - 响应式行为

2. **字体排版（25%）**
   - 字号
   - 字重
   - 行高
   - 颜色
   - 对齐方式

3. **颜色一致性（25%）**
   - 背景
   - 边框
   - 强调色 / 状态色
   - 渐变色

4. **组件渲染（20%）**
   - 组件是否完整渲染
   - 圆角 / 阴影
   - 图片 / 图标
   - 边框样式

视觉 diff 必须输出可重复的阈值和定位信息：

- `thresholds.pixelRatio`：默认 `0.02`
- `thresholds.overallScore`：默认 `90`
- `diffArtifacts.referenceImagePath`
- `diffArtifacts.actualImagePath`
- `diffArtifacts.diffImagePath`
- `regions[]`：偏差区域边界、分类、严重度和建议

偏差区域至少按 `layout`、`typography`、`color`、`component` 分类。没有生成 diff 图时，报告不能写 `PASSED`，除非 `humanReview.status=PASSED` 且记录 reviewer、时间和检查范围。

### Step 5: 评分与判定

综合分 = 布局×0.30 + 排版×0.25 + 颜色×0.25 + 组件×0.20

- **Pass**：综合分 ≥ 90%
- **Fail**：综合分 < 90%
- **Skipped**：Chrome MCP 不可用

多断点和状态验证会影响最终判定：

- 任一必需断点 `FAILED`，整体为 `FAILED`
- 任一必需状态 `FAILED`，整体为 `FAILED`
- 所有截图均 `SKIPPED` 时整体只能为 `SKIPPED`
- 存在部分断点或状态 `SKIPPED` 且主截图通过时整体为 `DEGRADED`

### Step 5.1: 人工接受视觉差异

自动 diff 超阈值且达到迭代上限时返回 `WAIT_FOR_USER`。用户明确接受差异后：

- 保留 `diff.status=FAILED` 和真实 `pixelRatio`。
- screenshot 与整体报告写 `DEGRADED`。
- 写入 `humanReview`、`acceptanceOverride.status=ACCEPTED_WITH_VISUAL_DIFF`、reviewer、时间、范围和原因。
- preview 接受后允许进入 merge，但 target 截图仍必须执行。
- 人工接受不能绕过 `scopeAssessment`，不能自动升级能力路线图 `[x]`。

target 浏览器临时 stub 仅允许当前文档内 storage、XHR 或 fetch 覆盖，并写入：

```json
{
  "runtimeBootstrap": {
    "scope": "browser-document-only",
    "reason": "",
    "writesProjectFiles": false,
    "affectsVerifiedComponentInputs": false,
    "stubs": []
  }
}
```

如果 stub 改变待验证组件数据契约或样式输入，target verify 只能写 `DEGRADED`。

复合图表视觉收敛最多执行三轮。每轮固定按 selector 截图、CSS rect + DPR canonical 裁剪和 diff 顺序执行；第三轮后任一图表仍高于 `thresholds.pixelRatio` 时，必须写 `overallStatus=FAILED`、manifest `status.previewVerify=FAILED` 和 `next=WAIT_FOR_USER`。不得自动沿用旧 run 的人工接受记录。

### Step 6: 输出结果与偏差报告

输出：
- 状态：`PASSED / FAILED / SKIPPED`
- 各维度得分
- 偏差报告（仅 FAILED 时）

偏差报告必须包含：
1. 具体组件
2. 偏差描述
3. 设计预期与当前表现
4. 修复建议
5. 优先级

preview 阶段偏差报告传递给 `d2c-generate` 做下一轮最小修改。target 阶段偏差报告传递给合入修复流程，优先修改目标项目适配层、`resolvedTokens` 和业务组件包裹样式。

## 文档记录

每次执行完成后，将视觉验证结果记录到：

```text
.d2c/docs/verification-reports/<designId>/<runId>-<phase>.md
.d2c/docs/verification-reports/<designId>/<runId>-<phase>.json
```

建议模板：

```markdown
# 视觉验证报告：<设计稿名称>

## 基本信息
- **Run ID**：<runId>
- **Design ID**：<designId>
- **验证阶段**：preview / target
- **Chrome DevTools MCP**：<可用 / 不可用>
- **设计稿参考**：<assets / raw figma / design spec>
- **设计稿尺寸**：<宽 x 高>
- **验证地址**：<previewUrl or targetUrl>

## 评分
| 维度 | 得分 | 权重 | 加权得分 |
|------|------|------|----------|
| 布局准确性 | <N>% | 30% | <N>% |
| 字体排版 | <N>% | 25% | <N>% |
| 颜色一致性 | <N>% | 25% | <N>% |
| 组件渲染 | <N>% | 20% | <N>% |
| **综合得分** | | | **<N>%** |

## 判定
- **状态**：PASSED / FAILED / SKIPPED
- **通过阈值**：90%

## styleFit 复核
| 组件 | styleFit | 截图表现 | 结论 |
|------|----------|----------|------|

## Target 适配复核
| 项 | 目标表达 | 匹配方式 / 当前值 | 截图表现 | 结论 |
|----|----------|-----------------|----------|------|
| resolvedTokens | <token / raw value / utility> | <matchType / currentValue> | <表现> | <结论> |
| 业务组件样式 | <组件 / 包裹层> | <默认样式来源> | <表现> | <结论> |

## MCP 探测
| 配置 | Server | 状态 | 工具 | 人工检查地址 |
|------|--------|------|------|--------------|

## 多断点验证
| 断点 | Viewport | 截图 | 得分 | 状态 |
|------|----------|------|------|------|

## 状态验证
| 状态 | 触发方式 | 截图 | 得分 | 状态 |
|------|----------|------|------|------|

## 视觉 Diff
| 阈值 | 参考图 | 实际图 | Diff 图 | Pixel Ratio |
|------|--------|--------|---------|-------------|

## 偏差报告
1. [<组件>] <偏差描述>
   - 预期：<值>
   - 当前：<值>
   - Fix：<修复建议>
```

JSON 报告最小结构：

```json
{
  "designId": "<designId>",
  "runId": "<runId>",
  "phase": "preview",
  "url": "http://localhost:5173",
  "mcpProbe": {
    "configPath": ".mcp.json",
    "serverName": "chrome-devtools",
    "status": "AVAILABLE",
    "tools": ["navigate", "screenshot", "resize", "evaluate"],
    "missingTools": [],
    "fallbackManualUrl": "http://localhost:5173"
  },
  "thresholds": {
    "pixelRatio": 0.02,
    "overallScore": 90
  },
  "screenshots": [
    {
      "breakpoint": "desktop",
      "viewport": { "width": 1440, "height": 900 },
      "referenceImagePath": ".d2c/assets/reference.png",
      "actualImagePath": ".d2c/docs/verification-reports/<designId>/screenshots/<runId>-preview-desktop.png",
      "diffImagePath": ".d2c/docs/verification-reports/<designId>/screenshots/<runId>-preview-desktop-diff.png",
      "score": 94,
      "status": "PASSED"
    }
  ],
  "stateChecks": [
    {
      "state": "hover",
      "trigger": "mcp-hover",
      "actualImagePath": ".d2c/docs/verification-reports/<designId>/screenshots/<runId>-preview-hover.png",
      "score": 92,
      "status": "PASSED"
    }
  ],
  "diff": {
    "status": "PASSED",
    "pixelRatio": 0.01,
    "regions": []
  },
  "overallStatus": "PASSED"
}
```

校验 JSON 报告：

```bash
node scripts/check-verify-report.mjs .d2c/docs/verification-reports/<designId>/<runId>-<phase>.json
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Chrome MCP 不可用 | 跳过验证，标记 `SKIPPED` |
| 页面加载失败 | 检查 dev server 是否运行 |
| 截图为空白 | 检查页面渲染错误 |
| 无设计稿参考图 | 回退到 raw figma / design spec 做弱校验 |
