---
topic: Form Factor
subtopic: Browser Extension
aliases:
  - Browser Extension
  - Chrome Extension
---

# Browser Extension

## Status

**Already shipped.** Currently under Chrome Web Store review (as of 2026-04-30). Freemium pricing model.

## What It Does

Captures conversation context across web AI surfaces (Claude.ai, ChatGPT, Gemini) and lets the user import past conversation context into a current chat or export current context to a new chat — chat-to-chat context portability.

## Role in V1

The browser extension serves three distinct roles:

1. **Layer 1 ingestion surface for V1** — the existing extension feeds web AI session context into ECHO's unified store.
2. **Thesis validator** — proves users will pay for cross-platform context (freemium = direct willingness-to-pay signal).
3. **V1 funnel (gravitational, not push)** — paid extension users who are also devs become V1's warmest alpha pool.

See [[extension-funnel-logic]] for the family-not-pipeline framing.

## What It Validates and Doesn't

**Validated by extension:**
- Demand for cross-platform AI session context portability
- Willingness to pay for the thesis (freemium tier)

**Not validated by extension:**
- Dev-cohort-specific willingness to pay
- $25/mo price point for the deeper bundle
- The 5-tool work-wide unification proposition

The wedge-level question is V1's job. See [[wedge-vs-thesis-validation]].

## Onboarding (Designed)

After first successful action: skippable one-question prompt — *"What do you mostly use AI for? Coding / Writing / Research"* — captures cohort tag without identity-framing friction.

In settings/about page: ambient *"Coming soon: ECHO for builders"* panel with V1 tool logos + waitlist signup. Inviting, not pushy.

## Hand-Off to V1

- Email list: paid extension users who tagged as dev cohort = V1 alpha pool (~50–200 users by V1 launch target)
- Pricing anchor: V1's $25/mo positioned relative to extension's existing paid tier
- Brand continuity: extension's brand carries the master *"compound on context, not capability"* obsession; V1's marketing layers dev-specific framing on top

## Related

- [[extension-funnel-logic]]
- [[validation-experiments]]
- [[target-cohort-indie-ai-builders]]
- [[ambient-form-factor]]
