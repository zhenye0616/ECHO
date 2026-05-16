---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 3
spec_commit_sha: 4d4530281fbca9593b6ca280e736bb3b1cdd7531
artifact_path: backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md
class: structural-reform
requested_at: '2026-05-16T05:10:26Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r2 produced 6 findings (2 HIGH + 4 MED, down from r1's 4 HIGH + 3 MED).\
  \ All accepted; spec patched at b504b9e. r3 verifies: (1) AC2 \u2014 `ajv@^8` +\
  \ `ajv-formats@^3` are named in package.json dependencies (NOT devDependencies);\
  \ loader resolves coord-roles.json via `new URL('../../tools/review-queue/coord-roles.json',\
  \ import.meta.url)` so daemon never reads process.cwd(); ECHO_COORD_ROLES_PATH env\
  \ override for tests; chdir-to-root startup test asserts the path resolution works;\
  \ (2) AC3 storage seam \u2014 `Storage.iterateCoordAtomsByAppendOrder({sinceSeq?,\
  \ untilSeq?, limit?})` added to src/storage/interface.ts; SqliteStorage uses rowid\
  \ (single-writer constraint guarantees rowid reflects ingest order); MemoryStorage\
  \ uses monotonic insertion counter; parity test asserts same-timestamp atoms replay\
  \ in append order; (3) AC3 `fireMissedDeadline` \u2014 EVERY code path through the\
  \ function removes `R` from the open map: (a) cache hit \u2192 skip append + STILL\
  \ remove R; (b) no cache hit \u2192 append + cache + remove R. This closes the r1-patch-introduced\
  \ stale-open-record-after-restart bug. Verify restart-after-fired fixture asserts\
  \ no stale open record AND no duplicate atom; (4) AC3 reconstruction + reconciliation\
  \ \u2014 replay is by durable append-order `sequence_id`, NOT by `emitted_at`. Out-of-order\
  \ `emitted_at` (e.g. tick_start with emitted_at < reviewer_invoked's emitted_at,\
  \ appended later) does NOT corrupt the rebuilt open-record set. Verify out-of-order\
  \ fixture; (5) AC6 `coord:deadline_missed` atom payload \u2014 carries BOTH `metadata.coord.opened_event_type`\
  \ (e.g. `reviewer_invoked`) AND `metadata.coord.expected_event_type` (e.g. `tick_start`).\
  \ Per-role-per-event-type last-miss list is keyed by (subject_role, expected_event_type)\
  \ NOT by opener. Clearing happens when a successful event whose event_type == expected_event_type\
  \ arrives; a fresh opener event (like another reviewer_invoked) does NOT clear it.\
  \ Verify last-miss-cleared fixture; (6) AC8 new fixtures (5 total in r2): out-of-order-emitted-at-replay,\
  \ restart-after-fired-no-stale-open, last-miss-cleared-by-successful-close, coord-roles-cwd-independent-path,\
  \ iterate-coord-by-append-order. Each should have a clearly observable pass/fail\
  \ signal. ops lens: rowid query performance vs (timestamp, id) indexing \u2014 is\
  \ iterateCoordAtomsByAppendOrder over a 24h horizon performant on a 100k-atom DB?\
  \ Confirm ajv schema-compile cost is paid once at startup, not per-emit. CRITICAL:\
  \ this is r3 of a structural-reform spec; if r3 produces \u22654 findings of similar\
  \ severity to r2, we are in a 049 fail-to-converge asymptote and the strategist\
  \ will escalate to founder per the convergence policy."
---

# What to review

Read `backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md` at commit `4d4530281fbca9593b6ca280e736bb3b1cdd7531`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
