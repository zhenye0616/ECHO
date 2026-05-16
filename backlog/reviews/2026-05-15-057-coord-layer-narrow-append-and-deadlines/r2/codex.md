---
item_id: "2026-05-15-057-coord-layer-narrow-append-and-deadlines"
round: 2
reviewer: "codex"
artifact_sha: "5beaf38b35336b0e25142f5ac01e6db22a18c1ba"
completed_at: '2026-05-16T03:45:05Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "files_to_modify line 22; AC0 lines 123, 126, and 128"
    cross_ref:
      round: 1
      reviewer: "codex"
      finding_index: 1
    finding: >-
      The r1 ordering fix is only partially applied: AC0 now says the load-bearing active trigger fires from the watcher after `push-with-retry.sh`, but `files_to_modify` and AC0 still require `request.py` to call `coord_invoke` after writing `request.md`. `request.py` runs before the watcher commits and pushes that file, so those pre-push invocations can spawn reviewers whose Step 1 pull sees no candidate and exits cleanly. Because AC0 also allows the strategist to short-circuit combine when reviewers emit `tick_end` for a correlation_id, a pre-push no-op tick can look like reviewer completion without any `codex.md`/`codex-ops.md` on `origin/main`. Patch the spec to remove reviewer invocation from `request.py` entirely, or constrain it to a non-reviewer test hook that cannot share the production round correlation_id. Add a fixture proving `request.py` alone never spawns reviewers and that only the post-push watcher hook can produce reviewer `tick_start`/`tick_end` for a review round.
  - severity: "medium"
    where: "AC0 line 122; AC2 lines 163-164 and 181-182; AC3 lines 191-192; AC8 lines 244-246"
    finding: >-
      The deadline state machine still lacks a concrete transition rule for the `expects` table. AC0 says `reviewer_invoked` opens a pre-spawn deadline that `tick_start` later closes, and AC2 encodes `reviewer_invoked -> tick_start` plus `tick_start -> tick_end`, but AC3 only says `tick_start` inserts and `tick_end` deletes. A literal implementation can leave the `reviewer_invoked` record open after a successful `tick_start`, causing a false `deadline_missed`, or fail to reconstruct/suppress pre-spawn deadlines because AC8's reconstruction fixture only pre-seeds `tick_start`. Patch AC3 to define the generic algorithm: on every coord event, first close open records for the same role/correlation whose configured `expects` equals this event_type, then open a new record only if this event_type itself has an `expects` config. Add reconstruction tests for overdue `reviewer_invoked` with no `tick_start` and non-overdue/closed `reviewer_invoked` followed by `tick_start`.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r2 patch set fixes most of the r1 structural gaps: reviewer slugs now line up, pre-spawn deadlines exist, coord failures are best-effort, Cursor emission is scoped out of V1, idempotency is per role/event, and the search-vs-mailbox non-pollution contract is explicit.

One ordering hazard remains: `request.py` must not spawn production reviewers before the watcher has pushed the request to `origin/main`. I also want the deadline tracker's event-transition algorithm made explicit so `reviewer_invoked -> tick_start -> tick_end` cannot be implemented as two independent timers that false-positive after a healthy start.
