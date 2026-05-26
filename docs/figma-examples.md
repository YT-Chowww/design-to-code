# Figma Example Registry

这份清单是 `docs/capability-roadmap.md` 第 7 节的机器可追踪依据。`docs/figma-examples.json` 是权威数据源；本文件只提供阅读摘要。

## 状态规则

- `planned`：roadmap 中有计划，但尚未登记真实 Figma 节点。
- `registered-pending-verification`：已经登记真实 Figma 节点，可以开始 D2C extract/generate/validate/verify。
- `partially-verified`：至少跑通过一个真实 D2C 阶段，但完整闭环还没完成。
- `verified`：完成所需 D2C 阶段，可以作为后续 `[x]` 依据。

## 已登记 Example

| Example | Figma | Node | 状态 | 下一步 |
| --- | --- | --- | --- | --- |
| `D2C Baseline Card` | 客群全景台 明日 | `5301:76004` | `registered-pending-verification` | 跑 extract、generate、preview validate、preview verify |
| `Plain Marketing Section` | Ant Design Open Source Community | `39889:87855` | `registered-pending-verification` | 跑布局提取、组件拆分和 preview 生成验证 |
| `普通模板 5362:136850` | 客群全景台 明日 | `5362:136850` | `partially-verified` | 补视觉截图和完整 target validate |
| `Image Card` | 客群全景台 明日 | `5308:125805` | `registered-pending-verification` | 跑资源下载、assets manifest、图片 fallback 验证 |
| `Open UI Admin Page` | Ant Design Open Source Community | `64462:1762` | `registered-pending-verification` | 需要目标项目验证组件库版本、import、主题绑定和 merge |
| `Business Dashboard` | 客群全景台 明日 | `5601:71203` | `registered-pending-verification` | 需要目标项目验证业务组件、props contract、数据 adapter 和 merge |
| `Token Playground` | 中金财富B端 PC组件库 | `5340:375412` | `registered-pending-verification` | 跑 tokenCandidates、tokenHints、resolvedTokens 验证 |
| `Analytics Report` | 客群全景台 明日 | `5601:71250` | `registered-pending-verification` | 需要目标项目验证图表封装、option、dataAdapter 和 merge |
| `Order Management Console` | 【PRD】企微客户列表 | `320:13867` | `registered-pending-verification` | 需要目标项目验证路由建议、冲突处理、target validate 和状态覆盖 |
| `Interactive Component Set` | 中金财富B端 PC组件库 | `54:208176` | `registered-pending-verification` | 跑 variants / interactionStates extract 与状态验证 |

## 暂缓 Example

| Example | 原因 |
| --- | --- |
| `Responsive Pricing Page` | 用户指定先不考虑 |

## 校验命令

```bash
node scripts/check-figma-examples.mjs docs/figma-examples.json
```

校验通过只表示 example 已具备可追踪 Figma 输入，不能代表 D2C 视觉或目标项目验证已经通过。
