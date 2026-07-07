---
item_id: "2026-07-06-122-live-loop-dashboard"
round: 2
reviewer: "codex-ops"
artifact_sha: "cb7bb2767b6b270ef472f053aa1c9a40f201360e"
completed_at: '2026-07-07T01:53:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-07-06-122-live-loop-dashboard.md:63"
    finding: >-
      AC2 defines the overlapping-poll behavior only when a cached document already exists. On cold start, a second /api/status poll arriving while the first doctor computation or child fallback is still in flight has no last cached document to return, so an implementation can satisfy the current wording while returning undefined/500 or stalling behind the same slow child. Patch AC2 and AC5 to require explicit cold-start single-flight behavior: either return a stable degraded/unknown document with cache.stale true, or wait only on the one shared computation with the same timeout bound, and add an overlapping-cold-start test.
---

## Findings

### Medium — Cold-start single-flight has no defined fail-soft response

AC2 closes the duplicate computation/process pileup case for normal cached refreshes, but not for the first compute after server start. The spec should pin the cold-start overlap behavior so unattended dashboard polling cannot produce a transient 500 or blank page before the first status document exists.
