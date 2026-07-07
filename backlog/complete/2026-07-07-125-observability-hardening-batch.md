---
id: 2026-07-07-125-observability-hardening-batch
title: "Post-122/123 observability hardening — trace-card channel seed-store resolution, proxy stream error handlers, card-atom double-append guard, --note seed listing, render cosmetics"
status: proposed
priority: MED
estimate: 0.5d
created: 2026-07-07
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-07T07:40:00Z"
branch: "agent/observability-hardening-batch"
head_sha: "95afbf4ba1b19afc0dfe97550cdca69753666e92"
pr_url: ""
review_notes: |
  Merged on 2026-07-07 via founder reconciliation (pre-approved clean-path run).

  Conflicts resolved:
  - none — merge --no-ff was clean (ort strategy, 7 files, 0 conflicts); zero
    overlap with the concurrently-in-review item 124.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none (sidecar listed zero pre-merge fixups)
  - Mechanical rider (founder-authorized, part of this merge): frontmatter
    priority MEDIUM -> MED to satisfy the blocked.py validator convention.

  Fixups deferred to follow-up items:
  - none

  Verify: 2086/2086 tests pass; lint and typecheck clean post-merge; coupled
  invariants hold; sync-skills adapters match canonical. The full suite showed a
  single failure on tests/cli/shell-reachable.test.ts (a known flake — daemon
  health-port race); per the founder-authorized flaky rule it was re-run in
  isolation and passed (1/1). All other checks green on the first pass.

  Follow-up items (non-blocking, appended to backlog/_followups.md):
  - optional: e2e --note test through runTraceCard without override to pin the
    enumerate wiring directly
  - optional: revisit the AC3 guard query if card-atom volume ever makes the
    per-emit full-source scan matter
agent_notes: |
  All 6 ACs implemented and passing; full gate green (lint max-warnings 0,
  typecheck clean, npm test 2087 passed / 21 skipped / 1 todo, 0 failures — both
  known flakes passed under full-suite load). No changes to 123 persisted
  contracts.
  AC1: channel-aware seed-store resolution in trace-card (seedStorePathForChannel:
  terminal→.terminal.json, else default) + --seed-store override + provenance-loss
  banner from the channel-resolved store; unit + wiring + e2e (setEchoHomeRoot) tests.
  AC2: createHttpRetrievalCapture upstream (ures) + downstream (cres) stream error
  handlers; two named tests, no unhandled process error under a guard wrapper.
  AC3: emitIntakeCardAtom bounded card-source dedupe_key existence check → skips the
  sequential markPosted-throw retry double-append; concurrent-tick left as documented
  blind spot (not built). AC4: --note scans full enumerated seed-store set when no card
  atoms; override narrows to one store. AC5: esc() on heartbeatLine counters +
  abandoned-not-cancelled comment + present-db byte-identity test.
  Reviewer flags in the run log "Design calls" section: (1) AC3 "bounded query" = card
  source scope, no artificial limit (dedupe_key not in METADATA_MATCH whitelist); (2)
  AC2 downstream test asserts capture_failed OR partial per the 123 contract's explicit
  "or completes with what was captured"; (3) trace-card imports the terminal sentinel +
  path from tools/intake-terminal.ts (import-only, not in files_to_modify).
blocked_by: []
spec_refs:
  - tools/trace-card.ts                            # seed lookup + --note mode
  - src/brain/brain.ts                             # createHttpRetrievalCapture streams (~:1005-1012)
  - src/enrich/granola-intake-candidates.ts        # card-atom append site (~:562-576), seed-store paths
  - src/enrich/granola-intake-seed-store.ts        # store path conventions (channel-specific .terminal.json)
  - tools/loop-dashboard.ts                        # heartbeatLine esc() gap (~:585-586)
  - backlog/complete/2026-07-06-123-card-provenance-trace.md   # the shipped contracts being hardened
files_to_modify:
  # PROVISIONAL
  - tools/trace-card.ts
  - src/brain/brain.ts
  - src/enrich/granola-intake-candidates.ts
  - tools/loop-dashboard.ts
  - tests/tools/trace-card.test.ts                 # AC1 seed lookup, AC4 --note listing, AC5 present-db byte-identity
  - tests/enrich/brain-retrieval-capture.test.ts   # AC2 proxy stream error handlers (createHttpRetrievalCapture)
  - tests/enrich/granola-intake-card-atom.test.ts  # AC3 double-append guard
ready_content_sha: 8c5c9edd31b8c17f93e820a2b9fd9252fedb55d71dfbf248a370606a5766c1e3
---

## Problem

Item 123's code review and first live production trace surfaced five bounded
hardening gaps in the just-shipped observability surfaces. None blocks usage;
one (the seed-store gap) breaks a shipped AC's intent in the most common
configuration. Batch them as one small item rather than five specks.

Live-trace evidence (2026-07-06): tracing a freshly posted terminal card
printed "(no seed record for this candidate_key)" although the seed exists —
trace-card reads only the default seed store, never the terminal channel's
`granola-intake-seeds.terminal.json`, so AC1-123's `card_atom_status`
provenance-loss banner can never fire for terminal cards (today: ALL cards).

## Acceptance Criteria

- **AC1 — channel-aware seed lookup:** trace-card resolves the seed store from
  the card atom's `channel_id` (terminal → `.terminal.json`; slack → default),
  with an explicit `--seed-store <path>` override; for a card whose store
  resolves, the seed line renders the record (status, retry_count,
  card_atom_status) and the provenance-loss banner fires when
  `card_atom_status: failed`. Test: terminal-channel fixture card + seed →
  seed line present; failed-marker fixture → banner.
- **AC2 — proxy stream error handlers:** `createHttpRetrievalCapture`'s
  upstream/downstream response streams get error handlers so a brain child
  killed mid-stream (timeout) cannot emit an unhandled EPIPE /
  ERR_STREAM_DESTROYED that crashes the hosting worker; the run records
  `capture_failed` (or completes with what was captured) per the 123 contract.
  Tests in `tests/enrich/brain-retrieval-capture.test.ts` cover BOTH stream
  directions — a destroyed downstream client response mid-proxy AND an
  upstream-destroy/timeout of the brain child mid-stream — each asserting no
  unhandled process `error`/`unhandledRejection` fires and that a durable
  `capture_failed` (or explicit partial-capture) record results.
- **AC3 — card-atom double-append guard (sequential retry edge only):** before
  appending a card atom, the bridge checks for an existing atom with the same
  `dedupe_key` (bounded query) and skips the append when present — closing the
  **sequential** markPosted-throw retry edge (one worker, retried) that could
  produce two atoms for one card. Test (in
  `tests/enrich/granola-intake-card-atom.test.ts`) reproduces the sequential
  retry path and asserts exactly one atom. The check-then-append guard is NOT
  atomic and does NOT defend against two *concurrent* intake ticks racing the
  same `dedupe_key` — that path is explicitly out of scope here (see Out of
  Scope): it would require an atomic unique-append primitive / lock, which is a
  123-contract (persisted-store) change this hardening batch must not make.
  Intake runs single-flight today, so the sequential edge is the live risk.
- **AC4 — `--note` seed listing for pre-123 cards:** `--note <note_id>` mode
  also lists that note's seed records when no card atoms exist, so pre-123
  notes are walkable from the note entry point, matching the candidate_key
  mode's missing-stage behavior. Because there is no card atom to supply a
  `channel_id` in this path, `--note` mode scans the FULL enumerated seed-store
  set — the default store AND every channel-specific store (today: the terminal
  `.terminal.json`) — so terminal-only seeds are never silently missed
  (the exact gap AC1 fixes). An explicit `--seed-store <path>` override, when
  given, narrows the scan to that single store. Test: a terminal-only pre-123
  note (seed present only in `.terminal.json`, no card atom) → its seed record
  is listed without an override.
- **AC5 — render cosmetics + present-db read-only proof:** `heartbeatLine`
  counters segment goes through `esc()` (dashboard, escaping consistency); a
  comment on the single-flight timeout path documents abandoned-not-cancelled
  semantics; and a REQUIRED test added to `tests/tools/trace-card.test.ts`
  (the belt-and-braces complement to 123's existing absent-db case at
  `trace-card.test.ts:218`) runs a full trace against a scratch ECHO_HOME whose
  `echo.db` IS present and asserts the db file is byte-identical before and
  after (SELECT-only read path never mutates a present db).
- **AC6 — gate:** full test/lint/typecheck green; all changes are
  hardening-shaped (no new features, no schema changes, no new persisted
  state beyond what 123 pinned).

## Out of Scope (Don't Drift)

- No changes to the 123 persisted contracts (card-atom metadata shape,
  capture_status tri-state, card_atom_status values).
- No atomic unique-append primitive / lock for card atoms. AC3's guard defends
  the sequential retry edge only; concurrent-tick double-append is a documented
  blind spot (intake is single-flight today) — if it becomes a real risk it is
  a separate follow-up that would touch the persisted store, out of scope here.
- No proxy-bypass detection mechanism (documented blind spot stays a
  documented blind spot — wiki already carries it).
- No dashboard features; the esc() fix is the only dashboard touch.
- No classifier/brain retrieval behavior changes (zero-retrievals is a tuning
  topic for a separate item).

## After Completion (Strategist Notes)

- One-line wiki touch at next promotion pass: [[loop-observability]]'s
  trace:card section gains the channel-store resolution sentence.
- This closes followups: trace-card seed-store gap (live-trace finding), EPIPE
  handlers, double-atom edge, --note pre-123 listing, esc() counters,
  abandoned-not-cancelled comment, present-db test variant.
