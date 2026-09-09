# D2C 文档目录

D2C 当前是一个轻量的单 Skill 工作流：从带具体 `node-id` 的 Figma URL 读取设计证据，结合现有 Web 前端项目完成实现预览、确认、代码修改、工程检查和真实页面复核。首版实际验证范围为 React + TypeScript 和 Vue 3 + TypeScript。

## 当前文档

| 文档 | 用途 |
| --- | --- |
| [需求结论](d2c-skill-requirements-v2.md) | 已确认的产品边界与行为要求 |
| [操作指南](operation-guide.md) | 日常入口、停止条件和确认点 |
| [验证方案](verification.md) | 当前结构检查、行为场景和真实项目验收边界 |
| [行为场景](skill-evals/d2c-scenarios.md) | 对 Skill 决策与停止点进行回归 |
| [真实项目验收](skill-evals/d2c-live-acceptance.md) | 记录外部项目与 Provider 验证状态 |
| [外部使用](提供外部使用.md) | 把本仓库 Skill 同步到本机工具 |

`architecture.md`、`baseline-protocol.md`、`requirements.md`、`capability-roadmap.md`、`design-specs/`、`figma-examples.*` 和 `validation-fixtures/` 仅保存旧方案背景或历史验证样本，不作为当前执行入口。它们不会覆盖上述需求结论、主 Skill 或操作指南。

## 当前入口

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

执行前确保 Figma Provider 已由用户完成安装和认证。日常流程不会读取或保存凭据，也不会生成独立预览工作区。

## 仓库检查

```bash
npm test
npm run check:d2c-skill
```

同步脚本：

```bash
bash scripts/sync-codex-skills.sh
bash scripts/sync-claude-skills.sh
```
