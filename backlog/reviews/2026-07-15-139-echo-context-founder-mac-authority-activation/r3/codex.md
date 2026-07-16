---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 3
reviewer: "codex"
artifact_sha: "cadd1a8ba081629d27ac1549068d41e795b1b119"
completed_at: '2026-07-16T03:13:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — Build and approve exact execute artifacts / Tests"
    finding: "The build-once boundary lacks an executable post-approval test path. AC1 confines dependency installation and compilation to build clones, then requires verification clones that never install or rebuild, but Tests names TypeScript/Vitest sources—including a fixed /Users/zhenye/Desktop/echo-context checkout—and provides no immutable verifier bundle or bootstrap command. Patch AC1 and Tests with clone-relative paths and exact commands, and either hash-approve a prebuilt verification toolchain or define lockfile-pinned test-only setup that cannot invoke build/install scripts or mutate the approved artifacts."
  - severity: "high"
    where: "AC7 — Rewire machine clients and installed adapters atomically"
    finding: "Restore-on-failure covers returned errors but not process or power loss. Renaming independent files one at a time without durable intent/progress, parent-directory fsyncs, and startup recovery can leave a mixed live client set without executing restore. Require a fsynced transaction journal before the first rename, fsync each temporary file and containing directory after every rename or restore, recover incomplete transactions to all before-images before any client probe or G1 activation, and fault-inject every rename and recovery boundary."
  - severity: "high"
    where: "AC7 — Rewire machine clients and installed adapters atomically"
    finding: "The staged sequence has no compare-and-swap guard against external edits after snapshots are captured; a concurrent client edit can be overwritten and later restored to stale bytes. Byte-only snapshots also do not bind or preserve owner, mode—including 0600 client configs—ACLs, or xattrs. Require a whole-set hash/stat guard immediately before commit, abort and replan on drift, and metadata-preserving temporary creation, post-rename validation, and recovery."
  - severity: "high"
    where: "AC8 and AC10 — Adapter evidence contract"
    finding: "The claimed secret-free tuple remains open to leakage through raw adapter/source names, content hashes or checkpoint values, and free-form health verdicts or disabled reasons. Across filesystem, Git, and conversational adapters these fields can expose paths, repository/document/account identifiers, secret-bearing cursors, raw errors, or low-entropy content through equality or dictionary attacks. Replace it with a closed schema using an adapter enum, plan-bound opaque source IDs, enumerated observation/health/reason values, opaque event IDs or counts, and non-secret checkpoint surrogates; explicitly ban raw names, paths, URLs, cursors, errors, identifiers, and content-derived hashes from committed evidence."
  - severity: "medium"
    where: "AC8 and AC10 — Six-adapter coverage and seven-day acceptance"
    finding: "Coverage is not fully falsifiable: no plan-derived expected row set, per-state field rules, duplicate/unknown-row rejection, precise daily cadence, timezone/day boundary, or named schema validator is required. Patch the contract with a matrix covering all six adapters and every configured source/client instance, strict observed/disabled/no_activity eligibility and founder-approval rules, failure on missing/duplicate/unknown rows, exact uninterrupted-window and reset semantics, and an artifact-bound validation command with negative fixtures for every forbidden evidence class."
---
