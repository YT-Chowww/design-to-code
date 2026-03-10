# design-to-code

将 Figma 视觉稿自动转换为 Vue 3 + TypeScript 前端代码的 Claude Code Skill 工作流。

## 在你的项目中使用 D2C

### 安装

将 D2C 的 skill 文件复制到你的业务项目中：

```bash
# 在你的业务项目根目录下执行
mkdir -p .claude/skills

# 从 design-to-code 项目复制 skill 文件
cp -r /path/to/design-to-code/.claude/skills/d2c .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-init .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-extract .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-generate .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-validate .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-verify .claude/skills/
cp -r /path/to/design-to-code/.claude/skills/d2c-merge .claude/skills/
```

### 初始化

在你的业务项目中启动 Claude Code，运行：

```
/d2c-init
```

这会在项目中创建 `.d2c/` 目录结构：
```
.d2c/
├── preview/          # Vite 预览项目
├── context/          # 上下文配置
│   ├── design-system.md
│   ├── component-library.md
│   └── project-config.md
└── assets/           # Figma 图片资源
```

### 配置

编辑 `.d2c/context/` 下的三个文件，填入你的项目信息：
- `design-system.md` — 你的设计 token（颜色、字体、间距等）
- `component-library.md` — 你的业务组件库
- `project-config.md` — 你的项目结构和约定

### MCP 配置

D2C 依赖以下 MCP 服务：

1. **Figma MCP**（必需）— 用于提取设计信息
   - 在 `.mcp.json` 中添加 figma 服务配置
   - 需要 Figma API Key（Figma → Settings → Personal access tokens）

2. **Chrome DevTools MCP**（可选）— 用于视觉验证
   - 如未配置，将跳过视觉验证步骤

---

## 使用方式

### 完整流程（推荐）

```
/d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100
```

这会自动执行：提取设计 → 生成代码 → 校验 → 视觉验证 → 合入项目

不传目标目录时，默认合入当前项目（CWD）。

### 指定目标目录

```
/d2c https://www.figma.com/design/xxxxx/MyDesign?node-id=1-100 /path/to/other-project
```

### 单独调用子 skill

```
/d2c-extract <figma-url>     # 只提取设计信息
/d2c-generate                 # 只生成代码（需先 extract）
/d2c-validate                 # 只做校验 + 启动 dev server
/d2c-verify                   # 只做视觉对比（需 dev server 运行中）
/d2c-merge [/path/to/project] # 只合入代码（默认合入 CWD）
```

---

## 测试建议

### 第一步：用简单组件测试

在 Figma 中创建一个简单卡片（标题 + 描述 + 按钮），复制链接后运行：

```
/d2c-extract <简单卡片的 figma-url>
```

确认设计信息能正确提取，再逐步测试 generate → validate → verify。

### 第二步：测试完整流程

```
/d2c <figma-url>
```

观察 5 个步骤是否顺利完成，特别关注：
- 视觉验证是否能识别偏差
- 迭代循环是否正常修正问题

### 第三步：测试降级场景

- 断开 Figma MCP → 运行 `/d2c-extract`，确认会提示手动输入
- 断开 Chrome MCP → 运行 `/d2c-verify`，确认会跳过视觉验证

---

## 关于 Figma URL

URL 格式示例：
```
https://www.figma.com/design/ABC123/ProjectName?node-id=1-100
```

`node-id` 参数指定要转换的具体 Frame/组件。你可以在 Figma 中右键点击一个 Frame → "Copy link" 获取带 node-id 的链接。
