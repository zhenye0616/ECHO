---
status: shipped
capture_status: degraded
topic: Architecture
subtopic: Per-App Data Collection
aliases:
  - Cursor Data Collection
  - What ECHO Collects from Cursor
  - Cursor Capture Reference
---

# Cursor — Collected Data Reference

> ⚠️ **Capture degraded since 2026-05-01.** Cursor's `cursorDiskKV` chat storage migrated from `bubbleId:` / `composerData:` (documented below) to `agentKv:blob:` / `messageRequestContext:`. The reference below describes what the *legacy* layout contains, which is what ECHO's V1 extractor reads. Conversations created or extended after 2026-05-01 live in `agentKv:` rows and are silently invisible to ECHO until a new extractor lands. See [[cursor-extractor]] for status; see `backlog/_followups.md` "Cursor capture — known V1 degraded surface" for why the rewrite is gated on cohort dogfooding signal rather than scheduled for V1.6.

A field-by-field record of what ECHO reads from Cursor's local data, where it lives, and what it ends up as in the unified `CaptureEvent`. This is reference documentation for "what context do I actually have?" — not a strategic decision page. The *mechanics* of how the watcher and parser work live in [[cursor-extractor]]; this page is about the **data**.

## TL;DR

ECHO captures the **plain text of every Composer/Agent chat turn**, plus three structured context lists when populated: **files the user attached**, **files the assistant referenced**, **files the assistant deleted**. Since item 034 (commit `c00a7e7a`) the bubble text is no longer limited to the primary `'text'` field — when `text` is empty the extractor derives content from a **fallback chain** (`toolFormerData` → `fileDiff` → `codeBlocks` body → `thinkingContent`), and records which source each assistant bubble used in **`metadata.bubble_text_sources[]`**. Tool-using turns now also surface **`metadata.tool_calls[]`** (derived from `toolFormerData` frames) and **`metadata.had_tool_use`**, and thinking-bubble content is mirrored into **`metadata.thinking`**. Stable IDs let you group by chat (`composer_id`) or workspace (`workspace_id`). The signals still deliberately not collected today: inline Tab autocomplete, terminal output, editor state, lint state, generated-diff content, and web/doc references.

## The two watched paths

```
~/Library/Application Support/Cursor/User/
   ├── globalStorage/
   │     ├── state.vscdb          ← SQLite — all chat content lives here
   │     ├── state.vscdb-wal      ← WAL; only used as a "Cursor wrote" pulse
   │     └── state.vscdb-shm      ←  (not opened/read; just triggers chokidar)
   └── workspaceStorage/<hash>/
         └── state.vscdb          ← per-workspace SQLite; only used to map
                                     composer_id → workspace_hash
```

Both opened **read-only** (`{ readonly: true, fileMustExist: true }` plus the `?mode=ro` SQLite URI). ECHO never writes to Cursor data.

## Cursor's `cursorDiskKV` row kinds

`globalStorage/state.vscdb` has one table, `cursorDiskKV (key TEXT PRIMARY KEY, value TEXT)`, with two key-prefixes that matter:

```
key                                       value
─────────────────────────────────────     ────────────────────────────────────────────
composerData:<composer-uuid>              { composerId, createdAt, fullConversationHeadersOnly: [...], ~22 other fields }
bubbleId:<composer-uuid>:<bubble-uuid>    { _v, type, text, bubbleId, codeBlocks, ... ~60 other fields per bubble }
```

There are also other key prefixes Cursor uses (prompt history, completion events, etc.) — not currently read. See [Future capture surfaces](#future-capture-surfaces).

## Per-`composerData:*` row — 4 fields read

Used to identify the chat thread, anchor timestamps, and order bubbles within it.

| Cursor field | Used for | ECHO output |
|---|---|---|
| `composerId` | The chat thread's stable identifier | `metadata.composer_id` |
| `createdAt` (ms epoch) | Chronological anchor — synthetic per-bubble timestamps are computed as `createdAt + bubble's position` | drives `timestamp` on each emitted event |
| `fullConversationHeadersOnly[].bubbleId` | Determines which bubbles belong to this composer + their order | drives bubble→position map |
| `fullConversationHeadersOnly[].type` | Each header carries `1` (user) or `2` (assistant); used to size the cluster | (consistency check) |

Cursor also stores: `richText`, `conversation`, `status`, `context`, `gitGraphFileSuggestions`, `userResponsesToSuggestedCodeBlocks`, `generatingBubbleIds`, `isReadingLongFile`, `codeBlockData`, `originalModelLines`, `newlyCreatedFiles`, `newlyCreatedFolders`, `tabs`, `selectedTabIndex`, `hasChangedContext`, `capabilities`, `forceMode`, `codebaseSearchSettings`, `isFileListExpanded`, `hasLoaded`. **None of these are read.** Most are scrubbed-empty in real Cursor data anyway (probed empirically; see below).

## Per-`bubbleId:*` row — fields read

This is where chat content lives. Since item 034 (commit `c00a7e7a`) the text-derivation is a **fallback chain**, not a single `text` field, and several derived metadata fields are surfaced from tool/thinking frames.

| Cursor field | Used for | ECHO output |
|---|---|---|
| `type` (number) | Role: `1` = user, `2` = assistant. Anything else triggers `unrecognized_bubble_shape: unknown_type` and the bubble is dropped. | `metadata.user_bubble_id` / `metadata.assistant_bubble_ids[]` |
| `text` (string), then fallbacks | The plain message text. Primary `v.text` wins when non-empty (the 99% case); otherwise the chain `toolFormerData` → `fileDiff` (`attachedHumanChanges.fileDiff`) → `codeBlocks` body → `thinkingContent` fires in precedence order, first non-empty derivation wins | `content: "USER: <text>\n\nASSISTANT: <joined cluster>"`; the per-bubble source is recorded in `metadata.bubble_text_sources[]` whenever any bubble used a fallback |
| `toolFormerData` | Tool-call frames (Agent/Composer modes): best-effort `name`, `rawArgs`/`params` → `args`, `result`/`text` → `output`, `isError` → `is_error` | `metadata.tool_calls[]` + `metadata.had_tool_use: true` |
| `thinkingContent` / `thinking` | Assistant reasoning bubbles | concatenated into `metadata.thinking` (also kept in `assistant_message`) |
| `attachedFileCodeChunksUris[].path` | Files the user dragged into the chat (user bubbles) | `metadata.context.attached_files[]` |
| `codeBlocks[].uri.path` + `codeBlocks[].languageId` | Files the assistant referenced or wrote code for (assistant bubbles) | `metadata.context.referenced_files[]` |
| `deletedFiles[].uri.path` | Files the assistant deleted in the turn | `metadata.context.deleted_files[]` |

Cursor also stores ~60 other fields per bubble. Notable ones explicitly **not** read:

- `richText` — markdown / formatting structure (we keep only plain `text`)
- `interpreterResults`, `consoleLogs` — interpreter / console outputs the agent saw (tool-call outputs themselves are now surfaced via `metadata.tool_calls`, derived from `toolFormerData` — see above)
- `gitDiffs`, `assistantSuggestedDiffs`, `suggestedCodeBlocks`, `fileDiffTrajectories`, `diffsForCompressingFiles`, `diffsSinceLastApply` — generated diff content
- `lints`, `approximateLintErrors`, `multiFileLinterErrors` — editor diagnostic state
- `recentlyViewedFiles`, `recentLocationsHistory` — what the user was browsing
- `webReferences`, `docsReferences`, `externalLinks` — URLs cited
- `commits`, `pullRequests` — VCS context the agent saw
- `attachedCodeChunks`, `codebaseContextChunks`, `relevantFiles`, `attachedFolders` — context the agent attached
- `cursorRules` — active project rules
- `humanChanges`, `attachedHumanChanges`, `summarizedComposers` — cross-thread context
- `images`, `notepads`, `todos` — auxiliary user content
- `_v`, `bubbleId`, `tokenCount`, `usageUuid`, `serverBubbleId`, `timingInfo`, `intermediateChunks` — internal tracking
- `capabilities`, `capabilitiesRan`, `capabilityStatuses`, `capabilityContexts`, `supportedTools` — Cursor's internal capability state
- `unifiedMode`, `useWeb`, `projectLayouts`, `editToolSupportsSearchAndReplace` — UI / mode flags
- `isAgentic`, `isChat`, `isRefunded`, `uiElementPicked`, `existedSubsequentTerminalCommand`, `existedPreviousTerminalCommand` — bool flags
- `editTrailContexts`, `allThinkingBlocks`, `attachedFoldersListDirResults`, `attachedFoldersNew`, `attachedFileCodeChunksUris[].fragment/_formatted` — lower-priority lists or sub-fields
- `knowledgeItems`, `documentationSelections`, `currentFileLocationData`, `checkpointId`, `lastTerminalCwd` — context Cursor tracks for itself

## Per-workspace inference — 1 thing read

From `workspaceStorage/<hash>/state.vscdb`:

```sql
SELECT value FROM ItemTable WHERE key = 'composer.composerData';
```

Parsed for `allComposers[].composerId`. ECHO builds an in-memory `composer_id → workspace_hash` map. When a turn is emitted, the extractor looks up the composer; if found, `metadata.workspace_id` is set. Otherwise the field is **omitted entirely** (not null).

No chat content is read from workspace DBs.

## What lands in `echo.db` per turn

```ts
{
  source:    "fs:/Users/.../Cursor/User/globalStorage/state.vscdb",
  timestamp: <ISO 8601, synthesized from composer.createdAt + bubble position>,
  content:   "USER: <user_message>\n\nASSISTANT: <joined assistant cluster>",
  metadata: {
    composer_id:           "<UUID — chat thread ID>",
    user_bubble_id:        "<UUID — user bubble>",
    assistant_bubble_id:   "<UUID — last bubble in cluster, used as resume checkpoint>",
    assistant_bubble_ids:  ["<UUID>", "<UUID>", ...],   // every assistant bubble in the cluster
    mtime:                 <ms epoch when state.vscdb was last touched>,
    workspace_id?:         "<workspace hash — best-effort>",
    repo_root?:            "<absolute repo path — item 037>",  // see "Repo attribution" below
    is_continuation?:      true,                                // item 036 — present only on continuation atoms
    continuation_of_assistant_bubble_id?: "<UUID>",             // item 036 — pointer to the original cluster's last bubble
    context?: {
      attached_files?:     ["<path>", ...],            // dedup'd, in order
      referenced_files?:   [{ path, language? }, ...], // dedup'd by path
      deleted_files?:      ["<path>", ...]             // dedup'd
    }
  }
}
```

`context` is omitted entirely if all three sub-arrays would be empty. Each sub-key is omitted if its array would be empty. So a "pure chat" turn with no file references gets a clean event without an empty `context` block.

### Repo attribution — `metadata.repo_root` (item 037)

Each emitted atom carries `metadata.repo_root` when the extractor can resolve it. Two-stage resolution:

1. **Stage 1 (preferred):** parse Cursor's per-workspace `workspace.json` `folder` field (e.g., `file:///Users/zhenye/Desktop/Project_echo`), `fileURLToPath` + percent-decode → absolute path.
2. **Stage 2 (fallback):** when `workspace.json` isn't available (fresh composer without workspace binding), file-walk via `files_referenced` in the bubble's context. Walk to the nearest `.git` ancestor; use the path if it's unambiguous (single `.git` parent across all referenced files); omit if ambiguous.

`repo_root` is the substrate-side half of [[work-artifact-first-class]]. Pre-037 atoms (legacy composers, captured 2026-05-09 and earlier) lack this field; [[mcp-echo-resolve-mru|`echo_resolve_mru`]]'s Phase 2 legacy fallback recovers them via the workspace-hash → composer-id chain.

### Continuation atoms — `is_continuation` + `continuation_of_assistant_bubble_id` (item 036)

When Cursor writes post-checkpoint assistant bubbles before the next user bubble (a frequent pattern in agent mode), those bubbles emit as separate continuation atoms instead of being silently dropped:

- `metadata.is_continuation: true` — present only on continuation atoms (absent / undefined on normal atoms).
- `metadata.continuation_of_assistant_bubble_id: "<UUID>"` — set iff `is_continuation === true`; points to the last bubble of the original cluster (the join key for stitching the logical turn).

Consumer join pattern: group atoms by `metadata.user_bubble_id` for a deduplicated logical-turn view; continuation atoms share `user_bubble_id` with their original cluster.

## Empirically: what's actually populated in real Cursor data?

Probed on 2026-05-01 against a live Cursor install (1,111 bubble rows, ~33 composers):

| Bubble field | Bubbles non-empty | Notes |
|---|---:|---|
| `text` | 1,110 / 1,111 | The one missing row was malformed; dropped with `missing_text` warn |
| `richText` | most | Cursor stores both; ECHO uses only `text` |
| `codeBlocks` | 144 | 233 entries total — the highest-value Tier-A signal |
| `attachedFileCodeChunksUris` | 16 | User attaches |
| `deletedFiles` | 14 | Files removed |
| `gitDiffs`, `toolResults`, `relevantFiles`, `lints`, `webReferences`, `cursorRules`, `interpreterResults`, `consoleLogs`, `attachedCodeChunks`, `codebaseContextChunks`, `attachedFolders`, `fileDiffTrajectories`, `suggestedCodeBlocks`, `docsReferences`, `externalLinks` | **0** | All empty in this install. Either Cursor scrubs them post-completion, only populates them in specific modes the founder doesn't use, or they're deprecated fields. Not extracted today. |

Translation to captured events: of 105 turns extracted, **36 carry a `context` block** (34% coverage). Across those 36: 42 `attached_files`, 49 `referenced_files`, 0 `deleted_files`.

To re-probe shapes in the future:

```bash
DB="$HOME/Library/Application Support/Cursor/User/globalStorage/state.vscdb"

# Per-bubble field coverage
sqlite3 "file:$DB?mode=ro" "
  SELECT 'codeBlocks' AS field,
         COUNT(*) AS bubbles_non_empty
  FROM cursorDiskKV
  WHERE key LIKE 'bubbleId:%'
    AND json_array_length(json_extract(value, '\$.codeBlocks')) > 0;
"

# Top-level bubble keys (which fields exist at all)
sqlite3 "file:$DB?mode=ro" "
  SELECT (SELECT json_group_array(j.key) FROM json_each(value) j)
  FROM cursorDiskKV
  WHERE key LIKE 'bubbleId:%'
  LIMIT 1;
"
```

If a future Cursor version starts populating one of the currently-empty fields with useful data, that triggers a parser-only follow-up. The `unrecognized_bubble_shape` warn would not fire (it only fires on parse failures, not on new-fields), so the strategist needs to re-probe periodically.

## What's deliberately not collected (and where it would have to come from)

| Signal | Why not collected today | Where it would have to come from |
|---|---|---|
| **Tab autocomplete suggestions** (Cmd+I, inline ghosts) | Not persisted in `cursorDiskKV` | A Cursor / VS Code extension, or LSP-style hooks |
| **Cmd+K inline edits** | Same | Same |
| **User's manual file edits** | Cursor doesn't write these to its DB | An editor extension, or a [[fs-watcher]] that diffs project files (heavy) |
| **Terminal output (in Cursor's integrated terminal)** | Not persisted readably | TTY hook / shell instrumentation |
| **What the user looked at without typing** | OS-level signal, not in any file | macOS Accessibility API (deferred Swift shim) |
| **LSP signals (hover, goto, references)** | Editor-runtime only | Editor extension |
| **Run/debug/test session output** | Editor-runtime; not persisted | Editor extension or stdout interception |
| **Tool-call payloads** | Now extracted via the `toolFormerData` fallback (item 034, commit `c00a7e7a`) → `metadata.tool_calls[]` with best-effort `name` / `args` / `output` / `is_error`. The legacy `toolResults` / `interpreterResults` bubble fields remain empty in real data and are not read; `toolFormerData` is the populated shape | Collected today (via `toolFormerData`); `interpreterResults` parser-only extension if it ever populates |
| **Generated diff content** | In bubble's `gitDiffs` / `assistantSuggestedDiffs`, always empty in real data; the *resulting* commits are fully captured by [[git-capture]] anyway | git-watcher already covers shipped diffs |
| **Editor state (open tabs, breakpoints)** | Stored elsewhere in workspaceStorage; mostly not useful as memory | Could be added later if a use case appears |

## The gate also enforces this

Even if a future code change tried to read from a different path under Cursor, the [[capture-gate]] would reject it. `CAPTURED_SOURCES.fs_paths` declares only:

```ts
[
  '~/Library/Application Support/Cursor/User/workspaceStorage/',
  '~/Library/Application Support/Cursor/User/globalStorage/',
  '~/.claude/projects/',
  '~/.codex/sessions/',
]
```

Any other Cursor file (settings JSONs, history, recent-files index, etc.) would be rejected as `unknown_path` and never reach storage.

## Future capture surfaces

If/when ECHO needs deeper Cursor signal, three tiers map cleanly to effort:

- **Tier B** (parser-only, small): more `cursorDiskKV` keys beyond `bubbleId:*` and `composerData:*` — prompt history, completion accept/reject events, file-search history. Same architecture; no new permissions. Worth scoping when one of those signals proves useful.
- **Tier C** (new surface, medium): a Cursor / VS Code extension that streams autocomplete, inline edits, navigations, and tool runs into the daemon over a local socket. Needs Cursor to allow extensions of the right scope; needs daemon to expose an ingest endpoint. Probably its own multi-week wave.
- **Tier D** (new surface, heaviest): the deferred Swift Accessibility shim. Captures any foregrounded window's content via OS-level APIs. The big-hammer fallback if Cursor closes off extensibility paths. Permission UX is the main cost.

## Related

- [[cursor-extractor]] — the *mechanics* of how this data is read (lifecycle, debounce, pairing rules, error handling)
- [[capture-allowlist]] — the only paths under Cursor that ECHO is permitted to touch
- [[capture-gate]] — runtime enforcer
- [[storage]] — where the captured events end up
- [[mcp-search-memories]] — the MCP tool that surfaces these events back to AI clients
- [[claude-code-extractor]] — sibling extractor for Claude Code (analogous reference page would be valuable)
- [[stack-decision]] — why the Swift shim that would unlock Tier D was deferred
