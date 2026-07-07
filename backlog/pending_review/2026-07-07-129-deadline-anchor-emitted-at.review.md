---
item_id: 2026-07-07-129-deadline-anchor-emitted-at
verdict: merge as-is
reviewed_at: '2026-07-07T18:45:43Z'
test_counts:
  passed: 2098
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
Merge as-is. Ground-truth HEAD matches (02489bbce9b3bd40459304a7fb408e5a940d0fdd). All 5 ACs Met at source: AC1 baseMs = parseEmittedAtMs(emitted_at) ?? now in all three duration-anchored branches (deadlines.ts:445-458), the non-time-anchored 4th path correctly unchanged; AC2 the untested production path (atom WITHOUT expected_by) now pinned — same deadline across a mid-window restart, miss fires after the ORIGINAL window; AC3 skew semantics tested + the r4 horizon-vs-anchor distinction documented; AC4 parseability chain verified at both cited pins (validate.ts:157-162 live; applyReplayAtom emitted_at=atom.timestamp replay) + garbage-fallback test (no throw/NaN). Critical semantic check passed: live behavior changes for skewed emissions (deadline measures from emission, not delivery) and that IS the spec's pinned honest intent; production skew exposure minimal (same-machine localhost emitter). Both builder-flagged fixture edits STAND on independent analysis: each was forced by the semantics change, each still pins the property it existed for (append-order authority; sequence-based slot clearing), and the behavior change for real ledgers with the original shapes (day-old dangling records now miss promptly) is the detector WORKING. Zero drift: exactly 4 files; coord-emit/.sh/registry untouched. Gate: coord suite 132/132 reproduced; full suite 2098 pass with the sole failure being a spec-named tolerated flake (ceo-slack-brain, isolation 18/18 recorded); lint + typecheck clean. Effect once merged: the deadline_missed detector becomes able to fire in production for the first time, retroactively covering historical ledger atoms.

## Pre-merge fixups
- [ ] none

## Expected merge conflicts
- none: src/coord/ + tests/coord/ untouched on main since claim; branch has one 4-file commit

## Follow-up items (defer, do not block merge)
- cosmetic: parseEmittedAtMs's Number.isNaN check is unreachable (canonicalizeTimestamp throws first) — harmless defense-in-depth, note only
- real-world validation (spec After-Completion): with an artificially hung reviewer across daemon restarts, confirm the first-ever production deadline_missed atom appears
