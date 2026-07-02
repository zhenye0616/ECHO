---
id: 2026-07-01-109-granola-meeting-intake-bridge
title: "Granola→Slack→Linear meeting intake bridge — client needs spotted in meetings auto-draft into the shipped Slack intake gate (auto-scan + human confirm, no auto-create)"
status: proposed
priority: HIGH
estimate: 3-4d (engineering; the seed-acceptance carve-out in the responder and the cross-machine idempotency chain are the net-new hardness — extraction and confirm/create are reuse)
created: 2026-07-01
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-02T03:20:45Z"
branch: "agent/granola-meeting-intake-bridge"
head_sha: "4838674c2a09f81db77a2ba1e4335aec39077f20"
pr_url: ""
agent_notes: |
  Implemented the Granola→Slack→Linear meeting intake bridge on
  agent/granola-meeting-intake-bridge (head 4838674c). All six ACs met:
  AC1 daemon candidate worker (granola-intake-candidates.ts: derived:granola-signals
  action/decision consumption, external-attendee filter via joined raw api:granola
  attendees, brain classification, best-effort fields + provenance, per-note cap,
  append-only respected); AC2 durable seed state machine
  (granola-intake-seed-store.ts: pending|posting|posted|failed, atomic tmp+rename,
  single-flight claim, bounded retries → terminal failed) + fail-closed config;
  AC3 responder seed carve-out (self-bot + intake-channel + supported-marker +
  well-formed-candidate-key gate, durable-write-before-ack, candidate-key
  exactly-once draft with slack_event_ids coupled on the draft record, all AC3
  negatives, duplicate no-op); AC4 108 gate exercised unmodified; AC5 meeting
  provenance in the issue body alongside the Slack thread link; AC6 off-by-default,
  bounded lookback, seeded-dismissal durable record with candidate key, structured
  logs, runbook smoke + posted-but-unaccepted recovery.

  Verification: focused suites (tests/enrich, tests/surfaces/ceo-slack-responder,
  tests/daemon) 81 passed / 4 pre-existing skips; npm run typecheck clean; npm run
  lint (eslint --max-warnings 0 + lint:task-state) clean. Full suite: 1871 passed /
  3 failed / 21 skipped. The 3 failures: (1) tests/packaging/packed-manifest.test.ts
  — EXPECTED snapshot ripple from the two new dist/enrich/* modules; NOT in
  files_to_modify (drift rule 4), same pattern as 106 (founder-authorized post-build
  snapshot update). Reviewer fixup: `npx vitest -u tests/packaging/packed-manifest.test.ts`.
  (2) tests/cli/shell-reachable.test.ts — pre-existing on clean main (packaged daemon
  health / dist/surfaces/ceo-slack-responder exclusion; documented in 106 + 108
  review notes). (3) tests/mcp/recent-calls-endpoint.test.ts — pre-existing full-suite
  load flake; passes 2/2 in isolation (documented in 106 + 108). Zero MCP calls made
  during this run (no dogfooding journal entry per skip-rule).

  ONE reviewer action required: apply the packaging-snapshot regeneration above
  (outside files_to_modify per protocol; same as 106's founder-authorized fixup).
blocked_by: []
task_state_ref: 2026-07-01-109-granola-meeting-intake-bridge
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: 1cbfd7853f41325cd0d038296b2eacd287360ffb19216b6897299ac13bfc2f3a
spec_refs:
  - backlog/complete/2026-06-21-106-granola-meeting-signal-extraction.md  # producer of the derived:granola-signals atoms this consumes (decision/rationale/action, dedupe_key, extraction_run_id, manifest-run semantics)
  - backlog/complete/2026-06-27-108-slack-linear-intake-gate.md           # the shipped intake gate this feeds: draft store, follow-ups, confirm card, fail-closed Linear create
  - docs/execution/echo/linear-intake-gate-setup.md                       # founder's operating design: intake/triage/issue shapes, conversation contract
  - src/enrich/granola-signals.ts                                          # signal atom shapes + provider/model resolution pattern the candidate classifier reuses
  - src/surfaces/ceo-slack-responder/responder.ts                          # Socket Mode ingress; bot_id messages currently ignored — the seed carve-out lands here
  - src/surfaces/ceo-slack-responder/intake-draft-store.ts                 # durable draft store; asked_fields; candidate-key dedupe extends this
  - src/surfaces/ceo-slack-responder/issue-render.ts                       # parent-deliverable issue shape; provenance section extends this
  - src/surfaces/ceo-slack-responder/identity.ts                           # Slack user attribution; owner-mention mapping reuses this pattern
  - wiki/architecture/capture-gate.md                                      # binds: Slack stays SURFACE-only; no capture allowlist changes
  - wiki/architecture/storage.md                                           # append-only, no upsert — bridge state is its own file, atoms are never mutated
files_to_modify:
  # PROVISIONAL — finalized at ready-promotion. Builder confirms paths against the substrate before claiming.
  - src/enrich/granola-intake-candidates.ts        # NEW (AC1) — daemon-side worker: signal atoms → classified intake candidates with provenance
  - src/enrich/granola-intake-seed-store.ts         # NEW (AC2) — durable seed state machine records: pending|posting|posted|failed + slack_ts + retry count (atomic tmp+rename, modeled on intake-draft-store)
  - src/surfaces/ceo-slack-responder/intake-seed.ts # NEW (AC2/AC3) — seed message render (human-readable + machine-parseable versioned marker) and strict marker parse/validation
  - src/surfaces/ceo-slack-responder/responder.ts   # AC3 — seed acceptance carve-out incl. durable-write-before-ack ordering on the seed path; all other bot messages stay ignored
  - src/surfaces/ceo-slack-responder/intake-draft-store.ts  # AC3/AC4/AC6 — candidate-key dedupe (exactly-once draft per candidate); candidate key carried on the draft so dismissals are attributable to the seeding candidate
  - src/surfaces/ceo-slack-responder/issue-render.ts        # AC5 — meeting provenance block in the issue body
  - src/daemon/index.ts                             # AC1/AC2/AC6 — schedule the bridge worker (debounced, after signal extraction); ECHO_GRANOLA_INTAKE_* config parsing (enabled flag, lookback days, internal domains, owner map, default owner, ECHO_GRANOLA_INTAKE_CHANNEL_ID) + ECHO_SLACK_BOT_TOKEN reuse; enabled with missing/blank token or channel fails closed before claiming seed records (presence-only — responder-side equality is a deploy invariant per AC2/AC6, not machine-checked)
  - docs/onboarding/slack-linear-intake-runbook.md  # AC6 — bridge deploy invariants (same bot token as responder, allowlisted intake channel), first-live-run smoke procedure, posted-but-unaccepted seed check + disable/reconcile steps
  - tests/enrich/granola-intake-candidates.test.ts  # NEW — classification, external-attendee filter, per-note cap, provenance fields
  - tests/enrich/granola-intake-seed-store.test.ts  # NEW — state transitions, crash-window recovery (pending/posting retried; posted never re-posted; failed is terminal + operator-visible), two concurrent bridge invocations on the same candidate converge to one durable record, append-only atoms untouched
  - tests/surfaces/ceo-slack-responder/intake-seed.test.ts  # NEW — acceptance positives + ALL AC3 negative cases; candidate-key no-op on duplicate seeds; ack-ordering contract incl. event-id-persisted-before-draft crash window unreachable; seeded-draft dismissal carries candidate key into the durable dismissal record
  - tests/surfaces/ceo-slack-responder/issue-provenance.test.ts  # NEW — AC5 meeting provenance rendered into the issue body alongside the Slack thread link
  - tests/daemon/granola-intake-schedule.test.ts    # NEW — worker scheduled after signal extraction, gated on ECHO_GRANOLA_INTAKE_ENABLED, lookback bound respected; enabled-but-misconfigured (missing token/channel) fails closed with structured config error and claims zero seed records
---

# 109 — Granola→Slack→Linear meeting intake bridge

## Problem

Client needs and spotted issues surface in two places: Slack messages (covered — item 108's intake gate is live on Fly) and client meetings (uncovered). Today a need mentioned in a Granola-captured meeting becomes a Linear issue only if a human remembers to retype it into Slack or Linear — the exact back-and-forth the intake gate exists to remove. Item 106 already derives decision/rationale/action signal atoms from every captured meeting; nothing consumes them for intake.

**Founder decision (2026-07-01):** the goal is reducing friction/time on org-level alignment across Granola (meetings), Slack (communication), Linear (project management), and Codex+Claude (eng). ECHO lives inside these tools — no new destination surface. v0 = the intake half only (this item); status-backflow (PM asks "where is X?" answered from Linear state + eng capture) is deferred to a v0.1 item. Meeting leg posture: **auto-scan + confirm card** — ambient detection, human-gated action. Nothing enters Linear without a person confirming in Slack.

## Design

One new leg feeding shipped machinery:

```
Granola note ──(104 capture)──▶ raw atoms ──(106 extraction)──▶ signal atoms
                                                                    │
                                              (109 bridge, founder machine)
                                                                    ▼
                                                   intake candidates (classified,
                                                    fields best-effort, provenance)
                                                                    │
                                                     Slack seed message in the
                                                     intake channel, owner tagged
                                                                    ▼
                                        (108 gate, Fly) draft → follow-ups in thread
                                                       → confirm card → Linear issue
```

- **The bridge runs founder-side** (daemon enrichment worker) where Granola/signal atoms live. **Slack is the transport** to the Fly responder — no new HTTP surface, no shared store. This is the "ECHO lives inside the tools" posture: the seed is a normal Slack message a teammate can read, ignore, or act on.
- **Seed acceptance carve-out:** the responder today ignores all `bot_id` messages. It gains exactly one exception: messages authored by its own bot carrying a machine-parseable seed marker (versioned prefix + candidate key). Marker-bearing seeds open an intake draft whose requester is the tagged owner; every other bot message stays ignored (loop-safe: follow-ups and confirm cards never carry the marker).
- **Missing fields are collected from the right human:** the seed maps signal → intake fields best-effort and tags the client-facing owner (attendee-email → Slack-user config map; fallback default owner). The existing follow-up flow asks the gaps in the seed thread; the existing confirm card gates the create.
- **Idempotency chain (cross-machine, crash-safe):** candidate key = the signal atom's `dedupe_key` (stable across extraction runs). Bridge posting is at-least-once via a durable seed state machine (`pending` → `posting` → `posted` with Slack ts, retries for anything short of `posted`); the responder dedupes by candidate key with the draft write durably landed before the Slack ack, so draft creation is exactly-once even if a seed is double-posted or the responder crashes mid-handoff. The 108 gate's event-id dedupe and fail-closed Linear create are unchanged downstream.

## Acceptance Criteria

- **AC1 — candidate extraction (daemon):** a worker consumes `derived:granola-signals` atoms (signal types `action` and `decision`) for notes with at least one attendee outside the configured internal email domains; a brain classification pass (provider/model resolution reused from 106/105) keeps only ticket-worthy client needs/issues and maps each to intake fields best-effort plus provenance `{note_id, web_url, meeting title/date, supporting quote}`. Per-note candidate cap (default 3, config). Internal-only meetings produce zero candidates. Raw and signal atoms are never mutated (append-only respected).
- **AC2 — seeding (daemon → Slack):** each candidate is driven through a durable seed state machine: `pending` (recorded before any Slack call) → `posting` → `posted` (Slack `ts` persisted on ack); any record not in `posted`/`failed` is retried on the next worker run, so a crash or transient Slack failure can never convert at-least-once seeding into zero-times seeding. A candidate that exhausts retries (config, default 5) lands in `failed` with an operator-visible durable record and a structured error log. Slack delivery config is named explicitly: the bridge posts with `ECHO_SLACK_BOT_TOKEN` (operators MUST set this to the same bot token the 108 responder uses) to `ECHO_GRANOLA_INTAKE_CHANNEL_ID` (operators MUST pick a channel in the responder's `ECHO_CEO_SLACK_CHANNEL_IDS` allowlist). Both MUST-align facts are **deploy invariants, not machine-checked claims**: the daemon and the Fly responder are separate deployments with no shared store, so the bridge cannot verify responder-side bot identity or allowlist membership and does not claim to. Startup validation is scoped to what is locally checkable: when `ECHO_GRANOLA_INTAKE_ENABLED=true`, missing/blank token or channel fails closed with a structured, operator-visible config error **before any seed record is claimed**. Valid-but-wrong config (wrong bot identity, non-allowlisted channel) is caught observably by the AC6 first-live-run smoke — a `posted` seed with no responder reply is the defined broken-invariant signal with documented recovery, never a silent loss. Seed delivery to Slack is **at-least-once by contract**; exactly-once is scoped to responder draft creation (AC3), not to visible Slack messages. Overlapping bridge runs must be safe: seed-state writes use an atomic create/claim per candidate key (single-flight), so two concurrent worker invocations seeing the same candidate cannot corrupt or lose retry/failure evidence — duplicate Slack posts remain allowed under at-least-once, but durable state must converge to a single operator-visible record per candidate (test: two concurrent bridge invocations on the same candidate). The seed message contains human-readable labeled intake fields + meeting provenance + owner `@mention`, plus a versioned machine-parseable marker embedding the candidate key.
- **AC3 — seed acceptance (responder):** the responder accepts a bot-authored message as an intake seed only when ALL of the following validate: (1) author bot identity equals the responder's own configured bot id, (2) channel is the configured intake channel, (3) the marker parses with a supported version, (4) the marker carries a well-formed candidate key. On acceptance, the candidate-key dedupe check and draft creation are durably written **before** the Slack envelope is acked, so a crash after ack cannot silently lose the seed; Slack redelivery plus the existing event-id dedupe cover the crash-after-write case. The event-id handled marking for a seed event must be durably written atomically with, or strictly after, the draft creation (or the durable candidate-key duplicate no-op) — never before it — so a crash after event-id persistence but before draft persistence is unreachable and Slack redelivery can never become a silent no-op that loses the seed (note: the current store design already couples these — `slack_event_ids` lives on the draft record in the same durable file — so the contract is an observable invariant on that coupling, not a new store; crash-window test required). Requester = the mentioned owner; `asked_fields`/follow-up flow proceeds exactly as for human-typed intake. Negative cases that MUST remain ignored, each with a test: human-authored messages containing marker-like text, non-self bot messages carrying markers, malformed or unsupported-version markers, and the responder's own follow-ups/confirm cards (which never carry the marker). A second valid seed with an already-seen candidate key is a no-op (exactly-once draft per candidate).
- **AC4 — end-to-end gate unchanged:** from seed thread to Linear issue, the 108 flow (follow-ups, confirm card, fail-closed exactly-once create, receipts, dismiss) is exercised without modification to its guarantees; no issue is ever created without a human confirm.
- **AC5 — provenance to Linear:** the created issue body carries the meeting title/date, Granola `web_url`, and supporting quote alongside the existing Slack-thread link, so eng (in Codex/Claude, via ECHO MCP or the issue itself) can reach the client "why" without asking anyone.
- **AC6 — guardrails + observability:** feature is off by default (`ECHO_GRANOLA_INTAKE_ENABLED`); lookback bounded (default 7 days, config); dismissals of seeded drafts are durably recorded with candidate key (tuning signal for noise) — with a test exercising the dismiss path end-to-end: a seeded draft dismissed in Slack must yield a durable dismissal record (and structured log line) that carries the originating candidate key, not only the draft key; structured logs for scan/classify/seed with counts; the feature may stay enabled only after a **first-live-run smoke**: one seeded candidate observably accepted by the responder (a responder reply — follow-up questions or confirm card — appears in the seed thread), journaled per dogfooding discipline. A seed that reaches `posted` with no responder reply means the AC2 deploy invariants are broken; the runbook documents the check, the disable step, and how to reconcile posted-but-unaccepted seeds.

## Out of Scope (Don't Drift)

- **No Linear read / status Q&A** — that is the v0.1 backflow item, not this one.
- **No auto-create:** the confirm card is load-bearing; do not add any path that creates a Linear issue without a human confirm.
- **No Slack capture:** `CAPTURED_SOURCES` / capture-gate untouched; Slack remains surface-only.
- **No changes to 106's extraction** (signal derivation is the producer contract, consumed as-is) and **no re-extraction from raw transcripts** in this item.
- **No new shared store, no federation, no HTTP endpoint on the Fly responder** — Slack is the only transport.
- **No new destination UI** — seeds, follow-ups, confirms all live in the existing intake channel.

## After Completion (Strategist Notes)

- Create `wiki/surfaces/slack-linear-intake.md` (status: shipped) covering the full 108+109 intake surface: sources (Slack message, Granola meeting), the seed/confirm contract, and the human-gate principle.
- Update `wiki/capture/per-app/` Granola page (or create) to note the derived-signal consumer chain (106 → 109).
- Record the 2026-07-01 org-alignment reframe (goal, five-tool set, "live inside the tools" posture, v0/v0.1 split) in `raw/internal/decisions/` and reconcile `docs/NORTH_STAR.md` if the founder confirms the reframe supersedes the prior V1 wedge wording.
- Propose the v0.1 backflow item (Linear read + status Q&A in the responder) once this ships and the first live meeting-sourced issue lands.
