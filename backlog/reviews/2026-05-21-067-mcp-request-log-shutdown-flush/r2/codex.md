---
item_id: "2026-05-21-067-mcp-request-log-shutdown-flush"
round: 2
reviewer: "codex"
artifact_sha: "77026eaaf87717924e42286dfbe8f47d78fd404a"
completed_at: '2026-05-22T05:30:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:128"
    finding: >-
      Test (iii) still does not exercise the actual daemon/index shutdown wiring it claims to prove. The spec says to import startLifecycle, build the same onShutdown closure shape used by daemon/index.ts, and emit SIGTERM; that only proves lifecycle invokes a test-authored hook. A builder could leave src/daemon/index.ts unchanged and this test would still pass. Patch AC4 to exercise the real src/daemon/index.ts registration by mocking startMcpServer/extractor/watchers/startLifecycle, capturing the onShutdown callback that index.ts passes, invoking that callback, and asserting the mcp.stop -> flushRecentMcpCallLog(join(dataDir, 'mcp-shutdown.jsonl')) -> teardown order. If direct entrypoint import is too much, require a concrete source/AST assertion for the index.ts call in addition to the lifecycle hook-shape test.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:128-130; src/daemon/lifecycle.ts:70-87; src/daemon/lifecycle.ts:125-128"
    finding: >-
      The in-process SIGTERM test contract omits lifecycle module isolation. startLifecycle installs anonymous process SIGTERM/SIGINT listeners and shutdown() leaves module-global shuttingDown=true after the first emitted signal, so Test (iv) can no-op after Test (iii), and leaked listeners can affect later tests. Patch AC4 cleanup/setup to snapshot and restore SIGTERM/SIGINT listeners plus reset imported lifecycle module state between tests, or avoid process.emit entirely by capturing and invoking the onShutdown hook from a mocked startLifecycle as above.
---

# Codex review

Verdict: `proceed_after_patches`.

The r2 spec fixes the atomic tmp-then-rename contract and flush-failure isolation. The remaining issues are both test-contract gaps around proving the real daemon wiring without leaking lifecycle process state.
