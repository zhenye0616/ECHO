---
id: 2026-05-08-025-mcp-best-practices
title: V1.5.3 MCP best-practices — structured outputs, source-app enum, cost-safer defaults, pagination, readOnly annotations, doc parity
priority: HIGH
estimate: 1-2d
created: 2026-05-08
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/echo-ping.ts
  - src/mcp/tools/search-memories.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/server.ts
  - tests/mcp/server.test.ts
  - tests/mcp/tools/echo-ping.test.ts
  - tests/mcp/tools/search-memories.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - docs/mcp-integration.md
  - raw/internal/dogfooding/mcp-interactions-journal.md
  - backlog/complete/2026-05-08-022-v15-2-trace-retrieval-reliability.md
blocked_by: []
acceptance:
  - "**Bug 1 — `outputSchema` + `structuredContent` for all three tools.** SDK is `@modelcontextprotocol/sdk@1.29.0` and supports both APIs (`node_modules/.../server/mcp.d.ts:154,257-258,270,283`). Each `registerTool` call gains an `outputSchema` describing the response shape; each handler returns `{ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }`. The `content` field stays for compat with older clients that only read text. Schemas: `echo_ping` → `{ pong: z.boolean(), received: z.string().optional(), ts: z.string() }`. `search_memories` → mirror `SearchResult` (matches array of `{ id, source, timestamp, content, metadata? }`, plus `total_returned`, `limit_applied`, `query_echo`, optional `next_cursor`). `get_recent_work_context` → mirror `RecentWorkContextResponse` at top level. The full enumerated key set per `src/trace/types.ts:78-87` is: `schema_version: z.literal(1)`, `tool: z.literal('get_recent_work_context')`, `query` (echo of inputs), `clusters`, `atoms`, `truncation`, `warnings`. Use `z.record(z.unknown())` / `z.array(z.unknown())` for deeply nested cluster/atom/edge bodies — full mirroring is V1.6 work and would lock the agent into validating fields whose contract is still moving. Document this scoping decision inline in the file."
  - "  - Test in `tests/mcp/tools/echo-ping.test.ts` (extend or new): assert the live `tools/list` entry advertises `outputSchema`, and that a real `tools/call` returns both `content` and `structuredContent` whose JSON content matches."
  - "  - Same shape of test in `tests/mcp/tools/search-memories.test.ts` and `tests/mcp/tools/recent-work-context.test.ts`. The `recent-work-context` test uses a small fixture (single cluster) so the permissive nested schemas don't reject it."
  - "**Bug 2 — `source_app` enum on `search_memories`.** Add `source_app?: z.enum(['cursor', 'claude_code', 'codex', 'git'])` to the input schema. Handler maps `source_app` to a literal `source_prefix` at request time using `os.homedir()`. Mapping table (verify each against existing extractors before committing): `claude_code` → `fs:${homedir}/.claude/projects/` (per `src/capture/sources.ts` allowlist and `src/capture/extractors/claude-code.ts`); `codex` → `fs:${homedir}/.codex/sessions/` (per `src/capture/extractors/codex.ts:27` `DEFAULT_SESSIONS_PREFIX` and `src/capture/sources.ts:11` allowlist `'~/.codex/sessions/'` — the broader `.codex/` prefix is wrong because nothing under `.codex/` outside `sessions/` is captured); `cursor` → `fs:${homedir}/Library/Application Support/Cursor/` (per `src/capture/extractors/cursor.ts:14-15` and `src/normalize/adapters/cursor.ts:25` — broader directory prefix correctly LIKE-matches the literal `Cursor/User/globalStorage/state.vscdb` source string); `git` → `git:`. Precedence rule: when both `source_app` and `source_prefix` are passed, `source_prefix` wins (escape hatch); document this in the description and surface it via `query_echo`."
  - "  - Out of scope (V1.6 follow-up, do NOT add here): `source_apps?: array` for multi-source filtering. The storage `QueryFilter` only takes one prefix today; widening it is a separate item."
  - "  - Description update on `search_memories`: replace the FS-prefix prose ('logical names like `claude_code` or `cc` will not match', 'broaden to `fs:`') with: 'Prefer `source_app` (`cursor` | `claude_code` | `codex` | `git`) for app-scoped queries; falls through to the FS-encoded `source_prefix` if you need a path-precise filter (e.g. a single Codex rollout JSONL).'"
  - "  - Test: `search_memories({ source_app: 'codex' })` returns the same matches as the equivalent `source_prefix: 'fs:${homedir}/.codex/'` call. Test that passing both with conflicting values: `source_prefix` wins, and `query_echo.source_app` records what was passed."
  - "**Bug 3 — Cost-safer defaults on `get_recent_work_context`.** Flip `format` default from `'full'` to `'minimal'`. Lower `DEFAULT_LIMIT` from 100 to 25. Reason: dogfooding 2026-05-08 shows every Claude/Codex retrieval today blew the consumer's 25k-char tool-result budget on first try (entries 13:27 PDT and 14:43 PDT), even with `format='minimal'` and `limit=50` over a 2.5h window. The current default (`limit=100`, `format='full'`) is *more* expensive than what already overflows. Update description: explicitly state defaults are now `limit=25`, `format='minimal'`, and that callers should pass `format: 'full'` only when they need full `action.input`/`action.output` content. Note in description that `limit` may be raised up to `MAX_LIMIT=500` for offline/batch consumers."
  - "  - Test: a default-args call (no `limit`, no `format`) on a fixture with 200 atoms in window returns at most 25 atoms; each atom's `action.input`/`action.output` are capped at 500 chars (the `truncateForMinimal` cap)."
  - "  - **Envelope-byte-size acceptance test** (per Codex's 13:51 PDT review of this spec): on the same 200-atom fixture, the JSON-stringified default-args response (the literal payload returned via the MCP handler — what the consumer's tool-result budget pays for) MUST be < 25,000 chars. This guards against the dogfooded failure mode where `format='minimal'` truncates atom contents but the cluster/edge/hint metadata still pushes the envelope over the consumer cap. If the test fails post-implementation, lower `DEFAULT_LIMIT` further or open a V1.6 follow-up for `format: 'skeleton'` — do NOT silently accept a passing-with-warnings response."
  - "  - Test: passing `format: 'full'` explicitly preserves full content (regression guard against accidentally tying `'full'` to the old `DEFAULT_LIMIT=100`)."
  - "  - Update `tests/mcp/tools/recent-work-context.test.ts` for any prior tests that relied on the old defaults."
  - "**Bug 4 — Pagination cursor on `search_memories`.** Add a `cursor?: string` input (opaque, base64-encoded JSON of `{timestamp: string, id: string}`). The cursor is COMPOSITE — timestamp alone is unstable because storage allows same-millisecond rows with distinct ids (`src/storage/sqlite.ts:129` orders by `timestamp DESC` only; same-ms ties are non-deterministic, and a `oldest_minus_1ms` cursor would silently skip ties). Add a deterministic secondary sort key on `id` at the storage layer: `ORDER BY timestamp DESC, id DESC` in `src/storage/sqlite.ts`, mirrored in `src/storage/memory.ts`'s `sortDesc` (use `.sort((a,b) => a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))`). Extend `QueryFilter` with `before?: { timestamp: string, id: string }`; sqlite WHERE clause uses SQLite's row-value comparison: `(timestamp, id) < (@before_ts, @before_id)`; memory adapter does the equivalent comparison in JS. The MCP handler decodes `cursor` → `before` filter. Precedence: if both `cursor` and `until` are passed, both are applied (cursor narrows further; `until` is the outer bound, `cursor` is the inner page boundary)."
  - "  - **Detection mechanism — `limit+1` overfetch.** The handler MUST internally request `limit + 1` rows from storage (override the recency-only `filter.limit = limitApplied` shortcut at `src/mcp/tools/search-memories.ts:90` to use `limitApplied + 1`). If storage returns `limit + 1` rows, drop the extra row, return `limit_applied` rows, and emit `next_cursor` encoded from the LAST kept row's `{timestamp, id}`. If storage returns `≤ limit` rows, emit `next_cursor: null`. This is the only correct way to distinguish 'exactly limit results, nothing else exists' from 'limit results, more exist' without a separate `count(filter)` storage call."
  - "  - **Cursor encoding contract.** Encode as `Buffer.from(JSON.stringify({timestamp, id})).toString('base64')`. Decode validates the JSON shape; an unparseable cursor returns a structured 400-style error in the response (do NOT throw — the MCP handler must shape errors into the response, not reject the JSON-RPC call). Document the opaque-cursor contract in the tool description: 'cursor is opaque — pass back the prior call''s `next_cursor` verbatim; do not construct one client-side.'"
  - "  - Out of scope (V1.6 follow-up): `MAX_LIMIT` change from 50, server-side substring search (already deferred per item 022 line 99). Not now."
  - "  - Test: seed 60 events at distinct timestamps; first call (`limit=50`) returns 50 + non-null `next_cursor`; second call with that cursor returns the remaining 10 + `next_cursor: null`."
  - "  - **Test: same-millisecond tie stability** (per Codex's 13:51 PDT review). Seed 5 events with identical timestamp `2026-05-08T12:00:00.000Z` and distinct ids `a`, `b`, `c`, `d`, `e`. Query with `limit=2`; assert the first call returns `[e, d]` (ids sorted DESC), `next_cursor` decodes to `{timestamp: '2026-05-08T12:00:00.000Z', id: 'd'}`. Second call with that cursor returns `[c, b]`, `next_cursor` to `{ts, id: 'b'}`. Third returns `[a]`, `next_cursor: null`. Pre-fix: oldest-minus-1ms would skip `c`, `b`, `a` entirely. Post-fix: all five reachable, no duplicates, no skips."
  - "  - Test: `cursor` and `until` together — both bounds applied; `query_echo` records both raw inputs for debuggability."
  - "  - **Storage-layer regression test:** `tests/storage/{sqlite,memory}.test.ts` (extend) — assert `query({})` on a fixture with same-ms-tied rows returns them in deterministic `id DESC` order across 10 consecutive runs."
  - "**Bug 6 — `readOnlyHint` annotations on all three tools.** All three tools are pure-read (`echo_ping` returns synthesized state; `search_memories` and `get_recent_work_context` only call `storage.query`, never `storage.append`). MCP's `tools/list` entries gain `annotations: { readOnlyHint: true }` to let clients render and route them as safe-by-default. Codex's recommendation in the 13:25 PDT review explicitly preferred this over recategorizing `echo_ping` to a resource (resources are application-controlled; tools are model-controlled — a model-invoked health check fits 'tool')."
  - "  - Test: `tools/list` for each tool includes `annotations.readOnlyHint === true`."
  - "**Bug 8 — Doc/test parity in `docs/mcp-integration.md`.** Line 53 currently states `'shows two tools: \\\`echo_ping\\\` and \\\`search_memories\\\`'`; line 100 mentions only `search_memories`. Tests at `tests/mcp/tools/recent-work-context.test.ts:125-132` already assert all three. Update both lines to reflect three tools (`echo_ping`, `search_memories`, `get_recent_work_context`), with a one-line description for each. Pure docs change, no code touched."
  - "**No-op claims (validated; no code change required, mention in run log only):** Codex's claims 5 (single ECHO daemon registers ONE server with three tools — already true at `src/mcp/server.ts:69-73`) and 7 (loopback-only, OAuth irrelevant — already true at `src/mcp/server.ts:63,76-77`) needed no implementation work. The run log must note that they were re-verified and no diff produced."
  - "**Live retrieval smoke check.** Extend `tools/mcp-integration-smoke.sh` (or run an inline curl-based check from the test) that calls `tools/list` and asserts: 3 tools present; each has `annotations.readOnlyHint === true` and `outputSchema` populated; `search_memories` advertises `source_app` enum; `get_recent_work_context` description names the new defaults."
  - "**Tests overall**: extend `tests/mcp/tools/{echo-ping,search-memories,recent-work-context}.test.ts` per above. No changes expected to `tests/trace/*` — this item does not change trace algorithm semantics. `npm run test`, `npm run lint`, `npm run typecheck` clean."
  - "Run log appended to `raw/internal/agent-runs/2026-05-08-2026-05-08-025-mcp-best-practices.md` with: each Codex claim's verdict (1-8) and the resulting diff (or 'no-op' note), the source_app→prefix mapping audit, and the rationale for default-format change."
files_to_modify:
  - src/mcp/tools/echo-ping.ts
  - src/mcp/tools/search-memories.ts
  - src/mcp/tools/recent-work-context.ts
  - src/storage/interface.ts
  - src/storage/sqlite.ts
  - src/storage/memory.ts
  - tests/mcp/tools/echo-ping.test.ts
  - tests/mcp/tools/search-memories.test.ts
  - tests/mcp/tools/recent-work-context.test.ts
  - tests/storage/sqlite.test.ts
  - tests/storage/memory.test.ts
  - docs/mcp-integration.md
  - tools/mcp-integration-smoke.sh
---

# V1.5.3 MCP best-practices — structured outputs, source-app enum, cost-safer defaults, pagination, readOnly annotations, doc parity

## What

Six bundled fixes to ECHO's MCP surface, surfaced by a peer-AI review chain on 2026-05-08:

1. Claude (in this conversation) reviewed ECHO's MCP setup against MCP 2025-06 best practices and produced an 8-claim diagnosis.
2. Codex was asked to verify Claude's claims; the review at `~/.codex/sessions/2026/05/08/rollout-2026-05-08T13-09-48-019e0935-…jsonl:338` (UTC 20:25 = 13:25 PDT) corrected two claims (5, 6) and added one of its own (8).
3. Claude reverified all 8 of Codex's claims against current code at SHA 8c2d767 (journal entry 13:35 PDT) — 8/8 confirmed.

This item is the implementation pass.

| Bug | Claim | Surface | Severity |
|---|---|---|---|
| **1** | `outputSchema` + `structuredContent` missing on all 3 tools | `src/mcp/tools/{echo-ping,search-memories,recent-work-context}.ts` | P0 |
| **2** | `source_prefix` is raw FS string, no `source_app` enum → AI clients guess `'claude_code'` literal and get 0 | `src/mcp/tools/search-memories.ts` | P0 |
| **3** | `get_recent_work_context` defaults (`limit=100`, `format='full'`) blow consumer tool-result budget every time in dogfooding | `src/mcp/tools/recent-work-context.ts` | P0 |
| **4** | `search_memories` clamps to 50 with no cursor — narrowing `until` is a workaround that loses the boundary | `src/mcp/tools/search-memories.ts` | P1 |
| **6** | All three tools miss `readOnlyHint: true` annotation | All three tool files | P1 |
| **8** | `docs/mcp-integration.md:53,100` documents two tools while tests assert three | `docs/mcp-integration.md` | P2 |

Bugs 5 and 7 from Codex's diagnosis were no-ops — already correct in current code; mention in run log only.

## Why all in one item

All six bugs share the same files (`src/mcp/tools/*.ts`) and the same `tools/list` wire shape. Splitting them risks three separate visits to the same files and three separate dogfooding cycles. The doc fix (Bug 8) is bundled because it's pure docs and would otherwise drift in isolation.

Bugs 1 and 2 are causally related per Claude's 13:35 PDT journal entry: tool descriptions doing teaching work (FS-prefix rules baked into the `search_memories` description string) is a recurring symptom of missing structured affordances. Adding `source_app` and `outputSchema` together lets the description shrink and stop carrying load-bearing prose.

Bug 3 is the most-felt failure in dogfooding 2026-05-08: every Claude/Codex retrieval today (entries 13:27 PDT, 14:43 PDT, 02:05 PDT and earlier) tripped the consumer 25k-char tool-result budget on the first call. The current default of `limit=100, format='full'` is *more expensive* than what already overflows.

## Why these are P0 / P1

The V1 hotkey overlay is the AI client of an AI client — every call goes through *two* tool-result budgets (the inner Claude/Codex/Cursor budget for the MCP response, then the user's chat budget for the final answer). The MCP layer is where size discipline has to happen because consumers can't afford to spill-and-slice on every retrieval.

`outputSchema` (Bug 1) lets clients render structured tool output in their UI without re-parsing JSON-as-text — a measurable UX win for Cursor and Claude Code. `source_app` (Bug 2) closes the foot-gun where two AI clients in one day (Codex 16:22 and Claude Code 16:33 on 2026-05-07) guessed `'claude_code'` as a logical lane and got 0 results, only recovering by reading the FS prefix off a *prior* captured session.

## Bug 1 — `outputSchema` + `structuredContent` for all three tools

Each `registerTool` call gets an `outputSchema` describing the response shape; each handler returns `{ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result }`. The `content` field stays for compat with clients that only read text content (Cursor's MCP client, current Claude Code).

**Schema scoping decision.** Full mirroring of `RecentWorkContextResponse` (clusters, atoms, edges, hints — see `src/trace/types.ts`) would lock the agent into validating fields whose internal contract is still moving (we just shipped 022 last hour and have follow-ups for 026+). Use `z.record(z.unknown())` / `z.array(z.unknown())` for deeply nested cluster/atom/edge bodies; mirror the full top-level key set per `src/trace/types.ts:78-87`: `schema_version: z.literal(1)`, `tool: z.literal('get_recent_work_context')`, `query`, `clusters`, `atoms`, `truncation`, `warnings`. Codex's 13:51 PDT review flagged that the prior enumeration of this list omitted `schema_version` and `tool` — both are non-optional fields in the actual response, so an outputSchema that excludes them would reject every real response at validation time. Document this scoping inline in `recent-work-context.ts` so the next item that revisits it knows the schema is intentionally permissive on the deep bodies but exact on the top-level keys. `search_memories` and `echo_ping` are small enough to mirror fully.

**Compat note.** SDK 1.29.0 advertises capabilities for both `2024-11-05` and `2025-06` protocol versions; `structuredContent` is supported in both. No protocol-version pinning required.

## Bug 2 — `source_app` enum on `search_memories`

Add `source_app?: z.enum(['cursor', 'claude_code', 'codex', 'git'])`. Handler maps to literal `source_prefix` using `os.homedir()`:

| `source_app` | maps to `source_prefix` |
|---|---|
| `cursor` | `fs:${homedir}/Library/Application Support/Cursor/` |
| `claude_code` | `fs:${homedir}/.claude/projects/` |
| `codex` | `fs:${homedir}/.codex/sessions/` |
| `git` | `git:` |

(The `codex` mapping was originally specced as `.codex/` in this item but Codex's 13:51 PDT review flagged it: nothing under `~/.codex/` outside `sessions/` is in the capture allowlist (`src/capture/sources.ts:11` lists only `'~/.codex/sessions/'`), and the extractor's `DEFAULT_SESSIONS_PREFIX` at `src/capture/extractors/codex.ts:27` is `${HOME}/.codex/sessions/`. The narrower prefix is correct.)

Verify each prefix against the current extractor at implementation time. Cursor is the trickiest — extractor reads from both `globalStorage/state.vscdb` and `workspaceStorage/`, so the prefix must cover both (`fs:${homedir}/Library/Application Support/Cursor/` does).

Precedence: when both `source_app` and `source_prefix` are passed, `source_prefix` wins (explicit-over-implicit). Both are echoed in `query_echo` so consumers can see exactly what was applied.

Description rewrite: drop the FS-prefix prose ('logical names like `claude_code` or `cc` will not match', 'broaden to `fs:`'); replace with 'Prefer `source_app` for app-scoped queries; falls through to `source_prefix` for path-precise filters'.

## Bug 3 — Cost-safer defaults on `get_recent_work_context`

Flip `format` default from `'full'` to `'minimal'`. Lower `DEFAULT_LIMIT` from 100 to 25.

Reason: dogfooding 2026-05-08 shows every Claude/Codex retrieval today blew the 25k-char tool-result budget on first try, *even with* explicit `format='minimal'` and `limit=50` over a 2.5h window (journal entry 13:27 PDT). The current default (`limit=100, format='full'`) is materially worse than what already overflows.

Description must explicitly call out the new defaults — consumers reading the description get the cost model upfront, instead of discovering it from a spilled tool-result on first call. Mention `MAX_LIMIT=500` is available for offline/batch consumers but is rarely the right choice for interactive AI-client paths.

## Bug 4 — Pagination cursor on `search_memories`

**Cursor shape: composite `{timestamp, id}`, base64-encoded JSON, opaque to consumers.** Codex's 13:51 PDT review surfaced that a simple `oldest_minus_1ms` cursor is unstable — `src/storage/sqlite.ts:129` orders by `timestamp DESC` only, and same-millisecond rows have non-deterministic order; "minus 1 ms" silently SKIPS ties rather than re-returning them. Composite cursor + deterministic secondary sort closes the hole.

**Storage-layer change.** Add `id DESC` as deterministic secondary key:
- `src/storage/sqlite.ts`: `ORDER BY timestamp DESC, id DESC` (currently `timestamp ${orderSql}` only).
- `src/storage/memory.ts`: extend `sortDesc` to break ties on `id` (lex DESC).
- `src/storage/interface.ts` `QueryFilter`: add `before?: { timestamp: string, id: string }`. Sqlite WHERE: `(timestamp, id) < (@before_ts, @before_id)` (SQLite supports row-value comparison since 3.0). Memory adapter: equivalent JS predicate.

**Detection mechanism: `limit + 1` overfetch.** The handler internally requests `limit + 1` rows. If storage returns `limit + 1`, drop the extra row, return `limit_applied` rows, encode `next_cursor` from the LAST kept row's `{timestamp, id}`. If storage returns ≤ `limit` rows, emit `next_cursor: null`. This replaces the current `filter.limit = limitApplied` shortcut at `src/mcp/tools/search-memories.ts:90` for the recency-only path.

**Encoding.** `Buffer.from(JSON.stringify({timestamp, id})).toString('base64')`. Decoding validates JSON shape; unparseable cursor → structured error in the response body (NOT a JSON-RPC reject). Document the opaque contract in the tool description: pass back the prior `next_cursor` verbatim; do not construct one client-side.

**`MAX_LIMIT=50` stays.** Cursor pagination is the right answer for "I need more than 50"; raising the cap is V1.6 work.

## Bug 6 — `readOnlyHint: true` annotations

All three tools gain `annotations: { readOnlyHint: true }` on `registerTool`. They are read-only by construction (no `storage.append` calls). Codex's 13:25 PDT review explicitly preferred this over recategorizing `echo_ping` to an MCP resource (resources are application-controlled; tools are model-controlled — a model-invoked health check is a tool).

## Bug 8 — `docs/mcp-integration.md` parity

Two text edits:
- Line 53: `'shows two tools: \`echo_ping\` and \`search_memories\`'` → `'shows three tools: \`echo_ping\`, \`search_memories\`, and \`get_recent_work_context\`'`.
- Line 100: extend the "List the MCP tools" verification to mention all three by name with one-line descriptions.

Pure docs, no code touched.

## Out of Scope (Don't Drift)

- **Do NOT add `source_apps: array[]`** — multi-source-prefix filtering requires widening `QueryFilter` and is a V1.6 follow-up.
- **Do NOT raise `MAX_LIMIT=50`** on `search_memories` — pagination via `next_cursor` is the answer for now.
- **Do NOT add server-side substring search** — already deferred per item 022 line 99.
- **Do NOT change storage schema** — no new fields, no migrations.
- **Do NOT add OAuth or any auth path** — Codex claim 7 is no-op (loopback-only daemon).
- **Do NOT recategorize `echo_ping` as an MCP resource** — Codex claim 6 is no-op (tool is the right kind).
- **Do NOT touch the trace algorithm** (clustering, ranking, edge filtering). This item only changes the MCP wire shape and defaults; trace internals are owned by items 016/018/019/020/021/022.
- **Do NOT add `format: 'skeleton'`** as a third response shape. `'minimal'` as default is sufficient cost discipline; further compression is a V1.6 follow-up if dogfooding shows it's still too large.
- **Do NOT pin a specific MCP protocol version.** SDK 1.29.0 advertises both 2024-11-05 and 2025-06; let it negotiate. No `protocolVersion` parameter changes.
- **Do NOT update the wiki** in this item. Wiki promotion happens after merge per CLAUDE.md.

If the agent finds itself wanting to do any of the above: STOP, log the temptation in `raw/internal/decisions/` as a drift event, fill `agent_notes` with the question, push the branch, move the item to `pending_review/`.

## After Completion (Strategist Notes)

Wiki pages to create / update post-shipment:
- **New: `wiki/surfaces/mcp-server.md`** — promote the V1 MCP surface from `planned` to `shipped`. Cover: three tools (`echo_ping`, `search_memories`, `get_recent_work_context`), `source_app` enum, default cost model (`limit=25`, `format='minimal'`), composite-cursor pagination (`{timestamp, id}` opaque base64), `readOnlyHint` annotations, `outputSchema`+`structuredContent` wire shape. Cross-reference [[capture-gate]], [[storage]], [[interface-layers]] (L3).
- **Update: `wiki/architecture/storage.md`** — document the new `ORDER BY timestamp DESC, id DESC` deterministic ordering contract and the `before: { timestamp, id }` filter. The composite-key sort is a stable property the rest of the substrate now depends on (cursor pagination, future range queries).
- **Update: `wiki/architecture/interface-layers.md`** — clarify L3 (summoned) now ships with structured-output capabilities and source-app routing.
- **No update** to `wiki/principles/` — these changes are wire-shape and ergonomics, not new commitments.

Manifest update + `tools/wiki_index.py` regeneration after the page lands.

Dogfooding follow-up after merge:
- Re-run the 13:27 PDT scenario from journal — `get_recent_work_context` over a 2.5h window with default args. Expect: response under 25k chars, no spill, `structuredContent` populated.
- Re-run the 14:43 PDT scenario — `search_memories(query="JSON-RPC", source_app='codex', limit=20)`. Expect: same matches as the literal-prefix call.

## Acceptance Criteria

(see `acceptance:` field in frontmatter — the bullet list there is the enforceable contract).
