---
name: d2c-init
description: Initialize the .d2c/ directory structure in a business project. Creates preview project skeleton, default context files, and assets directory. Run this before using other d2c skills.
---

# D2C Init — 初始化 D2C 工作目录

## 输入
- 无参数（在当前业务项目目录下执行）

## 模板文件位置
模板文件位于本 skill 目录下的 `templates/` 子目录：
- `templates/preview/` — 预览项目模板文件
- `templates/context/` — 默认 context 文件

定位模板目录：找到本 SKILL.md 所在目录下的 `templates/` 文件夹。即 `.claude/skills/d2c-init/templates/`。

## 流程

### Step 1: 检查现有结构

检查当前目录下是否已存在 `.d2c/` 目录：

```bash
ls .d2c/
```

- 如果存在且完整，提示用户已初始化，询问是否重置
- 如果不存在或不完整，继续创建

### Step 2: 创建目录结构

```bash
mkdir -p .d2c/preview/src/components
mkdir -p .d2c/preview/src/assets
mkdir -p .d2c/context
mkdir -p .d2c/assets
```

### Step 3: 复制预览项目文件

读取 `templates/preview/` 下的每个文件，写入到 `.d2c/preview/` 对应位置：

| 模板源文件 | 目标文件 |
|-----------|---------|
| `templates/preview/package.json` | `.d2c/preview/package.json` |
| `templates/preview/vite.config.ts` | `.d2c/preview/vite.config.ts` |
| `templates/preview/tsconfig.json` | `.d2c/preview/tsconfig.json` |
| `templates/preview/tsconfig.node.json` | `.d2c/preview/tsconfig.node.json` |
| `templates/preview/index.html` | `.d2c/preview/index.html` |
| `templates/preview/src/main.ts` | `.d2c/preview/src/main.ts` |
| `templates/preview/src/App.vue` | `.d2c/preview/src/App.vue` |
| `templates/preview/src/env.d.ts` | `.d2c/preview/src/env.d.ts` |

对每个文件：使用 Read 工具读取模板文件内容，然后使用 Write 工具写入目标路径。

### Step 4: 复制默认 context 文件

读取 `templates/context/` 下的每个文件，写入到 `.d2c/context/` 对应位置：

| 模板源文件 | 目标文件 |
|-----------|---------|
| `templates/context/design-system.md` | `.d2c/context/design-system.md` |
| `templates/context/component-library.md` | `.d2c/context/component-library.md` |
| `templates/context/project-config.md` | `.d2c/context/project-config.md` |

### Step 5: 更新 .gitignore

检查项目根目录的 `.gitignore`，如果存在则追加以下条目（避免重复）：

```
# D2C preview artifacts
.d2c/preview/node_modules/
.d2c/preview/dist/
```

如果 `.gitignore` 不存在，创建并写入上述内容。

### Step 6: 安装依赖

```bash
cd .d2c/preview && npm install
```

### Step 7: 输出结果

```
=== D2C Init Complete ===

Created:
  .d2c/
  ├── preview/          # Vite 预览项目
  │   ├── package.json
  │   ├── vite.config.ts
  │   ├── tsconfig.json
  │   ├── tsconfig.node.json
  │   ├── index.html
  │   └── src/
  │       ├── main.ts
  │       ├── App.vue
  │       ├── env.d.ts
  │       └── components/
  ├── context/          # 上下文配置
  │   ├── design-system.md
  │   ├── component-library.md
  │   └── project-config.md
  └── assets/           # Figma 图片资源

Next steps:
  1. 编辑 .d2c/context/design-system.md 填入你的设计 token
  2. 编辑 .d2c/context/component-library.md 填入你的业务组件
  3. 编辑 .d2c/context/project-config.md 填入你的项目配置
  4. 确保 Figma MCP 已配置（.mcp.json 中包含 figma 服务）
  5. 运行 /d2c <figma-url> 开始转换
```

### MCP 配置指引

如果项目中没有 `.mcp.json`，提示用户需要配置：

```
提示：D2C 依赖以下 MCP 服务：

1. Figma MCP（必需）— 用于提取设计信息
   在 .mcp.json 中添加 figma 服务配置，并设置 FIGMA_API_KEY

2. Chrome DevTools MCP（可选）— 用于视觉验证
   如未配置，将跳过视觉验证步骤
```
