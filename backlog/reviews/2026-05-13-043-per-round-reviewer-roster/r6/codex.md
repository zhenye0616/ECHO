---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 6
reviewer: codex
artifact_sha: 273e3bf796c00837e88e0110cf69f0b4a8ceb310
completed_at: '2026-05-13T07:11:53Z'
verdict: proceed_after_patches
findings:
- severity: high
  where: AC1c/AC1d/AC1e and AC6h fixture config routing
  finding: >-
    The spec relies on fixture-specific reviewers.json and patched schema files, but
    the current scripts load tool config from the script tree, not from --repo-root:
    _lib.SCHEMA_DIR is Path(__file__).parent / "schemas", validate.py has no
    repo-root or schema-dir argument, and commit-reviewer-response.sh invokes
    validate.py directly. As written, the AC6h "REAL request.py -> validate.py ->
    commit-reviewer-response.sh -> combine.py" synthetic codex-arch test cannot
    use fixture-local reviewers/schema edits without mutating the checked-in tool
    files. Patch the spec with a concrete test/runtime hook, such as an explicit
    reviewers-config/schema-dir override threaded through request.py, combine.py,
    validate.py, and the commit helper, or require a copied tool tree and name the
    exact invocation paths.
- severity: medium
  where: AC6 Phase 3 cross_ref matching
  finding: >-
    The N-way pseudocode says list-shaped findings preserve finding_index
    addressability, but it also says to preserve the current cross_refs_match(),
    which only compares round and reviewer and ignores findings[].cross_ref.finding_index.
    Once a reviewer can have multiple findings, a cross_ref to cursor finding 1 will
    match every cursor finding in that round and can falsely merge unrelated anchors.
    Patch the spec to carry 1-based finding indexes in all_findings, compare
    finding_index in cross_refs_match, and add a fixture with two target findings
    that proves only the referenced finding converges.
- severity: medium
  where: AC6 Phase 3 union-find bucket collapse
  finding: >-
    The proposed collapse step uses merged_buckets.setdefault(root, {}).update(by_reviewer).
    With the R5 list shape, update still overwrites when two unioned anchor buckets
    both contain findings from the same reviewer, dropping one list. Patch the
    algorithm to extend per-reviewer lists during bucket merges, and add a regression
    where one reviewer has findings at two anchors that are unioned by cross_ref.
- severity: medium
  where: AC6 Combined.md table rendering vs AC7 byte-identical baseline
  finding: >-
    AC6 changes default two-reviewer convergent rows from the current Source text
    "both (convergent on `<primary>`)" to a comma-list such as "codex, cursor",
    while AC7 requires byte-identical default-deploy output. Those are in conflict
    unless the AC7 baseline has no convergent rows, which would make the byte test
    miss the regression it is meant to catch. Patch one side: either preserve the
    existing two-reviewer rendering in default deploy, or require the AC7 fixture to
    include representative convergent and divergent findings and update the expected
    output intentionally.
---
# Codex review

Verdict: proceed_after_patches.

The R5-specific patches are mostly reflected in the artifact: AC1f is scoped to branch (b), AC6 uses list-shaped per-reviewer findings, AC6m covers same-anchor duplicates, and AC3 now requires chmod plus an executability assertion. The remaining gaps are implementation/test harness seams that can be patched in the spec before handing this to a builder.
