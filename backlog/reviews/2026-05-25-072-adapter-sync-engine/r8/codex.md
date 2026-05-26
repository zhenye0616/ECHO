---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 8
reviewer: "codex"
artifact_sha: "5e572671b8d886b40a5a093511b236cf8a641d9a"
completed_at: '2026-05-26T01:06:04Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:329"
    finding: >-
      AC7.2a requires adapters to call atomicWrite with followSymlink true/false, and AC9 cases 21-22 depend on that option, but AC7.1's public AtomicWriteOpts interface omits followSymlink. In this strict TypeScript repo, a direct atomicWrite({ ..., followSymlink: true }) call fails excess-property checking unless the builder widens the type ad hoc; omitting the option violates the codex/cursor symlink write-through and marker/skill symlink refusal contracts. Patch the public surface to include followSymlink?: boolean and pin the helper behavior in atomic-write tests.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:309"
    finding: >-
      The lock-failure result shape says lockfile EEXIST, EACCES on link, and mkdirSync failures all return syncLock.code: 'RETRY_CONFLICT', but AC6 line 286 names real filesystem setup errors and AC9 case 12 expects ENOTDIR or UNKNOWN for the regular-file-as-ECHO_HOME path. A literal implementation cannot satisfy both the public example and the test. Patch the example so RETRY_CONFLICT is reserved for an already-present lock, while mkdir/link filesystem failures preserve a normalized AdapterError code (adding EROFS to the enum if the spec wants to name it).
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:348"
    finding: >-
      AC7.2a adds target-symlink safety for more than the two AC9 symlink cases currently listed: markers on AGENTS.md/CLAUDE.md must return a conflict with targetIsSymlink, and AC4.1 populateEchoSkills should skip an existing symlink at targetDir/<name>.md. AC9 only pins codex/cursor dotfile write-through, claude commands target skip, and source symlink skips. Without tests, a builder can follow or replace a symlinked instruction file or ~/.echo/skills target and still pass the suite. Add explicit marker-target-symlink and populate-target-symlink cases.
---

# Codex R8 Review

Verdict: proceed_after_patches.

## Findings

1. Medium - `AtomicWriteOpts` omits the `followSymlink` option even though AC7.2a makes it load-bearing for adapter behavior and tests.

2. Medium - The lock-failure public example assigns `RETRY_CONFLICT` to filesystem setup errors, contradicting the later ENOTDIR/UNKNOWN test contract.

3. Medium - The new target-symlink safety contract is not fully pinned by AC9; marker target symlinks and populateEchoSkills target symlinks need explicit tests.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `5e572671b8d886b40a5a093511b236cf8a641d9a` and the r8 request. I did not consume task-state for this reviewer tick.
