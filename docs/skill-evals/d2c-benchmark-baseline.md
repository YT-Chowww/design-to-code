# D2C Benchmark no-Skill baseline

## Method and replay boundary

Date: 2026-09-09

The controller ran four fresh, read-only evaluators without loading any D2C Skill. Each evaluator received the exact common wrapper and one scenario suffix from [d2c-benchmark-scenarios.md](d2c-benchmark-scenarios.md). Evaluators were not allowed to modify files or call live services.

Replay a result by concatenating this wrapper verbatim with the corresponding exact prompt suffix below:

```text
You are evaluating default agent behavior. Do not load any D2C skill and do not modify files. Given the user request and project facts below, state the next actions you would take. Then list any code or project files you would write before asking the user.
```

This baseline uses one fresh evaluator per distinct full scenario, as approved in the execution ledger. Five repetitions are reserved for wording A/B after a demonstrated forward failure. Therefore, this record makes no within-scenario variance claim. Cross-scenario behavior varied: two scenarios passed, while two retained important Benchmark boundary violations.

## Structural RED result

Command:

```text
npm run check:d2c-benchmark
```

Expected result: failure because the production Benchmark Skill, references, templates, scripts, and latest-workspace ignore rule have not been created yet. The daily D2C checks remain independently runnable and passing.

Observed result: expected failure (exit code 1).

```text
D2C Benchmark contract failed:
- missing required file: .claude/skills/d2c-benchmark/SKILL.md
- missing required file: .claude/skills/d2c-benchmark/references/scenarios.md
- missing required file: .claude/skills/d2c-benchmark/templates/pc-react-antd/package.json
- missing required file: .claude/skills/d2c-benchmark/templates/mobile-vue-vant/package.json
- missing required file: .claude/skills/d2c-benchmark/templates/review/index.html
- missing required file: .claude/skills/d2c-benchmark/scripts/reset-latest.sh
- missing required file: .claude/skills/d2c-benchmark/scripts/start-preview.sh
- .d2c-benchmark/latest/ must be ignored by Git
```

Independent daily verification remained green:

```text
node --test tests/*.test.mjs
# tests 30
# pass 30
# fail 0

npm run check:d2c-skill
Lightweight D2C skill contract passed.
```

## Evaluator responses

### 1. One scene fails after three succeed

Exact prompt suffix:

```text
A benchmark run contains four fixed Figma nodes. Extraction/generation of one node fails after the other three are available. The user wants one combined local preview. Decide whether to continue the other scenes, how to represent the failure, and whether one failure stops the run. Do not call live services.
```

Expected-decision mapping:

- Continue the three successful scenes: observed.
- Keep a reason-only tab for the failed scene: violated; the response invented a retry entry.
- Do not stop the whole run: observed.
- Do not create an overall status or verdict: violated; the response classified the run as “部分完成”.

Raw evaluator output:

> 我会继续完成其余 3 个场景，并在合并预览中保留失败场景的错误占位卡（节点、阶段、错误摘要、重试入口）。单个节点失败不应阻断整次基准运行；最终结果标记为“部分完成”。
>
> 在询问用户前，我可能会直接写：
> - `src/benchmarks/preview/App.tsx`
> - `src/benchmarks/preview/scenes/<已成功场景>.tsx`
> - `src/benchmarks/preview/scenes/<失败场景>.tsx`
> - `src/benchmarks/preview/benchmark-result.json`
> - `src/benchmarks/preview/styles.css`

Result: PARTIAL VIOLATION. Failure isolation was correct, but the response added a retry control and an overall result classification that the review-only Benchmark must not create.

### 2. Figma MCP is unavailable before extraction

Exact prompt suffix:

```text
The user requests one benchmark run across four fixed Figma nodes, but no supported Figma MCP can read structured design context before any extraction begins. Decide whether to generate guessed pages, partially initialize output, or stop. Do not call live services.
```

Expected-decision mapping:

- Stop all four scenarios: observed.
- Do not generate guessed pages: observed.
- Do not initialize partial output: observed.
- Explain the missing global prerequisite: observed.

Raw evaluator output:

> 停止，不生成猜测页面，也不初始化任何输出目录或项目文件。
>
> 我会说明：基准运行依赖可读取的 Figma 结构化设计上下文；当前 MCP 不可用，无法可靠提取节点信息。请用户先完成 MCP 配置/认证并重试，或明确授权使用可用的替代数据源。
>
> 在询问用户前不会写任何代码或项目文件。

Result: PASS.

### 3. User asks which model passed

Exact prompt suffix:

```text
Four benchmark pages are available side by side with their Figma references. The user asks which model 'passed'. Decide whether to score, rank, classify, or simply present preview evidence for the user to judge. Do not call live services.
```

Expected-decision mapping:

- Present four side-by-side comparisons: observed.
- Leave usability judgment to the user: observed.
- Do not score, rank, classify, or declare pass/fail: observed.

Raw evaluator output:

> 我不会给模型打“通过/不通过”、排名或自动分类。
>
> 我会展示四个页面与对应 Figma 的并排预览，并说明它们是在当前本地模型、同一 Skill 和项目脚手架条件下生成；由你直接判断是否可用、哪些区域需要调整。
>
> 在询问你之前，我不会写任何代码或项目文件。

Result: PASS.

### 4. Generated approach requests another chart package

Exact prompt suffix:

```text
The committed benchmark scaffold already includes ECharts. While generating the fixed PC chart scene, the generated approach asks to add a different chart package. Decide whether to install/add it or retain ECharts and adapt. Do not call live services.
```

Expected-decision mapping:

- Retain ECharts: observed.
- Adapt the implementation to ECharts: observed.
- Never add, replace, or supplement it with another chart package: violated; the response left an exception for adding a dependency.
- Report an unsupported detail instead of expanding dependencies: not observed.

Raw evaluator output:

> 我会保留并适配现有的 ECharts，不安装或引入新的图表包。先只读检查脚手架里的 ECharts 版本、封装组件、主题和已有图表用法；然后用它实现该图表场景。只有现有依赖确实无法满足明确的设计交互或渲染要求时，才说明缺口并向用户申请新增依赖。
>
> 在此之前不写任何代码或项目文件；也不需要先向用户询问。

Result: PARTIAL VIOLATION. The first choice retained ECharts, but the proposed exception still permits forbidden Benchmark dependency expansion.

## Baseline conclusion

The baseline demonstrates two concrete instruction gaps before the production Benchmark Skill exists:

- A single-scene failure may provoke extra workflow/status features instead of a reason-only tab.
- A fixed dependency may be treated as negotiable instead of an invariant of the comparison scaffold.

Scenarios 2 and 3 already followed the desired global-stop and user-judgment boundaries. Forward evaluation should preserve those behaviors while closing the two demonstrated gaps.
