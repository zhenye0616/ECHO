# YC application demo sprint — scope, sequence, freeze date

**Date:** 2026-07-03
**Hard deadline:** YC application due **2026-07-24** (21 days).
**Builds on:** `2026-07-03-pitch-narrative-layered-story.md` (the story the demo must prove), `2026-07-03-fractal-context-layering.md`, the skeleton-architecture loop diagram (`echo_loop_across_domains_fable.png`, founder's desktop, 2026-07-03).

## The governing rule

The demo must run on the founder's **real captured data with zero hand-staging** — this was already the V1 definition of done and it is non-negotiable for the video. Every scene below is either shipped or lands via the normal pipeline; nothing is demo-only theater code.

## Demo definition — the 60-second arc (three scenes)

Maps to pitch beats 1–3; the layered future (beat 4) is *told*, not demoed.

1. **"Every AI meets you as a stranger"** (shipped): a fresh AI session can't answer "why are we building X?"; the ECHO-wired one answers with real cross-tool history. Cold-reader-validated capability.
2. **The gate — alignment without a meeting** (shipped: 107/108/109): real Granola meeting → intake seed in Slack → founder confirms → fail-closed Linear issue; then the counterpart asks *why* in Slack and gets the recorded rationale.
3. **The round trip — "where is X?"** (this sprint: item 112): counterpart asks status in Slack; ECHO answers grounded in Linear state + eng capture, with provenance links, zero eng interruption.

Scenes 2+3 together are the demoable version of the loop: needs flow down, reality flows back. Station 6–8 (drift/learning/improve) stay pitch-narrative.

## Sprint sequence

**Week 1 (Jul 3–10) — build.** Spec-review queue opened today (r1) on all three; build order once ready:
1. **114 intake hardening** (1–2d) — before real traffic, which the demo depends on.
2. **112 status backflow** (2–3d) — scene 3. The critical-path item.
3. **113 brain faithfulness A/B** (1–2d harness + grading) — gates which brain goes on camera.

**Week 2 (Jul 11–17) — real traffic + material.** Every real meeting through intake; seed and answer real status questions daily; run the 113 grading session and fix only demo-killing frictions. Journal everything (it doubles as demo-material selection). **Stretch only** (if 112 is merged and clean by Jul 14): drift-report v0 — `decision_id` linkage at Linear create + weekly "decisions with no reality attached" report. Cut without discussion if late.

**Week 3 (Jul 18–24) — freeze and ship.** Feature freeze **Jul 18**. Record the video on real data, multiple takes. Write the application from the pitch-narrative doc (beats → answers; honesty ledger governs claims). Submit **before** the 24th.

## Cut list (not in this sprint, no exceptions without a new decision)

Apollo/GTM capture, domain classifier/stamps (beyond the stretch report's needs), drift stations 6–8 as product, Windows port, packaging polish, layer-2/federation anything, audit page, hotkey overlay.

## Risks

1. **Confabulation on camera** — worst possible YC moment. Mitigation: 113 runs *before* recording; 112's AC3 mandates explicit "couldn't find" over invented status.
2. **Real-traffic dependency** — scenes need real meetings and real questions in week 2. Founder schedules them; they are sprint work, not overhead.
3. **Second human** — scenes 2–3 are strongest with a real counterpart on the other side of Slack (not founder role-play). Recruit the concierge-install coworker or the n=2 counterpart for week 2–3.
4. **Pipeline latency** — three items through review→build→merge in ~8 working days is tight but consistent with 110/111 throughput. If the queue stalls, 114's scope can merge with founder review directly; 112 cannot skip review (team-facing).

## After Completion (Strategist Notes)

Post-submission: journal synthesis on what the demo sprint surfaced; 112 ships → wiki/surfaces page for the responder backflow per its item notes; drift-report stretch (if built) gets its own decision record before any deepening.
