---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 12
reviewer: "codex-ops"
artifact_sha: "2be742fceae27c29167d25d7bb5520ca4b184a99"
completed_at: '2026-05-26T01:35:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:296-323; backlog/ready/2026-05-25-072-adapter-sync-engine.md:306-307"
    finding: >-
      The lock lifecycle relies on a `process.once('exit')` handler plus the in-band `finally`, but default SIGINT/SIGTERM termination does not run that handler. In production, a user Ctrl-C, shell timeout, launchd stop, or machine shutdown during `syncAll` can leave `~/.echo/state/adapter-sync.lock` behind; because this spec deliberately removed stale-lock recovery and acquisition is one-shot, every later wizard/CLI sync returns `RETRY_CONFLICT` until the user manually removes the file. Patch the lock contract to install scoped SIGINT/SIGTERM handlers while the lock is held that call `releaseLockIfOwned`, unregister in `finally`, and then preserve normal signal exit semantics; add a child-process test that sends SIGTERM/SIGINT during a held lock and verifies the owned lock is removed while a token-mismatched lock is not.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:342-361; backlog/ready/2026-05-25-072-adapter-sync-engine.md:392-396; backlog/ready/2026-05-25-072-adapter-sync-engine.md:248-249"
    finding: >-
      AC6a guards ECHO-owned directories and Claude's commandsDir, and AC1/AC7 refuse a symlinked instruction-file target, but the parent directories for `instructionsFile` are not guarded. If `~/.codex` or `~/.claude` is itself a symlink, `lstatSync(filePath)` sees the resolved regular AGENTS.md/CLAUDE.md and the markers adapter reads and writes through the ancestor symlink, bypassing the target-symlink conflict contract and reporting success for a write outside the intended agent home. Patch AC6a to also guard `path.dirname(instructionsFile)` for codex and claude-code profiles with explicit boundary semantics, or explicitly declare ancestor symlink write-through as supported and adjust the symlink-refusal contract/tests accordingly.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r12 spec closes the prior high-risk filesystem paths I would expect around config writes, role bytes, and ECHO-owned directory symlinks. Two operational gaps remain before this should be handed to a builder: normal signal termination can strand the global sync lock, and instruction-file ancestor symlinks are not covered by the directory preflight despite direct target symlinks being refused.
