---
id: 2026-07-05-116-terminal-intake-card
title: "Terminal intake card — stations 1–3 live end-to-end with a stdout decision-packet card, zero Slack dependency"
status: proposed
priority: HIGH
estimate: 1d
created: 2026-07-05
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-05-terminal-first-demo-surface.md   # the pivot this implements
  - raw/internal/decisions/2026-07-03-loop-gap-analysis.md             # station 3 rails + foot-guns
  - src/enrich/granola-intake-candidates.ts                            # the mechanism — reuse verbatim, do NOT fork
  - src/enrich/granola-intake-seed-store.ts                            # durable seed state machine
  - tools/stream-watch.ts                                              # tool precedent: vite-node, pure-observability header conventions
files_to_modify:
  # PROVISIONAL
  - tools/intake-terminal.ts        # NEW: the only substantive new file
  - package.json                    # npm script `intake:terminal`
  - tests/tools/                    # renderer + wiring coverage (stub classifier, temp stores)
---

## Problem

Station 3 (decision packet) is code-complete but has never run live: its only delivery
surface is a Slack POST, which is gated on tokens, a channel/safety decision (sensitive
backfill), an owner map that can crash the daemon, and a responder host that currently
doesn't exist (Fly trial expired). The sprint goal is the under-the-hood mechanism —
meeting → signals → classified decision-packet candidate — visible and demo-ready
without any of that. The Slack POST is already an injectable seam
(`postSeed: SeedPoster`, `granola-intake-candidates.ts:87`, override honored at `:658`),
so a terminal card requires no mechanism changes at all.

## Acceptance Criteria

- **AC1 — one new tool, mechanism reused verbatim:** `tools/intake-terminal.ts`
  (vite-node, `npm run intake:terminal`), following the `tools/stream-watch.ts`
  precedent (header states purpose + usage). It MUST import and call
  `runGranolaIntakeBridgeOnce` / `startGranolaIntakeBridge` from
  `src/enrich/granola-intake-candidates.ts`. Zero duplication of candidate selection,
  classification, capping, or seed-state logic — the diff to `src/enrich/**` is empty
  (any seam gap found must be escalated, not worked around by copying).
- **AC2 — stdout card via the existing seam:** inject `postSeed` rendering one card per
  seed to stdout: subject, signal type, verbatim quote/evidence span, meeting title +
  note id, candidate key, and the intake fields present in the seed text. Render is
  plain text/ANSI, no new deps. The injected poster returns the same `SeedPostResult`
  shape so the seed store records `posted` exactly as the Slack path would.
- **AC3 — config without Slack env:** the tool constructs `GranolaIntakeConfig`
  directly (enabled, terminal channel sentinel, unused bot token) instead of requiring
  `loadGranolaIntakeConfig`'s Slack-shaped env. Brain preflight behavior matches the
  bridge: missing/unavailable brain → clear skip message + nonzero exit in `--once`
  mode, never a crash. The classifier default is the real `runBrain` path
  (`ECHO_GRANOLA_INTAKE_BRAIN ?? ECHO_CEO_BRAIN` semantics preserved), injectable for
  tests.
- **AC4 — seed-store isolation, decision surfaced:** default seed-store path is a
  dedicated file (e.g. `~/.echo/state/granola-intake-seeds.terminal.json`), overridable
  by flag. Rationale the tool's header must state: sharing the canonical store would
  mark terminal-shown seeds `posted` and permanently suppress their future Slack posts;
  isolation means the same candidates may appear again when Slack enables. Default =
  isolation; the flag lets the founder choose suppression deliberately.
- **AC5 — `--once` and `--watch` modes:** `--once` runs a single tick and exits with a
  status line (candidates seen / cards printed / skipped and why); `--watch` reuses
  `startGranolaIntakeBridge`'s interval + debounce + single-flight with the injected
  poster. Ctrl-C stops cleanly.
- **AC6 — tests:** stub classifier + temp storage/seed-store fixtures prove: a
  qualifying signal produces exactly one card and one `posted` seed record; a re-run
  produces zero duplicate cards (state machine exercised); classifier failure follows
  the existing retry/failed path with the failure visible in the status line. No real
  brain or network in tests.

## Out of Scope (Don't Drift)

- **No changes to `src/enrich/**`** — the mechanism is reused, not modified. If a seam
  is genuinely missing, STOP and escalate via `agent_notes`.
- **No Slack path changes, no responder work, no Linear.** Confirm/ticket flow is a
  later item; this card is display-only (no interactive confirm in the terminal).
- **No drift-sweep terminal card** — same pattern, separate item when station 6 is in
  scope.
- **No new rendering/TUI dependency.**
- **No daemon changes** — the tool runs standalone against the shared store.

## After Completion (Strategist Notes)

- This is the sprint's "stations 1–3 live" demo artifact: real meeting → real signals →
  real classified packet on screen. Wiki page only after shipping (surfaces/ or
  operating-model per taxonomy at that time).
- Demo runbook note: pair with item 117's doctor output for the "mechanism visible"
  story; schedule real Granola meetings pre-freeze (still owed).
- When Slack enables later, revisit AC4's isolation default against the canonical
  store (deliberate suppression vs re-post).
