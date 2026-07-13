---
item_id: 2026-07-13-132-product-graduation-foundation
round: 2
spec_commit_sha: 41d2f17dee44d26096cdccefed6cd7da5dbd3cdb
artifact_path: backlog/proposed/2026-07-13-132-product-graduation-foundation.md
class: narrow
requested_at: '2026-07-13T09:25:14Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e8867957-20c0-433c-9d6a-dd518aaf2c87
focus_hints: 'Verify r1 patch set at 291870c3. (1) AC1 closure-inventory-first + STOP-and-escalate:
  does it resolve the fixed-allowlist builder deadlock without permitting silent allowlist
  growth? (2) AC2 classifyStateFilesystem adapter (/sbin/mount, LC_ALL=C, timeout,
  normalization table, unknown=fail-closed for run): falsifiable and fixture-testable?
  (3) AC4 unconditional test:product in ci.yml: retires the trigger-contract risk?
  double-run cost acceptable? (4) AC4 guard honesty (enumerated in-worker interceptions
  + sanitized child env + sentinel child test): any rank-1-relevant escape left? (5)
  AC5 pinned native strategy (bundled Node 22 headers + npm_config_nodedir + build_from_source
  + toolchain preflight): complete offline closure for better-sqlite3 on macOS runner?
  (6) builder identity (required --out-dir, HEAD==SHA, clean incl. untracked, temp-sibling
  build + atomic rename) + AC7 exact-head checkout: any residual bytes-vs-SHA mismatch
  path? (7) AC2 transactional startup/reverse rollback + AC7 if:always() evidence/aggregation
  red cells: consistent with workflow-fails-on-red-cell?'
---

# What to review

Read `backlog/proposed/2026-07-13-132-product-graduation-foundation.md` at commit `41d2f17dee44d26096cdccefed6cd7da5dbd3cdb`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
