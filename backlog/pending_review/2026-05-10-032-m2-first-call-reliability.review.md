---
item_id: 2026-05-10-032-m2-first-call-reliability
verdict: merge as-is
reviewed_at: 2026-05-10T22:55:00Z
test_counts: { passed: 644, failed: 0, skipped: 21 }
worktree_head_verified: a16779ed368fea90f1ce19372b818cf9b9f6d239
reviewer: code-reviewer subagent (independent of builder, ID 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405)
---

## Verdict

Implementation is faithful to the post-R3 spec across all four ACs. Worktree HEAD matches recorded head_sha. Tests pass 644/0/21 (matches agent_notes claim exactly), lint clean, typecheck clean, zero merge conflicts predicted against current `main`. The two load-bearing R2/R3 trap doors — strict-partition demotion (NOT the rejected `recent_activity=0` override) and dup-collapse asymmetry between `as_requested`/`newest_first` — are both implemented correctly with dedicated tests matching the spec's R2-2 and R3 fixture descriptions almost word-for-word. Layer-boundary discipline (R3-2) is honored: `auto-expand.ts` + `rank.ts` import `NormalizedContextEvent` and read `time.occurred_at`; `get-atoms.ts` imports `CaptureEvent` and reads `timestamp`; the two layers do not cross. No drift against the Out-of-Scope list. The R2/R3 hallucination-risk in the spec did NOT leak into code.

**Caveat — pattern note:** Per the spec's R3 process-change hypothesis ("strategist patches that touch one section but not cross-referencing sections of the same spec are a recurring failure mode"), the cross-tool review pattern caught hallucinations during R1→R2 and R2→R3 cycles on the **spec**. The current **implementation** review is single-tool (Claude code-reviewer subagent). Past pattern (item 030 round-1) had the same single-tool reviewer miss three envelope-ceiling bugs that Cursor + Codex caught in a post-build review. If founder has time before invoking `/merge-and-cleanup 032`, asking Cursor or Codex to do a parallel post-build code review would close the same gap structurally — this is the only "soft" risk in this verdict.

## Pre-merge fixups

*None required.* Verdict is `merge as-is`.

## Expected merge conflicts

- *None predicted.* `git merge-tree $(merge-base HEAD main) HEAD main` reports no conflicts. Branch-modified paths (`src/trace/auto-expand.ts` NEW; `src/trace/rank.ts`, `src/mcp/tools/recent-work-context.ts`, `src/mcp/tools/find-clusters.ts`, `src/mcp/tools/get-atoms.ts` modified; corresponding test files) do not overlap any post-030 commits on `main` (which touched `backlog/`, `_followups.md`, `raw/internal/dogfooding/`, no `src/` post-030).

## Follow-up items (defer, do not block merge)

- **Cross-tool post-build code review for item 032 (parallel to 030 pattern).** Ask Cursor's Claude + Codex to independently review the merged `a16779e` implementation against the spec; pattern's seventh confirmation cycle on whether single-tool implementation review misses things multi-tool spec review caught. Particular angles to ask them: (a) does the `noUsefulCluster` predicate handle 0-source `source_breakdown` correctly; (b) does the strict-partition primary key in `rank.ts` interact correctly with the existing `cluster_id` tiebreaker; (c) does the `as_requested` early-return in `get_atoms.ts:170-172` actually preserve dup-returns-dup semantics when the input has duplicates straddling missing IDs.
- **Strictness on `rank.ts` `demote=true` + `nowMs=undefined`** — currently silently no-ops. Consider `throw` for stricter contract. Non-blocker; only in-tree caller passes `nowMs` correctly.
- **Strategist+founder dogfooding verification (After Completion §1 of spec).** Run the 2026-05-10 13:06 PDT chain again post-merge: no-args `find_clusters()` after a multi-hour gap. Log to `raw/internal/dogfooding/mcp-interactions-journal.md` whether `[AUTO_EXPAND] single-source-recent` fired, whether `clusters[0]` is prior work (not calling-session noise), and whether the newest atom landed in `get_atoms(prefer='newest_first')` response. This closes the empirical loop on the M2-1/M2-2 friction that motivated the item.
- **Strategist wiki promotion for 032 (After Completion §2-§5 of spec).** Update `wiki/surfaces/mcp-find-clusters.md` (auto-expand triggers + demotion), `wiki/surfaces/mcp-get-atoms.md` (resume-call usage + missing-ID position), `wiki/architecture/group-session.md` (note first-call reliability gate closed for resume-after-gap), and move M2-1/M2-2 from `_followups.md` "biting" to a "Resolved" subsection with this item's merge SHA + dogfooding entry timestamp. Do this only after merge lands in `complete/`. **Predecessor dependency:** wiki/surfaces/mcp-find-clusters.md and wiki/surfaces/mcp-get-atoms.md don't exist yet — they were specced as 030's "After Completion" wiki promotion which is also pending. 032's promotion should happen after 030's promotion OR fold the 032 sections into the 030-promoted pages in a single pass.
- **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness after ≥1 week of post-merge dogfooding entries.** Both the judgment-step gate (030) AND the first-call-reliability gate (this item) now have shipped fixes. The 031 strategist conversation should evaluate both gates together.

## Open questions for founder

*None.* Verdict is `merge as-is`; no design decisions blocking merge.

## Codex Cross-Tool Review — 2026-05-10 16:18 PDT

### Verdict

Small pre-merge fixup recommended, not a runtime rework. The implementation behavior matches AC1/AC2 in the load-bearing paths and the full suite passes when loopback binding is allowed, but AC3's "description strings in lockstep" is not fully closed.

### Finding

- **P2 — `get_atoms` generic drop-rule docs still describe requested-order drops under all modes.** `src/mcp/tools/get-atoms.ts` correctly processes `prefer="newest_first"` in post-sort order and returns `atoms_dropped_ids` in that process order, but the user-facing `GET_ATOMS_DESCRIPTION` drop-rule paragraph still says atoms are appended in requested order and dropped IDs are carried "in requested order"; `GetAtomsResult.atoms_dropped_ids` has the same stale comment. That contradicts AC2's returned-order contract for `newest_first` and can mislead MCP clients reading tool descriptions. Fix: qualify the generic paragraph/comment as "process order" and define process order as requested order by default, newest-first order when `prefer="newest_first"`.

### Non-blocking note

- `RECENT_WORK_CONTEXT_DEPRECATION_MARKER` and `RECENT_WORK_CONTEXT_DESCRIPTION` still contain old shorthand saying no-args auto-expand retries when the 4h pass is empty. The newer resume-style block documents the single-source-recent trigger, so this is less risky than the `get_atoms` contradiction, but it is another AC3 cleanup candidate while editing docs.

### Verification

- `npm test` in the default sandbox failed only on MCP wire tests with `listen EPERM: operation not permitted 127.0.0.1`.
- `npm test` rerun with loopback binding allowed: 644 passed, 21 skipped.
- `npm run lint`: clean.
- `npm run typecheck`: clean.

---

## Codex Cross-Tool Review (2026-05-10 16:14 PDT)

**Reviewer:** Codex (GPT-5.5), independent post-build pass after tailing the Claude Code review handoff via ECHO.

**Verdict:** fix AC3 description drift before merge. Runtime behavior and tests look correct; the remaining issue is user-facing MCP tool text that still contradicts the new semantics.

### Findings

1. **Medium — `get_recent_work_context` description still advertises the old empty-only auto-expand rule.** In `src/mcp/tools/recent-work-context.ts:34-35`, the migration recipe still says no-args semantics are "4h default, auto-expand to 24h if empty." In the same tool description, `src/mcp/tools/recent-work-context.ts:95-99` repeats that no-args auto-expand fires only when the 4h pass returns 0 clusters. That is now false for item 032: the no-args path also expands on all-single-source-recent clusters and demotes that noise below prior multi-source work. Since `RECENT_WORK_CONTEXT_DESCRIPTION` is surfaced through MCP `tools/list`, this violates AC3's "description strings must change with behavior" requirement and gives AI clients a stale migration contract. Patch the stale paragraphs to mention "0 clusters OR only single-source-recent clusters" and the demotion rule.

2. **Medium/Low — `get_atoms` description still describes drop order as request order even when `prefer="newest_first"` is active.** The new `prefer` bullet in `src/mcp/tools/get-atoms.ts:44` introduces process-order behavior, but the generic DROP RULE paragraph at `src/mcp/tools/get-atoms.ts:48` still says atoms are appended in requested order and `atoms_dropped_ids` are carried in requested order. The type comment at `src/mcp/tools/get-atoms.ts:89-90` repeats the same stale claim. Under `newest_first`, the processed order is newest-to-oldest plus missing IDs, and `atoms_dropped_ids` follows that processed order. Patch the description/comment to say "requested order under `as_requested`; processed/newest-first order under `newest_first`."

### Verified

- Focused tests: `npm test -- tests/trace/auto-expand.test.ts tests/trace/rank.test.ts tests/mcp/find-clusters.test.ts tests/mcp/get-atoms.test.ts` → 49 passed.
- Typecheck: `npm run typecheck` → clean.
- Lint: `npm run lint` → clean.
- Full suite: first sandboxed run failed on MCP wire tests with `listen EPERM: operation not permitted 127.0.0.1`; reran outside sandbox for loopback binding and got 644 passed / 21 skipped.

### Non-findings

- `noUsefulCluster` correctly treats 0-source clusters as not single-source-recent, so they do not accidentally trigger the noise-only expand path.
- The strict partition in `rank.ts` is a real primary key before hint/open-loop/recent/size/age and preserves old behavior when `demoteSingleSourceRecent` is false.
- `get_atoms(prefer="newest_first")` keeps the layer boundary clean: it sorts on raw `CaptureEvent.timestamp`, while the cluster predicate uses `NormalizedContextEvent.time.occurred_at`.
