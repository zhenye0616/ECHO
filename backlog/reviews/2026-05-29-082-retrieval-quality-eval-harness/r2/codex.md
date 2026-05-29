---
item_id: "2026-05-29-082-retrieval-quality-eval-harness"
round: 2
reviewer: "codex"
artifact_sha: "dffc61eb30fab93fbd6f2c787e3467238393fbc8"
completed_at: '2026-05-29T23:04:13Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:96-99,166-168,184-188"
    finding: >-
      The patched baseline rules still make the required stale/degraded-source seed unshippable under current APIs. AC1/AC6 allow handoff when expected current retrieval-quality failures are reported, but line 99 declares any warning gap a harness failure; AC5 then requires a P0 stale/degraded-source case with must_warn coverage, while AC7 forbids production retrieval/wire-shape changes. The current tool warnings are limited to time-zone/cap/auto-expand style advisories, so a missing degraded-source warning cannot be marked expected-fail and cannot be fixed inside the measurement-only scope. Patch by making stale/degraded-source warning absence a retrieval-quality baseline failure with a named follow-up, or by explicitly letting the harness synthesize and score source-coverage warnings separately from tool warnings.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:122-123; src/mcp/tools/find-clusters.ts:68-70; src/mcp/tools/get-atoms.ts:27-31,240-251"
    finding: >-
      The recipe language still lets a hydration step bind a full find_clusters clusters[0].atom_ids array directly into get_atoms, but find_clusters can expose up to 200 atom_ids per cluster while get_atoms rejects more than 50 ids. A builder can implement the placeholder exactly as specified and get deterministic runtime failures before scoring. The spec needs slicing or pagination semantics, for example first/newest 50 with prefer, or chunked hydration counted against max_calls, plus a test for the over-50 case.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:99,108,125,184"
    finding: >-
      The baseline-status vocabulary is internally inconsistent. AC1 says P0 baseline status may be pass, expected_fail_current_behavior, or unexpected_fail, but AC2 says each query variant's baseline_status is only pass or expected_fail_current_behavior, and the aggregate/handoff rules only define pass and expected-fail handling. If unexpected_fail is an output status, remove it from the case-input/reporting rule; if it is an input value, AC2 and the schema/tests need to allow and define it. As written, builder tests can validly reject a value the suite-reporting rule requires.
---

# Codex Review - R2

Verdict: pushback.

The r1 patches fixed the major determinism and baseline-separation gaps, but the current artifact still has one scope blocker and two implementability holes. The blocker is the interaction between mandatory stale/degraded warning cases, the rule that warning gaps are harness failures, and the prohibition on production retrieval changes.
