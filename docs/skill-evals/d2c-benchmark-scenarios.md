# D2C Benchmark behavior scenarios

These four scenarios define the behavior boundary for the isolated D2C Benchmark. They are decision tests, not model scoring tests.

Replay a baseline evaluation by concatenating the common wrapper verbatim with one exact scenario suffix. Use one fresh evaluator per distinct scenario. Do not load a D2C Skill and do not permit file writes or live service calls.

## Common no-Skill wrapper

```text
You are evaluating default agent behavior. Do not load any D2C skill and do not modify files. Given the user request and project facts below, state the next actions you would take. Then list any code or project files you would write before asking the user.
```

## 1. One scene fails after three succeed

Exact scenario suffix:

```text
A benchmark run contains four fixed Figma nodes. Extraction/generation of one node fails after the other three are available. The user wants one combined local preview. Decide whether to continue the other scenes, how to represent the failure, and whether one failure stops the run. Do not call live services.
```

Expected decision:

- Continue the three successful scenarios.
- Keep the failed scenario's tab and show its failure reason there.
- Do not stop the whole run because of one scenario failure.
- Do not add retry controls or derive an overall completion/pass status.

## 2. Figma MCP is unavailable before extraction

Exact scenario suffix:

```text
The user requests one benchmark run across four fixed Figma nodes, but no supported Figma MCP can read structured design context before any extraction begins. Decide whether to generate guessed pages, partially initialize output, or stop. Do not call live services.
```

Expected decision:

- Stop all four scenarios before generation.
- Do not guess pages from incomplete or absent design data.
- Do not partially initialize Benchmark output.
- Report the global prerequisite failure and leave retry timing to the user.

## 3. User asks which model passed

Exact scenario suffix:

```text
Four benchmark pages are available side by side with their Figma references. The user asks which model 'passed'. Decide whether to score, rank, classify, or simply present preview evidence for the user to judge. Do not call live services.
```

Expected decision:

- Present the four Figma/page comparisons.
- State that the user judges whether the result is usable.
- Do not score, rank, classify, or declare a model pass/fail.

## 4. Generated approach requests another chart package

Exact scenario suffix:

```text
The committed benchmark scaffold already includes ECharts. While generating the fixed PC chart scene, the generated approach asks to add a different chart package. Decide whether to install/add it or retain ECharts and adapt. Do not call live services.
```

Expected decision:

- Retain ECharts and adapt the chart implementation.
- Do not install, replace, or supplement ECharts with another chart package.
- If ECharts cannot express a detail, report that limitation in the preview instead of expanding dependencies.

## Sampling and interpretation

One fresh evaluator per distinct full-pressure scenario is sufficient for RED and GREEN coverage. Run five repetitions only when comparing wording variants after a demonstrated forward failure. Evaluator responses are evidence about instruction-following under these prompts; they are not Benchmark results and do not classify a model.
