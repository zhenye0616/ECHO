---
item_id: "2026-05-21-067-mcp-request-log-shutdown-flush"
round: 3
reviewer: "codex-ops"
artifact_sha: "d0db9740718012ecc073d31aefc6bd16ab728465"
completed_at: '2026-05-22T05:40:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:71-73,81-88,146; src/mcp/request-log.ts:64-76"
    finding: >-
      The spec still promises that every entry visible during the dying daemon's lifetime is recoverable after graceful SIGTERM, but AC1 also preserves the existing 1000-entry ring behavior: `beginRecentMcpCall` shifts the oldest entry whenever the ring overflows. In production a long-running pending call can be pushed out by later MCP traffic before shutdown, so `flushRecentMcpCallLog` has no entry to rewrite and the forensic file silently omits exactly the in-flight call P2 is trying to preserve. Patch the contract to make this an explicit accepted gap (only entries still retained in the ring at flush time are covered), or require pending entries not to be evicted and add an overflow test that starts a pending call, adds more than 1000 later calls, then proves the pending call survives into `mcp-shutdown.jsonl`.
  - severity: "medium"
    where: "backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md:87,114-120,152-155,170-175"
    finding: >-
      The tmp-then-rename write is the load-bearing runtime protection against a truncated `mcp-shutdown.jsonl`, but the AC3/Definition-of-Done tests only verify mixed statuses, empty output, and overwrite/idempotency. A direct `writeFileSync(path, body)` implementation would pass those tests while reintroducing the production failure AC1 says it closed: SIGKILL during the final-path write can destroy the prior complete breadcrumb. Add a focused assertion for the atomic-write path, such as a request-log unit test with mocked fs calls or a narrow source assertion that `flushRecentMcpCallLog` writes `path + '.tmp'` and renames that tmp file onto the final path rather than writing the final path directly.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r3 AC4 repair is directionally sound: the daemon-entrypoint source assertion now catches an unwired shutdown hook without installing lifecycle signal handlers, and the flush-throw test is self-contained enough to avoid contaminating module-global shutdown state. The remaining gaps are production-contract issues around what the shutdown artifact can honestly recover and whether the atomic-write guarantee is mechanically protected.
