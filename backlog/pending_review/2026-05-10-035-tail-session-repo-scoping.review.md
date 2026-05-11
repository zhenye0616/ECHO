---
item_id: 2026-05-10-035-tail-session-repo-scoping
verdict: merge as-is
reviewed_at: 2026-05-11T06:50:00Z
test_counts: { passed: 679, failed: 0, skipped: 21 }
---

## Verdict

The implementation cleanly covers AC1–AC5; AC6 is the post-merge founder/strategist dogfooding step. All 700 tests pass (679 passed / 21 skipped, 1 file skipped) with lint + typecheck clean. Architecture matches the R1 patch — `composer_id` derived from Cursor's own storage (not the best-effort `metadata.workspace_id`), dual-adapter parity for `metadata_match` enforced via `describe.each`, key whitelist enforced at the storage seam, `fileURLToPath` for percent-decoding, prepared-statement cache documented inline. No drift outside the spec; no overlapping code-file changes with 034 on main, so the merge is a clean three-way merge on the MCP/storage seam.

## Pre-merge fixups

None. Merge as-is.

## Expected merge conflicts

Branch base is `fc52f22` (pre-034); main is `6743d2b` (post-034). The set of files modified by 034 (`src/capture/extractors/cursor.ts`, `tests/capture/extractors/cursor.test.ts`, `tests/fixtures/cursor-globalstorage.ts`, plus journal/followups) does **not** intersect with this branch's modified files.

Predicted: **clean `--no-ff` merge, zero code conflicts**. Journal `.md`/`.html` and `_followups.md` files were not modified by this branch.

## Follow-up items (defer, do not block merge)

- AC6 dogfooding verification: founder/strategist runs the failing reproduction post-merge, logs to `raw/internal/dogfooding/mcp-interactions-journal.md` per the 6-field template. Two consecutive successful runs on different days close M1-1 sub-gap C.
- Wiki promotion pass (per item's "After Completion" section): `wiki/surfaces/mcp-tail-session.md` (new "Repo-scoped Cursor resolution" subsection), `wiki/operating-model/cross-tool-spec-review.md` (replace SQLite-probe workaround with `tail_session(repo_path=...)` one-liner), `backlog/_followups.md` (move M1-1 sub-gap C to Resolved).
- Strategic re-evaluation: with 034 + 035 shipped, M1-1 sub-gaps A+B+C closed; plan the item 031 deprecation-removal strategist conversation for ~1 week post-035 dogfooding.
- Consider Linux/Windows path-resolver shim when a non-macOS contributor opens the gap (per Out-of-Scope rule 6).
- After AC6 lands, audit whether the resolver should cache (spec expectation: <10ms; confirm with a real timing entry before adding cache).
- Tighten the "no cursor atoms" warning at `src/mcp/tools/tail-session.ts:242` when resolver succeeds but storage is empty for that composer.

## Open questions for founder

None — verdict is `merge as-is`.
