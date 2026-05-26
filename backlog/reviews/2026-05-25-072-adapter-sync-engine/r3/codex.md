---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 3
reviewer: "codex"
artifact_sha: "b37b865ea305032c651de57617f6b75336f8f842"
completed_at: '2026-05-26T00:06:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:94-101"
    finding: >-
      AC2's TOML byte-range instructions tell the builder to parse the full `[mcp_servers.echo]` table slice and compare that parsed value directly to `previousServerConfig` / `serverConfig`, then stringify the naked `serverConfig` and replace the full target range. That is not a coherent TOML shape: the parsed slice is table-wrapped, while `serverConfig` is the inner object, and stringifying only the inner object would produce top-level `url = ...` keys rather than the required `[mcp_servers.echo]` header. A literal implementation either never reaches noop/update because comparison is against the wrong object shape, or it deletes the table header on update. Patch the spec to define an explicit unwrap/render contract, e.g. parse `parsed.mcp_servers.echo` for comparison and render updates as the `[mcp_servers.echo]` table plus the stringified body, with a test that the updated file still contains the table header.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:211-225 and 340-352"
    finding: >-
      The public `SyncResult` interface has only `skillsPopulated`, `agents`, `roles`, and `overallOk`, but the overlapping-lock test lets the builder choose either a new top-level `syncLock?: AdapterError` or injecting `RETRY_CONFLICT` into every agent. That choice changes the downstream contract for 073/074 and also leaves the lock-timeout path underspecified: if the lock is never acquired, `syncAll` has not populated skills or synced roles, yet the required `skillsPopulated` and `roles` fields still need defined values. Pick one result shape in AC6, not in the test prose, and specify the exact `SyncResult` returned on lock timeout.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:104-115 and 250-261"
    finding: >-
      AC2/AC3 require missing Codex/Cursor config files to be created at mode `0600`, while AC7 intentionally makes the secret-sensitive allowlist exact-match the real `os.homedir()` paths and says tmpdir tests must pass `secretSensitive: true`. The adapter APIs only accept `filePath`/`serverConfig`, and the AC2/AC3 prose never states that `syncCodexMcpBlock` and `syncCursorMcpEntry` must pass `secretSensitive: true` to `atomicWrite` for all config writes. A literal implementation using only the allowlist will create injected tmpdir config paths with the umask default, failing the required temp-dir tests; a builder may be tempted to reintroduce suffix matching, which AC7 explicitly rejects. Add the explicit adapter-to-atomicWrite handoff.
---

# Codex Review

Verdict: proceed_after_patches.

## Findings

1. AC2 needs an explicit TOML unwrap/render contract for `[mcp_servers.echo]`; the current wording mixes the table-wrapped parse shape with the inner `serverConfig` shape.
2. AC6 needs to choose the lock-timeout `SyncResult` shape in the public interface, not leave it to the builder in AC9.
3. AC2/AC3 need to say config adapters always call `atomicWrite(..., secretSensitive: true)` for Codex/Cursor config writes, including test-injected tmp paths.

## Verification Notes

Reviewed the r3 artifact at `b37b865ea305032c651de57617f6b75336f8f842` plus the inline request body. I did not consume task-state pointers; this is a fresh-eyes-at-SHA review.
