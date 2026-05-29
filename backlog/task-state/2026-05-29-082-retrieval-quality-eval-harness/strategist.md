---
task_id: 2026-05-29-082-retrieval-quality-eval-harness
role: strategist
writer: codex-strategist
last_updated: 2026-05-29T15:45:00-07:00
---

## current_thesis

Spec drafted; awaiting claim. The item creates the missing standard/eval layer for ECHO retrieval quality: score whether retrieval returns primary evidence from the right scope with low forbidden noise and explicit loss warnings inside byte/call budgets. This is measurement infrastructure only; production retrieval fixes come later.

## locked_decisions

- Good retrieval is defined as evidence quality, not answer prose: primary recall, top-rank success, weighted precision, signal/noise ratio, forbidden-noise absence, source coverage, loss legibility, byte budget, and call efficiency.
- Ground truth has layers: dogfooding journals label intent/verdict/failure notes; raw Claude/Codex JSONL is provenance truth; committed decisions/backlog/wiki artifacts are durable answer truth; case files hold reviewed relevance labels.
- Case files are JSON, not YAML, to avoid adding a parser dependency in V0.
- CI uses committed sanitized fixtures loaded into `MemoryStorage`; local raw JSONL/journal/artifact paths are optional provenance inputs and must not be broadly scanned or committed unredacted.
- Labels use stable fixture refs, not storage-generated atom IDs. The runner maps fixture refs to random atom IDs and normalizes results back before scoring.
- Seed pack locks six cases: signal-vs-noise alias miss, neutrality-axis alias, what-shipped-today needs artifacts, resume-after-clear newest-first, generated-label circular retrieval, and stale/degraded source warnings.
- No production retrieval behavior changes are allowed in this item. Failing evals are an acceptable deliverable and should be surfaced in `agent_notes`.
- 081 stays reserved for Raycast removal after 080's overlay dogfooding gate; this retrieval-quality spec uses 082.
- Reviewer roster for the full-auto spec review is `["codex", "codex-ops"]` per founder direction, overriding the post-047 default `["codex", "cursor"]`.

## open_questions

- None blocking. Builder judgment remains on fixture redaction depth and exact event snippets, but the invariants are fixed: sanitized, deterministic, provenance-cited, and small.
- After the first harness run, strategist should decide whether the next spec is semantic/alias expansion, field-scoped fallback, or degraded-source warning improvements based on measured failures.

## dont_touch

- Do not change `src/mcp/tools/*`, `src/trace/*`, storage adapters, extractors, daemon server, Raycast, overlay, or browser extension behavior.
- Do not add embeddings, semantic search, rerankers, alias layers, or an LLM-as-judge gate.
- Do not commit private raw Claude/Codex JSONL or full transcript bodies. Use sanitized fixtures and provenance references.
- Do not edit `wiki/` before this item ships.
- Do not consume docs/BACKLOG.md as a builder-owned file; the strategist already added the Ready row.

## canonical_anchors

- spec: backlog/ready/2026-05-29-082-retrieval-quality-eval-harness.md
- reviews: backlog/reviews/2026-05-29-082-retrieval-quality-eval-harness/
- parent_retrieval_precedent: backlog/complete/2026-05-20-064-mcp-compact-view-projection.md
- product_thesis: raw/internal/decisions/2026-05-29-operator-context-layer-thesis.md
- followup_source: backlog/_followups.md
