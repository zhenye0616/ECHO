---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 4
reviewer: codex
artifact_sha: c364ac2216b850a3a53e6a9ace1d06adb81e90d8
completed_at: 2026-05-12T08:13:30Z
verdict: proceed_after_patches
findings:
  - severity: low
    where: §AC3.5 tests / §AC4 test coverage
    finding: |
      The AC3.5 branch split itself is mechanically correct: (a) no patches -> convergence, (b)
      patches applied -> verification round by default, (c) patches applied with explicit waiver ->
      convergence with a written rationale. The text is also clear that accepted-without-follow-ups is
      orthogonal to verification, so the R3 M1 state-machine bug is closed.

      The remaining gap is test wording. AC3.5 says "AC4 tests cover all three branches," but the
      enumerated `combine.test.ts` bullets do not include fixtures for (a)/(b)/(c), and the AC3.5 smoke
      script only asserts broad next-step classes ("escalate" or "disposition + patch + next-request").
      Add one explicit watcher-state test for the load-bearing case: patches applied + no deferred
      follow-ups -> `request.py <N+1>` and `next_round: <N+1>`, not `next_round: null`.

  - severity: low
    where: §AC4 tests — convergent findings bullet
    cross_ref:
      round: 3
      reviewer: codex
      finding_index: 2
    finding: |
      The normative match-key rule and the R2 fixture are correct: exact full-sub-anchor primary match
      or explicit `cross_ref`; `related_where_sections` is observational only. Walking the R2 fixture:
      Cursor R2 H1 primary `§Implementation Notes "Strategist watcher"` with related `[§AC3, §AC4]`
      does not converge with Codex R2 M2 primary `§AC4 combine.py polling semantics`, because there is
      no exact primary match and no `cross_ref`.

      One older test bullet still says "all findings `where`-convergent (primary or related section
      overlap)." That phrase contradicts the new rule and can steer the builder back toward the
      over-collapse RC4 just fixed. Reword it to "all findings exact-primary-convergent OR explicitly
      cross-referenced" and keep the R2 non-convergence fixture as the guardrail.
---

# Reviewer notes

R4 verdict: **proceed_after_patches** with LOW-only cleanup. The RC4 protocol changes are directionally
sound and implementable.

Focus checks:

- **AC3.5 branch split:** mechanically correct. Branch (b) is clearly the default for any spec change and
  cannot be read as "patches accepted + no follow-ups -> convergence" without ignoring the explicit RC3
  example.
- **AC4 match key:** exact full-sub-anchor matching plus `cross_ref` override closes the over-collapse
  bug. The R2 fixture is implementable and should pass as written.
- **`queue-errors.md`:** the seed file is present, tracked, not ignored, and has no path collision.
  `tools/blocked.py --validate` passes, and `tools/wiki_index.py --check` is unaffected.
- **Drift watch:** no keyboard automation, detached Cursor auto-paste, `prior_round_atoms`, or
  journal-as-normal-queue behavior reappeared. RC4's added surface area maps directly to R3
  dispositions.

If the strategist patches the two stale test-wording spots above, I would expect a final converge/claim
call rather than another substantive review round.
