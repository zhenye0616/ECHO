---
item_id: "2026-05-13-046-context-fatigue-via-role-typed-state"
round: 1
reviewer: "codex-ops"
artifact_sha: "5480034c98a7a28e6a8eefa1492c16cd6097585f"
completed_at: "2026-05-14T00:35:29Z"
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC7 plus reviewer invariant, lines 38, 65, 96-101, and 113"
    finding: >-
      AC7 tells any action with a `task_state_ref` in scope, including the current review round, to read the pointer first. That directly contradicts the reviewer-tick invariant that reviewers must not consume task-state. In production, a future unattended reviewer tick that follows the cold-start primer will contaminate the fresh-eyes-at-SHA review before it even reads the artifact. Patch AC7 to explicitly exclude reviewer ticks, or narrow "current review round" to watcher/dispatcher/strategist consumers only.
  - severity: "high"
    where: "AC4/AC5, lines 70-87"
    finding: >-
      `get_role_state` reads from disk at current main HEAD while AC5 also promises SHA-equivalent reads, but no operational snapshot is defined. At runtime a client can call MCP while the repo is mid-pull/rebase, while a human is editing a pointer, or while `list_task_states` is cross-referencing backlog stage files from a different working-tree moment. The result can be partial content, uncommitted content, or a stage/pointer pair that never existed together. Patch the spec to read committed blobs through an explicit ref/SHA, or define dirty-tree rejection plus atomic writer requirements and a single snapshot for list/get.
  - severity: "medium"
    where: "AC1 round evolution and writer responsibilities, lines 48-49"
    finding: >-
      `round-state.md` is rewritten in place at each round boundary, but the spec does not assign a single runtime owner or conflict path for watcher-versus-strategist writes. If the watcher writes after combine while the strategist is also updating the synthesis, the last commit wins and can silently drop still-load-bearing decisions. Patch with one owner for boundary rewrites, an atomic write-and-commit protocol, and a visible conflict/queue-errors path when the file changed since the writer read it.
  - severity: "medium"
    where: "AC3/R2 reviewer contamination lint, lines 65 and 145"
    finding: >-
      The fresh-eyes guard is specified as a warning when a reviewer response references the task-state pointer. Warning-only validation is not enough for the unattended queue: canonical reviewer commits proceed on exit 0, and warnings can disappear into job logs instead of `combined.md` or `queue-errors.md`. If preserving fresh-eyes is a critical invariant, make this condition a hard validation failure for reviewer responses or require the warning to be surfaced in a committed artifact the operator will see.
  - severity: "medium"
    where: "AC8 and Definition of Done, lines 103-108 and 122-128"
    finding: >-
      AC8 says the post-046 cold-start measurement happens within one week of merge, but the Definition of Done requires the measurement in review_notes at merge time. That creates an operational deadlock: the item cannot be completed until after it has already merged, so the merger either blocks indefinitely or records placeholder data. Patch by splitting pre-merge recursive dogfooding from the post-merge one-week measurement, with only the pre-merge demo required for this item's completion.
---

# Codex-ops review

Verdict: `pushback`.

Reviewed `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at `5480034c98a7a28e6a8eefa1492c16cd6097585f` through the operational/runtime lens.

The primitive is directionally useful, but the current spec leaves several unattended-runtime failure modes open: reviewer state contamination, non-snapshot MCP reads, competing round-state writers, invisible warning-only guards, and a merge-time measurement requirement that cannot be satisfied as written.
