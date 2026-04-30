---
id: 2026-04-30-011-claude-code-extractor
title: Claude Code extractor (chat turns, full text)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs:
  - wiki/entities/capture-gate.md
  - wiki/entities/storage.md
blocked_by:
  - 2026-04-30-009-fs-watcher-cursor-and-claude-code
acceptance:
  - "`extractClaudeCodeTurns(jsonlPath, lastByteOffset): Promise<{turns: ClaudeCodeTurn[], newOffset: number}>` exported from `src/capture/extractors/claude-code.ts`"
  - "Reads Claude Code's `<session>.jsonl` from the given byte offset; parses new lines; groups user/assistant lines into turns"
  - "`startClaudeCodeExtractor(storage)` integrates with the daemon: on FS watcher events for any Claude Code `*.jsonl`, runs the extractor, emits one `CandidateEvent` per new turn"
  - "Per-session state: in-memory `Map<session_path, byte_offset>`, backfilled on boot via storage query for the last event per session"
  - "Content shape: `USER: <user message>\\n\\nASSISTANT: <full assistant response>` (same convention as Cursor)"
  - "source: `claude-code:<session_id>` OR `fs:<jsonl_path>` (pick the same convention 010 picked)"
  - "metadata: `{ project, session_id, turn_index, mtime }`"
  - "Each CandidateEvent flows through `processCandidate` (item 006)"
  - "Tests cover: parsing fixture JSONL with N turns; resumption from byte offset; partial-line handling (a turn split mid-write); no duplicate emissions"
  - "Lag: extracted CandidateEvents reach storage within 500ms of Claude Code's message append (verify in agent_notes)"
  - "`npm run test`, `npm run lint`, `npm run typecheck` clean"
files_to_modify:
  - src/capture/extractors/claude-code.ts
  - src/daemon/index.ts
  - tests/capture/extractors/claude-code.test.ts
  - tests/fixtures/claude-code-session.jsonl

claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-04-30T23:10:05Z"
branch: "agent/claude-code-extractor"
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Claude Code extractor (chat turns, full text)

## What

A capture surface that turns Claude Code's append-only JSONL transcripts into `CaptureEvent`s — one event per conversation turn (user + assistant pair). Triggered by the existing FS watcher (item 009) when files under `~/.claude/projects/` change.

```ts
// src/capture/extractors/claude-code.ts
export interface ClaudeCodeTurn {
  project: string;
  session_id: string;
  turn_index: number;
  user_message: string;
  assistant_message: string;
  mtime: number;
}

export async function extractClaudeCodeTurns(
  jsonlPath: string,
  lastByteOffset: number,
): Promise<{ turns: ClaudeCodeTurn[]; newOffset: number }>;

export async function startClaudeCodeExtractor(
  storage: Storage,
): Promise<{ stop: () => Promise<void> }>;
```

Behavior:

- Claude Code's session files are JSONL — one JSON object per line, **append-only**. New messages mean new lines at the end of the file. This is the simplest possible incremental-read pattern.
- The extractor tracks the byte offset it has already read per file. On each FS event, it `read(file, lastOffset, file_size_now)` to get the new bytes, parses them line-by-line, groups consecutive user/assistant lines into turns, emits each turn through `processCandidate`.
- On boot, the daemon backfills the per-session offset map by querying storage for the most-recent event per `source: 'claude-code:<session>'`. (Approximate: query for the latest `metadata.turn_index`, then scan from the start to that turn count to derive an approximate offset. OR: store the offset itself in metadata so it's directly recoverable. The agent should pick whichever is simpler — documenting the choice in `agent_notes`.)

Same content format as Cursor:

```
USER: <user message>

ASSISTANT: <full assistant response>
```

## Why

Claude Code is the easier of the two extractors — JSONL is line-per-message by design, so "extract incrementally" is just "tail the file from the last byte we read." No schema probing, no SQLite reads, no debounce concerns. Sub-second lag is realistic.

This is also the second source for Wave 3's MCP demo arc. Together with item 010 (Cursor), the user now has full context across both AI coding tools — the killer demo's underlying data is in place.

## Acceptance Criteria

- [ ] `src/capture/extractors/claude-code.ts` exports `extractClaudeCodeTurns(jsonlPath, lastByteOffset)` and `startClaudeCodeExtractor(storage)`
- [ ] `extractClaudeCodeTurns` reads from `lastByteOffset` to end-of-file, parses each complete line as JSON, groups into turns
- [ ] **Partial-line handling**: if the last bytes don't end with `\n`, those bytes are NOT consumed — return a `newOffset` that is just before the partial line. Next call picks up from there. (FS event might fire mid-write.)
- [ ] Returns `{ turns, newOffset }` so caller can persist the offset
- [ ] Turn grouping: Claude Code's JSONL alternates between user and assistant entries (and sometimes tool_use/tool_result). For V1, pair consecutive `role: 'user'` + `role: 'assistant'` lines into a turn. Tool entries are dropped from the turn body but counted in `metadata` (e.g., `had_tool_use: true`).
- [ ] If a session file has only a user line with no assistant response yet, it is NOT emitted (incomplete turn). Wait for the assistant response.
- [ ] `startClaudeCodeExtractor`:
  - On boot, queries storage for the last `turn_index` per session source; backfills the offset map (approximation is OK — duplicates are caught implicitly because the offset advances; if we accidentally re-scan part of a file, we'd emit duplicates. Use a short SHA of `(session_id, turn_index, user_message_first_60_chars)` as a dedup key in memory for the first run after backfill, valid for ~10s.)
  - Hooks into the FS watcher (same mechanism item 010 settled on)
  - On each `*.jsonl` change: reads incrementally, emits new turns via `processCandidate`, advances offset
  - On `stop()`, persists offsets and releases handles
- [ ] `CandidateEvent` shape:
  - `source: 'claude-code:<session_id>'` (or whatever convention 010 picked — must match)
  - `timestamp: <ISO from the last line's mtime or message timestamp>`
  - `content: 'USER: <user_message>\\n\\nASSISTANT: <assistant_message>'`
  - `metadata: { project, session_id, turn_index, mtime, had_tool_use? }`
- [ ] Tests in `tests/capture/extractors/claude-code.test.ts`:
  - Fixture JSONL with N turns + 1 stray tool_use line
  - `extractClaudeCodeTurns(path, 0)` returns all N turns
  - Resumption: pass the returned `newOffset`, append more turns to the file, call again → returns only the new ones
  - Partial-line case: file ends mid-write (no trailing newline) → returns `newOffset` before the partial line; next call after the line is completed returns the full turn
  - Incomplete turn: only user line present, no assistant yet → emits zero events
  - End-to-end with `MemoryStorage`: simulate file growth across multiple FS events, assert correct events emitted in order with no duplicates
- [ ] Daemon registers + tears down the extractor in lifecycle
- [ ] Lag verification: median ≤500ms in `agent_notes`
- [ ] `npm run test`, `npm run lint`, `npm run typecheck` clean

## Out of Scope (Don't Drift)

- **Diff extraction** — git capture surface (item 012) handles that
- **Tool-call extraction** — the metadata `had_tool_use` flag is the limit; we don't extract tool inputs/outputs into the content. Future item if useful.
- **Multi-turn dialogue grouping** — each user→assistant pair = one turn. We don't group multi-turn sequences.
- **Embedding generation** — NULL on insert
- **Cross-session dedup** — each session tracked independently
- **Other Claude Code data** beyond the JSONL transcripts — no settings, no project metadata
- **Adding new dependencies** — pure stdlib (`fs.read`, `JSON.parse`)

## After Completion (Strategist Notes)

Once this item lands in `backlog/complete/`, the strategist's next task is to:

1. Create `wiki/entities/claude-code-extractor.md` documenting:
   - The byte-offset-tracking pattern
   - The user/assistant turn pairing rule
   - Partial-line robustness (FS events can fire mid-write)
   - Lag characteristics from `agent_notes`
   - Cross-references to [[cursor-extractor]] (sibling)
2. Update `docs/STATUS.md` — both extractors landed; content capture from both AI coding tools is live
3. Update manifest + index
