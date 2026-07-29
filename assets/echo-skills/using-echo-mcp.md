---
name: using-echo-mcp
description: Use the ECHO MCP server (mcp__echo__* tools, runtime 0.1.0-beta.6) to recover prior work, decisions, and live cross-tool activity via grouped retrieval, disciplined cursor continuation, and trust-signal interpretation.
type: skill
audience: customer
---

<!-- synced-copies: ~/.echo/skills/using-echo-mcp.md (source) | ~/.codex/skills/using-echo-mcp/SKILL.md | ~/.claude/commands/using-echo-mcp.md — edit source, copy to all; updated 2026-07-29 for optional version-bound dogfooding -->

# Using ECHO MCP (`mcp__echo__*`)

## Which server

ECHO retrieval tools live on the `echo` MCP server and appear as `mcp__echo__*`:
`echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `search_memories`, `wait_for_new_turns`.

WARNING: `echo-memory` / `mcp__echo-memory__*` (`memory_search`, `memory_ingest`, ...) is a DIFFERENT product (EchoChat). It is write-capable and out of scope here — never use it as a substitute for the tools above.

## Optional version-bound dogfooding

Apply this gate only when `~/.echo/state/dogfooding-journals.json` exists and
contains `"enabled": true`. Otherwise skip it completely; it is founder-live
instrumentation, not a customer requirement.

Before the first ECHO call in each user turn:

1. Read the registry. If it exists but is unreadable, malformed, or lacks a
   usable absolute `journal_root`, report that failure and do not call ECHO.
   Resolve paths without following a symlink outside `journal_root`.
2. Read `bound_port` from `~/.echo/state/onboarding.json`.
3. Fetch `http://127.0.0.1:<bound_port>/healthz`. Detect the live version from
   `components.runtime.details.version`, falling back only to the response's
   top-level `version`. Do not infer it from `echoctl --version`, this skill,
   package metadata, or the onboarding runtime cache. If the port, health
   response, or live version is unavailable, report the preflight failure and
   make no ECHO call at all.
4. Look up that exact version under `journals` in
   `~/.echo/state/dogfooding-journals.json`. A valid entry has an absolute
   `journal_dir` under `journal_root`, containing a regular-file `JOURNAL.md`.
   If both health and the mapping provide `artifact_digest`, they must match.
5. If the mapping and journal exist, use that version's actor shard and
   atomically set `current_version` in the registry to the detected version
   when it differs. If the update fails, stop. This is the automatic link to
   an existing version journal.
6. If the mapping or journal is absent, do not call ECHO and do not silently
   create or reuse a different version's journal. Ask:
   `ECHO runtime <version> has no dogfooding journal. Create it now and make it current?`

If the founder answers yes, create
`<journal_root>/dogfooding/<version>/JOURNAL.md` and the four actor shards,
record the live `artifact_digest` when available, and atomically add that exact
version mapping plus `current_version` to the registry. Use mode `0700` for new
directories and `0600` for registry/journal files. Do not make the pending
ECHO call until creation and registry validation both succeed.

The current binding means the host agent making the call: Claude Code uses
`claude`, Codex uses `codex`, a Codex operations binding uses `codex-ops`, and
Cursor uses `cursor`. Append one compact entry to
`<journal_dir>/<actor>.md` after the last ECHO call in the turn; one entry may
cover several calls. If the version journal exists but the actor shard does
not, create the shard with an `## Interactions` heading and mode `0600`.

Each entry includes local timestamp, Runtime, Trigger, Query inputs, Returned,
Sources, Verdict, Note, and optional Conjecture. Include the `/healthz`
preflight in Query inputs. Log errors and zero-result calls too. Never paste
large raw payloads, secrets, credentials, or sensitive returned prose. If the
active repository separately mandates an MCP journal, obey that local rule as
well.

## Rule 0 — timestamps

Every timestamp you send carries an explicit offset (`Z`, `±HH:MM`, or `±HHMM`; never bare `±HH`). Copy timestamps from responses verbatim — never strip the offset. In beta.6, `wait_for_new_turns` rejects offset-less `since`; `search_memories` and `find_clusters` still accept offset-less bounds but emit `[TZ]`. Never send a future `since` to `wait_for_new_turns`: that call can return no turns, then clamp only its returned `next_since` with `[NEXT_SINCE_CLAMP]`. If the future input was accidental, retry from the intended non-future bound to recover the skipped window.

## Rule 1 — continuation

Continuation contracts are tool-specific:

- `find_clusters` grouped pages: pass the returned `membership_cursor` or `next_cursor` VALUE as the only input, `cursor`. Its opaque cursor freezes the original query.
- `search_memories`: pass `next_cursor` as `cursor` AND repeat the original `query`, source selector, `repo_path`, `metadata_match`, time bounds, and `limit` unchanged. Its cursor is only a position; cursor alone drops the filters.
- `get_atoms`: repeat the original `atom_ids`, `fields`, `prefer`, and `view` verbatim alongside `cursor` — projection cannot change mid-run.

Never send `membership_cursor` or `next_cursor` as input keys. They are response-field names, and beta.6 rejects them as unknown. All seven tools reject unknown top-level keys, so treat a validation error as a contract mismatch instead of retrying with invented arguments.

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

Use for exact tokens — SHAs, paths, error strings, quoted phrases. Matching is case-insensitive literal substring, not semantic. Trust that a positive match EXISTS, but check its per-match `truncations` before trusting the content. A zero-match page carrying `[SEARCH_SCAN_BUDGET]` means "not found within the scan budget", not "not captured" — continue with the original search shape plus `cursor` if the answer matters.

## Freshness (`wait_for_new_turns`)

Call with an offset-bearing `since`, non-empty `sources` or `source_prefix`, and a short `timeout`. Beta.6 rejects offset-less `since`; if a computed `next_since` would be in the future, it clamps that returned watermark and emits `[NEXT_SINCE_CLAMP]`. Normally feed each returned `next_since` into the next call, including after an empty timeout. If `[NEXT_SINCE_CLAMP]` followed an accidental future input, first retry from the intended non-future bound per Rule 0 to recover the skipped window. Fetch bodies with `get_atoms`.

## Escape hatches

- `get_atom` (singular): only to recover a single atom whose content came back truncated or flagged `atom_too_large_for_wire` — routine hydration belongs in `get_atoms`. On `atom_too_large_for_wire`, the returned bounded `source` pointer is the recovery path.
- `echo_resolve_mru`: resolves apps or exact sources to per-source MRU filter descriptors — pass each descriptor's `source` and spread its `filter` into `search_memories`.
- `echo_ping`: connectivity check only.

## Answering rule

Do not present ECHO output as omniscient memory. Say what you found, from which sources, and whether retrieval was partial (warnings, cursors still open, truncations). If the first chain is thin, perform one disciplined fallback — widen the time window or relax the narrowest filter — before asking the user for more clues.
