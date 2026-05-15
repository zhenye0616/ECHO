---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
round: 2
combined_at: '2026-05-15T08:33:03Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

NOTE: All four findings target §AC3.2 and are semantically convergent (combine.py listed as divergent because the `where:` line-ranges don't textually overlap). Pairings: F1 (codex HIGH) + F3 (codex-ops HIGH) on hermetic-runtime / origin-URL safety; F2 (codex MED) + F4 (codex-ops MED) on git-identity-and-seed setup / try-finally guard. All accepted with a single combined AC3.2 rewrite.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | §AC3.2 lines 102-106 | accepted with patch (paired with F3) | AC3.2 Production-repo guard rewritten to capture and compare the REAL `refs/heads/main` SHA on github.com (`git ls-remote origin refs/heads/main`) pre/post test, NOT a fixture-name pattern — `push-with-retry.sh` pushes `origin main` so the guard MUST anchor on `main` itself. New "Pre-pipeline origin-URL assertion" subsection added: BEFORE invoking commit-reviewer-response.sh, assert `git remote get-url origin` returns a `file://`-prefixed or temp-path value; ANY value containing `github.com` FAILS the test with a clear "fixture has origin pointing at a real remote — refusing to run" message. Patch applied inline to AC3.2 in r2 disposition. |
| 2 | MEDIUM | codex | §AC3.2 lines 102-106 | accepted with patch (paired with F4) | AC3.2 Test repo setup rewritten as an 8-step exact sequence: mktemp + `git init --bare $ORIGIN` + `git init -b main $CHECKOUT` + LOCAL git identity config (no global-config dependency) + remote add + INITIAL COMMIT seeded to bare origin so `git pull --rebase origin main` has a target ref. Without these the helper aborts before exercising the unquoted-`completed_at` path. Patch applied inline to AC3.2 in r2 disposition. |
| 3 | HIGH | codex-ops | §AC3.2 | accepted with patch (paired with F1) | See F1 disposition — same root cause (hermetic-runtime + safety guard against accidental real-remote pointing). Codex-ops's framing focuses on the cron/CI environment failure mode (no global identity, `master` vs `main` branch name); codex's framing focuses on the production-remote leak risk. Both addressed by the AC3.2 rewrite. Patch applied inline. |
| 4 | MEDIUM | codex-ops | §AC3.2 | accepted with patch (paired with F2) | AC3.2 Production-repo untouched assertion rewritten to require a `try { ... } finally { ... }` / `afterEach` / `trap '...' EXIT` wrapper that fires on EVERY exit path (happy-path, assertion failure, exception, timeout). Implementation hint specifies `afterEach` NOT `afterAll` for Jest/Vitest harness (the latter masks per-test leaks). The finally-block guard is load-bearing: without it, a crashed-mid-pipeline run that DID write to production would skip the guard entirely — exactly the failure mode codex-ops F4 named. Patch applied inline to AC3.2 in r2 disposition. |

## Convergence call

`needs R3 — focus_hints: verify the 8-step hermetic test-repo setup in AC3.2 is complete and correct (no missing prerequisites for commit-reviewer-response.sh + push-with-retry.sh); verify the pre-pipeline origin-URL assertion catches BOTH file:// AND tmpdir variants while rejecting any github.com value; verify the production-repo guard's try-finally/afterEach wrapper is mandatory and load-bearing (not just suggested); verify the PROD_REMOTE_MAIN_PRE/POST assertion is byte-comparison against the REAL github.com refs/heads/main SHA, not against a fixture-name pattern. Flag if any remaining AC3.2 prose leaves a path that could leak writes to the founder's real remote or depend on global machine state.`

