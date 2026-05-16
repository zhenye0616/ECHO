---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 5
spec_commit_sha: 21c164b345a058532cb8809bb89c4bf414592fba
artifact_path: backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md
class: structural-reform
requested_at: '2026-05-16T05:57:16Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r4 produced 3 MED findings (1 convergent + 2 divergent). All accepted;\
  \ spec patched at 1ba9440. Severity trend r1\u2192r2\u2192r3\u2192r4: 4H/3M\u2192\
  2H/4M\u21921H/4M\u21920H/3M \u2014 zero HIGH for the first time. r5 verifies: (1)\
  \ AC3 L177-186 storage seam \u2014 reduced from 3 methods to 2; iterateCoordAtomsByAppendOrder({sinceSeq?,\
  \ limit?}) half-open [sinceSeq, +\u221E); getCurrentCoordSequence() returns max(rowid)\
  \ NOT max+1; getCoordSequenceAtOrAfter REMOVED entirely (timestamp-order semantics\
  \ couldn't compose with append-order replay under skewed emitted_at); (2) AC3 V1\
  \ reconstruction is full-ledger replay from sequence_id=1 to getCurrentCoordSequence()\
  \ snapshot \u2014 no time horizon, no false-clean-after-restart for late-appended\
  \ atoms with old emitted_at; V1.5+ deferral for bounded-scan mode is explicit; (3)\
  \ AC3 reconciliation watermark semantics \u2014 captures highSeq, processes (last_full_replay_watermark+1,\
  \ highSeq], sets last_full_replay_watermark=highSeq; the half-open+watermark-plus-one\
  \ pattern means no atom is skipped AND no atom is processed twice across pass boundaries;\
  \ (4) AC6 L216-217 \u2014 slot universe is the cross-product of coord-roles.json\
  \ roles \xD7 event_types-with-expects (deterministic, recomputed at startup, NO\
  \ in-memory persistence); clearing rule applied DURING the on-demand scan (per-slot\
  \ last_miss + per-slot last_close from durable atoms; uncleared iff last_miss.sequence_id\
  \ > last_close.sequence_id OR last_close is null); the durable atom log is the SOLE\
  \ source of truth; (5) AC8 new fixtures: boundary-safety (append after watermark\
  \ \u2192 next reconciliation pass picks it up); late-appended-old-emitted_at not\
  \ skipped at boot; restart-fresh-process-no-preloaded-state shows correct last-miss\
  \ + correct cleared-slot omission. ops lens: full-ledger scan wall-clock for V1\
  \ substrate atom volume (<3k/day) on coord_status() call; reconstruction wall-clock\
  \ at typical boot. CONVERGENCE TEST: r5 produces 0-1 finding \u2192 terminal next\
  \ pass; \u22652 findings or HIGH/pushback \u2192 049 asymptote, re-escalate."
---

# What to review

Read `backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md` at commit `21c164b345a058532cb8809bb89c4bf414592fba`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
