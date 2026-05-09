---
item_id: 2026-05-09-029-cursor-source-breakdown-falsification
verdict: merge with founder fixups
reviewed_at: 2026-05-09T22:00:00Z
test_counts: { passed: 568, failed: 0, skipped: 21 }
---

## Verdict

`merge with founder fixups`. The work is high-quality, the diagnosis is rigorous (3-way falsification answered with concrete numbers), the fix is minimal (~13 LOC across 2 src files), and the regression test is load-bearing (verified to fail on revert). Diff is laser-tight: no drift into out-of-scope surfaces (agentKv/messageRequestContext/checkpointId, decision note, journal, wiki, SOURCE_APP_VALUES, MCP tool registry, default `format`/`limit`). Two design-choice deviations from spec text need founder green-light but are well-documented and architecturally defensible. Ground-truth check passed: worktree HEAD matches recorded `head_sha` `8b36287`. No merge conflicts expected — main only progressed with journal HTML twin redesign since the claim commit; no source-tree overlap.

## Pre-merge fixups

These are founder decisions (acceptances of agent's flagged judgment calls), not code bugs. Uncheck any to defer:

- [ ] **Accept judgment (2):** "ECHO sees cursor" now lives at `response.truncation.source_breakdown.cursor`, not `response.clusters[0].source_breakdown.cursor`. Real semantic shift for consumers — the cursor-narrow-emission gap that forces cursor into a sibling cluster remains (legitimate future item, not blocking).
- [ ] **Accept judgment (3):** synthetic 3-cluster fixture instead of real-`echo.db` fixture for the regression test. Bug class is truncation arithmetic (not envelope-byte-density per item 028), so synthetic reproduces it exactly. Real-DB fixture would add brittleness without catching additional surface area here.
- [ ] **Accept judgment (1):** agent picked `src/trace/index.ts` (one of three `files_to_modify` options) for bucket-(c) instead of spec text's `src/mcp/tools/recent-work-context.ts`. Architecturally correct — wire layer has no pre-truncate atom access. Reviewer: stand.
- [ ] **Plan Phase 3 live verification post-merge** (acceptance bullet 3 deferred per agent_notes). Procedure: `launchctl kickstart -k gui/$(id -u)/com.echo.daemon` → call `mcp__echo__get_recent_work_context()` after ≥30 min of Cursor activity → confirm `response.truncation.source_breakdown.cursor ≥ 1`. Log in dogfooding journal per the 6-field template.

No code-level fixups required pre-merge.

## Expected merge conflicts

None expected. Branch builds cleanly on top of current `main`:

- `src/trace/index.ts` — last main edit `2fc89ce` (V1.5.7 polish, pre-claim); branch adds `windowSourceBreakdown = countByApp(atoms)` before clustering and propagates into the truncation envelope. Clean fast-forward / no-ff merge.
- `src/trace/types.ts` — adds optional `source_breakdown?: Record<string, number>` to `Truncation` interface. Clean.
- `tests/mcp/tools/recent-work-context.test.ts` — appends new `describe(...)` block; no overlap with existing tests. Clean.
- `tests/trace/build.test.ts` — 3-line strict-equality assertion update for the new optional field. Clean.

No other branches or claimed items touch these files (no claimed/, only this item in pending_review/).

## Follow-up items (defer, do not block merge)

1. **Cursor adapter narrow-emission enrichment** — cursor atoms emit only `conversation:cursor:<composer_id>` with no file/repo artifact, so they're structurally sibling-clustered against claude_code/git/codex even in a shared workspace. Item to enrich the cursor adapter with `workspace_id`-derived repo artifact (or workspace.json read per `_followups.md` 2026-05-04 entry). Run-log lines 226-227.
2. **Cursor capture-cadence gap** — test composer captured 12 events in a 110ms initial burst, but ~52 subsequent bubble pairs over 80 minutes did not produce additional events. Points at extractor debounce / WAL-poll cadence issue — NOT an `agentKv:` schema gap, so this is NOT item 030. Worth its own item if dogfooding signal accumulates. Run-log lines 215-221.
3. **Real-`echo.db` skeleton test for the new field** (judgment-3 caveat) — mirror item 028's pattern with a real-DB fixture asserting `truncation.source_breakdown` shape, to catch any future shape-density-shaped regressions in this code path.
4. **AI-client docs update** (post-judgment-2 consequence) — wiki page on MCP tool response shape should call out `truncation.source_breakdown` as the authoritative "what sources were active in this window" field, with `cluster.source_breakdown` documented as cluster-scoped. Strategist task post-merge alongside the wiki demotion-reversal already in this item's "After Completion" notes.

## Open questions for founder

(verdict is not `block`; these are the same decision points as the pre-merge fixups, repeated here for visibility)

1. Accept the response-shape semantic shift in judgment (2)?
2. Accept the synthetic-fixture deviation in judgment (3)?
3. Ready to run Phase 3 live verification post-merge?
