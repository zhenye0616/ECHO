---
item_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
round: 1
spec_commit_sha: da47a231eacdec5670f4c8a30042348f0f836928
artifact_path: backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md
class: narrow
requested_at: '2026-06-05T23:17:22Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 25302a8a-ec99-4ccd-8eb2-2b93312edef6
focus_hints: Is the WIR-06/SKILL-02 second-hop correctly placed in the adapter layer
  (vs selftest-side or packaging-side)? Is AC2's diagnose-first framing for DOC-02
  right, or should the spec pin a root-cause hypothesis harder? Does AC4's packaged-rehearsal
  gate close the dev-tree-green-vs-tarball-red gap that let 090/091 ship a red packaged
  selftest?
---

# What to review

Read `backlog/proposed/2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor.md` at commit `da47a231eacdec5670f4c8a30042348f0f836928`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
