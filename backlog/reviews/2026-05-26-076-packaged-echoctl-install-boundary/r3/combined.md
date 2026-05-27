---
item_id: 2026-05-26-076-packaged-echoctl-install-boundary
round: 3
combined_at: '2026-05-27T05:30:27Z'
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

**Founder-directed full-auto disposition (continued).** Verdict-flip from r2: codex flipped to `proceed_after_patches`, codex-ops flipped to `pushback`. Substantively the reviews CONVERGE: codex F2 + codex-ops F2 both flag the racy production-data-dir mtime check; codex-ops F1 flags a NEW HIGH gap I missed on r2 (preflight + probe-wait only on `install`, not `restart` — exactly the upgrade verb AC6 documents); codex F1 tightens the AC1.5 smoke assertion to actually exercise the wrapper-absent path; codex F3 is a wording cleanup. All 5 findings accepted and patched inline.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | both (codex F2 + codex-ops F2, primary `where` line 344) | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:344 | accepted — patched | AC5.1 step 7 + AC5.2 production-data-dir mtime+size assertion is now CONDITIONAL: required only when production daemon is not-loaded OR explicitly quiesced. When production is live, untouchedness is proven positively via label/PID/plist snapshot + test-daemon override assertions + AC3.8 fake-launchctl test; the mtime check becomes a defense-in-depth augmentation that runs only when it can be stable. Closes the flaky-on-protected-machine failure mode |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:174 + :341 | accepted — patched | AC5.1 step 4 coord_invoke assertion now pins (a) a known headless role (`codex`), (b) syntactically valid `request_path`+`correlation_id`, (c) the error-text must mention the specific wrapper-not-found CoordPathError naming `run-codex-reviewer.sh`. Forces the resolver past roster/headless/argument-shape checks and into the file-stat path that AC1.5's de-scope mechanism actually relies on |
| 2 | LOW | codex | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:178-180 + :421-427 | accepted — patched (wording only) | AC2.3 reworded: the pinned source already resolves `MIGRATIONS_DIR` via `import.meta.url` next to the runtime file, so post-pack lookup naturally lands in `dist/storage/migrations/` after AC2.2's copy script runs. `src/storage/sqlite.ts` is now a verification point, not mandatory churn; the load-bearing fix is `scripts/copy-sql-migrations.js`. AC5.1 smoke catches any regression so no separate test needed |
| 3 | HIGH | codex-ops | backlog/ready/2026-05-26-076-packaged-echoctl-install-boundary.md:367 | accepted — patched (gap I missed on r2) | NEW AC3.4.1: `restart` and recovery-load `start` MUST share `install`'s preflight + post-bootstrap probe-wait (single shared helper, no duplication). Closes the AC6-documented-upgrade-path gap that left `npm install -g && daemon restart` vulnerable to the same bootout-then-broken-replacement failure mode that AC3.3 step 10 closed for `install`. daemon.test.ts gets negative-path coverage for restart-broken-INSTALLED_DAEMON_PATH (preflight aborts BEFORE bootout) and restart-clean-preflight-but-crashing-daemon (probe-wait times out, non-zero exit, recovery hint) |

## Convergence call

needs R4 — focus_hints: verify the 5 r3 dispositions survive a fresh-eyes re-read; in particular re-check that (a) AC3.4.1's shared preflight+probe-wait helper now closes the AC6 `daemon restart` upgrade-to-outage gap fully (no remaining verb that can bootout-and-fail-silent under documented operator flows); (b) AC5.1 step 4's coord_invoke assertion now provably exercises the wrapper-absent path (headless role + valid payload + specific run-codex-reviewer.sh error text); (c) AC5.1/AC5.2's conditional mtime check no longer fails under live production but still proves test-daemon isolation positively; (d) AC2.3 reworded as verification (no mandatory churn) — verify `scripts/copy-sql-migrations.js` (AC2.2) remains the single load-bearing fix; (e) no remaining contradiction between files_to_modify and Out-of-Scope. If only LOW-severity wording findings remain, R4 should be terminal (no R5).

