# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose

D2C is a lightweight Skill for implementing a concrete Figma node in an identifiable existing Web frontend project. It uses structured design context and current-project evidence, requires confirmation before writes, and validates the result in the target project's real page. The initial validated scope is React + TypeScript and Vue 3 + TypeScript, not a hard framework limit.

## Daily entrypoint

Use only:

```text
/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]
```

The URL must contain a concrete `node-id`. The target defaults to the current working directory and must be a recognizable existing Web frontend project. Daily use does not create a separate preview workspace or persistent workflow reports.

## Workflow

1. Validate the Figma node scope and target project.
2. Select a usable Figma Provider and obtain structured design context.
3. Read the project-root `D2C.md`, or prepare it on first use.
4. Inspect only task-relevant components, Tokens, resources, business behavior, routes, and validation commands.
5. Show an ASCII structure and implementation preview; wait for confirmation.
6. Modify only the confirmed files and impact surface.
7. Run changed-surface engineering checks and review the target project's real page.
8. Deliver commands, results, known differences, and manual validation boundaries.

## Provider and authentication boundaries

- Supported sources are the official Figma MCP and Figma-Context-MCP.
- Selection order is: explicit user choice, official Figma MCP, Figma-Context-MCP, then stop.
- Availability is determined from tools callable in the current session, not server names or local configuration.
- When both are usable and the user did not choose, use the official Figma MCP.
- MCP installation, OAuth, and Token management belong to the user. If the target project lacks `.mcp.json`, the Skill may create it from the bundled credential-free template, then must tell the user to configure locally and restart Claude. Never overwrite an existing config. Never read credentials. Never store credentials. Never copy credentials. Never output credentials. Never request or fill Token values.
- If no Provider was explicitly selected and the default official Provider reports OAuth unauthorized, denied, or expired while Figma-Context-MCP is available, announce the fallback, discard official results, and restart the target-node read with Figma-Context-MCP without mixing results. An explicitly selected Provider, other OAuth failures, non-authentication failures, incomplete data, and restoration differences never trigger this switch.

## Project `D2C.md` and approvals

`D2C.md` lives at the target project root and contains stable project rules: stack, component usage, Tokens and theme, layout, resources, data conventions, code boundaries, and validation entrypoints.

On first use there are two distinct approvals:

1. Inspect the project, show the proposed `D2C.md` content, and write it only after user confirmation.
2. Show the implementation preview and modify business code only after a separate confirmation.

Do not update an existing `D2C.md` without the user's request. Page-specific routes, APIs, permissions, tracking, or temporary compatibility notes do not belong there.

## Validation boundaries

- Use validation commands from `D2C.md`, then package scripts and project guidance, then ask the user if still unclear.
- Run the applicable type, Lint, test, and build checks for the changed surface.
- Review the target project's real route at the Figma Frame viewport; do not substitute a standalone daily preview project.
- Use Chrome MCP only after a concrete visual mismatch has been identified. Inspect only the affected element, layout, resource, and source code.
- If the real page cannot be opened because of authentication, permissions, data, startup, or environment limits, report it as not visually verified.

## Repository commands

```bash
npm run check:d2c-skill
npm run check:d2c-benchmark
bash scripts/sync-claude-skills.sh
bash scripts/sync-codex-skills.sh
```

`npm test` runs the daily and Benchmark contracts. `skills/` is the runtime-neutral source used directly by workspace-aware agents such as OpenClaw. The sync scripts publish the same source to Claude Code and Codex.

## Optional Benchmark

Use `d2c-benchmark` only for the isolated four-scene visual preview, not for daily business-project implementation. It resets `.d2c-benchmark/latest/` once, generates the fixed PC data/chart and mobile content/form scenes with local mock data, and preserves scene-level failures without deriving an overall verdict. The chart dependency is fixed to ECharts.

The review shell is `http://127.0.0.1:4172`; React + Ant Design routes use port `4173`, and Vue 3 + Vant routes use port `4174`. It shows Figma and real pages side by side. Never score, rank, classify, or declare pass/fail; the user judges the preview. A global Figma MCP or scaffold preflight failure stops the run before reset, while one node failure does not stop other scenes.

## Important locations

- `skills/d2c/SKILL.md` — daily workflow, stops, approvals, write boundaries, and delivery requirements.
- `skills/d2c/references/provider-official.md` — official Figma MCP evidence and failure handling.
- `skills/d2c/references/provider-context-mcp.md` — Figma-Context-MCP evidence and failure handling.
- `skills/d2c/references/project-analysis-guide.md` — bounded project analysis and impact assessment.
- `skills/d2c/references/visual-review.md` — real-page review and conditional Chrome diagnostics.
- `skills/d2c/templates/D2C.md` — neutral project-rule skeleton.
- `skills/d2c-benchmark/SKILL.md` — optional four-scenario Benchmark workflow and failure isolation rules.
- `skills/d2c-benchmark/references/scenarios.md` — fixed Figma nodes, routes, targets, and visible interactions.
- `skills/d2c-benchmark/templates/` — committed PC, mobile, and review scaffolds.
- `skills/d2c-benchmark/scripts/` — safe latest-workspace reset and preview startup helpers.
- `scripts/check-lightweight-d2c.mjs` — active Skill and repository guidance checks.
- `scripts/check-d2c-benchmark.mjs` — Benchmark structure, scaffold, helper, and instruction checks.
