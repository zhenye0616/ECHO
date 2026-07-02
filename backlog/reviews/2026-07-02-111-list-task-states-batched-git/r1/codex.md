---
item_id: "2026-07-02-111-list-task-states-batched-git"
round: 1
reviewer: "codex"
artifact_sha: "52272d3339d7033fdcdb9b5e69e83e9fbfb082e0"
completed_at: '2026-07-02T07:09:30Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-111-list-task-states-batched-git.md:59"
    finding: "The batching design covers stage resolution, blob reads, and commit-time reads, but never specifies how `backlog/task-state/<task-id>/` directories are discovered at the pinned SHA. If the implementation keeps using the working tree for task-id discovery, AC3's single-SHA invariant can be broken for `ref`; if it uses per-dir probes, AC1's constant spawn count can drift. Add a required pinned batched discovery step, such as one `git ls-tree -d --name-only <sha> backlog/task-state/`, and count it in the ≤8 spawn budget and spy assertion."
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-111-list-task-states-batched-git.md:77"
    finding: "AC2 requires deep equality against the current implementation's result, but after `listTaskStates()` is rewired there is no specified callable baseline in the allowed files. That leaves the new test to either copy old production logic into the test or accidentally compare the implementation to itself. Patch AC2 or the test plan to name the exact baseline mechanism: for example, a preserved naive helper exported only for tests, checked-in expected fixture output generated from the old path, or another explicit comparison target."
---
