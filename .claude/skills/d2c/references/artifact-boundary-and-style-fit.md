# D2C Artifact Boundary and Style Fit

Use this reference when maintaining the handoff between `d2c-extract`, `d2c-generate`, `d2c-merge`, and `d2c-verify`.

## Boundary

`d2c-extract` records design facts and candidates:

- `requiredStyle`: the visual requirements read from Figma
- `tokenCandidates`: possible semantic token meanings
- `uiPatternCandidates`: generic UI roles and composition patterns
- `iconCandidates`: icon-like SVG/vector/component/text candidates with evidence
- `chartCandidates`: chart-like structures, axes, series, legends, and data-shape candidates
- `responsiveFrames`: related frames for desktop/tablet/mobile breakpoint candidates
- `interactionStates`: variants or state candidates such as default, hover, active, disabled, selected, and open
- `fieldSources`: provenance for extracted fields when data is degraded or estimated

Extract uses layered providers. `source.provider` records the winning provider, and `source.providerAttempts` records every attempted provider:

- `figma-official-mcp`: Figma official MCP / Dev Mode MCP. Best for variables, components, Dev Mode context, and design-system semantics.
- `framelink-context-mcp`: GLips/Figma-Context-MCP / Framelink / coding-agent-oriented context. Best for compact layout/style/text context.
- `figma-rest`: Figma REST nodes/images API. Best for raw auditable node JSON, image export, and assets.
- `figma-image-fallback`: Figma image export plus model vision. Last structured fallback and always `DEGRADED`.
- `manual-input`: user-provided screenshot or description. Last resort and always `DEGRADED`.

`source.mode` records the shape of the winning input:

- `structured`: official MCP or equivalent rich structured context.
- `structured-context`: coding-agent-oriented context.
- `structured-raw`: REST node raw structure.
- `image-fallback`: PNG fallback.
- `manual`: manual input.

Only structured providers should be treated as complete enough for normal extract. Fallback modes can support bounded generation and validation, but cannot prove Figma auto layout, component instance identity, constraints, or exact text styles.

Normalized source example:

```json
{
  "source": {
    "provider": "framelink-context-mcp",
    "mode": "structured-context",
    "figmaUrl": "<url>",
    "rawPath": ".d2c/docs/reference/<designId>/<runId>-figma-raw.json",
    "assetsPath": ".d2c/docs/reference/<designId>/<runId>-assets.json",
    "providerAttempts": [
      {
        "provider": "figma-official-mcp",
        "status": "FAILED",
        "reason": "unavailable"
      },
      {
        "provider": "framelink-context-mcp",
        "status": "PASSED",
        "mode": "structured-context"
      }
    ],
    "auxiliaryProviders": [
      {
        "provider": "figma-rest",
        "purpose": "image-export"
      }
    ],
    "requiresStructuredExtractRerun": false
  }
}
```

`d2c-generate` creates preview decisions:

- `tokenHints`: semantic token hints for later project adaptation
- `componentMappings`: selected component, import path, props, and decision evidence
- `styleFit`: static estimate of how well a selected component covers the required visual style
- `iconMappings`: icon component, iconfont class, SVG/image fallback, and decision evidence
- `chartMappings`: chart component, option/config, preview data status, and container style
- `responsiveRules`: local media/container rules derived from responsive frame candidates
- `stateMappings`: props, pseudo-class, class, or local preview state derived from interaction state candidates
- preview styles use raw Figma values by default to keep visual restoration independent of target project token availability

`d2c-merge` resolves project decisions:

- `resolvedTokens`: selected project token, utility class, CSS variable, mixin, local variable, or fallback raw value
- business component adaptation: target imports, data contracts, CSS Modules, and project coding rules
- `openSourceComponentMerges`: final target imports, theme bindings, local overrides, styleFit evidence, and fallback decisions for third-party component libraries
- `businessComponentMerges`: final target business component imports, props mapping, data binding status, contract evidence, and override policy
- `iconMerges`: target icon component, iconfont class, migrated SVG/image fallback, and evidence for the selected strategy
- `chartMerges`: target chart library wrapper, option/config path, data adapter status, container style, and fallback decisions
- `conflictResolutions`: audited decisions for file, path, import, style, asset, token, and component contract conflicts

`d2c-validate` runs twice:

- preview validation checks the generated preview project before visual iteration
- target validation checks only the files added or modified by the current merge after imports, tokens, resources, and business components are adapted
- validation records the resolved command matrix and check results, but it does not judge visual similarity
- target validation derives `validationScope.files` from merge report `mergedFiles[].targetPath` and uses real target dependencies to construct scoped commands
- project-wide type-check and build commands are optional diagnostics; historical global errors must not degrade a passing changed-files result
- missing optional checks are `SKIPPED` with reasons
- if required changed-files type checks fail, the overall D2C run must not be declared complete

`d2c-verify` runs twice:

- preview verification checks raw-value visual restoration before merge
- target verification checks the actual merged page and is the final visual evidence
- Chrome DevTools MCP discovery must be recorded as `mcpProbe`, including `.mcp.json` path, server name, tool list, missing tools, and manual fallback URL
- responsive verification uses extract `responsiveFrames` and generate `responsiveRules`; each required breakpoint needs its own viewport, screenshot, score, and diff artifact
- state verification uses extract `interactionStates` and generate `stateMappings`; each required state needs a reproducible trigger, screenshot, score, and reset behavior
- visual diff reports must include stable thresholds, reference/actual/diff image paths, pixel ratio, and region-level deviations classified as `layout`, `typography`, `color`, or `component`
- verification cannot be `PASSED` without real screenshot diff evidence or explicit human review; partial MCP, missing breakpoints, or skipped states degrade the result instead of silently passing

## Extract Example

Figma button facts:

```json
{
  "components": [
    {
      "nodeId": "12:34",
      "name": "SubmitAction",
      "role": "button",
      "requiredStyle": {
        "width": 96,
        "height": 32,
        "backgroundColor": "#1677ff",
        "borderRadius": 6,
        "fontSize": 14,
        "fontWeight": 400,
        "paddingX": 16,
        "paddingY": 4
      }
    }
  ],
  "tokenCandidates": [
    {
      "nodeId": "12:34",
      "property": "backgroundColor",
      "rawValue": "#1677ff",
      "candidates": [
        {
          "semantic": "color-primary",
          "confidence": 0.92,
          "evidence": ["matches primary action fill"]
        },
        {
          "semantic": "color-brand",
          "confidence": 0.74,
          "evidence": ["close to brand blue"]
        }
      ]
    }
  ],
  "uiPatternCandidates": [
    {
      "nodeIds": ["12:34"],
      "kind": "role",
      "role": "button",
      "pattern": "primary-action",
      "text": "提交",
      "confidence": 0.86,
      "evidence": ["rectangle fill", "centered text", "action naming"]
    }
  ],
  "iconCandidates": [
    {
      "nodeId": "12:35",
      "kind": "svg",
      "nameCandidates": ["search", "magnifier"],
      "assetRef": ".d2c/assets/search.svg",
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
      "nodeIds": ["20:10"],
      "chartType": "line",
      "axes": {
        "x": "category",
        "y": "value"
      },
      "series": [
        {
          "name": "Revenue",
          "shape": "polyline"
        }
      ],
      "legend": ["Revenue"],
      "dataShape": "category-value-series",
      "confidence": 0.78,
      "evidence": ["axis labels", "polyline marks", "legend swatches"]
    }
  ],
  "responsiveFrames": [
    {
      "frameNodeId": "30:1",
      "breakpoint": "desktop",
      "width": 1440,
      "height": 900,
      "contentSignature": "pricing-title-plan-names",
      "matchedFrameIds": ["30:2", "30:3"],
      "confidence": 0.8,
      "evidence": ["shared text nodes", "same section names"]
    }
  ],
  "interactionStates": [
    {
      "nodeIds": ["40:2"],
      "componentSetId": "40:1",
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

## Image Fallback Example

When Figma nodes API is unavailable but image export works, `d2c-extract` writes a raw fallback wrapper rather than pretending the PNG is raw Figma data:

```json
{
  "source": {
    "provider": "figma-image-fallback",
    "mode": "image-fallback",
    "figmaUrl": "https://www.figma.com/design/<file>/<name>?node-id=12-34",
    "fileKey": "<file>",
    "nodeId": "12:34"
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
      "exportedImageWidth": 192,
      "exportedImageHeight": 64
    }
  },
  "manualObservation": {
    "model": "current-codex-vision",
    "text": ["提交"],
    "visual": {
      "backgroundColor": "#1677ff",
      "color": "#ffffff",
      "borderRadius": "6px"
    }
  }
}
```

The normalized artifact must keep the fallback provenance:

```json
{
  "source": {
    "provider": "figma-image-fallback",
    "mode": "image-fallback",
    "requiresStructuredExtractRerun": true
  },
  "meta": {
    "dimensions": {
      "width": 96,
      "height": 32
    }
  },
  "components": [
    {
      "nodeId": "12:34",
      "name": "SubmitAction",
      "role": "button",
      "requiredStyle": {
        "width": "96px",
        "height": "32px",
        "backgroundColor": "#1677ff",
        "borderRadius": "6px",
        "fontSize": "14px"
      }
    }
  ],
  "fieldSources": [
    {
      "path": "meta.dimensions.width",
      "source": "image-export-metadata",
      "confidence": 0.95,
      "evidence": ["exportedImageWidth 192 / exportScale 2"]
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

Fallback rules:

- Do not write exported 2x PNG dimensions directly as CSS dimensions. Divide by `exportScale`.
- Do not invent Figma-only facts such as auto layout, component instance references, variants, constraints, or token bindings.
- Token matches discovered from project context remain candidates only; they are not Figma raw values.
- Icon, chart, responsive, and interaction candidates remain extract facts only; generated imports, chart options, media rules, and state props belong to later stages.
- In image fallback mode, do not claim responsive frame relationships or interaction variants unless the user supplied explicit multi-frame/state evidence.
- When two providers disagree on a field, keep the selected value explicit and record alternatives in `fieldSources[].alternatives`.
- `d2c-generate` must record fallback mode in the generation log.
- `d2c-verify` must not mark visual verification as passed unless an actual screenshot comparison or explicit human review happened.

## Context Example

Component library entries can expose a style contract for static matching:

```json
{
  "components": [
    {
      "name": "Button",
      "importFrom": "antd",
      "matchRoles": ["button", "primary-action"],
      "propsByRole": {
        "primary-action": {
          "type": "primary",
          "size": "middle"
        }
      },
      "styleContract": {
        "height": 32,
        "backgroundToken": "color-primary",
        "borderRadiusToken": "border-radius-base",
        "fontSize": 14,
        "paddingX": 16,
        "supportsIcon": true
      },
      "overridePolicy": {
        "className": true,
        "style": false,
        "tokenOverride": true
      }
    }
  ],
  "matchingRules": {
    "preferLibraryComponentWhenConfidenceAbove": 0.8,
    "styleFit": {
      "useComponent": 0.85,
      "useComponentWithOverrides": 0.65
    }
  }
}
```

## Generate Example

React + Ant Design + Less context:

```json
{
  "framework": "react",
  "componentLibrary": "antd",
  "cssStrategy": "less",
  "tokenResolutionRules": [
    {
      "semantic": "color-primary",
      "propertyTypes": ["backgroundColor", "borderColor"],
      "targets": [
        {
          "target": "@primary-color",
          "strategy": "less-token",
          "source": "theme variables",
          "currentValue": "#1677ff",
          "matchType": "value-and-name",
          "confidence": 0.93,
          "evidence": ["token name matches primary", "current value equals rawValue"]
        }
      ]
    }
  ]
}
```

Generate decision:

```json
{
  "tokenHints": [
    {
      "nodeId": "12:34",
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
  ],
  "componentMappings": [
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
  ],
  "iconMappings": [
    {
      "nodeId": "12:35",
      "source": "component-library-icon",
      "name": "SearchOutlined",
      "importFrom": "@ant-design/icons",
      "renderAs": "component",
      "fallback": null,
      "confidence": 0.86,
      "evidence": ["iconCandidates nameCandidates includes search", "antd icon set available"]
    }
  ],
  "chartMappings": [
    {
      "nodeIds": ["20:10"],
      "chartType": "line",
      "source": "open-source-library",
      "component": "ReactECharts",
      "importFrom": "echarts-for-react",
      "dataStatus": "estimated-preview-data",
      "containerStyle": {
        "width": 480,
        "height": 260
      },
      "confidence": 0.78,
      "evidence": ["chartCandidates chartType=line", "legend and axis labels found"]
    }
  ],
  "responsiveRules": [
    {
      "frameNodeId": "30:1",
      "breakpoint": "desktop",
      "strategy": "media-query",
      "selector": ".pricingGrid",
      "confidence": 0.8,
      "evidence": ["desktop/mobile frames share contentSignature"]
    }
  ],
  "stateMappings": [
    {
      "nodeIds": ["40:2"],
      "control": "Button",
      "state": "hover",
      "strategy": "css-pseudo-class",
      "target": ".submitButton:hover",
      "confidence": 0.9,
      "evidence": ["variant property state=hover"]
    }
  ]
}
```

Generated React code:

```tsx
import { Button } from 'antd'

export function SubmitAction() {
  return <Button type="primary">提交</Button>
}
```

Generated preview style keeps raw values when a local override is needed:

```css
.submitAction {
  background: #1677ff;
  border-radius: 6px;
  padding: 4px 16px;
}
```

Generate can also emit preview decisions for extract candidates that are not final project decisions:

```json
{
  "componentMappings": [
    {
      "nodeId": "24:10",
      "source": "business-library",
      "component": "MetricCard",
      "importFrom": "@/components/MetricCard",
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
  ],
  "iconMappings": [
    {
      "nodeId": "12:35",
      "source": "svg-fallback",
      "assetRef": ".d2c/assets/search.svg",
      "renderAs": "svg",
      "confidence": 0.72,
      "evidence": ["vector asset exported from icon candidate"]
    }
  ],
  "chartMappings": [
    {
      "nodeIds": ["20:10"],
      "chartType": "bar",
      "source": "native-svg-fallback",
      "dataStatus": "estimated-preview-data",
      "fallbackReason": "missing-chart-library",
      "confidence": 0.66,
      "evidence": ["bar-like repeated rectangles"]
    }
  ],
  "responsiveRules": [
    {
      "frameNodeId": "30:1",
      "breakpoint": "mobile",
      "strategy": "fluid-only",
      "selector": ".pageShell",
      "confidence": 0.58,
      "evidence": ["single frame only; no matchedFrameIds"]
    }
  ],
  "stateMappings": [
    {
      "nodeIds": ["40:2"],
      "state": "disabled",
      "strategy": "component-prop",
      "props": {
        "disabled": true
      },
      "confidence": 0.88,
      "evidence": ["variant property disabled=true"]
    }
  ]
}
```

Generate boundary rules:

- Open-source and business component usage is a preview decision; target imports and data integration can still be changed by `d2c-merge`.
- Icon mappings may choose component, iconfont, SVG, or image fallback, but must not invent missing icon assets or class prefixes.
- Chart mappings may create preview option/config and estimated data, but real API data binding belongs to merge or manual implementation.
- Responsive rules must preserve the desktop raw-value baseline and only add local overrides.
- State mappings must keep the default visual state intact for screenshot verification.
- Merge must keep the target project as the source of truth for installed component libraries, iconfont prefixes, chart wrappers, aliases, and style entrypoints.
- Merge may replace preview choices with project-native components only when the target import path, props contract, data contract, and style override policy are evidenced.
- Merge conflict handling defaults to preserving existing target files and isolating D2C output through suffixes, subdirectories, local classes, or adapter files unless the user explicitly confirms overwrite.

Vue + Element Plus context can resolve the same extract artifact differently:

```json
{
  "componentMappings": [
    {
      "nodeId": "12:34",
      "component": "ElButton",
      "importFrom": "element-plus",
      "props": {
        "type": "primary"
      }
    }
  ],
  "tokenHints": [
    {
      "nodeId": "12:34",
      "property": "backgroundColor",
      "rawValue": "#1677ff",
      "previewValue": "#1677ff",
      "semanticCandidates": [
        {
          "semantic": "color-primary",
          "target": "var(--el-color-primary)",
          "strategy": "css-variable",
          "source": "element-plus theme",
          "currentValue": "#1677ff",
          "matchType": "value-and-name",
          "confidence": 0.91,
          "status": "candidate"
        }
      ],
      "status": "candidate"
    }
  ]
}
```

Generated Vue code:

```vue
<template>
  <el-button type="primary">提交</el-button>
</template>
```

## Merge Example

Merge resolves final project token expressions from `tokenHints`, target project context, and existing business styles:

```json
{
  "resolvedTokens": [
    {
      "nodeId": "12:34",
      "property": "backgroundColor",
      "rawValue": "#1677ff",
      "semantic": "color-primary",
      "target": "@primary-color",
      "strategy": "less-token",
      "source": "theme variables",
      "currentValue": "#1677ff",
      "matchType": "value-and-name",
      "confidence": 0.93,
      "usage": "src/components/SubmitAction/index.less",
      "status": "resolved"
    }
  ]
}
```

When the candidate is not reliable, merge keeps the raw value:

```json
{
  "resolvedTokens": [
    {
      "nodeId": "12:34",
      "property": "backgroundColor",
      "rawValue": "#1677ff",
      "semantic": "color-primary",
      "target": null,
      "strategy": "raw-value",
      "source": "preview raw value",
      "currentValue": "#1677ff",
      "matchType": "none",
      "confidence": 0,
      "usage": "src/components/SubmitAction/index.less",
      "status": "fallback-raw",
      "fallbackReason": "project token value differs from design rawValue"
    }
  ]
}
```

Merged style:

```less
.submitAction {
  background: @primary-color;
  border-radius: @border-radius-base;
  padding: 4px 16px;
}
```

## Merge Report Example

Target merge records project-specific decisions separately from preview generation:

```json
{
  "designId": "Open UI Admin Page",
  "runId": "2026-05-26T10-00-00",
  "targetDirectory": "/repo/app",
  "mergeStatus": "DEGRADED",
  "openSourceComponentMerges": [
    {
      "nodeId": "24:7",
      "component": "Button",
      "importFrom": "antd",
      "importName": "Button",
      "themeBindings": ["ConfigProvider.theme.token.colorPrimary"],
      "styleOverrides": ["src/pages/d2c-lab/AdminPage.module.css"],
      "styleFitScore": 0.88,
      "decision": "use-target-library",
      "evidence": ["antd dependency exists", "componentMappings selected Button"]
    }
  ],
  "businessComponentMerges": [
    {
      "nodeId": "30:2",
      "component": "BusinessTable",
      "importPath": "@/components/business/BusinessTable",
      "propsMapping": { "columns": "adapter.columns", "dataSource": "adapter.rows" },
      "contractEvidence": ["component-library propsContract matched columns/dataSource"],
      "dataBindingStatus": "adapter-placeholder",
      "overridePolicy": "local-class",
      "decision": "use-business-component"
    }
  ],
  "iconMerges": [
    {
      "nodeId": "41:8",
      "strategy": "iconfont",
      "className": "iconfont icon-search",
      "decision": "use-project-iconfont",
      "evidence": ["class prefix found in src/styles/iconfont.css"]
    }
  ],
  "chartMerges": [
    {
      "nodeId": "55:1",
      "chartType": "line",
      "library": "echarts",
      "component": "ReactECharts",
      "importFrom": "@/components/charts/ReactECharts",
      "optionPath": "src/pages/d2c-lab/chartOption.ts",
      "dataAdapter": "src/pages/d2c-lab/chartAdapter.ts",
      "dataBindingStatus": "adapter-placeholder",
      "decision": "use-target-chart-wrapper"
    }
  ],
  "conflictResolutions": [
    {
      "type": "file",
      "source": ".d2c/preview/src/AdminPage.tsx",
      "target": "src/pages/admin/AdminPage.tsx",
      "affectedFiles": ["src/pages/admin/AdminPage.d2c.tsx"],
      "strategy": "rename",
      "decision": "preserve-existing-target-file",
      "status": "resolved",
      "reason": "target file already exists and was not generated by this run"
    }
  ]
}
```

## Style Fit Rule

Use `requiredStyle` as the target and compare it with the component style contract:

- `score >= 0.85`: use the component and add small class adjustments
- `0.65 <= score < 0.85`: use the component with local style overrides
- `score < 0.65`: generate native markup or a new component

`styleFit` is a static estimate. `d2c-verify` is the final visual gate because library defaults, runtime CSS priority, font loading, and browser rendering can change the actual result.
