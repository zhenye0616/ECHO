---
item_id: 2026-05-14-050-worktree-isolation-for-multi-step-main-writers
round: 3
reviewer: codex-ops
artifact_sha: c74fde90fc4542ff3b5e80b1cb64b42018f5169c
completed_at: "2026-05-14T22:42:36Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:113-115
    finding: >-
      AC6.1 only exercises two different reviewers racing on the same round. It does not cover the launchd production case where StartInterval fires a second codex-ops wrapper before the previous codex-ops tick has pushed. Under the new isolated-worktree model both processes have independent snapshots, so both can pass the os.link guard and commit backlog/reviews/<item>/r<N>/codex-ops.md locally; the loser only discovers the duplicate after a pull --rebase/push conflict, exits non-zero, and has its worktree discarded. The first response probably lands, but unattended ops now get a noisy failed tick and no specified no-op path for the duplicate. AC1/AC6 should define and test same-reviewer overlap, preferably by re-fetching before push and exiting 0 when origin/main already has this reviewer response or combined.md for the round.
  - severity: medium
    where: backlog/ready/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md:74-75
    finding: >-
      The reviewer lifecycle moves the post-response journal append into the ephemeral worktree, then force-removes that worktree on EXIT, but the current reviewer tick contract commits and pushes only the <reviewer>.md before Step 6. Unless 050 adds an explicit sibling commit/push for raw/internal/dogfooding/mcp-interactions-journal.md plus the regenerated HTML twin, every successful launchd review can append the journal after the queue response is committed and then lose that uncommitted observability record during cleanup. The spec should make the journal durability path concrete in AC1: either update the reviewer prompts to commit/push the journal artifacts after Step 6, or have the wrapper own a post-child journal-only commit before removing $WT.
---

Ops/runtime review of R3. The simplification is directionally workable, and I am not re-opening the deferred push-failure preservation, terminality, or crashed-registered-cleanup followups. The remaining patches are about unattended scheduler behavior and making sure the new cleanup trap does not silently erase the review journal.
