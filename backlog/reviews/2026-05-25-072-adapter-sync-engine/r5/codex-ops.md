---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 5
reviewer: "codex-ops"
artifact_sha: "5b86cf5d2dcb3ce5813901c74ebce059c4633624"
completed_at: '2026-05-26T00:19:51Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:199"
    finding: >-
      The `previous*` absent rule contradicts itself: AC1 says existing markers with no `previousEchoSection` must conflict unless the current content already equals the proposed content, but AC6 says that when `previous*` is absent the conflict branch is unreachable and the adapter falls through to append/add or noop. In production, first-run-after-upgrade or cache-loss runs are exactly when `previous*` will be absent; if the builder follows AC6, ECHO can overwrite or mis-handle a user-edited existing ECHO block/server config instead of refusing the write. Patch AC6 to match AC1/AC2/AC3's safe default and add tests for existing markers/TOML/JSON target with no previous value and changed current bytes returning conflict.
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:206"
    finding: >-
      Role sync sits outside the structured error model. AC6 wraps per-profile adapter calls and `SyncResult` has only `roles: RoleSyncResult`; AC5's role-copy contract has no `AdapterError` path for EACCES, ENOTDIR, ENOSPC, unreadable source assets, or a failed target mkdir. A real `echo init` can therefore write MCP/instruction files successfully, hit an unwritable `~/.echo/roles` or bad `assets/echo-roles`, and then throw or lose the failure instead of returning the promised complete partial-failure result. Patch the spec with a role-level error shape (for example `rolesErrors: AdapterError[]` or per-role `action: 'error'`) and add a test for role-copy EACCES/ENOTDIR resolving to `overallOk: false` without throwing.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:83"
    finding: >-
      The missing-file branches create `~/.codex/AGENTS.md`, `~/.codex/config.toml`, and `~/.cursor/mcp.json`, but the spec never requires creating their parent directories. On first-run machines it is common for an installed agent to have no per-user config directory yet; atomic writes to a non-existent `~/.codex` or `~/.cursor` parent will fail with ENOENT, turning a bootstrap case the spec calls out as supported into an operational failure. Patch AC1/AC2/AC3 or AC6 to ensure parent directories are created before first writes, and add tests where the profile's parent config directory is absent.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:129"
    finding: >-
      AC4 leaves stale files in `~/.echo/skills/`, then AC4.2 copies every `*.md` from that directory into Claude commands, while only asserting the function never reads or writes outside the source/target dirs. Without an explicit `lstat` regular-file check and resolved-path containment guard, a stale symlink such as `~/.echo/skills/private.md -> ~/.ssh/config` will be read and propagated into `~/.claude/commands/private.md`, violating that runtime confinement claim and leaking local file contents. Patch both skill-copy hops to skip or reject symlinks/non-regular files and pin it with a stale-symlink test.
---

# codex-ops review — r5

Verdict: `proceed_after_patches`.

The spec has closed the earlier lock and partial-failure holes well enough to proceed once these runtime gaps are patched. The remaining issues are all production-behavior contracts the builder needs before implementing: cache-loss conflict behavior, role-copy failures, first-run parent directory creation, and skill-copy symlink confinement.
