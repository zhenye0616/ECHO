---
status: shipped
topic: V1 Scope
subtopic: Sequencing
aliases:
  - Tier vs Vertical Slice
---

# Tier-by-Tier vs Vertical Slice

## The Question

We mapped tools into tiers (Tier 1 = universal categories like communication, AI assistants, notes; Tier 2 = production tool; Tier 3 = common-but-not-universal; Tier 4 = role-specific). Should V1 build Tier 1 first, then expand outward?

## Short Answer

No. Tier-by-tier sequencing is wrong. Build a vertical slice across tiers instead.

## Why "Tier 1 First" Looks Right but Isn't

Tier 1 is *universal coverage*, not *highest ROI*. Conflating those is one of the classic builder traps. Three problems with going horizontally through Tier 1 first:

### 1. Tier 1 isn't where the magic is

"Your AI knows your email and calendar" is exactly what Claude Desktop, ChatGPT, Gemini already connect to. Building the same connectors gets you to *parity*, not differentiation. The composition demo's punchline isn't "AI knows your email" — it's "AI knows the code you're writing right now + the Linear ticket + the prior Claude conversation about it." The *production tool* (Tier 2) is the anchor of the demo. Without it, you're another integration aggregator.

### 2. Some Tier 1 categories are low-signal-high-noise

Email is the worst offender — most of it is newsletters, automated notifications, calendar invites, and one-line replies. Ingesting all gives you a giant pile of low-signal text that's also privacy-loaded. Calendar is medium signal. The high-signal Tier 1 categories are AI assistants and the browser extension itself — and both are already covered by the existing extension.

### 3. The user only feels the magic when the *whole demo* works end-to-end

Building all of Tier 1 with no Tier 2 integration is like wiring an entire house but leaving the lights off. The user can't tell what they bought.

## The Right Axis: Vertical Slice Across Tiers

Ship the smallest end-to-end pipeline that demonstrates the magic in one cohort's daily workflow. That requires touching multiple tiers, narrowly:

| Component | Tier | Role |
|---|---|---|
| Form-factor infrastructure (hotkey + extension + MCP skeleton) | Meta | Non-negotiable, day one |
| Cursor (production tool) | Tier 2 | Demo anchor |
| Claude Code (production AI) | Tier 1 | Magic manifests |
| GitHub (code/tickets) | Tier 1 + Tier 3 | High-signal context source |
| Slack (team comms) | Tier 1 | Per-issue context source |
| Web AI extension | Tier 1 | Already built |

5 things across 3 tiers. End-to-end. Shippable in 6–10 weeks for one founder. Demonstrably magical for the indie AI builder cohort.

## What This Sequencing Forecloses (Correctly)

By choosing vertical slice over horizontal sweep, V1 explicitly skips:

- Email connector (high engineering, low marginal demo lift)
- Calendar connector (medium engineering, medium marginal demo lift)
- Drive / file storage connector (broad but unfocused)
- Notion connector (deferred to V1.5 — see [[bundle-decision]])

These don't get built until V1.5 or V2. They aren't on the V1 critical path.

## Expansion After V1 Ships

Each new integration should answer one of two questions:

1. *Does this make the existing cohort's demo deeper?* (e.g., add Slack context to a Linear-only demo → richer context for same cohort)
2. *Does this open a new cohort's bundle with shared infrastructure?* (e.g., add Figma → Designer bundle becomes shippable; same hotkey, MCP, notes integration, just different production-tool slot)

Both are valuable. Neither is tier-by-tier. The question to ask before each integration is *"who gets a noticeably better demo because of this?"* — not *"is this in the universal tier?"*

## The Wispr Flow / Cursor Precedents

Both shipped vertical slices first, expanded contexts later:

- **Wispr Flow** shipped voice→text injection in *one* OS context with one model and one trigger. Then expanded contexts. Did not first build "universal text input layer."
- **Cursor** shipped AI-completion for TypeScript first. Then expanded languages. Did not first build "general code understanding for all languages."

ECHO follows the same pattern: ship the indie-AI-builder bundle (vertical slice across tiers), expand to other cohorts (parallel bundles sharing the same architecture).

## The Trap to Avoid

The "ship Tier 1 first then expand" plan sounds disciplined and methodical, but it's actually the perfectionism trap dressed up as planning. It means 3 months of building integrations no demo needs, before showing anyone the actual product. By month 3 you'd have shipped Gmail + Calendar + Drive + Notion connectors and still have no shippable demo because Cursor isn't connected. Six weeks later, you ship Cursor — and *then* you discover the demo doesn't quite work because you skipped Slack. Two more weeks. Now you're 5 months in with no users.

## Related

- [[bundle-decision]]
- [[narrowest-v1-scope]]
- [[v1-spec]]
- [[interface-layers]]
