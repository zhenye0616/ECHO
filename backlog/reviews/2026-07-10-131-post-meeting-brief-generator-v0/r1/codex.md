---
item_id: "2026-07-10-131-post-meeting-brief-generator-v0"
round: 1
reviewer: "codex"
artifact_sha: "2b60c695d76ccecdbe6809f35b2bd8b13ef4fe70"
completed_at: '2026-07-10T05:14:37Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2 (re-ingest — RC2)"
    finding: >-
      AC2 creates append-only superseding atoms with the same note_id, but it does not define the read-side resolution rule. Patch AC2 to require deterministic newest-atom-wins selection by updated_at, with a tie-breaker, for poller/extractor/brief note_id reads, and require a fixture where old and superseding transcript/summary atoms coexist and the brief uses only the revised atom.
  - severity: "medium"
    where: "AC3 (current-run reads — RC3) and Out of Scope"
    finding: >-
      AC3 claims to close RC3, but only covers the brief compiler while the Out of Scope section excludes the item-130 decision/card path that also reads derived:granola-signals. Patch the spec to narrow AC3/RC3 to brief-only and add a named follow-up rider for the item-130 bridge, or include that bridge path in files_to_modify with a concrete current-run filtering test.
  - severity: "medium"
    where: "AC4 (shared-state coordination — RC4)"
    finding: >-
      AC4 allows "flock or equivalent" without pinning a portable locking contract, stale-lock behavior, retry/backoff, or whether a dependency/package file is allowed. Patch AC4 to specify the exact cross-process lock mechanism that works on macOS and has a Windows path, including stale detection and the interleaved RMW test expectations.
  - severity: "medium"
    where: "AC5 (brain I/O — RC5)"
    finding: >-
      AC5 says the brain timeout must scale with input size but leaves the formula or config key for the builder to invent. Patch AC5 to pin the timeout formula or named configuration surface, including min/max bounds and at least one assertion mapping transcript size to timeout.
  - severity: "medium"
    where: "AC8 (prototype parity)"
    finding: >-
      AC8 depends on two real meetings already in storage and "matches modulo AC6 fixes", which is not diffable or reproducible. Patch AC8 or add a Tests section with fixture paths/golden outputs and an explicit comparator that ignores only owner-line, local-date, and sanitization deltas while failing on decided/actions content regression.
---
