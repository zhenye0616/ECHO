---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 5
reviewer: "codex"
artifact_sha: "5b86cf5d2dcb3ce5813901c74ebce059c4633624"
completed_at: '2026-05-26T00:20:30Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:177"
    finding: >-
      AdapterSyncProfile marks echoSection and mcpServerConfig optional, but AC6 dispatches codex and claude-code into mergeWithMarkers (which requires echoSection) and codex/cursor into the config mutators (which require serverConfig). SyncAllOpts also exposes echoMcpUrl without saying whether it synthesizes a default serverConfig. A builder can choose incompatible behaviors - skip the file, write an empty section, throw, or invent a default URL - and still point at the same spec. Patch the public contract to use a discriminated profile type with required fields per agent kind, or define the exact missing-input behavior and add tests for it.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:199"
    finding: >-
      The previous* persistence paragraph still says that when previous* is absent the conflict branch is unreachable and the adapter falls through only to append/add or noop. That contradicts AC1's explicit previous-absent rule, which says existing marked/key content that differs from the proposed bytes must return conflict. This stale sentence can lead the builder to clobber or ignore an existing ECHO block/table without cached previous state; rewrite it to match the safe conflict/no-write rule.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:201"
    finding: >-
      The global-step error contracts are incomplete. AC6 says populateEchoSkills failure becomes skillsPopulated.ok === false, but AC4.1 exposes populateEchoSkills as returning only SkillSyncResult with no ok/error variant. AC6 also says no exception escapes syncAll, while role-sync runs after agent dispatch and SyncResult.roles has no AdapterError channel for EACCES/ENOSPC/ENOTDIR during mkdir/copy/stat. Specify whether syncAll catches thrown global-step errors and maps them to top-level fields, or extend the public result types for populate/roles; add tests for populate read failure and role target write failure.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:241"
    finding: >-
      Stale-lock recovery says any process that judges a lock stale removes lockPath and retries. Two syncAll callers can both inspect the same stale lock; after caller A removes it and caller B acquires a fresh lock, caller A can still unlink lockPath based on its stale observation and delete B's live lock. The owner-token release guard does not protect stale-removal. Require stale removal to verify the lock metadata/inode is still the observed stale owner immediately before unlinking, or move the stale file aside with a compare-style guard, and add an overlapping stale-recovery test.
---

# Codex R5 Review

Verdict: proceed_after_patches.

## Findings

1. High - `AdapterSyncProfile` leaves required adapter inputs optional. AC6 does not define whether `syncAll` skips, errors, or synthesizes defaults when `echoSection` / `mcpServerConfig` is absent, and `echoMcpUrl` is declared but not wired to a concrete default.

2. Medium - The previous-value-absent rule is still contradictory. AC1 says differing existing content with no `previous*` is a conflict; AC6 still says the conflict branch is unreachable when `previous*` is absent.

3. Medium - Global-step failures are not fully representable. `populateEchoSkills` lacks the failure return shape AC6 depends on, and role-sync filesystem failures have no result channel despite the no-exception contract for `syncAll`.

4. Medium - Stale-lock removal can delete a newly acquired live lock after another caller replaces the stale lock. The spec needs a guarded stale-removal protocol and test.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `5b86cf5d2dcb3ce5813901c74ebce059c4633624` and the r5 request. I did not consume task-state for this reviewer tick.
