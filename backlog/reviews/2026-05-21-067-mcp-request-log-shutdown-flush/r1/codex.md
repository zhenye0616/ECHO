---
item_id: "2026-05-21-067-mcp-request-log-shutdown-flush"
round: 1
reviewer: "codex"
artifact_sha: "1ca158b7ac038bc45ed66bf9daa132aa7e446686"
completed_at: '2026-05-21T22:00:45Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:125-133; src/daemon/lifecycle.ts:73-78"
    finding: >-
      AC2 places `flushRecentMcpCallLog(...)` before every watcher stop and `dispose()`, but does not require cleanup to continue if the synchronous write throws. In the current lifecycle implementation, `shutdown()` catches errors around the entire `onShutdownHook`; any throw from the flush skips `cursorExtractor.stop()`, `codexExtractor.stop()`, `claudeCodeExtractor.stop()`, `gitWatcher.stop()`, `fsWatcher.stop()`, and `dispose()`. That can turn a disk/permission failure in an observability flush into an incomplete or stuck graceful shutdown. Patch AC2 to require best-effort flush handling, e.g. `await mcp.stop(); try { flushRecentMcpCallLog(...) } catch (err) { log/error or stderr } finally { stop watchers and dispose }`, and add a test or explicit verification that a flush write failure does not skip teardown.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:169-174; src/mcp/server.ts:163-166"
    finding: >-
      AC4's integration-test steps call `startMcpServer({ port: 0, ... })`, but the installed API is `startMcpServer(storage, options)`. Existing tests pass `new MemoryStorage()` as the first argument. A builder following AC4 literally will write a non-compiling test or accidentally test a different seam. Patch AC4 to require `startMcpServer(new MemoryStorage(), { port: 0, enable_deadlines: false })` (or another explicit `Storage`) before the raw/SDK tool calls.
---

# Codex review

Verdict: `proceed_after_patches`.

The proposed daemon-side request-log flush is implementable and the core API shape matches the current request-log module. Patch the shutdown error-handling contract and the integration-test server invocation before claim so the builder has a precise, compiling path that preserves graceful teardown even when the flush write fails.
