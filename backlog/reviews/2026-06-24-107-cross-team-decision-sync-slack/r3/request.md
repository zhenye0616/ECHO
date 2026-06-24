---
item_id: 2026-06-24-107-cross-team-decision-sync-slack
round: 3
spec_commit_sha: b099353b1f0a957215614dfc5954f265390f464a
artifact_path: backlog/proposed/2026-06-24-107-cross-team-decision-sync-slack.md
class: narrow
requested_at: '2026-06-24T05:03:02Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1a1673a2-6d3f-491c-96f4-fb51934fb743
focus_hints: "Verify r2 patch (b099353b): (1) propagation owners concrete+buildable\
  \ \u2014 src/mcp/server.ts registers propose_decision wiring propose-decision-tool.ts;\
  \ durable draft-store.ts schema + restart-safe confirm-idempotency.test.ts; AC6\
  \ cross-team-decision-sync-runbook.md in files_to_modify; (2) Slack raw-drill-down\
  \ DEFER is clean \u2014 AC2/R3 no longer promise raw 'why' over Slack, no orphaned\
  \ raw-routing references remain, cross-team surface provably has no machine-scoped\
  \ raw path (decision-layer-only). Flag any remaining non-buildable gap or any reintroduced\
  \ cross-machine raw access."
---

# What to review

Read `backlog/proposed/2026-06-24-107-cross-team-decision-sync-slack.md` at commit `b099353b1f0a957215614dfc5954f265390f464a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
