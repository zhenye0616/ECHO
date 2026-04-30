---
topic: Architecture
subtopic: Layer Above SaaS
aliases:
  - Layer Above SaaS
---

# Layer Above SaaS

## Definition

ECHO occupies a structural position *above* existing SaaS apps — the connective tissue that composes intelligence across the user's tools without replacing any of them. SaaS-era abstraction was the app boundary. AI-era inversion happens above that boundary.

## The Three Inversions

The layer-above position is realized through three orthogonal inversions:

- **Data inversion** — data leaves the app and lives in a store the user owns. Apps become read/write sources, not destinations.
- **Intelligence inversion** — the reasoning layer leaves the app and lives above all apps, with read access across them.
- **Surface inversion** — the user-facing window leaves the app. One ambient layer over many.

## The User Mental Model That Sells It

> *Today you have 30 apps and one of you. Tomorrow you have one context layer and 30 read sources.*

## Why This Is the Right Position Now

Three forces converge in 2026:

1. **Foundation models are commoditizing** — capability is no longer the differentiator
2. **MCP and similar protocols are becoming standard** — the layer-above can plug in everywhere
3. **AI demand creates pull for cross-source synthesis** — users finally have a reason to want unified context

## The Adversarial Coordination Problem

SaaS vendors don't want to be invisible backends. Twitter killed third-party clients; Reddit killed third-party API access. The defense is **user-side ingestion** — read what the user is already viewing in their authenticated session, never crawl on their behalf. The user's session is theirs; the data has already been delivered to their device. (See [[ambient-form-factor]] for the architectural implementation.)

## What ECHO Refuses to Become

- ❌ A CRM (doesn't replace HubSpot)
- ❌ A project manager (doesn't replace Linear)
- ❌ An editor (doesn't replace Cursor)
- ❌ An AI client (doesn't replace Claude)

ECHO is the connective tissue — the "browser of browsers" / "OS of AI tools."

## Related

- [[compose-not-capture]]
- [[felt-not-seen]]
- [[context-as-moat]]
- [[ambient-form-factor]]
