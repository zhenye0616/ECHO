---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 4
reviewer: codex
artifact_sha: 7f96cd066cb5089b51fe24f6f13170ea32a6e93c
completed_at: '2026-05-13T06:52:47Z'
verdict: proceed_after_patches
findings:
  - severity: high
    where: "AC2 default reviewers.json values + AC7 default-deploy unchanged / tools/review-queue/combine.py timeout path"
    finding: >-
      AC2 says default codex is `required: true, mode: headless, timeout_hours: null`
      and that this preserves current behavior, but the current implementation does
      not wait indefinitely for a missing codex response: `combine.py` has one
      global timeout path and emits a terminal timeout whenever either `codex.md` or
      `cursor.md` is absent past `--timeout-hours` (default 2h). The spec also leaves
      the existing `--timeout-hours=N` founder override mentioned only in Out of
      Scope, with no implementation rule once timeouts move into `reviewers.json`.
      Patch the spec to make the codex-missing-after-timeout behavior explicit and
      tested: either preserve the current default timeout/escalation semantics, or
      deliberately accept the new indefinite-stall behavior as a behavior change.
      AC7's byte-identical fixture with both reviewers present does not falsify this
      timeout branch.
  - severity: medium
    where: "AC6 Phase 3 cross-ref merge pseudocode + AC6l fixture"
    finding: >-
      AC6l asks the same codex finding to preserve AC6k's `cross_ref` to cursor and
      additionally carry a `cross_ref` to `codex-arch`, but `reviewer.schema.json`
      permits exactly one `cross_ref` object per finding. As written, the fixture is
      not expressible without duplicate YAML keys or changing the schema. The Phase 3
      merge sketch also merges buckets by each finding's original normalized anchor,
      so chained cross-ref matches can split again after an earlier merge unless the
      implementation uses a real union-find/current-parent lookup. Patch AC6l to use
      legal one-cross-ref-per-finding data and require a union-find-style merge for
      transitive N-way convergence; keep the validation assertion that a default
      reviewer can point at `codex-arch`.
---

# Codex review

R4 is much closer: the requested-vs-schema-declared response field issue is now explicit, the helper allowlist is slated for removal, and the second reviewer enum is called out.

I would proceed after the two patches above. They are narrow, but they hit real code paths: timeout behavior is part of the current combine contract, and AC6l is currently asking the builder to create a reviewer response that the schema cannot represent.
