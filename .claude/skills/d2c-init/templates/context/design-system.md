# 设计系统 (Design System)

`design-system.json` 是机器读取主数据。本文件应在初始化回填后由 `design-system.json` 同步生成，作为人工可读镜像。

## 生成要求

- 真实来源来自 `design-system.sources`
- token 摘要来自 `design-system.tokens`
- token 候选解析规则来自 `design-system.tokenResolutionRules`
- 输出策略来自 `design-system.rules.outputStrategyByCss`
- helper 摘要来自 `design-system.helpers`

## 内容结构

- 真实来源
- 核心 Token
- 组件级 Token
- D2C token 候选解析规则
- 输出策略
- 可复用能力
- 维护约束

## 维护约束

- 初始化完成后，本文件应反映当前项目。
- 修改 `design-system.json` 后，同步更新本文件。
- 代码生成读取 JSON，本文件用于人工评审和跨阶段沟通。
