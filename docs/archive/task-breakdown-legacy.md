# 任务拆分与实施计划（历史归档）

> 这是早期实施 checklist 的历史归档，状态口径已经过时。
> 当前能力状态请以 `docs/capability-roadmap.md` 为准；验证证据请以
> `docs/validation-fixtures/`、`docs/figma-examples.json` 和真实运行工件为准。

## Phase 0: 文档与协议

- [x] 建立 docs 文档目录
- [x] 定义主编排和子 skill 职责
- [x] 定义 manifest 驱动的工件协议
- [x] 定义 normalized design、generation log、merge report 的阶段交接内容

## Phase 1: 初始化与上下文

- [x] 创建 `.claude/skills/d2c-init/templates/` 预览项目模板
- [x] 创建 JSON 优先的 context 模板
- [x] 支持 Vue 3 / React 项目检测
- [x] 记录路径、alias、工具链、组件库和 token source 候选

## Phase 2: 核心流程

- [x] `d2c-extract`：raw Figma、assets、normalized design、design spec
- [x] `d2c-generate`：preview 代码、token hints、component mappings、style fit
- [x] `d2c-validate`：preview / target 双阶段校验
- [x] `d2c-verify`：preview / target 双阶段视觉验证
- [x] `d2c-merge`：目标项目合入、resolved tokens、资源和导入适配
- [x] `d2c`：7 步主编排和阶段顺序检查

## Phase 3: 工具与分发

- [x] 提供 Claude skills 同步脚本
- [x] 提供 Codex skills 同步脚本
- [ ] 将测试断言升级到新协议
- [ ] 清理重复 reference 并确定权威文档
- [ ] 评估是否进一步封装为 plugin

## Phase 4: 验证

- [ ] 简单组件端到端验证
- [ ] 复杂页面端到端验证
- [ ] preview 与 target 差异验证
- [ ] MCP 降级场景验证
- [ ] target validate 失败场景验证
