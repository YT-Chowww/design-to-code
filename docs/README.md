# D2C 文档索引

D2C 是基于 Claude skills 的 Design-to-Code 工作流，将 Figma 设计稿转换为 Vue 3 或 React 代码，并通过文件工件、静态校验和视觉验证保证流程可恢复、可审计。

## 核心能力

- Figma 提取：保存 raw Figma JSON、资源清单、normalized design 和设计规格。
- 代码生成：基于 normalized design 生成 Vue 3 或 React preview 代码。
- 项目上下文：优先读取 `project-config.json`、`design-system.json`、`component-library.json`、`project-adapter.json`。
- 视觉验证：preview 与 target 两阶段截图对比，低于阈值时输出偏差报告。
- 项目合入：根据目标项目真实结构解析 imports、assets、tokens 和业务组件替换。

## 快速开始

```text
/d2c-init
/d2c <figma-url> [target-directory]
```

初始化后重点检查：

- `.d2c/context/project-config.json`
- `.d2c/context/design-system.json`
- `.d2c/context/component-library.json`
- `.d2c/context/project-adapter.json`

Markdown 文件是人工镜像，JSON 是机器主数据。

## 运行工件

每次 `/d2c` 至少维护：

- `.d2c/docs/sessions/<runId>/manifest.json`
- `.d2c/docs/sessions/<runId>/summary.md`
- `.d2c/docs/reference/<designId>/<runId>-figma-raw.json`
- `.d2c/docs/reference/<designId>/<runId>-assets.json`
- `.d2c/docs/design-specs/<designId>/<runId>-normalized.json`
- `.d2c/docs/design-specs/<designId>/<runId>-design-spec.md`
- `.d2c/docs/generation-logs/<designId>/<runId>.md`
- `.d2c/docs/validation-reports/<designId>/<runId>-preview.md`
- `.d2c/docs/verification-reports/<designId>/<runId>-preview.md`
- `.d2c/docs/merge-reports/<designId>/<runId>.md`
- `.d2c/docs/validation-reports/<designId>/<runId>-target.md`
- `.d2c/docs/verification-reports/<designId>/<runId>-target.md`

## 文档

- [需求说明](requirements.md)
- [架构设计](architecture.md)
- [任务拆分](task-breakdown.md)
- [能力建设 Roadmap](capability-roadmap.md)
- [操作指南](operation-guide.md)
- [验证方案](verification.md)
