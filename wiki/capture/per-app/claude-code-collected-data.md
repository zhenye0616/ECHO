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

ECHO captures the **plain user and assistant text from every Claude Code main-session turn**, plus the project slug, session UUID, monotonic turn index, and a `had_tool_use` boolean per turn. Stable IDs let you group by chat (`session_id`) or by project (`project`). All Claude Code signals outside `~/.claude/projects/<project>/<session>.jsonl` are deliberately not collected today: tool-call payloads, hidden thinking blocks, file-history snapshots, attachments, system caveats, the slash-command stream, and every other directory under `~/.claude/`.

## The watched path

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
~/.claude/projects/<project-slug>/<session-id>/subagents/agent-<id>.jsonl   (matched in principle, but see "Empirical coverage" below)
```

`<project-slug>` is Claude Code's URL-safe encoding of the cwd the session was launched in (e.g. `/Users/zhenye/Desktop/Project_echo` → `-Users-zhenye-Desktop-Project-echo`). `<session-id>` is a v4 UUID.

The extractor watches `~/.claude/projects/` recursively (`src/capture/extractors/claude-code.ts:275-279`); on every `add` or `change` whose path satisfies `path.startsWith(projectsPrefix) && path.endsWith('.jsonl')` (`src/capture/extractors/claude-code.ts:229-231`), the dispatcher schedules an incremental tail of that file. Files are opened **read-only** (`open(path, 'r')`, `src/capture/extractors/claude-code.ts:113`).

`session_id` is derived from `basename(path, '.jsonl')` (`src/capture/extractors/claude-code.ts:84-87`); `project` is the parent directory name (`src/capture/extractors/claude-code.ts:89-91`).

## Claude Code's JSONL line shape

Each line is one event. Real lines (probed against the live session `4e273691-…` on 2026-05-02, first 500 lines) carry one of six top-level `type` values:

| Top-level `type`           | Per session | What it is | Read by ECHO? |
|---|---:|---|---|
| `user`                     | many | A user-role message line. `message.role === "user"`, `message.content` is string-or-array | ✅ when `text` non-empty after extraction |
| `assistant`                | many | An assistant-role message line | ✅ when `text` non-empty after extraction |
| `system`                   | a few | Synthetic injected blurbs (e.g. local-command stdout) | ❌ — `parseLine` returns null because there is no `.message` field (`src/capture/extractors/claude-code.ts:69-70`) |
| `attachment`               | a few | Hook-additional-context, task-reminder, mcp_instructions_delta, skill_listing, etc. | ❌ — same reason |
| `file-history-snapshot`    | a few | Claude Code's per-message file-backup checkpoints (under `~/.claude/file-history/`) | ❌ — same reason |
| `last-prompt`              | a few | A short trailing line carrying the user's last prompt verbatim and `sessionId` only | ❌ — same reason |

Only `user` and `assistant` lines have a `message: {role, content}` substructure, and `parseLine` (`src/capture/extractors/claude-code.ts:60-82`) ignores everything else.

For each `message`, `role` is one of:

| `message.role` | What it is | Read by ECHO? |
|---|---|---|
| `user`         | What you typed, OR a synthetic tool_result block, OR a meta-caveat | ✅ — but tool_result-only and empty-text user lines are skipped (`text === ''` filter, `src/capture/extractors/claude-code.ts:149-152`) |
| `assistant`   | What Claude replied | ✅ — same empty-text filter applies |
| (anything else) | not produced by Claude Code today | ❌ — `parseLine` rejects (`src/capture/extractors/claude-code.ts:73`) |

For `message.content`, the value is **either a string OR an array of content blocks** (handled in `extractContent`, `src/capture/extractors/claude-code.ts:38-58`):

| `content` shape | What it is | Read by ECHO? |
|---|---|---|
| `string`                          | Plain user prompt or simple assistant reply | ✅ — used verbatim, `hasTool: false` |
| `array of {type, ...}` blocks     | Multi-block message (the common case for assistant lines) | ✅ — see block table below |

For each content block:

| `block.type`     | What it is | Read by ECHO? |
|---|---|---|
| `text`           | The visible text the user/agent emits | ✅ — concatenated into `text` |
| `tool_use`       | The agent invoked a tool | ❌ payload, ✅ `had_tool_use` flag |
| `tool_result`    | A tool returned output | ❌ payload, ✅ `had_tool_use` flag |
| `thinking`       | Hidden reasoning block | ❌ — silently dropped by `extractContent` (no branch matches) |
| (other, e.g. images) | Multi-modal content | ❌ — silently dropped by `extractContent` |

Lines whose extracted `text` is empty (e.g. a user-role line whose only content block is a `tool_result`) are dropped before pairing (`src/capture/extractors/claude-code.ts:149-152`); `had_tool_use` carries forward via `hadToolBetween` so the next emitted turn still records that tools fired during it.

Top-level fields **on every user/assistant line** but not read by ECHO: `parentUuid`, `isSidechain`, `promptId`, `uuid`, `userType`, `entrypoint`, `cwd`, `sessionId`, `version`, `gitBranch`, `isMeta`, sometimes `permissionMode`, `requestId`, `sourceToolAssistantUUID`, `toolUseResult`. All ignored — `parseLine` only reaches in for `message`, `message.role`, `message.content`, and the top-level `timestamp` (`src/capture/extractors/claude-code.ts:69-80`).

## User/assistant pairing rule

The extractor walks lines in file order and groups them into turns (`src/capture/extractors/claude-code.ts:143-186`):

1. A `user` line with non-empty `text` becomes `pendingUser`.
2. A `user` line that arrives while another is pending logs `user_replaced_without_assistant` and overwrites (`src/capture/extractors/claude-code.ts:155-157`).
3. An `assistant` line with non-empty `text` and a `pendingUser` set emits one turn, advances `turn_index`, clears the pending state.
4. An `assistant` line with no pending user logs `orphan_assistant` and is dropped (its `had_tool_use` still carries forward via `hadToolBetween`, `src/capture/extractors/claude-code.ts:164-167`).
5. A trailing user with no assistant yet emits zero turns and stays pending — the next FS event picks it up.

So one stored turn is **one user line paired with the next text-bearing assistant line**, regardless of how many tool_use / tool_result / thinking blocks sat between them. Tool blocks are not themselves turns; they only flip `had_tool_use`.

## What lands in `echo.db` per turn

Built in `handleJsonlChange` (`src/capture/extractors/claude-code.ts:233-261`):

```ts
{
  source:    "fs:/Users/<you>/.claude/projects/<project>/<session>.jsonl",
  timestamp: <ISO 8601 from the assistant message's top-level `timestamp`,
              falling back to file mtime when absent>,
  content:   "USER: <user_message>\n\nASSISTANT: <assistant_message>",
  metadata: {
    project:       "<project-slug>",     // parent dir name, e.g. "-Users-zhenye-Desktop-Project-echo"
    session_id:    "<UUID>",             // basename minus .jsonl
    turn_index:    <0-based, monotonically increasing per session>,
    mtime:         <ms epoch — the file's mtimeMs at extraction time>,
    byte_offset:   <file offset just past the last line consumed for this turn>,
    had_tool_use?: true                  // omitted when false (line 245)
  }
}
```

`byte_offset` is the **resume checkpoint**: on daemon boot, `backfillOffsetMap` (`src/capture/extractors/claude-code.ts:191-209`) reconstructs per-session offsets from this field, so capture continues exactly where the previous run left off. No separate state file.

The content prefix `USER: ... \n\nASSISTANT: ...` (`src/capture/extractors/claude-code.ts:249`) matches [[cursor-extractor]] and [[codex-extractor]] by design — the MCP retrieval tool sees one consistent envelope across all three coding-agent surfaces.

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

| Signal | Why not collected today | Where it would come from |
|---|---|---|
| **Tool-call payloads** (which tool, what arguments, what output) | Tier-A-style extraction not yet implemented; would inflate row size meaningfully | Parser-only follow-up: read `block.type === 'tool_use'` (`name`, `input`) and `block.type === 'tool_result'` (`output`) from the same JSONL. The `had_tool_use` flag already proves the data is in arm's reach. |
| **Thinking blocks** (`block.type === 'thinking'`) | Out of scope for V1 retrieval — clutters search; doubles storage; many turns are >50% thinking by token count | Parser-only addition. Should ship behind a config flag. Same shape as Codex's reasoning blocks ([[codex-collected-data]]). |
| **`system`-type lines** (synthetic local-command stdout, etc.) | Not chat — it's the harness's own output | Could be promoted to a per-session `metadata.system_messages` summary if useful. |
| **`attachment`-type lines** (task_reminder, hook_additional_context, mcp_instructions_delta, skill_listing, deferred_tools_delta, hook_success, auto_mode) | Harness-level metadata about what Claude Code injected into the prompt; not user/agent content | Could be aggregated as session-level summary metadata; mostly debugging signal. |
| **`file-history-snapshot` lines** | Claude Code's own file-backup tracking, mirrored in `~/.claude/file-history/` | Out of scope; could be its own surface if a file-restore use case appears. |
| **`last-prompt` lines** | Redundant with the corresponding `user` line earlier in the same JSONL | None needed. |
| **Per-line top-level fields** (`parentUuid`, `gitBranch`, `cwd`, `version`, `entrypoint`, `userType`, `permissionMode`, `requestId`, `sourceToolAssistantUUID`, `toolUseResult`) | None reach `metadata` today; the extractor only pulls `message.role`, `message.content`, and top-level `timestamp` | Pure parser additions if a use case appears. `cwd` and `gitBranch` are likely the highest-value next picks. |
| **Subagent JSONLs** (`<session>/subagents/agent-<id>.jsonl`) | Empirically 0 parsed turns despite path-filter match — open investigation | Likely a chokidar lifecycle / addDir-watching nuance, not a content issue. |
| **Subagent metadata** (`<session>/subagents/agent-<id>.meta.json`) | Not JSONL — extractor's `endsWith('.jsonl')` filter rejects | Parser-only follow-up if subagent-run summaries become useful. |
| **Tool-results subdirectory** (`<session>/tool-results/*.txt`) | Not JSONL; large tool outputs spill here when too big to inline | Out of scope; arguably duplicative of what `had_tool_use` already signals. |
| **`history.jsonl`** (interactive prompt history outside of sessions) | Different file outside `~/.claude/projects/` — not in the allowlist | Cross-session "what prompts have I tried before" — separate item; would require allowlist expansion. |
| **`~/.claude/CLAUDE.md`, `settings.json`, `settings.local.json`** | User memory and config; outside the allowlist | Could become its own [[capture-allowlist]] entry if memory-of-config becomes useful. |
| **`~/.claude/plugins/`, `shell-snapshots/`, `file-history/`, `image-cache/`, `paste-cache/`, `cache/`, `downloads/`, `plans/`, `sessions/`, `session-env/`, `ide/`, `debug/`, `backups/`, `statsig`, `stats-cache.json`** | Out of allowlist; mostly Claude Code internal state | Most have no clear retrieval value; if any do, parser-only additions after allowlist expansion. |
| **Multi-modal content** (images, file attachments inlined as content blocks) | Only `block.type === 'text'` reaches `text`; image/document blocks fall through `extractContent`'s switch | Parser extension; bigger lift if attachment payloads need to be persisted. |

## Future extensions (Tier A and beyond)

A natural Tier-A follow-up (analogous to what shipped for Cursor) would surface a structured `metadata.context` block per turn:

```ts
metadata.context = {
  tool_calls?:    [{ name: "Bash", summary: "git status" }, ...],
  tool_outputs?:  [{ name: "Bash", exit_code: 0, snippet: "..." }, ...],
  thinking_count?: 3,        // how many reasoning blocks, without their content
  cwd?:            "/Users/<you>/Desktop/Project_echo",   // from any line in the turn
  gitBranch?:      "main",
}
```

All five live in the same JSONL `extractContent` already iterates over (`src/capture/extractors/claude-code.ts:38-58`) — pure parser additions, no new surfaces.

## The gate also enforces this

`CAPTURED_SOURCES.fs_paths` (`src/capture/sources.ts:7-12`) declares only the four prefixes the extractors are allowed to touch:

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
