---
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - Claude Code Extractor
  - claude-code-extractor
  - Claude Code Session Extractor
---

# Claude Code Extractor

## Definition

The Claude Code extractor (`src/capture/extractors/claude-code.ts`) tails Claude Code's per-session JSONL transcripts and emits one `CaptureEvent` per `(user, assistant)` turn pair. It is the simpler sibling of [[cursor-extractor]] — Claude Code writes append-only JSON-per-line by design, so incremental capture reduces to "remember the last byte we read; read forward."

## Public Contract

```ts
interface ClaudeCodeExtractorHandle {
  stop: () => Promise<void>;
}

function startClaudeCodeExtractor(
  storage: Storage,
  options?: { projectsPrefix?: string },
): Promise<ClaudeCodeExtractorHandle>;
```

The daemon registers the extractor on boot; `stop()` closes the chokidar watcher and awaits the in-flight processing chain.

## The Watched Path

```
~/.claude/projects/<project-slug>/<session-id>.jsonl
```

Each session is a single append-only file. The extractor watches `~/.claude/projects/` recursively; on every `add` or `change` whose path ends `.jsonl`, the dispatcher schedules an incremental tail of that file.

`session_id` is derived from the basename (minus `.jsonl`); `project` is the parent directory name.

## Byte-Offset Tailing

The extractor maintains an in-memory map keyed by absolute path:

```ts
Map<jsonlPath, { offset: number; turn_index: number }>
```

On each FS event, `extractClaudeCodeTurns(path, lastOffset)` stats the file, reads `[lastOffset, fileSize)` into a buffer, splits on newlines, and parses complete lines. The returned `newOffset` is `lastOffset + bytes_consumed`, where bytes_consumed counts only bytes up through the last `\n`. The caller persists this back into the offset map.

Because the offset is the actual byte position (not an approximation), there is no need for a content-hash dedup window. The same byte range cannot be processed twice within a session.

## Backfill on Boot

Before the watcher starts, `backfillOffsetMap` scans existing storage:

```ts
storage.query()
  .filter(evt => evt.source.startsWith('fs:') && evt.source.endsWith('.jsonl'))
  .reduce((map, evt) => {
    const { byte_offset, turn_index } = evt.metadata;
    // Keep the entry with the largest offset per path
  });
```

Each accepted turn writes its `byte_offset` and `turn_index` into `metadata`. On a fresh daemon boot, the extractor reconstructs per-session resume points from those events and continues exactly where the previous run left off. Idempotent across daemon restarts; no separate state file.

## User/Assistant Turn Pairing

JSONL lines are alternating `role: 'user'` and `role: 'assistant'` messages, sometimes interleaved with `tool_use` / `tool_result` content blocks. The extractor:

1. Walks lines in file order.
2. On a `user` line with non-empty text, holds it as `pendingUser`.
3. On an `assistant` line with non-empty text, pairs it with the pending user, emits one turn, advances `turn_index`, clears the pending state.
4. Tool blocks (`tool_use`, `tool_result`) flip a `had_tool_use` flag for the in-flight turn but do not themselves become turns.
5. A user line that arrives while another user is pending is logged warn (`user_replaced_without_assistant`) and replaces the pending state.
6. An assistant line with no pending user is logged warn (`orphan_assistant`) and dropped.
7. A trailing user with no assistant yet emits zero turns and stays pending — the next FS event picks it up.

## Partial-Line Robustness

FS events can fire mid-write. If the buffer ends with an incomplete JSON line (no trailing `\n`), the extractor finds the last newline and consumes only up to that point. The partial bytes stay unread — `newOffset` does not advance past them — and the next FS event re-reads them along with whatever was appended in the meantime. No half-parsed JSON ever reaches the gate.

## The Candidate Event Shape

```ts
{
  source: `fs:${jsonlPath}`,
  timestamp: <ISO from the assistant message's timestamp, falling back to file mtime>,
  content: `USER: ${user_message}\n\nASSISTANT: ${assistant_message}`,
  metadata: {
    project: string,
    session_id: string,
    turn_index: number,
    mtime: number,
    byte_offset: number,
    had_tool_use?: true,  // omitted when false
  },
}
```

The content shape and `fs:` source prefix match [[cursor-extractor]] by design — the MCP retrieval tool sees one consistent turn envelope across both AI coding tools, and joins them by timestamp at query time.

## What it does NOT do

- **Does not extract diffs.** Code change capture is [[git-capture]]'s job.
- **Does not extract tool inputs/outputs into content.** Tool blocks only flip `metadata.had_tool_use`; their payloads are not stored.
- **Does not group multi-turn dialogues.** One `(user, assistant)` pair = one event. No conversation aggregation.
- **Does not dedup across sessions.** Each session is tracked independently.
- **Does not capture other Claude Code data** (settings, project metadata, tool-results subdirectory).
- **Does not throw on parse failure.** Unparseable lines are skipped silently; handler errors are caught and logged.
- **Does not embed.** The `embedding` column stays NULL on insert; populated later by the embedding pipeline.

## Related

- [[cursor-extractor]] — sibling extractor that converges on the same `USER: ... ASSISTANT: ...` turn shape
- [[fs-watcher]] — generic surface watching the same `~/.claude/projects/` paths for non-content signals
- [[capture-pipeline]] — downstream consumer of each emitted candidate
- [[capture-gate]] — accepts `fs:<jsonl-path>` against the allowlist
- [[storage]] — the persistence layer accepted turns flow into; also the source of byte-offset backfill
