---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 4
spec_commit_sha: a7a616f8eb51ba7cc23e90aa5b30b0923a003722
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T23:11:49Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a880bab6-8a96-47d0-a5ca-84beea4ea7f5
focus_hints: "Verify (a) AC6.7 composite-key auditCalls merge (ts, tool, args_shape)\
  \ with terminal>pending precedence + duration tie-break is sufficient under realistic\
  \ concurrent calls; AC8.10(b) covers the pending->terminal transition; (b) AC6.7\
  \ Partial<Session> patch scoping per record* helper PLUS monotonic status precedence\
  \ rule together close the r3 codex-ops F2 lifecycle regression; AC8.10(c)+(d) cover\
  \ both layers; (c) AC4.2 'OMIT actions when log unopenable' fallback is the right\
  \ Raycast-API-correct choice; AC8.9 asserts ABSENCE; (d) AC8.3 no longer makes any\
  \ fork-row-creation timing assertion; (e) the spec is internally consistent across\
  \ all r1+r2+r3 patches \u2014 no contradictory wording remains."
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `a7a616f8eb51ba7cc23e90aa5b30b0923a003722`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
