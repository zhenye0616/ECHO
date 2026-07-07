---
item_id: "2026-07-07-128-intake-cutoff-injectable-clock"
round: 1
reviewer: "codex-ops"
artifact_sha: "44d2edbfd1c436c9187dab10ff90f2073017c21d"
completed_at: '2026-07-07T16:54:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-07-128-intake-cutoff-injectable-clock.md:AC3"
    finding: "AC3's suggested year-2030 synthetic clock can pass even with the current Date.now() bug if the filter only includes candidates newer than cutoff: a 2030-relative fixture is also newer than today's wall-clock cutoff. Patch AC3 to require a fixture that is inside the injected-clock lookback but older than the real wall-clock cutoff, such as injected now 2020-01-08 with a 2020-01-07 fixture, so the regression test fails under Date.now() and passes only when cutoff follows deps.now."
---
