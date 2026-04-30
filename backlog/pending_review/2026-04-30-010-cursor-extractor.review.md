---
item_id: 2026-04-30-010-cursor-extractor
verdict: merge as-is
reviewed_at: 2026-04-30T23:50:00Z
test_counts: { passed: 156, failed: 0 }
prior_head_sha: 6ea403ee49a67084d7e3d567ec0974a5ab3154eb
reviewed_head_sha: 2c01f8b4f588e8505d3f7155bc398f555e764c41
---

## Verdict

Re-review at `2c01f8b` after the founder-validated fixup landed. Worktree HEAD matches recorded `head_sha`. The fixup is surgical and exactly addresses the spec line "timestamp: <ISO from the assistant bubble's createdAt>": `assistant_created_at: number` added to `CursorTurn` (cursor.ts:25), populated from the paired assistant bubble in the pairing loop (cursor.ts:172), used as the sort key (cursor.ts:179, replacing the no-op mtime sort), and emitted as the candidate event timestamp (cursor.ts:303). Two test changes: a timestamp pin on the existing single-turn integration test (cursor.test.ts:233) and a new "distinct timestamps for multiple turns flushed in a single FS event" test (cursor.test.ts:242–258). Backfill `localeCompare` ordering remains correct because `new Date(N).toISOString()` produces fixed-width 24-char ISO strings whose lexical order matches numeric `createdAt` order. No collateral edits, no new drift, no new bugs. 156/156 pass; lint+typecheck silent. Ship it.

## Pre-merge fixups

None.

## Expected merge conflicts

- `src/daemon/index.ts` — conflicts **iff 011 lands first**. Both branches insert their extractor at the same line (between `gitWatcher` and `mcp`) and both add a parallel shutdown call. Trivial resolution: take both — preserve `gitWatcher → claudeCodeExtractor → cursorExtractor → mcp` on boot and the reverse on shutdown. If 010 merges first, no conflict.
- ~~`src/capture/sources.ts`~~ — no conflict. Verified `git diff main...agent/claude-code-extractor -- src/capture/sources.ts` is empty; 011 doesn't touch this file.
- ~~`tests/capture/sources.test.ts`~~ — no conflict for the same reason.

## Follow-up items (defer, do not block merge)

- Boot-time workspace-inference scan: walk `workspacePrefix` for existing `state.vscdb` files and prime the composer→workspace map on startup, so the first turn after a fresh daemon boot can carry `workspace_id`. Addresses agent's flagged item (4).
- Coalesce rapid-fire FS events on `globalDbPath` (debounce or dirty-flag) to reduce redundant SQLite opens during a flush burst.
- Log `unrecognized_bubble_shape` warn when `parseBubbleRow` returns null (cursor.ts:53–77 currently silent on shape mismatch). Makes a future Cursor schema change observable in logs rather than manifesting as zero turns flowing.
- Reproducible lag-measurement harness so future lag verification doesn't require re-instrumenting the daemon.

## Open questions for founder

(none — verdict is `merge as-is`)

## Notes carried forward to merge

- Lag verification (acceptance criterion) is still founder-side. Implementation chain (chokidar → serialized extraction → single SELECT → emit) is structurally fast; ≤2s median is plausible. Founder records 5 trials post-merge and updates the entity wiki page.
- Bubble JSON parse assumes `{role, text, createdAt}`. If real Cursor uses different field names, symptom is "zero turns flow despite chat events firing"; fix is a parser tweak in a follow-up.
- `tests/capture/sources.test.ts` is in the diff outside `files_to_modify` because it asserts exhaustive `toEqual([...])` on `fs_paths` and the allowlist update is a spec-required change. Disclosed in agent_notes (3).
