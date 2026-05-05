---
status: shipped
topic: Architecture
subtopic: Per-App Data Collection
aliases:
  - Codex Data Collection
  - What ECHO Collects from Codex
  - Codex Capture Reference
---

# Codex — Collected Data Reference

A field-by-field record of what ECHO reads from OpenAI Codex's local session transcripts, where it lives, and what it ends up as in the unified `CaptureEvent`. Mechanics live in [[codex-extractor]]; this page is about the **data**.

## TL;DR

ECHO captures the **plain user and assistant text from every Codex session**, plus the working directory the session was launched in, a `had_tool_use` boolean per turn, and a structured per-turn snapshot of the session's git state and Codex configuration (model, reasoning effort, sandbox + approval policy, cli version, source surface, personality). Stable IDs let you group by chat (`session_id`) and per-turn ordering is preserved. Tool call payloads, reasoning blocks, developer-role system prompts, and Codex's internal event metadata are deliberately not collected today.

## The watched path

```
~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<ISO>-<uuid>.jsonl
```

Each `.jsonl` is an append-only transcript of one Codex session. Codex partitions them by date; the extractor watches the entire `~/.codex/sessions/` tree recursively. Files are opened **read-only**.

## Codex's JSONL line shape

Each line is one event in the session. The top-level envelope is uniform:

```json
{ "timestamp": "<ISO 8601>", "type": "<kind>", "payload": { ... } }
```

Across a real Codex install (probed against ~25 recent sessions, 5 representative breakdowns shown):

| `type`           | Per session count | What it is | Read by ECHO? |
|---|---:|---|---|
| `session_meta`   | 1 (always first) | Session start: id, cwd, timestamp, source, cli_version, git | ✅ `cwd`, `source`, `cli_version`, `model_provider`, `git.{commit_hash,branch,repository_url}` |
| `turn_context`   | 1–31 | Turn-level config: model, effort, personality, sandbox/approval policy, etc. | ✅ `model`, `effort`, `personality`, `approval_policy`, `sandbox_policy.type` |
| `event_msg`      | 7–107 | Status events (token counts, lifecycle pings, etc.) | ❌ |
| `response_item`  | 5–120 | The actual message stream — user, assistant, reasoning, tools | ✅ filtered (see below) |

For each `response_item`, the inner `payload.type` partitions further:

| `payload.type`              | What it is | Read by ECHO? |
|---|---|---|
| `message`                   | A user/assistant/developer text turn | ✅ for `role` ∈ {user, assistant} only |
| `reasoning`                 | Assistant's hidden thinking block | ❌ |
| `function_call`             | Assistant invoked a tool | ❌ payload, ✅ `had_tool_use` flag |
| `function_call_output`      | Tool result | ❌ payload, ✅ `had_tool_use` flag |
| `custom_tool_call`          | Newer custom-tool variant | ❌ payload, ✅ `had_tool_use` flag |
| `custom_tool_call_output`   | Newer custom-tool result | ❌ payload, ✅ `had_tool_use` flag |
| `ghost_snapshot`            | State checkpoint of some kind | ❌ |

For `message` payload, `role` is one of:

| `role`        | What it is | Read by ECHO? |
|---|---|---|
| `user`        | What you typed | ✅ |
| `assistant`   | What Codex replied | ✅ |
| `developer`   | System / AGENTS.md / environment context Codex injects | ❌ — system noise, not chat |

For `message.content[]`, each content block has a `type`:

| `content[].type` | What it is | Read by ECHO? |
|---|---|---|
| `input_text`     | A user-written text block | ✅ — concatenated into `user_message` |
| `output_text`    | An assistant-emitted text block | ✅ — concatenated into `assistant_message` |
| (other, e.g. images, attachments) | Multi-modal content | ❌ today |

## What lands in `echo.db` per turn

```ts
{
  source:    "fs:/Users/<you>/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-...jsonl",
  timestamp: <ISO 8601 from the last assistant message in the cluster>,
  content:   "USER: <user_text>\n\nASSISTANT: <joined assistant cluster, \\n\\n-separated>",
  metadata: {
    session_id:    "<UUID — Codex's session ID, parsed from rollout filename>",
    turn_index:    <0-based, monotonically increasing per session>,
    mtime:         <ms epoch — when the JSONL was last touched>,
    byte_offset:   <file offset just past the last line consumed for this turn>,
    cwd?:          "<working directory the Codex session was launched in>",
    repo_root?:    "<canonical alias of cwd; mirrors cwd today>",
    had_tool_use?: true,   // omitted when false
    git?: {                // populated when session_meta.git is present (~75–79% of threads)
      sha?:        "<HEAD commit hash at session start>",
      branch?:     "<branch at session start>",
      origin_url?: "<git remote 'origin' URL>"
    },
    codex?: {              // populated when session_meta and/or turn_context carry config
      source?:              "vscode" | "cli" | "exec" | <other>,  // which surface launched the session
      cli_version?:         "<e.g. 0.128.0-alpha.1>",
      model_provider?:      "<e.g. openai>",
      model?:               "<e.g. gpt-5.5>",
      reasoning_effort?:    "<e.g. xhigh>",
      personality?:         "<e.g. pragmatic>",
      approval_policy?:     "on-request" | "never" | "untrusted" | <other>,
      sandbox_policy_type?: "read-only" | "workspace-write" | "danger-full-access" | <other>
    }
  }
}
```

`git` and `codex` are only attached when the underlying fields are observed; sessions written by older Codex versions (or scenarios where git isn't applicable) cleanly omit them. Both are persisted across daemon restarts via the offset map, so a turn whose `session_meta`/`turn_context` lines were consumed in a prior pass still carries them.

A "turn" is a user message paired with **every consecutive assistant message until the next user**. See [[codex-extractor]] § "Pairing Rule" for the rationale (Codex emits ~3–4 assistant messages per user, and a 1:1 pairing would silently drop most of the response).

## Empirical coverage on a real Codex install

Probed on 2026-05-01 against the 25 newest session files in `~/.codex/sessions/`:

| Metric | Value |
|---|---:|
| Sessions sampled | 25 |
| Turns extracted | 206 |
| Turns with `had_tool_use: true` | 160 (78%) |
| Turns with `cwd` | 206 (100%) |
| Distinct sessions touched | 20 |

Translation: Codex sessions are tool-heavy (the agent uses shell + file tools constantly), and every turn carries a stable working directory you can group by. The `had_tool_use` boolean is on most turns; pulling tool details would be a meaningful future extension.

## What's deliberately not collected (and where it would have to come from)

| Signal | Why not collected today | Where it would come from |
|---|---|---|
| **Tool-call payloads** (which tool, what arguments, what output) | Tier-A-style extraction not yet implemented | Parser-only follow-up: read `function_call.{name,arguments}` and `function_call_output.output` from the same JSONL. ~150 LOC including truncation rules. |
| **Reasoning blocks** (the assistant's hidden thinking) | Out of scope for V1 retrieval (clutters search; doubles storage) | If/when useful, parser-only addition. Should probably ship behind a config flag. |
| **Developer-role messages** (AGENTS.md text, environment context) | System noise, not chat | Could be promoted to a per-session `metadata.developer_context` field if useful. |
| **`event_msg` lines** (token counters, lifecycle pings) | Not chat content | Could be aggregated as session-level summary metadata (e.g. running token totals). |
| **`turn_context.permission_profile.entries`** (per-path access list) | Larger blob than the type-only summary already captured | If "did this turn have access to file X" becomes a question, parse the granular entries into a structured field. |
| **`session_meta.payload.base_instructions.text`** (Codex's full system prompt + personality declaration) | Multi-KB blob; high signal but bulks every event | Could capture a SHA256 (deduplication-friendly) instead of the full text, or a hash + first-N-chars. |
| **Multi-modal content** (images, file attachments) | Codex JSONL stores these as content blocks but only `input_text` / `output_text` are extracted | Parser extension — bigger lift if attachment payloads need to be persisted. |
| **`logs_2.sqlite` (active session log DB)** and **`state_5.sqlite` (threads / agent jobs)** | Most threads-table fields are also in `session_meta` / `turn_context` (now captured). The two truly SQLite-only fields are `title` (Codex's auto-summary) and `archived` (user action). | Out-of-scope for V1 — would require a new allowlisted path. Defer until auto-titles become a needed signal. |
| **`history.jsonl`** (interactive prompt history outside of sessions) | Interactive REPL history, not session transcripts | Probably valuable as cross-session "what prompts have I tried" — separate item. Same shape as `~/.claude/history.jsonl`; one shared extractor could handle both. |

## Future extensions (Tier A and beyond)

A natural Tier-A follow-up (analogous to what shipped for Cursor) would surface a structured `metadata.context` block per turn:

```ts
metadata.context = {
  tool_calls?:    [{ name: "shell", summary: "ls /tmp" }, ...],
  tool_outputs?:  [{ name: "shell", exit_code: 0, snippet: "..." }, ...],
  reasoning_count?: 3,        // how many reasoning blocks, without the content
}
```

All three live in the same JSONL the extractor already reads — pure parser additions.

## The gate also enforces this

`CAPTURED_SOURCES.fs_paths` declares only the four prefixes the extractors are allowed to touch:

```ts
[
  '~/Library/Application Support/Cursor/User/workspaceStorage/',
  '~/Library/Application Support/Cursor/User/globalStorage/',
  '~/.claude/projects/',
  '~/.codex/sessions/',
]
```

Any other file under `~/.codex/` (auth.json, history.jsonl, logs_2.sqlite, state_5.sqlite, models_cache.json, etc.) would be rejected by [[capture-gate]] as `unknown_path` and never reach storage.

## Related

- [[codex-extractor]] — *how* Codex's data is read (lifecycle, pairing rule, byte-offset resume)
- [[capture-allowlist]] — the only paths under Codex that ECHO is permitted to touch
- [[capture-gate]] — runtime enforcer
- [[storage]] — where the captured events end up
- [[mcp-search-memories]] — the MCP tool that surfaces these events back to AI clients
- [[claude-code-collected-data]] — sibling reference page for Claude Code (queued)
- [[cursor-collected-data]] — sibling reference page for Cursor
