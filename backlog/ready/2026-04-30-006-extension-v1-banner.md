---
id: 2026-04-30-006-extension-v1-banner
title: Extension V1 awareness banner
status: ready
priority: MED
estimate: 0.5d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/browser-extension.md
  - echo-wiki/sources/extension-funnel-logic.md
acceptance:
  - Ambient banner in extension UI (settings/about page) describing V1 vision
  - Tool logos shown (Cursor, Claude Code, GitHub, Slack)
  - Single CTA: "Join the waitlist" → links to landing page
  - Banner is dismissable per-user
  - Click-through tracked for funnel analysis
files_to_modify:
  - extension/src/components/V1Banner.tsx
  - extension/src/pages/about.tsx
agent_notes: ""
review_notes: ""
---

# Extension V1 Awareness Banner

## What

A small, ambient panel inside the extension that describes the upcoming V1 product and links to the waitlist. Inviting, never pushy.

## Why

Per [[extension-funnel-logic]], the extension and V1 are family, not pipeline. The banner is the "discoverable but not pushy" surface that lets dev-cohort extension users self-identify as V1 candidates without compromising the extension's standalone value.

## Acceptance Criteria

- [ ] Banner appears in extension settings/about page (NOT on every action — that's pushy)
- [ ] Copy:
  - Header: *"Coming soon: ECHO for builders"*
  - Body: *"Your AI knows your code, tickets, and chats — not just chats. Built for indie AI builders."*
  - Tool row: Cursor, Claude Code, GitHub, Slack logos (with "and more" tag)
- [ ] Single CTA: *"Join the waitlist"* → opens landing page in new tab
- [ ] User can dismiss permanently (sets a flag; doesn't show again)
- [ ] Click-through tracked (banner-shown, banner-clicked, banner-dismissed)
- [ ] Sub-banner conversion rate visible in analytics

## Constraints

- Ambient placement only — never modal, never popup, never on every page view
- Inviting tone, never pushy or upsell-aggressive (per [[extension-funnel-logic]])
- Master brand consistent with [[brand-promise]]

## Out of Scope (Don't Drift)

- ❌ Modal popups (banned)
- ❌ Showing on every action (banned — would damage extension's standalone value)
- ❌ Direct purchase flow inside extension (waitlist link only; payment is on landing page)
- ❌ Personalized banners by cohort (V1.5)

## Definition of Done

Founder can open extension settings, see banner, click CTA → lands on /waitlist with referrer tagged. Dismissal flag persists across browser restarts.
