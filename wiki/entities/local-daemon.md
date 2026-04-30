---
topic: Architecture
subtopic: Storage
aliases:
  - Local Daemon
  - ECHO Daemon
---

# Local Daemon

## Definition

The substrate process that owns local storage, ingestion, indexing, retrieval, and composition. The wedge-independent foundation — the part of V1 that's safe to start building immediately because it serves any future cohort or integration choice.

## What Lives in the Daemon

Layer 1 (collection) and the silent middle:

- **Local storage** — append-only ledger (per [[/Users/zhenye/Desktop/AIE/claude-wiki/concepts/append-only-ledger.md|the AIE wiki pattern]])
- **Ingestion adapters** — connector framework for browser extension feeds, MCP server context, future API adapters (GitHub, Slack, etc.)
- **Indexing** — semantic embeddings for retrieval; structured indexes for source attribution
- **Retrieval engine** — picks the right N fragments from a large corpus
- **Composition engine** — synthesizes retrieved fragments into useful context bundles

## What Doesn't Live in the Daemon

- Layer 3 delivery (hotkey overlay is its own process)
- Layer 5 audit (served as a local web page from the daemon, but UI is separate)
- Specific connector logic (lives in adapters, not in the daemon core)

## Why Local-First

Three reasons compound:

1. **Privacy-by-architecture.** No server collects user data. Trust is structural, not promised.
2. **User-side ingestion legality.** Once data is on the user's device through their authenticated session, the SaaS vendor's technical control ends. Reading what's on the user's screen is what every successful "above-the-app" tool does (Grammarly, 1Password, Honey, Rewind, ad-blockers). See [[layer-above-saas]] for the legal framing.
3. **MCP composability.** A local daemon can serve MCP requests to whatever AI client the user runs locally without round-trip latency.

## Build Sequence (V1 Weeks 1–3)

The daemon is **wedge-independent** — no risk of needing to rebuild based on validation signal. Start it on day one:

- **Week 1:** Storage architecture (append-only ledger, indexing schema, retrieval primitives)
- **Week 2:** Ingestion framework (adapter interface, browser-extension feed-in, MCP adapter shape)
- **Week 3:** Composition engine (retrieval-to-context-bundle pipeline)

By end of week 3 you can run end-to-end tests with stub adapters. Real adapters wire in starting week 4.

## The Critical Engineering Bet

**Where ECHO's IP lives is the silent middle** — what gets retrieved and how it's composed at the moment of summon. A naive system pastes everything related into the prompt and overflows; the smart system picks the right 5 fragments out of 5,000 and produces a focused, relevant answer. That's where the product wins or loses against "we just dumped everything into Claude's context window."

## Related

- [[mcp-server]]
- [[browser-extension]]
- [[hotkey-overlay]]
- [[interface-layers]]
- [[narrowest-v1-scope]]
