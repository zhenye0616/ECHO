---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 4
spec_commit_sha: 88ca1f47340f63735a5de208bb2e80a3f3ca69f3
artifact_path: backlog/proposed/2026-06-07-096-workspace-identity-resolver.md
class: structural-reform
requested_at: '2026-06-07T19:29:45Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 40a6c63a-127a-4af6-99b8-4271803c91f2
focus_hints: 'Verify r3 patches: (1) gitToplevel git-only primitive returns null on
  git failure, probeGitState.repo_root uses it not resolveCanonicalRoot (095 git_state
  preserved); (2) AC3 watcher canonicalizes toplevel before stamping; (3) git_alias
  pinned to context.ambient.git_alias only; (4) AC8 direct capture-stamp assertions
  + outside-HOME/missing-HOME ambient-guard tests. Confirm last ambiguities closed,
  no new mechanism/scope.'
---

# What to review

Read `backlog/proposed/2026-06-07-096-workspace-identity-resolver.md` at commit `88ca1f47340f63735a5de208bb2e80a3f3ca69f3`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
