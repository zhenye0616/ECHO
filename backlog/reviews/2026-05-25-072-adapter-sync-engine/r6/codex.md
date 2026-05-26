---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 6
reviewer: "codex"
artifact_sha: "99b6b451ab928cde00d69d2b5007faf515e0361f"
completed_at: '2026-05-26T00:48:35Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:263"
    finding: >-
      The new stale-removal protocol still is not atomic across separate syncAll processes. Lines 263-267 double-check inode and mtime, but after the second lstat returns and before unlinkSync(lockPath) executes, another process can remove the stale file and acquire a fresh lock at the same path; this process then unlinks that fresh live lock. The statement that there is no race window is therefore false for the CLI/wizard multi-process case this lock is meant to protect, and AC9 case 18 only races two in-process callers, which cannot prove the path-unlink race. Patch AC6 to either drop automatic stale removal, or serialize stale recovery with a separate reaper/acquisition guard and add a child-process or worker-thread test that proves a stale reaper cannot delete a newly acquired live lock.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:285"
    finding: >-
      The lock-timeout SyncResult shape is not type-compatible with the RoleSyncResult contract. AC5 makes rolesErrors required on RoleSyncResult, and SyncResult.roles is typed as RoleSyncResult, but the lock-timeout example returns roles: { results: [] } with no rolesErrors. A literal implementation will fail npm run typecheck or force the builder to weaken the type. Patch the timeout shape and AC9 case 14 to require roles: { results: [], rolesErrors: [] }.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:137"
    finding: >-
      SkillSyncResult is still internally inconsistent. AC4.2 says syncClaudeSkills skips symlinks but then says skipped is empty in V1, while AC9 case 21 requires skipped to include symlinked.md. AC4.1 also returns an ok: true branded success object, AC4.2 omits ok, and line 148 says both functions share the same return shape. This leaves syncAll.skillsPopulated and the claude-code action result ambiguous. Patch the public type contract explicitly, for example define PopulateEchoSkillsResult as ok-branded and SkillSyncResult as copied/skipped/targetDir with skipped populated for symlink skips, then align AC4.2 and tests.
  - severity: "low"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:408"
    finding: >-
      The AC7 concurrent-overlap test does not actually create concurrent atomicWrite calls as specced because atomicWrite is synchronous. Promise.all over synchronous wrappers in one Vitest process runs each write to completion before the next one can enter fs.openSync/renameSync, so the test can pass without exercising overlapping temp paths. Keep the 100x suffix uniqueness test, but make the no-corruption overlap test use worker_threads, child_process, or a mocked fs layer that blocks between temp creation and rename.
---

# Codex R6 Review

Verdict: proceed_after_patches.

## Findings

1. High - The stale-lock recovery patch still has a path-unlink TOCTOU window across separate processes. The spec needs a real serialized stale-reaper/acquisition protocol, or it should remove automatic stale deletion.

2. Medium - The lock-timeout SyncResult omits required rolesErrors, contradicting RoleSyncResult and risking a typecheck failure.

3. Medium - Skill sync return types and skipped semantics are contradictory around ok branding and symlink skips.

4. Low - The AC7 overlap test is serial in practice because atomicWrite is synchronous; it needs a worker/child-process or blocking mock to exercise overlap.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `99b6b451ab928cde00d69d2b5007faf515e0361f` and the r6 request. I did not consume task-state for this reviewer tick.
