---
type: drift-event
date: 2026-04-30
item: 2026-04-30-010-cursor-extractor
agent: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
disposition: escalated
---

# Drift event: Cursor chat is NOT in per-workspace `state.vscdb`

## Context

Item 010 (`cursor-extractor`) specifies an extractor that "Reads Cursor's
`state.vscdb` SQLite file, queries the chat history table(s)" and is
"Triggered by the existing FS watcher (item 009) when Cursor's
`state.vscdb` files change". Item 009 wired
`~/Library/Application Support/Cursor/User/workspaceStorage/` into
`CAPTURED_SOURCES.fs_paths`, so the FS watcher already monitors per-workspace
state files.

The spec's mental model: chat turns are persisted into each workspace's own
`state.vscdb`; the extractor opens that DB, walks the chat-shaped tables,
emits one `CandidateEvent` per turn with `metadata.workspace_id` = the
workspace hash directory name.

## What I found

Schema-only probe (no chat content read; sqlite_master + key prefixes + value
lengths only) across ~20 workspaces under
`~/Library/Application Support/Cursor/User/workspaceStorage/`:

| Per-workspace `state.vscdb` | Observation |
|---|---|
| `cursorDiskKV` row count | **0** in every workspace probed |
| `ItemTable.aiService.prompts` length | mostly 2 (`[]`); a couple workspaces had 148–2370 bytes — these are the legacy Cmd-K inline-prompt path, not composer chat |
| `ItemTable.aiService.generations` length | similar — almost always `[]` |
| `ItemTable.composer.composerData` length | 100s–1000s of bytes, but value is **composer metadata only** (ids, mode, createdAt, hasUnreadMessages…) — no message text |

I did not read chat content out of any DB; I only inspected lengths and
sqlite_master so the agent transcript stays free of Cursor's user data.

By contrast, `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
has:

- `cursorDiskKV` row count = **3393**
- key-prefix sample: `bubbleId:`, `composerData:`, `agentKv:`,
  `checkpointId:`, `codeBlockDiff:`, `inlineDiffs-<workspace-hash>` (per
  workspace), …

That is, in current Cursor (probed against the local install on
2026-04-30), composer chat — the user/assistant turn content the killer
demo wants — lives in **globalStorage**, not per-workspace.

The `composer.composerData` entry inside each workspace `state.vscdb` only
maps that workspace to a list of `composerId`s; the actual messages
("bubbles") sit globally under
`cursorDiskKV.bubbleId:<composerId>:<bubbleId>`.

## Why this is drift, not a small adaptation

Three concrete consequences for the spec as written:

1. **The FS watcher won't fire on chat events.** Workspaces' `state.vscdb`
   only mutates when composer *metadata* (created/archived/title) changes,
   not on every turn. The lag-in-storage acceptance criterion ("median ≤2s")
   cannot be measured because there are no events to measure.

2. **`metadata.workspace_id` is ambiguous.** A composer can be referenced from
   one workspace but its bubbles live globally; bubbles also have no direct
   workspace pointer. To reconstruct workspace_id you'd have to scan every
   per-workspace `composer.composerData` and inverse-map composerId →
   workspace. That logic doesn't exist anywhere in the spec.

3. **The recommended source-string convention breaks.** Spec acceptance
   recommends `fs:<path-to-state.vscdb>` to reuse the existing fs allowlist.
   But the path that *contains* chat is `globalStorage/state.vscdb`, which
   item 009 did not allowlist. Either the allowlist needs another entry, or
   the convention has to change.

These aren't implementation details I can resolve with a code probe and a
sensible default. They are spec-shape decisions about (a) what surface to
watch, (b) how to name the unit of state-tracking
(workspace_id vs composerId), and (c) what source string flows through the
gate. Picking any of them silently would lock in a contract that the
strategist and founder didn't agree to.

## Options for the founder/strategist

**Option 1 — Watch globalStorage; track per-composer.**
Add `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
(or its parent dir) to `CAPTURED_SOURCES.fs_paths`. Treat `composerId` as
the unit; `Map<composerId, last_seen_bubble_id>`. Drop `workspace_id` from
metadata or mark it nullable. Source string: `fs:<global-state.vscdb-path>`
or a new `cursor-chat:<composerId>` kind.

  Pros: captures real chat content; matches Cursor's actual layout.
  Cons: rewrites the per-workspace tracking model. May want to refresh
  `metadata.workspace_id` later by joining against per-workspace
  `composer.composerData`.

**Option 2 — Watch globalStorage *and* keep per-workspace mapping.**
Same as Option 1 plus, on each per-workspace `state.vscdb` change, refresh
an in-memory `composerId → workspace_hash` index from that workspace's
`composer.composerData`. Bubbles emitted with the most-recent known
mapping.

  Pros: preserves the spec's `metadata.workspace_id` shape.
  Cons: more code, new race (bubble appears globally before its workspace
  records the composer), needs a fallback for un-mapped composerIds.

**Option 3 — Defer composer chat; capture only the legacy aiService path.**
Implement the extractor against per-workspace
`ItemTable.aiService.prompts` / `aiService.generations` (where small amounts
of legacy Cmd-K data still appear). Spec is satisfied literally — workspace
state.vscdb is read, schema is probed, events flow when present — at the
cost of capturing very little of what users actually do in Cursor today.

  Pros: smallest change; respects spec's "no allowlist change" hint
  literally; FS watcher fires on the right files.
  Cons: misses the killer-demo content (composer chats with the AI), which
  is the whole point of the surface.

## My recommendation, for the record (not acted on)

Option 1 is the smallest change that actually delivers what the spec was
trying to deliver. `metadata.workspace_id` becomes a "best-effort"
field: populated when the per-workspace `composer.composerData` index has
seen the composerId, otherwise omitted. The audit page never relies on
workspace_id structurally.

But I am not making that call myself — the spec was written assuming a
storage layout that doesn't match Cursor's reality, so the right move is to
rewrite the spec, not to interpret the existing one.

## What I did not do

- Did not write any code in `src/capture/extractors/`.
- Did not modify `CAPTURED_SOURCES.fs_paths`.
- Did not read Cursor chat content out of any DB into the agent transcript.
- Did not push the empty `agent/cursor-extractor` worktree branch (no
  commits to push).

## Pointer

Question handed to founder via item file `agent_notes` and run log:
- `backlog/pending_review/2026-04-30-010-cursor-extractor.md`
- `raw/internal/agent-runs/2026-04-30-2026-04-30-010-cursor-extractor.md`
