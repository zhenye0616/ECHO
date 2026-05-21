---
item_id: "2026-05-21-066-process-backlog-handoff-atomicity"
round: 1
reviewer: "codex"
artifact_sha: "1ca158b7ac038bc45ed66bf9daa132aa7e446686"
completed_at: '2026-05-21T21:53:40Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:122-126; tools/task-state/patch-builder-state.py:289-310; tools/task-state/patch-builder-state.py:403-407"
    finding: >-
      AC1's canonical transcript calls patch-builder-state.py before the rename with --spec-path "$ITEM_FILE" while ITEM_FILE is still backlog/claimed/<id>.md. The patcher does not read that path from disk or translate it; it writes the argument verbatim into canonical_anchors.spec. The response text acknowledges the anchor must end at backlog/pending_review/<id>.md, but the transcript has no post-git-mv patch and would leave builder.md pointing at the claimed path. Patch the transcript to pass the destination path (supported because the patcher only records the string) or add an explicit second anchor update before git add, and pin that choice in the AC.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:81-96; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:145; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:160-163"
    finding: >-
      The spec still overclaims crash recovery / disk atomicity. Lines 81-86 say every pre-git-mv crash leaves the frontmatter intact and rerunnable from E2, but AC3 Test 1 and Test 4 deliberately create unstaged edits to the claimed item and builder.md before the first index operation. A crash after either edit still makes the next git pull --rebase abort on a dirty working tree; Test 3 only gets clean by manually running git restore. Narrow the invariant to "no pending_review file or partial index state before the final stage flip" or add an explicit recovery recipe for dirty claimed/builder.md edits.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:161; backlog/ready/2026-05-21-066-process-backlog-handoff-atomicity.md:205-208"
    finding: >-
      The required assertion command will not produce the expected per-file rename status. In a throwaway repo, `git diff-tree --no-commit-id --name-status HEAD` reports the top-level tree (`M backlog`); with recursion but no rename detection it reports D/A. The test needs `git diff-tree -r -M --no-commit-id --name-status HEAD` (or equivalent) before it can assert an R-status plus the M and A entries.
---

# Codex review

Verdict: `proceed_after_patches`.

The reorder is directionally right for removing the early `pending_review/` exposure and the staged-rename-plus-unstaged-metadata window. I verified the patcher contract and a throwaway `git mv` run; the spec needs the three patches above before handing to a builder.
