# 任务拆分与实施计划

## Phase 0: 项目文档
- [x] 创建 `docs/` 目录
- [x] `docs/README.md` — 项目概述与快速开始指南
- [x] `docs/requirements.md` — 需求说明
- [x] `docs/architecture.md` — 架构设计
- [x] `docs/task-breakdown.md` — 任务拆分（本文件）
- [x] `docs/operation-guide.md` — 操作指南
- [x] `docs/verification.md` — 验证方案

## Phase 1: 基础设施
- [ ] 创建完整目录结构
- [ ] 编写 `CLAUDE.md`（项目级指令）
- [ ] 编写 `.mcp.json`（MCP 服务器配置）
- [ ] 创建 `templates/vite-preview/` 预览项目模板
- [ ] 创建 `context/` 模板文件
- [ ] 创建 `.claude/rules/` 规则文件

## Phase 2: 核心 Skill
- [ ] 实现 `d2c-extract` skill（Figma 设计信息提取）
- [ ] 实现 `d2c-generate` skill（Vue 3 代码生成）
- [ ] 实现 `d2c-validate` skill + `scripts/validate.sh`

## Phase 3: 验证循环
- [ ] 实现 `d2c-verify` skill（视觉验证）
- [ ] 迭代循环逻辑（在主编排器中实现）

## Phase 4: 集成与编排
- [ ] 实现 `d2c-merge` skill
- [ ] 实现 `/d2c` 主编排 skill
- [ ] 编写 `.claude/settings.json`

## Phase 5: 测试验证
- [ ] 用简单 Figma 组件测试完整流程
- [ ] 用复杂多组件页面测试
- [ ] 根据输出质量优化 prompt
