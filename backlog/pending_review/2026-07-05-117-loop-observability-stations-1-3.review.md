---
item_id: 2026-07-05-117-loop-observability-stations-1-3
verdict: block
reviewed_at: '2026-07-06T00:48:17Z'
test_counts:
  passed: 1990
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Block — worktree drifted mid-review: commit 508a0357 (reviewer riders: machine-readable station condition + boundary-contract tests) landed on agent/loop-observability-stations-1-3 during the review, so the item's recorded head_sha 3e1b3928 no longer identifies the code and verification results span two commits. Drift cause identified post-review: builder-117 applied the strategist's three endorsed riders AFTER the pending_review handoff without updating head_sha — work is wanted, process contract broken. Independent of drift, the review found one substantive pre-merge bug: doctor's default storage open (new SqliteStorage) mkdirs + creates + migrates the db, violating AC1's read-only contract — a missing prod db is silently created empty (counts=0 instead of degraded per AC2) and existing doctor win32 fixtures now materialize backslash-named junk files in cwd (plausibly what actually broke 053-completed-at-coercion during the builder's full-suite run). At the pre-drift SHA: all ACs Met except AC6 Partial (no fixture for the port-owner lookup throwing), rollup severity model verified as endorsed, zero scope drift, doctor-loop 19/19 and existing doctor 10/10 in isolation.

## Pre-merge fixups
- [ ] Reconcile head_sha: item frontmatter must record the true 40-char branch tip (currently 508a0357c70e5f78594d66c113cc2c6ac9ae7e6c or later) and re-review must run at that SHA
- [ ] Doctor must be read-only: do not mkdir/create/migrate the db from the loop section — open only if the file exists, else report station-1 degraded/not-yet-run with remediation (src/storage/sqlite.ts:63-72 constructor side effect; guard at the doctor call site)
- [ ] Stop the win32-fixture junk: existing doctor tests must not materialize \var\folders\... backslash files in cwd via the real SqliteStorage path
- [ ] Add the missing AC6 fixture: portOwnerLookup throws/fails -> serving identity unknown/degraded (code path exists at buildLoopServing try/catch, untested)
- [ ] Re-run doctor-loop.test.ts + full suite at the reconciled tip (the mid-drift run showed one doctor-loop seed-store failure that must be re-checked)

## Expected merge conflicts
- (none expected) — doctor.ts/render.ts last changed on main pre-fork (a2af4048); main since fork only carries the 116 merge + review commits, none touching these files.

## Follow-up items (defer, do not block merge)
- Perf: queryClassHealth loads full atom content per source class to count; add a filtered-count storage seam later (reuse-first forced this now)
- Consider read-only db open mode for doctor generally (builder had noted this too)

## Open questions for founder
Resolved during orchestration: 508a0357 was builder-117 applying the strategist's three endorsed riders post-handoff (confirmed via commit message + content). Remaining decision: item returns to builder for the pre-merge fixups above, then re-review at the reconciled head_sha — no founder action needed unless the builder cannot complete the fixups.
