---
name: d2c-extract
description: Extract design information from a Figma URL. Use when you need to analyze a Figma design and produce a structured design specification. Requires a Figma URL as argument.
---

# D2C Extract — Figma 设计信息提取

## 输入
- 参数：Figma URL（如 `https://www.figma.com/design/xxx/...?node-id=1-100`）

## 流程

### Step 1: 检查 Figma MCP 可用性

尝试调用 Figma MCP。如果不可用：
- 告知用户 Figma MCP 未连接
- 请用户手动提供设计信息：
  1. 设计截图（可直接粘贴图片）
  2. 文字描述：组件结构、颜色、字体、间距等
- 根据手动提供的信息继续后续流程

### Step 2: 获取 Figma 设计数据

调用 Figma MCP 的 `get_figma_data` 工具：
- 传入 Figma URL
- 获取设计稿的结构化数据

### Step 3: 解析设计数据

从获取的数据中提取以下信息：

**组件层级结构**：
- 识别顶层 Frame 和嵌套层级
- 确定组件边界和分组关系
- 为每个组件命名（PascalCase）

**布局结构**：
- 布局方式：Flex（row/column）、Grid、Auto Layout
- 对齐方式：主轴、交叉轴
- 间距：gap、padding、margin
- 尺寸：固定/自适应、min/max 约束

**视觉样式**：
- 颜色：文字色、背景色、边框色（提取 HEX/RGBA 值）
- 字体：字族、字号、字重、行高
- 圆角：border-radius 值
- 阴影：box-shadow 参数
- 透明度：opacity 值

**图片资源**：
- 识别需要导出的图片/图标
- 调用 `download_figma_images` 下载资源
- 记录资源文件名和用途

### Step 4: 交叉引用上下文

读取 `context/design-system.md`：
- 将 Figma 中的颜色值映射到设计 token（如 `#3B82F6` → `var(--color-primary)`）
- 将字体值映射到排版 token
- 将间距值映射到间距 token

读取 `context/component-library.md`：
- 检查设计中是否有可复用的现有组件
- 标记哪些部分应使用业务组件库中的组件
- 记录需要传递的 props

### Step 5: 输出设计规格

将分析结果以结构化格式输出，用于后续代码生成。格式如下：

```markdown
# Design Specification

## Overview
- Source: [Figma URL]
- Page/Frame: [名称]
- Dimensions: [宽 x 高]

## Component Tree
- ComponentA (组件描述)
  - SubComponentA1
  - SubComponentA2
- ComponentB (组件描述)

## Components

### [ComponentName]
- **Role**: [组件职责描述]
- **Layout**: [flex-column / flex-row / grid / ...]
- **Size**: [width x height / responsive]
- **Reusable component**: [Yes: ComponentLib.Button / No]

#### Styles
- Background: [token 或 HEX]
- Border: [border 描述]
- Border Radius: [token 或 px]
- Shadow: [token 或 CSS 值]
- Padding: [token 或 px]

#### Children
1. [子元素描述 + 样式]
2. [子元素描述 + 样式]

## Assets
- [filename]: [用途描述]

## Design Tokens Mapping
- Color: Figma值 → Token名
- Typography: Figma值 → Token名
- Spacing: Figma值 → Token名
```

将此规格保存到对话上下文中，供 `d2c-generate` 使用。

## 错误处理
- Figma URL 无效：提示用户检查 URL 格式
- MCP 连接失败：降级到手动输入模式
- 设计数据为空：提示用户检查 node-id 参数
