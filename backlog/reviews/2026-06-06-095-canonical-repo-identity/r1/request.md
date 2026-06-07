---
item_id: 2026-06-06-095-canonical-repo-identity
round: 1
spec_commit_sha: 5eaee043db5c54a71e42ef36874658e3f7d5af18
artifact_path: backlog/proposed/2026-06-06-095-canonical-repo-identity.md
class: narrow
requested_at: '2026-06-07T04:35:49Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 2b1e388a-4161-4a04-a591-41cf56a86016
focus_hints: "R1 initial review of spec 095. Verify capture-time canonicalization\
  \ design: (1) AC1 probeGitState adding 'git remote get-url origin' to the Promise.all\
  \ fan-out + new GitState.origin_url field is correct, cache-safe, and silent on\
  \ remote-less repos; (2) AC2/AC3 claude_code already consumes git_state.origin_url\
  \ and git adapter must stop hardcoding null in repoArtifact(null,..) \u2014 confirm\
  \ codex needs NO change (reference impl); (3) cluster join-key src/trace/cluster.ts:7\
  \ correctly OUT of scope (converge inputs, not the comparison); (4) machine-independence:\
  \ normalized-remote identity is independent of local path/OS (Windows tester C:\\\
  \ vs /Users); (5) boundaries hold: remote-less local fallback unchanged, no historical\
  \ retro-migration, no read-time aliasing; (6) ARE the 4 files_to_modify sufficient\
  \ \u2014 does claude-code extractor actually persist probeGitState into metadata.git_state,\
  \ and is there a git worktree / detached-.git edge where 'git remote get-url origin'\
  \ resolution differs?"
---

# What to review

Read `backlog/proposed/2026-06-06-095-canonical-repo-identity.md` at commit `5eaee043db5c54a71e42ef36874658e3f7d5af18`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
