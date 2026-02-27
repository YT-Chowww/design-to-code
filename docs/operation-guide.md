# 操作指南

## 安装配置

### 1. 克隆项目
```bash
git clone <repo-url>
cd design-to-code
```

### 2. 配置 Figma API Key
编辑 `.mcp.json`，将 `<YOUR_FIGMA_API_KEY>` 替换为你的 Figma API Key：
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=YOUR_KEY", "--stdio"]
    }
  }
}
```

获取 Figma API Key：Figma → Settings → Personal access tokens → Generate new token

### 3. 配置上下文文件
根据你的项目填写 `context/` 目录下的文件：

- **`context/design-system.md`**：填入项目的设计 token
- **`context/component-library.md`**：填入可用的业务组件
- **`context/project-config.md`**：填入目标项目的配置信息

### 4. 确保 Chrome 已安装
视觉验证需要 Chrome 浏览器。确保系统已安装 Chrome。

## Skill 使用方法

### `/d2c` — 完整流程

```bash
/d2c <figma-url> <target-directory>
```

**参数说明**：
- `figma-url`：Figma 设计稿链接（如 `https://www.figma.com/design/xxx/...`）
- `target-directory`：目标项目目录路径

**流程**：提取设计 → 生成代码 → 校验 → 视觉验证 → 合入项目

### `/d2c-extract` — 提取设计信息

```bash
/d2c-extract <figma-url>
```

单独提取 Figma 设计信息，输出结构化设计规格。适合：
- 先查看设计信息再决定是否生成代码
- 调试 Figma MCP 连接

### `/d2c-generate` — 生成 Vue 3 代码

```bash
/d2c-generate
```

根据已提取的设计规格生成 Vue 3 代码。需要先运行 `/d2c-extract`。

### `/d2c-validate` — 校验与运行

```bash
/d2c-validate
```

对生成的代码进行 TypeScript + ESLint 检查，并启动 Vite 开发服务器。

### `/d2c-verify` — 视觉验证

```bash
/d2c-verify
```

截取页面截图并与设计稿对比，输出匹配度评分和偏差报告。

### `/d2c-merge` — 合入项目代码

```bash
/d2c-merge <target-directory>
```

将生成的代码合入目标项目，适配项目结构和规范。

## 完整流程演示

```
用户: /d2c https://www.figma.com/design/abc123/MyDesign?node-id=1-100 /path/to/my-project

Claude: 正在执行 Design-to-Code 流程...

[Step 1/5] 提取设计信息
  ✓ 获取 Figma 设计数据
  ✓ 解析组件结构：Header, HeroSection, FeatureList, Footer
  ✓ 提取样式 token：12 种颜色, 4 种字体, 8 种间距
  ✓ 映射到设计系统 token

[Step 2/5] 生成 Vue 3 代码
  ✓ 生成 Header.vue
  ✓ 生成 HeroSection.vue
  ✓ 生成 FeatureList.vue
  ✓ 生成 Footer.vue
  ✓ 更新 App.vue

[Step 3/5] 代码校验
  ✓ TypeScript 检查通过
  ✓ ESLint 检查通过
  ✓ Vite 构建成功
  ✓ 开发服务器启动于 http://localhost:5173

[Step 4/5] 视觉验证 (迭代 1/3)
  ✓ 页面截图完成
  ✓ 对比分析：匹配度 85%
  ✗ 偏差：Header 间距偏大，HeroSection 字体颜色不匹配
  → 进入迭代优化...

[Step 4/5] 视觉验证 (迭代 2/3)
  ✓ 修正偏差并重新生成
  ✓ 对比分析：匹配度 93%
  ✓ 视觉验证通过

[Step 5/5] 合入项目
  ✓ 文件放置到 /path/to/my-project/src/components/
  ✓ 更新 import 路径
  ✓ 运行 lint/format

完成！生成了 4 个组件文件，已合入目标项目。
```
