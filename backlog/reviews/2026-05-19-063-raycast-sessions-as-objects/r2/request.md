---
item_id: 2026-05-19-063-raycast-sessions-as-objects
round: 2
spec_commit_sha: 1f72f4b7f0e662cf65b7dab36b19546d95034405
artifact_path: backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md
class: structural-reform
requested_at: '2026-05-19T22:50:04Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a4540a1e-b4f8-455c-8cf7-0b358652a480
focus_hints: 'Verify: (a) AC3.6 audit-contamination acknowledgment is acceptable for
  V1.6 single-user use, OR pushback that a client-side mitigation is required; (b)
  AC6.6 reconciliation MAX_RUNTIME_MS=5min + 60s log-mtime threshold are safe under
  realistic Raycast lifecycle (sleep/wake, extension reload, killed agent); (c) agent-runner.ts
  contract change (AgentRun.sessionLogPath synchronous + immutable) is implementable
  without deeper refactor of the existing tee-log creation path; (d) Session interface
  canonicalization (status enum + forkedFrom + best-effort fields) is internally consistent
  across AC1.1, AC4.2, AC4.5, AC6.5, AC6.6, AC8.1, AC8.5, AC8.6; (e) AC9.4 dogfooding-evidence
  framing for the audit-contamination decision is falsifiable.'
---

# What to review

Read `backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md` at commit `1f72f4b7f0e662cf65b7dab36b19546d95034405`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
