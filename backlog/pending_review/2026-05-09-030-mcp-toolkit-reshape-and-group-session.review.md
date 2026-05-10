---
item_id: 2026-05-09-030-mcp-toolkit-reshape-and-group-session
verdict: merge with founder fixups (post-fixup; supersedes 2026-05-10T08:30Z subagent verdict)
reviewed_at: 2026-05-10T08:30:00Z
post_fixup_at: 2026-05-10T08:18:00Z
test_counts: { passed: 625, failed: 0, skipped: 21 }
worktree_head_verified: c12617b  # was 24cb42b before fixup
reviewer: code-reviewer subagent (initial) + Cursor's Claude (composer c15c2eca-…) + Codex (session 019e10a5-…) + strategist (Claude Code Opus 4.7) for fixup synthesis
---

## Verdict

**Post-fixup verdict (supersedes initial subagent verdict):** Implementation matches the spec across all 10 acceptance bullets, plus the three envelope-ceiling enforcements that the initial Claude code-reviewer subagent missed and Cursor + Codex caught independently. Tests/lint/typecheck pass cleanly (625 passed, 21 skipped, 0 failed — +3 regression tests added in fixup commit `c12617b`). Decomposition's load-bearing claim still holds (chain 22.7k vs compound 49.3k on realistic-density fixture). Merge predicted clean.

**Initial subagent verdict (preserved for record):** Implementation matches the spec across all 10 acceptance bullets; tests/lint/typecheck pass cleanly (622 passed, 21 skipped, 0 failed). The decomposition empirically meets its load-bearing claim (chain 22,711 chars vs compound 49,285 chars on the realistic-density fixture — 54% smaller). Code quality is high: order-preserving `getByIds` is correct on both backends, parameterized SQL is safe, deterministic prefix-drop in `get_atoms` is implemented as specced, strict-after boundary in `wait_for_new_turns` uses post-filter `r.timestamp <= since` which correctly drops boundary rows. The two flagged "drifts" (`tools/{render,serve,stream}-*.ts` 5-line stubs and `tools/mcp-integration-smoke.sh` count bumps) are necessary collateral from the in-scope `Storage.getByIds` interface change — without them, typecheck and the smoke script would fail. Acceptable. The single squashed commit is fine for this internally-coupled reshape; not worth rewriting pushed history. Merge predicted clean (zero text conflicts).

## Cross-tool post-build review (load-bearing addendum)

Cursor's Claude and Codex were independently asked "030 just landing do a full code review" at ~00:36 and ~00:55 PDT 2026-05-10. Both reviewers caught the same TWO P1 envelope-ceiling bugs that the initial Claude code-reviewer subagent missed, plus one Codex-only P2:

- **P1 — `get_atoms` 25k ceiling not actually enforced** (Cursor #1, Codex Finding 1). Tentative envelope built with `atoms_dropped: 0, atoms_dropped_ids: []`; final return uses real dropped-IDs array. Near-ceiling prefix + many missing UUIDs could exceed 25k post-check.
- **P1 — `FIND_CLUSTERS_RESPONSE_BYTE_CEILING` exported but never applied** (Cursor #2, Codex Finding 2). Function returned all clusters with no `JSON.stringify(result).length` guard. With MAX_LIMIT=500 and high-density open-loop hints, multi-cluster responses could exceed 25k.
- **P2 — `find_clusters.result_caps.truncated` only mirrored upstream `rwc.truncation.truncated`** (Codex Finding 3, Cursor missed). Per-cluster `atom_ids_truncated` clipping wasn't propagated to top-level signal.

All three confirmed against worktree code. Strategist (Claude Code Opus 4.7, this conversation) implemented fixes + 3 regression tests in fixup commit `c12617b` on the agent branch (pushed to origin). All three regression tests assert the load-bearing post-conditions (final envelope ≤ 25k, per-cluster cap surfaces at result_caps, response trim + warning).

## Pre-merge fixups

- [x] **(P1) get_atoms envelope ceiling actually enforced.** Fixup commit `c12617b`. Test: `tests/mcp/get-atoms.test.ts` "REGRESSION (post-build review): final envelope respects 25k ceiling even with many missing IDs after a near-ceiling accepted prefix".
- [x] **(P1) find_clusters envelope ceiling actually enforced + warning surfaced on trim.** Fixup commit `c12617b`. Test: `tests/mcp/find-clusters.test.ts` "REGRESSION (post-build review): response-level envelope ceiling actually enforced — trailing clusters trimmed when total exceeds 25k".
- [x] **(P2) find_clusters.result_caps.truncated reflects per-cluster cap firing.** Fixup commit `c12617b`. Test: `tests/mcp/find-clusters.test.ts` "REGRESSION (post-build review): per-cluster atom_ids cap firing lifts result_caps.truncated to true".
- [ ] Append the synthesized "before/after" dogfooding entry from the run log (lines 274-294 of `raw/internal/agent-runs/2026-05-10-2026-05-09-030-mcp-toolkit-reshape-and-group-session.md`) to the canonical `raw/internal/dogfooding/mcp-interactions-journal.md` using the 6-field template (Trigger / Query inputs / Returned / Sources / Verdict / Note). Regenerate the HTML twin in the same commit per CLAUDE.md. — *AC10c was scored Partial because the entry lives in the run log only; copying to the canonical journal closes it.*

## Expected merge conflicts

- *None predicted.* All branch-modified paths (including the four files touched by fixup `c12617b`: `src/mcp/tools/find-clusters.ts`, `src/mcp/tools/get-atoms.ts`, `tests/mcp/find-clusters.test.ts`, `tests/mcp/get-atoms.test.ts`) are clean against current `main`. Storage interface, all three new tools, all three modified tools (`recent-work-context.ts`, `search-memories.ts`, `tail-session.ts`), `match.ts`, `server.ts`, `tools/{render,serve,stream}-*.ts`, `tools/mcp-integration-smoke.sh`, and `docs/mcp-integration.md` were not touched on `main` since the branch forked. The agent-runs file at `raw/internal/agent-runs/2026-05-10-2026-05-09-030-…md` lives only on `main` (added by review-prep commit `f9e826f`); the branch did not write it, so no overlap.

## Follow-up items (defer, do not block merge)

- Profile `get_atoms` deterministic-drop loop's O(n²) `JSON.stringify(tentative)` cost on a 50-id large-body fixture; if profiling shows it dominates wall time, switch to a running-sum byte approximation. (Run log line 144-146 already acknowledges the trade-off.)
- After 1-2 weeks of dogfooding the new toolkit, file **item 031** (remove `get_recent_work_context`) per the spec's "After Completion" §5.
- Strategist promotes 3 new wiki pages (`wiki/surfaces/mcp-find-clusters.md`, `mcp-get-atoms.md`, `mcp-wait-for-new-turns.md`) + writes `wiki/architecture/group-session.md` + updates `wiki/surfaces/mcp-server.md`, `wiki/surfaces/mcp-recent-work-context.md`, `wiki/architecture/system-architecture.md`, `backlog/_followups.md` per "After Completion" §§1–7. **Do this only after merge lands in `complete/`.**
- Operating-model note for future builders: when a spec adds a `Storage` interface method, the claiming agent should preemptively list the wrapper-Storage adapter files (`tools/{render,serve,stream}-*.ts`) in `files_to_modify` at claim time to avoid the drift-rule edge case retroactively.

## Open questions for founder

*None.* Verdict is `merge with founder fixups`, not `block`. The single pre-merge fixup is mechanical (copy text into journal + regenerate HTML); it does not require a design decision.
