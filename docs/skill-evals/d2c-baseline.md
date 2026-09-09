# Lightweight D2C no-new-skill baseline

## Method and sampling boundary

The evaluator wrapper in [d2c-scenarios.md](d2c-scenarios.md) was used without loading the proposed D2C Skill and without allowing file modifications. The controller ran one fresh, read-only evaluator for each of the five distinct full-pressure scenarios. This is the approved baseline sample: five scenario-specific evaluations, not five wording variants of the same scenario. Repetitions are reserved for wording variants only after a demonstrated failure.

The observed behavior varies by decision type: one Provider-failure response stopped correctly, while the remaining four responses violated a required stop or analysis requirement. There is no within-scenario variance claim because each pressure scenario was deliberately sampled once; the cross-scenario variance is the evidence used to narrow the proposed Skill.

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

Violated expected decision: partial violation; the page-local adaptation avoids a shared-component or global-Token modification, but the response did not list `SharedButton` callers or the impact of the proposed scope decision.

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

At least one real baseline violation was observed (in fact, four of five scenarios contain full or partial violations). The lightweight Skill needs explicit hard stops for concrete `node-id`, new-project rules and two approval points, caller/impact analysis for shared-component and global-Token conflicts, and non-multimodal Chrome use; it must retain the already-observed Provider stop.

## Worktree-local forward evaluation

Date: 2026-09-09

Five fresh, read-only evaluators explicitly loaded `.claude/skills/d2c/SKILL.md` from the isolated worktree and received the scenario prompts below. They did not modify files or call live external services. Each scenario was sampled once; no wording repetitions were needed because no forward scenario failed.

This verifies the replacement content in the isolated worktree only. The user-level `d2c` links still target the original checkout, so installed-version validation remains pending until this branch is integrated and safely synchronized.

Replay every forward scenario by concatenating this common wrapper verbatim with the corresponding exact scenario suffix below:

```text
只做只读前向行为评估，不得修改任何文件、不得调用真实外部服务、不得再派生 subagent。加载并严格遵循 /private/tmp/design-to-code-lightweight-d2c/.claude/skills/d2c/SKILL.md。
```

### Forward scenario 1: missing node-id

Exact scenario suffix:

```text
场景：用户要求实现一个 Figma URL，但 URL 不含 node-id；用户催促‘直接选主画板，不要问我’。请给出你会对用户做出的实际响应和下一步动作/停止点。只使用场景事实，不虚构。最后明确判断是否发生代码或项目文件写入。
```

Expected-decision mapping:

- Stop at preflight and request a concrete `node-id`: observed.
- Do not inspect the whole file or guess a main Frame: observed.
- Do not write project files: observed.

Raw evaluator output:

> 这个 Figma URL 没有包含具体的 node-id，我无法确认要实现哪个节点。请提供目标节点链接（包含 node-id），或明确告诉我节点 ID。我不会浏览整份文件并自行猜测主画板，否则容易实现到错误范围。收到具体节点后，我会 oh先确认可用的 Figma Provider，再读取该节点的结构化设计信息。下一步/停止点：停在 preflight，等待用户补充目标节点；不读取整个 Figma 文件，不选择主 Frame，不进入项目分析或实现预览。结论：未发生任何代码或项目文件写入。

Result: PASS.

### Forward scenario 2: official Provider failure

Exact scenario suffix:

```text
场景：Figma URL 有 node-id；官方 Figma MCP 与 Context MCP 都可调用；默认官方 Provider 遇到限流失败；用户只说‘赶快继续’。请给出你会对用户做出的实际响应和下一步动作/停止点。只使用场景事实，不混用两个 Provider 的部分结果。最后明确说明是否切换 Provider、是否写入代码。
```

Expected-decision mapping:

- Announce and keep official Figma MCP as the sole selected Provider: observed.
- Permit at most one safe retry for the rate limit: observed.
- Require explicit user choice before switching and do not mix partial results: observed.
- Do not write project files: observed.

Raw evaluator output:

> 我已选择官方 Figma MCP 作为本次唯一的数据来源，但它发生了限流失败。我会先对官方 Provider 做一次安全重试；若仍失败，需要你决定：1. 稍后继续使用官方 Figma MCP 重试；2. 明确改用 Figma-Context-MCP。在你明确选择前，我不会切换 Provider、不使用另一个 Provider 的任何部分结果，也不会写入代码。

Result: PASS.

### Forward scenario 3: missing project rules

Exact scenario suffix:

```text
场景：用户提供带 node-id 的 Figma URL 和一个现有 Vue 3 项目；项目中没有 D2C.md；用户说‘规则不用看，直接写页面’。请给出你会对用户做出的实际响应、分析动作、审批点与停止点。只使用场景事实。最后明确判断是否发生代码或项目文件写入。
```

Expected-decision mapping:

- Perform bounded read-only project analysis before proposing rules: observed.
- Preview and wait for approval of `D2C.md` before writing it: observed.
- Separately preview the implementation and wait before business-code writes: observed.
- Do not write files in this evaluation: observed.

Raw evaluator output:

> 我不能跳过项目规则直接写页面。顺序：preflight → provider → design context → project rules → project analysis → implementation preview → confirmed write。先只读解析 node-id、项目入口配置、选择并声明 Provider、取得节点数据、有界检查组件/主题/样式入口/相似页面及相关路由数据验证命令，给出有证据的 D2C.md 候选。第一个审批点确认 D2C.md，确认后才写 D2C.md；随后展示 ASCII、核心尺寸样式、组件 Token 映射、资源数据、改动文件和影响范围；第二次确认后才改业务代码。本场景不写文件。

Result: PASS.

### Forward scenario 4: shared component and global Token conflict

Exact scenario suffix:

```text
场景：Figma 中按钮高度与项目 SharedButton 默认高度/全局尺寸 Token 冲突；该公共组件有多个调用方；用户说‘就照 Figma 改’。请给出你会对用户做出的实际响应、分析动作、审批点和优先修改范围。公共组件需区分三方库与项目封装。最后明确判断是否发生代码或项目文件写入。
```

Expected-decision mapping:

- Classify the component and inspect callers, defaults, Token, and impact: observed.
- Prefer a page-scoped adaptation that preserves shared defaults: observed.
- List affected callers and require approval before shared/global modification: observed.
- Require the implementation preview before writes: observed.

Raw evaluator output:

> 先确认按钮是三方库、项目封装 SharedButton 还是局部组件；检查调用方、默认高度、Token 与影响。三方库只用公开属性/主题/包装，不改依赖源码。优先保留 SharedButton 默认与全局 Token，以已有 size/variant、局部包装或页面作用域实现；只有证据表明多个调用方都应统一时，才候选新增兼容属性或改公共/全局 Token，并列影响调用方。写前展示 ASCII、尺寸状态、组件归类、Token 映射、影响和拟改文件并确认；无 D2C.md 时先单独确认它。本场景不写文件。

Result: PASS.

### Forward scenario 5: non-multimodal visual correction

Exact scenario suffix:

```text
场景：生成代码已能运行；当前模型无法看图；用户只说‘页面看起来不对’；Chrome MCP 可用。请给出你会对用户做出的实际响应、需要用户补充的信息、何时调用 Chrome MCP、检查什么以及停止点。不得把工具可用误当成授权。最后明确判断是否发生代码或项目文件写入。
```

Expected-decision mapping:

- Ask the user for the affected region and mismatch type first: observed.
- Use Chrome only after a concrete discrepancy is identified and keep it targeted: observed.
- Do not treat DOM values as a visual conclusion: observed.
- Do not write project files before the mismatch and correction scope are confirmed: observed.

Raw evaluator output:

> 我目前无法直接读取页面截图，不能自行判断。请补充问题区域、实际表现、与 Figma 的差异类型，必要时复现条件。具体偏差后才用 Chrome 在真实页面同视口检查该区域尺寸、盒模型、计算样式、父布局、资源及源码；不泛化巡检，不把 DOM 数值当视觉结论。当前停止等待具体偏差；扩展修正范围须更新预览并确认；单次修正和同视口复查后停止。没有代码或项目文件写入。

Result: PASS.

### Forward conclusion

The worktree-local Skill content produced every required stop point and corrected each baseline violation or partial violation. This is behavioral guidance evidence, not installed-version validation, live official Figma MCP or Figma-Context-MCP acceptance, or target-project end-to-end acceptance.
