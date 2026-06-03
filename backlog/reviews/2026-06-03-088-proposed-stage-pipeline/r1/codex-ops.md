---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 1
reviewer: "codex-ops"
artifact_sha: "291b9652dcb7bf374788d1ad063ff9b8f496ce40"
completed_at: '2026-06-03T21:22:07Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:92-96; skills/review-queue-watch.md:75-120"
    finding: >-
      AC4 makes the recovery pre-step scan for combined-but-not-promoted rounds and recompute promotion from review artifacts, but the current watcher commits and pushes combined.md before disposition, spec patches, next-round dispatch, or the terminal claimability marker. An unattended crash immediately after combine.py pushes combined.md can therefore leave a round that is combined but not terminal. If the new promote.py treats that shape as convergence recovery, the next watcher tick can move an unpatched proceed_after_patches or pushback spec into ready/ and make it claimable. Require an explicit terminalization predicate for promotion recovery, such as filled dispositions plus a terminal branch marker/waiver after patches, and make tests cover crash-after-combine-before-disposition so review artifacts alone cannot trigger promotion.
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:76-79,92-96,101-107"
    finding: >-
      The stale-ready bounce has no unattended owner. The spec says blocked.py reports a ready_content_sha mismatch and the explicit promote.py repair path performs the ready-to-proposed bounce, but builder ticks only call blocked.py for candidates and watcher ticks scan review rounds. A ready item edited after promotion can fail closed, disappear from the candidate list, and remain in ready/ until an operator manually discovers and repairs it, recreating the hidden non-claimable state this spec is meant to remove. Assign the bounce to a concrete scheduled path, for example a watcher pre-step or claim-path repair mode, and require an operator-visible log or queue-errors entry when it fires or fails.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The stage model is directionally sound, but the unattended recovery paths need tighter predicates before this becomes safe for launchd-driven ticks. The promotion helper must not infer terminal convergence from `combined.md` alone, and stale-ready repair needs a concrete runtime owner rather than a manual-only helper.
