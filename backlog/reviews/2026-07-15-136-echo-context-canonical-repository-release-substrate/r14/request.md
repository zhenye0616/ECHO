---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 14
spec_commit_sha: f130ba6fd89bd598a06e7603b700fb0f66c6dd54
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T08:00:46Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 554c1654-92e7-4501-af7c-8436ab85286b
focus_hints: 'Verify the R13 propagation-completion patch at exact SHA f130ba6fd89bd598a06e7603b700fb0f66c6dd54:
  sole Node verifier and thin exec-only wrapper; complete literal source/release shell:false
  executable+argv traces; each of three boundaries orders exact empty status before
  immutable-S HEAD equality so status/rev-parse counts are 3/3; source build/derived
  verify counts 1/1 with Node-owned T created between child steps 10/11, removed after
  step 14, and exact-path lstat requiring ENOENT before final boundary; release build/caller
  verify counts 0/1 and creates no T; persistent clean retarget, ignored-owned-temp
  cleanup failure, and non-owned sentinel fixtures; no claim against adversarial transient
  retarget/restore and no retry, adoption, cleanup-owner, or authority expansion.'
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `f130ba6fd89bd598a06e7603b700fb0f66c6dd54`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
