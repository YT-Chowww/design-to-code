# D2C (Design-to-Code) Project

## Overview
将 Figma 视觉稿自动转换为前端代码的 Claude Code Skill 工作流。支持 Vue 3、React、Svelte、Angular 和 Vanilla 等多种前端框架，自动检测目标项目技术栈。

## Commands
- `/d2c-init` — 初始化 `.d2c/` 工作目录（自动检测项目技术栈）
- `/d2c <figma-url> [target-directory]` — 完整 Design-to-Code 流程
- `/d2c-extract <figma-url>` — 提取 Figma 设计信息
- `/d2c-generate` — 生成前端代码（按检测到的框架适配）
- `/d2c-validate` — 代码校验与运行
- `/d2c-verify` — 视觉验证（截图对比）
- `/d2c-merge [target-directory]` — 合入目标项目（默认合入 CWD）

## Supported Frameworks
| 框架 | 组件格式 | CSS 隔离 | 构建工具 |
|------|---------|---------|---------|
| Vue 3（默认） | `.vue` SFC | Scoped CSS | Vite |
| React | `.tsx` / `.jsx` | CSS Modules / Tailwind | Vite |
| Svelte | `.svelte` | 自动 scoped | Vite |
| Angular | `.component.ts` + `.html` + `.css` | ViewEncapsulation | Angular CLI |
| Vanilla | `.html` + `.css` + `.js` | BEM 命名 | Vite |

## Context Files
以下文件包含项目特定配置，请在使用前根据你的项目填写：
- `.d2c/context/design-system.md` — 设计 token（颜色、字体、间距等）
- `.d2c/context/component-library.md` — 业务组件库文档
- `.d2c/context/project-config.md` — 目标项目配置（技术栈由 `/d2c-init` 自动检测）

## Project Structure
- `.d2c/preview/` — 最小化预览项目（自动创建，按框架适配）
- `.d2c/context/` — 用户可配置的上下文文件
- `.d2c/assets/` — Figma 图片资源下载目录
- `.claude/skills/` — Skill 定义
- `scripts/` — 辅助脚本
- `docs/` — 项目文档

## 在业务项目中使用

D2C 的 skill 可以被任意业务项目引用。只需将 `.claude/skills/d2c*/` 和 `.claude/rules/` 目录复制到你的业务项目中，然后：

1. 在业务项目中运行 `/d2c-init` 初始化 `.d2c/` 目录（自动检测技术栈）
2. 检查 `.d2c/context/project-config.md` 中的检测结果是否准确
3. 编辑 `.d2c/context/` 下的配置文件，填入你的设计 token 和组件库信息
4. 运行 `/d2c <figma-url>` 开始转换

所有 D2C 工作文件都在 `.d2c/` 目录下，不会污染业务项目结构。建议在 `.gitignore` 中添加：
```
.d2c/preview/node_modules/
.d2c/preview/dist/
```
