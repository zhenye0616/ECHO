---
id: 2026-07-06-123-card-provenance-trace
title: "Card provenance — persist the intake classifier/brain derivation as atoms and add a trace-card surface walking card → retrievals → signals → raw context"
status: proposed
priority: HIGH
estimate: 1d
created: 2026-07-06
blocked_by: []
spec_refs:
  - src/enrich/granola-intake-candidates.ts                # the intake bridge: classify() call site (~:405), seed-store post path — where the card atom must be emitted
  - src/brain/brain.ts                                     # brain child invocation (argv/cwd ~:269) — the MCP-retrieval capture point
  - src/enrich/worker-heartbeat.ts                         # heartbeat conventions if a worker surface is touched
  - tools/serve-trace.ts                                   # trace-rendering precedent
  - tools/loop-dashboard.ts                                # 122 conventions: entry guard, port/env parsing, read-only discipline
  - backlog/complete/2026-07-06-121-intake-terminal-entry-guard.md   # entry-guard + vite-node --script precedent (MUST follow)
  - backlog/complete/2026-07-06-106-granola-meeting-signal-extraction.md  # station-2 provenance pattern to complete: run ids, parent_dedupe_key, index atoms
files_to_modify:
  # PROVISIONAL
  - src/enrich/granola-intake-candidates.ts   # emit derived:intake-cards atom per post
  - src/brain/brain.ts                        # retrieval-correlation hook for the child's MCP calls
  - tools/trace-card.ts                       # NEW: the provenance trace surface
  - package.json                              # npm script trace:card → vite-node --script tools/trace-card.ts
  - tests/enrich/                             # card-atom emission + retrieval-correlation coverage
  - tests/tools/                              # trace surface coverage
ready_content_sha: 51796c4896cd469e9e0b42bce83ec258aa8c7e941988ada2b8fcda9dbaf3d93e
---

## Problem

Station 3 posts intake cards whose derivation is unobservable. The founder's
verdict (2026-07-06): "a card can be made with diff context from diff tools
across diff time. this is the most important part and with no observability i
cannot optimize and debug."

Audit of the live chain (65 posted seeds, 2026-07-06):

- **Recorded:** card seed → signal (`candidate_key` IS the signal
  `dedupe_key`); signal → raw note (`note_id`, `parent_dedupe_key`,
  `extraction_run_id`, `extractor_version`, `confidence`); per-note index atom
  with the supersede chain. Station 2 (item 106) got provenance right.
- **Dark:** (a) the card itself is never persisted — final text +
  request/why/done-when fields exist only in the posting terminal's stdout;
  the seed store keeps state-machine fields only. (b) The classifier is
  brain-backed (`defaultClassifierFromBrain`): a child process with scoped
  ECHO MCP access that can retrieve arbitrary cross-tool, cross-time context
  at classification time — and none of its retrievals, binding/model identity,
  or run identity is recorded. (c) Even the recorded links are unreadable
  without hand-written SQL.

The substrate already has the pattern (append-only atoms, `dedupe_key` /
`parent_dedupe_key`, run ids). This item completes it for the classifier stage
and adds the reading surface. Debug loop unlocked: wrong card → trace →
attribute the fault to retrieval vs extraction vs classification; run ids make
extractor/classifier versions comparable across runs.

## Acceptance Criteria

- **AC1 — card atom:** every successful card post (terminal AND future Slack
  channel — the emission lives in the channel-agnostic bridge path, not the
  terminal tool) appends one `derived:intake-cards` atom: `content` = the
  exact rendered card text that was posted; `metadata` = the classified fields
  (request / why / client outcome / done-when / owner as produced), the
  `candidate_key`, all consumed signal `dedupe_key` refs, `note_id`,
  `channel_id`, the seed-store status timestamp, and a `classifier_run` record
  (`run_id`, binding/vendor identity, model/version when the binding exposes
  it, `started_at`/`completed_at`). Idempotent under re-posts: `dedupe_key`
  `granola:card:<candidate_key>` and the existing duplicate-suppression path
  must not double-write. Atom write failure must not break posting
  (observability never blocks the pipeline) — but fail-soft MUST NOT be
  silent-lossy (r1 codex F1, codex-ops F1): the seed record gains a persisted
  `card_atom_status` ∈ {`written`, `failed`} field (plus an error summary when
  `failed`), written at post time in the same seed-store update; a later
  duplicate-suppressed rerun MUST NOT clear, overwrite, or mask a `failed`
  marker; and the AC3 trace surface MUST report a failed/missing card atom
  from this marker (provenance loss is visible-by-construction, never
  inferable-only-from-absent-logs; unattended launchd/cron runs have no
  operator watching stderr).
- **AC2 — retrieval correlation:** the brain child's ECHO MCP calls made
  during a classification run are correlated to that run and recoverable from
  the store after process exit. The minimum persisted record contract (r1
  codex F2, codex-ops F2) lives inside the card atom's `classifier_run`
  record and is reachable in one hop from the card atom (lookup key:
  `classifier_run.run_id`):
  - `capture_status` ∈ {`ok`, `zero_retrievals`, `capture_failed`} — a
    REQUIRED tri-state, so a run with no retrievals is distinguishable from a
    run whose capture broke;
  - when `ok`: `retrievals[]`, each entry `{ tool, coarse input summary,
    returned atom/cluster ids or counts, timestamp }`;
  - when `capture_failed`: an error summary.
  CAPTURE mechanism stays builder judgment (reuse-first: per-run correlation
  id passed to the child and stamped by the daemon's existing coord/identity
  layer; or a recording proxy in front of the scoped MCP URL) — the persisted
  SHAPE above is not negotiable. Capture failure is fail-soft for posting per
  AC1, and surfaces as `capture_failed`, never as a fake `zero_retrievals`.
- **AC3 — trace surface:** `tools/trace-card.ts`, npm script `trace:card`
  using `vite-node --script`, guarded with the house `import.meta` entry check
  (121 precedent; regression test same shape). Input: a `candidate_key` (or
  `--note <note_id>` to list that note's cards). Output: a terminal provenance
  tree walking card atom → classifier run (with its retrieval list: tool,
  when, what came back) → consumed signal atoms (type, subject, confidence,
  extraction run) → raw source atoms (source, timestamp, title/excerpt).
  Every stage prints what exists and names what is absent (pre-123 cards have
  no card atom — the tool must say exactly that and still walk the
  seed → signal → raw remainder). The trace renders the AC2 tri-state
  distinctly (retrieval list for `ok`, an explicit "zero retrievals" line, a
  `capture_failed` line with the error summary) and reports AC1's
  `card_atom_status: failed` marker as a provenance-loss banner for that
  card. Read-only; no live daemon required.
- **AC4 — strictly read-only trace:** the trace tool writes NOTHING; a test
  asserts a full trace run against a scratch ECHO_HOME leaves the filesystem
  byte-identical, including the no-db-file case (SqliteStorage's constructor
  creates+migrates a missing db — gate storage opens on the db file existing;
  117/122 precedent).
- **AC5 — tests:** fixture-driven, no live daemon: card atom emitted on post
  with correct refs + fields (injected classifier); idempotent re-post (no
  second atom); atom-write failure cannot be silently masked (injected write
  failure → post still succeeds AND seed record carries
  `card_atom_status: failed` → a subsequent duplicate-suppressed rerun leaves
  the marker intact → trace reports provenance loss for that card); all three
  AC2 `capture_status` states persisted and distinguishable (injected/fake
  brain run making at least one scoped call → `ok` with retrievals; a run
  making none → `zero_retrievals`; injected capture breakage →
  `capture_failed` with error summary, not `zero_retrievals`); trace renders
  the full chain on fixtures and each of the three capture states; trace
  fail-soft on missing stages (pre-123 card, missing raw atom); the AC3
  entry-guard regression test; the AC4 no-write test.

## Out of Scope (Don't Drift)

- No dashboard (122) integration — parked pending founder usage; terminal
  trace only.
- No changes to signal extraction (station 2) or classifier prompting/logic —
  this item records the derivation, it does not alter it.
- No backfill of card atoms for already-posted seeds (their rendered text is
  unrecoverable); the trace tool's missing-stage path covers them.
- No content/sensitivity gate, no Slack enablement, no new station.
- No retrieval-quality scoring or automatic optimization — observability
  first; tuning is a later item informed by these traces.

## After Completion (Strategist Notes)

- This is the observability backbone for demo-mechanism tuning: fold into the
  observability wiki page at the 116+ promotion pass alongside 117/120/122.
- Once card atoms exist, the parked dashboard-v2 "station drill-down" idea can
  cite them; keep parked until founder usage says otherwise.
- The retrieval-correlation mechanism chosen here should be noted in the wiki
  as the house pattern for future brain-backed derivations (drift responder,
  CEO answerer).
