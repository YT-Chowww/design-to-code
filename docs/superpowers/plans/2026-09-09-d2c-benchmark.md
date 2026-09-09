# D2C Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an isolated `d2c-benchmark` Skill that generates four fixed PC/mobile scenarios in one run and presents Figma and real pages side by side without scoring.

**Architecture:** Reuse the daily D2C decision rules, but write only to a disposable `.d2c-benchmark/latest/` workspace built from committed React/Ant Design and Vue/Vant templates. A small deterministic reset script prepares the workspace; a review shell shows four tabs and never evaluates pass/fail.

**Tech Stack:** Markdown Agent Skill, Bash, Vite, React, TypeScript, Ant Design, Vue 3, Vant, ECharts, static HTML/CSS/JavaScript review shell.

**Spec:** `docs/superpowers/specs/2026-09-09-d2c-lightweight-skill-design.md`

## Global Constraints

- Prerequisite: complete and behaviorally verify `docs/superpowers/plans/2026-09-09-lightweight-d2c-skill.md` first.
- One invocation runs all four fixed nodes: PC data management, PC chart analytics, mobile content display, and mobile form interaction.
- PC uses React + TypeScript + Ant Design; mobile uses Vue 3 + TypeScript + Vant; ECharts is preinstalled and cannot be replaced or supplemented by the model.
- Scenarios use local mock data and no backend, API, auth, permission, route, or tracking invention.
- Each scenario starts from the same clean committed template; failures remain isolated and do not stop other scenarios.
- A global MCP or scaffold failure stops the run; a single scenario failure appears in its tab.
- Benchmark skips per-scenario implementation-preview confirmation because it never modifies a business repository.
- Only `.d2c-benchmark/latest/` is replaced; no history is retained.
- The review UI shows Figma on the left and a real interactive page on the right. It has no score, threshold, pass state, rank, or model classification.

---

### Task 1: Define Benchmark RED checks and behavior scenarios

**Files:**
- Create: `scripts/check-d2c-benchmark.mjs`
- Create: `docs/skill-evals/d2c-benchmark-scenarios.md`
- Create: `docs/skill-evals/d2c-benchmark-baseline.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: verified daily D2C Skill and Benchmark section of the design spec.
- Produces: `npm run check:d2c-benchmark` plus four fixed behavior tests.

- [ ] **Step 1: Write the missing-structure check**

Create a Node checker that requires:

```js
const required = [
  '.claude/skills/d2c-benchmark/SKILL.md',
  '.claude/skills/d2c-benchmark/references/scenarios.md',
  '.claude/skills/d2c-benchmark/templates/pc-react-antd/package.json',
  '.claude/skills/d2c-benchmark/templates/mobile-vue-vant/package.json',
  '.claude/skills/d2c-benchmark/templates/review/index.html',
  '.claude/skills/d2c-benchmark/scripts/reset-latest.sh',
  '.claude/skills/d2c-benchmark/scripts/start-preview.sh',
];
```

Also assert that `.d2c-benchmark/latest/` is ignored by Git, the Skill links directly to `references/scenarios.md`, and that Reference does not link to another Reference.

- [ ] **Step 2: Add the command without replacing daily checks**

Set package scripts to:

```json
{
  "scripts": {
    "check:d2c-skill": "node scripts/check-lightweight-d2c.mjs",
    "check:d2c-benchmark": "node scripts/check-d2c-benchmark.mjs",
    "test": "npm run check:d2c-skill && npm run check:d2c-benchmark"
  }
}
```

- [ ] **Step 3: Verify RED**

Run: `npm run check:d2c-benchmark`

Expected: FAIL because the Benchmark Skill and templates do not exist.

- [ ] **Step 4: Define baseline scenarios**

Record these prompts and expected decisions:

1. One node fails but three succeed: continue the other three and show the failure reason in one tab.
2. Figma MCP is unavailable before extraction: stop all four without generating guessed pages.
3. The user asks which model “passed”: present the four pages and state that the user judges them; do not score or classify.
4. A generated chart requests another chart package: retain ECharts and adapt the implementation.

Run five fresh evaluator repetitions per scenario without the Benchmark Skill, using the same no-write wrapper as the daily plan. Record every response and response variance. At least one scenario must demonstrate a baseline violation before authoring the Skill.

- [ ] **Step 5: Commit the RED harness**

```bash
git add package.json scripts/check-d2c-benchmark.mjs docs/skill-evals/d2c-benchmark-scenarios.md docs/skill-evals/d2c-benchmark-baseline.md
git commit -m "test: define d2c benchmark contract"
```

---

### Task 2: Build and verify the fixed PC scaffold

**Files:**
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/package.json`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/package-lock.json`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/index.html`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/tsconfig.json`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/vite.config.ts`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/src/main.tsx`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/src/App.tsx`
- Create: `.claude/skills/d2c-benchmark/templates/pc-react-antd/src/style.css`

**Interfaces:**
- Consumes: generated scenario components at `src/scenarios/DataManagement.tsx` and `src/scenarios/ChartAnalytics.tsx`.
- Produces: routes `/data-management` and `/chart-analytics` on port `4173`.

- [ ] **Step 1: Extend the checker for PC behavior**

Add assertions that the package contains `react`, `react-dom`, `antd`, and `echarts`, and that `App.tsx` exposes both route paths. Run the check and confirm it still fails.

- [ ] **Step 2: Create the minimal Vite scaffold**

Use a dependency-locked `package-lock.json` generated by npm, not hand-edited. `App.tsx` must select the scene from `window.location.pathname` and render a visible failure panel when a generated scene module is absent. Do not add React Router.

The public scene interface is:

```ts
export type BenchmarkScene = () => React.ReactElement;
```

Generated files default-export their scene component.

- [ ] **Step 3: Install and build in a temporary copy**

Run:

```bash
npm --prefix .claude/skills/d2c-benchmark/templates/pc-react-antd install --package-lock-only
pc_build_dir=$(mktemp -d)
cp -R .claude/skills/d2c-benchmark/templates/pc-react-antd/. "$pc_build_dir"
npm --prefix "$pc_build_dir" ci
npm --prefix "$pc_build_dir" run build
```

Expected: build PASS with both fallback routes renderable. The only generated repository file is the template's `package-lock.json`.

- [ ] **Step 4: Commit the PC scaffold**

```bash
git add .claude/skills/d2c-benchmark/templates/pc-react-antd scripts/check-d2c-benchmark.mjs
git commit -m "feat: add react antd benchmark scaffold"
```

---

### Task 3: Build and verify the fixed mobile scaffold

**Files:**
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/package.json`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/package-lock.json`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/index.html`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/tsconfig.json`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/vite.config.ts`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/src/main.ts`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/src/App.vue`
- Create: `.claude/skills/d2c-benchmark/templates/mobile-vue-vant/src/style.css`

**Interfaces:**
- Consumes: `src/scenarios/ContentDisplay.vue` and `src/scenarios/FormInteraction.vue`.
- Produces: routes `/content-display` and `/form-interaction` on port `4174`.

- [ ] **Step 1: Extend the checker for mobile behavior**

Assert dependencies `vue`, `vant`, and `echarts`, both route paths, and viewport metadata. Run the check and confirm the expected failure.

- [ ] **Step 2: Create the minimal Vue scaffold**

`App.vue` must select the async component from `window.location.pathname`, constrain the outer device width without constraining page scroll height, and render a visible failure panel when a generated scene is absent. Do not add Vue Router or a store.

Generated `.vue` files use default component exports through normal SFC compilation.

- [ ] **Step 3: Install and build in a temporary copy**

Run:

```bash
npm --prefix .claude/skills/d2c-benchmark/templates/mobile-vue-vant install --package-lock-only
mobile_build_dir=$(mktemp -d)
cp -R .claude/skills/d2c-benchmark/templates/mobile-vue-vant/. "$mobile_build_dir"
npm --prefix "$mobile_build_dir" ci
npm --prefix "$mobile_build_dir" run build
```

Expected: PASS for both fallback routes. The generated lockfile is committed with the template.

- [ ] **Step 4: Commit the mobile scaffold**

```bash
git add .claude/skills/d2c-benchmark/templates/mobile-vue-vant scripts/check-d2c-benchmark.mjs
git commit -m "feat: add vue vant benchmark scaffold"
```

---

### Task 4: Add the review shell and deterministic workspace helpers

**Files:**
- Create: `.claude/skills/d2c-benchmark/templates/review/index.html`
- Create: `.claude/skills/d2c-benchmark/templates/review/style.css`
- Create: `.claude/skills/d2c-benchmark/templates/review/app.js`
- Create: `.claude/skills/d2c-benchmark/scripts/reset-latest.sh`
- Create: `.claude/skills/d2c-benchmark/scripts/start-preview.sh`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: four local Figma PNG paths and four real page URLs.
- Produces: `.d2c-benchmark/latest/` plus review URL `http://127.0.0.1:4172`.

- [ ] **Step 1: Add script behavior checks before scripts**

Extend `scripts/check-d2c-benchmark.mjs` to create a temporary output with `mkdtemp`, execute `reset-latest.sh` with that resolved directory, and assert exactly these directories exist:

```text
pc/
mobile/
review/
references/
```

Run the checker and verify it fails because the reset script is absent.

- [ ] **Step 2: Implement reset with an explicit safe target**

`reset-latest.sh` must require one non-empty target argument, reject `/`, `$HOME`, the repository root, and paths outside either the repository `.d2c-benchmark/` directory or the system temporary directory. It then replaces only the validated target and copies the three templates. It never reads environment credentials.

- [ ] **Step 3: Implement the four-tab review shell**

Use these stable IDs in `index.html`/`app.js`:

```js
const scenarios = [
  ['pc-data', 'PC 数据管理', 'references/pc-data.png', 'http://127.0.0.1:4173/data-management'],
  ['pc-chart', 'PC 图表分析', 'references/pc-chart.png', 'http://127.0.0.1:4173/chart-analytics'],
  ['mobile-content', '移动内容展示', 'references/mobile-content.png', 'http://127.0.0.1:4174/content-display'],
  ['mobile-form', '移动表单交互', 'references/mobile-form.png', 'http://127.0.0.1:4174/form-interaction'],
];
```

Each tab renders a left `<img>` and right `<iframe>`, independently scrollable. Missing reference/page data renders an error message. There is no score or status calculation.

- [ ] **Step 4: Implement preview startup**

`start-preview.sh` must validate the workspace path, start PC on `4173`, mobile on `4174`, and the review static server on `4172`, print all three URLs, forward termination signals, and stop its child processes on exit. It must use installed project commands and fail globally if either scaffold cannot start.

- [ ] **Step 5: Verify helpers without leaving processes behind**

Run the reset checker, build both copied scaffolds, start the preview, request the three local URLs, then terminate the helper and confirm its child PIDs are gone.

- [ ] **Step 6: Commit helpers and review shell**

```bash
git add .gitignore .claude/skills/d2c-benchmark/templates/review .claude/skills/d2c-benchmark/scripts scripts/check-d2c-benchmark.mjs
git commit -m "feat: add benchmark review workspace"
```

---

### Task 5: Author and behaviorally verify `d2c-benchmark`

**Files:**
- Create: `.claude/skills/d2c-benchmark/SKILL.md`
- Create: `.claude/skills/d2c-benchmark/references/scenarios.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/skill-evals/d2c-benchmark-baseline.md`

**Interfaces:**
- Consumes: verified daily D2C Provider/design rules, fixed scenario node URLs, and scaffold/helper interfaces from Tasks 2–4.
- Produces: one-call Benchmark workflow and unified local review entrypoint.

- [ ] **Step 1: Write the Benchmark frontmatter and fixed workflow**

Use:

```yaml
---
name: d2c-benchmark
description: Use when a user wants to preview the current model's Figma-to-code output across the fixed PC and mobile benchmark scenarios.
---
```

The Skill must: verify global MCP/scaffold prerequisites; reset latest output once; fetch all four fixed nodes; continue after a single scenario failure; generate only in the matching scaffold; build each app; place four reference PNGs; start the unified preview; and report the one review URL without a verdict.

- [ ] **Step 2: Write the scenario Reference**

Record this fixed table in `references/scenarios.md`:

| Key | Figma URL | Frame | Route | Target |
|---|---|---|---|---|
| `pc-data` | `https://www.figma.com/design/h6yGJDAcQ4vX3fO93nYCLh/%E3%80%90PRD%E3%80%91%E4%BC%81%E5%BE%AE%E5%AE%A2%E6%88%B7%E5%88%97%E8%A1%A8?node-id=320-13867` | width 1400, content height | `/data-management` | React + Ant Design |
| `pc-chart` | `https://www.figma.com/design/Ln2fBahqlpYrUZmwQG4vNy/?node-id=212-8232` | 500 × 320 | `/chart-analytics` | React + Ant Design + ECharts |
| `mobile-content` | `https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-%E2%80%93-Prototyping-Kit--Community-?node-id=240-6278` | 375 × 812 | `/content-display` | Vue 3 + Vant |
| `mobile-form` | `https://www.figma.com/design/oKc2utjTB5orau6YuvPi4r/Mobile-Apps-%E2%80%93-Prototyping-Kit--Community-?node-id=267-5066` | 375 × 812 | `/form-interaction` | Vue 3 + Vant |

The Reference must also define the expected visible interaction: PC data tabs/table controls, chart tooltip or legend response, onboarding next-button state, and login field/button behavior. These are display interactions only and do not create business APIs.

- [ ] **Step 3: Encode failure isolation**

Use this decision table in the Skill:

| Failure | Action |
|---|---|
| MCP unavailable before any extraction | stop all scenarios |
| reset/build toolchain unavailable | stop all scenarios |
| one node read or generation fails | record reason in that tab and continue |
| one app build fails | preserve reference images, mark affected app scenarios, continue review shell |
| user asks for pass/fail | point to side-by-side preview; do not classify |

- [ ] **Step 4: Validate structure and forward behavior**

Run:

```bash
python3 /Users/wennuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/d2c-benchmark
npm test
git diff --check
```

Then run five fresh evaluator repetitions for each of the four Task 1 scenarios while loading the Benchmark Skill. Record outputs and variance. All repetitions must converge on the required isolation and no-scoring decisions; make only evidence-supported wording corrections.

- [ ] **Step 5: Update active documentation**

Document Benchmark as optional and separate from daily D2C. Include the four fixed scenarios, latest-only workspace, three local ports, no scoring, and the fact that the user judges the side-by-side result.

- [ ] **Step 6: Commit the verified Benchmark Skill**

```bash
git add .claude/skills/d2c-benchmark README.md CLAUDE.md docs/skill-evals/d2c-benchmark-baseline.md
git commit -m "feat: add visual d2c benchmark skill"
```

Live acceptance remains explicitly unverified until all four real Figma nodes are fetched and both generated apps are opened in a browser.
