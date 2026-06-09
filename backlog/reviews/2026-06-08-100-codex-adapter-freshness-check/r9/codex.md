---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 9
reviewer: "codex"
artifact_sha: "fed3e8cd1b73912e21f93f95245688b112be5268"
completed_at: '2026-06-09T18:38:39Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 missing-source remediation / AC5 missing-source test"
    finding: "The missing-source special case assumes a missing recorded absolute `source` means the canonical skill was deleted or renamed, but the same condition also occurs after a repo move/reclone because the sentinel stores an absolute path from the old checkout. Patch AC1/AC5 to distinguish `source` missing but `<current REPO_ROOT>/skills/<basename>.md` present, where the remediation should be the current absolute installer command that rewrites the sentinel, from a true orphan where `rm -rf <abs managed dir>` is correct."
---

## Review

The spec is otherwise implementable and has concrete exit-code, doctor, and test contracts. The required patch is to close the false orphan case before the builder encodes `rm -rf` as the only missing-source remediation.
