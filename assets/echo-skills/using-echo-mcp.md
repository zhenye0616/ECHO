---
name: using-echo-mcp
description: Use the ECHO MCP server (mcp__echo__* tools, runtime 0.1.0-beta.5) to recover prior work, decisions, and live cross-tool activity via grouped retrieval, disciplined cursor continuation, and trust-signal interpretation.
type: skill
audience: customer
---

<!-- synced-copies: ~/.echo/skills/using-echo-mcp.md (source) | ~/.codex/skills/using-echo-mcp/SKILL.md | ~/.claude/commands/using-echo-mcp.md — edit source, copy to all; updated 2026-07-28 for runtime 0.1.0-beta.5 -->

# Using ECHO MCP (`mcp__echo__*`)

## Which server

ECHO retrieval tools live on the `echo` MCP server and appear as `mcp__echo__*`:
`echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `search_memories`, `wait_for_new_turns`.

WARNING: `echo-memory` / `mcp__echo-memory__*` (`memory_search`, `memory_ingest`, ...) is a DIFFERENT product (EchoChat). It is write-capable and out of scope here — never use it as a substitute for the tools above.

## Rule 0 — timestamps

Every timestamp you send carries an explicit offset (`Z`). Copy timestamps from responses verbatim — never strip the `Z`. Before reusing a returned `next_since`, sanity-check that it is not in the future.

## Rule 1 — continuation

Every opaque continuation value goes back in the `cursor` parameter, ALONE — never as a `membership_cursor` or `next_cursor` named parameter. Those are response-field names; as inputs they are silently ignored today. Cursor-only continuation preserves the frozen query. On `get_atoms` continuations, repeat the original `atom_ids`, `fields`, `prefer`, and `view` verbatim alongside the cursor — projection cannot change mid-run.

## Resume a repo

`find_clusters({group_by: "project", repo_path: "/absolute/repo/root"})`, then hydrate the returned `representative_atom_ids` with `get_atoms({atom_ids, view: "compact"})`. Skip the legacy ungrouped flow — measured 4x more bytes for a worse answer.

## Thread landscape

`find_clusters({group_by: "thread"})` returns provider-scoped root-thread headers. When you need thread topology (`thread_kind`, `parent_thread_id`, etc.), hydrate with `view: "rich"` or `fields: ["metadata"]` — compact strips topology fields.

## Full membership of one group

1. Hydrate the group's representatives FIRST.
2. Pass that group's `membership_cursor` VALUE via `cursor`, alone; repeat with each returned `next_cursor` until it is null.
3. Completeness = representatives ∪ membership pages (zero overlap expected).

`atoms_total` counts the whole group INCLUDING representatives, so `atoms_returned < atoms_total` on the final page is normal — not loss.

## Hydration truth (`get_atoms`)

- `atoms_missing`: the ID does not exist. Terminal.
- `atoms_deferred`: the atom exists but did not fit the response budget. Recoverable — continue with `next_cursor`. A `[GET_ATOMS_RESPONSE_CAP]` warning names this case.
- `atoms_dropped`: legacy compatibility field = missing + deferred. Never treat it as terminal loss.
- Expect ~7 rich atoms per call despite the 50-ID input cap; loop until `next_cursor` is null.
- Check per-atom `truncations` separately: content can be elided even when `next_cursor` is null and nothing is deferred.

## Cost levers

- `view: "compact"` (~-51%) and `fields` (up to -83%) are the real levers; `representative_limit` barely moves payload size.
- Do not send `format:"minimal"` — compatibility-only, no effect worth having.
- Wire cost is ~2x the JSON budget (MCP dual-encoding): a "25KB" response costs ~50KB of context.

## Search (`search_memories`)

Use for exact tokens — SHAs, paths, error strings, quoted phrases. Matching is case-insensitive literal substring, not semantic. Trust that a positive match EXISTS, but check its per-match `truncations` before trusting the content. A zero-match page carrying `[SEARCH_SCAN_BUDGET]` means "not found within the scan budget", not "not captured" — continue the cursor if the answer matters.

## Freshness (`wait_for_new_turns`)

Call with a Z-suffixed `since`, non-empty `sources` or `source_prefix`, and a short `timeout`. This tool does NOT warn on offset-less timestamps (its siblings do) — Rule 0 is your only protection. Feed the returned `next_since` into the next call; fetch bodies with `get_atoms`.

## Escape hatches

- `get_atom` (singular): only to recover a single atom whose content came back truncated or flagged `atom_too_large_for_wire` — routine hydration belongs in `get_atoms`. On `atom_too_large_for_wire`, the returned bounded `source` pointer is the recovery path.
- `echo_resolve_mru`: resolves apps or exact sources to per-source MRU filter descriptors — pass each descriptor's `source` and spread its `filter` into `search_memories`.
- `echo_ping`: connectivity check only.

## Answering rule

Do not present ECHO output as omniscient memory. Say what you found, from which sources, and whether retrieval was partial (warnings, cursors still open, truncations). If the first chain is thin, perform one disciplined fallback — widen the time window or relax the narrowest filter — before asking the user for more clues.
