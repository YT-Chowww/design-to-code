# D2C Validation Fixtures

These fixtures back the module 8 automation checks in `docs/capability-roadmap.md`.
They are intentionally stored outside `tests/` so the current roadmap work can
validate the protocol layer without restoring the legacy test tree.

Run the suite with:

```bash
node scripts/check-validation-suite.mjs
```

The suite covers:

- repository structure and required skill/docs/scripts
- preview template static build prerequisites
- protocol snapshots for manifest, normalized design, generation, validate,
  verify, and merge reports
- mock extract/generate/merge fixtures that do not require Figma, Chrome MCP, or
  a business target project
- fixed degraded scenarios for provider, browser, and target build failures

`[>]` in the roadmap means these checks exist and pass locally. It does not mean
the real Figma E2E, browser screenshot diff, or target-project validation has
already passed.
