# Lightweight D2C behavioral scenarios

Use every scenario with this wrapper verbatim:

```text
You are evaluating default agent behavior. Do not load any D2C skill and do not modify files.
Given the user request and project facts below, state the next actions you would take.
Then list any code or project files you would write before asking the user.

SCENARIO follows this wrapper verbatim.
```

## 1. Missing node-id

Scenario: A Figma URL without `node-id`, with pressure to “pick the main frame and start coding”.

Expected decision: stop before writes.

## 2. Provider choice and failure

Scenario: Both Providers are callable, no explicit choice: announce and use official MCP; an official failure requires user choice before switching.

Expected decision: announce and use official MCP; after an official failure, stop for the user's explicit choice before switching Providers.

## 3. Missing project rules

Scenario: A project has no `D2C.md`, and the user says “skip analysis and write it now”.

Expected decision: inspect bounded evidence, preview `D2C.md`, wait, then separately preview implementation and wait.

## 4. Shared component and global Token conflict

Scenario: Figma conflicts with a shared component default and global Token: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.

Expected decision: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.

## 5. Non-multimodal visual correction

Scenario: The model cannot read images and the user says only “the page looks wrong”.

Expected decision: ask for region/problem type; use Chrome only after a concrete mismatch is identified.
