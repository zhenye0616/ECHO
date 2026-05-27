---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 1
reviewer: "codex"
artifact_sha: "a0e7578d10511fc34375e67bc6acb7cc7939d16e"
completed_at: '2026-05-27T05:01:43Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:142"
    finding: >-
      AC1 ships only coord config and schemas while AC1.2 explicitly excludes `tools/review-queue/*.sh`, but the current daemon registers `coord_invoke`, whose `src/coord/paths.ts:63-146` resolves and requires `tools/review-queue/run-<role>-reviewer.sh` to exist and be executable under the packaged repo root. A packaged daemon built from this spec will start, but active reviewer invocation fails with `coord_invoke: reviewer wrapper not found` for every headless role. Either ship the wrapper scripts plus their runtime dependencies in the tarball, or explicitly disable/de-scope `coord_invoke` for packaged installs and test that behavior.
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228"
    finding: >-
      AC5 relies on a unique `ECHO_HOME` and random `ECHO_MCP_PORT`, but AC3.2's plist persists only `PATH`. launchd does not inherit the environment from the `echoctl daemon install` process after bootstrap, so the test daemon will use the default `~/.echo` and port 38478 while the smoke probes the random port. Patch AC3/AC5 to render the effective `ECHO_HOME` and `ECHO_MCP_PORT` into the plist, or add explicit daemon install flags/test seams that make the launched process use the same isolated state and port that the smoke probes.
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:209"
    finding: >-
      The packaged-daemon smoke is not isolated from the founder's real LaunchAgent. AC3 hard-codes label `com.echo.daemon` and `~/Library/LaunchAgents/com.echo.daemon.plist`, and AC5 then runs install/start/stop/uninstall from `npm test`; on a macOS dev machine this can bootout the live daemon, overwrite its plist with a temp package path, and then remove that plist during cleanup. Require a test-only label/plist path/log-dir seam (or stub launchctl for the automated suite and make the live launchd smoke an explicit manual gate) before AC5 can be safe to run.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:11"
    finding: >-
      AC2.2 requires a new `scripts/copy-sql-migrations.js` or `.mjs`, and AC2.1 wires `build:cli` to call it, but the frontmatter `files_to_modify` omits that file. Builders following the declared write scope cannot satisfy AC2.2 without drifting. Add the copy script path to `files_to_modify` and pin the test assertion that `npm run build:cli` produces `dist/storage/migrations/*.sql`.
---

# Codex Review

Verdict: `pushback`.

## Findings

1. **HIGH - packaged daemon drops coord_invoke wrappers** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:142`)

   AC1 ships `tools/review-queue/coord-roles.json`, `reviewers.json`, and schemas, then AC1.2 excludes `tools/review-queue/*.sh` as dev-only. That does not match the current daemon. `coord_invoke` resolves `tools/review-queue/run-<role>-reviewer.sh` from the repo/package root and requires the file to exist and be executable before it spawns a reviewer. With the proposed tarball, the daemon starts but every active reviewer invocation fails at wrapper-path resolution. The spec needs to either ship the wrapper scripts and their runtime dependencies, or explicitly disable/de-scope `coord_invoke` in packaged installs and test that behavior.

2. **HIGH - launchd smoke cannot use the requested isolated ECHO_HOME/port** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228`)

   AC5 says the smoke should run against a unique `ECHO_HOME` and random `ECHO_MCP_PORT`, but AC3.2 renders only `PATH` into the plist. launchd will not preserve the `env` passed to the CLI process after bootstrap, so the daemon process uses default `~/.echo` and port 38478 while the test probes the random port. Patch the plist contract to include the effective `ECHO_HOME` and `ECHO_MCP_PORT`, or add explicit install flags/test seams and assert the launched daemon uses them.

3. **HIGH - launchd smoke can clobber the live daemon** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:209`)

   AC3 hard-codes label `com.echo.daemon` and the real user LaunchAgents path, then AC5 runs install/start/stop/uninstall from the automated shell reachability test. On the founder's macOS machine, that can bootout the live daemon, overwrite its plist with the temporary package's daemon path, and remove the plist during cleanup. The test needs a unique label/plist/log-dir seam, or the automated suite should stub `launchctl` and reserve the live launchd probe for an explicit manual gate.

4. **MEDIUM - required migration-copy script is outside the declared write scope** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:11`)

   AC2.2 requires a new `scripts/copy-sql-migrations.js` or `.mjs`, and AC2.1 wires `build:cli` to execute it, but `files_to_modify` omits that file. Add the script path to the frontmatter and pin a build assertion that `dist/storage/migrations/*.sql` exists after `npm run build:cli`.
