---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 6
spec_commit_sha: 38b2f9d70c326577ca9f5679fa6f05c3b286d915
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T04:18:33Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 3cb49c70-fcce-4be8-bcd6-1f9e4a1724dd
focus_hints: "Verify the r5 structural-cut + completion patches (all eight r5 findings\
  \ dispositioned; spec-r5-patches 8de4ff00fa4f2db760a87fb856fbb5512f744a4b): (1)\
  \ AC5 self-bound manifests \u2014 no counterpart argument/checkout/cross-manifest\
  \ tuple remains anywhere; own-git-objects verification + tampered-SHA/tree negative\
  \ test; AC8 read-back landed SHAs remain the sole cross-repo identity authority\
  \ item 139 pins; fresh per-run staging, atomic manifest/archive publish as final\
  \ step, failed build leaves no publishable manifest. (2) AC1 lock-only bootstrap\
  \ \u2014 exactly one admitted state (root whose only entry is a valid authority.lock,\
  \ regular non-symlink, descriptor-relative validation) resuming initialization;\
  \ every canonical record commit temp-write/fsync/rename/parent-fsync durable while\
  \ the lock is held; kill matrix at every bootstrap boundary. (3) AC2 installed authority-root\
  \ identity record bound at package-install time \u2014 fence rejects missing/malformed\
  \ record, mismatched/aliased root, and env/flag overrides before any PID/data-dir/SQLite/socket\
  \ mutation; cross-process alternate-root fixture. (4) Deadline-bounded lock/service-control/stop/zero-writer\
  \ ops \u2014 no phase commit on timeout, safe lock release, redacted durable failure\
  \ record, non-zero exit; stuck-lock/failing-launchd/unkillable fixtures. (5) Fence\
  \ evidence demoted to best-effort \u2014 rejection unconditional under missing/unwritable/full\
  \ sink with zero startup mutation; relaunch bound enforced solely by start-job neutralization.\
  \ (6) AC1 zero-write promise scoped to controller-owned writes, sentinel matrix\
  \ around the advertised npm run rehearse invocation. Check the cuts introduce no\
  \ new unnamed mechanism, no second lock, no revived counterpart choreography, sink-health\
  \ contract, or r2 command catalogue."
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `38b2f9d70c326577ca9f5679fa6f05c3b286d915`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
