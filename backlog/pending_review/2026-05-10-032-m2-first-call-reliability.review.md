---
item_id: 2026-05-10-032-m2-first-call-reliability
verdict: merge with founder fixups   # superseded from "merge as-is" after Codex cross-tool review found 2 AC3 description-drift violations
reviewed_at: 2026-05-10T22:55:00Z
post_codex_review_at: 2026-05-10T23:14:00Z
test_counts: { passed: 644, failed: 0, skipped: 21 }
worktree_head_verified: a16779ed368fea90f1ce19372b818cf9b9f6d239
reviewer: code-reviewer subagent (initial verdict merge-as-is) + Codex (GPT-5.5, post-build cross-tool review) for AC3 description-drift catch
---

## Verdict

Implementation is faithful to the post-R3 spec across all four ACs. Worktree HEAD matches recorded head_sha. Tests pass 644/0/21 (matches agent_notes claim exactly), lint clean, typecheck clean, zero merge conflicts predicted against current `main`. The two load-bearing R2/R3 trap doors — strict-partition demotion (NOT the rejected `recent_activity=0` override) and dup-collapse asymmetry between `as_requested`/`newest_first` — are both implemented correctly with dedicated tests matching the spec's R2-2 and R3 fixture descriptions almost word-for-word. Layer-boundary discipline (R3-2) is honored: `auto-expand.ts` + `rank.ts` import `NormalizedContextEvent` and read `time.occurred_at`; `get-atoms.ts` imports `CaptureEvent` and reads `timestamp`; the two layers do not cross. No drift against the Out-of-Scope list. The R2/R3 hallucination-risk in the spec did NOT leak into code.

**Caveat — pattern note:** Per the spec's R3 process-change hypothesis ("strategist patches that touch one section but not cross-referencing sections of the same spec are a recurring failure mode"), the cross-tool review pattern caught hallucinations during R1→R2 and R2→R3 cycles on the **spec**. The current **implementation** review is single-tool (Claude code-reviewer subagent). Past pattern (item 030 round-1) had the same single-tool reviewer miss three envelope-ceiling bugs that Cursor + Codex caught in a post-build review. If founder has time before invoking `/merge-and-cleanup 032`, asking Cursor or Codex to do a parallel post-build code review would close the same gap structurally — this is the only "soft" risk in this verdict.

## Pre-merge fixups

**Two AC3 description-drift fixes required before merge** (caught by Codex post-build review at 2026-05-10 16:14 PDT; strategist validated against worktree code at `a16779e`):

- [ ] **(Medium) Patch `src/mcp/tools/recent-work-context.ts`** — both stale auto-expand-on-empty claims need to mention the new single-source-recent trigger + demotion.
  - **Line 33-35** (migration recipe inside the deprecation marker): `"4h default, auto-expand to 24h if empty."` → e.g. `"4h default, auto-expands to 24h if the 4h pass returns 0 clusters OR only single-source-recent clusters (the calling session's own activity from the last 5 minutes); in the single-source-recent case, that noise cluster is demoted so prior multi-source work surfaces at clusters[0]."`
  - **Line 95-99** (NO-ARGS RESUME paragraph in `RECENT_WORK_CONTEXT_DESCRIPTION`): same edit — replace `"auto-expands to 24h on a single retry if the 4h pass returns 0 clusters"` with `"auto-expands to 24h on a single retry if the 4h pass returns 0 clusters OR only single-source-recent clusters (the calling session's own ≤5-min activity), and demotes single-source-recent clusters below prior multi-source work in the 24h pass."`
  - **Rationale:** `RECENT_WORK_CONTEXT_DESCRIPTION` is surfaced through MCP `tools/list` and is what consumer AI clients read. Two paragraphs say "expand on empty only"; one new paragraph at lines 50-58 says "expand on empty OR single-source-recent." A consumer reading the description gets contradictory contracts depending on which paragraph they parse first. AC3 ("Update user-facing description strings in lockstep with behavior") requires the stale paragraphs to be updated, not just additive.

- [ ] **(Medium/Low) Patch `src/mcp/tools/get-atoms.ts`** — the generic DROP RULE paragraph and its mirror type comment still assert requested-order under all `prefer` modes.
  - **Line 48** (DROP RULE paragraph in `GET_ATOMS_DESCRIPTION`): `"Atoms are appended in REQUESTED ORDER until the next atom would push the envelope over the ceiling… atoms_dropped_ids: string[] carry the omitted IDs in requested order."` → e.g. `"Atoms are appended in PROCESS ORDER (= requested order under prefer='as_requested'; = newest-first-then-missing under prefer='newest_first') until the next atom would push the envelope over the ceiling; that atom AND every remaining ID are dropped. atoms_dropped_ids carries the omitted IDs in that same process order."`
  - **Line 89-90** (`GetAtomsResult.atoms_dropped_ids` doc comment): `"Requested IDs that didn't make it into atoms[], in requested order."` → e.g. `"Requested IDs that didn't make it into atoms[], in the iteration order used by the prefer mode (requested order under 'as_requested'; processed/newest-first order under 'newest_first'). Includes both missing IDs (not in storage) and budget-dropped IDs."`
  - **Rationale:** The `prefer` bullet at line 44 correctly describes the new opt-in newest-first semantics, but the generic DROP RULE paragraph at line 48 contradicts it for callers using `newest_first`. Same AC3 lock-step violation as Finding 1. Type-comment at line 89-90 is internal-facing but tracks the description contract — patching both keeps the public contract and the type-doc honest.

**Note on test coverage:** No test changes needed for these fixups. The existing test at `tests/mcp/get-atoms.test.ts:266-340` already exercises `newest_first` + dropped-IDs ordering; the description string is documentation, not behavior. Verify the patches via `npm run typecheck` + `npm test` post-edit.

## Expected merge conflicts

- *None predicted.* `git merge-tree $(merge-base HEAD main) HEAD main` reports no conflicts. Branch-modified paths (`src/trace/auto-expand.ts` NEW; `src/trace/rank.ts`, `src/mcp/tools/recent-work-context.ts`, `src/mcp/tools/find-clusters.ts`, `src/mcp/tools/get-atoms.ts` modified; corresponding test files) do not overlap any post-030 commits on `main` (which touched `backlog/`, `_followups.md`, `raw/internal/dogfooding/`, no `src/` post-030).

## Follow-up items (defer, do not block merge)

- **Cross-tool post-build code review for item 032 (parallel to 030 pattern).** ✅ COMPLETED — Codex ran the review at 2026-05-10 16:14 PDT and caught 2 AC3 description-drift findings the Claude code-reviewer subagent missed (see "Pre-merge fixups" section above). Pattern's 7th confirmation cycle; 2nd implementation-review cycle where Codex post-build catches AC-class issues single-tool review missed. Optional remaining: ask Cursor for a third pass on the angles {(a) `noUsefulCluster` 0-source-breakdown handling, (b) strict-partition × existing `cluster_id` tiebreaker interaction, (c) `as_requested` early-return × duplicates straddling missing IDs} — Codex verified (a) explicitly; (b) and (c) remain single-tool-reviewed.

- **Codify "AC3 ⇒ multi-tool implementation review required" in operating model.** Item 030 round-1 + item 032 round-1 both had single-tool Claude code-reviewer say `merge as-is` / `merge with founder fixups (only journal append)`; both had Codex/Cursor follow-up promote the verdict to add real fixups. Pattern is now stable enough across 2 items + 7 cycles to warrant a written rule rather than per-item judgment. Strategist task in the post-merge wiki pass: update `wiki/operating-model/cross-tool-spec-review.md` (or its successor; see 030's promote-from-candidate followup) to explicitly call out the AC3-class trigger.
- **Strictness on `rank.ts` `demote=true` + `nowMs=undefined`** — currently silently no-ops. Consider `throw` for stricter contract. Non-blocker; only in-tree caller passes `nowMs` correctly.
- **Strategist+founder dogfooding verification (After Completion §1 of spec).** Run the 2026-05-10 13:06 PDT chain again post-merge: no-args `find_clusters()` after a multi-hour gap. Log to `raw/internal/dogfooding/mcp-interactions-journal.md` whether `[AUTO_EXPAND] single-source-recent` fired, whether `clusters[0]` is prior work (not calling-session noise), and whether the newest atom landed in `get_atoms(prefer='newest_first')` response. This closes the empirical loop on the M2-1/M2-2 friction that motivated the item.
- **Strategist wiki promotion for 032 (After Completion §2-§5 of spec).** Update `wiki/surfaces/mcp-find-clusters.md` (auto-expand triggers + demotion), `wiki/surfaces/mcp-get-atoms.md` (resume-call usage + missing-ID position), `wiki/architecture/group-session.md` (note first-call reliability gate closed for resume-after-gap), and move M2-1/M2-2 from `_followups.md` "biting" to a "Resolved" subsection with this item's merge SHA + dogfooding entry timestamp. Do this only after merge lands in `complete/`. **Predecessor dependency:** wiki/surfaces/mcp-find-clusters.md and wiki/surfaces/mcp-get-atoms.md don't exist yet — they were specced as 030's "After Completion" wiki promotion which is also pending. 032's promotion should happen after 030's promotion OR fold the 032 sections into the 030-promoted pages in a single pass.
- **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness after ≥1 week of post-merge dogfooding entries.** Both the judgment-step gate (030) AND the first-call-reliability gate (this item) now have shipped fixes. The 031 strategist conversation should evaluate both gates together.

## Open questions for founder

*None.* Verdict is now `merge with founder fixups` (superseded from `merge as-is`); the two fixups are mechanical description-string edits, no design decisions blocking merge. Founder choice during `/merge-and-cleanup 032` C4: apply both as `yes` (recommended — AC3 is a load-bearing acceptance bullet), or `defer-as-followup` if you want to ship behavior now and patch descriptions in a fast-follow item.

## Strategist synthesis of Codex review (2026-05-10 23:14 PDT)

Both Codex findings validated against worktree code at `a16779e`:

- **Finding 1 (recent-work-context.ts):** Confirmed. Lines 33-35 and 95-99 both still describe the empty-only auto-expand; lines 50-58 add the new behavior in a separate "RESUME-STYLE QUERIES (item 032)" block. The two views co-exist in the SAME `RECENT_WORK_CONTEXT_DESCRIPTION` string — an AI client reading the migration recipe (lines 26-48) gets the OLD contract; one reading the new resume-style block gets the NEW contract. AC3's "lock-step" requirement is violated.

- **Finding 2 (get-atoms.ts):** Confirmed. Line 41 says "by default" (correct qualifier), line 44 describes `prefer` correctly, but line 48 (DROP RULE) and lines 89-90 (type comment) both still assert "requested order" without the prefer-mode qualifier. Under `newest_first`, processed order is timestamp-DESC + missing-suffix, and `atoms_dropped_ids` follows that processed order. Stale claim.

**Pattern observation (load-bearing — 7th confirmation):** This is the **seventh independent confirmation cycle** of the cross-tool-review-finds-things-single-tool-misses pattern, and the **second time a single-tool Claude code-reviewer's `merge as-is` was promoted to `merge with founder fixups` by a Codex/Cursor follow-up** (first was item 030 round-1 + envelope-ceiling bugs). The pattern hypothesis from item 032's R3 process-change note now has explicit evidence on the IMPLEMENTATION-review side (not just spec-review): single-tool implementation review reliably misses AC3 description-drift class issues even when behavior tests pass. Worth queueing as a follow-up: codify "AC3 ⇒ multi-tool implementation review required" in the operating model.

**Verified by Codex (non-findings, independently confirmed):**
- `noUsefulCluster` correctly treats 0-source clusters as not single-source-recent (predicate does not trigger noise-only expand on degenerate input).
- `rank.ts` strict partition is a real primary key BEFORE the existing hint/open-loop/recent/size/age chain and preserves old behavior when `demoteSingleSourceRecent=false`.
- Full suite: 644 passed / 21 skipped, lint clean, typecheck clean (Codex reran outside sandbox after a loopback-binding EPERM hit the MCP wire tests; matches initial Claude reviewer's numbers exactly).

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
