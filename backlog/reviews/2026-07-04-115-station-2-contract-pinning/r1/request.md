---
item_id: 2026-07-04-115-station-2-contract-pinning
round: 1
spec_commit_sha: 034d30f042aaf83cec152207d6ec4a11f8488b5d
artifact_path: backlog/proposed/2026-07-04-115-station-2-contract-pinning.md
class: narrow
requested_at: '2026-07-05T00:28:27Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 60044287-1689-4a54-bd74-85f6247f4215
focus_hints: 'AC1/AC2 parity is load-bearing: the shared resolver must reproduce the
  existing search-memories current-run filter byte-for-byte in observable behavior,
  including the manifest-append-failure duplicate case; also verify packed-safety
  (dist/enrich import-closure) and that AC3 pins rather than changes settle semantics'
---

# What to review

Read `backlog/proposed/2026-07-04-115-station-2-contract-pinning.md` at commit `034d30f042aaf83cec152207d6ec4a11f8488b5d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
