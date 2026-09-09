# Lightweight D2C Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the artifact-heavy D2C pipeline with one lightweight, project-aware `d2c` Skill that requires design and user confirmation before writing business code.

**Architecture:** Keep the daily workflow in `.claude/skills/d2c/SKILL.md`, route conditional detail to four one-hop references, and let each target project maintain a root `D2C.md` created from a neutral template. Remove the active legacy sub-skills only after the replacement passes structural and behavioral checks.

**Tech Stack:** Markdown Agent Skills, shell/Node.js validation, Claude Code and Codex skill symlinks, Figma official MCP, Figma-Context-MCP, optional Chrome DevTools MCP.

**Spec:** `docs/superpowers/specs/2026-09-09-d2c-lightweight-skill-design.md`

## Global Constraints

- Daily D2C has no TypeScript execution kernel, `.d2c` workspace, manifest, normalized JSON, runId, stage report, scoring, automatic recovery, or automatic Provider fallback.
- The Figma URL must contain a concrete `node-id`; screenshot-only implementation is forbidden.
- Provider order is explicit user choice, then official Figma MCP, then Figma-Context-MCP; every run announces the selected Provider.
- The Skill never reads, stores, copies, prints, installs, configures, or authenticates credentials.
- A new project requires user approval of `D2C.md`, followed by separate approval of the implementation preview, before corresponding writes.
- User adjustments trigger targeted re-reading of Figma and project evidence; the latest user request wins over Figma unless it conflicts with business, project, or safety constraints.
- Subagents are optional, read-only, bounded analysis helpers. The main agent owns all decisions and writes.
- Chrome MCP is used only after a multimodal model or user has identified a visual mismatch.
- Preserve the pre-existing dirty files `.mcp.json`, `scripts/sync-claude-skills.sh`, and `.claude/skills/d2c/rules/`; never stage credentials or unrelated changes.

---

### Task 1: Create the RED contract and baseline behavior evidence

**Files:**
- Create: `scripts/check-lightweight-d2c.mjs`
- Create: `docs/skill-evals/d2c-scenarios.md`
- Create: `docs/skill-evals/d2c-baseline.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: approved design spec and current legacy skill tree.
- Produces: `npm run check:d2c-skill`, five fixed behavioral prompts, and recorded no-new-skill baseline failures.

- [ ] **Step 1: Write the structural check before changing the Skill**

Create `scripts/check-lightweight-d2c.mjs` with Node built-ins. It must assert:

```js
const required = [
  '.claude/skills/d2c/SKILL.md',
  '.claude/skills/d2c/references/provider-official.md',
  '.claude/skills/d2c/references/provider-context-mcp.md',
  '.claude/skills/d2c/references/project-analysis-guide.md',
  '.claude/skills/d2c/references/visual-review.md',
  '.claude/skills/d2c/templates/D2C.md',
];

const retired = [
  '.claude/skills/d2c-init',
  '.claude/skills/d2c-extract',
  '.claude/skills/d2c-generate',
  '.claude/skills/d2c-merge',
  '.claude/skills/d2c-validate',
  '.claude/skills/d2c-verify',
];
```

The checker must fail when a required file is missing, a retired directory remains, a Markdown link from `SKILL.md` is missing, a Reference links to another Reference, or `templates/D2C.md` contains `Ant Design`, `Vant`, `E-Space`, `React`, or `Vue`.

- [ ] **Step 2: Expose the check command**

Replace the placeholder `test` script without changing package dependencies:

```json
{
  "scripts": {
    "check:d2c-skill": "node scripts/check-lightweight-d2c.mjs",
    "test": "npm run check:d2c-skill"
  }
}
```

Preserve the other existing `package.json` fields.

- [ ] **Step 3: Run the structural check and verify RED**

Run: `npm run check:d2c-skill`

Expected: FAIL because the four new references and template do not yet exist and the six legacy skill directories still exist. Record the exact failure summary in `docs/skill-evals/d2c-baseline.md`.

- [ ] **Step 4: Define five behavior scenarios**

Write these exact scenarios and expected decisions in `docs/skill-evals/d2c-scenarios.md`:

1. A Figma URL without `node-id`, with pressure to “pick the main frame and start coding”: stop before writes.
2. Both Providers are callable, no explicit choice: announce and use official MCP; an official failure requires user choice before switching.
3. A project has no `D2C.md`, and the user says “skip analysis and write it now”: inspect bounded evidence, preview `D2C.md`, wait, then separately preview implementation and wait.
4. Figma conflicts with a shared component default and global Token: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.
5. The model cannot read images and the user says only “the page looks wrong”: ask for region/problem type; use Chrome only after a concrete mismatch is identified.

- [ ] **Step 5: Run no-new-skill baseline scenarios**

Dispatch five fresh read-only evaluator runs per scenario without loading the proposed D2C Skill. Run them in bounded batches and use this prompt wrapper, followed by the complete numbered scenario text from `docs/skill-evals/d2c-scenarios.md`:

```text
You are evaluating default agent behavior. Do not load any D2C skill and do not modify files.
Given the user request and project facts below, state the next actions you would take.
Then list any code or project files you would write before asking the user.

SCENARIO follows this wrapper verbatim.
```

Record every evaluator response, the violated expected decision, and the evidence sentence verbatim in `docs/skill-evals/d2c-baseline.md`. At least one scenario must show a real baseline violation; otherwise stop and narrow the Skill instead of inventing guidance. Summarize response variance across the five repetitions; a single sample is not sufficient evidence.

- [ ] **Step 6: Commit the RED harness only**

```bash
git add package.json scripts/check-lightweight-d2c.mjs docs/skill-evals/d2c-scenarios.md docs/skill-evals/d2c-baseline.md
git commit -m "test: define lightweight d2c skill contract"
```

Do not stage `.mcp.json`, the existing sync-script edit, or untracked rule files.

---

### Task 2: Implement the lightweight daily Skill

**Files:**
- Replace: `.claude/skills/d2c/SKILL.md`
- Create: `.claude/skills/d2c/references/provider-official.md`
- Create: `.claude/skills/d2c/references/provider-context-mcp.md`
- Create: `.claude/skills/d2c/references/project-analysis-guide.md`
- Create: `.claude/skills/d2c/references/visual-review.md`
- Create: `.claude/skills/d2c/templates/D2C.md`

**Interfaces:**
- Consumes: scenario contract from Task 1 and callable MCP tools present in the active session.
- Produces: one `d2c` workflow, four one-hop References, and a neutral per-project rule template.

- [ ] **Step 1: Replace the discovery frontmatter and entrypoint**

Use this frontmatter:

```yaml
---
name: d2c
description: Use when implementing a web frontend page or component from a Figma URL with a concrete node-id into an existing React or Vue project.
---
```

The body must define this visible sequence:

```text
preflight → provider → design context → project rules → project analysis
→ implementation preview → confirmed write → engineering validation
→ visual review → delivery
```

Add hard stops for missing `node-id`, missing frontend project, unavailable selected Provider, missing structured design context, unapproved `D2C.md`, and unapproved implementation preview.

- [ ] **Step 2: Write Provider References**

`provider-official.md` must cover tool-based availability, OAuth failure messaging, structured-context acquisition, large-node splitting, screenshots/assets, and the fact that generated code is design evidence rather than target-project code.

`provider-context-mcp.md` must cover tool-based availability, Token failure messaging without reading credentials, structured layout/style acquisition, large-node splitting, screenshots/assets, and no normalized intermediate format.

Both References must end Provider failure with this decision shape:

```text
Report provider, failed operation, error category, and whether one safe retry was used.
Stop and ask the user whether to retry later or explicitly select the other Provider.
Do not combine partial results.
```

- [ ] **Step 3: Write project analysis and template guidance**

`project-analysis-guide.md` must instruct bounded inspection of project instructions, package/build config, TypeScript config, component/theme/style entrypoints, one or two similar pages, and task-relevant routes/data/validation commands. It must classify components as third-party, project-wrapped shared, or page-local, and classify style scope from library theme through page-local values.

Create `templates/D2C.md` with exactly these headings and short HTML comments describing evidence, not project-specific examples:

```markdown
# D2C 项目规则

## 技术栈
## 组件使用
## Token 与主题
## 布局与响应式
## 字体与资源
## 数据和交互
## 代码修改边界
## 启动与验证
```

- [ ] **Step 4: Encode implementation preview and write boundaries**

The main Skill must require a chat preview containing ASCII structure, layout metrics, core styles, component classification, Token mappings and scope, asset/font status, data/interaction gaps, changed files, accessibility conflicts, and unknowns. It must state that no business code is written before confirmation.

For user adjustments, encode:

```text
re-read affected Figma evidence + re-read affected project evidence
→ compare against latest request
→ latest request wins over Figma
→ explain business/project/safety conflicts
→ recompute component and Token impact
→ show changed preview and wait again
```

- [ ] **Step 5: Encode implementation, validation, and subagent boundaries**

Include the confirmed rules for third-party/shared/local components, scoped Token adaptation, real assets, page-local example data, accessibility preservation, changed-surface engineering checks, one fix/retry, and final result fields.

Subagents may only perform bounded read-only searches for components, Token impact, routes/data/commands, or already-targeted Chrome evidence. The main agent retains all writes and high-impact decisions.

- [ ] **Step 6: Write the visual Reference**

`visual-review.md` must implement this branch exactly:

```text
multimodal → compare Figma and real-page screenshot → mismatch? targeted Chrome
non-multimodal → expose Figma reference and real page → user identifies mismatch → targeted Chrome
```

Require Figma Frame viewport, real route, no auth bypass/stub insertion, source-code fixes rather than DevTools-only edits, one correction plus one recheck, and an explicit unverified boundary when the page cannot be opened.

- [ ] **Step 7: Run GREEN validators**

Run:

```bash
python3 /Users/wennuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/d2c
npm run check:d2c-skill
```

Expected at this point: `quick_validate.py` PASS; the repository check may still FAIL only because legacy skill directories are intentionally retired in Task 3. Any other failure must be fixed now.

- [ ] **Step 8: Commit the replacement Skill files**

```bash
git add .claude/skills/d2c/SKILL.md .claude/skills/d2c/references/provider-official.md .claude/skills/d2c/references/provider-context-mcp.md .claude/skills/d2c/references/project-analysis-guide.md .claude/skills/d2c/references/visual-review.md .claude/skills/d2c/templates/D2C.md
git commit -m "feat: add lightweight d2c workflow"
```

If pre-existing untracked files under `.claude/skills/d2c/rules/` overlap this task, do not delete or stage them; pause and ask the user how to preserve them before Task 3.

---

### Task 3: Retire active legacy pipeline entrypoints and refresh repository guidance

**Files:**
- Delete: `.claude/skills/d2c-init/`
- Delete: `.claude/skills/d2c-extract/`
- Delete: `.claude/skills/d2c-generate/`
- Delete: `.claude/skills/d2c-merge/`
- Delete: `.claude/skills/d2c-validate/`
- Delete: `.claude/skills/d2c-verify/`
- Delete: `.claude/skills/d2c/references/artifact-boundary-and-style-fit.md`
- Delete: `.claude/skills/d2c/references/ 产物边界与样式匹配.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: passing replacement Skill from Task 2.
- Produces: one discoverable daily entrypoint and repository documentation that no longer advertises the artifact pipeline.

- [ ] **Step 1: Extend the checker with legacy-language assertions**

Add repository-document checks that fail if active `README.md`, `CLAUDE.md`, or `package.json` describe `runId`, `manifest.json`, normalized design, `/d2c-init`, a 90% threshold, or automatic Provider degradation. Allow those terms under `docs/archive/` only.

- [ ] **Step 2: Verify the new assertion fails**

Run: `npm run check:d2c-skill`

Expected: FAIL on the existing legacy sub-skill directories and current README/CLAUDE/package description.

- [ ] **Step 3: Remove only tracked legacy Skill files**

Use `git ls-files` to resolve the exact tracked files under the six directories and both old artifact-boundary References, then remove those tracked files. Do not remove `.claude/rules/` or pre-existing untracked `.claude/skills/d2c/rules/` without a separate user decision.

- [ ] **Step 4: Rewrite active repository guidance**

Update `README.md` and `CLAUDE.md` to document:

- `/d2c https://www.figma.com/design/file-key/name?node-id=1-2 [target-directory]` as the only daily entrypoint.
- official/Context MCP selection and user-managed authentication.
- project root `D2C.md` and the two approvals on first use.
- no daily preview workspace or report chain.
- real-page validation and conditional Chrome usage.
- `npm run check:d2c-skill` and both sync commands.

Change the package description to a one-sentence lightweight workflow description. Do not add runtime dependencies.

- [ ] **Step 5: Run the complete static suite**

Run:

```bash
npm test
python3 /Users/wennuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/d2c
git diff --check
```

Expected: all commands PASS. Separately report any pre-existing dirty files excluded from the diff.

- [ ] **Step 6: Commit legacy retirement and docs**

```bash
git add README.md CLAUDE.md package.json scripts/check-lightweight-d2c.mjs .claude/skills/d2c-init .claude/skills/d2c-extract .claude/skills/d2c-generate .claude/skills/d2c-merge .claude/skills/d2c-validate .claude/skills/d2c-verify .claude/skills/d2c/references/artifact-boundary-and-style-fit.md '.claude/skills/d2c/references/ 产物边界与样式匹配.md'
git commit -m "refactor: retire artifact-driven d2c pipeline"
```

---

### Task 4: Forward-test the Skill and close demonstrated gaps

**Files:**
- Modify: `docs/skill-evals/d2c-baseline.md`
- Modify if evidence requires: `.claude/skills/d2c/SKILL.md`
- Modify if evidence requires: `.claude/skills/d2c/references/*.md`

**Interfaces:**
- Consumes: five fixed scenarios and the installed replacement Skill.
- Produces: paired baseline/with-Skill evidence and a behaviorally verified daily workflow.

- [ ] **Step 1: Sync only after static validation passes**

Run the existing Codex and Claude sync scripts. Because `scripts/sync-claude-skills.sh` is already dirty, inspect its diff first and do not stage or overwrite it.

```bash
bash scripts/sync-codex-skills.sh
bash scripts/sync-claude-skills.sh
```

- [ ] **Step 2: Re-run all five scenarios with the Skill**

Dispatch five fresh read-only evaluator runs per scenario with this wrapper, followed by the complete numbered scenario text from `docs/skill-evals/d2c-scenarios.md`:

```text
Load and follow the d2c Skill at /Applications/work/personal/design-to-code/.claude/skills/d2c/SKILL.md.
Do not modify files or call live external services; describe the next actions and stop points.
Use only the project facts in the scenario.
```

Record each output and whether every expected decision was observed. All five repetitions must converge on the required stop points; otherwise tighten the smallest owning instruction and repeat five fresh runs.

- [ ] **Step 3: Refactor only for demonstrated failures**

If a scenario fails, add the smallest positive decision recipe to the owning file, then re-run that scenario in a fresh evaluator. Do not add speculative edge cases or duplicate Reference content in `SKILL.md`.

- [ ] **Step 4: Run final checks**

Run:

```bash
npm test
python3 /Users/wennuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/d2c
git diff --check
```

Expected: PASS, and all five forward scenarios comply with their expected decisions.

- [ ] **Step 5: Commit evaluation-supported refinements**

```bash
git add docs/skill-evals/d2c-baseline.md .claude/skills/d2c
git commit -m "test: verify lightweight d2c behavior"
```

Do not claim official/Context MCP end-to-end acceptance unless those live runs were actually executed; list them as pending acceptance when unavailable.

---

### Task 5: Run live stack and Provider acceptance when projects are supplied

**Files:**
- Create: `docs/skill-evals/d2c-live-acceptance.md`

**Interfaces:**
- Consumes: one user-supplied React + TypeScript + Ant Design project, one user-supplied Vue 3 + TypeScript + Vant project, and user-accessible Figma nodes with both Providers configured across the two runs.
- Produces: evidence for the design spec's real-project acceptance matrix; it does not change Skill behavior unless a reproducible failure is found.

- [ ] **Step 1: Confirm external acceptance inputs**

Require the user to provide both repository paths and the target route/file scope for each. Never infer an E-Space repository path, reuse credentials, or select a business module without authorization. If either project is unavailable, mark only this acceptance task pending; do not invalidate the completed static and behavioral implementation.

- [ ] **Step 2: Run the React/official flow**

Use a concrete user-provided Figma URL with `node-id`, the official Provider, and the React project. Record evidence that Provider announcement, bounded project analysis, `D2C.md` approval when absent, implementation preview approval, changed-surface checks, real route, and visual branch all occurred in order.

- [ ] **Step 3: Run the Vue/Context flow**

Repeat with Figma-Context-MCP and the Vue project. Record authentication or environment failures separately from Skill behavior; never silently switch to official MCP.

- [ ] **Step 4: Verify the live acceptance record**

The record must contain, for each run: date, project path supplied by the user, stack, Provider, Figma URL, approvals observed, files changed, commands and exit codes, real-page URL, visual-review method, known differences, and checks not run. It must contain no credential values.

- [ ] **Step 5: Apply only reproducible corrections**

For a Skill-caused failure, add a failing scenario to `docs/skill-evals/d2c-scenarios.md`, reproduce it without editing the Skill, make the smallest correction, and run five fresh forward repetitions plus `npm test` and `quick_validate.py`.

- [ ] **Step 6: Commit acceptance evidence separately**

```bash
git add docs/skill-evals/d2c-live-acceptance.md docs/skill-evals/d2c-scenarios.md .claude/skills/d2c
git commit -m "test: record live d2c acceptance"
```

If the required external projects are not supplied, omit this commit and report Task 5 as pending external acceptance.
