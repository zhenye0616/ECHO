---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 1
combined_at: '2026-05-27T05:03:03Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
disposition_note: "founder-directed full-auto override of §Out-of-Scope #7 escalation gate; substantive findings converge on the same 6 bugs across both reviewers"
---

# Combined findings

**Founder-directed full-auto disposition.** Founder explicitly requested "two codex reviewers, review until convergence on full auto" — overriding the §Out-of-Scope #7 escalation gate for this item. Substantive review of both responses shows the two reviewers AGREE on the load-bearing bugs (plist env, test isolation, preflight, wrapper de-scope, migration script in files_to_modify); they differ only on verdict framing (`pushback` vs `proceed_after_patches`). Treating as `proceed_after_patches` with all 6 findings dispositioned + patched inline; r2 is the verification round.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent on `backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228`) | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:228 | accepted — patched | AC3.2 plist now renders ECHO_HOME + ECHO_MCP_PORT + NODE_EXEC_PATH into EnvironmentVariables; AC3.3 step 3 resolves process.execPath + asserts Node major version; AC3.8 adds the test-isolation seam (--label/--home/--port/--plist-path/--log-dir); AC5.1 step 4 asserts the launchd-started daemon actually sees the test ECHO_HOME + port via `status` |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:142 | accepted — patched (de-scope, not ship) | new AC1.5 explicitly de-scopes `coord_invoke` reviewer-wrapper invocation in packaged installs; `src/coord/paths.ts` returns `ECHO_COORD_INVOKE_PACKAGED_UNAVAILABLE` when wrappers absent; rationale: review-queue substrate is operating-model-only, not V1 customer surface — shipping run-*-reviewer.sh + their _lib/coord-emit/reviewers.json plumbing would push tarball outside V1 purpose. Test seam added (`tests/coord/paths.test.ts`) |
| 2 | HIGH | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:209 | accepted — patched (same patch as convergent #1) | AC3.8 test-isolation seam (--label/--plist-path/--log-dir); AC5.1+AC5.2 production-safety contract with before/after snapshot of `launchctl print gui/$(id -u)/com.echo.daemon`; cleanup failure that mutated production surfaces as TEST FAILURE, not silent log error |
| 3 | MEDIUM | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:11 | accepted — patched | files_to_modify now includes `scripts/copy-sql-migrations.js` (AC2.2) and `tests/coord/paths.test.ts` (AC1.5); AC8.3 already pinned the post-build presence of `dist/storage/migrations/*.sql` so a future builder cannot ship without the script firing |
| 4 | HIGH | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:202 | accepted — patched (same patch as convergent #1 + divergent #2) | AC3.8 test-isolation seam covers the production-label-clobber risk codex-ops flagged; the patch surface is shared with codex F3 since both reviewers found the same bug from different angles |
| 5 | MEDIUM | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:211 | accepted — patched | AC3.2 plist NOW uses `{{NODE_EXEC_PATH}}` (absolute) instead of `/usr/bin/env node`; AC3.3 step 3 resolves via process.execPath + asserts major version satisfies AC7.4 (`>=22`) BEFORE any plist write or bootout; daemon.test.ts seams cover both the resolution and the version-gate failure path |
| 6 | MEDIUM | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:239 | accepted — patched | AC3.3 step 5 (NEW preflight) verifies installed daemon path + SQL migrations + coord config + log-dir writability BEFORE any bootout; preflight failure aborts with structured error + recovery hint; the running daemon stays up so an upgrade with a broken tarball does NOT convert to an outage |

## Convergence call

needs R2 — focus_hints: verify the 6 dispositions listed above survive a fresh-eyes re-read; in particular re-check that (a) AC1.5's de-scope decision is the right side of the customer/operating-model line (vs. shipping wrappers), (b) AC3.2's plist envs + AC5.1 step 4's status-assertion together actually close the launchd-env-inheritance gap, (c) AC3.8's --label override is plumbed through every verb (install/start/stop/restart/status/logs/uninstall), (d) AC3.3 step 5 preflight checks are exhaustive enough that any broken tarball aborts BEFORE the bootout (i.e. no silent partial-install path), (e) AC5.2 pre-flight skip when production cannot be snapshotted is correct (skip is safer than run-with-poisoned-net).

