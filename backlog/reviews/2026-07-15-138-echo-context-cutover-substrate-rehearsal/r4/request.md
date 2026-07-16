---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 4
spec_commit_sha: 8d863930d444b2cef91739f104039f12e5024675
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T03:31:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 6510a735-4f61-4974-b0ef-63f7fd4fee51
focus_hints: "Verify the r3 structural cut + four original-mechanism patches: (1)\
  \ AC1 collapsed to one exact rehearse entrypoint (npm run rehearse -- --root, echo-context\
  \ cwd) with initialize-vs-resume semantics, descriptor-relative no-follow root validation,\
  \ per-root exclusive lock; pre-trust guard/validation failures write nothing (redacted\
  \ stderr + non-zero exit, zero mutation), post-trust replay stops keep durable redacted\
  \ records \u2014 the r2 command catalogue and under-untrusted-root rejection record\
  \ are removed, no compensating evidence-sink mechanism added; (2) AC5 named candidates:build/candidates:verify\
  \ package scripts and extracted-archive inspection rejecting live entrypoints/guard\
  \ bypasses/env overrides \u2014 the r2 operational preflight/landing gate is removed\
  \ and AC8 no longer records gate results; (3) AC8 readback recorded in a subsequent\
  \ evidence-only commit into completed frontmatter, stated as the sole SHA authority\
  \ item 139 pins (consistent with 139's frontmatter read + canonical-remote reachability\
  \ check); (4) AC2 fence decision serialized with controller transitions via exclusive\
  \ lock on the canonical transaction record with recheck-while-held, old start jobs\
  \ neutralized before prepared/active commit, rate-bounded durable fence-rejection\
  \ evidence, fake-launchd KeepAlive bounded-termination fixture; (5) AC7 W/C cuts\
  \ under explicit writer freeze with outbox drain and under-freeze high-water verification,\
  \ cut+flip in one canonical-record step, race tests at every cut/flip boundary,\
  \ recutover reuses protocol; (6) AC3 differing-ID collision or retry exhaustion\
  \ persists terminal state (last error + watermark) in residual coord.sqlite, surfaced\
  \ via coord_status/health, visible across restart."
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `8d863930d444b2cef91739f104039f12e5024675`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
