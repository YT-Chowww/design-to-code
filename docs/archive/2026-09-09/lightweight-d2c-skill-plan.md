# Lightweight D2C Skill 实施计划（历史摘要）

> 日期：2026-09-09
> 状态：已执行，不再作为当前操作清单。

## 目标

用一个轻量、项目感知的 `d2c` Skill 替代工件化流水线，在写业务代码前完成设计取证、项目分析和两次用户确认。

## 已执行工作

1. 建立静态 contract、行为场景和无 Skill 基线。
2. 实现主 Skill、Provider Reference、项目分析指南、视觉复核指南和 `D2C.md` 模板。
3. 移除旧的多阶段 Skill 入口，更新仓库说明和同步方式。
4. 补充 Provider 选择、用户调整、资源缺失及 Chrome 不可用等前向评估。
5. 将真实项目和真实 Provider 验收保留为外部条件满足后的独立工作。

## 实施原则

- 不引入 TypeScript 执行内核、状态机、`.d2c` 工作区或阶段报告。
- Figma URL 必须包含明确的 `node-id`。
- 首次生成 `D2C.md` 和写业务代码分别确认。
- 用户调整后重新读取受影响的 Figma 与项目证据。
- 只修改确认范围，按 changed surface 执行工程检查。

当前行为以 `.claude/skills/d2c/SKILL.md` 为准，验证入口见 `docs/verification.md`。完整任务步骤可通过 Git 历史查看。
