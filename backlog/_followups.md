# Backlog Follow-ups

Deferred fixups and follow-up items surfaced during `/merge-and-cleanup`. Founder converts these into proper backlog items in their next strategist conversation.

---

## 2026-04-30 — from merge of 010-cursor-extractor

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files at startup and prime the composer→workspace map, so the first turn after fresh daemon boot can carry `workspace_id`. (Cursor extractor; addresses agent_notes item 4.)
- Coalesce rapid-fire FS events on `globalDbPath` (debounce or dirty-flag) to reduce redundant SQLite opens during a flush burst. (Cursor extractor.)
- Reproducible lag-measurement harness: a privacy-respecting tool the founder can run to count events under `fs:<globalDbPath>` with timestamp deltas, so future lag verification doesn't require re-instrumenting the daemon. (Cross-cutting; touches Cursor + Claude Code extractors.)
- Log warn `unrecognized_bubble_shape` when `parseBubbleRow` returns null in `src/capture/extractors/cursor.ts:53–77` (currently silent). Makes a future Cursor schema change observable in logs rather than manifesting as zero turns flowing. (Cursor extractor.)
- Lag verification (founder-side, ≤2s median over 5 trials) — pending real-Cursor measurement post-merge. (Cursor extractor.)
- Bubble JSON shape resilience: parser assumes `{role, text, createdAt}` per the drift note. If real Cursor uses different field names, symptom is "zero turns flow despite chat events firing"; fix is a parser tweak. Combine with `unrecognized_bubble_shape` warn above. (Cursor extractor.)
