---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 6
reviewer: "codex-ops"
artifact_sha: "99b6b451ab928cde00d69d2b5007faf515e0361f"
completed_at: '2026-05-26T00:48:37Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:263"
    finding: >-
      The inode/mtime double-check still does not make stale-lock deletion atomic. Two syncAll callers can both classify the same stale lock, both pass the second lstat while the stale inode is still present, then caller A can unlink and reacquire a fresh live lock before caller B executes its already-authorized unlink; B then deletes A's live lock and the lost-update race AC6 is meant to prevent is back in production. Patch the stale-recovery protocol so cleanup is serialized, for example with a separate cleanup-claim lock that blocks normal acquisition until the reaper has either acquired the main lock or released cleanup ownership, or remove automatic stale unlinking and return a structured stale-lock error for manual recovery. Add a race test with B's second lstat before A's unlink and B's unlink after A reacquires.
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:246"
    finding: >-
      The aggregate success rule still ignores the new role failure states. AC5 now returns role actions like `error` and `source-missing`, and AC9 case 22 expects `rolesErrors[]` to make `overallOk: false`, but the public `overallOk` definition only mentions `user-modified` roles. If the builder follows this line, an EACCES writing `~/.echo/roles/` or a missing default role asset can be reported as an overall success after MCP files were written, so 073/074 can proceed with an apparently complete install that lacks usable role defaults. Patch `overallOk` to fail on any role `error` or `source-missing` plus disallowed `user-modified`, and keep every `roles: RoleSyncResult` shape complete, including `rolesErrors: []` in the lock-timeout result.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:258"
    finding: >-
      Lock acquisition leaks its per-attempt temp file on the normal `EEXIST` contention path. The spec unlinks the temp after success and on non-EEXIST errors, but a live lock makes each retry create `<lockPath>.<pid>.<uuid>.tmp` and then sleep without deleting it; a 30s retry budget at 250ms leaves roughly 120 stale files per contended sync, and repeated wizard/CLI retries can litter `~/.echo/state` indefinitely. Patch the acquisition loop to unlink the temp in a finally-style branch after every failed `linkSync`, including EEXIST, and add a lock-timeout test asserting no temp files remain.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:322"
    finding: >-
      `atomicWrite` will silently sever symlinked dotfiles. The existing-file mode rule uses `statSync(filePath)` and then renames a sibling temp over `filePath`; if a dev founder manages `~/.codex/config.toml` or `~/.cursor/mcp.json` as a symlink into a dotfiles repo, `statSync` follows the link but `rename` replaces the symlink itself with a regular file. The linked config stops receiving updates and ECHO has mutated the user's setup topology without surfacing it. Patch AC7 to `lstat` targets and either write through the resolved symlink target deliberately or return a structured `AdapterError`/conflict requiring manual intervention; pin the chosen behavior with a symlinked config-file test.
---

# codex-ops review — r6

Verdict: `proceed_after_patches`.

The r5 patches closed the earlier parent-dir, role-error, previous-absent, and skill-source symlink gaps. The remaining blockers are runtime edge cases around the lock protocol and filesystem topology. The stale-lock cleanup race is the most important one because it can reintroduce overlapping writes after a crash-recovery path; the role aggregate and temp cleanup issues are smaller but still production-visible. The symlinked-dotfile case is common enough in the target cohort that the write semantics need to be explicit before implementation.
