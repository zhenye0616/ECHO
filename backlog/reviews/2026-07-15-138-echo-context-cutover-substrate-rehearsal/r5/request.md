---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 5
spec_commit_sha: 677c585a8ca839233d9c1c79596345ab2e427515
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T03:56:27Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8c7783b5-864e-475b-946d-4de0a557e180
focus_hints: "Verify the r4 propagation-completion patches (all seven r4 findings\
  \ accepted; spec-r4-patches 677c585a): (1) AC1/AC2 fence serialization now uses\
  \ one stable per-root sibling lock file authority.lock \u2014 never the canonical\
  \ transaction record's inode \u2014 created descriptor-relative no-follow when absent,\
  \ never replaced/deleted; every controller transition and rollback-full start acquires\
  \ it before reading authority state, rechecks while held, and holds through the\
  \ full authority-bearing startup handoff (PID/data-dir/SQLite/socket) or phase commit;\
  \ before prepared/active commit the controller, still holding the lock, neutralizes\
  \ old start jobs AND stops+verifies quiescent every already-started full process;\
  \ barrier tests cover absent-record + atomic-replacement with paused contender,\
  \ both race orders, and a post-commit write attempt. (2) files_to_modify now authorizes\
  \ backlog/complete/<item>.md for AC8's evidence-only readback commit. (3) AC5 defines\
  \ the cross-repo identity handoff: echo-context candidates:build first, Project_echo\
  \ build receives --counterpart-manifest, clean-tree + local-git-object counterpart\
  \ verification, candidates:verify asserts the identical four-identity tuple across\
  \ both manifests, swapped-counterpart negative test. (4) AC2 fence evidence: preprovisioned-at-install\
  \ log sink (pre-open fence creates no directories), cross-process bound via bounded-retention/coalescing\
  \ sink + neutralization with no in-memory limiter state, fresh-process-per-attempt\
  \ fake-launchd fixture, evidence visible after restart. (5) AC1 pre-trust failures\
  \ write no durable journal/temp/cache/log anywhere; durable journaling begins only\
  \ after root trust + lock; sentinel temp/cache/log zero-mutation matrix. (6) Command\
  \ surface: rehearse is the only controller/runtime-state mutation entrypoint; candidates:build/verify\
  \ are artifact-output-only (no service/client/state adapters), verify read-only\
  \ apart from scratch extraction; separation test. Check the patches introduce no\
  \ new unnamed mechanism, no second lock, no revived r2 command catalogue or landing\
  \ gate."
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `677c585a8ca839233d9c1c79596345ab2e427515`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
