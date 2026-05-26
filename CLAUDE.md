# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project purpose
D2C is a Claude Code skill suite that converts Figma designs into Vue 3 or React frontend code. The current workflow is artifact-driven: every run creates a manifest, normalized design JSON, preview output, validation reports, visual verification reports, and merge reports so the process can be resumed and audited.

## Common commands

### Skill entrypoints (run inside Claude Code)
- `/d2c-init` — initialize `.d2c/` workspace, detect target stack, scaffold preview project
- `/d2c <figma-url> [target-directory]` — end-to-end orchestrated flow
- `/d2c-extract <figma-url>` — extract raw Figma data, assets, normalized design JSON, and readable design spec
- `/d2c-generate` — generate Vue 3 or React preview code into `.d2c/preview/src/`
- `/d2c-validate [phase=preview|target]` — type/lint/build checks and runtime startup for preview or target project
- `/d2c-verify [phase=preview|target]` — screenshot-based visual comparison for preview or merged target output
- `/d2c-merge [target-directory]` — merge generated output into target project

### Local script commands
- `bash tests/test-structure.sh` — fast structural checks for skill files, templates, rules, docs
- `bash tests/test-template-build.sh` — validate preview template can install, type-check, and build
- `RUN_E2E=1 bash tests/e2e/test-simple-card.sh` — single E2E scenario using fixture spec
- `RUN_E2E=1 bash tests/e2e/test-figma-workflow.sh` — full E2E workflow with real Figma URL
- `bash scripts/create-preview-project.sh [target-dir]` — ensure preview skeleton/deps
- `bash scripts/validate.sh [preview-dir]` — run type-check/lint/build against the preview project helper path

### Preview project commands (`.d2c/preview/`)
- `npm install`
- `npm run dev` (Vite on port `5173`)
- `npm run type-check`
- `npm run lint`
- `npm run build`

## High-level architecture

### 1) Skill-based pipeline (main architecture)
- The workflow is implemented as composable Claude skills under `.claude/skills/`.
- `d2c` is the orchestrator skill that sequences: manifest initialization → `d2c-extract` → `d2c-generate` → preview `d2c-validate` → preview `d2c-verify` → `d2c-merge` → target `d2c-validate` → target `d2c-verify`.
- Iteration logic is owned by the orchestrator: visual verify can trigger regenerate/revalidate loops (max 3 iterations, pass threshold 90%).

### 2) Artifact contract
- Each run has a `runId` and `designId`.
- `.d2c/docs/sessions/<runId>/manifest.json` is the machine-readable index for all phases.
- `d2c-extract` writes raw Figma JSON, assets manifest, normalized design JSON, and a readable design spec.
- `d2c-generate` must read normalized design from the manifest, then write preview code and a generation log containing `tokenHints`, `componentMappings`, and `styleFit`.
- `d2c-merge` resolves target-project decisions such as `resolvedTokens`, import paths, assets, and business component adaptation.

### 3) Framework adaptation contract
- Stack detection and runtime branching are driven by `.d2c/context/project-config.json` (written by `/d2c-init`), with `.md` files as human-readable mirrors.
- Generate/validate/merge skills read the JSON context and switch file formats, lint/type/build commands, style strategy, and merge mapping by framework.
- Supported generation targets are Vue 3 and React. Default fallback is Vue 3 + TypeScript + Vite when detection/context is missing.

### 4) Separation of responsibilities
- **Skills (`.claude/skills/*/SKILL.md`)** define behavior and step-by-step execution contracts.
- **Rules (`.claude/rules/*.md`)** define coding conventions and workflow constraints shared across skills.
- **Templates (`.claude/skills/d2c-init/templates/`)** provide canonical preview/context scaffolding.
- **Scripts (`scripts/*.sh`)** provide shell-level helpers for preview creation and validation.
- **Tests (`tests/`)** validate repository integrity at 3 layers:
  - structure checks
  - template build checks
  - E2E skill-driven workflow checks

### 5) Stateful workspace model
- Runtime artifacts are centered in `.d2c/`:
  - `.d2c/preview/` — generated code + runnable preview app
  - `.d2c/context/` — JSON-first design system, component library, project config, and project adapter inputs
  - `.d2c/assets/` — downloaded Figma assets
  - `.d2c/docs/` — run artifacts, reports, manifest files, and summaries
- Repo-level `docs/` documents architecture/operation; skills also instruct writing run artifacts/reports during execution.

### 6) External integrations and degradations
- Figma MCP is used for design extraction and image downloads.
- Chrome DevTools MCP is used for visual verification screenshots/comparison.
- Workflow has explicit degradation paths:
  - no Figma MCP → manual design input mode
  - no Chrome MCP → skip visual verify and continue with static validation outcome

## Important code locations
- `.claude/skills/d2c/SKILL.md` — orchestrator and iteration control
- `.claude/skills/d2c-init/SKILL.md` — stack detection + workspace/template bootstrap
- `.claude/skills/d2c-generate/SKILL.md` — framework-specific codegen strategy
- `.claude/skills/d2c-validate/SKILL.md` — framework-specific validation commands and dev server behavior
- `.claude/skills/d2c-verify/SKILL.md` — visual scoring and deviation report format
- `.claude/skills/d2c-merge/SKILL.md` — target-project merge mapping and protection rules
- `.claude/rules/coding-conventions.md` — framework coding style contract
- `.claude/rules/d2c-workflow.md` — shared workflow limits/quality gates
- `tests/e2e/config.sh` — E2E configuration (URL, framework detection helpers, shared assertions)
