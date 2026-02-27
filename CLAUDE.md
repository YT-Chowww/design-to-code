# D2C (Design-to-Code) Project

## Overview
将 Figma 视觉稿自动转换为 Vue 3 + TypeScript 前端代码的 Claude Code Skill 工作流。

## Commands
- `/d2c <figma-url> <target-directory>` — 完整 Design-to-Code 流程
- `/d2c-extract <figma-url>` — 提取 Figma 设计信息
- `/d2c-generate` — 生成 Vue 3 代码
- `/d2c-validate` — 代码校验与运行
- `/d2c-verify` — 视觉验证（截图对比）
- `/d2c-merge <target-directory>` — 合入目标项目

## Context Files
以下文件包含项目特定配置，请在使用前根据你的项目填写：
- @context/design-system.md — 设计 token（颜色、字体、间距等）
- @context/component-library.md — 业务组件库文档
- @context/project-config.md — 目标项目配置

## Project Structure
- `templates/vite-preview/` — 最小化预览项目模板
- `context/` — 用户可配置的上下文文件
- `scripts/` — 辅助脚本
- `docs/` — 项目文档
- `.claude/skills/` — Skill 定义
- `.claude/rules/` — 编码规范和工作流规则
