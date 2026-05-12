---
status: shipped
topic: Architecture
subtopic: MCP Toolkit Discipline
aliases:
  - Atomic Primitives Compose
  - atomic-primitives-compose
  - MCP Atomicity Principle
---

# Atomic Primitives, Compose

## Definition

Each MCP tool does one thing. Compound "do everything in one call" tools are anti-patterns: they bundle costs the consumer didn't ask for, hide the failure modes inside a single response shape, and prevent callers from caching intermediate results. The V1.6 toolkit ships **atomic primitives** that compose via 1-2 extra MCP calls; the bar for any new tool is "why can't this be a composition of existing primitives?"

## How It Manifests

**Discovery + body fetch are separate primitives** (the original atomic split, item [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|030]]):

- [[mcp-find-clusters|`find_clusters`]] = discovery (cluster skeletons; cheap; ≤25 kB envelope)
- [[mcp-get-atoms|`get_atoms`]] = targeted body fetch (atom IDs → bodies; deterministic prefix-drop on overflow)

**Resolver and tail are separate primitives** (item [[2026-05-11-038-mcp-toolkit-atomicity-refactor|038]]):

- [[mcp-echo-resolve-mru|`echo_resolve_mru`]] = resolver (returns `search_memories`-ready descriptor; cacheable; cross-project bleed structurally impossible)
- [[mcp-search-memories|`search_memories`]] = body fetch by filter (now accepts `source` exact + `metadata_match` so descriptor spreads through cleanly)

**Verbatim recovery is its own escape hatch** (item [[2026-05-10-033-full-atom-recovery|033]]):

- [[mcp-get-atom|`get_atom`]] = singular; bypasses `match_content` clipping; the only verbatim recovery path. Codex's R3 round-4 evidence saved this from a proposed deletion in 038 — empirically the only verbatim path means it's load-bearing.

**Live-watch separated from body bundle** (item 038 / AC4):

- [[mcp-wait-for-new-turns|`wait_for_new_turns`]] = IDs-only (returns `turn_ids: string[]`, not bodies); callers compose `get_atoms(turn_ids)` for summaries or `get_atom(id)` for verbatim. Envelope shrinks dramatically; cost is one extra MCP call per wake.

## Why This Matters

V1.5's [[mcp-recent-work-context|`get_recent_work_context`]] was the canonical compound: clusters + bodies bundled in one envelope. Three structural problems surfaced in dogfooding:

1. **Bodies dominate cost.** Even with `format='skeleton'` capping cluster bodies, large windows blew the 25 kB MCP envelope. Consumers paid for bodies they never used.
2. **One tool, two purposes.** Discovery ("what threads exist?") and body fetch ("hydrate atoms A,B,C") had been bundled — preventing consumers from saying "I picked cluster 2; give me just THOSE 7 atoms."
3. **Envelope-overflow handling is per-purpose.** A compound tool has to pick ONE policy (drop atoms? drop clusters? truncate?). Atomic primitives handle overflow at the right grain — `get_atoms` deterministic prefix-drops, `find_clusters` caps `atom_ids[]` per cluster, `get_atom` returns `atom_too_large_for_wire` so the caller can fall back to JSONL.

Item 038's atomicity refactor (RC2) extended the same principle to the resolver / tail / live-watch axis. The result: **8 atomic tools, each with one purpose, composing cleanly.**

## What This Commits the Team To

- **Every new MCP tool must justify why it can't be a 1-2 call composition of existing primitives.** The bar is high — every additional tool grows the journal-discipline cost across all MCP clients (Codex, Cursor, Claude Code), forces description-string updates, and adds another surface to keep coherent.
- **No bundling under "convenience."** If a workflow needs 2-3 calls, document the canonical compose pattern in tool descriptions; don't ship a compound shortcut.
- **Compound tools that survive (e.g., `find_clusters`) carry their own atomicity discipline internally** — `find_clusters` is conceptually one purpose (discovery), not a discovery+fetch bundle.
- **Empirical evidence over theoretical purity.** Item 038's Codex R3 round-4 finding ("get_atom is the only verbatim path — get-atom.ts:139 evidence") saved `get_atom` from deletion. The principle bends to load-bearing reality; the test is "what breaks if we remove this?" not "is it pure?"

## Product-Decision Test

When evaluating any proposed new MCP tool:

- *"What single purpose does this serve?"* — if the answer has the word "and," it's a compound and should be split.
- *"What's the canonical compose recipe using existing primitives?"* — if there isn't one, dig: usually the missing primitive is smaller than the proposed compound.
- *"What's the journal-discipline cost?"* — every new tool adds to the cross-tool review burden (description strings, client retraining, doc updates). Costs scale with toolkit size.

## Strategic Significance

Atomic primitives are the substrate-side expression of [[compose-not-capture]]. ECHO doesn't replicate capture surfaces; ECHO's own retrieval toolkit doesn't replicate compound workflows. The pattern is identical: do the one thing well, let composition emerge at the consumer.

The substrate's compounding value (per [[system-architecture]]) is in the topology — sources fan in, consumers fan out, the middle is fixed. Atomic-primitives-compose is the right-edge expression: the middle stays fixed by NOT growing the MCP surface as new compound use cases appear. Consumers compose; the substrate stays small.

## Related

- [[compose-not-capture]] — the capture-side sibling principle
- [[mcp-server]] — the host where these primitives live
- [[mcp-echo-resolve-mru]] / [[mcp-search-memories]] / [[mcp-find-clusters]] / [[mcp-get-atoms]] / [[mcp-get-atom]] / [[mcp-wait-for-new-turns]] / [[mcp-recent-work-context]] — the 7 atomic primitives + 1 deprecated compound
- [[2026-05-09-030-mcp-toolkit-reshape-and-group-session|item 030]] — the original atomic split (discovery + body fetch)
- [[2026-05-11-038-mcp-toolkit-atomicity-refactor|item 038]] — the RC2 atomicity reform (resolver + tail + live-watch split)
- [[work-artifact-first-class]] — the sibling RC1 principle (work-artifact scoping)
