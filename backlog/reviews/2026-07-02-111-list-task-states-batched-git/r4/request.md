---
item_id: 2026-07-02-111-list-task-states-batched-git
round: 4
spec_commit_sha: 114a308af7770bc377bc5516b38c673d3b13ddbf
artifact_path: backlog/proposed/2026-07-02-111-list-task-states-batched-git.md
class: narrow
requested_at: '2026-07-02T07:59:37Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a2ec4d6f-57e1-4d47-ae0d-73f755f5d30d
focus_hints: "Verify (single delta): AC6(a) lifecycle symmetry \u2014 every streaming\
  \ batched git child including the log --name-only walk is awaited and killed/reaped\
  \ on parse error, missing object, MCP abort, or consumer failure; capture-with-sized-buffer\
  \ acceptable if awaited with surfaced failures. Everything else was verified clean\
  \ in r3 (codex: proceed, zero findings)."
---

# What to review

Read `backlog/proposed/2026-07-02-111-list-task-states-batched-git.md` at commit `114a308af7770bc377bc5516b38c673d3b13ddbf`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
