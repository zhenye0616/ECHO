---
id: 2026-05-08-024-fs-watcher-test-quarantine-successor
title: fs-watcher.test.ts Path C successor — extend 023's quarantine to the third flaky file
status: pending_review
priority: HIGH
estimate: 15min-30min
created: 2026-05-08
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-08T20:09:28Z"
branch: "agent/fs-watcher-test-quarantine-successor"
head_sha: "07291fc5d8034493d0696afc0c3fed9f91e057ba"
pr_url: ""
agent_notes: |
  Mechanical extension of 023's Path C quarantine landed exactly as specced. `describe.skip` applied to `describe('startFsWatcher')` at `tests/capture/surfaces/fs-watcher.test.ts:41` with an 8-line tracking comment ending in the spec-required two-line closer (`2026-05-08-024-fs-watcher-test-quarantine-successor; test bodies are intact for when` / `the underlying race is fixed.`). The `classifyKind` and `_isAllowedPathIn` blocks remain enabled per acceptance — pure-function, no chokidar.

  Verification: 3 consecutive clean `npm test` runs (463 passed, 21 skipped, 0 failed each = 15 from 023 + 6 newly skipped from 024's 6-test block). `npm run lint` and `npm run typecheck` clean.

  `_followups.md` updated in two places: 023-section's `fs-watcher.test.ts Path C successor` bullet annotated `> Resolved (delivered after merge by 2026-05-08-024) ...`; 014-section's existing 023-resolution line extended with a sibling line noting the `fs-watcher.test.ts` portion is now closed by 024 (claude-code.test.ts portion remains open per item's Out-of-Scope, candidate for 025 if it surfaces at a future verify step).

  No drift events. Comment line count is 8 (vs spec's stated "7"); closing two-line pattern is exact per spec; preceding prose mirrors the cursor.test.ts (8-line) / lifecycle.test.ts (9-line) anchors cited as the canonical shape.

  Full run log: `raw/internal/agent-runs/2026-05-08-2026-05-08-024-fs-watcher-test-quarantine-successor.md`.
spec_refs:
  - tests/capture/surfaces/fs-watcher.test.ts
  - backlog/complete/2026-05-08-023-chokidar-flake-quarantine.md
  - backlog/_followups.md
blocked_by: []
acceptance:
  - "Apply `describe.skip` to the `describe('startFsWatcher', ...)` block at `tests/capture/surfaces/fs-watcher.test.ts:41`. The `classifyKind` and `_isAllowedPathIn` blocks (lines 169 and 185) MUST remain enabled — they are pure-function tests with no chokidar lifecycle."
  - "Prepend a tracking comment immediately above the `describe.skip(...)` line that follows the exact shape used by 023 in `tests/daemon/lifecycle.test.ts:121-129` and `tests/capture/extractors/cursor.test.ts:312-318`: 7-line `//`-prefixed block, ends with `// 2026-05-08-024-fs-watcher-test-quarantine-successor; test bodies are intact for when` + `// the underlying race is fixed.` (Match the comment shape so the future grep-anchored CI ship-blocker can find all three quarantines uniformly.)"
  - "**Verify with three consecutive `npm test` runs**, each clean (0 failures). Record the three failure counts in the run log. The 023 verification surfaced this file flaking on ~33% of runs, so absence of flakes across 3 runs would have been ambiguous *before* the skip — after the skip, the previously-flaky block is no longer executed and 3-run clean is the expected baseline."
  - "`npm run lint` and `npm run typecheck` clean."
  - "Update `backlog/_followups.md`: in the `## 2026-05-08 — from merge of 023-chokidar-flake-quarantine` section, mark the `fs-watcher.test.ts Path C successor` bullet resolved with a `> Resolved (delivered after merge by 2026-05-08-024)` annotation. Also annotate the `## 2026-05-01 — from merge of 014-mcp-search-memories` section: the existing `> Resolved (delivered after merge by 2026-05-08-023) for the cursor.test.ts portion only — ... fs-watcher.test.ts portions remain open per 023's Out-of-Scope.` line at line 35 should be extended (or a sibling line added) noting that `fs-watcher.test.ts` is now closed by 024 (claude-code.test.ts portion remains open)."
  - "Run log at `raw/internal/agent-runs/<run-date>-2026-05-08-024-fs-watcher-test-quarantine-successor.md` with: 3 verification run counts, list of files modified, lint/typecheck output."
files_to_modify:
  - tests/capture/surfaces/fs-watcher.test.ts
  - backlog/_followups.md
---

# fs-watcher.test.ts Path C successor — extend 023's quarantine to the third flaky file

## What

Apply the same Path C `describe.skip` quarantine that item 023 used on `tests/capture/extractors/cursor.test.ts` and `tests/daemon/lifecycle.test.ts` to the third file in the cluster: `tests/capture/surfaces/fs-watcher.test.ts`'s `describe('startFsWatcher', ...)` block.

This is a small, mechanically-uniform extension. ~15 min implementation, ~10 min verification.

## Why

023's verification step passed (3 consecutive clean runs), but the agent surfaced an open question: `tests/capture/surfaces/fs-watcher.test.ts` was flaking on ~33% of solo runs from the same chokidar `watcher.close()` race. 023's `Out of Scope` ("Quarantining other test files that aren't in the two named files") forbade expanding the scope mid-flight — correctly, per drift discipline. The founder chose option (b) at merge time: ship 023 as-is and file a tight successor.

Without 024:
- The 33% flake rate keeps polluting verify-step signal on every future merge — exactly the symptom 023 was filed to silence.
- The grep-anchored CI ship-blocker (the `_followups.md` "Optional: V1 cut hygiene" item) is harder to wire when one of three quarantines is missing.
- The 014 followup section's `> Resolved by 023 ... fs-watcher.test.ts portions remain open` annotation stays open indefinitely.

## Implementation notes

The exact tracking-comment shape from 023's `tests/daemon/lifecycle.test.ts:121-129`:

```
// SKIPPED: every test in this block spawns the real daemon, which holds an
// FSEvents/chokidar watcher whose `watcher.close()` runs slow under load on
// macOS — pushing total shutdown elapsed past the 8s waitFor predicate and
// the inline `expect(elapsed).toBeLessThan(8000)` assertion. Across baseline
// and verification runs the failing test rotates through the block (boots,
// SIGINT, refuses to start, stale PID), so per-test skips can't pin the
// flake. The block is quarantined wholesale by item
// 2026-05-08-023-chokidar-flake-quarantine; test bodies are intact for when
// the underlying race is fixed.
```

For 024 the comment should be adapted (different test surface — `startFsWatcher` exercises the watcher directly rather than via a child daemon process), but should preserve the closing two lines pattern:

```
// ... <prose adapted to startFsWatcher's actual flake shape> ...
// 2026-05-08-024-fs-watcher-test-quarantine-successor; test bodies are intact for when
// the underlying race is fixed.
```

## Out of Scope (Don't Drift)

- **Touching the `classifyKind` describe block** at `tests/capture/surfaces/fs-watcher.test.ts:169` — it's a pure-function test, no chokidar.
- **Touching the `_isAllowedPathIn` block** at line 185 — same.
- **Quarantining `tests/capture/extractors/claude-code.test.ts`** — that's the remaining open portion of the 014 followup; if it shows up as a verify-step flake post-024 it needs its own item (likely 025), not a scope expansion here.
- **Touching production fs-watcher source** at `src/capture/surfaces/fs-watcher.ts` — the bug is in test infrastructure (chokidar teardown race), not the watcher logic. Fixing the underlying race is a separate post-V1.5 item.
- **Modifying `vitest.config.ts`** — Path C didn't need it for 023, won't need it for 024.
- **Filing the chokidar real-fix item** referenced in `_followups.md`'s 023 section — that's a separate post-V1.5 spec, not this 15-minute mechanical follow-up.
- **Filing the grep-anchored CI ship-blocker item** — also a separate spec; this item just makes the CI item easier to write later.

## After Completion (Strategist Notes)

1. **No wiki promotion required** — operational/test-infra. Item lives in `backlog/complete/` only.
2. **The 014 followup's "claude-code.test.ts portions remain open" line stays open after 024 lands.** That's the next quarantine candidate if it shows up at a future verify step.
3. **Once the post-V1.5 chokidar real-fix item lands, the three describe.skip quarantines (023's two + 024's one) become deletable.** A grep of `2026-05-08-023` and `2026-05-08-024` in the test files at that time will find them all.

## Acceptance Criteria

- [ ] `describe.skip` applied to the `startFsWatcher` block at `tests/capture/surfaces/fs-watcher.test.ts:41` only.
- [ ] Tracking comment in the 023-shape, ending with the two-line `2026-05-08-024-...` + `test bodies are intact ...` lines.
- [ ] 3 consecutive clean `npm test` runs recorded in the run log.
- [ ] `_followups.md` updated: 023-section `fs-watcher.test.ts Path C successor` bullet marked resolved by 024; 014-section annotation extended to note `fs-watcher.test.ts` portion now closed by 024.
- [ ] `npm run lint` and `npm run typecheck` clean.
- [ ] Run log at `raw/internal/agent-runs/<run-date>-2026-05-08-024-fs-watcher-test-quarantine-successor.md`.
