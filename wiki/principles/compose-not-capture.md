---
status: shipped
topic: Architecture
subtopic: Compose Not Capture
aliases:
  - Compose Not Capture
  - Compose Don't Capture
---

# Compose, Don't Capture

## Definition

ECHO never replicates capture features that integrated tools already provide. The product's job is to *compose* context across tools that produce data, not to produce that data itself. This is the deepest expression of the layer-above-SaaS positioning — the moment ECHO starts building features that overlap with the tools below it (own recording UI, own note-taking UI, own ticketing UI), it stops being the layer above and becomes another competitor at the same level.

## How It Applies

- **ECHO doesn't write code** → Cursor does, ECHO ingests
- **ECHO doesn't manage tickets** → Linear / GitHub do, ECHO ingests
- **ECHO doesn't send messages** → Slack does, ECHO ingests
- **ECHO doesn't record meetings** → Notion AI / Granola / Otter do, ECHO ingests
- **ECHO doesn't write docs** → Notion / Google Docs do, ECHO ingests

## The Two Narrow Exceptions

There are two cases where ECHO must capture rather than compose:

1. **The meta-context layer** — clipboard, active window, hotkey gestures. No existing tool captures these for ECHO's purposes; this is the OS-level layer that's genuinely unique to the product.
2. **The decision/synthesis layer** — when ECHO composes context across sources, the synthesis itself is the IP. No external tool produces "the through-line across these 5 conversations."

Everything else: compose, don't capture.

## Product-Decision Test

When evaluating any future feature, ask: *"Does this require us to build a capture surface, or can we ingest from a tool the user already uses?"*

- If the answer is "we'd need to build the capture," it's almost always wrong for ECHO.
- If the answer is "we can ingest from X, Y, or Z which the cohort already uses," it's the right shape.

## Strategic Significance

The Plaid pattern: Plaid doesn't make you a bank account; it sits between the banks you already use and the apps that need to read from them. ECHO is Plaid for the user's productive intelligence — never replaces tools, only composes across them.

## Scope clarification — inputs, not outputs (item 064)

`compose-not-capture` governs ECHO's relationship to the tools it ingests FROM — what the substrate captures, and what the substrate does NOT build replacements for. It does **not** bar ECHO from projecting or transforming its OWN outputs for consumer surfaces. Composition means ECHO normalises cross-tool context, not that consumers must stare at every capture artifact ECHO's substrate happens to carry.

The codex strategist consult on 2026-05-20 (logged in the dogfooding journal, captured as the reasoning trail for item [[2026-05-20-064-mcp-compact-view-projection|064]]) made this distinction load-bearing: the principle defends against ECHO growing a Cursor-replacement editor or a Linear-replacement ticket UI; it does NOT defend raw MCP output where bubble UUIDs, byte offsets, and sandbox config blocks leak through to a Raycast-rendered hotkey overlay. The [[mcp-compact-view-projection|MCP compact view projection]] is the worked example: a daemon-side field-hygiene projection that lets every consumer (Raycast today, V1 browser extension and future overlay surfaces tomorrow) inherit the same compact shape without per-consumer filtering. The substrate composes its inputs; it is allowed to project its outputs.

If a future feature looks like a capture-replacement, this principle applies. If a future feature looks like a consumer-side projection of substrate-owned data, this principle does not bar it — the test is whether the work expands what ECHO captures, not whether it transforms what ECHO already has.

## Related

- [[layer-above-saas]]
- [[felt-not-seen]]
- [[ambient-form-factor]]
- [[mcp-compact-view-projection]] — the worked example of substrate-output projection
