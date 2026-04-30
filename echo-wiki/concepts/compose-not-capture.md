---
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

## Related

- [[layer-above-saas]]
- [[felt-not-seen]]
- [[ambient-form-factor]]
