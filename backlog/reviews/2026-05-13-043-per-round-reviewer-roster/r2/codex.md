---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 2
reviewer: codex
artifact_sha: 9725a917ed4eb93a1f94b342ee8fa34c16307737
completed_at: '2026-05-13T06:31:07Z'
verdict: pushback
findings:
- severity: high
  where: "AC2 request/reviewer validation + AC6h 3-reviewer fixture + combined.schema.json response fields"
  finding: >-
    The R2 spec still cannot pass the load-bearing third-reviewer path through the actual queue gates. AC6h adds only a fixture reviewers.json row for `codex-arch`, but current `request.py` validates emitted requests against `request.schema.json`, whose `requested_reviewers` enum is still `codex|cursor`; `reviewer.schema.json` and `commit-reviewer-response.sh` also reject any reviewer name outside `codex|cursor`; and `combined.schema.json` has `additionalProperties: false` with only `codex_response` and `cursor_response`. At the same time AC6h expects `codex-arch_response` in `combined.md`, while lines 610-611 say request/reviewer schema enums stay explicit with no behavior change. A builder following this spec can generalize `combine.py` and still fail validation or the canonical commit helper. Specify the exact schema/helper updates for a new reviewer, or make validation derive the allowed reviewer set and response fields from reviewers.json, and make AC6h exercise `request.py`/`validate.py`/`commit-reviewer-response.sh` rather than only patching an internal responses dict.
  cross_ref:
    round: 1
    reviewer: codex
    finding_index: 3
- severity: high
  where: "AC6 Phase 3 cross-reference matching lines 512-528 + current combine.py normalize_where/cross_refs_match"
  finding: >-
    The proposed N-way grouping regresses existing combine semantics by grouping findings on the raw `where` string only. Current `combine.py` first normalizes `where` to the primary section and also treats explicit `cross_ref` as a convergence override; existing tests cover the cross_ref override path. The R2 AC6i/AC6j tests only use identical anchors, so they would pass while cross-referenced findings and multi-section `where` strings stop converging in the default two-reviewer deployment. Generalize the existing primary-anchor plus `cross_ref` matching to N reviewers, and add tests for a three-reviewer cross_ref match and a two-reviewer default cross_ref regression.
  cross_ref:
    round: 1
    reviewer: codex
    finding_index: 3
- severity: high
  where: "AC1 end-to-end roster claim + tools/review-queue/dispatch-next-round.py branch_b"
  finding: >-
    The per-round roster is not preserved across review rounds. `dispatch-next-round.py` currently invokes `request.py` without `--reviewers`, so branch (b) falls back to `request.py`'s default `codex,cursor` roster. If R1 requested `codex,cursor,codex-arch`, any R2 dispatched after patches silently drops `codex-arch`, even though AC1 says the roster is honored end to end and the files-touched list omits `dispatch-next-round.py`. Add a concrete propagation rule, such as reading the current round request and passing the same `requested_reviewers` to `request.py`, plus a test that an R<N+1> request preserves a synthetic third reviewer.
- severity: medium
  where: "AC2 _reviewers.py skeleton lines 174-244 + AC2b cache idempotency"
  finding: >-
    The `_reviewers.py` skeleton still returns and caches a mutable list even though its type signature and AC2b require a tuple. Lines 189-244 build `reviewers: list[Reviewer]`, assign `_CACHED = reviewers`, and return `reviewers`; AC2b says `load_reviewers()` returns the same tuple object. This will fail a strict tuple assertion and exposes the process cache to accidental mutation by callers. Convert once with `reviewers_tuple = tuple(reviewers)`, cache that tuple only for the default config, and return tuples for both cached and explicit `config_path` loads.
- severity: medium
  where: "AC3 _run_reviewer.sh prompt lookup lines 279-288 + current run-codex-reviewer.sh cwd"
  finding: >-
    The shared runner example imports `_reviewers` with `python3 -c "from _reviewers import load_reviewers ..."`, but the current wrapper changes directory to the repo root before doing prompt work, while `_reviewers.py` lives under `tools/review-queue`. Without `PYTHONPATH=$REPO_ROOT/tools/review-queue` or a `cd` into that directory for the lookup, AC3c will fail with `ModuleNotFoundError` instead of the required `ghost not found in reviewers.json` diagnostic. Pin the import path in both `_run_reviewer.sh` and `_install_reviewer_launchd.sh`, and make the AC3 tests assert the specific unknown-slug error.
---

# Codex review

Pushback. R2 resolves the original timeout matrix and moves the late-response guard to the correct prompt-side boundary, but the spec still leaves third-reviewer support blocked by the existing schemas and commit helper. It also regresses current combine matching semantics and drops custom rosters on the next dispatched round.
