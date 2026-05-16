---
item_id: 2026-05-15-057-coord-layer-narrow-append-and-deadlines
round: 1
spec_commit_sha: c9b712865f67a6c7a5aab6ed07ce4ef40461d695
artifact_path: backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md
class: structural-reform
requested_at: '2026-05-16T03:31:36Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "057 substrate is locked to MCP (option A) per codex strategist 2026-05-16\
  \ 00:31 PDT consult. AC4 includes the required wait_for_new_turns source_prefix\
  \ widening. Verify: (1) AC0 coord_invoke MCP tool + active-trigger flow integrates\
  \ cleanly with launchd fallback path; (2) AC1 narrow append seam preserves capture-gate\
  \ isolation + non-pollution invariants (no normalizer, no trace edges, default-excluded\
  \ from search); (3) AC2 coord-roles.json schema if/then mode-conditional invoke_command\
  \ parity with reviewers.json conditional pattern; (4) AC3 deadline tracker reconstruction\
  \ on daemon boot is idempotent under restart-during-overdue-firing race; (5) AC4\
  \ wait_for_new_turns source_prefix widening is backwards-compatible with existing\
  \ sources[] callers byte-identically; (6) AC5 identity model X-Echo-Role header\
  \ acceptable for V1 single-founder loopback (HMAC deferred to V2+); (7) AC6 coord_status\
  \ operator surface is sufficient for the launchd silent-fail recovery scenario it's\
  \ designed to catch; (8) AC7 emission integration is genuinely additive \u2014 no\
  \ protocol body changes in process-backlog.md / review-queue-watch.md / merge-and-cleanup.md;\
  \ (9) AC8 falsifiable end-to-end test actually reproduces today's 2026-05-15 22:50Z\
  \ launchd silent-fail incident. Decay-curve note: this is a structural-reform spec\
  \ touching 13+ files \u2014 expect 4-8 rounds per the 049 precedent. Founder will\
  \ judge whether to ship at first asymptote per 049 framing."
---

# What to review

Read `backlog/ready/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md` at commit `c9b712865f67a6c7a5aab6ed07ce4ef40461d695`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
