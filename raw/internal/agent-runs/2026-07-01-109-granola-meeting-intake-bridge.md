# Agent Run — 2026-07-01-109-granola-meeting-intake-bridge

## Run 1 (2026-07-02)

**Agent:** Claude Code builder (persona 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405)
**Branch:** agent/granola-meeting-intake-bridge
**Head SHA:** 4838674c2a09f81db77a2ba1e4335aec39077f20

### What I implemented

One new leg feeding the shipped 108 intake gate: Granola meeting signals → classified
intake candidates → Slack seed messages → the responder's seed carve-out → existing
follow-up/confirm/create flow. No auto-create; human confirm stays load-bearing.

- **`src/enrich/granola-intake-candidates.ts` (NEW, AC1):** daemon worker
  `runGranolaIntakeBridgeOnce` consumes `derived:granola-signals` atoms
  (`signal_type` action/decision only), joins raw `api:granola` atoms for
  attendees/web_url/title/date, keeps only notes with ≥1 external-domain
  attendee, runs a brain classification pass (provider/model resolution reused
  from the 106 signal worker), maps each kept signal to intake fields best-effort
  + provenance `{note_id, web_url, meeting title/date, quote}`, caps per note
  (default 3), assigns the client-facing owner (attendee-email → Slack map,
  fallback default owner). `loadGranolaIntakeConfig` parses `ECHO_GRANOLA_INTAKE_*`
  + reuses `ECHO_SLACK_BOT_TOKEN`; enabled-but-missing token/channel throws a
  structured `GranolaIntakeConfigError` (fail-closed, before any claim).
  `startGranolaIntakeBridge` schedules a debounced pass that awaits
  `runSignalsFirst` (the "after signal extraction" coupling) each run. Raw/signal
  atoms are only queried, never mutated (append-only respected).
- **`src/enrich/granola-intake-seed-store.ts` (NEW, AC2):** durable seed state
  machine `pending|posting|posted|failed` + `slack_ts` + `retry_count`, atomic
  tmp+rename with unique temp names, single-flight `claim` (two concurrent claims
  converge to one record), bounded retries (default 5) → terminal `failed`
  (operator-visible).
- **`src/surfaces/ceo-slack-responder/intake-seed.ts` (NEW, AC2/AC3):** seed
  message render (labeled fields + provenance + owner @mention + versioned
  base64url marker embedding candidate key/owner/fields/provenance) and strict
  `parseSeedMarker` (null on absent/unsupported-version/malformed/undecodable).
- **`responder.ts` (AC3):** `extractIntakeSeed` accepts a bot message only when
  self bot id + configured intake channel + supported marker version + well-formed
  candidate key ALL validate; `respondToIntakeSeed` does durable draft write
  BEFORE the Slack envelope ack (write-before-ack), candidate-key/event-id dedupe
  before reply; seeded-draft dismissals append a durable record carrying the
  originating candidate key. Ack reordered in `handleSocketMessage` (seed path
  only; all other paths ack first, unchanged).
- **`intake-draft-store.ts` (AC3/AC4/AC6):** `candidate_key` + `meeting_provenance`
  on the draft; `recordSeed` = exactly-once draft per candidate (duplicate
  candidate key or replayed event id = no-op); `slack_event_ids` written in the
  same durable record as the draft (event-id marking atomic-with the draft).
- **`issue-render.ts` (AC5):** meeting provenance block (title/date, web_url,
  quote) in the issue body alongside the Slack thread link; threaded through the
  create path in `responder.ts`.
- **`src/daemon/index.ts` (AC1/AC2/AC6):** starts the bridge after enrichment
  dispatch, `runSignalsFirst: () => enrichment.granolaSignals.run()`; off by
  default; misconfig fails closed inside `startGranolaIntakeBridge`.
- **`docs/onboarding/slack-linear-intake-runbook.md` (AC6):** bridge section —
  deploy invariants (same bot token, allowlisted intake channel), first-live-run
  smoke, posted-but-unaccepted seed check + disable/reconcile steps.

### Files modified

- NEW `src/enrich/granola-intake-candidates.ts`
- NEW `src/enrich/granola-intake-seed-store.ts`
- NEW `src/surfaces/ceo-slack-responder/intake-seed.ts`
- MOD `src/surfaces/ceo-slack-responder/responder.ts`
- MOD `src/surfaces/ceo-slack-responder/intake-draft-store.ts`
- MOD `src/surfaces/ceo-slack-responder/issue-render.ts`
- MOD `src/daemon/index.ts`
- MOD `docs/onboarding/slack-linear-intake-runbook.md`
- NEW tests: `tests/enrich/granola-intake-candidates.test.ts`,
  `tests/enrich/granola-intake-seed-store.test.ts`,
  `tests/surfaces/ceo-slack-responder/intake-seed.test.ts`,
  `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts`,
  `tests/daemon/granola-intake-schedule.test.ts`

### Decisions made during implementation

- **Marker carries a structured base64url payload** (candidate key + owner +
  fields + provenance), not just the candidate key. The human-readable labeled
  fields remain in the seed text for humans; the responder reads structured data
  from the marker rather than fragilely re-parsing bold-labeled text. AC3 requires
  the marker "carries a well-formed candidate key" — this is a superset, still a
  versioned machine-parseable marker.
- **"After signal extraction" coupling** is implemented as `runSignalsFirst`
  awaited at the start of each bridge pass (daemon passes
  `enrichment.granolaSignals.run()`, which is idempotent). `src/enrich/dispatch.ts`
  is NOT in files_to_modify, so the coupling lives in daemon/index.ts +
  granola-intake-candidates.ts as specified.
- **Seed carve-out is opt-in**: active only when responder `ECHO_INTAKE_SEED_BOT_ID`
  + `ECHO_INTAKE_SEED_CHANNEL_ID` are set (plus Linear intake configured). Unset →
  all bot messages stay ignored (current behavior unchanged).
- **Requester = mentioned owner**, resolved from the marker owner (fallback: first
  `<@U...>` mention in the seed text). Reuses `identity.ts` for the label.

### Acceptance criteria status

- **AC1 — candidate extraction (daemon):** MET. Action/decision consumption,
  external-attendee filter, brain classification, best-effort fields + provenance,
  per-note cap, internal-only → zero candidates, append-only respected. Tests in
  `tests/enrich/granola-intake-candidates.test.ts`.
- **AC2 — seeding (daemon → Slack):** MET. Durable pending→posting→posted state
  machine with slack_ts, retry of non-terminal, bounded retries → failed terminal,
  single-flight claim, `ECHO_SLACK_BOT_TOKEN`/`ECHO_GRANOLA_INTAKE_CHANNEL_ID`
  fail-closed on missing/blank, versioned marker. Tests in
  `tests/enrich/granola-intake-seed-store.test.ts` + candidates + schedule.
- **AC3 — seed acceptance (responder):** MET. Four-way validation gate,
  write-before-ack, candidate-key exactly-once draft, event-id-on-draft coupling,
  all negatives (human marker text, non-self bot, wrong channel,
  malformed/unsupported marker, own no-marker follow-ups), duplicate no-op. Tests
  in `tests/surfaces/ceo-slack-responder/intake-seed.test.ts`.
- **AC4 — end-to-end gate unchanged:** MET. Seed drafts flow through the existing
  108 follow-up/confirm/fail-closed-create machinery unmodified; all 108 tests
  still green (intake-gate, intake-followup, intake-confirm-idempotency,
  linear-client).
- **AC5 — provenance to Linear:** MET. Meeting title/date, web_url, quote in the
  issue body alongside the Slack thread link. Tests in
  `tests/surfaces/ceo-slack-responder/issue-provenance.test.ts`.
- **AC6 — guardrails + observability:** MET. Off by default, bounded lookback,
  seeded-dismissal durable record with candidate key + log, structured
  scan/classify/seed logs, runbook first-live-run smoke + posted-but-unaccepted
  recovery.

### Test results

Focused suites (`npx vitest run tests/enrich tests/surfaces/ceo-slack-responder tests/daemon`):
**81 passed | 4 skipped** (the 4 skips are pre-existing in tests/daemon/lifecycle.test.ts).
`npm run typecheck`: clean. `npm run lint` (eslint --max-warnings 0 + lint:task-state): clean.

Full suite (`npx vitest run`): **1871 passed | 3 failed | 21 skipped | 1 todo**. The 3 failures:
1. `tests/packaging/packed-manifest.test.ts` — EXPECTED mechanical snapshot ripple:
   the two new `dist/enrich/granola-intake-candidates.js` + `granola-intake-seed-store.js`
   files are added to the pinned pack manifest. This file is NOT in files_to_modify
   (drift rule 4 stop condition), and is the same ripple 106 hit and the founder
   authorized post-build. **Reviewer fixup:** `npx vitest -u tests/packaging/packed-manifest.test.ts`.
2. `tests/cli/shell-reachable.test.ts` — PRE-EXISTING on clean main (packaged daemon
   does not become healthy; `package.json` excludes `dist/surfaces/ceo-slack-responder/**`).
   Documented in both 106 and 108 review notes. Untouched by this item.
3. `tests/mcp/recent-calls-endpoint.test.ts` — PRE-EXISTING full-suite load flake;
   passes on focused rerun (verified: 2/2 pass in isolation). Documented in 106/108.

### Open questions for founder / reviewer

- The packaging snapshot (`tests/packaging/packed-manifest.test.ts`) needs the
  founder-authorized one-line regeneration (add the two `dist/enrich/*` lines),
  same as 106. Not applied here because the file is outside `files_to_modify`.

### Drift events

None. Held to acceptance criteria: no Linear read, no auto-create, no Slack
capture-gate change, no new HTTP surface, no re-extraction from raw transcripts.
`src/enrich/dispatch.ts` and `src/capture/sources.ts` intentionally untouched.
