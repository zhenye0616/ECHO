# YC application demo sprint — scope, sequence, freeze date

**Date:** 2026-07-03
**Hard deadline:** YC application due **2026-07-24** (21 days).
**Builds on:** `2026-07-03-pitch-narrative-layered-story.md` (the story the demo must prove), `2026-07-03-fractal-context-layering.md`, the skeleton-architecture loop diagram (`echo_loop_across_domains_fable.png`, founder's desktop, 2026-07-03).

**Amended 2026-07-03 (later same day):** the three backlog specs this plan originally opened (112/113/114) were retracted the same day — no backlog items for this sprint. The work proceeds **component-by-component, founder-in-the-loop**, gap analysis first with `docs/architecture-map/` as source of truth, to maximize the founder's own understanding of the system. Item numbers below are replaced with capability names; scope and sequence are unchanged.

## The governing rule

The demo must run on the founder's **real captured data with zero hand-staging** — this was already the V1 definition of done and it is non-negotiable for the video. Every scene below is either shipped or lands via the normal pipeline; nothing is demo-only theater code.

## Demo definition — the 60-second arc (three scenes)

Maps to pitch beats 1–3; the layered future (beat 4) is *told*, not demoed.

1. **"Every AI meets you as a stranger"** (shipped): a fresh AI session can't answer "why are we building X?"; the ECHO-wired one answers with real cross-tool history. Cold-reader-validated capability.
2. **The gate — alignment without a meeting** (shipped: 107/108/109): real Granola meeting → intake seed in Slack → founder confirms → fail-closed Linear issue; then the counterpart asks *why* in Slack and gets the recorded rationale.
3. **The round trip — "where is X?"** (this sprint: status backflow): counterpart asks status in Slack; ECHO answers grounded in Linear state + eng capture, with provenance links, zero eng interruption.

Scenes 2+3 together are the demoable version of the loop: needs flow down, reality flows back. Station 6–8 (drift/learning/improve) stay pitch-narrative.

## Sprint sequence

**Week 1 (Jul 3–10) — build.** No backlog specs (see amendment): gap analysis against `docs/architecture-map/` first, then component-by-component build in this order:
1. **Intake hardening** (1–2d) — before real traffic, which the demo depends on.
2. **Status backflow** (2–3d) — scene 3. The critical-path component.
3. **Brain faithfulness A/B** (1–2d harness + grading) — gates which brain goes on camera.

**Week 2 (Jul 11–17) — real traffic + material.** Every real meeting through intake; seed and answer real status questions daily; run the faithfulness grading session and fix only demo-killing frictions. Journal everything (it doubles as demo-material selection). **Stretch only** (if status backflow is working and clean by Jul 14): drift-report v0 — `decision_id` linkage at Linear create + weekly "decisions with no reality attached" report. Cut without discussion if late.

**Week 3 (Jul 18–24) — freeze and ship.** Feature freeze **Jul 18**. Record the video on real data, multiple takes. Write the application from the pitch-narrative doc (beats → answers; honesty ledger governs claims). Submit **before** the 24th.

## Cut list (not in this sprint, no exceptions without a new decision)

Apollo/GTM capture, domain classifier/stamps (beyond the stretch report's needs), drift stations 6–8 as product, Windows port, packaging polish, layer-2/federation anything, audit page, hotkey overlay.

## Risks

1. **Confabulation on camera** — worst possible YC moment. Mitigation: the faithfulness A/B runs *before* recording; the status responder must say an explicit "couldn't find" rather than invent status.
2. **Real-traffic dependency** — scenes need real meetings and real questions in week 2. Founder schedules them; they are sprint work, not overhead.
3. **Second human** — scenes 2–3 are strongest with a real counterpart on the other side of Slack (not founder role-play). Recruit the concierge-install coworker or the n=2 counterpart for week 2–3.
4. **Build bandwidth** — three components in ~8 working days, founder-in-the-loop with no backlog pipeline, is tight. If late, the faithfulness A/B compresses to a spot-check; status backflow keeps priority (it is the scene-3 critical path).

## After Completion (Strategist Notes)

Post-submission: journal synthesis on what the demo sprint surfaced; status backflow ships → wiki/surfaces page for the responder backflow; drift-report stretch (if built) gets its own decision record before any deepening.
