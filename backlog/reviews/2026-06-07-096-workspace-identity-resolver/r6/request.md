---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 6
spec_commit_sha: 3bc9042d60d50dba9d8139d17784615d3541a104
artifact_path: backlog/proposed/2026-06-07-096-workspace-identity-resolver.md
class: structural-reform
requested_at: '2026-06-07T19:50:18Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a74eecad-6e17-41a2-ba93-bf09e54022ce
focus_hints: 'Holistic consistency rewrite applied (fresh-context codex, per founder,
  to escape local-minimum patching). Verify: git-state.ts frontmatter now matches
  AC1/AC2 (git-only gitToplevel, NOT resolveCanonicalRoot); AC8 has runnable verification
  commands; files_to_modify comments all match their ACs; single git_alias location
  (context.ambient.git_alias); exact local:workspace:<root> key throughout; no load-bearing
  requirement dropped vs prior rounds. Expect convergence.'
---

# What to review

Read `backlog/proposed/2026-06-07-096-workspace-identity-resolver.md` at commit `3bc9042d60d50dba9d8139d17784615d3541a104`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
