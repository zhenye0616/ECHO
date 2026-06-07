---
item_id: 2026-06-07-096-workspace-identity-resolver
round: 1
spec_commit_sha: eba1c60375384c9b0ad0c18f5a928e7605a0fef4
artifact_path: backlog/proposed/2026-06-07-096-workspace-identity-resolver.md
class: structural-reform
requested_at: '2026-06-07T18:55:29Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a484d6ab-63ef-4561-a1e6-cb017b25532e
focus_hints: "Riskiest decision: LD1/LD2/LD7 move the same-machine JOIN KEY from the\
  \ repo artifact (remote-URL, just shipped by 095) to a new workspace:<canonical-root>\
  \ artifact, with the remote URL demoted to a non-join git_alias attribute. Verify:\
  \ (1) this does NOT regress 095's same-machine convergence for remote-backed git\
  \ repos (AC7 no-regression); (2) git_alias is attached as an attribute, NOT a second\
  \ join ArtifactRef (LD2 / Codex 'one active join key per join domain' \u2014 else\
  \ alias-splitting returns); (3) canonical-root discovery (AC1) is correct at capture\
  \ time \u2014 git-toplevel vs walk-up-to-anchor vs reported-dir, the ambient-root\
  \ guard ($HOME//tmp/fs-root), and symlink+case canonicalization; (4) the git-init\
  \ transition (AC7 headline) genuinely joins pre==post; (5) capture-time-into-metadata\
  \ placement matches 095 and avoids read-time FS access; (6) scope: confirm nothing\
  \ here is identity-at-rest (gap #2) or cross-machine creep \u2014 both are explicitly\
  \ OoS; (7) fileArtifact id change to workspace-keyed stays backward-compatible for\
  \ the PARKED Cursor fileArtifact(null,path) path."
---

# What to review

Read `backlog/proposed/2026-06-07-096-workspace-identity-resolver.md` at commit `eba1c60375384c9b0ad0c18f5a928e7605a0fef4`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
