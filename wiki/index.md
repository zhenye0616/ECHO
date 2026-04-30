# ECHO Wiki — Index

Auto-generated from `.manifest.json`. Do not edit by hand.

**Totals:** 28 entries · 8 concepts · 8 entities · 8 sources · 4 analyses

---

## Concepts — Design Patterns & Architectural Commitments

### Architecture

- [[compose-not-capture|Compose, Don't Capture]] — ECHO ingests from tools that already capture; never builds its own capture surface for what others provide
- [[layer-above-saas|Layer Above SaaS]] — ECHO is additive to existing tools, never a replacement. The connective tissue between apps.
- [[sandboxed-capture|Sandboxed Capture]] — ECHO observes only what's on the allowlist. Enforced as code via the gate, not as policy.

### Form Factor

- [[felt-not-seen|Felt, Not Seen]] — Ambient by default; visible on demand for trust. Product appears in the result, not the interface.
- [[ambient-form-factor|Ambient Form Factor]] — Browser extension + MCP server + hotkey overlay. No destination app. Three thin presences.
- [[clipboard-and-launch|Clipboard and Launch]] — Universal delivery mechanism: assemble context, copy to clipboard, open target app, user pastes.

### Brand & Positioning

- [[context-as-moat|Context as Moat]] — Compete on context, not capability. Adjacent to foundation models, structurally outside their wars.

### V1 Scope

- [[drift-prevention|Drift Prevention]] — The discipline of not silently diverging V1 build from V1 spec. Five drift patterns + weekly audit.

---

## Entities — Components, Surfaces, Cohorts

### Form Factor

- [[browser-extension|Browser Extension]] — Already shipped. Captures web AI surfaces and web SaaS. Freemium. Funnel + thesis validator for V1.
- [[mcp-server|MCP Server]] — Exposes ECHO context to AI clients (Cursor, Claude Code, Claude Desktop) via Model Context Protocol.
- [[hotkey-overlay|Hotkey Overlay]] — System-wide summon. The Wispr Flow analog. Composer appears anywhere, returns context, disappears.

### Architecture

- [[local-daemon|Local Daemon]] — The substrate process that owns local storage, ingestion, and retrieval. Wedge-independent foundation.
- [[audit-page|Audit Page]] — Minimal Layer 5 surface. See memories, manage permissions, forget. Settings menu, not destination.
- [[capture-gate|Capture Gate]] — Pure-function chokepoint every captured event must pass through. Routes by source kind to allowlist predicates.
- [[storage|Storage]] — Append-only Storage interface + MemoryStorage impl. SQLite drops in behind the same contract later.

### Cohorts

- [[target-cohort-indie-ai-builders|Target Cohort: Indie AI Builders]] — V1 wedge: solo devs and small-team founders shipping AI tools. Strong founder-market-fit + warm distribution.

---

## Sources — Decisions & Spec Docs

### V1 Scope

- [[v1-spec|V1 Spec (Locked)]] — Final V1 scope: cohort, bundle, form factor, pricing, sequencing, non-goals, definition of done
- [[bundle-decision|Bundle Decision]] — V1 bundle: Cursor + Claude Code + GitHub + Slack + web AI extension. Why these 5; why not Zoom/email.

### Brand & Positioning

- [[brand-promise|Brand Promise]] — We don't make AI smarter. We make every AI smarter about you. Plus alternative formulations tested.

### Form Factor

- [[form-factor-decision|Form Factor Decision]] — Why no destination app. Browser extension + MCP server + hotkey overlay as the three thin presences.

### Architecture

- [[interface-layers|Interface Layers (1-5)]] — Five layers of user-ECHO communication. V1 ships L1, L3, minimal L5. L2 and L4 deferred.
- [[capture-allowlist|Capture Allowlist]] — CAPTURED_SOURCES — single canonical declaration of what ECHO is allowed to observe. Ships empty by design.

### Validation

- [[extension-funnel-logic|Extension Funnel Logic]] — Extension and V1 are family, not pipeline. Gravitational conversion via shared thesis, not push-marketing.
- [[validation-experiments|Validation Experiments]] — Three experiments running parallel to substrate build: user interviews, landing page, concierge.

---

## Analyses — Cross-Cutting Synthesis

### Validation

- [[wedge-vs-thesis-validation|Wedge vs Thesis Validation]] — Extension validates thesis (people pay for unified context). V1 must separately validate the dev wedge.

### Cohorts

- [[three-cohort-comparison|Three-Cohort Comparison]] — Indie AI builders vs vibe coders vs solo SaaS founders. Why indie AI builders win the V1 wedge.

### V1 Scope

- [[tier-vs-vertical-slice|Tier-by-Tier vs Vertical Slice]] — Why building tier-by-tier (universal categories first) is wrong. Ship vertical slice across tiers instead.
- [[narrowest-v1-scope|Narrowest V1 Scope]] — L1 (passive ingestion) + L3 (summoned, Q&A + assembly) + minimal L5. Cut L2 and L4.
