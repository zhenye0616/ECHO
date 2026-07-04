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
