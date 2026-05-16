---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 4
spec_commit_sha: e68159823036a0bbd1a17f5b9ce0b1a3c14b43a2
artifact_path: backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md
class: structural-reform
requested_at: '2026-05-16T05:47:28Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r3 had divergent verdicts (codex proceed_after_patches + codex-ops pushback)\
  \ but founder explicitly overrode the escalation gate at 22:45 PDT: 'patch and dispatch\
  \ r4. full auto until convergence'. Both reviewers agreed on substance; pushback\
  \ was procedural. All 5 r3 findings accepted; spec patched at 30bebf7. r4 verifies:\
  \ (1) AC3 L177-183 \u2014 three storage methods now declared explicitly: iterateCoordAtomsByAppendOrder({sinceSeq?,\
  \ untilSeq?, limit?}) + getCoordSequenceAtOrAfter(timestamp) + getCurrentCoordSequence().\
  \ Reconstruction algorithm: sinceSeq = getCoordSequenceAtOrAfter(now - 24h); then\
  \ iterateCoordAtomsByAppendOrder({sinceSeq}); then replay close-then-open in durable\
  \ append order. Reconciliation algorithm: highSeq = getCurrentCoordSequence(); then\
  \ iterateCoordAtomsByAppendOrder({sinceSeq: last_full_replay_watermark, untilSeq:\
  \ highSeq}). No implicit binary-search or read-off-seam operations remain in the\
  \ AC text. (2) AC3 L178 SQLite sketch corrected from FROM atoms to FROM events;\
  \ projects rowid AS sequence_id explicitly. (3) AC6 L216-217 \u2014 per-role-per-event-type\
  \ last-miss list is on-demand rehydration at coord_status() call time from the durable\
  \ coord:deadline_missed atom log, NOT from in-memory state. Clearing watermark is\
  \ last_miss_clear_watermark[(subject_role, event_type)] = E.sequence_id on every\
  \ successful close event. Durable atom log is source of truth; in-memory state is\
  \ cache only. (4) AC8 \u2014 coord-status-shape.test.ts extended with 48h-old miss\
  \ survival across daemon restart fixture; iterate-coord-by-append-order.test.ts\
  \ extended to cover all three new storage methods (getCoordSequenceAtOrAfter parity,\
  \ getCurrentCoordSequence parity). ops lens: getCoordSequenceAtOrAfter performance\
  \ on 100k+ atom DB (binary search on (emitted_at,rowid) index); on-demand last-miss\
  \ rehydration latency at coord_status() call time under typical (open-slots \xD7\
  \ matching-atoms-per-slot) volume. CONVERGENCE TARGET: r4 should produce 0-2 findings\
  \ of LOW/MED severity. If r4 produces \u22653 findings OR another HIGH or pushback,\
  \ the watcher will re-escalate to founder."
---

# What to review

Read `backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md` at commit `e68159823036a0bbd1a17f5b9ce0b1a3c14b43a2`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
