---
status: shipped
topic: Architecture
subtopic: Observability
aliases:
  - Terminal Intake Card
  - intake-terminal
  - Station 3 Terminal Card
---

# Terminal Intake Card

## Definition

The terminal intake card is a stdout surface that renders the Granola meeting → signals → classified decision-packet candidate pipeline (stations 1–3) as a plain-text/ANSI card, with zero Slack dependency. It lives at `tools/intake-terminal.ts`, shipped in 116 as the sprint's "mechanism visible" demo artifact: real meeting, real signals, real classified packet, on screen, with no hand-staging.

The tool is a thin renderer, not a new mechanism. It imports and drives `runGranolaIntakeBridgeOnce` / `startGranolaIntakeBridge` from `src/enrich/granola-intake-candidates.ts` verbatim — candidate selection, classification, per-note capping, and the durable seed state machine are all unmodified. The only new code is a stdout `postSeed` injected in place of the Slack POST, using the same seam (`postSeed: SeedPoster`) the Slack path already exposes.

## Invocation

Canonical invocation:

```
npm run intake:terminal -- [--once | --watch] [--seed-store <path>]
```

`--once` (default) runs a single tick, prints a status line, and exits. `--watch` reuses the bridge's interval/debounce/single-flight and runs until Ctrl-C.

**Bare `vite-node tools/intake-terminal.ts` does not launch the tool — this is by design, shipped in 121.** The entry guard at `tools/intake-terminal.ts:532` is the house pattern (`process.argv[1] === fileURLToPath(import.meta.url)`, matching `src/surfaces/ceo-slack-responder/index.ts`), which only holds under `vite-node --script <file>`: plain `vite-node <file>` drops the script name from argv, leaving `argv[1]` as the vite-node binary itself, byte-indistinguishable from an import. Under `--script` mode, `argv[1]` carries the resolved script path, so the entry check matches only real CLI invocation and never a module import. `package.json`'s `intake:terminal` script is therefore `vite-node --script tools/intake-terminal.ts` (matching the repo's `eval:retrieval` precedent), not the plain form.

121 replaced an earlier `process.env.VITEST === undefined` guard that was a live foot-gun: any vite-node script that merely imported a helper from the module — outside vitest, where `VITEST` is unset — silently launched the real tool against the production database with the real brain. Demonstrated live on 2026-07-06; contained (the bridge is storage-read-only, one stray seed-store file cleaned) but fast-tracked as a safety fix.

## What it renders

Each posted seed becomes one card, built entirely from the seed message text — the same text the Slack path would post, parsed via `parseSeedMarker` (`renderIntakeCard`, `tools/intake-terminal.ts:167`):

- **Subject** — best-available identity through the seam: `request` field, else `clientProject`, else the meeting title. `canonical_subject` is not carried on the `postSeed(channel, text)` seam, so it cannot be shown from this surface without a `src/enrich` change (flagged, not made — out of scope for 116).
- **Signal** — `action` or `decision`, recovered from the candidate key's typed segment (`signalTypeFromCandidateKey`).
- **Meeting** — title, date, and note id.
- **Candidate** — the full dedupe key (`granola:signal:<noteId>:v<n>:<action|decision>:<hash>`).
- **Quote** — the verbatim evidence span from the meeting, when present.
- **Fields** — whichever `IntakeFields` are present: client/project, request, why, client outcome, evidence/example, done when, urgency, client-facing.
- **Granola** — the note's web URL, when present.

A malformed or markerless seed message falls back to a raw dump rather than a crash.

Per-tick status line (`formatStatusLine`) reports notes seen, candidates, cards printed, skipped, failed, and classifier errors — a reviewer follow-up flags that the real-path classifier-error count is hardcoded to 0 because the counting wrapper can't see inside the bridge-internal classifier.

## Config without Slack env

`buildTerminalIntakeConfig` constructs `GranolaIntakeConfig` directly instead of calling `loadGranolaIntakeConfig`, so no Slack-shaped environment is required: `channelId` is the sentinel `'terminal'`, `botToken` is an unused sentinel, and `defaultOwner` falls back to `'terminal'` so owner-unresolved notes still surface instead of being dropped. Non-Slack knobs (internal domains, owner map, lookback days, per-note cap, max retries) read the same env vars the daemon honors. The classifier defaults to the real `runBrain` path (`ECHO_GRANOLA_INTAKE_BRAIN ?? ECHO_CEO_BRAIN`), injectable in tests.

Brain preflight matches the bridge's behavior: `--once` fails closed with a `skipped: brain unavailable` message and nonzero exit; `--watch` retries the preflight lazily on every tick via the bridge's `runSignalsFirst` hook, printing the same skip line per tick rather than crashing or spinning silently.

## Seed-store isolation

Default seed-store path is `~/.echo/state/granola-intake-seeds.terminal.json` (`terminalSeedStorePath()`), a dedicated file distinct from the canonical `~/.echo/state/granola-intake-seeds.json` the Slack path uses. This is a deliberate default, not an oversight: the seed store's state machine (`GranolaIntakeSeedStatus`: `pending → posting → posted | failed`, `src/enrich/granola-intake-seed-store.ts:19`) marks a seed `posted` once shown, which permanently suppresses that candidate's future delivery through whichever store owns it. Sharing the canonical store would mean a candidate shown in the terminal could never later post to Slack. Isolation means the same candidates can resurface once Slack enables; `--seed-store <path>` (e.g. pointed at the canonical store) lets the founder opt into suppression deliberately.

Before any card is printed, `assertSeedStorePersistable` creates the resolved store's parent directory and probes write access, failing fast with a nonzero exit if the store is not writable. This ordering matters: a card shown without its `posted` state durably persisted would reappear as a duplicate on the next tick.

## Card provenance

123 added a `derived:intake-cards` atom (`GRANOLA_INTAKE_CARD_SOURCE`) written alongside each `markPosted` call, carrying the card's fields, the consumed signal `dedupe_key` refs, and classifier-run provenance — independent of which poster (terminal or Slack) produced the card. `npm run trace:card` walks a card back through its consumed retrievals, signals, and raw meeting context. See [[loop-observability]] for the lineage mechanism; this page only documents the terminal rendering surface that one of the card's producers feeds.

## Known caveats

- **AC4 isolation default is a point-in-time decision, not permanent.** The 116 spec explicitly flags: when Slack enables, revisit whether isolation (candidates can resurface) or suppression (pointed at the canonical store) is the right default — this has not yet been revisited.
- `--watch` does not check `handle.enabled` before looping; a disabled bridge handle (e.g. misconfiguration) idles indefinitely with only a JSON log hint, no visible per-tick status line.
- An invalid brain-name env value exits via the bare `main().catch` message path rather than the `skipped:` status-line format used elsewhere.
- Enrich worker JSON logs interleave with cards on the same stdout stream; no stderr diversion yet.
- No interactive confirm/ticket flow — display-only. No drift-sweep terminal card (same pattern, separate item when station 6 is in scope). No daemon changes — the tool runs standalone against the shared store.

## Related

- [[drift-alert]] — the other clocked worker in the same enrichment dispatch, same fail-closed/at-most-once conventions
- [[loop-observability]] — card provenance and trace lineage (123)
- [[storage]] — `canonical_subject` and the append-only atom model the card provenance mechanism builds on
