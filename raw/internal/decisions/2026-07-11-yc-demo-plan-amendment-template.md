# YC demo-plan amendment — scenes 2–3 post-Justinian (founder decision template)

**Date:** 2026-07-11 · **Status:** template awaiting founder decision · **Amends:** `2026-07-03-yc-demo-sprint-plan.md` · **Interacts with:** register row X1 (YC application vs halt collision), G3 freeze (Jul 18)

The 07-03 demo plan's scenes 2 ("the gate") and 3 ("the round trip") were designed around Slack + Linear traffic in a workspace regime that the 07-09 customer switch retired (Justinian cancelled and VOID; the current commercial target uses Zoom + self-hosted Mattermost). The plan was never revisited after the pivot. Scene 1 (meeting→brief on real founder meetings) remains the only scene that is halt-compatible, shipped, and true to the current product. This template records the founder's call on scenes 2–3 before the Jul 18 freeze locks what the demo box contains.

**Constraint frame (fixed, not chosen):** the clarity halt blocks new product code until G2 — a Mattermost adapter cannot be built for the demo; the demo must run on real captured data with zero hand-staging (07-03 rule, unchanged); the freeze manifest (G3) pins whatever is chosen by Jul 18; per the 2026-07-11 commercial focus, a demo never advances maturity (a green demo is not FOUNDER LIVE evidence).

## Decision

> **Founder chooses ONE per scene (or one option covering both). Record choice, date, SHA.**
>
> Scenes 2–3: `[ ] OPTION A — replay in test workspace`  `[ ] OPTION B — cut scenes 2–3`  `[ ] OPTION C — defer decision to the X1 submit/defer call`
>
> Decided by: ______  Date: ______  SHA: ______

## Option A — Replay shipped capability in a test Slack workspace

Demo scenes 2–3 using the already-shipped 107/108/109 (+124-131) surfaces against a **test workspace** with the founder's own real meeting traffic. No new product code (halt-compatible); uses the Stage-A isolation shape from the (now-superseded) two-stage Slack plan.
- **Requires:** test workspace + token configured before Jul 18; responder hand-run during recording; honest voiceover that the counterpart-side is a test workspace, not the retired customer regime.
- **Risks:** "real data, zero hand-staging" is honored for meeting traffic but the *counterpart* is staged — the video must not imply an active customer; scene 3's status backflow was validated only against Justinian-era Linear state (per-stage qualifiers, 2026-07-09 model doc).

## Option B — Cut scenes 2–3; demo = scene 1 + meeting→brief depth

The 60-second arc becomes: real meeting → signals → human confirm → brief (the actual first wedge). Deepest honesty; zero staging; zero halt tension; matches the Team-product commercial story exactly.
- **Requires:** nothing new; freeze manifest shrinks.
- **Risks:** loses the "needs flow down, reality flows back" loop visual; the pitch narrative carries stations 4–5 as roadmap instead of demo.

## Option C — Fold into the X1 submit/defer decision

If the YC application itself is deferred (X1), the scenes question dissolves; if submitted, choose A or B at that moment.
- **Risks:** compresses the decision against the Jul 18 freeze; the freeze manifest must still assume one of A/B by Jul 18.

## Companion action (either option, done in the same pass)

`2026-07-07-slack-enablement-two-stage-plan.md` is bannered superseded/deferred: its Stage-B ("the REAL workspace — the CEO must be the reader") targets the retired Justinian regime; its Stage-A isolation shape survives as prior art for Option A. Slack enablement for a real client returns only through post-G2 scope if the Team product requires it.
