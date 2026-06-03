---
item_id: "2026-06-03-088-proposed-stage-pipeline"
round: 1
reviewer: "codex"
artifact_sha: "291b9652dcb7bf374788d1ad063ff9b8f496ce40"
completed_at: '2026-06-03T21:22:27Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:15,92-96"
    finding: >-
      The recovery contract says to scan for "combined-but-not-promoted/terminalized" rounds after a crash, but the current queue writes combined.md before strategist disposition and leaves next_round null until dispatch. Implementing the scan against combined.md existence can promote a spec before the watcher has accepted findings or chosen a terminal branch. Patch AC4 to define a concrete terminal predicate for promotion recovery, such as no unresolved `_strategist fills_` rows, next_round null, escalated_to_founder false, no r<N+1>/request.md, and an explicit terminal convergence marker/body phrase, or add a dedicated terminal marker that promote.py consumes.
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:17,97-100,132-133"
    finding: >-
      AC5 and After Completion make docs/BACKLOG.md generated but also say the builder does not update the rendered file and regeneration is strategist/post-merge. That leaves two unbuildable choices: a real tools/backlog_index.py --check fails on the tracked docs/BACKLOG.md until a later actor regenerates it, or the generator can merge while its output is knowingly stale. Patch the spec to either authorize committing docs/BACKLOG.md as generator output in this branch, or state that --check is fixture-only and add an explicit post-merge verification gate.
  - severity: "medium"
    where: "backlog/ready/2026-06-03-088-proposed-stage-pipeline.md:24,112-115"
    finding: >-
      The blocked.py test target points at tests/backlog/blocked.test.* even though 086's shipped selector harness is tools/test_blocked.py and still contains the spec_review assertions this item must rework. Under drift-prevention, a builder can satisfy the listed path while leaving the real harness stale; python3 tools/test_blocked.py will either fail or miss the ready_content_sha regression. Patch files_to_modify and AC8 to name tools/test_blocked.py and require that exact command.
---

# Codex Review

Verdict: `proceed_after_patches`.

The stage split is implementable, and the direction matches the folder-location invariant. The required patches are about making the recovery predicate, generated BACKLOG ownership, and selector-test contract precise enough for a builder to execute without guessing.

## Findings

1. HIGH - Promotion recovery can fire before terminal disposition.
   `combined.md` is created before the watcher fills dispositions or writes the convergence call, and its `next_round` starts as null. AC4 needs a terminal predicate or marker that cannot match a merely-combined round.

2. MEDIUM - Generated `docs/BACKLOG.md` has no coherent first-commit ownership.
   Either the builder must be allowed to commit the generated output, or `--check` must be explicitly fixture-only until a post-merge strategist regeneration gate runs.

3. MEDIUM - The blocked selector test path misses the existing harness.
   086 established `tools/test_blocked.py` as the dedicated Python harness. 088 needs to name and rework that file directly, not a vague `tests/backlog/blocked.test.*` placeholder.
