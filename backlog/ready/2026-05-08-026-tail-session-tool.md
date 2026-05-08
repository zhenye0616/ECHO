---
id: 2026-05-08-026-tail-session-tool
title: V1.5.4 `tail_session` MCP tool — cheap exact-fetch for the cross-AI handoff demo
priority: HIGH
estimate: 0.5-1d
created: 2026-05-08
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/search-memories.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/server.ts
  - src/storage/interface.ts
  - src/storage/sqlite.ts
  - src/storage/memory.ts
  - tests/mcp/tools/search-memories.test.ts
  - docs/mcp-integration.md
  - raw/internal/dogfooding/mcp-interactions-journal.md
  - backlog/ready/2026-05-08-025-mcp-best-practices.md
blocked_by:
  - "2026-05-08-025-mcp-best-practices"
acceptance:
  - "**New tool: `tail_session`.** Registered alongside the existing three at `src/mcp/server.ts:69-73`. Cheap, exact-fetch counterpart to `search_memories` (substring) and `get_recent_work_context` (clustered). Returns the N most-recent stored events for a single named source — no substring filter, no clustering, no ranking. Designed for the V1 killer-demo case 'where did Codex / Claude Code leave off in their last session' which today is served by direct file `grep` because neither existing tool fits."
  - "**Input schema:**"
  - "  - Exactly one of `source` (string, the literal stored source — e.g., `fs:/Users/zhenye/.codex/sessions/2026/05/08/rollout-XYZ.jsonl`) OR `source_app` (enum: `'cursor' | 'claude_code' | 'codex' | 'git'`, mapping per spec 025 Bug 2 — `codex` → `fs:${homedir}/.codex/sessions/`, etc.) MUST be provided. Pass both → schema-level rejection with a structured error message. Pass neither → same."
  - "  - `count?: number` — default 5, min 1, max 20. Capped low because this tool's contract is 'cheap'; consumers wanting more should use `search_memories` with cursor pagination."
  - "  - `cursor?: string` — composite `{timestamp, id}` opaque base64, identical contract to spec 025 Bug 4. Reuses the same encoder/decoder helpers — DO NOT duplicate."
  - "**Resolution semantics:**"
  - "  - **Exact-`source` mode:** storage query for that literal source, ordered by `timestamp DESC, id DESC` (relies on spec 025's storage-layer change), limited to `count + 1` (overfetch for `next_cursor` per 025's pattern). If zero atoms match: return `{ turns: [], next_cursor: null, source_resolved: <input source>, warnings: ['no captured atoms for this source'] }` — NOT an error."
  - "  - **`source_app` mode:** two-step resolution. (1) query storage with `source_prefix = <app's mapped prefix>` ordered DESC, limit 1; pluck the `source` field of the newest row (the most-recently-active session). (2) tail that resolved source per the exact-source path. Echo the resolved source in the response field `source_resolved` so the consumer can pin subsequent calls. If no atoms match the app's prefix at all: return `{ turns: [], next_cursor: null, source_resolved: null, warnings: ['no captured sessions found for source_app=<app>'] }`."
  - "**Output schema (`outputSchema` + `structuredContent` per spec 025 Bug 1):** `{ turns: z.array(searchMatchSchema), next_cursor: z.string().nullable(), source_resolved: z.string().nullable(), warnings: z.array(z.string()) }`. The `searchMatchSchema` is the same Zod shape spec 025 introduces for `search_memories.matches[]` (`{ id, source, timestamp, content, metadata? }`); reuse it — single source-of-truth schema. `next_cursor` is ALWAYS present (`null` when no more rows); identical contract to spec 025's `search_memories.next_cursor`."
  - "**Cursor handling:** decode `cursor` to `before: { timestamp, id }` per spec 025 helpers; pass to storage. Malformed cursor → MCP-style `{ isError: true, content: [{ type: 'text', text: '...reason...' }] }` with NO `structuredContent`, identical to spec 025 Bug 4. Reuse the spec 025 helpers — do not reimplement."
  - "**Annotations:** `annotations: { readOnlyHint: true }` on `registerTool`, per spec 025 Bug 6. Tool only reads from storage; no `storage.append`."
  - "**Description string:** terse and cost-aware. Suggested wording: `'Tail the N most-recent captured atoms for a single named source — the cheap counterpart to search_memories (substring) and get_recent_work_context (clustered). Pass `source` for an exact path-precise tail, or `source_app` (one of cursor/claude_code/codex/git) to auto-resolve the most-recently-active session for that app. Default count=5, max 20; typical response < 10k chars. Use this for \"where did <app> leave off\" lookups instead of substring search.'`"
  - "**Storage interface:** the existing `QueryFilter.source_prefix` (LIKE-escaped match) handles the exact-`source` case when called with the full literal source string — `LIKE 'fs:.../rollout-X.jsonl%'` matches because the source string itself is the entire prefix and there are no longer rows under it. Verify this works in practice; if not, add `source?: string` (exact match) to `QueryFilter` and use it. Document the choice inline in `src/storage/interface.ts`."
  - "**Tests** in new `tests/mcp/tools/tail-session.test.ts`:"
  - "  - Exact-`source` happy path: seed 10 events under one source + 5 under another; `tail_session({ source: 'A', count: 3 })` returns the 3 newest under A, `next_cursor` non-null, `source_resolved === 'A'`."
  - "  - `source_app` happy path: seed events under 3 different `fs:.../rollout-…` codex sources with distinct timestamps; `tail_session({ source_app: 'codex', count: 2 })` returns the 2 newest events of the most-recently-active session, `source_resolved` equals that session's source."
  - "  - Source-not-found: `tail_session({ source: 'fs:.../nonexistent.jsonl', count: 5 })` returns `{ turns: [], next_cursor: null, source_resolved: 'fs:.../nonexistent.jsonl', warnings: [...] }` — NOT an error."
  - "  - `source_app` with empty store: `tail_session({ source_app: 'codex' })` on an empty fixture returns `{ turns: [], next_cursor: null, source_resolved: null, warnings: ['no captured sessions found for source_app=codex'] }`."
  - "  - Pagination: seed 25 events under one source; first call `count: 10` returns 10 + non-null cursor; second call returns 10 + non-null cursor; third call returns 5 + `next_cursor: null`. Same-ms-tie regression test mirroring spec 025's: 5 events sharing one timestamp must paginate fully without skips/duplicates."
  - "  - Schema rejection: passing both `source` AND `source_app` (or neither) is rejected by the input schema with a structured error."
  - "  - `count` clamping: `count: 0` rejected; `count: 100` clamped to 20."
  - "  - Malformed cursor: same three cases as spec 025's `search_memories` test (non-base64 / valid-base64-empty / missing-id) → `isError: true`, no `structuredContent`."
  - "  - `tools/list` advertises `tail_session` with `outputSchema` populated and `annotations.readOnlyHint === true`."
  - "**Smoke script:** extend `tools/mcp-integration-smoke.sh` to assert `tools/list` includes `tail_session`. A live happy-path call (e.g., `tail_session({ source_app: 'codex', count: 1 })` against the founder's local DB) is OPTIONAL and gated on `ECHO_SMOKE_LIVE=1` — not part of CI."
  - "**Doc update:** `docs/mcp-integration.md` gains a short `tail_session` section after the `get_recent_work_context` description, framed as 'the cheap counterpart for known-source tail lookups'. The smoke-check section asserts 4 tools now visible (was 3)."
  - "**No storage schema change.** No migration. No trace algorithm change. No change to `search_memories` or `get_recent_work_context` (they ship in spec 025 — this item builds on top of them)."
  - "Run log appended to `raw/internal/agent-runs/2026-05-08-2026-05-08-026-tail-session-tool.md` covering: schema-vs-runtime exact-or-app branch placement decision, the storage-filter exact-match verification (whether `source_prefix` worked or whether `source: string` had to be added), and a measured byte-count for the `source_app: 'codex'` smoke call against the founder's local DB."
files_to_modify:
  - src/mcp/tools/tail-session.ts
  - src/mcp/server.ts
  - src/storage/interface.ts
  - tests/mcp/tools/tail-session.test.ts
  - docs/mcp-integration.md
  - tools/mcp-integration-smoke.sh
---

# V1.5.4 `tail_session` MCP tool — cheap exact-fetch for the cross-AI handoff demo

## What

A fourth ECHO MCP tool that returns the N most-recent captured atoms for a single named source (or the most-recently-active session for a given `source_app`), with composite-cursor pagination. No clustering, no substring filter, no ranking. Designed as the cheap, bounded-cost primitive for "where did `<app>` leave off in its last session" — the V1 killer-demo case that today gets served by direct `grep` of the rollout JSONL because neither `search_memories` nor `get_recent_work_context` fits.

## Why

Dogfooding 2026-05-08 surfaced that the strategist (Claude Code in this conversation) bypassed ECHO and read source files directly twice in one afternoon for cross-AI lookups (entries 13:27 PDT, 14:00 PDT in `mcp-interactions-journal.md`). Codex hit MCP transport failures on its side independently (entries 02:05, 13:22, 13:46, 13:51 PDT — separate item 027). For Claude's bypass: the existing tools are wrong-shape for the actual demo case:

| Need | Existing tool | Why it doesn't fit |
|---|---|---|
| "Get Codex's last 3 turns from session X" | `search_memories` | substring-based; returns paraphrase matches, not the literal turn |
| Same | `get_recent_work_context` | clusters across sources, ranks, returns clusters not turns; large response envelope |

`tail_session` is the missing primitive. It maps directly onto how a human reaches for `tail -n 5 rollout.jsonl` mentally, but goes through the substrate so the captured-atom model stays the canonical source.

## Why HIGH priority

This is the gap that makes the V1 killer-demo cheaper than `grep`. Without it, every cross-AI handoff lookup is a 2-step (call → spill → slice) workflow that costs more than direct file reads — which has trained the strategist to bypass ECHO. The journal-discipline rule "always make the ECHO call first" is brittle when the cheaper path is one tool away. Ship the tool, restore the natural pull.

## Why blocked by 025

`tail_session` reuses 025's primitives across the board: composite-cursor encoding/decoding, `source_app` enum mapping, `outputSchema` + `structuredContent` + `readOnlyHint` annotation pattern, `next_cursor` always-present-nullable contract, malformed-cursor `isError` shape, storage's `ORDER BY timestamp DESC, id DESC`. Implementing 026 against the pre-025 codebase would either duplicate that scaffolding (and drift) or block on it anyway. Sequence: 025 ships first, 026 builds on top, total cost is much lower than parallel scaffolding.

## Out of Scope (Don't Drift)

- **Do NOT support cross-source tail.** That is `get_recent_work_context`'s job. `tail_session` is by-design single-source.
- **Do NOT add semantic ranking, embeddings, or KNN.** This is a recency-only tool.
- **Do NOT change extractors or normalizers.** Whatever an extractor stored as `content` is what gets returned.
- **Do NOT add `format: 'minimal' | 'full'`.** Atoms come out as-stored; the `count` cap is the cost discipline.
- **Do NOT widen `MAX_LIMIT` from 20.** Consumers needing more should use `search_memories` with cursor pagination — `tail_session` is explicitly the cheap shape.
- **Do NOT add a `tail_repo` for git.** `git:` source-app is supported in input but not specially treated; it returns the most-recent commits per the same algorithm. A repo-aware tail with diff-grouping is V1.6+ if dogfooding shows it's needed.
- **Do NOT introduce a separate tool description framework.** Inline the description string in `tail-session.ts` per the existing pattern in `search-memories.ts:5-6` and `recent-work-context.ts:14-35`.

If the agent finds itself wanting to do any of the above: STOP, log the temptation in `raw/internal/decisions/`, fill `agent_notes`, push branch, move to `pending_review/`.

## After Completion (Strategist Notes)

Wiki updates post-shipment:
- **Update `wiki/surfaces/mcp-server.md`** (the page 025's promotion creates) — add the `tail_session` tool to the four-tool roster. Cover: input modes (`source` vs `source_app`), `source_resolved` echo, cost contract (`< 10k chars typical`), composite cursor (shared with `search_memories`), why `tail_session` exists separately from the other two retrieval tools.
- **No new wiki page.** Single addition to the existing surfaces page.

Dogfooding follow-up after merge:
- Re-run today's bypass scenarios (13:27, 14:00 PDT entries) using `tail_session` instead of `get_recent_work_context` + spill+slice. Measure: byte-count of response, number of MCP calls to recover the same Codex turn that motivated this item. Expected: 1 call, < 10k bytes, no spill — vs today's 2 calls + subagent-slice.
- Journal an explicit "ECHO won this round" entry for each successful re-run; this is the controlled-experiment data the operating-model retrospectives will lean on.

## Acceptance Criteria

(see `acceptance:` field in frontmatter — the bullet list there is the enforceable contract).
