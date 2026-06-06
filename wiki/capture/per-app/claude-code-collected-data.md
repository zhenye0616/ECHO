---
status: shipped
topic: Architecture
subtopic: Per-App Data Collection
aliases:
  - Claude Code Data Collection
  - What ECHO Collects from Claude Code
  - Claude Code Capture Reference
---

# Claude Code — Collected Data Reference

A field-by-field record of what ECHO reads from Claude Code's local session transcripts, where it lives, and what it ends up as in the unified `CaptureEvent`. Mechanics live in [[claude-code-extractor]]; this page is about the **data**.

## TL;DR

ECHO captures the **plain user and assistant text from every Claude Code main-session turn**, plus the project slug, session UUID, monotonic turn index, and a `had_tool_use` boolean per turn. Beyond that text core, each turn now also persists a layer of **Tier-A per-turn metadata** (shipped, analogous to what landed for Cursor): bounded **`tool_calls`** (each with `name` / `args` / `output` / `is_error` / `call_id`, plus a `tool_call_total` count and a `tool_calls_truncated` flag when more than `MAX_TOOL_CALLS_PER_TURN` = 50 fired), a bounded **`thinking`** summary (truncated via `truncateThinking` at 8 000 chars), **`files_referenced`**, **`repo_root`**, a per-turn **`git_state`** + **`branch`**, **`permission_mode`**, **`cli_version`**, and **`model`**. Stable IDs let you group by chat (`session_id`) or by project (`project`).

The tool-call / tool-result / thinking blocks still do **not** become their own turns — the pairing rule is unchanged (one user line + the next text-bearing assistant line) — they now additionally populate the per-turn metadata above. What is *still* deliberately not collected, all outside `~/.claude/projects/<project>/<session>.jsonl`: file-history snapshots, attachments, `system` lines, `last-prompt` lines, multi-modal / image content blocks, subagent JSONLs, `history.jsonl`, and every non-allowlisted directory under `~/.claude/`.

## The watched path

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
~/.claude/projects/<project-slug>/<session-id>/subagents/agent-<id>.jsonl   (matched in principle, but see "Empirical coverage" below)
```

`<project-slug>` is Claude Code's URL-safe encoding of the cwd the session was launched in (e.g. `/Users/zhenye/Desktop/Project_echo` → `-Users-zhenye-Desktop-Project-echo`). `<session-id>` is a v4 UUID.

The extractor watches `~/.claude/projects/` recursively (wired via `wireJsonlExtractor`, `src/capture/extractors/claude-code.ts:599-604`); on every `add` or `change` whose path satisfies `p.startsWith(prefix) && p.endsWith('.jsonl')` (the `isJsonl` predicate driving `dispatch`, `src/capture/extractors/_shared.ts:175-198`), the dispatcher schedules an incremental tail of that file. Files are opened **read-only** (`open(jsonlPath, 'r')` in `readJsonlTail`, `src/capture/extractors/_shared.ts:140`).

`session_id` is derived from `basename(path, '.jsonl')` (`deriveSessionId`, `src/capture/extractors/claude-code.ts:261-264`); `project` is the parent directory name (`deriveProject`, `src/capture/extractors/claude-code.ts:266-268`).

## Claude Code's JSONL line shape

Each line is one event. Real lines (probed against the live session `4e273691-…` on 2026-05-02, first 500 lines) carry one of six top-level `type` values:

| Top-level `type`           | Per session | What it is | Read by ECHO? |
|---|---:|---|---|
| `user`                     | many | A user-role message line. `message.role === "user"`, `message.content` is string-or-array | ✅ when `text` non-empty after extraction |
| `assistant`                | many | An assistant-role message line | ✅ when `text` non-empty after extraction |
| `system`                   | a few | Synthetic injected blurbs (e.g. local-command stdout) | ❌ — `parseLine` returns null because there is no `.message` field (`src/capture/extractors/claude-code.ts:230-231`) |
| `attachment`               | a few | Hook-additional-context, task-reminder, mcp_instructions_delta, skill_listing, etc. | ❌ — same reason |
| `file-history-snapshot`    | a few | Claude Code's per-message file-backup checkpoints (under `~/.claude/file-history/`) | ❌ — same reason |
| `last-prompt`              | a few | A short trailing line carrying the user's last prompt verbatim and `sessionId` only | ❌ — same reason |

Only `user` and `assistant` lines have a `message: {role, content}` substructure, and `parseLine` (`src/capture/extractors/claude-code.ts:217-259`) ignores everything else.

For each `message`, `role` is one of:

| `message.role` | What it is | Read by ECHO? |
|---|---|---|
| `user`         | What you typed, OR a synthetic tool_result block, OR a meta-caveat | ✅ — but tool_result-only and empty-text user lines are skipped for *text* purposes (`text === ''` filter, `src/capture/extractors/claude-code.ts:361-380`); their tool_use/tool_result/thinking side-effects still fold into the open or next cluster's metadata |
| `assistant`   | What Claude replied | ✅ — same empty-text filter applies |
| (anything else) | not produced by Claude Code today | ❌ — `parseLine` rejects (`src/capture/extractors/claude-code.ts:234`) |

For `message.content`, the value is **either a string OR an array of content blocks** (handled in `extractContent`, `src/capture/extractors/claude-code.ts:162-215`):

| `content` shape | What it is | Read by ECHO? |
|---|---|---|
| `string`                          | Plain user prompt or simple assistant reply | ✅ — used verbatim, `hasTool: false` |
| `array of {type, ...}` blocks     | Multi-block message (the common case for assistant lines) | ✅ — see block table below |

For each content block:

| `block.type`     | What it is | Read by ECHO? |
|---|---|---|
| `text`           | The visible text the user/agent emits | ✅ — concatenated into `text` |
| `tool_use`       | The agent invoked a tool | ✅ — flips `had_tool_use`; **also** the `id` / `name` / `input` land in `turn.tool_calls` (with `tool_call_total` + `tool_calls_truncated`), and file-path inputs feed `files_referenced` (`extractContent`, `src/capture/extractors/claude-code.ts:187-201`) |
| `tool_result`    | A tool returned output | ✅ — flips `had_tool_use`; **also** the `tool_use_id` / `content` / `is_error` land in `turn.tool_calls` (matched to its `tool_use` by id, `matchToolCalls`, `src/capture/extractors/claude-code.ts:455-483`) |
| `thinking`       | Hidden reasoning block | ✅ — non-empty `thinking` blocks are concatenated and truncated via `truncateThinking` into `turn.thinking` (`src/capture/extractors/claude-code.ts:181-186`, `_turn_meta.ts:61-63`) |
| (other, e.g. images) | Multi-modal content | ❌ — silently dropped by `extractContent` (no branch matches) |

Lines whose extracted `text` is empty (e.g. a user-role line whose only content block is a `tool_result`) are dropped before pairing for *text* purposes (`src/capture/extractors/claude-code.ts:361-380`); their `had_tool_use`, `tool_calls`, `files_referenced`, and `thinking` side-effects still fold into the open cluster (or via the "between" buffers into the next cluster), so the emitted turn records what fired during it.

Top-level fields **on every user/assistant line**: `parentUuid`, `isSidechain`, `promptId`, `uuid`, `userType`, `entrypoint`, `sessionId`, `isMeta`, `requestId`, `sourceToolAssistantUUID`, `toolUseResult` are still ignored. But `parseLine` now *also* reaches in for `cwd` → `repo_root`, `gitBranch` → `git_state` / `branch`, `permissionMode` → `permission_mode`, `version` → `cli_version`, and `message.model` → `model`, in addition to `message`, `message.role`, `message.content`, and the top-level `timestamp` (`src/capture/extractors/claude-code.ts:235-258`).

## User/assistant pairing rule

The extractor walks lines in file order and groups them into turns (the main loop, `src/capture/extractors/claude-code.ts:352-446`):

1. A `user` line with non-empty `text` opens a `pending` cluster.
2. A `user` line that arrives while a cluster is still open closes it: if assistants accumulated, the cluster is emitted; otherwise the prior user is recorded as a `DroppedUserLine` (logged once per byte_offset as `user_prompt_dropped_without_assistant_reply` / `user_inject_dropped`, `src/capture/extractors/claude-code.ts:382-396`, `526-544`), then the new user opens a fresh cluster.
3. An `assistant` line with non-empty `text` appends to the open cluster; an assistant with `stop_reason: end_turn` closes and emits the cluster immediately (`src/capture/extractors/claude-code.ts:438-442`).
4. An `assistant` line with no open cluster logs `orphan_assistant` and is dropped (its tool/thinking side-effects still carry forward via the "between" buffers, `src/capture/extractors/claude-code.ts:420-421`, `371-377`).
5. A trailing user/assistant with no closing next-user emits zero turns and stays pending — it is intentionally *not* emitted at EOF (`src/capture/extractors/claude-code.ts:448-452`); the next FS event re-reads from `confirmedThroughOffset` and rebuilds it.

So one stored turn is **one user line paired with the following text-bearing assistant line(s)**, regardless of how many tool_use / tool_result / thinking blocks sat between them. Tool blocks are not themselves turns; they flip `had_tool_use` and now also populate the per-turn `tool_calls` / `thinking` / `files_referenced` metadata (assembled in `emitPendingIfComplete`, `src/capture/extractors/claude-code.ts:317-350`).

## What lands in `echo.db` per turn

Built in `handleJsonlChange` (`src/capture/extractors/claude-code.ts:522-597`); the per-turn shape itself is assembled in `emitPendingIfComplete` (`src/capture/extractors/claude-code.ts:317-350`):

```ts
{
  source:    "fs:/Users/<you>/.claude/projects/<project>/<session>.jsonl",
  timestamp: <ISO 8601 from the assistant message's top-level `timestamp`,
              falling back to file mtime when absent>,
  content:   "USER: <user_message>\n\nASSISTANT: <assistant_message>",
  metadata: {
    project:        "<project-slug>",    // parent dir name, e.g. "-Users-zhenye-Desktop-Project-echo"
    session_id:     "<UUID>",            // basename minus .jsonl
    turn_index:     <0-based, monotonically increasing per session>,
    mtime:          <ms epoch — the file's mtimeMs at extraction time>,
    byte_offset:    <file offset just past the last line consumed for this turn>,
    // — all of the following are OMITTED when empty/absent (no-bloat on plain turns) —
    had_tool_use?:  true,                       // omitted when false (line 554)
    repo_root?:     "<cwd from any line in the turn>",
    files_referenced?: ["<path>", ...],         // from tool_use.input file-path keys
    tool_calls?:    [{ name, args?, output?, is_error?, call_id? }, ...],  // bounded; see below
    tool_call_total?: <raw tool_use count before truncation>,
    tool_calls_truncated?: true,                // only when total > 50
    thinking?:      "<concatenated thinking, truncated at 8 000 chars>",
    git_state?:     { captured_at, fresh, branch?, head_sha?, dirty_count? },
    branch?:        "<branch name>",
    permission_mode?: "<e.g. 'auto' | 'default'>",
    cli_version?:   "<Claude Code CLI version, e.g. '2.1.119'>",
    model?:         "<assistant model id, e.g. 'claude-opus-4-7'>"
  }
}
```

`tool_calls` are **structured summaries with overflow caps**, not raw full payloads: `args` and `output` are truncated (2 000 / 4 000 chars) with per-field `*_truncated` flags, the array is capped at `MAX_TOOL_CALLS_PER_TURN` = 50, and `thinking` is truncated at 8 000 chars (`src/capture/extractors/_turn_meta.ts:40-65`). `git_state` is sampled via `probeGitState`; on stale (boot-scanned) turns where the probe refuses, a partial `{ captured_at, fresh: false, branch }` is emitted from the JSONL's own `gitBranch` (`src/capture/extractors/claude-code.ts:564-581`).

`byte_offset` is the **resume checkpoint**: on daemon boot, `backfillOffsetMap` (`src/capture/extractors/claude-code.ts:485-502`) reconstructs per-session offsets from this field, so capture continues exactly where the previous run left off. No separate state file.

The content prefix `USER: ... \n\nASSISTANT: ...` (`src/capture/extractors/claude-code.ts:585`) matches [[cursor-extractor]] and [[codex-extractor]] by design — the MCP retrieval tool sees one consistent envelope across all three coding-agent surfaces.

## Empirical coverage on the live install

Probed on 2026-05-02 against `~/Library/Application Support/ECHO/echo.db` (after several days of running daemon):

| Metric | Value |
|---|---:|
| Distinct main-session JSONL files seen | 37 |
| Parsed turns from main sessions | 95 |
| Distinct projects represented | 4 (Project_echo, Echo_Extension, isr-demo-mohsen, $HOME root) |
| Turns with `had_tool_use: true` | 71 / 95 (75%) |
| Turns with no tool flag | 24 / 95 (25%) |
| Distinct subagent JSONL files seen | 69 |
| Parsed turns from subagent JSONLs | **0** |
| Raw FS-change events on the same files | 1,587 (from the generic [[fs-watcher]] surface, *not* the extractor) |

Translation: Claude Code main-session capture is dense and tool-heavy (3 in 4 turns invoke tools). The extractor's path filter matches subagent files in principle (they live under `~/.claude/projects/` and end in `.jsonl`), and a hand-probe confirms subagent JSONLs carry valid `message.role` + `message.content` structure with text-bearing assistant blocks — so the **0 parsed turns from 69 subagent files is an empirical gap worth a follow-up investigation**, not a documented design choice. Logged for triage in [`backlog/_followups.md`](../../../backlog/_followups.md).

To re-probe coverage in the future:

```bash
DB="$HOME/Library/Application Support/ECHO/echo.db"

# Parsed turns vs raw FS events, split by main vs subagent
sqlite3 "$DB" <<'SQL'
SELECT
  CASE
    WHEN source LIKE 'fs:%/.claude/projects/%subagents%' THEN 'subagent'
    WHEN source LIKE 'fs:%/.claude/projects/%' THEN 'main session'
  END AS kind,
  COUNT(DISTINCT source) AS files,
  SUM(CASE WHEN content LIKE 'USER:%ASSISTANT:%' THEN 1 ELSE 0 END) AS parsed_turns,
  SUM(CASE WHEN content LIKE '{"event_type"%' THEN 1 ELSE 0 END) AS raw_fs
FROM events
WHERE source LIKE 'fs:%/.claude/projects/%'
GROUP BY kind;
SQL
```

## What's deliberately not collected (and where it would have to come from)

> **Note:** tool-call payloads and thinking blocks used to live in this table; both now ship as bounded per-turn metadata (`tool_calls` / `tool_call_total` / `tool_calls_truncated` and `thinking`). See "What lands in `echo.db` per turn" above. The rows below are what *still* genuinely never reaches metadata.

| Signal | Why not collected today | Where it would come from |
|---|---|---|
| **`system`-type lines** (synthetic local-command stdout, etc.) | Not chat — it's the harness's own output | Could be promoted to a per-session `metadata.system_messages` summary if useful. |
| **`attachment`-type lines** (task_reminder, hook_additional_context, mcp_instructions_delta, skill_listing, deferred_tools_delta, hook_success, auto_mode) | Harness-level metadata about what Claude Code injected into the prompt; not user/agent content | Could be aggregated as session-level summary metadata; mostly debugging signal. |
| **`file-history-snapshot` lines** | Claude Code's own file-backup tracking, mirrored in `~/.claude/file-history/` | Out of scope; could be its own surface if a file-restore use case appears. |
| **`last-prompt` lines** | Redundant with the corresponding `user` line earlier in the same JSONL | None needed. |
| **Per-line top-level fields that now DO reach metadata** (`cwd` → `repo_root`, `gitBranch` → `git_state` / `branch`, `permissionMode` → `permission_mode`, `version` → `cli_version`, `message.model` → `model`) | Shipped (Tier A) — extractor pulls these in addition to `message.role`, `message.content`, and top-level `timestamp` | n/a — collected today |
| **Per-line top-level fields that still DON'T** (`parentUuid`, `isSidechain`, `promptId`, `uuid`, `entrypoint`, `userType`, `isMeta`, `requestId`, `sourceToolAssistantUUID`, `toolUseResult`) | Tracking / linkage fields with no clear retrieval value | Pure parser additions if a use case appears. |
| **Subagent JSONLs** (`<session>/subagents/agent-<id>.jsonl`) | Empirically 0 parsed turns despite path-filter match — open investigation | Likely a chokidar lifecycle / addDir-watching nuance, not a content issue. |
| **Subagent metadata** (`<session>/subagents/agent-<id>.meta.json`) | Not JSONL — extractor's `endsWith('.jsonl')` filter rejects | Parser-only follow-up if subagent-run summaries become useful. |
| **Tool-results subdirectory** (`<session>/tool-results/*.txt`) | Not JSONL; large tool outputs spill here when too big to inline | Out of scope; arguably duplicative of what `had_tool_use` already signals. |
| **`history.jsonl`** (interactive prompt history outside of sessions) | Different file outside `~/.claude/projects/` — not in the allowlist | Cross-session "what prompts have I tried before" — separate item; would require allowlist expansion. |
| **`~/.claude/CLAUDE.md`, `settings.json`, `settings.local.json`** | User memory and config; outside the allowlist | Could become its own [[capture-allowlist]] entry if memory-of-config becomes useful. |
| **`~/.claude/plugins/`, `shell-snapshots/`, `file-history/`, `image-cache/`, `paste-cache/`, `cache/`, `downloads/`, `plans/`, `sessions/`, `session-env/`, `ide/`, `debug/`, `backups/`, `statsig`, `stats-cache.json`** | Out of allowlist; mostly Claude Code internal state | Most have no clear retrieval value; if any do, parser-only additions after allowlist expansion. |
| **Multi-modal content** (images, file attachments inlined as content blocks) | Only `block.type === 'text'` reaches `text`; image/document blocks fall through `extractContent`'s switch | Parser extension; bigger lift if attachment payloads need to be persisted. |

## Tier-A per-turn metadata (shipped)

The Tier-A follow-up anticipated here (analogous to what shipped for Cursor) has now landed. Instead of a nested `metadata.context` block, the enrichment lives as flat per-turn metadata keys — `tool_calls` (each with `name` / `args` / `output` / `is_error` / `call_id`), `tool_call_total`, `tool_calls_truncated`, `thinking`, `files_referenced`, `repo_root`, `git_state`, `branch`, `permission_mode`, `cli_version`, `model` (see "What lands in `echo.db` per turn"). All are derived from the same JSONL `extractContent` already iterates over (`src/capture/extractors/claude-code.ts:162-215`) plus the per-line top-level fields `parseLine` reads (`src/capture/extractors/claude-code.ts:235-258`) — pure parser additions, no new surfaces. The shared truncation / `ToolCall` shape lives in `src/capture/extractors/_turn_meta.ts`, matching the Codex/Cursor extractors.

Remaining un-built parser extensions: promoting `system` / `attachment` lines to session-level summaries, persisting multi-modal / image blocks, and parsing subagent JSONLs (see the not-collected table above and "Empirical coverage").

## The gate also enforces this

`CAPTURED_SOURCES.fs_paths` (`src/capture/sources.ts:12-17`) declares only the four prefixes the extractors are allowed to touch:

```ts
[
  '~/Library/Application Support/Cursor/User/workspaceStorage/',
  '~/Library/Application Support/Cursor/User/globalStorage/',
  '~/.claude/projects/',
  '~/.codex/sessions/',
]
```

Any other file under `~/.claude/` (`history.jsonl`, `CLAUDE.md`, `settings.json`, `plugins/`, `shell-snapshots/`, etc.) would be rejected by [[capture-gate]] as `unknown_path` and never reach storage — even if a future code change tried to read it.

## Related

- [[claude-code-extractor]] — *how* Claude Code's data is read (lifecycle, byte-offset resume, partial-line robustness)
- [[capture-allowlist]] — the only paths under `~/.claude/` that ECHO is permitted to touch
- [[capture-gate]] — runtime enforcer
- [[storage]] — where the captured events end up; also the source of byte-offset backfill
- [[mcp-search-memories]] — the MCP tool that surfaces these events back to AI clients
- [[cursor-collected-data]] — sibling reference page for Cursor
- [[codex-collected-data]] — sibling reference page for OpenAI Codex
