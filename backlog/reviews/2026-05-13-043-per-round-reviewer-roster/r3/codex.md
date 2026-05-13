---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 3
reviewer: codex
artifact_sha: 2b264f396ef2513cb91577d5c9e8bcef1ed94257
completed_at: '2026-05-13T06:43:16Z'
verdict: pushback
findings:
- severity: high
  where: "AC1b codex-only requested round + AC6 Phase 2 dynamic response-field writes"
  finding: >-
    AC1b requires a codex-only requested round to produce schema-valid `combined.md`
    with `cursor_response: null`, but the AC6 Phase 2 implementation sketch writes
    response fields only for `request.requested_reviewers`. For `requested_reviewers:
    [codex]`, that loop emits `codex_response` and omits `cursor_response`; the
    current `combined.schema.json` has `cursor_response` in `required`, so
    `validate.py combined` rejects the AC1b happy path. Patch the spec to separate
    eligibility/body discovery from frontmatter field emission: requested reviewers
    drive which responses are expected for the round, but `combined.md` must still
    emit every schema-declared reviewer response field with `null` for unrequested
    or missing reviewers. Make AC1b validate the produced `combined.md` through the
    real schema so this cannot regress.
- severity: high
  where: "AC2 Adding a Reviewer changelist + AC6h full pipeline + tools/review-queue/commit-reviewer-response.sh:37-43"
  finding: >-
    R3 still cannot pass the synthetic `codex-arch` reviewer through the canonical
    commit path. AC2 says adding reviewer X is exactly the five listed files, and
    AC6h says each response is committed via the real `commit-reviewer-response.sh`,
    but the current helper rejects anything outside the hardcoded `codex|cursor`
    case before validation. Because AC4 now explicitly says the helper has no change,
    a builder can patch all five schema/config files and still fail AC6h at the
    commit helper. Patch 043 to generalize the helper's reviewer-name check from
    `reviewers.json` (or include the helper in the reviewer-add changelist), and keep
    AC6h exercising the real helper with `codex-arch`.
  cross_ref:
    round: 2
    reviewer: codex
    finding_index: 1
- severity: medium
  where: "AC2 reviewer.schema.json enum changelist + AC6k/AC6l cross_ref regression tests"
  finding: >-
    The five-file changelist says to append X to `reviewer.schema.json`'s `reviewer`
    enum, but that file has a second hardcoded reviewer enum under
    `findings[].cross_ref.reviewer`. AC6k and AC6l only cross-reference `cursor` or
    `codex`, so the test suite would not catch a default reviewer pointing a finding
    at `codex-arch`; `validate.py reviewer` would reject that response even after the
    advertised schema edit. Patch the changelist to require updating both reviewer
    enums in `reviewer.schema.json`, and add a fixture where a `codex` or `cursor`
    finding uses `cross_ref: {reviewer: codex-arch, ...}`.
  cross_ref:
    round: 2
    reviewer: codex
    finding_index: 1
---

# Codex review

Pushback. R3 closes the explicit R2 focus items in the artifact text, but two canonical gates are still not implementable: schema-valid `combined.md` for a codex-only requested round, and committing a third reviewer through the real helper. The cross-ref enum gap is narrower, but it is the same static-schema class and should be patched before build.
