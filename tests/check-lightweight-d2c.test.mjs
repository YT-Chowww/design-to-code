import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(new URL("../scripts/check-lightweight-d2c.mjs", import.meta.url));
const requiredFiles = [
  ".claude/skills/d2c/SKILL.md",
  ".claude/skills/d2c/references/provider-official.md",
  ".claude/skills/d2c/references/provider-context-mcp.md",
  ".claude/skills/d2c/references/project-analysis-guide.md",
  ".claude/skills/d2c/references/visual-review.md",
  ".claude/skills/d2c/templates/D2C.md",
  "docs/skill-evals/d2c-forward-extended.md",
];

const validSkill = `---
name: d2c
description: Use when implementing a web frontend page or component from a Figma URL with a concrete node-id into an identifiable existing Web frontend project.
---

# D2C

Initial validated scope: React + TypeScript and Vue 3 + TypeScript. Other identifiable existing Web frontend projects follow the same evidence-based flow.

When both Providers are callable, use official. When official only is callable, use official. When Context only is callable, use Figma-Context-MCP. When neither Provider is callable, stop. An explicitly selected unavailable Provider or authentication failure must stop without switching.

When a user adjustment conflicts with Figma, re-read affected Figma and project evidence; the latest user request wins over Figma. Missing fonts or assets must be reported for the user to choose a replacement or accept the difference, without silent substitution.
`;

const validOfficialProvider = `# Official provider

Prefer an existing Code Connect mapping only after verifying that it matches the current project code. Creating mappings is out of scope and remains a TODO.
`;

const validVisualReview = `# Visual review

When a known mismatch exists but Chrome is unavailable, preserve the mismatch, report unavailable targeted inspection, and mark the correction unverified without guessing.
`;

const validScenarios = `# Scenarios

## Missing node-id
Stop before writes when node-id is missing.

## Both providers
Use official when both providers are callable.

## Official only
Use official when only official is callable.

## Context only
Use Figma-Context-MCP when only Context is callable.

## Neither provider
Stop when neither provider is callable.

## Explicit provider unavailable or authentication failure
Stop and report the selected provider and authentication category without switching.

## Missing project rules
Preview D2C.md and wait before implementation preview.

## User adjustment conflicts with Figma
Re-read affected Figma and project evidence; the latest user request wins over Figma.

## Shared component and global Token conflict
List callers and impact, prefer scoped adaptation, and wait before shared changes.

## Missing fonts or assets
Report the missing font or asset and wait for the user to choose a replacement or accept the difference.

## Non-multimodal visual correction
Ask the user to identify a concrete mismatch before using Chrome.

## Known mismatch with Chrome unavailable
Report that targeted inspection is unavailable and leave the visual correction unverified.
`;

const activeDocs = [
  "README.md",
  "CLAUDE.md",
  "docs/README.md",
  "docs/operation-guide.md",
  "docs/verification.md",
];

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function runChecker(relativePath, phrase) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-checker-"));

  try {
    for (const requiredFile of requiredFiles) {
      const content = requiredFile.endsWith("SKILL.md")
        ? validSkill
        : requiredFile.endsWith("provider-official.md")
          ? validOfficialProvider
          : requiredFile.endsWith("visual-review.md")
            ? validVisualReview
          : "# Fixture\n";
      writeFile(root, requiredFile, content);
    }

    for (const activeDoc of activeDocs) {
      writeFile(root, activeDoc, "# Current lightweight workflow\n");
    }
    writeFile(root, "docs/skill-evals/d2c-scenarios.md", validScenarios);
    writeFile(root, "package.json", JSON.stringify({ description: "Current workflow" }));
    writeFile(
      root,
      relativePath,
      relativePath === "package.json" ? JSON.stringify({ description: phrase }) : `${phrase}\n`,
    );

    return spawnSync(process.execPath, [checkerPath], {
      cwd: root,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("rejects unresolved forward-evaluation placeholders", () => {
  const result = runChecker(
    "docs/skill-evals/d2c-scenarios.md",
    `${validScenarios}\nForward evaluation: PENDING.\n`,
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /forward evaluation remains PENDING/u);
});

test("rejects legacy pipeline guidance from active operational docs", () => {
  const result = runChecker("docs/operation-guide.md", "Run /d2c-extract and resume from the stage report.");

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /active repository document describes legacy/u);
});

test("requires provider availability and missing-evidence behavior scenarios", () => {
  const result = runChecker(
    "docs/skill-evals/d2c-scenarios.md",
    "# Scenarios\n\n## Missing node-id\nStop before writes.\n",
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /behavior scenario is missing/u);
});

test("rejects a React-or-Vue-only Skill precondition", () => {
  const result = runChecker(
    ".claude/skills/d2c/SKILL.md",
    "---\nname: d2c\ndescription: Use in an existing React or Vue project.\n---\n",
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /framework scope/u);
});

test("requires Code Connect mappings to be verified against current project code", () => {
  const result = runChecker(
    ".claude/skills/d2c/references/provider-official.md",
    "# Official provider\n\nPrefer existing Code Connect mappings.\n",
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /Code Connect/u);
});

test("requires the Provider availability decision matrix in the Skill", () => {
  const result = runChecker(
    ".claude/skills/d2c/SKILL.md",
    validSkill.replace("When Context only is callable, use Figma-Context-MCP. ", ""),
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /Skill behavior rule is missing: Context-only Provider/u);
});

test("requires user adjustments to override conflicting Figma evidence", () => {
  const result = runChecker(
    ".claude/skills/d2c/SKILL.md",
    validSkill.replace(/When a user adjustment[^\n]+\n/u, ""),
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /Skill behavior rule is missing: user adjustment/u);
});

test("requires an explicit unverified boundary when Chrome is unavailable", () => {
  const result = runChecker(
    ".claude/skills/d2c/references/visual-review.md",
    "# Visual review\n\nUse Chrome after a mismatch.\n",
  );

  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /Skill behavior rule is missing: Chrome unavailable/u);
});

const forbiddenCases = [
  ["README.md", "Visual comparison passes when similarity reaches 84%."],
  ["README.md", "Set the visual score threshold to 75."],
  ["README.md", "Fidelity below 0.8 fails the review."],
  ["README.md", "视觉匹配度达到 92 分即通过。"],
  ["README.md", "视觉还原度 ≥ 0.85。"],
  ["CLAUDE.md", "If the official Provider fails, switch to Figma-Context-MCP automatically."],
  ["CLAUDE.md", "When the official Provider is unavailable, fall back to Figma-Context-MCP."],
  ["CLAUDE.md", "On Provider failure, use Figma-Context-MCP instead."],
  ["CLAUDE.md", "官方 Provider 失败时自动改用 Figma-Context-MCP。"],
  ["CLAUDE.md", "官方 Provider 不可用时切换到 Figma-Context-MCP。"],
];

for (const [relativePath, phrase] of forbiddenCases) {
  test(`rejects legacy guidance: ${phrase}`, () => {
    const result = runChecker(relativePath, phrase);

    assert.equal(result.status, 1, result.stdout || result.stderr);
    assert.match(result.stderr, /active repository document describes legacy/u);
  });
}

const allowedCases = [
  ["README.md", "Use Node.js 22 and validate the page at a 1440 x 900 viewport."],
  ["README.md", "Visual review compares 2 screenshots at the target viewport."],
  ["README.md", "There are no degradation paths."],
  ["package.json", "No automatic Provider fallback is allowed."],
  ["package.json", "Provider fallback is not automatic."],
  ["CLAUDE.md", "Provider 失败后不自动改用 Figma-Context-MCP。"],
  ["CLAUDE.md", "If the Provider fails, stop and let the user choose another Provider."],
];

for (const [relativePath, phrase] of allowedCases) {
  test(`allows current guidance: ${phrase}`, () => {
    const result = runChecker(relativePath, phrase);

    assert.equal(result.status, 0, result.stdout || result.stderr);
  });
}
