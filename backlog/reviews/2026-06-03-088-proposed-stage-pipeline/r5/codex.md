---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 5
reviewer: "codex"
artifact_sha: "6725e43426d5f4d28e9221e9664cf028f3de644d"
completed_at: '2026-06-03T22:07:46Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:15,140-155,175-183; tools/review-queue/dispatch-next-round.py:133-138"
    finding: >-
      The r5 spec cuts path (c) for proposed-stage promotion in watcher prose and says any spec-content patch forces a verification round, but it does not authorize or test the helper that currently implements the branch decision. Today tools/review-queue/dispatch-next-round.py still routes verdict=proceed_after_patches with --patches-applied=false into _branch_c, which leaves next_round:null. If a proposed spec is patched after request.spec_commit_sha and this helper is invoked through the existing waiver path, the round still terminalizes instead of dispatching verification; promote.py will later refuse the content-identity mismatch and leave an operator-visible stuck/refuse case rather than the required forced round. Add dispatch-next-round.py to files_to_modify/spec_refs and add an AC8 test that a proposed artifact cannot take branch (c) (it must reject or dispatch path b), while preserving branch (c) for non-proposed items.
    cross_ref:
      round: 4
      reviewer: "codex"
      finding_index: 1
---

# Codex Review

Verdict: `proceed_after_patches`.

The r5 artifact resolves the prior contradictions around mismatch handling and the 087b migration authorization: mismatch is now refuse-only, waiver-after-content-patch is intended to force a round, and 087b is listed for a migration-only frontmatter edit with a claimability assertion. One implementation gap remains in the helper that actually owns the path `(c)` branch.

## Findings

1. MEDIUM - Path `(c)` is cut in watcher prose, but the branch helper remains unchanged and untested.
   The existing helper still terminalizes `proceed_after_patches` + `--patches-applied=false` by appending a waiver line and leaving `next_round: null`. Unless the spec authorizes and tests a proposed-artifact guard in that helper, a proposed spec can still reach the exact terminal shape AC4 says must be impossible after content edits.
