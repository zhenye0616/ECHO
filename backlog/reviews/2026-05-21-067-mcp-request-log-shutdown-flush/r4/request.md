---
item_id: 2026-05-21-067-mcp-request-log-shutdown-flush
round: 4
spec_commit_sha: e911b6f15285fa853c70ff98a2c26f14cab77250
artifact_path: backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md
class: narrow
requested_at: '2026-05-22T05:50:20Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 4b8c2083-5926-48db-8da7-aa27645623d4
focus_hints: "Verify: (a) Architectural Invariant bounds the contract to entries still\
  \ retained in ring at flush time, with both non-graceful and ring-overflow P2 gaps\
  \ cited explicitly (request-log.ts:31 MAX_CALLS + :64-76 shift); (b) AC3 atomic-write\
  \ mechanism-assertion test pins writeFileSync('<path>.tmp') + renameSync(tmp, path)\
  \ call sequence via vi.spyOn \u2014 a direct writeFileSync(path, body) cannot pass;\
  \ (c) spec is internally consistent \u2014 Architectural Invariant matches what\
  \ tests verify; (d) no new mechanism added in r3 patches beyond test-side enforcement\
  \ of the existing AC1 atomic-write contract."
---

# What to review

Read `backlog/ready/2026-05-21-067-mcp-request-log-shutdown-flush.md` at commit `e911b6f15285fa853c70ff98a2c26f14cab77250`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
