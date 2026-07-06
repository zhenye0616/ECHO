---
item_id: 2026-07-05-117-loop-observability-stations-1-3
verdict: merge as-is
reviewed_at: '2026-07-06T01:07:15Z'
test_counts:
  passed: 1996
  failed: 0
producer: review-pending-orchestrator
---
## Verdict
Merge as-is (re-review after remediation; replaces the earlier block sidecar). Ground truth passes at head_sha 58ca01925d012b8bad5029c582cbebac74cafc74 — byte-equal to the branch tip, updated atomically with the stage move. All three blocking findings from the first review are resolved with empirical confirmation: (1) doctor is now read-only — default loop-storage open gated on existsSync(dbPath), missing db renders soft 'db-missing' with no create/migrate/mkdir (contract test asserts the file is NOT created), present-but-corrupt db is a hard fault; (2) the win32-fixture backslash junk files no longer materialize (previously 5, now zero after running doctor.test.ts); (3) the previously-missing AC6 matrix arm (port-owner lookup throws) is covered by a new fixture. All ACs Met including AC6 (upgraded from Partial); all 8 degradation-matrix rows have fixtures. Zero scope drift across all three branch commits (doctor.ts, render.ts, tests/cli/doctor-loop.test.ts only; no SqliteStorage change). Riders verified: typed per-station condition discriminators in --json, boundary-contract fixture pinning the hard/soft rollup split, docs. Full suite 1996 passed / 0 failed including all known flakes and 053-completed-at-coercion (its earlier failure was the junk-file side effect, now root-caused and gone).

## Pre-merge fixups
- [ ] (none — reviewer found no pre-merge fixups; merge as-is)

## Expected merge conflicts
- (none expected) — doctor.ts/render.ts last changed on main pre-fork (a2af4048); doctor-loop.test.ts is new; main since fork carries only the 117 sidecar/re-handoff and unrelated 118/119/120 review-queue commits; branch diff touches only the three item files.

## Follow-up items (defer, do not block merge)
- True read-only db open: when the db exists, SqliteStorage's constructor still runs migrate()+canonicalizeTimestamps(); skip for doctor's diagnostic open (touches SqliteStorage — separate item; already flagged in agent_notes)
- station1Condition precedence edge: db missing AND malformed checkpoint reports soft-dominant 'db-missing' despite a hard fault present, contradicting the hard-states-take-precedence comment (degradations/overall still correct; cosmetic) — fix + add the combined fixture
- Perf: queryClassHealth loads full atom content per source class x6 to count; add a filtered-count storage seam (reuse-first forced this)
- ps argv whitespace split can fragment paths with spaces -> degrades toward unknown (safe direction); note for a future robustness pass
