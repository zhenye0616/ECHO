---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 2
reviewer: "codex"
artifact_sha: "94f78d887f8f9d2751444c8378c47839273c45e7"
completed_at: '2026-05-27T05:16:37Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:244"
    finding: >-
      AC3.2 persists ECHO_HOME and ECHO_MCP_PORT, and AC5.2 treats --home as full smoke-test isolation, but the daemon's pid lock and sqlite path are controlled by ECHO_DATA_DIR/ECHO_DB_PATH, falling back to ~/Library/Application Support/ECHO in src/daemon/lifecycle.ts. A launchd smoke installed with only --home/--port can still contend with the founder's production pid lock or write the production daemon data directory. Patch the daemon install surface, plist, and smoke to carry an isolated data dir/db path, or explicitly assert that the production data dir is never touched.
  - severity: "high"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:170"
    finding: >-
      AC1.5 asks src/coord/paths.ts to make coord_invoke return a structured rejection with code ECHO_COORD_INVOKE_PACKAGED_UNAVAILABLE, but the current MCP tool boundary in src/mcp/tools/coord-invoke.ts catches CoordPathError and returns only an isError text response. The path resolver cannot by itself produce the requested structured MCP response, and the spec's Out of Scope section later forbids touching src/mcp and src/coord except for sqlite.ts. Reconcile the write scope/out-of-scope boundary and add the MCP tool/test surface if the structured code is required.
  - severity: "medium"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:329"
    finding: >-
      AC5.1 runs daemon install and then daemon start, but AC3.3 says install already bootstraps the job, so the start call is a no-op in the smoke. The same block calls status and stop with only --label even though AC3.8 requires the override surface to flow through every verb. A broken start implementation or a status implementation that ignores --plist-path/--home/--port can still pass because install left the test job running. Add a stop-then-start assertion with the full resolved overrides, plus status/logs assertions that read the same test plist/log/home/port config.
  - severity: "low"
    where: "backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:164"
    finding: >-
      AC1.3 says echoctl doctor returns degraded when no daemon is installed, but current src/cli/commands/doctor.ts computes broken when echo home is missing or when neither the pid lock nor MCP probe is present. Either make that doctor semantic change explicit and in scope, or change the spec/test expectation to broken so the builder does not drift into CLI health semantics while packaging.
---

# Codex Review

Verdict: `pushback`.

## Findings

1. **HIGH - daemon data dir is still not isolated** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:244`)

   AC3.2 now persists `ECHO_HOME` and `ECHO_MCP_PORT`, but the daemon's pid lock and sqlite path do not come from `ECHO_HOME`. At the requested SHA, `src/daemon/lifecycle.ts` resolves the pid/data directory from `ECHO_DATA_DIR` or `~/Library/Application Support/ECHO`, and the DB from `ECHO_DB_PATH` / `ECHO_DATA_DIR` / the same production default. The packaged smoke can therefore collide with the live daemon's pid lock or write the production daemon database even while using a temp `--home` and random port. Add isolated data-dir/db envs/flags to the plist and AC5, or explicitly prove the production data dir is untouched.

2. **HIGH - AC1.5 asks the wrong layer for a structured coord_invoke code** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:170`)

   `src/coord/paths.ts` can throw/return path-resolution information, but the current `coord_invoke` MCP response is built in `src/mcp/tools/coord-invoke.ts`, which catches `CoordPathError` and returns a text-only `isError` response. The spec also lists `src/coord/paths.ts` in scope while the Out-of-Scope section forbids touching `src/mcp` and `src/coord` except for `sqlite.ts`. Reconcile that contradiction and include the MCP tool/test surface if `ECHO_COORD_INVOKE_PACKAGED_UNAVAILABLE` must be machine-readable.

3. **MEDIUM - the smoke does not exercise the real start path or full override plumbing** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:329`)

   `daemon install` already bootstraps, so the following `daemon start --label ...` is a no-op. The smoke also invokes `status` and `stop` with only `--label`, which leaves room for implementations that ignore `--plist-path`, `--home`, `--port`, or `--log-dir` on non-install verbs. Stop the test job after install, start it again with the full test config, and assert status/logs resolve from that same config.

4. **LOW - doctor expectation does not match current CLI semantics** (`backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:164`)

   AC1.3 expects `echoctl doctor` to report degraded before the daemon is installed. Current `doctor` reports broken when `~/.echo` is absent or when the daemon is unreachable. That may be the right product behavior, but the spec should either declare the health-semantics change or expect `broken` for the packaged no-daemon case.
