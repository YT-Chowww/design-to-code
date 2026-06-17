# D2C 文档目录

D2C 是基于 skills 的 Design-to-Code 工作流，将 Figma 设计稿转换为 Vue 3 或 React 代码，并通过文件工件、静态校验和视觉验证保证流程可恢复、可审计。

本文是 `docs/` 的入口索引。当前先保持既有文件路径稳定，避免打断脚本中的硬编码引用；分类通过索引说明来收敛，后续如果要物理迁移文件，需要同步更新 `scripts/check-*.mjs` 和能力路线图中的路径。

## 目录分类

```text
docs/
├── README.md                         # 本文件：文档入口与分类索引
├── requirements.md                   # 产品与能力需求
├── architecture.md                   # 架构、工件链和阶段职责
├── baseline-protocol.md              # 基线协议：manifest / 阶段状态 / 恢复点
├── operation-guide.md                # 日常执行与恢复操作指南
├── verification.md                   # skill 级验证方案
├── capability-roadmap.md             # 能力路线图与状态盘点
├── figma-examples.json               # Figma 示例机器登记源
├── figma-examples.md                 # Figma 示例人工阅读摘要
├── validation-fixtures/              # 本地验证数据
├── design-specs/                     # 示例/生成的设计规格文档
├── archive/                          # 历史文档归档，不作为当前状态依据
└── 提供外部使用.md                    # skills 同步与外部使用说明
```

## 分类说明

| 分类 | 文件/目录 | 用途 | 维护规则 |
| --- | --- | --- | --- |
| 入门与使用 | `README.md`、`operation-guide.md`、`提供外部使用.md` | 给使用者说明如何初始化、执行、恢复和分发 D2C skills | 面向人阅读，命令示例要和 skill 文档保持一致 |
| 产品与架构 | `requirements.md`、`architecture.md`、`baseline-protocol.md` | 说明 D2C 要解决什么、如何组织工件、阶段状态如何流转 | 协议变化时同步更新相关 `scripts/check-*.mjs` |
| 计划与治理 | `capability-roadmap.md` | 跟踪能力建设状态、拆分后续实施任务 | 状态升级必须有示例、测试数据、脚本或真实运行证据 |
| 示例登记 | `figma-examples.json`、`figma-examples.md` | 管理能力路线图使用的真实 Figma 节点和验证状态 | JSON 是权威源；Markdown 是人工摘要 |
| 验证体系 | `verification.md`、`validation-fixtures/` | 描述 skill 验证方式，保存自动验证脚本和测试数据 | `validation-fixtures/validation-suite.json` 是模块 8 自动验证入口 |
| 设计规格 | `design-specs/` | 存放示例设计规格或后续生成的设计规格文档 | 运行期真实工件优先放目标项目 `.d2c/docs/design-specs/` |
| 历史归档 | `archive/` | 保存已经被新协议或能力路线图替代的旧文档 | 不作为当前状态、任务或验收依据 |

## 中文叫法约定

| 英文/文件名 | 中文叫法 | 说明 |
| --- | --- | --- |
| `baseline-protocol.md` / Baseline Protocol | 基线协议 | 单次运行的 manifest、阶段、状态、产物和恢复规则 |
| `capability-roadmap.md` / Roadmap | 能力路线图 | 能力建设状态、待验证项和检查规则 |
| Figma Example Registry | Figma 示例登记表 | 真实 Figma 节点、所需阶段和验证状态 |
| Validation Fixtures | 本地验证数据 | 离线协议数据、降级报告和自动验证输入 |
| `manifest.json` | 运行清单 | 串联一次 D2C 运行的输入、状态和工件路径 |
| artifacts | 运行工件 | extract/generate/validate/verify/merge 产生的报告和文件 |

## 推荐阅读顺序

第一次了解 D2C：

1. [需求说明](requirements.md)
2. [架构设计](architecture.md)
3. [操作指南](operation-guide.md)
4. [能力路线图](capability-roadmap.md)

执行或排查一次 D2C 运行：

| 你要解决的问题 | 先看 |
| --- | --- |
| 不知道该运行哪个 skill、命令顺序是什么 | [操作指南](operation-guide.md) |
| 已经有 `runId`，想判断下一步该从哪里恢复 | [基线协议](baseline-protocol.md) |
| 某一步报告失败，想确认 validation / verification 应该检查什么 | [验证方案](verification.md) |
| 想找可用的真实 Figma 节点，或确认示例是否已经具备 `[x]` 证据 | [Figma 示例登记表](figma-examples.md) |

排查时的最短路径：

1. 从 `.d2c/docs/sessions/<runId>/manifest.json` 运行清单找当前阶段状态和运行工件。
2. 用 [基线协议](baseline-protocol.md) 判断下一步恢复点。
3. 打开对应 validation、verification 或 merge report，看失败命令、截图、diff、跳过原因或 target 项目问题。
4. 如果本次运行要回填能力路线图状态，再对照 `figma-examples.md` 和机器源 `figma-examples.json` 检查证据是否足够。

要维护能力路线图状态：

1. [能力路线图](capability-roadmap.md)
2. [本地验证数据说明](validation-fixtures/README.md)
3. [Figma 示例登记表](figma-examples.md)
4. `scripts/check-validation-suite.mjs`

## 机器读取与人工阅读边界

| 类型 | 权威来源 | 人工镜像 |
| --- | --- | --- |
| Figma 示例 | `figma-examples.json` | `figma-examples.md` |
| 本地检查配置 | `validation-fixtures/validation-suite.json` | `validation-fixtures/README.md` |
| 协议测试数据 | `validation-fixtures/protocol/*.json` | `baseline-protocol.md`、`verification.md` |
| 目标项目上下文 | 目标项目 `.d2c/context/*.json` | 目标项目 `.d2c/context/*.md` |

如果机器源与 Markdown 摘要冲突，以机器源为准，并同步更新摘要。

## 常用校验命令

```bash
node scripts/check-validation-suite.mjs
node scripts/check-figma-examples.mjs docs/figma-examples.json
node scripts/check-real-run-evidence.mjs docs/figma-examples.json --target-root=/Applications/work/wm/espace/pc/ms-fe-basic
```

这些命令只证明对应层级的协议、测试数据或证据登记有效；真实 Figma 端到端、Chrome 截图和目标项目验证仍需要实际运行 D2C skill 后产生运行工件。
