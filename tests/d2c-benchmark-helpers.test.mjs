import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

const root = process.cwd();
const resetScript = path.join(root, ".claude/skills/d2c-benchmark/scripts/reset-latest.sh");
const startScript = path.join(root, ".claude/skills/d2c-benchmark/scripts/start-preview.sh");

function removeTemporary(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function makeTrustedTemporary(prefix) {
  return fs.mkdtempSync(path.join("/tmp", prefix));
}

function waitFor(predicate, message, timeout = 4000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
      } else if (Date.now() - started >= timeout) {
        reject(new Error(message));
      } else {
        setTimeout(poll, 20);
      }
    };
    poll();
  });
}

function previewLogDirectories(ownerPid) {
  return new Set(
    fs.readdirSync("/tmp", { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`d2c-preview-logs.${ownerPid}.`))
      .map((entry) => path.join("/tmp", entry.name)),
  );
}

test("reset authorization ignores poisoned TMPDIR and HOME", () => {
  const poisonRoot = fs.mkdtempSync(path.join(os.tmpdir(), "d2c-env-poison-"));
  const poisonTarget = path.join(poisonRoot, "victim");
  const poisonMarker = path.join(poisonTarget, "marker.txt");
  const fakeHome = path.join(poisonRoot, "fake-home");
  fs.mkdirSync(poisonTarget);
  fs.mkdirSync(fakeHome);
  fs.writeFileSync(poisonMarker, "must survive\n");

  try {
    const rejected = spawnSync("bash", [resetScript, poisonTarget], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TMPDIR: poisonRoot, HOME: fakeHome },
    });
    assert.notEqual(rejected.status, 0);
    assert.equal(fs.readFileSync(poisonMarker, "utf8"), "must survive\n");

    const trustedRoot = makeTrustedTemporary("d2c-trusted-reset-");
    try {
      const trustedTarget = path.join(trustedRoot, "latest");
      fs.mkdirSync(trustedTarget);
      fs.writeFileSync(path.join(trustedTarget, "stale.txt"), "replace\n");
      const accepted = spawnSync("bash", [resetScript, trustedTarget], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, TMPDIR: poisonRoot, HOME: trustedTarget },
      });
      assert.equal(accepted.status, 0, accepted.stderr);
      assert.equal(fs.existsSync(path.join(trustedTarget, "stale.txt")), false);
      assert.equal(fs.existsSync(path.join(trustedTarget, "review")), true);
    } finally {
      removeTemporary(trustedRoot);
    }
  } finally {
    removeTemporary(poisonRoot);
  }
});

function createFakePreviewFixture(name, modes) {
  const fixtureRoot = makeTrustedTemporary(`d2c-preview-${name}-`);
  const workspace = path.join(fixtureRoot, "latest");
  const fakeBin = path.join(fixtureRoot, "bin");
  const processDir = path.join(fixtureRoot, "processes");
  for (const directory of ["pc", "mobile", "review", "references", fakeBin, processDir]) {
    fs.mkdirSync(path.isAbsolute(directory) ? directory : path.join(workspace, directory), { recursive: true });
  }
  for (const application of ["pc", "mobile"]) {
    const vite = path.join(workspace, application, "node_modules/vite/bin/vite.js");
    fs.mkdirSync(path.dirname(vite), { recursive: true });
    fs.writeFileSync(vite, "// fake fixture entry\n");
  }

  const fakeService = `#!/bin/sh
case "$*" in
  *4173*) service=pc; mode="$FAKE_PC_MODE" ;;
  *4174*) service=mobile; mode="$FAKE_MOBILE_MODE" ;;
  *) service=unknown; mode=initial-fail ;;
esac
echo $$ > "$FAKE_PROCESS_DIR/$service.pid"
if [ "$mode" = initial-fail ]; then exit 7; fi
if [ "$mode" = later-fail ] || [ "$mode" = http-error-later-fail ]; then sleep 0.35; exit 8; fi
if [ "$mode" = ignore-signals ]; then trap '' INT TERM; else
trap 'touch "$FAKE_PROCESS_DIR/'"$service"'.stopped"; exit 0' INT TERM
fi
while :; do sleep 0.05; done
`;
  const fakeReview = `#!/bin/sh
echo $$ > "$FAKE_PROCESS_DIR/review.pid"
if [ "$FAKE_REVIEW_MODE" = ignore-signals ]; then trap '' INT TERM; else
trap 'touch "$FAKE_PROCESS_DIR/review.stopped"; exit 0' INT TERM
fi
while :; do sleep 0.05; done
`;
  const fakeCurl = `#!/bin/sh
case "$*" in
  *4173*) mode="$FAKE_PC_MODE" ;;
  *4174*) mode="$FAKE_MOBILE_MODE" ;;
  *4172*) mode=healthy ;;
  *) exit 1 ;;
esac
if [ "$mode" = initial-fail ]; then exit 1; fi
if [ "$mode" = http-error ] || [ "$mode" = http-error-later-fail ]; then printf 500; else printf 200; fi
`;
  for (const [file, content] of [["node", fakeService], ["python3", fakeReview], ["curl", fakeCurl]]) {
    fs.writeFileSync(path.join(fakeBin, file), content, { mode: 0o755 });
  }

  const child = spawn("bash", [startScript, workspace], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      TMPDIR: "/tmp",
      FAKE_PC_MODE: modes.pc,
      FAKE_MOBILE_MODE: modes.mobile,
      FAKE_REVIEW_MODE: modes.review ?? "healthy",
      FAKE_PROCESS_DIR: processDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const exit = once(child, "exit");

  return {
    child,
    exit,
    fixtureRoot,
    workspace,
    processDir,
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

async function stopFixture(fixture) {
  if (fixture.child.exitCode === null && fixture.child.signalCode === null) {
    fixture.child.kill("SIGTERM");
  }
  await fixture.exit;
  removeTemporary(fixture.fixtureRoot);
}

function readAvailability(fixture) {
  return JSON.parse(fs.readFileSync(path.join(fixture.workspace, "review/availability.json"), "utf8"));
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

test("preview helper keeps all healthy services until signal and cleans children", async () => {
  const fixture = createFakePreviewFixture("healthy", { pc: "healthy", mobile: "healthy" });
  try {
    await waitFor(() => fixture.stdout().includes("Review:"), `preview never became ready: ${fixture.stderr()}`);
    await waitFor(
      () => ["pc", "mobile", "review"].every((service) => fs.existsSync(path.join(fixture.processDir, `${service}.pid`))),
      `child PID evidence was not written: ${fixture.stderr()}`,
    );
    assert.deepEqual(readAvailability(fixture), {
      pc: { available: true, reason: "" },
      mobile: { available: true, reason: "" },
    });
    fixture.child.kill("SIGTERM");
    await fixture.exit;
    for (const service of ["pc", "mobile", "review"]) {
      const pid = Number(fs.readFileSync(path.join(fixture.processDir, `${service}.pid`), "utf8"));
      assert.equal(processExists(pid), false, `${service} child PID remained alive`);
    }
  } finally {
    if (fixture.child.exitCode === null && fixture.child.signalCode === null) {
      await stopFixture(fixture);
    } else {
      removeTemporary(fixture.fixtureRoot);
    }
  }
});

test("one interrupt bounds stubborn-child cleanup and removes runtime artifacts", async () => {
  const fixture = createFakePreviewFixture("stubborn-pc", {
    pc: "ignore-signals",
    mobile: "healthy",
  });
  let childPids = [];
  let runtimeLogs = [];
  try {
    await waitFor(() => fixture.stdout().includes("Review:"), `preview never became ready: ${fixture.stderr()}`);
    await waitFor(
      () => ["pc", "mobile", "review"].every((service) => fs.existsSync(path.join(fixture.processDir, `${service}.pid`))),
      `child PID evidence was not written: ${fixture.stderr()}`,
    );
    childPids = ["pc", "mobile", "review"].map((service) =>
      Number(fs.readFileSync(path.join(fixture.processDir, `${service}.pid`), "utf8")),
    );
    runtimeLogs = [...previewLogDirectories(fixture.child.pid)];
    assert.ok(runtimeLogs.length >= 1, "preview runtime log directory was not created");

    fixture.child.kill("SIGINT");
    let exitTimeout;
    try {
      await Promise.race([
        fixture.exit,
        new Promise((_, reject) => {
          exitTimeout = setTimeout(() => reject(new Error("preview helper did not exit after one SIGINT")), 4000);
        }),
      ]);
    } finally {
      clearTimeout(exitTimeout);
    }

    for (const pid of childPids) {
      assert.equal(processExists(pid), false, `child PID ${pid} remained alive after bounded cleanup`);
    }
    assert.equal(fs.existsSync(path.join(fixture.workspace, "review/references")), false, "runtime reference link remained");
    for (const directory of runtimeLogs) {
      assert.equal(fs.existsSync(directory), false, `runtime log directory remained: ${directory}`);
    }
  } finally {
    if (fixture.child.exitCode === null && fixture.child.signalCode === null) {
      fixture.child.kill("SIGKILL");
    }
    for (const pid of childPids) {
      if (processExists(pid)) process.kill(pid, "SIGKILL");
    }
    await fixture.exit;
    removeTemporary(fixture.fixtureRoot);
    for (const directory of runtimeLogs) removeTemporary(directory);
  }
});

test("initial PC failure leaves mobile and review available", async () => {
  const fixture = createFakePreviewFixture("initial-pc", { pc: "initial-fail", mobile: "healthy" });
  let sentinel;
  let sentinelExit;
  try {
    await waitFor(() => fs.existsSync(path.join(fixture.workspace, "review/availability.json")), `availability was not written: ${fixture.stderr()}`);
    await waitFor(() => readAvailability(fixture).mobile.available, `mobile never became available: ${fixture.stderr()}`);
    const availability = readAvailability(fixture);
    assert.equal(availability.pc.available, false);
    assert.match(availability.pc.reason, /start|启动/iu);
    assert.equal(availability.mobile.available, true);
    assert.equal(fixture.child.exitCode, null, `helper exited early: ${fixture.stderr()}`);
    const failedPcPid = Number(fs.readFileSync(path.join(fixture.processDir, "pc.pid"), "utf8"));
    assert.equal(processExists(failedPcPid), false, "failed PC child was not reaped before review cleanup");
    sentinel = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    sentinelExit = once(sentinel, "exit");
    await waitFor(() => processExists(sentinel.pid), "unrelated sentinel did not start");
  } finally {
    await stopFixture(fixture);
    if (sentinel) {
      assert.equal(processExists(sentinel.pid), true, "review cleanup signaled an unrelated sentinel");
      sentinel.kill("SIGTERM");
      await sentinelExit;
    }
  }
});

test("PC route HTTP error becomes local evidence while review stays alive", async () => {
  const fixture = createFakePreviewFixture("pc-http-error", { pc: "http-error", mobile: "healthy" });
  try {
    await waitFor(() => fs.existsSync(path.join(fixture.workspace, "review/availability.json")), `availability was not written: ${fixture.stderr()}`);
    await waitFor(() => readAvailability(fixture).mobile.available, `mobile never became available: ${fixture.stderr()}`);
    const availability = readAvailability(fixture);
    assert.equal(availability.pc.available, false);
    assert.match(availability.pc.reason, /HTTP 500/u);
    assert.equal(availability.mobile.available, true);
    assert.equal(fixture.child.exitCode, null, `helper exited for an app HTTP error: ${fixture.stderr()}`);
  } finally {
    await stopFixture(fixture);
  }
});

test("HTTP-error app exit is reaped without signaling an unrelated process", async () => {
  const fixture = createFakePreviewFixture("pc-http-error-exit", { pc: "http-error-later-fail", mobile: "healthy" });
  let sentinel;
  let sentinelExit;
  try {
    await waitFor(() => fs.existsSync(path.join(fixture.workspace, "review/availability.json")), `availability was not written: ${fixture.stderr()}`);
    await waitFor(() => readAvailability(fixture).pc.reason.includes("HTTP 500"), `HTTP error was not recorded: ${fixture.stderr()}`);
    const pcPidFile = path.join(fixture.processDir, "pc.pid");
    await waitFor(() => fs.existsSync(pcPidFile), `PC PID evidence was not written: ${fixture.stderr()}`);
    const failedPcPid = Number(fs.readFileSync(pcPidFile, "utf8"));
    await waitFor(() => !processExists(failedPcPid), "HTTP-error PC child did not exit");
    assert.match(readAvailability(fixture).pc.reason, /HTTP 500/u, "process exit replaced the more precise HTTP error reason");
    assert.equal(fixture.child.exitCode, null, `helper exited after HTTP-error app stopped: ${fixture.stderr()}`);

    sentinel = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
    sentinelExit = once(sentinel, "exit");
    await waitFor(() => processExists(sentinel.pid), "unrelated sentinel did not start");
  } finally {
    await stopFixture(fixture);
    if (sentinel) {
      assert.equal(processExists(sentinel.pid), true, "cleanup signaled an unrelated sentinel after an HTTP-error child exited");
      sentinel.kill("SIGTERM");
      await sentinelExit;
    }
  }
});

test("later mobile exit updates evidence without stopping PC or review", async () => {
  const fixture = createFakePreviewFixture("later-mobile", { pc: "healthy", mobile: "later-fail" });
  try {
    await waitFor(() => fs.existsSync(path.join(fixture.workspace, "review/availability.json")), `availability was not written: ${fixture.stderr()}`);
    await waitFor(() => readAvailability(fixture).mobile.reason.includes("exited"), `later failure was not recorded: ${fixture.stderr()}`);
    const availability = readAvailability(fixture);
    assert.equal(availability.pc.available, true);
    assert.equal(availability.mobile.available, false);
    assert.equal(fixture.child.exitCode, null, `helper exited after one app failed: ${fixture.stderr()}`);
  } finally {
    await stopFixture(fixture);
  }
});
