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
  - tests/tools/intake-terminal.test.ts  # renderer + wiring coverage (stub classifier, temp stores)
ready_content_sha: ec528ecdd3751812a98ce7395d99bc8ff32879b171e3d92824ecbe77dd2d9135
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-05T23:30:06Z"
branch: "agent/terminal-intake-card"
head_sha: "5c3ae4cd7008c2016a32af31df6578af68901bba"
pr_url: ""
agent_notes: |
  Implemented tools/intake-terminal.ts + tests/tools/intake-terminal.test.ts +
  package.json `intake:terminal` script. Zero src/enrich/** changes: the tool
  imports and drives runGranolaIntakeBridgeOnce / startGranolaIntakeBridge and
  injects a stdout postSeed for the terminal card (the existing seam). --once
  (single tick + status line + exit) and --watch (bridge interval/debounce/
  single-flight, lazy per-tick brain preflight via runSignalsFirst, Ctrl-C
  clean). Config built directly (no Slack env; terminal channel/token
  sentinels; terminal defaultOwner fallback). Isolated default seed store
  (~/.echo/state/granola-intake-seeds.terminal.json, --seed-store override) with
  fail-fast persistability check before any card. All 6 ACs met; 8 new tests
  pass; typecheck + eslint clean. Full suite: 1971 pass / 1 fail = the
  documented shell-reachable load-flake (passes in isolation, unrelated to this
  diff). E2E smoke against the live production DB confirmed the real station
  1→3 path (real note selected, real codex classifier invoked).

  Reviewer notes (2 non-blocking): (1) AC2 "subject" is best-available
  (request ?? clientProject ?? meeting title) — canonical_subject is not carried
  on the postSeed(channel,text) seam, so surfacing it would require a src/enrich
  change (out of scope). (2) --once real path routes through
  startGranolaIntakeBridge(runOnStart:false).run() because the real brain
  classifier factory is not exported; the injected-classifier path calls
  runGranolaIntakeBridgeOnce directly. No seam gap escalated — reuse is clean.
review_notes: |
  Merged on 2026-07-05 via founder reconciliation (strategist-run per founder
  instruction "review and merge 116"; independent code-review subagent produced
  the sidecar — builder did not review its own work).

  Conflicts resolved:
  - (none — clean merge; sidecar's expected-conflicts prediction held: main had
    zero commits since merge-base touching package.json, tools/, tests/tools/)

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - (none — verdict was "merge as-is" with an empty pre-merge punch list)

  Fixups deferred to follow-up items:
  - (none)

  Verify: 1972/1972 tests pass (0 failed, 21 skipped, 1 todo, 190 files) in the
  merger worktree — both previously-observed load flakes (shell-reachable,
  ceo-slack-brain) passed this run; lint, typecheck, coupled-invariants, and
  sync-skills --check all clean post-merge.

  Follow-up items (non-blocking, from review sidecar):
  - --watch never checks handle.enabled: a disabled no-op bridge handle idles
    forever with only a JSON log hint (tools/intake-terminal.ts:384-395,498-504)
  - real-path status line hardcodes "0 classifier errors" (counting wrapper
    cannot wrap the bridge-internal classifier)
  - invalid brain-name env exits via bare main().catch message, not the
    "skipped:" status-line format
  - enrich JSON logs interleave with cards on stdout; consider stderr diversion
    for demo cleanliness (pair with item 117)
  - undocumented load-flake: tests/surfaces/ceo-slack-brain.test.ts "kills a
    timed-out brain process group" (ENOENT descendant.pid under suite load;
    passes in isolation)
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
  mode, never a crash. In `--watch` mode, brain preflight follows the bridge's lazy
  per-tick retry (`startGranolaIntakeBridge`, see f19dc419), but every tick that skips
  for brain-unavailability MUST print the AC5 per-tick status line naming the skip
  reason (e.g. `skipped: brain unavailable`) so an unavailable-brain watch surfaces a
  visible per-tick stop reason instead of silently spinning; never a crash. The
  classifier default is the real `runBrain` path
  (`ECHO_GRANOLA_INTAKE_BRAIN ?? ECHO_CEO_BRAIN` semantics preserved), injectable for
  tests.
- **AC4 — seed-store isolation + fail-fast persistability, decision surfaced:** default
  seed-store path is a dedicated file (e.g.
  `~/.echo/state/granola-intake-seeds.terminal.json`), overridable by the
  `--seed-store <path>` flag. Rationale the tool's header must state: sharing the
  canonical store (`~/.echo/state/granola-intake-seeds.json`) would mark terminal-shown
  seeds `posted` and permanently suppress their future Slack posts; isolation means the
  same candidates may appear again when Slack enables. Default = isolation; the flag
  lets the founder choose suppression deliberately. Before rendering any card, the tool
  MUST validate the store is persistable: create the parent directory if missing and
  confirm write access; if the resolved store path is uncreatable/unwritable, fail fast
  with a clear message + nonzero exit BEFORE any card is printed (a card shown without
  its `posted` state persisted would re-appear as a duplicate on the next run).
- **AC5 — `--once` and `--watch` modes:** `--once` runs a single tick and exits with a
  status line (candidates seen / cards printed / skipped and why); `--watch` reuses
  `startGranolaIntakeBridge`'s interval + debounce + single-flight with the injected
  poster. Both modes construct the seed store from the resolved `--seed-store` path
  (default = the isolated terminal store) and pass it into the bridge's
  `seedStorePath`/`seedStore` config; neither mode falls back to the canonical store
  silently. Ctrl-C stops cleanly.
- **AC6 — tests:** live at `tests/tools/intake-terminal.test.ts`, run via `npm test`
  (vitest). Stub classifier + temp storage/seed-store fixtures prove: (1) a qualifying
  signal produces exactly one card and one `posted` seed record; (2) a re-run produces
  zero duplicate cards (state machine exercised); (3) classifier failure follows the
  existing retry/failed path with the failure visible in the status line; (4) an
  uncreatable/unwritable resolved seed-store path fails fast with a nonzero exit and no
  card printed; (5) `--watch` with an unavailable brain prints a per-tick skip status
  line naming brain-unavailability and never crashes. No real brain or network in tests.

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
