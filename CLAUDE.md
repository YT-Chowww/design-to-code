# D2C (Design-to-Code) Project

## Overview
将 Figma 视觉稿自动转换为 Vue 3 + TypeScript 前端代码的 Claude Code Skill 工作流。

## Commands
- `/d2c-init` — 初始化 `.d2c/` 工作目录（首次使用时运行）
- `/d2c <figma-url> [target-directory]` — 完整 Design-to-Code 流程
- `/d2c-extract <figma-url>` — 提取 Figma 设计信息
- `/d2c-generate` — 生成 Vue 3 代码
- `/d2c-validate` — 代码校验与运行
- `/d2c-verify` — 视觉验证（截图对比）
- `/d2c-merge [target-directory]` — 合入目标项目（默认合入 CWD）

## Context Files
以下文件包含项目特定配置，请在使用前根据你的项目填写：
- `.d2c/context/design-system.md` — 设计 token（颜色、字体、间距等）
- `.d2c/context/component-library.md` — 业务组件库文档
- `.d2c/context/project-config.md` — 目标项目配置

## Project Structure
- `.d2c/preview/` — 最小化预览项目（自动创建）
- `.d2c/context/` — 用户可配置的上下文文件
- `.d2c/assets/` — Figma 图片资源下载目录
- `.claude/skills/` — Skill 定义
- `scripts/` — 辅助脚本
- `docs/` — 项目文档

## 在业务项目中使用

D2C 的 skill 可以被任意业务项目引用。只需将 `.claude/skills/d2c*/` 目录复制到你的业务项目中，然后：

1. 在业务项目中运行 `/d2c-init` 初始化 `.d2c/` 目录
2. 编辑 `.d2c/context/` 下的配置文件，填入你的设计 token 和组件库信息
3. 运行 `/d2c <figma-url>` 开始转换

所有 D2C 工作文件都在 `.d2c/` 目录下，不会污染业务项目结构。建议在 `.gitignore` 中添加：
```
.d2c/preview/node_modules/
.d2c/preview/dist/
```
