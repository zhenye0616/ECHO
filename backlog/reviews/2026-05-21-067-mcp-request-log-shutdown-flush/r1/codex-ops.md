---
item_id: "2026-05-21-067-mcp-request-log-shutdown-flush"
round: 1
reviewer: "codex-ops"
artifact_sha: "1ca158b7ac038bc45ed66bf9daa132aa7e446686"
completed_at: '2026-05-21T21:59:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:126"
    finding: >-
      The shutdown hook runs `flushRecentMcpCallLog(...)` inline between `await mcp.stop()` and every watcher/storage cleanup call, but AC1/R2 only discuss slow writes, not write failures. If `writeFileSync` throws during a real SIGTERM path (EACCES, ENOSPC, dataDir removed, transient network-volume error), `lifecycle.shutdown()` catches the hook failure as one error and skips `cursorExtractor.stop()`, `codexExtractor.stop()`, `claudeCodeExtractor.stop()`, `gitWatcher.stop()`, `fsWatcher.stop()`, and `dispose()`. That can leave handles open or storage undisposed during an unattended restart, producing exactly the kind of hung/stale daemon state this observability fix is meant to help diagnose. Require the flush failure to be isolated, logged, and non-fatal to the rest of teardown.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:98"
    finding: >-
      The spec claims JSONL direct overwrite means a partial write leaves valid leading lines parseable, but `writeFileSync(path, body)` opens the target with truncation before writing. If launchd escalates to SIGKILL during a slow shutdown write, or the disk errors after truncation, the previous useful `mcp-shutdown.jsonl` can be destroyed and the current file can be empty or end in a partial JSON object. That is an ops/runtime failure mode, not rotation scope. The AC should require an atomic replace pattern (`writeFileSync(tmp)`, then `renameSync(tmp, path)`, with best-effort tmp cleanup) so a failed shutdown write preserves the last complete file or produces a complete new one.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:169"
    finding: >-
      AC4 says it exercises the full server-lifecycle flush path, but the specified test manually performs `await mcp.stop()` followed by `flushRecentMcpCallLog(...)`; it never drives the `src/daemon/index.ts` onShutdown closure or `startLifecycle` shutdown path that production SIGTERM uses. A builder could pass AC3/AC4 with the flush helper working while the daemon restart path is unwired, ordered incorrectly, or writing to the wrong `dataDir`. Add a narrow wiring test or extracted shutdown-hook test that invokes the actual hook construction used by `daemon/index.ts` and asserts the file appears at `<dataDir>/mcp-shutdown.jsonl`.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec targets the right runtime seam, but the shutdown path needs failure isolation before this is safe unattended. A diagnostic flush must not be allowed to abort the rest of daemon teardown, and the file write should preserve the last complete breadcrumb if the process is killed or the disk fails during overwrite.
