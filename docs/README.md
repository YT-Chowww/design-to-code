# D2C 文档目录

D2C 当前以轻量的 `d2c` Skill 作为日常工作流：从带具体 `node-id` 的 Figma URL 读取设计证据，结合现有 Web 前端项目完成实现预览、确认、代码修改、工程检查和真实页面复核。另提供可选的 `d2c-benchmark` Skill，在隔离脚手架内一次生成四个固定场景并供用户并排查看，不评分、不合入业务项目。首版实际验证范围为 React + TypeScript 和 Vue 3 + TypeScript。

## 当前文档

| 文档 | 用途 |
| --- | --- |
| [需求结论](d2c-skill-requirements-v2.md) | 已确认的产品边界与行为要求 |
| [操作指南](operation-guide.md) | 日常入口、停止条件和确认点 |
| [验证方案](verification.md) | 当前结构检查、行为场景和真实项目验收边界 |
| [行为场景](skill-evals/d2c-scenarios.md) | 对 Skill 决策与停止点进行回归 |
| [真实项目验收](skill-evals/d2c-live-acceptance.md) | 记录外部项目与 Provider 验证状态 |
| [外部使用](提供外部使用.md) | 把本仓库 Skill 同步到本机工具 |
| [Benchmark 行为场景](skill-evals/d2c-benchmark-scenarios.md) | 回归可选 Benchmark 的隔离与展示边界 |

仓库仅维护当前方案的需求、设计、使用指南与行为验证证据。旧工件流水线的协议、脚本和样本已移除；历史版本可通过 Git 查询。

## 当前入口

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

执行前确保 Figma Provider 已由用户完成安装和认证。日常流程不会读取或保存凭据，也不会生成独立预览工作区。

可选 Benchmark 入口为 `/d2c-benchmark`。同步脚本会同时发现两个 Skill；手动安装时可只复制日常 `d2c`，需要基准预览时再复制 `d2c-benchmark`。两种方式都不应复制或处理 OAuth、Token、MCP 配置、环境文件等认证信息。

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
