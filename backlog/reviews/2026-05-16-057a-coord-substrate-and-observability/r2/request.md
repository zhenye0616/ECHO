---
item_id: 2026-05-16-057a-coord-substrate-and-observability
round: 2
spec_commit_sha: 3e571c070d4506b938805e40e6cb3707c724a1c8
artifact_path: backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md
class: structural-reform
requested_at: '2026-05-16T04:59:45Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "r1 produced 7 findings (4 HIGH, 3 MEDIUM). All accepted; spec patched\
  \ at 4203b86. r2 verifies: (1) AC1 L92-99 \u2014 `subject_role` is now a required\
  \ common field with registry-driven self-attestation vs invocation semantics (self-attestation\
  \ events require subject_role == emitter_role; invocation events allow subject_role\
  \ != emitter_role when target is in coord-roles.json); (2) AC2 L139-143 \u2014 TS\
  \ daemon loader at `src/coord/roles.ts` is called from `startMcpServer()` BEFORE\
  \ tool registration and bad-config (max_deadline_sec <= default_deadline_sec) causes\
  \ startup throw not per-request failure; Python sibling `_coord_roles.py` is CI-only;\
  \ (3) AC3 L146-167 \u2014 single-actor serial mutation lane shared by event ingest\
  \ + heartbeat + boot reconstruction + periodic reconciliation; `fireMissedDeadline`\
  \ is the only `coord:deadline_missed` append path AND removes record from open map\
  \ after append (terminal lifecycle, closes the re-fire loop); reconstruction is\
  \ a HARD STARTUP GATE \u2014 MCP server does not accept coord_emit until reconstruction\
  \ completes; periodic reconciliation captures last_processed_atom_id watermark and\
  \ replays only atoms in (last_full_replay_watermark, high-watermark]; (4) AC4 L168-173\
  \ \u2014 one-of-required validation (sources[] non-empty OR source_prefix non-empty),\
  \ union semantics when both supplied, byte-identical guarantee for legacy sources[]-only\
  \ callers asserted via snapshot test; (5) AC6 L188-191 \u2014 recent-missed list\
  \ uses max(role.max_deadline_sec) horizon (\u226524h V1, expands automatically)\
  \ AND per-role-per-event-type last-miss list IGNORES horizon so >24h-old misses\
  \ remain visible until a successful close clears them; (6) AC8 L201-212 \u2014 4\
  \ new fixtures: deadlines-fire-once-and-remove.test.ts (F5), deadlines-reconstruction-concurrency.test.ts\
  \ (F2+F6), subject-role-multi-under-one-correlation.test.ts (F1), wait-for-new-turns-source-prefix.test.ts\
  \ (F3); coord-status-shape.test.ts extended with 48h-old miss fixture (F7); coord-roles-validation.test.ts\
  \ revised to assert startup-time throw (F4). The convergent F2+F5+F6 design (single\
  \ mutation lane + terminal lifecycle + startup gate + watermarked reconciliation)\
  \ is the load-bearing piece \u2014 verify the four sub-mechanisms compose into one\
  \ coherent atomicity story without internal contradictions. Verify falsifiability:\
  \ each new fixture should have a clearly observable pass/fail signal driven by AC\
  \ text. ops lens: 1s heartbeat tick cost on the serial lane under typical open-record-set\
  \ size; reconstruction startup wall-clock under 24h-horizon atom volume; lane-serialization\
  \ latency for coord_emit under sustained 100+/sec emission."
---

# What to review

Read `backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md` at commit `3e571c070d4506b938805e40e6cb3707c724a1c8`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
