---
status: shipped
topic: Architecture
subtopic: Capture Surfaces
aliases:
  - Codex Extractor
  - codex-extractor
  - Codex Session Extractor
---

# Codex Extractor

## Definition

The Codex extractor (`src/capture/extractors/codex.ts`) tails OpenAI's Codex CLI session transcripts at `~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ISO>-<uuid>.jsonl` and emits one `CaptureEvent` per `(user → assistant cluster)` pair. It is the third turn-shaped capture surface, after [[claude-code-extractor]] and [[cursor-extractor]], and converges on the same `USER: …\n\nASSISTANT: …` content envelope so MCP retrieval works uniformly across all three.

## Public Contract

```ts
interface CodexExtractorHandle {
  stop: () => Promise<void>;
  probeFreshness: () => Promise<FreshnessProbe>;
}

function startCodexExtractor(
  storage: Storage,
  options?: { sessionsPrefix?: string },
): Promise<CodexExtractorHandle>;
```

The daemon calls `startCodexExtractor(storage)` on boot. The handle's `stop()` closes the chokidar watcher and waits for the in-flight processing chain to drain.

## Why Codex Specifically

Codex is the OpenAI agent CLI that runs inside terminals (often inside Cursor's integrated terminal). For users who use Cursor as an IDE rather than for its built-in agent — a real workflow we observed — the Cursor extractor captures little signal while Codex captures everything that matters. Adding the Codex extractor closes that gap with the same shape ECHO already uses for Claude Code.

## The Watched Path

```
~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ISO>-<uuid>.jsonl
```

Codex partitions its session log files by date. The extractor watches the entire `~/.codex/sessions/` prefix recursively (chokidar handles the recursion natively) and matches any `*.jsonl` under it. Each rollout file is **append-only** and **one session per file**, identical to Claude Code's pattern.

For details of what fields ECHO reads from each line — and what it deliberately ignores — see [[codex-collected-data]].

## The Pairing Rule: User → Cluster of Consecutive Assistant Messages

A typical Codex session contains roughly **3–4× more assistant messages than user messages** (assistants stream multi-paragraph replies plus reasoning + tool turns). The extractor pairs each user message with **every consecutive assistant message until the next user or Codex's `task_complete` event**, joining their texts with `\n\n`. This matches the cluster pattern adopted by [[cursor-extractor]] for the same reason.

```
user q1
assistant a1a       ┐
assistant a1b       ├─ one turn:  "USER: q1\n\nASSISTANT: a1a\n\na1b\n\na1c"
assistant a1c       ┘
user q2             ─── closes the cluster above; opens a new pending cluster
assistant a2        ─── still pending until next user or task_complete
(plain EOF)         ─── pending; not emitted until a close signal appears
```

A trailing user with no assistant or a trailing user→assistant cluster with no closing next-user is **not emitted**. The byte offset stays before the pending region so the next pass re-reads it once Codex appends more lines.

## The Byte-Offset Tail

Each emitted event records the file's byte offset just past the last consumed line. On boot, the extractor scans storage for prior `fs:<path>.jsonl` events with metadata `byte_offset`, builds a per-file resume map, and starts each subsequent pass from the recorded position. This is the same pattern as [[claude-code-extractor]] and is **idempotent across daemon restarts** — re-runs never duplicate turns.

The "only advance through emitted clusters" rule is critical: pending clusters live AFTER the recorded offset, so they get re-parsed (not re-emitted) on the next pass. When the closing next-user or `task_complete` finally arrives, the cluster emits exactly once.

## What Is Captured Per Turn

```ts
{
  source: `fs:${jsonlPath}`,
  timestamp: <ISO from the last assistant message in the cluster>,
  content:   `USER: ${user_text}\n\nASSISTANT: ${joined_assistant_cluster}`,
  metadata: {
    session_id:   "<UUID — Codex's session ID, parsed from the rollout filename>",
    turn_index:   <0-based, monotonically increasing per session>,
    mtime:        <ms epoch when the file was last touched>,
    byte_offset:  <file offset just past the last line consumed for this turn>,
    cwd?:         "<working directory the Codex session was launched in>",
    repo_root?:   "<same value as cwd today, used for cross-source grouping>",
    had_tool_use?: true,  // omitted when false
    git?: {
      sha?:        "<session-start HEAD from Codex's session_meta>",
      branch?:     "<session-start branch>",
      origin_url?: "<session-start origin URL>"
    },
    codex?: {
      source?:              "<cli | vscode | exec | other>",
      cli_version?:         "<Codex CLI version>",
      model_provider?:      "<model provider>",
      model?:               "<model from turn_context>",
      reasoning_effort?:    "<effort from turn_context>",
      personality?:         "<personality from turn_context>",
      approval_policy?:     "<approval policy>",
      sandbox_policy_type?: "<sandbox type>"
    },
    tool_calls?: [
      {
        name: "<tool name>",
        args?: "<truncated args, <= 2 KB>",
        output?: "<truncated output, <= 4 KB>",
        is_error?: true,
        call_id?: "<Codex call_id>"
      }
    ],
    thinking?: "<concatenated reasoning summary, <= 8 KB>",
    git_state?: {
      head_sha?: "<fresh HEAD sampled by ECHO>",
      branch?: "<fresh branch>",
      dirty_count?: <number>,
      captured_at: "<ISO sample time>",
      fresh: true
    }
  }
}
```

`session_id` doubles as the chat thread identifier. `cwd` lets you filter or group by which project the session was running in (Codex captures cwd in the `session_meta` line; the extractor caches it and stamps every emitted turn from that pass). `tool_calls` and `thinking` are bounded before storage so one tool-heavy turn cannot explode the event size.

## What It Does NOT Do

- **Does not read outside `~/.codex/sessions/`.** `auth.json`, `history.jsonl`, `logs_2.sqlite`, `state_5.sqlite`, `models_cache.json`, and every other Codex-side file remain out of scope unless the allowlist changes.
- **Does not capture `developer`-role messages.** These are typically `AGENTS.md` instructions or environment context Codex injects at session start — system prompts, not chat. Skipped.
- **Does not store unbounded tool or reasoning payloads.** Tool args are capped at 2 KB, tool outputs at 4 KB, reasoning summaries at 8 KB, and tool calls at 50 per turn.
- **Does not emit pending clusters on plain EOF.** A cluster emits when the next user arrives or Codex writes a `task_complete` event. A trailing cluster without either close signal stays pending so it can be re-read safely on the next append.
- **Does not write to Codex's data.** Files are opened read-only; ECHO only tails appends.

## Related

- [[codex-collected-data]] — field-by-field reference of every Codex JSONL field the extractor reads vs ignores
- [[claude-code-extractor]] — sibling JSONL extractor; same byte-offset and turn-shape patterns
- [[cursor-extractor]] — sibling extractor with the same multi-message cluster pairing rule
- [[capture-pipeline]] — downstream consumer of each emitted candidate
- [[capture-gate]] — accepts `fs:<jsonl-path>` against the allowlist
- [[capture-allowlist]] — declares `~/.codex/sessions/` under `fs_paths`
- [[storage]] — the persistence layer accepted turns flow into
