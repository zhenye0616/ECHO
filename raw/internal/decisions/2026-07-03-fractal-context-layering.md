# Fractal context layering — front-door fork resolved, node/hub recursion thesis

**Date:** 2026-07-03
**Status:** strategy direction (no build item; validation gates unchanged)
**Context:** Follows the 2026-07-02 "node and hub, one pipe" discussion (session fe4080d8, turn 10), which left one fork open: which end of the pipe is the front door of the one-product story.

## Decision

1. **Front door = personal context layer that grows into team alignment.** The founder chose the bottom-up narrative: individual employee context is the entry point; org-level alignment is what it grows into. (The alternative — "team alignment tool whose agents happen to run on-device" — is rejected as the lead story.)

2. **The node/hub shape recurses — fractal layering.** The same primitive composes at every organizational boundary:
   - Individual employee = node (machine-scoped raw context, stays local).
   - Small org / team = hub for its members, **and simultaneously a node relative to the department** — the team's context store is atomic from the level above.
   - Department = hub of team-hubs, node relative to the company; and so on.

   The primitive at every level is the same triple: **atomic context store + propose-confirm promotion gate + natural-home rule** (context lives at the level where it is produced and visible). No level-specific features; scale = composition of the primitive. The B2 federated bet extends unchanged: no shared store at any level, every boundary consent-gated.

## What must be true for the recursion to hold (open problems, not build items)

1. **Confirmer identity at each boundary.** Individual→team promotion is confirmed by the individual (privacy gate — clean). Team→department promotion needs a *governance* answer: who has authority to promote team context upward (lead? consensus?). The mechanism recurses; the human authority model does not recurse automatically. Unsolved; do not design until a real second layer exists.

2. **Promotion = compression at altitude, not copying.** Department-level context is a re-summarization of team decisions at higher altitude, not the union of team stores. The 107 gate already performs this altitude-shift implicitly for individual→team (decision-grade distillation). The recursive claim requires the altitude-shift to be part of the primitive.

## Gates (unchanged)

- Validated layer count today: **one** (individual→team, at n=2, one direction; backflow v0.1 not yet built).
- Node demand n=1 (founder); hub is the June conviction bet.
- This framing drives **naming, packaging, pitch narrative** — not architecture. Layer 2 (team→department) is untouchable until a second team exists and the existing signals fire (109 intake loop working; CEO self-serves a why-query unprompted >once).

## After Completion (Strategist Notes)

Not applicable — no shipping milestone. If/when a second team validates layer 2, this doc seeds a wiki/product page on the layering model.
