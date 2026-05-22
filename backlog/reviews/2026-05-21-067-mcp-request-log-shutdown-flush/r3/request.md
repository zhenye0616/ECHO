---
item_id: 2026-05-21-067-mcp-request-log-shutdown-flush
round: 3
spec_commit_sha: d0db9740718012ecc073d31aefc6bd16ab728465
artifact_path: backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md
class: narrow
requested_at: '2026-05-22T05:35:16Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 83b1fa3a-a5d0-4822-a2ae-193eaebccf41
focus_hints: "Verify: (a) AC4 Test (iii) 5-clause source-text assertion on src/daemon/index.ts\
  \ (single flushRecentMcpCallLog call, try/catch wrap, 'mcp-shutdown.jsonl' literal,\
  \ ordered after mcp.stop and before first extractor stop within onShutdown closure\
  \ body) is sufficient to detect an unwired or mis-ordered daemon entrypoint; (b)\
  \ AC4 Test (iv) is self-contained \u2014 no startLifecycle invocation, no process.emit,\
  \ vi.fn() stubs for extractor/watcher/dispose, vi.spyOn for stderr \u2014 proving\
  \ teardown continues despite flush throw; (c) no AC4 test installs SIGTERM/SIGINT\
  \ handlers or mutates lifecycle module-global state; (d) source-text assertion remains\
  \ stable across formatting-only changes to daemon/index.ts."
---

# What to review

Read `backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md` at commit `d0db9740718012ecc073d31aefc6bd16ab728465`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
