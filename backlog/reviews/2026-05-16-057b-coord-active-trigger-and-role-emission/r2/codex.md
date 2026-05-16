---
item_id: "2026-05-16-057b-coord-active-trigger-and-role-emission"
round: 2
reviewer: "codex"
artifact_sha: "7fcb4b202523cf3e27d032926050d273c86a0a1c"
completed_at: '2026-05-16T07:16:21Z'
verdict: "proceed_after_patches"
consumed_task_state: false
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:142"
    finding: >-
      AC0 correctly resolves the r1 bind-failure issue by requiring pinned-request mode to emit
      tick_start before bind validation, then tick_end(outcome=bind_failed) on validation failure.
      AC7 still says the request-scoped phase emits tick_start only after the pinned request is
      validated. A builder following AC7 can validate first, fail before tick_start, and leave
      057a's reviewer_invoked -> tick_start deadline open until a false deadline_missed fires.
      Patch AC7 to say pinned mode emits tick_start from ECHO_COORD_CORRELATION_ID before the
      bind-validation block, with tick_end(bind_failed, reason=...) on every bind rejection.
    cross_ref:
      round: 1
      reviewer: "codex"
      finding_index: 2
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:118"
    finding: >-
      The coord_invoke pseudocode names subprocess.spawn inside a TypeScript MCP tool, but this repo
      is Node ESM and has no subprocess module. More importantly, detached fire-and-forget reviewer
      launch in Node needs the child_process.spawn result to be unrefed, normally with stdio ignored
      or redirected, or the daemon can retain child handles and pipe backpressure can block the
      wrapper. Patch the AC to call out import { spawn } from 'node:child_process', stdio handling,
      and child.unref(), and make the wrapper-spawn test assert coord_invoke returns without waiting
      for the reviewer tick to finish.
  - severity: "medium"
    where: "backlog/ready/2026-05-16-057b-coord-active-trigger-and-role-emission.md:98"
    finding: >-
      The motivation still says coord_invoke is installed through watcher, review-pending, and
      merge-and-cleanup post-push hooks, while AC7 later says merge-and-cleanup has no 057b emission
      and merge_start/merge_complete are deferred. That reopens the non-reviewer event scope r1
      explicitly closed and gives the builder conflicting edit instructions. Remove
      merge-and-cleanup from the active-trigger caller list, or mark it as deferred in the same
      sentence.
---

# Codex review - r2

Verdict: proceed_after_patches.

The r1 fixes are mostly in place: UUID shape, blocked_by/spec_refs, wrapper spawning, and the deferral of non-reviewer event types are directionally resolved. The remaining blockers are spec-text contradictions and one Node spawn API detail that should be patched before a builder claims the item.
