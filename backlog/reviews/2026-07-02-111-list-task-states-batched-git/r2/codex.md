---
item_id: "2026-07-02-111-list-task-states-batched-git"
round: 2
reviewer: "codex"
artifact_sha: "b79a812bdcb54ecdeb230e21ca679e95bad3437f"
completed_at: '2026-07-02T07:28:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-111-list-task-states-batched-git.md AC1 / AC6"
    finding: "AC1 says the fixed 8-spawn budget is asserted via an injected or spied `gitCapture`, but AC6 and the design allow streaming/raw child processes for `cat-file --batch` and `git log --name-only`. A builder could add uncounted raw git children while the `gitCapture` spy still passes. Patch AC1/AC6 to require a single injectable git runner/process factory or spawn ledger that counts rev-parse, all ls-tree calls, cat-file batch, and log streaming, and fails on any extra git child regardless of capture-vs-streaming implementation."
  - severity: "medium"
    where: "backlog/proposed/2026-07-02-111-list-task-states-batched-git.md AC2"
    finding: "AC2 requires a checked-in expected-JSON baseline generated from the pre-change implementation, but it does not name the fixture repo path, expected JSON path, or reproducible sequence that makes the new fixture available to the old implementation. Patch AC2 to name those checked-in files and require an explicit generation command or ordered builder step: create fixture data first, run the old implementation against that fixture before rewiring production code, then check in the generated JSON baseline."
---
