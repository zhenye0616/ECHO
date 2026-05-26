---
item_id: "2026-05-25-073-onboarding-wizard"
round: 1
reviewer: "codex-ops"
artifact_sha: "51e1f09459bd64ed822dbafcacf64f7e02b9955a"
completed_at: '2026-05-26T02:43:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:86,143,183; src/storage/sqlite.ts:55-65"
    finding: >-
      The production detect path is specified as direct SQLite access through the existing storage layer, with ENOENT treated as a fresh-install no-op, but the referenced SqliteStorage constructor is not a read-only opener: it mkdirs the parent, opens/creates the DB, sets WAL pragmas, runs migrations, and canonicalizes timestamps. In production that means a supposedly read-only onboarding scan can create or migrate the atom DB instead of returning `atomActivity: null` / `[]`, and it can contend with the live daemon during migrations or timestamp canonicalization. Patch AC1/AC2 to require an explicit file-exists check plus a read-only/fileMustExist connection path that does no migrations or writes (or a dedicated read-only query helper with busy-timeout/close semantics), and add a fresh-install test proving no DB file is created by detection.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:286-324,499-511"
    finding: >-
      The spec claims concurrent wizard invocations are covered by 072's per-user lock, but AC5 reads the previous* cache and builds AdapterSyncProfile values before calling syncAll, then writes adapter cache and onboarding.json after syncAll returns. The 072 lock only protects the file mutations inside syncAll; two `echo init` surfaces can still observe stale cache, race between syncAll release and cache/state persistence, or let a lock-timeout invocation advance onboarding.json in a confusing partial state. Patch 073 to hold a wizard-level lock around cache read -> syncAll -> cache write -> onboarding-state write, or require 072 to expose a locked callback that covers the caller-owned persistence phase, and pin an overlapping-wire test.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-073-onboarding-wizard.md:322,385-399,407,477-480,488"
    finding: >-
      The completed-state contract contradicts itself: AC5.5 says `completed` stays false but then says the flip happens in `summary()`, while AC7 and the tests say `summary()` is read-only and only `markCompleted()` flips the bit after the user dismisses Done. At runtime this is the state bit 074 will use to resume or skip onboarding, so a literal implementation can mark onboarding complete merely by rendering a summary or never mark it after a successful probe. Patch the spec so `summary()` is read-only everywhere, `markCompleted()` is the only completed=true writer, and AC5.5 removes the stale summary clarification.
---

# codex-ops review

Verdict: `proceed_after_patches`.

073 is implementable as a staged library, but the production posture needs tightening before a builder starts. The direct atom-store read must be genuinely read-only, the wire transaction needs a lock that covers caller-owned cache/state persistence, and the completed-state writer has to be unambiguous so 074 can resume onboarding safely.
