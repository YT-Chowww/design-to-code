# D2C (Design-to-Code)

基于 Claude Code Skill 的 Design-to-Code 工作流，将 Figma 视觉稿自动转换为高质量的 Vue 3 + TypeScript 前端代码。

## 核心特性

- **Figma 设计提取**：通过 MCP 自动获取 Figma 设计数据（布局、样式、资源）
- **Vue 3 代码生成**：生成符合规范的 Vue 3 SFC + TypeScript 代码
- **视觉验证循环**：截图对比自动迭代优化，确保还原度 ≥90%
- **项目集成**：自动适配目标项目结构并合入代码

## 快速开始

### 前置条件

1. 安装 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)
2. 准备 Figma API Key（在 `.mcp.json` 中配置）
3. 安装 Chrome（用于视觉验证）

### 配置

1. 在 `.mcp.json` 中填入你的 Figma API Key：
   ```json
   "figma": {
     "command": "npx",
     "args": ["-y", "figma-developer-mcp", "--figma-api-key=<YOUR_FIGMA_API_KEY>", "--stdio"]
   }
   ```

2. 根据你的项目填写 `context/` 目录下的配置文件：
   - `context/design-system.md` — 设计 token（颜色、字体、间距等）
   - `context/component-library.md` — 业务组件库文档
   - `context/project-config.md` — 目标项目配置

### 使用

```bash
# 完整流程：从 Figma URL 生成代码并合入项目
/d2c <figma-url> <target-directory>

# 也可单独调用各子 skill：
/d2c-extract <figma-url>        # 提取设计信息
/d2c-generate                    # 生成 Vue 3 代码
/d2c-validate                    # 校验与运行
/d2c-verify                      # 视觉验证
/d2c-merge <target-directory>    # 合入项目代码
```

## 工作流程

```
Figma URL → 提取设计信息 → 生成 Vue 3 代码 → 校验运行 → 视觉验证
                                                              ↓
                                                    Pass → 合入项目 → 完成
                                                    Fail → 迭代优化（最多 3 次）
```

## 文档索引

- [需求说明](requirements.md)
- [架构设计](architecture.md)
- [任务拆分](task-breakdown.md)
- [操作指南](operation-guide.md)
- [验证方案](verification.md)
