---
item_id: 2026-06-18-103-ceo-context-loop-n2
round: 4
spec_commit_sha: 6f5642e22bfab599f7b271b37bd7d89d85cba694
artifact_path: backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md
class: narrow
requested_at: '2026-06-19T18:42:18Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 4d6f3493-945c-499f-8e3c-b4ce4ce332a2
focus_hints: "Verify: AC2 process-group lifecycle+cleanup trap is unambiguous for\
  \ builder (proxy+tunnel single process group, SIGINT/SIGTERM trap, kill 0 on exit);\
  \ AC4 jq join command correct and DoD condition (pass: true = \u22652 successful\
  \ unprompted uninterrupted query events across \u22652 sessions) unambiguous; files_to_modify\
  \ (proxy.ts+package.json+README+tests) sufficient to implement without out-of-scope\
  \ touches; event-log repo-root resolution requirement clear"
---

# What to review

Read `backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md` at commit `6f5642e22bfab599f7b271b37bd7d89d85cba694`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
