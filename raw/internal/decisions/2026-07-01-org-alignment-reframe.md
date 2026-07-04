# The org-alignment reframe — one substrate, three scopes

**Date of decision:** 2026-07-01 (made inline in item 109's spec; recorded 2026-07-03 per 109's After Completion instruction)
**Confirmed:** 2026-07-03 — founder confirmed the reframe supersedes the prior V1 wedge wording and approved rewriting `docs/NORTH_STAR.md`; sprint direction set to "double down on team alignment."
**Extends:** `2026-06-06-office-hours-team-scope-context.md`, `2026-06-18-office-hours-ceo-loop-rationale-capture.md`, `2026-06-19-ceo-loop-reasoning-layer-and-decision-atoms.md`

## Decision

The goal is **reducing friction/time on org-level alignment** across five tools: **Granola** (meetings), **Slack** (communication), **Linear** (project management), and **Codex + Claude** (eng). ECHO lives **inside these tools** — no new destination surface.

- **v0 = the intake half** — shipped as items 103–110 (Slack responder + decision atoms, Granola capture → signal extraction → intake bridge, Slack→Linear intake gate, packaged-daemon boundary).
- **v0.1 = status backflow** — PM/CEO asks "where is X?"; answered from Linear state + eng capture. Proposed as item 112.
- **Meeting-leg posture:** auto-scan + confirm card — ambient detection, human-gated action. Nothing enters Linear without a person confirming in Slack.

## What this supersedes

The 2026-05-01 NORTH_STAR wedge ("indie AI builders; Cursor + Claude Code + GitHub + Slack + web extension; hotkey overlay") is no longer the operative cohort/bundle. Its drift-check #4 ("building for a cohort that isn't indie AI builders → STOP") contradicted the entire June wave; keeping it live would mark shipped, founder-directed work as drift.

The durable framing (2026-07-03 architecture-map audit): ECHO is **one substrate at three scopes** — the same append-only atom store and MCP surface serve

1. **machine scope** — passive capture (Claude Code, Codex, git, partial Cursor) → unified context for every AI client;
2. **fleet scope** — the coord substrate + skills protocol that lets multiple AI clients build as peers;
3. **team scope** — the org-alignment loop above.

The brand promise is unchanged. What changed is which scope is being validated next.

## Alternatives considered (2026-07-03 sprint fork)

- **Harden machine-scope beta** (close the ~33% 🟡/❌ June retrieval-verdict rate, support the live 2×/day outreach funnel, 1 onboarded tester). Rejected for now: momentum and founder pull are on the team loop; the substrate work serves both scopes regardless.
- **Split sprint** — rejected: focus cost at solo-founder scale.
- **Consolidation sprint** (map slimming, dead-code removal) — folded into hygiene items rather than taking the sprint.

**Accepted risk, on the record:** the machine-scope beta funnel stays undersupported while team-scope validation is at n=2. Revisit trigger: if the team loop shows no weekly live-usage evidence in the dogfooding journal, the fork gets re-decided.
