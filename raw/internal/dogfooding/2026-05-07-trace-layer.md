# Dogfooding journal — V1.5 trace layer (`get_recent_work_context`)

**Item shipped:** [`2026-05-06-018-recent-work-context-tool`](../../../backlog/complete/2026-05-06-018-recent-work-context-tool.md)
**Dogfooding window:** 2026-05-07 → ~2026-05-21 (2 weeks; extend if signal is thin)
**Sources active in store:** claude-code, codex, cursor, git
**Goal:** generate enough observations to know what V1.5+ should fix, what V2 should preserve, and whether item 017 (`search_memories` returning normalized atoms) is even needed.

## How to use this journal

Fill an entry **in the moment** when ECHO's `get_recent_work_context` either delights or disappoints. The cost should be ~30 seconds per entry — copy the template, jot a one-liner, move on. Aspirational entries written at end-of-week are useless; lossy in-the-moment entries are gold.

This journal is the **input**; the V1.5+ backlog items the strategist writes after the window are the **output**. Don't try to design fixes here — just observe.

## Quick-fill observation template

Copy this block when adding an entry:

```
### YYYY-MM-DD HH:MM — <one-line context>
- **Trigger:** what I (or Cursor's Claude) just did that called the tool
- **Query inputs:** since=…  until=…  artifact_hint=…
- **Returned:** N clusters, M atoms; top cluster: "<label or none>"; rank_reasons: […]
- **Verdict:** ✅ right / 🟡 partial / ❌ wrong
- **Note:** one-line observation — what felt right or off
- **Conjecture:** (optional) what algorithm/config change might help
```

## What to watch for (from item 018's "what V1.5 will teach us")

Use these as the prompts you scan against during the day:

| Signal category | Sounds like | Implication |
|---|---|---|
| **Artifact-identity policy joins** | "Two atoms reference the same file but ECHO split them into different clusters" | The canonical-id rule needs amendment (most likely a different fallback for some artifact type) |
| **4h window correctness** | "ECHO included Friday morning's work in Monday's cluster" or "ECHO split a coherent 6h thread" | Default window needs tuning; possibly per-source |
| **Label heuristic quality** | "The label said 'discussion about <random file>' which was misleading" | Heuristic needs work, or `label?` should be dropped from V1.5 |
| **Rank ordering vs gut** | "I expected the open-loop cluster first; ECHO ranked it third" | Tune ranking signals or add a new one |
| **Edge-kind sufficiency** | "Two atoms about the same idea but no shared artifact got split" | `temporal_near` / `same_conversation` edges might be needed in V1.5.1 |
| **AI client uptake** | "Claude in Cursor responded better / worse / not differently when the trace was available" | Validates whether the contract is right |
| **Latency** | "I waited" or "felt instant" | 500ms p95 SLO holds or doesn't |
| **Open-loop hint quality** | "ECHO surfaced an 'open question' that was actually closed" | Atom-level hint regex too greedy; or hint-resolution work moved up from V2 |
| **Source-diversity bias** | "All 12 atoms were Cursor; the matching Claude Code session was missing" | Storage query may need ordering; or normalizer dropped events silently |

If something happens that doesn't fit any of these, **make a new category and call it out** — that's the highest-signal observation.

## Daily entries

### 2026-05-07 — dogfooding day 1

*(no entries yet — fill as observations arrive)*

---

## Aggregated learnings (filled at end of window)

*To be written by the founder + strategist together at end of window. Sections to cover:*

- **What's the trace layer's actual hit rate** (% of calls that returned the right cluster) on a representative sample
- **Most common failure modes** (ranked by frequency and severity)
- **Surprises** (positive and negative — things we didn't predict in item 018's spec)
- **Whether the founder's daily workflow felt different** (the V1.5 north star)
- **Whether Claude-in-Cursor used the graph** vs ignored it
- **Whether item 017 is needed** based on real use, or if `get_recent_work_context` makes `search_memories` mostly redundant

## Recommendations / candidate V1.5+ backlog items

*Filled at end of window. Each candidate item should name:*

- The observation it's responding to (link to the daily entry/entries)
- The proposed change (algorithm / shape / config)
- Estimated cost
- Whether it's a minor tune (V1.5.1) or a structural change (V1.6 / V2)

## Notes on running this journal

- Entries with **only** a one-line note are fine. Don't gate on having a conjecture.
- Negative observations are more valuable than positive ones for V1.5+ planning. Don't filter.
- Screenshots / paste of MCP responses welcome — drop them inline as code blocks.
- If the founder forgets and skips a day, no problem. Quality of entries beats coverage.
- This file is not a backlog item — `tools/blocked.py` will not pick it up.
