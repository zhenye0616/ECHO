# V1.5 trace layer — design reasoning

**Date:** 2026-05-06
**Status:** committed (spec lives in `backlog/ready/2026-05-06-018-recent-work-context-tool.md`)
**Participants:** founder, Claude Code (this Claude), Codex CLI (founder's other AI session)
**Depends on:** `2026-05-06-016-read-time-normalizer` (uses `NormalizedContextEvent` as input contract)
**Related:** `2026-05-06-normalized-context-event-design.md` (the substrate that makes this possible)

## Context

V1 ships the killer-demo loop *mechanically* — events flow from extractors through capture-gate into storage, MCP retrieves them. But `wiki/product/v1-spec.md` line 132 documents that V1 doesn't yet trigger the "when can I pay?" reaction. Two reasons named:

1. The bundle is incomplete (GitHub + Slack haven't shipped — Wave 4 work).
2. The cross-tool join isn't built.

V1.5 closes (2). Wave 4 (deferred) will close (1).

This document captures the brainstorm decisions for V1.5's trace layer. The actionable spec lives in the backlog item; this document is the *why*.

## What V1.5 ships

A single new MCP tool — `get_recent_work_context` — that returns *clusters of related atoms* instead of a flat event list. The trace layer is a thin module (`src/trace/`) that consumes normalized atoms from item 016 and builds a connected-component graph keyed by shared artifact identity within a time window.

This is the **trace layer (option α)** locked during the brainstorm. Wave 4 (β — GitHub + Slack adapters) is deferred to a parallel thread.

## Decisions reached during the brainstorm

The brainstorm walked through five sequential decision points. Each was a multiple-choice with a recommended option and explicit alternatives.

### 1. Demo flavor — what's the V1.5 magic?

Three flavors considered:

- **(1) Cross-tool answer (passive).** AI client calls ECHO; receives clustered context. No new UI.
- **(2) Resume packet (summoned).** User triggers via hotkey; receives one-page brief.
- **(3) Open-loop surfacing (proactive).** ECHO surfaces unresolved threads in a notification surface.

**Decision: (1)** — smallest scope, compounds with daily Cursor + Claude Code use, reuses existing MCP plumbing, lets the trace layer's correctness be validated before betting on UI shape for (2) or (3).

(2) and (3) are V2 product surfaces. V1.5 ships the substrate that makes them possible.

### 2. Return shape — what does ECHO actually return?

Four shapes considered:

- (a) Flat list of normalized atoms (just like search_memories but using item 016's normalized form)
- (b) Atoms + a join graph (atoms + edges showing which share artifacts)
- (c) Atoms + a structured `WorkTrace` (pre-interpreted: trace_id, work_object_label, links, open_loops)
- (d) Atoms + a natural-language brief (LLM-summarized)

**Decision: (b)** — atoms + join graph.

Reasoning: (a) is too thin (item 016 alone gets us this). (d) puts an LLM call on the read path with hallucination risk on the very feature that has to land trust — defer to V2. (b) vs (c) is the real fork. (b) treats the AI client (Claude in Cursor) as the smart consumer; (c) treats ECHO as the smart producer. Claude-in-Cursor is *already* a smart consumer; we don't need to do its job. (c) becomes the V1.5+ upgrade path: same MCP tool, richer payload, no client-side breaking change.

### 3. Trigger — how does ECHO know what cluster to retrieve?

Three triggers considered:

- (i) User phrases it. Text query only (today's `search_memories`).
- (ii) AI client passes a hint (file path, URL, session_id).
- (iii) ECHO infers from recent activity (last N minutes of CaptureEvents).

**Decision: (iii) with optional (ii) override.**

Reasoning: for the magic to feel *passive*, the user shouldn't have to phrase the artifact. (i) requires the user to do the work; (ii) requires AI client cooperation; (iii) is fully ECHO-side and can fire automatically.

The tool signature: `get_recent_work_context({ since?, until?, artifact_hint?, limit? })`. All optional. Defaults pull recent activity; hint overrides.

### 4. Clustering algorithm — what counts as "in" the cluster?

Four algorithms considered:

- (A) Pure artifact join — connected components over shared `artifact_id`.
- (B) Artifact + time window — (A) but only edges within N hours.
- (C) (B) + content similarity (embeddings) — weighted edges by cosine similarity.
- (D) LLM-based clustering — pass atoms to Claude, ask for clusters.

**Decision: (B)** — artifact + 4-hour time window (configurable).

Reasoning: (A) alone collapses time — "what was I doing Friday on the normalizer?" returns Friday's work tangled with months of prior commits. Useless. (D) puts an LLM on every retrieval — V2 territory. (C) is the upgrade path once embeddings ship — backwards-compatible enrichment. (B) is rule-based, deterministic, debuggable, fast, and aligns with how the dev cohort thinks ("right now I'm working on X").

### 5. V1.5 scope — trace layer only, or trace + bundle expansion?

Three scopes considered:

- (α) Trace layer only. Source set stays at 4 (claude-code, codex, cursor, git).
- (β) Bundle expansion only (GitHub + Slack adapters). No trace layer.
- (γ) Both.

**Decision: (α) for V1.5 ship; (β) parallel/follow-up; (γ) rejected as scope explosion.**

Reasoning: founder's daily evidence stream is dominated by AI conversations + code. Claude Code + Codex + Cursor + git already covers 70-80%. GitHub PRs and Slack are nice but not where daily magic lives for the indie-AI-builder cohort. Trace layer is the *new architectural primitive*; once it works on 4 sources, adding adapters is mechanical. (γ) doubles V1.5 scope, slows the feedback loop. (β) without (α) is "more search results" — better, not magical.

## Codex redline pass on the response shape

After the response shape was sketched, codex returned a 7-change redline. Six accepted (with three adjustments), one pushed back.

### Accepted as-is (4)

- `schema_version: 1` at response level.
- Rename `input_echo` → `query`.
- Tool rename `get_current_work_context` → `get_recent_work_context` (the original name overpromised real-time).
- Structured edge shape: `{ kind: 'shared_artifact', artifact_ids[], confidence, from, to }` with documented future-list (`temporal_near | same_conversation | state_transition | same_actor | semantic_similarity`).
- Structured `artifact_hint: { provider, type, id }`.
- `truncation.truncated: bool` flag.

### Accepted with adjustment (3)

- **Open-loop hints structured (`{kind, text, confidence}`)**: accepted, but flagged the layering. Atoms keep cheap `string[]` hints (item 016 contract); trace layer enriches into `{kind, text, confidence}` when packaging clusters. We do NOT retroactively change item 016's atom shape. Atom = observation; trace = interpretation.
- **Cluster `label`**: accepted as `label?: string`, optional. Heuristic-only (no LLM call). If the heuristic produces nothing useful, omit. AI client can synthesize naming from contents.
- **`warnings[]`**: accepted at *response level only*. Cluster-level warnings deferred until a use case surfaces — adding later is non-breaking.

### Rejected (1)

- **`score: 0.87`**: dropped. A numeric score without a calibrated formula misleads consumers. The AI client can't tell if 0.87 is "trust this" or "barely surfaced." Two reliable signals are enough: `rank` (1-indexed integer position) + `rank_reason` (string list). Score becomes useful when ranking is calibrated against ground truth — V2 territory after dogfooding produces labeled examples. Adding it now invites the AI client to depend on numbers we'll later have to break.

## Architecture summary

```
CaptureEvent (storage, raw)
        │
        ▼
normalizeEvent (item 016, read-time, pure)
        │
        ▼
NormalizedContextEvent (atom — observation)
        │
        ▼
buildRecentWorkContext (this item, read-time, pure)
        │
        ▼
RecentWorkContextResponse (clusters + atoms + graph — interpretation)
        │
        ▼
[MCP get_recent_work_context tool] [V2 trace viewer] [V2 Resume Packet]
```

The trace layer is **pure**: takes events + a query, returns a response. No I/O. No clock reads (the MCP tool wrapper resolves the time window from `Date.now()` at the boundary and passes it in). No persisted traces table — `cluster_id` is a deterministic hash of the sorted atom-ids, enabling within-session reference without storage.

If the trace layer turns out to be wrong, deleting `src/trace/` is the rollback. Storage and the normalizer stay clean.

## What V1.5 explicitly does NOT do

- No persisted traces table — clusters computed on demand.
- No LLM-generated labels — heuristic only.
- No open-loop *resolution* — atoms emit hints; trace renders them; nobody decides "this loop is closed."
- No embeddings — `temporal_near` / `semantic_similarity` edge kinds are documented as future-list, not implemented.
- No new dependencies (uses `node:crypto` for hashing only).
- No automatic context injection — AI client decides when to call this tool.
- No new MCP transport — uses item 013's existing server at `127.0.0.1:38478`.
- No trace viewer / UI — V2.
- No GitHub / Slack adapters — Wave 4, parallel thread.
- No `search_memories` change — item 017's scope, separate.

## What V1.5 will teach us

The trace layer, dogfooded for ~2 weeks in the founder's daily Cursor + Claude Code + Codex + git workflow, will surface:

- **Whether the artifact-identity policy correctly joins.** If clusters split a coherent thread because two atoms reference the same file via different identity rules, the policy needs amendment.
- **Whether the 4-hour window is the right default.** Too narrow → coherent threads split. Too wide → unrelated work tangles.
- **Whether the label heuristic reads right on real clusters.** If "discussion about <random file>" feels misleading often, the heuristic needs work — or the field gets dropped.
- **Whether the rank ordering matches the founder's intuition.** "I expected the open-loop cluster first; ECHO ranked it third." Tunes the ranking signals.
- **Whether `shared_artifact` alone is enough**, or if `temporal_near` / `same_conversation` edge kinds need to land in V1.5.1.
- **Whether the AI client (Claude in Cursor) actually uses the graph.** If clusters help, conversation quality goes up; if Claude ignores the graph, the contract was wrong.
- **Whether 500ms p95 is the right perf SLO.** If the founder waits, retreat to caching.

These findings drive the V1.5+/V2 roadmap. They are *not* derivable from spec review — only dogfooding shows them.

## Conversation artifacts referenced

- This Claude Code session, 2026-05-06.
- Codex CLI session (founder's other AI), 2026-05-06: response-shape redline pass; the rename to `get_recent_work_context`; the structured edge / hint shapes; the rejected `score` field.
- `wiki/product/v1-spec.md` line 132: the explicit V1 gap that V1.5 closes ("the demo doesn't yet show the cross-tool magic").
- Item 016 (`backlog/ready/2026-05-06-016-read-time-normalizer.md`): the substrate that makes this work possible.
