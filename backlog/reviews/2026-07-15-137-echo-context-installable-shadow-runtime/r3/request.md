---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 3
spec_commit_sha: e9033277f938c94b3e71b88465f980e1aa5639c9
artifact_path: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
class: structural-reform
requested_at: '2026-07-16T03:00:00Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: c63a083d-806e-4975-8d77-6c0eaf2eb1da
focus_hints: 'Verify the r2 patches at 8e73045f: (1) AC3 configuration-derived secret/support
  root (clean-home writes only under the temporary prefix; real shadow install resolves
  to the founder Application Support path; same resolution code path); (2) AC4/AC7
  two-phase builder/founder-execute ownership contract (candidate artifact never published/real-installed/recorded;
  release artifact built once from detached clone of landed SHA; smoke re-run on release
  bytes) is complete and non-contradictory with build-exactly-once and the existing
  AC7 checkpoint text; (3) AC5/AC6 darwin-x64 architecture/Rosetta preflight ordering
  (pre-extraction host check, post-extraction bundled-node probe before plist/start)
  and doctor architecture/translation truth; (4) AC5/AC6 installer-owned bounded logs
  (creation/ownership/modes, documented retention cap, doctor failure on misowned/unbounded
  paths, crash-loop test); (5) AC1/AC6 single-writer lease semantics (owner identity
  tuple, stale reclaim without launchd-restart deadlock, live/foreign-owner refusal
  before storage open, durable doctor evidence); and that no patch added mechanism
  beyond these completions.'
---

# What to review

Read `backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md` at commit `e9033277f938c94b3e71b88465f980e1aa5639c9`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
