---
item_id: 2026-04-30-011-claude-code-extractor
verdict: merge as-is
reviewed_at: 2026-04-30T23:55:00Z
test_counts: { passed: 154, failed: 0 }
reviewed_head_sha: 1041a3cb324f81e576d455b7afe9169c70996085
---

## Verdict

Worktree HEAD matches recorded `head_sha`. Files changed match `files_to_modify` exactly — no drift. Implementation is solid: byte-offset incremental tail of JSONL, partial-line handling correctly retains pre-newline bytes (`claude-code.ts:124–130`), serialized processing chain mirrors 010's correct concurrency pattern (`claude-code.ts:272`), and the backfill stores **exact** byte offsets in metadata (`claude-code.ts:181`, recovered via max-per-path at `claude-code.ts:205`) — making the spec's optional short-SHA dedup genuinely redundant. The parser handles both string and content-array message shapes (`extractContent`, lines 38–58). 154/154 tests pass on isolated and second full runs; lint and typecheck clean. One flake observed on first full-suite run (chokidar contention with sibling tests) deflaked on retry — flagged as a non-blocking follow-up.

## Pre-merge fixups

None.

## Expected merge conflicts

- `src/daemon/index.ts` — only conflict, only if **both** 010 and 011 land. Both branches add an extractor at the same insertion point (import + `await start*Extractor()` + `onShutdown` entry). Resolution: take-both, preserving boot order `gitWatcher → claudeCodeExtractor → cursorExtractor → mcp` and the reverse on shutdown.
- No other overlaps. 011 does not touch `src/capture/sources.ts` or `tests/capture/sources.test.ts`; `~/.claude/projects/` was already in the allowlist from item 009. 010's surface (`cursor.ts`, `cursor.test.ts`, `cursor-globalstorage.ts`) is disjoint from 011's.

## Follow-up items (defer, do not block merge)

- Lag verification (acceptance criterion): founder runs the daemon against real Claude Code and records median over 5 trials. Structural latency is sub-100ms in unit tests; ≤500ms target is plausible.
- Add `log.warn('parse_failed', ...)` in `parseLine`'s JSON `catch` block (`claude-code.ts:64`) so a future schema mismatch or corrupted line is diagnosable rather than a silent drop. Currently `'orphan_assistant'` and `'user_replaced_without_assistant'` paths log warnings; this one doesn't.
- Bump the e2e ordering test's `waitFor` budget (`tests/capture/extractors/claude-code.test.ts:307`) from 5000ms → 10000ms to deflake under full-suite chokidar contention.
- JSONL shape assumption (`{type, sessionId, message: {role, content[]|string}, timestamp}`) is the agent's best read of real-world data. If real Claude Code emits zero events, the parser tweak is small. The diagnosability fix above makes this observable.

## Open questions for founder

(none — verdict is `merge as-is`)

## Notes carried forward to merge

- Lag verification is founder-side by design (would have required reading real Claude Code chat content to do safely from the agent transcript).
- Backfill design choice (exact byte_offset in metadata, no short-SHA dedup) is approved; it's a strict improvement over the spec's "approximate offset + short-SHA belt-and-suspenders" since exact offsets eliminate the duplicate risk by construction.
