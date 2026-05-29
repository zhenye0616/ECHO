---
item_id: "2026-05-29-082-retrieval-quality-eval-harness"
round: 2
reviewer: "codex-ops"
artifact_sha: "dffc61eb30fab93fbd6f2c787e3467238393fbc8"
completed_at: '2026-05-29T23:03:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:108; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:125; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:161-162; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:184"
    finding: >-
      `expected_fail_current_behavior` is still only an enum plus prose provenance, while the spec asks the runner to decide whether an expected-fail variant failed for the named current-behavior reason rather than for a new warning, source-coverage, circular-retrieval, or wrong-evidence regression. In an unattended eval run, that gives the implementation no machine-readable way to distinguish "known alias gap" from "new runtime regression hidden behind the baseline tag." Patch the case schema and runner contract with a structured expected-failure reason or allowed failed metrics/refs/warnings, and require JSON/Markdown output to report expected-fail matched vs mismatched so a P0 baseline cannot silently mask a different failure mode.
  - severity: "medium"
    where: "backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:146-155; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:172-184; backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md:214"
    finding: >-
      The runner supports both default all-case execution and `--case <id>`, but the runtime corpus boundary is undefined: a focused run may load only that case's fixtures while the default suite loads every committed fixture, or vice versa. Because the existing handlers search a whole `MemoryStorage` and the metrics score noise, forbidden refs, source coverage, and rank, the 03:00 failure an operator sees in the suite can disappear when they rerun `--case`, making the harness hard to debug and easy to mis-triage. Patch AC4/AC6 to declare the corpus mode explicitly, preferably making `--case` use the same loaded fixture universe as the suite while filtering only scoring/output, and add a regression test that a focused rerun preserves the failing evidence set from the full suite.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 artifact is much closer from the ops lens: deterministic time, host-token rewriting, duplicate timestamp handling, and the harness-vs-retrieval-quality split are now explicit. The remaining gaps are about unattended failure interpretation and reproducibility: expected-fail variants need a machine-checkable reason, and focused reruns need the same corpus semantics as the suite so operators can reproduce failures.
