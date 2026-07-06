---
item_id: "2026-07-06-118-drift-join-nomination"
round: 1
reviewer: "codex-ops"
artifact_sha: "4f346177632468c1016598330d82158b7155bfe6"
completed_at: '2026-07-06T00:47:21Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3"
    finding: "AC3 requires named constants but does not specify their initial values or operational budget. Because the unattended sweep's judge load is bounded by statements_seen times DRIFT_MAX_NOMINATIONS_PER_STATEMENT, leaving the threshold and cap to the builder makes launchd runtime and brain-cost behavior non-reviewable. Patch the spec to lock explicit values plus rationale, and require tests that assert threshold-inclusive nomination and cap truncation at those values."
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3/AC4"
    finding: "Top-k nomination and below-threshold near-miss selection are only sorted by descending Jaccard score. Equal-score ties can select different decisions depending on store iteration order, so overlapping ticks may judge and checkpoint different pairs or emit different near-miss evidence for identical inputs. Patch the spec to require a stable tie-breaker, such as score descending then normalized subject and dedupe_key ascending, and add a tie fixture for capped nominations and near-miss logging."
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-118-drift-join-nomination.md:AC3"
    finding: "The cap bounds only brain invocations; the nominator still scores every statement against every recorded decision, with no explicit candidate-pool bound or runtime metric. If recorded decisions grow, a cron or launchd drift sweep can overrun its interval before the cap helps. Patch the spec to bound recorded decisions to the existing sweep/window input or require precomputed token sets plus a decisions_scored or elapsed log so operator-visible evidence exists when scoring cost grows."
---

## Findings

AC3 needs concrete threshold and cap values before this is operationally reviewable. The constants are named, but their values and budget rationale are not locked, so unattended brain cost and runtime behavior are left to builder choice.

AC3 and AC4 also need deterministic tie-breaking. Score-only sorting is not enough when multiple decisions have the same Jaccard score, especially with a nomination cap and checkpointed per-pair state.

Finally, the spec bounds judge calls but not scoring work. Either the scored decision pool should be explicitly bounded to the existing sweep/window input, or the sweep should surface scoring volume/runtime in the ok log so growth becomes visible before launchd ticks start overlapping.
