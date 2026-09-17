import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const retiredNames = [
  "d2c-init",
  "d2c-extract",
  "d2c-generate",
  "d2c-merge",
  "d2c-validate",
  "d2c-verify",
];

test("repository keeps .claude/skills as the only Skill source", () => {
  assert.equal(fs.existsSync(path.join(repositoryRoot, ".claude", "skills", "d2c", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, ".claude", "skills", "d2c", "references", "mcp-setup.md")), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, ".claude", "skills", "d2c", "assets", "mcp.example.json")), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, ".claude", "skills", "d2c-benchmark", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, "skills")), false);
});

function runSync(scriptName, targetKind) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `d2c-${targetKind}-sync-`));
  const temporaryHome = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const targetSkills = targetKind === "codex"
    ? path.join(codexHome, "skills")
    : path.join(temporaryHome, ".claude", "skills");
  fs.mkdirSync(targetSkills, { recursive: true });

  fs.symlinkSync(
    path.join(repositoryRoot, ".claude", "skills", "d2c"),
    path.join(targetSkills, "d2c"),
  );
  fs.symlinkSync(
    path.relative(fs.realpathSync(targetSkills), path.join(repositoryRoot, ".claude", "skills", "d2c-benchmark")),
    path.join(targetSkills, "d2c-benchmark"),
  );

  const exactName = retiredNames[0];
  const relativeName = retiredNames[1];
  const foreignName = retiredNames[2];
  const directoryName = retiredNames[3];
  const fileName = retiredNames[4];
  fs.symlinkSync(
    path.join(repositoryRoot, ".claude", "skills", exactName),
    path.join(targetSkills, exactName),
  );
  fs.symlinkSync(
    path.relative(fs.realpathSync(targetSkills), path.join(repositoryRoot, ".claude", "skills", relativeName)),
    path.join(targetSkills, relativeName),
  );
  fs.symlinkSync(
    path.join(temporaryRoot, "another-repository", foreignName),
    path.join(targetSkills, foreignName),
  );
  fs.mkdirSync(path.join(targetSkills, directoryName));
  fs.writeFileSync(path.join(targetSkills, fileName), "owned by the user\n");

  const result = spawnSync("bash", [path.join(repositoryRoot, "scripts", scriptName)], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: temporaryHome,
      CODEX_HOME: codexHome,
    },
  });

  return { result, temporaryRoot, targetSkills, exactName, relativeName, foreignName, directoryName, fileName };
}

function pathEntryExists(entryPath) {
  try {
    fs.lstatSync(entryPath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

for (const [scriptName, targetKind] of [
  ["sync-codex-skills.sh", "codex"],
  ["sync-claude-skills.sh", "claude"],
]) {
  test(`${scriptName} removes only retired links managed by this repository`, () => {
    const fixture = runSync(scriptName, targetKind);
    try {
      assert.equal(fixture.result.status, 0, fixture.result.stderr || fixture.result.stdout);
      assert.equal(pathEntryExists(path.join(fixture.targetSkills, fixture.exactName)), false);
      assert.equal(pathEntryExists(path.join(fixture.targetSkills, fixture.relativeName)), false);
      assert.equal(fs.lstatSync(path.join(fixture.targetSkills, fixture.foreignName)).isSymbolicLink(), true);
      assert.equal(fs.statSync(path.join(fixture.targetSkills, fixture.directoryName)).isDirectory(), true);
      assert.equal(fs.readFileSync(path.join(fixture.targetSkills, fixture.fileName), "utf8"), "owned by the user\n");
      for (const skillName of ["d2c", "d2c-benchmark"]) {
        const installedSkill = path.join(fixture.targetSkills, skillName);
        assert.equal(fs.lstatSync(installedSkill).isSymbolicLink(), true);
        assert.equal(fs.realpathSync(installedSkill), path.join(repositoryRoot, ".claude", "skills", skillName));
      }
    } finally {
      fs.rmSync(fixture.temporaryRoot, { recursive: true, force: true });
    }
  });
}

for (const [scriptName, targetKind] of [
  ["sync-codex-skills.sh", "codex"],
  ["sync-claude-skills.sh", "claude"],
]) {
  test(`${scriptName} also removes retired links from the former root source`, () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `d2c-${targetKind}-current-root-`));
    const temporaryHome = path.join(temporaryRoot, "home");
    const codexHome = path.join(temporaryRoot, "codex");
    const targetSkills = targetKind === "codex"
      ? path.join(codexHome, "skills")
      : path.join(temporaryHome, ".claude", "skills");
    fs.mkdirSync(targetSkills, { recursive: true });
    fs.symlinkSync(path.join(repositoryRoot, "skills", retiredNames[0]), path.join(targetSkills, retiredNames[0]));
    fs.symlinkSync(
      path.relative(fs.realpathSync(targetSkills), path.join(repositoryRoot, "skills", retiredNames[1])),
      path.join(targetSkills, retiredNames[1]),
    );

    try {
      const result = spawnSync("bash", [path.join(repositoryRoot, "scripts", scriptName)], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, HOME: temporaryHome, CODEX_HOME: codexHome },
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.equal(pathEntryExists(path.join(targetSkills, retiredNames[0])), false);
      assert.equal(pathEntryExists(path.join(targetSkills, retiredNames[1])), false);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
}

test("Claude sync removes owned retired rules without publishing global rules", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-retired-rules-"));
  const cases = ["owned", "relative", "foreign", "file", "directory", "absent"];
  try {
    for (const kind of cases) {
      const temporaryHome = path.join(temporaryRoot, kind);
      const targetRules = path.join(temporaryHome, ".claude", "rules");
      fs.mkdirSync(targetRules, { recursive: true });
      for (const name of ["coding-conventions.md", "d2c-workflow.md"]) {
        const entry = path.join(targetRules, name);
        const source = path.join(repositoryRoot, ".claude", "rules", name);
        if (kind === "owned") fs.symlinkSync(source, entry);
        if (kind === "relative") fs.symlinkSync(path.relative(fs.realpathSync(targetRules), source), entry);
        if (kind === "foreign") fs.symlinkSync(path.join(temporaryRoot, "foreign", name), entry);
        if (kind === "file") fs.writeFileSync(entry, "user rule\n");
        if (kind === "directory") fs.mkdirSync(entry);
      }
      const result = spawnSync("bash", [path.join(repositoryRoot, "scripts/sync-claude-skills.sh")], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, HOME: temporaryHome },
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      for (const name of ["coding-conventions.md", "d2c-workflow.md"]) {
        const entry = path.join(targetRules, name);
        if (["owned", "relative", "absent"].includes(kind)) assert.equal(pathEntryExists(entry), false, kind);
        if (kind === "foreign") assert.equal(fs.readlinkSync(entry), path.join(temporaryRoot, "foreign", name));
        if (kind === "file") assert.equal(fs.readFileSync(entry, "utf8"), "user rule\n");
        if (kind === "directory") assert.equal(fs.lstatSync(entry).isDirectory(), true);
      }
    }
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
