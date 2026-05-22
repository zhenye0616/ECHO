---
item_id: "2026-05-21-067-mcp-request-log-shutdown-flush"
round: 2
reviewer: "codex-ops"
artifact_sha: "77026eaaf87717924e42286dfbe8f47d78fd404a"
completed_at: '2026-05-22T05:31:58Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:128"
    finding: >-
      AC4 Test (iii) still leaves the production shutdown hook unproven at runtime. It imports startLifecycle and builds a test-local onShutdown closure with the same intended shape, then emits SIGTERM; that proves lifecycle can run a hook, but it does not prove src/daemon/index.ts actually registers the flush, uses the daemon dataDir, or keeps the mcp.stop -> flush -> teardown order. A builder could leave the real daemon entrypoint unwired and this test would still pass, so the first unattended launchd restart would silently lose <dataDir>/mcp-shutdown.jsonl. Patch AC4 to exercise the actual index.ts wiring by mocking startMcpServer/extractor/watchers/startLifecycle, capturing the onShutdown callback passed by index.ts, invoking it, and asserting the stop/flush/teardown order and path; if direct entrypoint import is too heavy, add a concrete source/AST assertion for the index.ts flush call in addition to the lifecycle hook-shape test.
    cross_ref:
      round: 2
      reviewer: "codex"
      finding_index: 1
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 spec closes the prior shutdown durability gaps around atomic writes and flush failure isolation. The remaining production risk is that the wiring test still validates a surrogate hook, so the real daemon entrypoint could miss the flush and operators would only discover the failure after a restart with no shutdown breadcrumb.
