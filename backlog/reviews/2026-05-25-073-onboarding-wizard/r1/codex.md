---
item_id: "2026-05-25-073-onboarding-wizard"
round: 1
reviewer: "codex"
artifact_sha: "915b151df69fae100bb95002cf065f0ce0ccae06"
completed_at: '2026-05-26T02:43:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:122-143,181-183; src/storage/interface.ts:64-67; src/storage/sqlite.ts:55-59"
    finding: >-
      The production atom-store seam is not implementable as written against the pinned storage layer. AC1/AC2 say the default path opens a resolveDataDir-derived SQLite store and treats ENOENT as unavailable, yielding atomActivity:null or [], but the current SqliteStorage constructor creates the parent directory and opens/migrates a new DB when the file is missing. The current interface is also Storage.query({ source, since }) over CaptureEvent.timestamp, not AtomStore.queryAtoms over source_app/ts. If a builder follows the current text, a fresh onboarding run can create a daemon DB as a detection side effect and report count:0 instead of the AC1.4 fresh-install null path. Patch the spec to define an open-existing-store seam that checks the exact DB file before constructing SqliteStorage, maps agent kind to Storage.source, uses timestamp/metadata.repo_root, and add omitted-deps tests proving a missing DB creates no files and returns null/[].
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:307-326,451-462,498-499; backlog/ready/2026-05-25-072-adapter-sync-engine.md:285-295"
    finding: >-
      wire() does not define the normal 072 lock-timeout path. 072 returns a resolved SyncResult with syncLock populated and agents:[] when another sync holds the per-user lock; that is not a thrown syncAll exception and it is explicitly expected by 073's concurrent-wizard out-of-scope note. AC5 only describes per-agent ok/conflict/error entries, so the builder has no contract for cacheUpdates, wire_error, onboardingStateUpdated, or last_updated_at when no agent dispatch happened. Patch AC5/AC8 to pin syncResult.syncLock handling, preferably no cache writes and no onboarding.json mutation with onboardingStateUpdated:false, or explicitly model per-agent failed outcomes.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:322,393-407,475-480,487-488"
    finding: >-
      The completed flag has contradictory ownership. AC5.5 says the flip happens in run-wizard.ts summary(), while AC7.1/AC7.3, AC8.7, and Out of Scope section 2 say summary is a read snapshot and markCompleted() flips completed after the Step 6 UX. Patch the AC5 clarification to remove summary() as a mutator and state that only markCompleted() changes completed; otherwise the implementation and tests can satisfy different contracts.
---

# Codex review

Verdict: `proceed_after_patches`.

The staged wizard shape is sound, but the spec needs the above patches before a builder can implement it safely. The main issue is the production atom-store seam: the current storage constructor will create a DB instead of surfacing ENOENT, so the fresh-install behavior in AC1/AC2 will not happen unless the spec requires an explicit existence check before opening SQLite.
