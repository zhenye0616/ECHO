---
item_id: 2026-06-06-095-canonical-repo-identity
round: 2
spec_commit_sha: a3a95e04cc1c60ede37b9813c37d6a45253707db
artifact_path: backlog/proposed/2026-06-06-095-canonical-repo-identity.md
class: narrow
requested_at: '2026-06-07T04:49:45Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9b9168bb-8314-4340-a051-a27a2988e0bf
focus_hints: "R2 verify spec @ a3a95e04 against r1's 4 accepted patches: (1) AC3 +\
  \ LD8 \u2014 git watcher uses repo-root-scoped 'git -C <repo_root> remote get-url\
  \ origin' (NOT process-cwd) with a bounded/invalidatable per-repo cache that RE-resolves\
  \ an absent/failed origin (no permanent local/stale pin); codex F2 + codex-ops F2.\
  \ (2) AC7 + LD7 \u2014 credential (userinfo) stripping happens AT CAPTURE in BOTH\
  \ probeGitState and the git watcher before stamping metadata.*origin_url (not via\
  \ artifacts.ts; LD6 intact), so raw stored metadata never holds a secret; credential-bearing-remote\
  \ regression required in AC8; codex-ops F1. (3) AC8 \u2014 builder test coverage\
  \ now enumerated (cross-adapter convergence, derived-id prefix, POSIX-vs-C:\\ machine-independence,\
  \ remote-less fallback, cred-scrub, cache-retry); codex F1. (4) Confirm probeGitState\
  \ (AC1) cwd-scoping claim is correct and that no patch introduced a NEW hazard;\
  \ confirm boundaries (no artifacts.ts change, no read-time aliasing, no historical\
  \ migration) still hold."
---

# What to review

Read `backlog/proposed/2026-06-06-095-canonical-repo-identity.md` at commit `a3a95e04cc1c60ede37b9813c37d6a45253707db`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
