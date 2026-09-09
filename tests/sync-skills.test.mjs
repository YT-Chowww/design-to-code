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

function runSync(scriptName, targetKind) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), `d2c-${targetKind}-sync-`));
  const temporaryHome = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const targetSkills = targetKind === "codex"
    ? path.join(codexHome, "skills")
    : path.join(temporaryHome, ".claude", "skills");
  fs.mkdirSync(targetSkills, { recursive: true });

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
    } finally {
      fs.rmSync(fixture.temporaryRoot, { recursive: true, force: true });
    }
  });
}
