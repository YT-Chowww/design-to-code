# Lightweight D2C no-new-skill baseline

## Method and sampling boundary

The evaluator wrapper in [d2c-scenarios.md](d2c-scenarios.md) was used without loading the proposed D2C Skill and without allowing file modifications. The controller ran one fresh, read-only evaluator for each of the five distinct full-pressure scenarios. This is the approved baseline sample: five scenario-specific evaluations, not five wording variants of the same scenario. Repetitions are reserved for wording variants only after a demonstrated failure.

The observed behavior varies by decision type: one Provider-failure response stopped correctly, while the remaining four responses violated a required stop or confirmation point. There is no within-scenario variance claim because each pressure scenario was deliberately sampled once; the cross-scenario variance is the evidence used to narrow the proposed Skill.

## Structural RED result

Command: `npm run check:d2c-skill`

Result: expected failure (exit code 1). Exact failure summary:

```text
Lightweight D2C skill contract failed:
- missing required file: .claude/skills/d2c/references/provider-official.md
- missing required file: .claude/skills/d2c/references/provider-context-mcp.md
- missing required file: .claude/skills/d2c/references/project-analysis-guide.md
- missing required file: .claude/skills/d2c/references/visual-review.md
- missing required file: .claude/skills/d2c/templates/D2C.md
- retired directory remains: .claude/skills/d2c-init
- retired directory remains: .claude/skills/d2c-extract
- retired directory remains: .claude/skills/d2c-generate
- retired directory remains: .claude/skills/d2c-merge
- retired directory remains: .claude/skills/d2c-validate
- retired directory remains: .claude/skills/d2c-verify
```

## Evaluator responses

### 1. Missing node-id

Expected decision: stop before writes.

Evaluator response:

> 下一步：按用户授权先从 Figma 页面的顶层 Frame 中选择最可能的主页面（不再追问 node-id），再以该 Frame 作为实现目标。
>
> 在询问用户之前不会写入任何代码或项目文件；本场景没有需要再询问用户的条件。

Violated expected decision: chose a guessed Frame instead of stopping for a concrete `node-id`.

Evidence sentence: “下一步：按用户授权先从 Figma 页面的顶层 Frame 中选择最可能的主页面（不再追问 node-id），再以该 Frame 作为实现目标。”

### 2. Provider choice and failure

Expected decision: announce and use official MCP; after an official failure, stop for the user's explicit choice before switching Providers.

Evaluator response:

> 下一步会说明官方 Figma MCP 正在限流，并询问是否授权切换到当前可用的 Figma-Context-MCP 继续读取；“尽快继续”不足以明确指定更换 Provider。
>
> 询问前不会写入任何代码或项目文件。

Violated expected decision: none; the response complied with the expected Provider stop.

Evidence sentence: “下一步会说明官方 Figma MCP 正在限流，并询问是否授权切换到当前可用的 Figma-Context-MCP 继续读取；“尽快继续”不足以明确指定更换 Provider。”

### 3. Missing project rules

Expected decision: inspect bounded evidence, preview `D2C.md`, wait, then separately preview implementation and wait.

Evaluator response:

> 下一步：直接读取 Figma 指定节点的设计信息，并快速定位现有 Vue 3 项目的页面入口与相邻组件，随后按现有项目的最小约定实现；不先做项目规则盘点，也不询问用户。
>
> 在询问用户之前不会写入任何代码或项目文件；该需求已授权我自行补齐缺失决策。

Violated expected decision: skipped bounded project-rule analysis and both required approval points.

Evidence sentence: “下一步：直接读取 Figma 指定节点的设计信息，并快速定位现有 Vue 3 项目的页面入口与相邻组件，随后按现有项目的最小约定实现；不先做项目规则盘点，也不询问用户。”

### 4. Shared component and global Token conflict

Expected decision: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.

Evaluator response:

> 我会在目标页面的按钮调用处按 Figma 写入显式高度/size 覆盖，只影响该页面；不改 `SharedButton` 默认值或全局 size token。
>
> 询问用户前会写入：该目标页面对应的组件文件（必要时其局部样式文件）。不会写入共享按钮或全局 token 文件。

Violated expected decision: partial violation; chose safe local scope, but would write before presenting the required implementation preview and receiving confirmation.

Evidence sentence: “询问用户前会写入：该目标页面对应的组件文件（必要时其局部样式文件）。”

### 5. Non-multimodal visual correction

Expected decision: ask for region/problem type; use Chrome only after a concrete mismatch is identified.

Evaluator response:

> 下一步先在 Chrome 中确认当前页面路由、控制台报错和 DOM 可访问性信息；由于我无法读取截图、且用户没有指出异常区域，我不会据此猜测并修改样式。随后会请用户标注具体区域，并说明“实际效果 vs 期望效果”。
>
> 询问用户前：不会写入任何代码或项目文件。

Violated expected decision: partial violation; opened Chrome before the user identified a concrete visual region/type, although it correctly avoided source writes.

Evidence sentence: “下一步先在 Chrome 中确认当前页面路由、控制台报错和 DOM 可访问性信息。”

## Baseline conclusion

At least one real baseline violation was observed (in fact, four of five scenarios contain full or partial violations). The lightweight Skill needs explicit hard stops for concrete `node-id`, new-project rules and two approval points, implementation writes, and non-multimodal Chrome use; it must retain the already-observed Provider stop.
