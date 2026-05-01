---
status: shipped
topic: Architecture
subtopic: Per-App Data Collection
aliases:
  - Cursor Data Collection
  - What ECHO Collects from Cursor
  - Cursor Capture Reference
---

# Cursor — Collected Data Reference

A field-by-field record of what ECHO reads from Cursor's local data, where it lives, and what it ends up as in the unified `CaptureEvent`. This is reference documentation for "what context do I actually have?" — not a strategic decision page. The *mechanics* of how the watcher and parser work live in [[cursor-extractor]]; this page is about the **data**.

## TL;DR

ECHO captures the **plain text of every Composer/Agent chat turn**, plus three structured context lists when populated: **files the user attached**, **files the assistant referenced**, **files the assistant deleted**. Stable IDs let you group by chat (`composer_id`) or workspace (`workspace_id`). All other Cursor signals — inline Tab autocomplete, terminal output, editor state, lint state, suggested diff content, web/doc references, tool-result payloads — are deliberately not collected today.

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

## Per-`bubbleId:*` row — 5 fields read

This is where chat content lives.

| Cursor field | Used for | ECHO output |
|---|---|---|
| `type` (number) | Role: `1` = user, `2` = assistant. Anything else triggers `unrecognized_bubble_shape: unknown_type` and the bubble is dropped. | `metadata.user_bubble_id` / `metadata.assistant_bubble_ids[]` |
| `text` (string) | The plain message text | `content: "USER: <text>\n\nASSISTANT: <joined cluster>"` |
| `attachedFileCodeChunksUris[].path` | Files the user dragged into the chat (user bubbles) | `metadata.context.attached_files[]` |
| `codeBlocks[].uri.path` + `codeBlocks[].languageId` | Files the assistant referenced or wrote code for (assistant bubbles) | `metadata.context.referenced_files[]` |
| `deletedFiles[].uri.path` | Files the assistant deleted in the turn | `metadata.context.deleted_files[]` |

Cursor also stores ~60 other fields per bubble. Notable ones explicitly **not** read:

- `richText` — markdown / formatting structure (we keep only plain `text`)
- `toolResults`, `interpreterResults`, `consoleLogs` — tool-call outputs the agent saw
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
    context?: {
      attached_files?:     ["<path>", ...],            // dedup'd, in order
      referenced_files?:   [{ path, language? }, ...], // dedup'd by path
      deleted_files?:      ["<path>", ...]             // dedup'd
    }
  }
}
```

`context` is omitted entirely if all three sub-arrays would be empty. Each sub-key is omitted if its array would be empty. So a "pure chat" turn with no file references gets a clean event without an empty `context` block.

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
| **Tool-call full payloads** | In bubble's `toolResults` / `interpreterResults`, but always empty in real data so far | If/when populated: parser-only extension |
| **Generated diff content** | In bubble's `gitDiffs` / `assistantSuggestedDiffs`, always empty in real data; the *resulting* commits are fully captured by [[git-capture]] anyway | git-watcher already covers shipped diffs |
| **Editor state (open tabs, breakpoints)** | Stored elsewhere in workspaceStorage; mostly not useful as memory | Could be added later if a use case appears |

## The gate also enforces this

Even if a future code change tried to read from a different path under Cursor, the [[capture-gate]] would reject it. `CAPTURED_SOURCES.fs_paths` declares only:

```ts
[
  '~/Library/Application Support/Cursor/User/workspaceStorage/',
  '~/Library/Application Support/Cursor/User/globalStorage/',
  '~/.claude/projects/',
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
