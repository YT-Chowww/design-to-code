# 架构设计

## 总览

D2C 采用主编排 skill + 子 skill 的架构。新版核心是 manifest 驱动的文件工件链，避免依赖对话临时上下文。

```text
/d2c
  ├─ init/check
  ├─ manifest.json
  ├─ d2c-extract
  ├─ d2c-generate
  ├─ d2c-validate phase=preview
  ├─ d2c-verify phase=preview
  ├─ d2c-merge
  ├─ d2c-validate phase=target
  └─ d2c-verify phase=target
```

## 工件链

`manifest.json` 是整次运行的索引，记录输入、目标目录、项目上下文、每阶段状态和所有工件路径。

关键工件：

- raw Figma：未经二次解释的 Figma MCP 响应。
- assets manifest：资源下载结果、用途和失败原因。
- normalized design：跨框架设计事实，包含 `requiredStyle`、`tokenCandidates`、`uiPatternCandidates`。
- generation log：记录 `tokenHints`、`componentMappings`、`styleFit` 和生成文件。
- merge report：记录目标文件、`resolvedTokens`、业务组件替换和 target 阶段交接信息。

## 上下文系统

```text
.d2c/context/
├── project-config.json       # 机器主数据：框架、语言、样式策略、路径、工具链
├── design-system.json        # token 来源、候选解析规则、输出策略
├── component-library.json    # 可复用组件、样式契约、覆盖策略
├── project-adapter.json      # 目标项目路径、token source、merge target、特殊规则
├── project-config.md         # 人工镜像
├── design-system.md          # 人工镜像
└── component-library.md      # 人工镜像
```

所有 skill 优先读取 JSON，Markdown 用于人工评审、备注和补充说明。

## 阶段职责

- `d2c-extract`：只记录设计事实和候选项，不决定目标项目表达。
- `d2c-generate`：生成 preview 代码，preview 样式默认使用 Figma raw value，并产出 token 和组件候选决策。
- `d2c-validate`：分别校验 preview 与 target，记录实际命令、结果和运行地址。
- `d2c-verify`：分别验证 preview 与 target，输出分数、偏差报告和人工检查路径。
- `d2c-merge`：根据目标项目真实配置解析 imports、assets、tokens 和业务组件替换。

## 预览项目

预览项目位于 `.d2c/preview/`，统一使用 Vite + TypeScript。根据目标框架生成 Vue 3 或 React 入口与组件，承担 preview 阶段的可运行和可验证基线。

## 降级策略

| 场景 | 策略 |
|------|------|
| Figma MCP 不可用 | 使用手动输入模式，并在 raw 工件中标记来源 |
| Chrome DevTools MCP 不可用 | verify 写为 `SKIPPED`，报告记录原因和人工检查入口 |
| Token 无可靠项目表达 | merge 保留 raw value，并在 `resolvedTokens` 中记录 fallback |
| Target validate 失败 | 停止完成状态，记录失败命令和修复建议 |
