# Benchmark live shutdown fix report

## Result

Fixed the preview helper's one-signal shutdown path without starting real ports. Cleanup now stays bounded when a directly owned child ignores `INT` and `TERM`, escalates only active Bash background jobs, reaps every held child, clears the three PID ownership fields, and removes the runtime reference link and log directory.

## Root cause and TDD evidence

- The previous `cleanup` forwarded the captured signal and then called `wait` without a bound. A child that ignored `INT` kept the helper blocked indefinitely.
- RED: a real fake child was configured to ignore both `INT` and `TERM`; one `SIGINT` to the helper failed the four-second exit bound.
- The first ownership implementation used `ps`, but the execution environment denied process-table access. Trace evidence showed it then entered `wait` after an inconclusive ownership check.
- Bash's own `jobs -pr` is now the source of truth for currently running direct children. This avoids external process-table access and avoids signaling an unrelated process after PID reuse.
- Sequential per-child grace periods still exceeded the global four-second bound because background shell children can inherit ignored `INT`. Cleanup therefore applies each signal phase to all owned children together: requested signal, bounded grace period, `TERM`, bounded grace period, then `KILL` only for survivors.
- GREEN: the stubborn-child test exits after one `SIGINT`, all three child PIDs disappear, and both runtime artifacts are removed.

## Safety details

- Signal delivery is limited to PIDs still present in the current Bash process's running background-job table.
- Exited children are waited and removed from ownership before the next escalation phase.
- After `KILL`, remaining held children are waited and all PID fields are cleared.
- Existing unavailable-child and unrelated-sentinel tests remain unchanged and pass.
- Runtime log directories include the owning helper PID. The regression test can therefore verify and clean only its own directory without matching concurrent preview sessions.

## Verification

- Focused lifecycle suite: PASS, 7/7.
- Full `npm test`: PASS, 37/37 Node tests plus both static contracts.
- `bash -n .claude/skills/d2c-benchmark/scripts/start-preview.sh`: PASS with the system Bash 3.2 runtime.
- `npm run check:d2c-skill`: PASS.
- `npm run check:d2c-benchmark`: PASS.
- `git diff --check`: PASS.
- No real review, PC, or mobile port was started; live re-acceptance remains with the controller.
