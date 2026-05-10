---
id: 2026-05-10-032-m2-first-call-reliability
title: M2 first-call reliability — single-source-recent demotion + resume-friendly get_atoms ordering
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-10
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/find-clusters.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/tools/get-atoms.ts
  - src/trace/rank.ts
  - src/normalize/event.ts  # CaptureEvent.occurred_at — the timestamp field referenced by AC1
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 2026-05-10 13:06 PDT entry — the empirical trigger
  - raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md  # M1/M2 vocab origin
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

The 030 toolkit (`find_clusters` + `get_atoms` + `tail_session` + `wait_for_new_turns`) shipped 2026-05-09. The 2026-05-10 13:06 PDT strategist resume call — first real founder-style use of the new chain post-merge — surfaced two distinct first-call-reliability friction items that the synthetic AC10c entry could not have caught. Both fired on the very first real chain attempt; both forced manual workaround. Documented in `raw/internal/dogfooding/mcp-interactions-journal.md` "2026-05-10 13:06 PDT — first real resume call on new toolkit post-030 merge" and reaffirmed by Codex pushback #5 (2026-05-10 14:50 PDT, codex session `019e10a5-...` turn 8) as the smallest evidenced fix to ship first.

**Friction 1 — no-args 4h auto-expand fails on long-gap resume (M2-1):**
The synthetic AC10c entry promised `find_clusters()` no-args would return useful clusters via the V1.5.7-equivalent auto-expand path (4h → 24h on empty). Real-world: when the calling AI client's own session is the only thing inside the 4h window, the auto-expand does NOT fire — `clusters.length ≥ 1` short-circuits the empty-expand predicate, even though the lone cluster is just the current session (uninformative for "where did I leave off after a gap"). Today's call: 1 cluster returned with `source_breakdown={claude_code: 2}` (the calling session's two atoms), no auto-expand, founder had to manually widen with explicit `since`/`until`. **The first call on the documented resume path was unreliable**; that breaks the demo gesture "one call, get oriented."

**Friction 2 — `get_atoms` deterministic prefix-drop is hostile to resume callers (M2-2):**
`find_clusters` returns `atom_ids[]` in cluster-internal order (timestamp-ascending, ≈oldest-first). When a naive consumer chains `get_atoms(picked.atom_ids)` directly and the 25k envelope ceiling fires, the prefix-drop drops atoms from the END of the requested order — which under timestamp-ascending means **the most-recent atoms get dropped**. That's the exact opposite of what a "where did I leave off" caller wants. Today's call: 10 atoms requested, 1 dropped (`atoms_dropped: 1, atoms_dropped_ids: ["d668a23a-..."]`). Strategist mitigated by manually ordering open-loops first; a naive caller passing `picked.atom_ids` verbatim loses the freshest atom.

Both items are direct breakage of the "decomposition saves bytes vs compound" load-bearing claim from the 030 AC10c synthesized entry, because they prevent the chain from being usable without judgment-step intervention beyond what the migration recipe documents. Item 031 (remove `get_recent_work_context`) is explicitly gated on the new chain being habitually better than the deprecated tool — these two fixes are pre-requisite for that gate to fire honestly.

# Goal

Make the first `find_clusters()` + `get_atoms()` chain call **work usefully on its own** in the resume-after-long-gap scenario, without forcing the caller to (a) pre-widen the lookback, or (b) pre-reorder atom_ids. Demo bar: founder cold-starts in any of {Cursor, Claude Code, Codex} after a multi-hour gap, runs the documented chain with no args (or with the minimal migration-recipe args), and gets back the **prior work session as the rank-1 cluster** — not the current calling session.

# In Scope (Acceptance Criteria)

### AC1 — single-source-recent predicate + auto-expand + demotion

**Definition.** A cluster `C` is **single-source-recent** iff BOTH of these hold:
- `C.source_breakdown` has exactly 1 key (single source-app), AND
- The latest `CaptureEvent.occurred_at` of any atom in `C` is within `SINGLE_SOURCE_RECENT_THRESHOLD_MS` of `now` (default: 5 minutes / 300_000 ms).

**Predicate.** `no_useful_cluster(clusters)` is true iff **every** cluster in the returned set is single-source-recent. The empty set is vacuously true (preserves today's empty-only auto-expand behavior as a degenerate case).

**Naming note.** The predicate uses observable fields only; it does NOT prove the cluster IS the calling session. It's a heuristic that "single-source AND recent" is overwhelmingly likely to be the calling client's noise. Per Codex review Cx2, the spec deliberately avoids "self" in the field name to make this honest. If a future item needs true caller identity, that's a separate primitive (the MCP request itself does not carry caller-session identity today).

**Auto-expand behavior in `src/mcp/tools/find-clusters.ts` (and the underlying `getRecentWorkContext` no-args path in `src/mcp/tools/recent-work-context.ts`):**
- If the user passed an explicit `since` or `until`, do NOT auto-expand (explicit-over-implicit per item 027). Return clusters as-is.
- After the default 4h pass, if `no_useful_cluster(clusters_4h)` is true, fire the existing 24h auto-expand exactly once. Emit a `[AUTO_EXPAND]`-prefixed warning identifying the trigger as either `"empty"` (the existing case — 4h returned 0 clusters) or `"single-source-recent"` (the new case — 4h returned only single-source-recent clusters).

**Demotion (load-bearing — addresses Codex review Cx1):**
After the 24h pass returns its cluster set, if the set contains BOTH single-source-recent clusters AND non-single-source-recent clusters, **demote** all single-source-recent clusters by treating their `recent_activity` rank signal as 0 (instead of 1) during the `rank.ts` sort. Net effect: the prior multi-source work cluster outranks the calling-session noise cluster, so `clusters[0]` is the prior work — which is the demo bar.

If the 24h set contains only single-source-recent clusters (degenerate — the user genuinely has nothing else in 24h), return them with normal ranking; do not synthesize an empty response.

The demotion happens ONLY when auto-expand fired with trigger `"single-source-recent"`. It does NOT apply to caller-specified `since`/`until` calls, and it does NOT apply to the empty-trigger auto-expand path. Implement as a `demoteSingleSourceRecent: boolean` flag passed into the rank function from the auto-expand call site.

### AC2 — Resume-friendly `get_atoms` ordering option

In `src/mcp/tools/get-atoms.ts`, accept a new optional parameter `prefer: "as_requested" | "newest_first"` (default: `"as_requested"` to preserve current contract).

When `prefer="newest_first"`:
- **Sort key**: atom `CaptureEvent.occurred_at` descending (the same timestamp field used in AC1). Stable sort — ties resolve in original request order.
- **Missing IDs (not in storage)**: have no timestamp to sort against. Append them at the END of the sorted list, preserving their relative request order. They still appear in `atoms_dropped_ids` per existing contract; the only change is their position in the iteration order, which determines drop priority.
- **Duplicate IDs in input**: collapse to first occurrence. Subsequent duplicates are silently ignored (existing behavior — confirm preserved).
- The deterministic prefix-drop semantics are unchanged (drops fall on the END of the processed order). Under `newest_first`, that END is the OLDEST atom, then missing IDs — matching the resume-call intent.
- Returned `atoms[]` are in the post-sort order (newest first, then any not-dropped older atoms); `atoms_dropped_ids` lists the dropped IDs in that same iteration order.
- Document in the tool description that when the consumer has already ordered `atom_ids` intentionally, `prefer="newest_first"` will override that order — the consumer should pass `"as_requested"` (or omit `prefer`) in that case.

### AC3 — Update user-facing description strings in lockstep with behavior

Per Cursor review Cu1, the tool descriptions must change with the behavior, not just internal banners:

- **`FIND_CLUSTERS_DESCRIPTION` in `src/mcp/tools/find-clusters.ts`** — currently lines 64-65 say "auto-expands to 24h on a single retry if the 4h pass returned 0 clusters." Update to: "auto-expands to 24h on a single retry if the 4h pass returned 0 clusters OR only single-source-recent clusters (the calling session's own activity from the last 5 minutes); when the single-source-recent expand fires AND prior multi-source work exists in 24h, the single-source-recent cluster is demoted in rank so the prior work appears as clusters[0]."
- **Migration recipe banner in `src/mcp/tools/recent-work-context.ts` (the deprecation comment block)** — add two lines:
  - "For resume-style queries (where did I leave off), pass `prefer='newest_first'` to `get_atoms`."
  - "No-args `find_clusters()` now auto-expands to 24h when the only returned cluster is the calling session's recent activity, and demotes that cluster so prior work surfaces at clusters[0]."
- **`outputSchema` docs** — if the schema description fields reference auto-expand semantics, mirror the above. If not, no change needed.

### AC4 — Test coverage

- **Unit test (predicate):** `no_useful_cluster` against 4 fixture cases — (a) empty, (b) all clusters single-source-recent, (c) all clusters single-source-but-old (outside 5min), (d) mixed single-source-recent + multi-source. Returns true only for (a) and (b).
- **Unit test (auto-expand trigger):** mock `getRecentWorkContext` to return single-source-recent-only at 4h and multi-source at 24h. Assert the 24h pass fires with warning prefix `"[AUTO_EXPAND] single-source-recent"`.
- **Unit test (demotion):** rank input with one single-source-recent cluster (recent=1) and one multi-source older cluster (recent=0), `demoteSingleSourceRecent=true`. Assert post-rank order: multi-source first (was-recent=0 vs demoted single-source-recent's effective-recent=0; size/age tiebreaker decides). Compare against `demoteSingleSourceRecent=false` baseline on the same input — single-source-recent ranks first under baseline.
- **Unit test (get_atoms newest_first):** fixture with 8 atoms (mixed timestamps + 2 missing IDs); budget can only fit 4 atoms by size. With `prefer='newest_first'`: dropped IDs are the 2 oldest atoms + 2 missing IDs (newest-first order preserves the 4 newest). With `prefer='as_requested'` (baseline): dropped IDs are the last 4 in request order. Diff the two output orderings.
- **Integration test (chain):** 24h-spanning fixture — first 4h has only single-source-recent (calling session noise: 2 `claude_code` atoms within the last 5 minutes); prior 4-24h has a multi-source work session (claude_code + git + codex, 30+ minutes old). Chain `find_clusters({})` → assert auto-expand warning fired with `single-source-recent` trigger, assert clusters[0] is the prior work session (not the noise cluster), assert noise cluster is present but ranked lower. Then `get_atoms(clusters[0].atom_ids, prefer='newest_first')` → assert newest atom of the prior work session is in the returned response (not dropped).

# Out of Scope (Don't Drift)

- **Do NOT touch `search_memories` ranking semantics.** The "verdict-turn ranking" friction (M1-2, separate item 034 candidate) is a different surface. Substring + recency stays as today.
- **Do NOT add `get_atom(id, full=true)`** the full-atom recovery escape hatch (M1-3 / item 033 candidate). Separate item per Codex pushback #5 split.
- **Do NOT touch envelope ceiling constants** (`WIRE_SHAPE_CAPS.match_content`, `FIND_CLUSTERS_RESPONSE_BYTE_CEILING`, `GET_ATOMS_RESPONSE_BYTE_CEILING`). 030 fixup `c12617b` enforced them; leave alone.
- **Do NOT remove `get_recent_work_context`.** Item 031 owns the deprecation; this item ships before that one per Codex pushback #2 sequencing.
- **Do NOT add hotkey overlay scaffolding** even though this item unblocks it. Overlay is item 035 candidate.
- **Do NOT change `find_clusters`' atom_ids[] ordering** — it stays cluster-internal (timestamp-ascending). The change is purely in `get_atoms`' opt-in `prefer` parameter. Don't push order-flipping upstream.
- **Do NOT introduce a caller/session-identity input** to the MCP request shape. Codex review Cx2 flagged that the predicate is a heuristic, not true self-identification; the spec accepts that and uses a name (`single-source-recent`) that doesn't claim identity. True caller identity is a V2+ separate primitive.
- **Don't widen the auto-expand beyond 24h.** Today's path is 4h → 24h. If `no_useful_cluster` is still true after the 24h pass, return the (uninformative) cluster set and let the caller widen further explicitly. Don't ladder to 48h / 1w — that's a separate UX question for V1.7+.

# Implementation Notes

- `find-clusters.ts` already has the `clusters.length === 0` empty-expand path with `[AUTO_EXPAND]` warning. Extend the predicate and the warning prefix; don't replace.
- The `no_useful_cluster` predicate should be a pure function (no IO), unit-testable in isolation. Co-locate with `find-clusters.ts` or a new `src/trace/auto-expand.ts` per the existing module hygiene.
- `SINGLE_SOURCE_RECENT_THRESHOLD_MS` default 5 minutes (300_000 ms) is judgment-bound by the AI-client's typical "I just sent a message + got a response" turnaround. Make it a named constant; don't hardcode in the predicate. The name is intentionally NOT `SELF_*` per Cx2.
- Timestamp field is `CaptureEvent.occurred_at` (the normalized event time, set at capture-gate). Trace builder + ranking already use this field consistently; the predicate must use the same one for cluster-level "latest atom" comparison.
- Demotion is implemented in `src/trace/rank.ts` (the same file Codex Cx1 named): take a `demoteSingleSourceRecent: boolean` parameter, default false. When true, override `sig.recent_activity` to false for clusters where the `single-source-recent` predicate holds. The call site in `find-clusters.ts` passes `true` only after the single-source-recent auto-expand fires.
- `get_atoms` `prefer` parameter: zod schema in the existing `inputSchema`; default `"as_requested"` to preserve back-compat for non-resume callers (search_memories pipeline, group-session subscribers, etc.). The `format` parameter is unchanged.
- For the missing-ID position rule (AC2): `getByIds` returns the requested-order-aligned array with `null` entries for missing IDs. Pre-sort, replace nulls with sentinel "missing" markers and treat them as having `occurred_at = -Infinity` for ordering purposes. They land at the end of `newest_first` order, then get dropped first.
- Bump `mcp-integration-smoke.sh` to validate `prefer='newest_first'` round-trip if it has time. Not strictly required for acceptance.

# After Completion (Strategist + Founder Notes)

- **Dogfooding verification (founder + strategist):** After merge, founder or strategist runs the same chain that was logged at 2026-05-10 13:06 PDT — no-args `find_clusters()` after a multi-hour gap — and logs an entry to `raw/internal/dogfooding/mcp-interactions-journal.md` documenting whether the auto-expand fired with `[AUTO_EXPAND] single-source-recent`, whether `clusters[0]` is prior work or calling-session noise, and whether the newest atom landed in the `get_atoms` response. (Per Codex review Cx3 — moved here from the AC list because builders cannot satisfy a post-merge founder action.)
- **Promote the new behavior to `wiki/surfaces/`:**
  - Update `wiki/surfaces/mcp-find-clusters.md` (post-030 strategist promotion will create this) — add an "Auto-expand triggers" sub-section documenting the empty-trigger AND single-source-recent-trigger paths, plus the demotion rule.
  - Update `wiki/surfaces/mcp-get-atoms.md` (post-030 strategist promotion will create this) — add a "Resume-call usage" sub-section documenting `prefer='newest_first'` + missing-ID position behavior.
- **Move M2-1 + M2-2 from `_followups.md` "biting" to a "Resolved" subsection** with this item's merge SHA + the dogfooding-verification entry timestamp.
- **Update `wiki/architecture/group-session.md`** (post-030 strategist promotion will create this) — note that the first-call reliability gate is now closed for resume-after-gap scenarios; group-session continuation calls (subsequent `wait_for_new_turns` rounds) are unaffected.
- **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness** after ≥1 week of post-merge dogfooding entries. The judgment-step + first-call-reliability gates can BOTH close before item 031 ships per Codex pushback #2.

# Review Round 1 — Cross-tool spec review (Cursor + Codex, 2026-05-10 15:00 PDT)

Both reviews + validation against code are in `raw/internal/dogfooding/mcp-interactions-journal.md` "2026-05-10 ~15:15 PDT — strategist combines Cursor + Codex spec review of item 032" and the strategist response. 9 unique findings, all 9 patched in this revision. Pattern note: 4th independent confirmation cycle of cross-tool-review-finds-things-single-tool-misses; first cycle scoped to spec review (vs code review or strategic sequencing).

**Convergent findings (both caught — 3):**
- **C1 (path)** — `spec_refs` had `src/trace/recent-work-context.ts`; correct is `src/mcp/tools/recent-work-context.ts`. Fixed in frontmatter AND Implementation Notes. Cursor flagged Implementation Notes too; Codex only flagged frontmatter.
- **C2 (predicate ambiguity)** — AC1 "ANY of" + 3 bullets was an AND-chain misnamed; rewritten per Cursor's specific fix proposal (`single-source-recent iff …` + `no_useful_cluster = every returned cluster is single-source-recent` with vacuous truth for empty).
- **C3 (missing-ID + duplicate-ID ordering)** — `prefer="newest_first"` didn't specify behavior for IDs without a timestamp. AC2 now explicitly defines: missing IDs at end (preserving request order among themselves); duplicates collapsed to first occurrence.

**Codex-only findings (3):**
- **Cx1 (HIGH — load-bearing demo-bar gap)** — `rank.ts` sorts on `recent_activity` before `size`, so a single-source-recent cluster outranks an older multi-source prior cluster even after auto-expand. Fixed by adding the demotion rule (AC1, paragraph 4): when auto-expand fires with `single-source-recent` trigger AND both single-source-recent + non-single-source-recent clusters exist in the 24h set, force `recent_activity=0` for the single-source-recent clusters during ranking. Demo bar now holds.
- **Cx2 ("self" misnomer)** — predicate doesn't actually prove identity. Renamed throughout from `non-self` / `self-only-recent` to `single-source-recent`. Spec is now honest about the heuristic. Documented explicitly in AC1 "Naming note."
- **Cx3 (dogfooding AC misplaced)** — moved from AC5 to After Completion as a founder/strategist verification step.

**Cursor-only findings (3):**
- **Cu1 (P1 — description-string lock-step)** — `FIND_CLUSTERS_DESCRIPTION` in `find-clusters.ts:64-65` and any `outputSchema` docs must update in lockstep with behavior. Added as AC3 (renumbered; old AC3 → AC3 absorbed into the same bullet).
- **Cu2 (timestamp field unnamed)** — AC1 referenced "latest atom" without naming the field. Spec now uses `CaptureEvent.occurred_at` consistently, with rationale that trace + ranking already use this field; added to `spec_refs` (`src/normalize/event.ts`).
- **Cu3 (resume_tail_source non-standard)** — kept in frontmatter (item 029 also uses it; effectively the emerging hint-field convention per Codex's spec-template improvements). Tools validate-tolerant. No-op for this revision.

**Disposition:** All 9 findings addressed in this revision. No remaining findings warrant a R2 review unless founder spots something the reviewers missed.

# References

- `raw/internal/dogfooding/mcp-interactions-journal.md` — 2026-05-10 13:06 PDT entry (empirical trigger); 14:46 / 14:48 / 14:53 / 14:55 / 15:00 PDT entries (Codex + strategist mirror-pair confirming sequencing); the 15:15 PDT review-synthesis entry capturing this R1 cycle
- `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — M1/M2 vocab origin (then named L1/L2 demo layers; renamed Magic Moments 2026-05-10)
- `backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — predecessor; AC10c synthesized entry that this item's empirical data refutes
- `backlog/complete/2026-05-09-029-cursor-source-breakdown-falsification.md` — parallel V1.6 work on M1-1 surface (no overlap with this item; both shipped 2026-05-10)
- Codex session `019e10a5-4046-7a20-9396-2543df466702`, turn 8 (`2026-05-10T21:50:11Z`) — pushback #5 endorsing this as the smallest-first item; turn 11 (`2026-05-10T22:12:47Z`) — R1 spec-review findings
- Cursor composer `c15c2eca-914a-4d9f-aceb-5d4c4dfac226`, assistant bubble `dc15993e-9ccf-4f03-9eb8-873ad8cc767c` — R1 spec-review findings (recovered via Cursor SQLite due to ECHO Cursor extractor agentKv gap, item 029 follow-ups)
