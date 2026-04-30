---
topic: V1 Scope
subtopic: Bundle Decision
aliases:
  - Narrowest V1 Scope
---

# Narrowest V1 Scope

## Question

What's the irreducible core of V1, and which interface layers need to focus on?

## Answer

Three layers. Cut the other two.

| Layer | Status | Why |
|---|---|---|
| L1 — Passive ingestion | **Keep** | Substrate; non-negotiable. Without continuous ingestion, no context to compose. |
| L2 — Ambient surfacing | **Cut → V2** | Hardest layer to calibrate; wrong calibration is worse than absent feature |
| L3 — Summoned response | **Keep** | The magic moment trigger. Hotkey + MCP injection IS the demo. |
| L4 — Conversational | **Cut → V2** | Implies destination UI; contradicts felt-not-seen commitment |
| L5 — Reflective / audit | **Keep, minimal** | Trust-critical. Memory product without inspector is uninstallable. |

See [[interface-layers]] for full layer detail.

## Why Layer 1 Must Exist

Without continuous, passive ingestion of GitHub + Slack + AI conversations + MCP context, there's nothing to compose at the moment of summon. The user does nothing for this layer; it runs in the background. Concretely in V1: browser extension capturing web AI sessions + MCP server recording desktop AI context + GitHub/Slack adapters pulling in their data. All silent, all the time. If this layer is broken, every other layer is meaningless.

## Why Layer 3 Must Exist

The hotkey + MCP-context-injection *is* the user's first "wow" experience. Concretely: ⌘⇧E summons composer; Cursor pulls unified context via MCP tool calls; result returns inline; nothing persists on screen. If this layer doesn't exist, there's no product. The killer demo is entirely a Layer 3 interaction sitting on top of Layer 1's ingested data.

Layer 3 includes both **Q&A** (user asks, ECHO answers in text) and **Assembly** (user requests, ECHO produces a portable artifact via [[clipboard-and-launch]]). Both are summoned-response patterns; both sit at the safe end of Karpathy's autonomy slider (user reviews before any external system is affected).

## Why Layer 5 Must Exist (Even Though Felt-Not-Seen Is Goal)

A memory product without an inspector is uninstallable. The audit page is the *fuse box* — exists for control, almost never used in daily flow. Without it:

- Users can't verify what ECHO knows about them
- Users can't correct mistaken or sensitive memories
- Users can't manage who has access (which connectors are pulling from where)
- Trust collapses

But the page can be ugly and minimal. ~3 days of engineering. See [[audit-page]].

## Why Cut Layer 2

Ambient surfacing is the hardest layer in the entire stack to get right. The calibration problem — *when does ECHO interrupt vs. stay silent* — requires real user behavior data to tune. Wrong calibration is *worse than not having the feature*: a tool that surfaces irrelevant context at the wrong moment is more annoying than a tool that says nothing.

Devs especially have zero tolerance for noisy tools. Heller's 97% rule applies brutally here — ambient surfacing at 70% accuracy is actively hostile to the user. Build it once you have post-launch behavior data showing what users actually want surfaced. V2.

## Why Cut Layer 4

The "second mind" / *"what am I avoiding this week"* demos are genuinely magical, but it's not what V1 sells on. V1 sells on *"AI knows my whole work context across tools"* — entirely Layer 3.

Sustained conversation also implies a UI for the dialogue (chat thread, conversation history, multi-turn state) — which starts to look like a destination app, contradicting the felt-not-seen commitment. Defer to V2 once Layer 3 is bulletproof and you understand what kinds of deep queries users actually ask.

## The Single Test for Whether Cutting Is Correct

If a user could in principle do everything ECHO offers them in V1 with **only the hotkey**, **the MCP-injected context in their AI tools**, and **the audit page they visit twice**, the cut is right.

If they would need to "open ECHO and look at it" for any reason other than auditing memory, the cut has drifted.

## Build Implication

The 10-week sequencing maps exactly to the three-layer V1:

- **Weeks 1–3** = Layer 1 substrate (storage + ingestion framework)
- **Weeks 4–9** = Layer 3 capability (MCP + integrations + hotkey + browser extension upgrade)
- **~3 days within weeks 9–10** = Layer 5 audit page (minimal, ugly, functional)

Layers 2 and 4 are *not represented at all* in V1. Don't build. Don't sketch. Don't show in marketing. They don't exist until V2. This isn't a hidden feature kept quiet — it's actually not in the product.

## Related

- [[interface-layers]]
- [[v1-spec]]
- [[bundle-decision]]
- [[clipboard-and-launch]]
- [[audit-page]]
- [[felt-not-seen]]
