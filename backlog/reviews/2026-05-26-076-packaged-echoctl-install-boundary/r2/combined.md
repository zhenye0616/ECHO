---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 2
combined_at: '2026-05-27T05:18:29Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

**Founder-directed full-auto disposition (continued from r1).** Per the founder's "full auto" directive, the §Out-of-Scope #7 escalation gate is overridden. Substantive review of both r2 responses: codex's pushback flags two NEW real bugs (data-dir/db-path isolation; AC1.5 scope contradiction) plus refinements; codex-ops's proceed_after_patches flags two complementary procedural fixes (post-bootstrap health probe; restart/logs override tests). All 6 findings are accepted and patched inline.

**Removal-over-deeper-patching applied to r1 patch (r2 codex F2).** r1 added `src/coord/paths.ts` + `tests/coord/paths.test.ts` to scope and required a new `ECHO_COORD_INVOKE_PACKAGED_UNAVAILABLE` structured code — which contradicted §Out-of-Scope's ban on touching `src/coord/` and `src/mcp/`. Per the skill's "prefer removal over deeper patching when findings target a recent-round patch" discipline, r2 removes the mechanism: existing CoordPathError → isError text response already cleanly de-scopes coord_invoke in packaged installs; no code change needed; AC5.1 adds a positive end-to-end assertion against the packaged daemon to prove it.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:244 | accepted — patched | AC3.2 plist NOW renders ECHO_DATA_DIR + ECHO_DB_PATH; AC3.3 adds --data-dir + --db-path flags (with derived db-path when only data-dir is set); AC3.3 step 5 preflight checks data-dir + db-path parent writability; AC3.8 extends the override flag set to data-dir + db-path; AC5.1 step 4 asserts status reports the test data-dir + db-path; AC5.1 step 7 + AC5.2 add mtime+size snapshot of `~/Library/Application Support/ECHO/` + its `echo.db` to the production-untouched contract |
| 2 | HIGH | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:170 | accepted — mechanism dropped (removal over patching) | r1 added `src/coord/paths.ts` + `tests/coord/paths.test.ts` to scope; that mechanism contradicts §Out-of-Scope's ban on src/coord/ and src/mcp/ writes. Removed those entries from files_to_modify; rewrote AC1.5 as a documentation-only de-scope assertion that relies on existing CoordPathError → isError-text MCP behavior (which already de-scopes correctly). AC5.1 adds positive end-to-end coord_invoke isError assertion against the packaged daemon |
| 3 | MEDIUM | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:329 | accepted — patched | AC5.1 reordered to `install` → `stop` → `start` → probe → `status` → `logs` → `stop` → `uninstall` (exercises real start path, not no-op-after-install); every verb in the smoke now passes the full $OVERRIDES set so any verb that drops an override surfaces as a test failure; AC5.1 step 4 adds an explicit `logs --log-dir` assertion that the test log dir (not production) is being tailed |
| 4 | LOW | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:164 | accepted — patched | AC1.3 reworded to expect `broken` (matching current `src/cli/commands/doctor.ts` semantics) instead of `degraded`; spec does NOT change doctor's health vocabulary — it just aligns the no-daemon-yet-case expectation with current behavior |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:279 | accepted — patched | AC3.3 NEW step 10 (post-bootstrap health-probe wait): installer waits up to 10s with exponential backoff for the resolved daemon to answer the same MCP/doctor probe used by `status` before printing success; probe-timeout exits non-zero with label/port + log-tail recovery hint; the bootout-then-broken-replacement gap is closed. Same probe-wait applies to `restart` (which is bootout-then-bootstrap) |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:306 | accepted — patched | AC3.8 gains explicit "r2 codex F3 / codex-ops F2 — full-override test plumbing for the recovery verbs" subsection: tests/cli/daemon.test.ts MUST drive `restart` and `logs` with non-default overrides and assert every launchctl/file-IO operation resolves from the override values, NEVER from production defaults; files_to_modify comment for tests/cli/daemon.test.ts updated to name r2 codex-ops F2 + the post-bootstrap probe wait |

## Convergence call

needs R3 — focus_hints: verify the 6 r2 dispositions survive a fresh-eyes re-read; in particular re-check that (a) the AC1.5 removal-over-patching disposition is sound (the existing CoordPathError → isError-text response is sufficient V1 de-scope; AC5.1 step 4's positive assertion proves it without touching src/coord or src/mcp); (b) AC3.2 + AC3.3 + AC3.8 + AC5 fully thread ECHO_DATA_DIR + ECHO_DB_PATH through plist render, install flag surface, preflight, every-verb override, smoke isolation, and production-mtime snapshot; (c) AC3.3 step 10's post-bootstrap probe-wait actually CLOSES the bootout-then-broken-replacement upgrade gap (no remaining code paths print success on a crash-looping daemon); (d) AC5.1's stop-then-start exercises the real start path AND every verb in the smoke is invoked with the full $OVERRIDES (no verb defaults-leak path remains); (e) AC1.3's `broken` wording matches current doctor.ts semantics.

