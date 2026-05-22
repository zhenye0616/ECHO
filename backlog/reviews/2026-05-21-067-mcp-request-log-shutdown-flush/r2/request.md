---
item_id: 2026-05-21-067-mcp-request-log-shutdown-flush
round: 2
spec_commit_sha: 77026eaaf87717924e42286dfbe8f47d78fd404a
artifact_path: backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md
class: narrow
requested_at: '2026-05-22T05:26:23Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: af335b10-373d-4cf6-b31a-98b8b2054f83
focus_hints: 'Verify: (a) AC1 tmp-then-rename atomic write semantics + best-effort
  .tmp cleanup on error; (b) AC2 inline try/catch with stderr log preserves subsequent
  teardown (cursorExtractor/codexExtractor/claudeCodeExtractor/gitWatcher/fsWatcher
  .stop + dispose); (c) AC4 Test (iii) drives the real startLifecycle shutdown path
  with the same onShutdown closure shape as daemon/index.ts:58-66, asserting <dataDir>/mcp-shutdown.jsonl
  appears; (d) AC4 Test (iv) pins flush-throw -> teardown-continues; (e) startMcpServer
  signature in AC4 matches installed API (storage, options).'
---

# What to review

Read `backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md` at commit `77026eaaf87717924e42286dfbe8f47d78fd404a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
