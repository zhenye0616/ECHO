---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 3
spec_commit_sha: 9c37bd8c9a2b7bc577269e0637f3e515de1da34a
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T02:59:55Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 4a2c36a0-f1d0-4c7a-8836-6ae6f8cfbde5
focus_hints: 'Verify the five r2 patches: (1) AC1 mutation-capable vs non-mutating
  command split consistent with AC5/Tests, exact scripts named; (2) src/daemon/lifecycle.ts
  now in files_to_modify with pre-open fence ownership (mkdir/PID side effects behind
  the AC2 fence); (3) AC5 operational preflight/landing gate (clean tree, no untracked
  inputs, no rebase/merge/autostash, pinned ref matching recorded SHA, no remote divergence,
  post-landing SHA readback) recorded in the AC8 migration record; (4) AC1 durable
  redacted phase/error record + non-zero exit for every guard rejection and replay
  stop; (5) AC1 permanent root-scoped/fake-service-only rehearsal, no live-capable
  mode or mutation-guard bypass in the 139 handoff archive.'
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `9c37bd8c9a2b7bc577269e0637f3e515de1da34a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
