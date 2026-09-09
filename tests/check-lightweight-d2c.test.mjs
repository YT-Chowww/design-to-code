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
      writeFile(root, requiredFile, "# Fixture\n");
    }

    writeFile(root, "README.md", "# Current workflow\n");
    writeFile(root, "CLAUDE.md", "# Current workflow\n");
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
