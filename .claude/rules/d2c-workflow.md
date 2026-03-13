# D2C 工作流规则

## 迭代控制
- 最大迭代次数：3（视觉验证不通过时的重试上限）
- 视觉验证通过阈值：90%（匹配度 ≥90% 视为通过）
- TypeScript 错误修复上限：2 次（超过后降级处理）

## 文件操作规则
- 生成代码写入 `.d2c/preview/src/` 目录
- 迭代修改时做针对性修改，不要全量重写
- 合并到目标项目时保留目标项目的格式规范

## MCP 降级策略
- Figma MCP 不可用：提示用户手动提供设计信息（截图 + 描述）
- Chrome DevTools MCP 不可用：跳过视觉验证，仅做静态校验，输出警告

## 代码质量要求
- 所有生成代码必须通过类型检查（TypeScript 项目）
- 所有生成代码必须通过 ESLint 检查（如已配置）
- 不允许使用 `any` 类型（除非降级处理）
- 不允许内联样式（必须使用框架对应的样式隔离方案）

## 组件分解
- 设计中超过 5 个独立区域时，必须分解为子组件
- 每个子组件独立生成并组合
- 子组件间通过框架标准通信机制交互（Vue: props/emits, React: props/callbacks, Svelte: props/events, Angular: @Input/@Output）

## 预览项目
- 预览项目位于 `.d2c/preview/`（由 `/d2c-init` 创建）
- 开发服务器使用端口 5173
- 每次验证前确保开发服务器运行

## 技术栈配置
- 技术栈信息存储在 `.d2c/context/project-config.md` 的「检测到的技术栈」章节
- 所有 skill 应读取 `project-config.md` 中的 `framework` 字段来决定行为分支
- 未检测到项目时默认使用 Vue 3 + TypeScript + Vite + Scoped CSS
