# Key — 014-search-memories

**Decision:** 2026-04-30-014-mcp-search-memories · age @ run: ~1 month (oldest rung)
**Committed record:** `backlog/complete/2026-04-30-014-mcp-search-memories.md` · branch commit `37a2ff7c`
**Query mode:** descriptive; oldest window — primary decay probe

## Pre-registered ground-truth (4 facts)

| # | Fact | Truth |
|---|---|---|
| 1 | Decision | Build the MCP `search_memories` tool — retrieval over captured events. Input `{query?, source_prefix?, since?, until?, limit?}` (all optional, limit=10); returns most-recent matches sorted `timestamp DESC`. **Key design call: case-insensitive substring filter on content — NOT semantic/KNN search** |
| 2 | Reasoning | Keep V0 retrieval simple and dependency-free — literal substring over the captured store, no embeddings. (Builder also chose DESC ordering *in the tool* rather than extending `QueryFilter.order`, to avoid un-spec'd drift; flagged `order` for V1.5 if retrieval becomes a hotspot) |
| 3 | Dissent | **CORRECTED post-run:** there's no cross-vendor *queue* round (predates `039`), but `014` DOES have a **founder-reconciliation review** with two named pre-merge fixups: `src/storage/sqlite.ts:90` — escape `%/_/\` in `source_prefix` (added `ESCAPE '\'`); `src/storage/memory.ts:30` — documented MemoryStorage insertion-order limit semantics. Core design (substring + source_prefix + in-tool DESC) accepted as-is |
| 4 | Disposition | Shipped — merged 2026-05-01 as `27cc58b` "with founder reconciliation"; 187/191 tests pass (4 = pre-existing chokidar flake, founder accepted as known); in `backlog/complete/` |

## Confabulation trap — DID NOT FIRE (and why that matters)
- I designed Q3 as a trap on the premise "014 predates the review queue → no review → a weak reader invents one." **The premise was false** (stale key): a founder review WITH two specific fixups existed. The cold reader retrieved **both fixups by name** + the correct merge SHA — it was *more accurate than the trap-setter*. Lesson: verify keys against `complete/` review_notes + git BEFORE trusting them; the human key was wrong on Fact 3 here exactly as on 081 Fact 4 and 060 Fact 3.
- Fact 2 (substring NOT semantic) was the real load-bearing test — reader nailed it.

## Results log
| Date | A (on) | B (off) | A−B | Failure mode | Notes |
|---|---|---|---|---|---|
| 2026-05-31 | 4/4 | 0/4 | 4 | none (beat the key on Fact 3) | Codex gpt-5.5, 23 ECHO calls, audit clean. 1-month-old decision, NO decay. Named both real fixups + merge `27cc58b`; correctly said "not on core design" |
