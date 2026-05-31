# Key — 014-paraphrase (ALIAS-PATH probe)

**Target:** same decision as `014-search-memories` (2026-04-30-014-mcp-search-memories), but the query has **zero token overlap** — no "search_memories", no "014", no "substring"/"semantic". The agent must bridge a *conceptual* description → the right atoms.
**Why this rung:** `search_memories` is literal substring search; 082 documents the natural-language *alias* path as a current **failure** (`signal-vs-noise-alias`). Exact-token 014 scored 4/4 — this isolates **query wording** as the only changed variable. The discriminator is **identification**: does ECHO surface 014 from concept-only terms ("memory search", "matching approach", "retrieval"), or does the reader drown / confabulate?

## Ground-truth (verified — same as 014-search-memories)

| # | Fact | Truth |
|---|---|---|
| 1 | Decision | `search_memories` MCP tool: read-only event search, optional query/source_prefix/since/until/limit, `timestamp DESC`. **Matching approach: case-insensitive substring — NOT semantic/KNN** |
| 2 | Reasoning | V1 killer-demo bridge; keep V0 retrieval simple & dependency-free (raw substring + source/time filters, no embeddings) |
| 3 | Dissent | Founder-reconciliation review (no cross-vendor queue — predates 039); 2 named fixups: `%/_/\` LIKE-escape (`sqlite.ts:90`), MemoryStorage limit-semantics doc (`memory.ts:30`). Core design accepted |
| 4 | Disposition | Merged 2026-05-01 as `27cc58b` "with founder reconciliation"; in `complete/` |

## Scoring focus
- **Primary metric: did it IDENTIFY the right item** (name `search_memories` / `014`) from the paraphrase alone? Identification-fail = alias-path fail, regardless of downstream facts.
- Bonus failure mode: confabulating "semantic/embedding search" for Fact 1 (would reveal pattern-matching over retrieval).
- Compare A here vs A=4/4 on exact-token 014. A drop = the substring weakness in the wild.

## Results log
| Date | Identified? | A (on) | B (off) | A−B | Failure mode | Notes |
|---|---|---|---|---|---|---|
| 2026-05-31 | ✅ yes (`search_memories`/014) | 4/4 | 0/4 | 4 | none | Codex gpt-5.5, 14 ECHO calls. Alias path SUCCEEDED from concept-only query. **CAVEAT:** "stored-memory search"→"search_memories" is a *guessable* concept→token bridge; this does NOT yet prove the hard alias case (un-inferrable token, e.g. 082's "signal vs noise"). Softer than the worst case |
