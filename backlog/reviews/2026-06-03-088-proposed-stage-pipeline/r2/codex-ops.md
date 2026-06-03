---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 2
reviewer: "codex-ops"
artifact_sha: "f081dadf310e7f8194a396a0bcc47342d4c9f826"
completed_at: '2026-06-03T21:34:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:93-105,120-126"
    finding: >-
      AC4 says the watcher stamps ready_content_sha on the CURRENT proposed/ file and promotes it once a terminal round is recoverable, but the runtime predicate never proves that the current file is still the exact content reviewers approved at request.spec_commit_sha. If a proposed spec is edited after rN/request.md is created but before the unattended watcher terminalizes the round, promote.py can bless and move unreviewed content into ready/, making it claimable with a fresh checksum that only protects the post-promotion file. Require promote.py or the watcher terminal step to compare the normalized current proposed file against the terminal request's pinned artifact (or a newly committed, verification-pinned patch SHA) before stamping; on mismatch it should refuse promotion, leave the item in proposed/, and write an operator-visible queue-errors.md row or dispatch a verification round.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r1 operational blockers called out in the focus hints are addressed: promotion is no longer keyed to bare `combined.md`, the negative crash-after-combine case is required, `docs/BACKLOG.md --check` is fixture-owned, and stale-ready bounce has a scheduled watcher owner. The remaining production risk is that unattended promotion can certify a file that changed after the reviewed SHA was pinned.
