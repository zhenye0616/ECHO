# 2026-05-09 — Cursor capture diagnosis correction

**Status:** corrects the load-bearing diagnostic claim from `raw/internal/dogfooding/mcp-interactions-journal.md` 2026-05-08 20:55 PDT entry that drove the Cursor demotion in commit `961fe14`.
**Author:** Claude Code (this conversation, founder-supervised), with independent confirmation by Codex (journal entry 14:15 PDT) and Cursor's Claude (review at 14:04 PDT in composer `c15c2eca-...`).
**Decision archive convention:** mirrors `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md` — empirical SQLite probe transcript first, narrative correction second, downstream actions third.

## TL;DR

The 2026-05-08 V1.5.7 root-cause diagnosis ("Cursor migrated from `bubbleId:`/`composerData:` to `agentKv:`/`messageRequestContext:` on 2026-05-01; bubbleId table frozen since") was empirically incorrect on **all three** load-bearing claims. The diagnosis triggered the Cursor demotion in `wiki/product/v1-spec.md` and the agentKv: framing in `backlog/_followups.md`. Both were over-broad. ECHO's existing cursor extractor is **healthy and actively capturing** today's Cursor traffic.

## Evidence (live SQLite probe, 2026-05-09 ~13:45 PDT)

### Probe 1 — key-prefix counts in `cursorDiskKV`

```
prefix              count   notes
composerData:       1413    ← V1.5.7 said "frozen"
bubbleId:           1127    ← V1.5.7 said "frozen"
agentKv:             284    ← V1.5.7 said "256, replacement schema"
checkpointId:        280    ← NOT in V1.5.7 diagnosis
messageRequestContext: 96   ← V1.5.7 said "96, replacement schema"
codeBlockDiff:        84    ← NOT in V1.5.7 diagnosis
```

Source: `sqlite3 ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb "SELECT substr(key,1,instr(key,':')) AS prefix, COUNT(*) FROM cursorDiskKV GROUP BY prefix ORDER BY COUNT(*) DESC LIMIT 20;"`

### Probe 2 — composerData write recency

```
MIN(createdAt) = 2025-06-11 04:11:16 UTC
MAX(createdAt) = 2026-05-09 20:40:37 UTC   ← TODAY, 13:40 PDT
COUNT          = 1387 with non-null createdAt
```

The most recent composer is `c15c2eca-914a-4d9f-aceb-5d4c4dfac226`, **created today at 13:40 PDT — 7 minutes before the probe**. composerData writes are not frozen; they're active.

### Probe 3 — bubbleId for today's composer

```
bubbleId count for c15c2eca: 26 at probe time (~13:45 PDT)
                            78 at re-probe (~14:25 PDT — grew during the conversation)
fullConversationHeadersOnly array length: 78
```

The legacy bubbleId schema is being actively written by today's session. Re-probe confirmed 52 new bubbles in ~40 minutes of real-time activity.

### Probe 4 — agentKv:blob: shape

```
First sampled value: {"role":"system","content":"You are an AI coding assistant, powered by Composer..."}
Payload size: MIN=24, AVG=3239, MAX=58554 bytes across 298 entries
```

`agentKv:blob:` keys are **content-addressed** (sha256-looking hashes). Values are individual `{role, content}` records — including the Cursor system prompt. This is **deduped message-body storage**, not a chat-schema replacement. The value of dedup: the system prompt (~5KB) gets stored once across many sessions instead of inlined per-bubble.

### Probe 5 — messageRequestContext: linkage

```
Distinct composer UUIDs in messageRequestContext: keys: 27
Of those 27, how many ALSO have composerData entries: 27 (all)
Of those 27, bubbleId counts: range 37–166 per composer
Top fields in messageRequestContext value: terminalFiles, cursorRules,
  attachedFoldersListDirResults, summarizedComposers, todos, projectLayouts,
  knowledgeItems
```

`messageRequestContext:` is **per-message attached context** (file lists, todos, knowledge items) — additive metadata for some Cursor mode (likely Composer/Agent mode), layered ON TOP of legacy composerData/bubbleId. Not a replacement.

### Probe 6 — ECHO db capture health

```
Cursor events captured today (2026-05-09):    657
Cursor events captured 2026-05-08:            932
Cursor events captured 2026-05-07:            791
Latest extracted bubble pair (today's c15c2eca composer):
  source: fs:/Users/zhenye/Library/Application Support/Cursor/User/globalStorage/state.vscdb
  metadata.composer_id: c15c2eca-914a-4d9f-aceb-5d4c4dfac226
  metadata.user_bubble_id, assistant_bubble_id: present
```

ECHO's existing cursor extractor (`src/capture/extractors/cursor.ts`) **captures today's Cursor traffic correctly**. 7 extracted events for c15c2eca composer alone in the time window probed.

## Diagnosis correction

| V1.5.7 claim (2026-05-08 20:55 PDT journal) | Empirical reality (this probe) |
|---|---|
| bubbleId/composerData frozen since 2026-05-01 | **Active.** 1387/1413 composers post-2025-05-01; today's composer has 78 bubble entries actively growing. |
| agentKv:/messageRequestContext: replaced bubbleId | **Additive, not replacement.** All 27 messageRequestContext composers also have composerData. agentKv:blob: is deduped message-body content-addressed storage, not chat structure. |
| ECHO not capturing post-migration Cursor (8 days silent) | **Capturing fine.** 657 today, 932 yesterday, 791 the day before. The extractor never broke. |

## What was actually happening on 2026-05-08

V1.5.7 quieted ~902K orphan_assistant_bubble warnings in the daemon log (commit `4c6915f`). That **infrastructure spam** was real. But the diagnosis attached to it ("Cursor migrated schemas, capture is silently invisible") was speculation that wasn't probed. The orphan_assistant_bubble warnings come from the cursor extractor's checkpoint logic walking past mid-stream bubble writes — a parser-state issue, not a schema-migration issue. The patch fixed the symptom (spam) and the root cause (parser walking past WAL-pending bubbles), but the journal entry over-attributed the root cause to a non-existent migration.

The actual gap that needs investigation today (item 029, see `backlog/ready/2026-05-09-029-cursor-source-breakdown-falsification.md`) is: captured cursor atoms don't appear in `get_recent_work_context` `cluster.source_breakdown` despite healthy capture. That symptom has **three candidate root causes** (capture / clustering / truncation) per the `src/trace/index.ts:119` `countByApp(clusterAtoms)` reading — independently identified by both Codex and Cursor's Claude.

## Downstream actions (post-029-merge)

The strategist will, after item 029 lands in `backlog/complete/`:

1. **Reverse the wiki demotion:**
   - Remove `capture_status: degraded` frontmatter from `wiki/capture/cursor-extractor.md` and `wiki/capture/per-app/cursor-collected-data.md`
   - Remove the top-of-page warning callouts on both pages
   - Remove the "Cursor capture degraded" subsection from `wiki/product/v1-spec.md` "Known V1 Limitations"
   - Flip the Cursor row in the V1 Bundle table back to normal (no "currently degraded" flag)
2. **Amend the journal entry:** add a `[CORRECTED 2026-05-09]` block to the 2026-05-08 20:55 PDT entry pointing at this decision file. Keep the original entry text intact (historical fidelity); append the correction.
3. **Move `_followups.md` "Cursor capture — `agentKv:` migration" from "Known V1 degraded surfaces" to a new "Resolved (with corrected diagnosis)" subsection** noting the gate trigger (founder-stack-change → Cursor Pro 2026-05-09) AND the corrected understanding of what was actually wrong.

If item 029's three-way falsification surfaces a real cursor-side capture gap (e.g., the agent-mode composers genuinely need agentKv: extraction beyond legacy bubble pairs), 029 hands off to a follow-on item 030 (`agentKv:` enrichment) — but only if measurement supports it, not narrative.

## Convergent verification

- **Codex** (journal 14:15 PDT): independent code-read of `src/trace/index.ts:119` `countByApp(clusterAtoms)` confirms 3-way ambiguity; recommends three-way falsification AC.
- **Cursor's Claude** (composer `c15c2eca` bubble `f28acde5...` at ~14:04 PDT): same code-read, same 3-way framing, identical recommendation.
- Three independent agents converged on the same diagnosis correction. Strong confidence in the correction.
