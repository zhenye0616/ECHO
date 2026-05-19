---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 5
spec_commit_sha: b45827446f081bea5d74db25dccbc4f0db9d21d8
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T23:29:07Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: b8f10f98-7c58-4064-aee3-63c1f8b11655
focus_hints: "Verify hybrid (c) resolution: (a) AC6.7 per-row LocalStorage keys (echo.sessions.v1.row.<id>)\
  \ layout closes single-process + cross-process row-loss vectors by construction;\
  \ mergeRowAndWrite touches only the target row's key; eviction is per-key removeItem;\
  \ the narrowed claim in Risk #7 is honest about non-ACID semantics AND AC9.5 gives\
  \ dogfooding the falsifiable test; (b) AC6.1 migration produces a fully-shaped Session\
  \ for every legacy recent-asks entry \u2014 exact launchedTo\u2192agentKind mapping\
  \ (all\u2192claude since recent-asks predates codex agent); sentinel-guarded idempotency;\
  \ defensive backup-key preservation; AC8.11 covers; (c) agent-kind UI palette is\
  \ internally consistent across AC1.3 + SessionsList description + AC5.3 \u2014 session\
  \ rows use agent-kind icons, NOT a derived source-app; (d) no contradictory wording\
  \ between Session interface, Component descriptions, Data flow, AC1.3, AC4\u2013\
  AC6.7, AC8.10(a-e), AC8.11, Risks #6+#7, AC9.4+AC9.5."
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `b45827446f081bea5d74db25dccbc4f0db9d21d8`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
