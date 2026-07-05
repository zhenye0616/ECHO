# Terminal-first demo surface for stations 1–3 (2026-07-05)

**Context.** Full-loop map-vs-territory audit (2026-07-05, artifact `e3b205d8`) found: stations 1–2 production-live; station 3 code-complete but Slack-fused and never run live; Fly responder host dead (trial expired); every Slack path gated on channel/safety decisions (sensitive negotiation content in backfill) plus tokens, owner map (daemon-crash foot-gun), and a local responder rail that doesn't exist.

**Founder decision.** This sprint optimizes the under-the-hood mechanism, not the surface. The decision-packet card does NOT need Slack for now — a terminal card is enough. Demo target for the sprint: stations 1–3 live and demo-ready, terminal-rendered, plus observability over the same stations so the mechanism is visible and diagnosable.

**Why this is cheap in the current code.** The Slack POST is already an injectable seam: `runGranolaIntakeBridgeOnce` / `startGranolaIntakeBridge` accept a `postSeed: SeedPoster` override (`src/enrich/granola-intake-candidates.ts:87,658`). A terminal card = injecting a stdout renderer; the mechanism (signal join, attendee filter, brain classifier, candidate keys, per-note cap, durable seed state machine) runs unmodified. The same pattern applies later to drift (`DriftAlertPoster`, `src/enrich/decision-drift.ts:154`).

**What this defers (unchanged, not cancelled):** Slack channel/safety call, local responder rail, Linear confirm path, drift enablement. All still required for the full loop; none blocks the sprint goal.

**Actioned as:** `backlog/proposed/2026-07-05-116-terminal-intake-card.md` and `backlog/proposed/2026-07-05-117-loop-observability-stations-1-3.md`. Reuse-first constraint from founder: do not write new code where existing code can be reused (doctor framework, checkpoints, structured logs, storage queries, existing tool precedents).

**Non-spec ops owed (founder/strategist, not builder items):** rebuild `dist` or supervise the shell daemon (stale-dist/launchd hazard, audit B6); reconcile `ECHO_GRANOLA_SIGNAL_BRAIN` between launchd plist (claude) and live shell env (codex).
