---
id: 2026-07-01-109-granola-meeting-intake-bridge
title: "Granola→Slack→Linear meeting intake bridge — client needs spotted in meetings auto-draft into the shipped Slack intake gate (auto-scan + human confirm, no auto-create)"
status: proposed
priority: HIGH
estimate: 3-4d (engineering; the seed-acceptance carve-out in the responder and the cross-machine idempotency chain are the net-new hardness — extraction and confirm/create are reuse)
created: 2026-07-01
blocked_by: []
task_state_ref: 2026-07-01-109-granola-meeting-intake-bridge
requested_reviewers: ["codex", "codex-ops"]
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
  - src/surfaces/ceo-slack-responder/intake-seed.ts # NEW (AC2/AC3) — seed message render (human-readable + machine-parseable marker) and marker parse
  - src/surfaces/ceo-slack-responder/responder.ts   # AC3 — accept self-bot seed messages bearing the marker as intake openings; all other bot messages stay ignored
  - src/surfaces/ceo-slack-responder/intake-draft-store.ts  # AC3/AC4 — candidate-key dedupe (exactly-once draft per candidate)
  - src/surfaces/ceo-slack-responder/issue-render.ts        # AC5 — meeting provenance block in the issue body
  - src/daemon/index.ts                             # AC1 — schedule the bridge worker (debounced, after signal extraction)
  - tests/enrich/granola-intake-candidates.test.ts  # NEW
  - tests/surfaces/ceo-slack-responder/intake-seed.test.ts  # NEW
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
- **Idempotency chain (cross-machine, crash-safe):** candidate key = the signal atom's `dedupe_key` (stable across extraction runs). Bridge posting is at-least-once (durable seeded-record, record-then-post); the responder dedupes by candidate key, so draft creation is exactly-once even if a seed is double-posted. The 108 gate's event-id dedupe and fail-closed Linear create are unchanged downstream.

## Acceptance Criteria

- **AC1 — candidate extraction (daemon):** a worker consumes `derived:granola-signals` atoms (signal types `action` and `decision`) for notes with at least one attendee outside the configured internal email domains; a brain classification pass (provider/model resolution reused from 106/105) keeps only ticket-worthy client needs/issues and maps each to intake fields best-effort plus provenance `{note_id, web_url, meeting title/date, supporting quote}`. Per-note candidate cap (default 3, config). Internal-only meetings produce zero candidates. Raw and signal atoms are never mutated (append-only respected).
- **AC2 — seeding (daemon → Slack):** each candidate posts exactly one seed message to the configured intake channel via the bot token: human-readable labeled intake fields + meeting provenance + owner `@mention`, plus a versioned machine-parseable marker embedding the candidate key. Seeded-record is durable and crash-safe (record-then-post; at-least-once).
- **AC3 — seed acceptance (responder):** the responder accepts self-bot messages bearing a valid marker as intake openings: creates the draft keyed by the seed thread with requester = the mentioned owner and `asked_fields`/follow-up flow proceeding exactly as for human-typed intake. Bot messages without a valid marker remain ignored. A second seed with an already-seen candidate key is a no-op (exactly-once draft per candidate).
- **AC4 — end-to-end gate unchanged:** from seed thread to Linear issue, the 108 flow (follow-ups, confirm card, fail-closed exactly-once create, receipts, dismiss) is exercised without modification to its guarantees; no issue is ever created without a human confirm.
- **AC5 — provenance to Linear:** the created issue body carries the meeting title/date, Granola `web_url`, and supporting quote alongside the existing Slack-thread link, so eng (in Codex/Claude, via ECHO MCP or the issue itself) can reach the client "why" without asking anyone.
- **AC6 — guardrails + observability:** feature is off by default (`ECHO_GRANOLA_INTAKE_ENABLED`); lookback bounded (default 7 days, config); dismissals of seeded drafts are durably recorded with candidate key (tuning signal for noise); structured logs for scan/classify/seed with counts; the first live meeting-to-issue run is journaled per dogfooding discipline.

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
