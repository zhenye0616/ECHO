# Station 2 lock-in — signal-formation mechanism is settled infra; no widening

**Date:** 2026-07-04 (afternoon, post seam-trio merge)
**Decided by:** founder, in conversation with strategist
**Provenance:** design discussion in Claude session `b9fedf23` (main checkout, 2026-07-04 12:45–13:57 PDT — Fortune-500 signal-lanes analysis + D1–D7 bullets), lock-in confirmed in the follow-on strategist session same day. Retrieved cross-session via ECHO (see dogfooding journal 2026-07-04 16:26 PDT entry).

## The decision

Station 2 ("Structure signals", `src/enrich/`) is **locked as infrastructure**: the mechanism decided below is the canonical signal-formation contract. Refinement effort goes into hardening this machinery — **not** into widening it with new sources/extractors. "Crucial" ≠ "widen": the founder explicitly affirmed no-widening-yet.

## The mechanism (D1–D7, from the b9fedf23 discussion)

- **D1 — Transform when: eager for facts, on-demand for conclusions.** Facts ("we decided X in Tuesday's meeting") extract eagerly, near the event, via clocked worker — fidelity decays, storage doesn't. Conclusions ("we're drifting") compute fresh at question/sweep time and are never persisted as facts (seam decision #1). Forcing reason: exception-push consumers (drift) can't wait for a question — their inputs must already be structured.
- **D2 — Persist signals: yes, with discipline.** Persist for joinability (stable key before the question arrives), one-LLM-pass-per-meeting cost, and the verbatim-quote audit trail (the only defense against altitude compression). Rot handled by `extractor_version` + supersedes manifests — version old signals, never rewrite.
- **D3 — What earns persistence: density × standing consumer.** A derived form is persisted only where signal density is high AND a standing consumer exists.
- **D4 — Delivery is hybrid, three lanes.** Cadenced push (clocked workers), exception push (drift alert to owner = 114), pull (`getSignalWindow` / MCP / responder = 113 + shipped surfaces). Pull answers from persisted signals + thin raw delta — never re-synthesizes from raw alone.
- **D5 — Pull is free for the execution layer (the product claim).** Capture already happened, so the exec's question never interrupts builders. "Call a meeting" becomes "query the substrate." This is the pitch, not plumbing.
- **D6 — Pull-triggered filing: parked, with an explicit trigger.** Lazy-extract-then-persist for uncovered sources is NOT built now. Build trigger: the dogfooding journal shows repeated pull queries re-synthesizing the same un-extracted source.
- **D7 — Don't widen station 2 now.** New extractors are template instantiations on the existing chassis (settle gate, fingerprint checkpoint, strict-JSON brain, quote anchoring), added only when a consumer demands it — drift misses or repeated pulls — not because station 2 "feels crucial."

## What "lock in the infra" means concretely

No new backlog items are opened by this decision (demo-sprint no-specs order holds). The hardening work list already exists in `backlog/_followups.md` from the 113/114 merges; this decision names them as the station-2/seam infra ledger:

- Shared packed-safe module for team-decision read + cofounder identity (removes `readLatestDecisions` divergence risk).
- Drift-checkpoint pruning + stop persisting the whole file per transition (unbounded growth, O(n²) I/O at scale).
- Tighten `if (status === 'ok')`-guarded test assertions (vacuous-pass risk).
- Load-flaky tests (ceo-slack-brain process-kill, shell-reachable) — test-hardening bucket.
- Event-time SQL pushdown in `getSignalWindow` once the ledger grows (113).

Sequencing: these are post-freeze-eligible cleanups; nothing here jumps ahead of the demo-critical path (real Granola meetings through capture before the Jul 18 freeze, wiki promotion).

## Out of scope (don't drift)

- No new extractors (Slack, eng-session, Linear, etc.) until a D6/D7 trigger fires with journal evidence.
- No cross-source or cross-meeting fusion inside station 2 — cross-meeting reconciliation belongs to the drift sweep (114), downstream over signals.
- No alias/semantic subject matching — misses are data for the alias decision, per 112/114 specs.
- Demo narration must not claim cross-source signal synthesis; signals are single-source (Granola), single-meeting, quote-anchored.

## Supersedes / relates

- Extends `2026-07-04-seam-v0-decision.md` (decisions 14–16, 20) with the formation-side contract.
- Consistent with `2026-07-03-loop-gap-analysis.md` station map.
- Wiki promotion of the shipped seam (signal-window page, storage note, drift-alert page) remains owed and is unaffected.

---

## Codex review (2026-07-04, read-only consult) — findings + dispositions

Independent review by codex strategist (read-only sandbox) of this lock-in against the code as-built. 9 findings: 1 blocker, 7 risks, 1 nit. Verified spot-checks by claude strategist before disposition.

**F4 (BLOCKER, station 1→2) — updated Granola notes never re-enter capture.** `granola-poller.ts` (~line 631) permanently skips any `note.id` already in `ingested_note_ids`, so station 2's fingerprint/re-extract path (real, tested) is unreachable for normal note updates. VERIFIED in code. Disposition: this is the deliberate append-once capture decision from item 104 (append-only, no upsert in V1) — not a regression, but this record must state it: **D2's re-extraction fires only on extractor_version bump or manual backfill today, not on note edits.** Demo implication: ingest real meetings only after Granola finishes processing them (the poller's first capture is final). Followup filed: decide re-ingest-on-updated_at (capture-side supersede chain per 104's dedupe_key design) before any workflow relies on re-extraction.

**F1/F6/F7 (RISK, one theme) — supersedes/currentness is producer-side only.** Manifests + supersedes are written correctly, but consumers must opt in: `getSignalWindow` excludes manifest atoms (113 fixup) and does no current-run resolution; the drift sweep consumes all window signals unfiltered; existing intake reads signal events directly with no manifest filter; only `search_memories` has a current-run filter. On manifest-append failure, retry creates duplicate signal atoms that are only safe for manifest-honoring readers (pinned by test). Disposition: **pin as contract — any station-3 (or drift) consumer of signals MUST resolve current runs via manifests, or 113 grows an opt-in current-run mode.** Followup filed; no code change now (demo runs are single-extraction in practice).

**F2 (RISK) — D1 wording.** Drift persists per-pair verdict/delivery state in its checkpoint for idempotency. Clarified: that is operational state, not fact atoms; D1's "never persisted as facts" means the atom ledger. Compatible with seam decision #1 as intended. No action.

**F8/F9 (RISK, 2→3 contract) — canonical_subject + getSignalWindow is necessary but not sufficient.** Pinned NOW for the future station-3 rewiring: the consumable unit is the **provenance tuple** — `{canonical_subject, signal_type, text, note_id, meeting_title, source_span, extractor_version, extraction_run_id, dedupe_key/parent_dedupe_key}` — plus current-run resolution (above). Known gaps to carry, not fix: signals do not carry `web_url`/attendees/date (intake re-joins raw notes for those — acceptable; raw stays in the house); summary-span quotes have no verbatim guarantee (only transcript spans are quote-enforced) — packet templates must prefer transcript-anchored quotes for anything user-facing. `signal_type` admission: intake forms packets from `action|decision` only; `rationale` attaches via `rationale_for`, never forms a packet alone; drift reads all three as statements. 

**F3 (NIT) — D3/D5/D6/D7 are governance, not code invariants.** Accepted as-is; that is what an operating-discipline lock-in is. The enforcement point is spec review (this record is the citable fence), not runtime.

