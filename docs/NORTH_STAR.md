# NORTH_STAR

**Read this every morning before opening any code.** ~60 seconds.

*Rewritten 2026-07-03; supersedes the 2026-05-01 version (in git history). Reframe decision: `raw/internal/decisions/2026-07-01-org-alignment-reframe.md`.*

---

## The Brand Promise (unchanged, the obsession)

> *We don't make AI smarter. We make every AI smarter about you.*

## What ECHO Is — one substrate, three scopes

One append-only atom store + one MCP surface (`docs/architecture-map/index.md` is the source of truth), serving context at three scopes:

1. **Machine (you)** — passive capture of Claude Code, Codex, git, partial Cursor → unified context back to every AI client. Shipped: `echoctl` v0.1.0-beta.1; beta funnel live on maintenance.
2. **Fleet (your agents)** — the coord substrate + `skills/` protocol that lets multiple AI clients build as peers over shared state. Shipped; dogfooded daily building ECHO itself.
3. **Team (your org)** — the alignment loop across **Granola** (meetings), **Slack** (communication), **Linear** (project management), **Codex + Claude** (eng). v0 intake shipped (items 103–110). **← current sprint.**

## Current Sprint Focus (set 2026-07-03)

Team scope, v0.1: status backflow (Linear read + status Q&A in the responder), brain faithfulness A/B (Codex vs Claude), intake-bridge hardening for real traffic. Machine-scope beta stays on maintenance.

## Drift Check — Ask Before Any Decision Today

1. **Am I building a destination?** (a window the user "goes to," a dashboard, a new UI) → STOP. ECHO lives inside the tools.
2. **Am I capturing what another tool already captures?** (recording meetings, writing notes, managing tickets) → STOP. Compose, don't capture.
3. **Am I letting ECHO act without a human confirm?** (auto-create in Linear, auto-post, auto-anything org-visible) → STOP. Human-gated action is load-bearing.
4. **Am I putting an LLM inside the substrate?** → STOP. ECHO stays deterministic; the brain lives in the consumer.
5. **Am I adding a sixth tool to the team-scope set before v0.1 validates?** → STOP. Granola, Slack, Linear, Codex, Claude — locked.

## Standing Tension (re-read weekly)

The machine-scope beta funnel (outreach 2×/day, one onboarded tester, ~33% June retrieval verdicts not-clean) is *deliberately* undersupported while the team loop validates at n=2. Revisit trigger: no weekly live-usage evidence of the team loop in the dogfooding journal → re-decide the sprint fork.

## Definition of Done for This Phase

The team loop runs on real traffic with weekly journal evidence: meeting-sourced issues confirmed in Slack, status questions answered from Linear state + eng capture, founder not retyping anything between tools.
