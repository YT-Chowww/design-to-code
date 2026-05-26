# 业务组件库 (Component Library)

> `component-library.json` 是机器优先读取的权威来源；本文件用于补充导入示例、适用场景和人工备注。
> 请只记录“D2C 应优先复用”的组件，保持列表聚焦高价值复用项。

## 组件记录格式

每个组件至少补充以下信息：

1. 组件名（PascalCase）
2. 导入路径
3. 适用场景 / 设计特征
4. 关键 props
5. 样式契约 `styleContract`
6. 覆盖策略 `overridePolicy`

`styleContract` 用于 `d2c-generate` 计算 `styleFit`，描述组件默认样式能覆盖的高度、颜色 token、圆角、字号、内边距、图标能力等。

`overridePolicy` 用于说明组件支持的覆盖方式，例如 `className`、`style`、`tokenOverride`。

## 示例

### Button

- **Import Path**: `antd`
- **Use When**: 主按钮、次按钮、文字按钮等标准操作入口
- **Alternative**: 复杂自定义形状或特殊动效按钮使用原生结构

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `type` | `primary \| default \| text` | no | 按钮视觉类型 |
| `size` | `small \| middle \| large` | no | 高度和内边距 |

```json
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
```
