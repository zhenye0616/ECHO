---
item_id: 2026-05-08-026-tail-session-tool
verdict: merge as-is
reviewed_at: 2026-05-08T22:35:00Z
test_counts: { passed: 510, failed: 2 }
---

## Verdict

Merge as-is. Implementation lands the four-tool set cleanly: all 18 dedicated `tail-session` tests pass, lint and typecheck are clean, and the two failing tests in the full suite are pre-existing flakes (trace/build perf timing + git-watcher backfill concurrency) — both pass in isolation and both flake on bare `main` per the agent's run log. The `_cursor.ts` extraction matches the spec's helper-location contract verbatim. Drift surface is the minimum unavoidable: a one-line assertion update in `recent-work-context.test.ts` (3-tool list → 4) and the smoke script's tool-count, both forced consequences of adding a 4th registered tool. The two open questions in `agent_notes` (touching `recent-work-context.test.ts` outside `files_to_modify`; not gating on `ECHO_SMOKE_LIVE`) are correctly judged — stand on both.

## Pre-merge fixups

(none — verdict is merge as-is)

## Expected merge conflicts

- `src/mcp/server.ts` — Clean fast-forward; branch only adds two lines inside the post-027 `handlePost`, and 027 is already this branch's parent.
- `src/mcp/tools/search-memories.ts` — Clean; main hasn't touched the file since 025. Branch removes file-local cursor helpers and adds re-exports + `searchMatchSchema` export.
- `tools/mcp-integration-smoke.sh` — Clean; branch extends with `tail_session` checks and bumps tool-count, preserving 027's stateless probe verbatim.
- `docs/mcp-integration.md` — Clean; two small additions (smoke OK line, 4th-tool bullet) on top of 027's last edit.
- `tests/mcp/tools/recent-work-context.test.ts` — Clean (single-line edit).

No substantive conflicts predicted.

## Follow-up items (defer, do not block merge)

- Fix misleading `next_cursor` comment at `tests/mcp/tools/tail-session.test.ts:131-133` (says "null" but assertion is `not.toBeNull()`; assertion is correct, comment is wrong).
- File a fresh `flake-investigation` backlog item for the two pre-existing flakes: `tests/trace/build.test.ts` performance timing + `tests/capture/surfaces/git-watcher.test.ts` backfill concurrency. Not 026's job.
- Founder dogfooding follow-up per the spec's "After Completion" section: re-run the 13:27 / 14:00 PDT bypass scenarios using `tail_session` instead of spill+slice; journal "ECHO won this round" with byte-count + call-count comparison.
- Strategist wiki update post-merge: add `tail_session` to `wiki/surfaces/mcp-server.md` (input modes, `source_resolved`, cost contract, shared composite cursor with `search_memories`, why it exists separately).
