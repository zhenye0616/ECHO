---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 2
spec_commit_sha: 4bd719ed4452ba6291e58998a8c3014a17b6c9b8
artifact_path: backlog/proposed/2026-06-07-096-workspace-identity-resolver.md
class: structural-reform
requested_at: '2026-06-07T19:10:39Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 023b002e-a59f-4dd5-a9c6-592bcdbf5727
focus_hints: "Verify the r1 patches: (1) LD1 exact tuple provider:local/type:workspace/id:<canonical-root>\
  \ and the literal AC7 key 'local:workspace:<root>'; (2) AC1 completeness \u2014\
  \ exact anchor set, parent-by-parent traversal, ambient-root guard set, non-existent-path\
  \ canonicalization (realpath-longest-existing + lexical remainder); (3) AC1 bounded\
  \ best-effort NEVER throws out of capture and degrades i->ii->iii, with NO new observability\
  \ (matches probeGitState silent-failure); (4) AC5 outside-root/'..' file path falls\
  \ back to abs:<path>, never a ..-bearing id; (5) AC8 Cursor null-root + outside-root\
  \ regression tests. Confirm no scope creep into identity-at-rest (gap #2) or cross-machine\
  \ merge."
---

# What to review

Read `backlog/proposed/2026-06-07-096-workspace-identity-resolver.md` at commit `4bd719ed4452ba6291e58998a8c3014a17b6c9b8`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
