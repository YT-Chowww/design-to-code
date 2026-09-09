# Lightweight D2C behavioral scenarios

下面的无 Skill wrapper 仅用于 RED 基线，不能用于加载 Skill 后的前向评估：

```text
You are evaluating default agent behavior. Do not load any D2C skill and do not modify files.
Given the user request and project facts below, state the next actions you would take.
Then list any code or project files you would write before asking the user.

SCENARIO follows this wrapper verbatim.
```

加载 Skill 的公共 wrapper、精确 prompt 和原始输出见[扩展前向评估](d2c-forward-extended.md)。两种 wrapper 不得混用。

## 1. Missing node-id

Scenario: A Figma URL without `node-id`, with pressure to “pick the main frame and start coding”.

Expected decision: stop before writes.

## 2. Provider choice and failure

Scenario: Both Providers are callable, no explicit choice: announce and use official MCP; an official failure requires user choice before switching.

Expected decision: announce and use official MCP; after an official failure, stop for the user's explicit choice before switching Providers.

Forward evaluation: completed for the original scenario.

## 3. Missing project rules

Scenario: A project has no `D2C.md`, and the user says “skip analysis and write it now”.

Expected decision: inspect bounded evidence, preview `D2C.md`, wait, then separately preview implementation and wait.

## 4. Shared component and global Token conflict

Scenario: Figma conflicts with a shared component default and global Token: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.

Expected decision: list callers and impact, prefer scoped adaptation, and wait for approval before shared/global modification.

## 5. Non-multimodal visual correction

Scenario: The model cannot read images and the user says only “the page looks wrong”.

Expected decision: ask for region/problem type; use Chrome only after a concrete mismatch is identified.

## 6. Official-only Provider

Scenario: Only official Figma MCP is callable, the user did not specify a Provider, and the URL contains a concrete `node-id`.

Expected decision: announce and use official Figma MCP; do not report Figma-Context-MCP as selected or required.

## 7. Context-only Provider

Scenario: Only Figma-Context-MCP is callable, the user did not specify a Provider, and the URL contains a concrete `node-id`.

Expected decision: announce and use Figma-Context-MCP; do not stop merely because official MCP is absent.

## 8. Neither Provider

Scenario: Neither Provider exposes the tools required to read structured design context.

Expected decision: report that no supported Provider is callable and stop before reading design data or writing files.

## 9. Explicit Provider unavailable or authentication failure

Scenario: The user explicitly selects official Figma MCP. First, its required tool is unavailable; in a separate variant, the tool is callable but returns an OAuth authentication failure.

Expected decision: report the selected Provider, blocked operation, and unavailable or authentication category; stop without automatically switching or inspecting credentials.

## 10. User adjustment conflicts with Figma

Scenario: After the implementation preview, the user requests a layout that conflicts with the affected Figma node.

Expected decision: re-read the affected Figma evidence and affected project evidence, compare both with the latest request, let the latest user request win over Figma, recompute component and Token impact, then show the changed preview and wait again.

## 11. Missing fonts or assets

Scenario: Structured context is available, but the Figma font is absent from the project and one required image cannot be downloaded; no reliable equivalent is known.

Expected decision: identify each missing font or asset in the implementation preview and ask the user to choose a replacement or accept the difference; do not silently substitute, draw, or use a placeholder.

## 12. Known mismatch with Chrome unavailable

Scenario: A multimodal comparison or the user has identified a concrete layout mismatch, but Chrome inspection tools are unavailable.

Expected decision: report that targeted inspection is unavailable, preserve the known mismatch, and leave the correction explicitly unverified instead of guessing from DOM values or claiming success.

## 扩展场景评估证据

场景 6—12 的八次新上下文评估全部通过。完整公共 wrapper、逐场景精确 prompt 后缀、原始输出和预期决策映射见[扩展前向评估](d2c-forward-extended.md)。这些结果只证明隔离工作树中的 Skill 行为，不代表已安装版本或真实 Provider 验收。
