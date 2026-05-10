---
id: 2026-05-10-032-m2-first-call-reliability
title: M2 first-call reliability — single-source-recent demotion + resume-friendly get_atoms ordering
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-10
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-10T22:45:40Z"
branch: "agent/m2-first-call-reliability"
worktree: "~/Desktop/Project_echo--m2-first-call-reliability"
head_sha: "a16779ed368fea90f1ce19372b818cf9b9f6d239"
pr_url: ""
agent_notes: |
  AC1–AC4 all implemented + tested + green on the full suite (644 passed | 21 skipped).
  Lint clean; typecheck clean.

  Implementation surface:
    - NEW src/trace/auto-expand.ts: SINGLE_SOURCE_RECENT_THRESHOLD_MS=300_000,
      isSingleSourceRecent(), noUsefulCluster() — predicate operates on
      NormalizedContextEvent.time.occurred_at per AC1.
    - src/trace/rank.ts: optional RankOptions {demoteSingleSourceRecent, nowMs}
      4th param; when on, a NEW primary sort key (singleSourceRecent asc) is
      added BEFORE the existing 5-key chain — strict partition per R2-2.
      Default false preserves all existing callers' behavior.
    - src/mcp/tools/recent-work-context.ts: getRecentWorkContext no-args path
      now extends auto-expand to fire on noUsefulCluster(4h) (covers both
      empty AND all-single-source-recent). When trigger is single-source-recent,
      24h response is re-ranked with demote=true + rank/rank_reason rewritten.
      Warning is `[AUTO_EXPAND] <trigger> ...` per AC1.
    - src/mcp/tools/get-atoms.ts: NEW `prefer: "as_requested" | "newest_first"`
      parameter. newest_first: dedupes input to first occurrence (R2-3 NEW
      behavior), sorts existing by CaptureEvent.timestamp DESC (stable, ties →
      input order), appends missing IDs at end. Existing prefix-drop loop
      operates on the new process order.
    - Description strings (AC3): FIND_CLUSTERS_DESCRIPTION + recent-work-context
      deprecation marker + GET_ATOMS_DESCRIPTION all updated in lockstep.

  Test additions (AC4): 21 new test cases across 4 files. Predicate × 9,
  rank strict-partition × 2, find-clusters chain × 2, get-atoms newest_first × 5.

  No drift events caught; no founder-input blockers; no scope expansion.
  Branch agent/m2-first-call-reliability pushed at SHA a16779ed.
review_notes: ""
spec_refs:
  - src/mcp/tools/find-clusters.ts
  - src/mcp/tools/recent-work-context.ts
  - src/mcp/tools/get-atoms.ts
  - src/trace/rank.ts
  - src/storage/interface.ts  # CaptureEvent.timestamp (raw storage layer)
  - src/normalize/types.ts    # NormalizedContextEvent.time.occurred_at (the field used by trace + ranking; AC1 references this)
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
- The latest `NormalizedContextEvent.time.occurred_at` of any atom in `C` is within `SINGLE_SOURCE_RECENT_THRESHOLD_MS` of `now` (default: 5 minutes / 300_000 ms).

(The trace builder operates on `NormalizedContextEvent`, not raw `CaptureEvent` — see `src/normalize/types.ts:19`. Storage's `CaptureEvent.timestamp` is the upstream wire timestamp; the normalized layer is where ranking and clustering happen.)

**Predicate.** `no_useful_cluster(clusters)` is true iff **every** cluster in the returned set is single-source-recent. The empty set is vacuously true (preserves today's empty-only auto-expand behavior as a degenerate case).

**Naming note.** The predicate uses observable fields only; it does NOT prove the cluster IS the calling session. It's a heuristic that "single-source AND recent" is overwhelmingly likely to be the calling client's noise. Per Codex review Cx2, the spec deliberately avoids "self" in the field name to make this honest. If a future item needs true caller identity, that's a separate primitive (the MCP request itself does not carry caller-session identity today).

**Auto-expand behavior in `src/mcp/tools/find-clusters.ts` (and the underlying `getRecentWorkContext` no-args path in `src/mcp/tools/recent-work-context.ts`):**
- If the user passed an explicit `since` or `until`, do NOT auto-expand (explicit-over-implicit per item 027). Return clusters as-is.
- After the default 4h pass, if `no_useful_cluster(clusters_4h)` is true, fire the existing 24h auto-expand exactly once. Emit a `[AUTO_EXPAND]`-prefixed warning identifying the trigger as either `"empty"` (the existing case — 4h returned 0 clusters) or `"single-source-recent"` (the new case — 4h returned only single-source-recent clusters).

**Demotion (load-bearing — addresses Codex review Cx1 and R2-2):**
After the 24h pass returns its cluster set, if the set contains BOTH single-source-recent clusters AND non-single-source-recent clusters, **demote** all single-source-recent clusters to rank STRICTLY BELOW all non-single-source-recent clusters, regardless of their other rank signals (`matches_artifact_hint`, `has_open_loop`, `recent_activity`, `size`, `negMedianAge`).

**Why a strict partition, not a single-signal nudge:** `rank.ts:110-118` sorts on `hint > openLoop > recent > size > negMedianAge > cluster_id`. Forcing only `recent_activity=0` for single-source-recent clusters is insufficient because a noise cluster carrying `matches_artifact_hint=1` (e.g., the caller passed an `artifact_hint`) or `has_open_loop=1` would still outrank the prior multi-source work cluster. The demo bar requires `clusters[0]` to be prior work whenever prior work exists in 24h — that's a structural guarantee, not a per-signal nudge.

**Implementation contract.** Add a primary sort key in `rank.ts` BEFORE the existing 5-key chain: `isSingleSourceRecent ? 1 : 0` ascending (so non-single-source-recent clusters sort first). Tiebreak via the existing 5-key chain unchanged. The primary key is gated on a new `demoteSingleSourceRecent: boolean` parameter, default `false` (preserves all existing rank semantics for non-auto-expand calls). The `find-clusters.ts` call site passes `true` ONLY when the 24h auto-expand fired with trigger `"single-source-recent"`.

If the 24h set contains only single-source-recent clusters (degenerate — the user genuinely has nothing else in 24h), the primary partition is uniform and the existing 5-key chain decides order. Do not synthesize an empty response.

The demotion does NOT apply to:
- Caller-specified `since`/`until` calls (explicit-over-implicit; user asked for a specific window, return everything they asked for in normal rank order)
- The empty-trigger auto-expand path (no single-source-recent cluster exists in the 24h result by construction of the empty trigger)
- Direct callers of `rank.ts` that pass `demoteSingleSourceRecent=false` (default)

### AC2 — Resume-friendly `get_atoms` ordering option

In `src/mcp/tools/get-atoms.ts`, accept a new optional parameter `prefer: "as_requested" | "newest_first"` (default: `"as_requested"` to preserve current contract).

When `prefer="newest_first"`:
- **Sort key**: atom `CaptureEvent.timestamp` descending (storage-layer field, same instant as `NormalizedContextEvent.time.occurred_at` after normalization — `get_atoms` reads `CaptureEvent` directly from storage and does NOT import the normalize layer). Stable sort — ties resolve in original request order. **Note** — AC1's predicate operates on normalized clusters and references `NormalizedContextEvent.time.occurred_at`; AC2's `get_atoms` operates on raw `CaptureEvent`s and references `CaptureEvent.timestamp`. The two field names point at the same physical instant for the same atom (the normalizer populates `time.occurred_at` from `CaptureEvent.timestamp` or per-source overrides — see `src/normalize/`); the spec uses the per-layer canonical name so implementers don't cross layer boundaries unnecessarily.
- **Missing IDs (not in storage)**: have no timestamp to sort against. Append them at the END of the sorted list, preserving their relative request order. They still appear in `atoms_dropped_ids` per existing contract; the only change is their position in the iteration order, which determines drop priority.
- **Duplicate IDs in input (new opt-in behavior, addresses R2-3):** Under `prefer="newest_first"`, duplicate IDs in the input are de-duplicated to first occurrence BEFORE sorting. Each unique ID appears at most once in `atoms[]`. This is NEW behavior introduced with `prefer="newest_first"` — `prefer="as_requested"` (default) preserves the existing storage contract (`getByIds(readonly EventId[])` returns one entry per input ID, including duplicates as repeated entries). Document this asymmetry explicitly in the tool description so callers passing duplicates intentionally know to use the default.
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
- **Unit test (demotion — strict partition, addresses R2-2):** rank input with three clusters, where the single-source-recent cluster has the strongest signals (`matches_artifact_hint=1, has_open_loop=1, recent=1, size=20`) and two non-single-source-recent clusters have weak signals (`hint=0, openLoop=0, recent=0, size=5` each). With `demoteSingleSourceRecent=true`, assert post-rank order: BOTH non-single-source-recent clusters rank ahead of the single-source-recent cluster, regardless of its dominant signals. With `demoteSingleSourceRecent=false` (baseline), single-source-recent ranks first because its hint+openLoop signals dominate. The strict-partition guarantee is the contract — diff the two outputs.
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
- Timestamp field is `NormalizedContextEvent.time.occurred_at` (the normalized event time, populated during normalization from upstream `CaptureEvent.timestamp` or per-source overrides). Trace builder + ranking already use this field consistently; the predicate must use the same one for cluster-level "latest atom" comparison. NOT `CaptureEvent.timestamp` — that's the raw-storage upstream field; the trace layer doesn't see it directly.
- Demotion is implemented in `src/trace/rank.ts` (the same file Codex Cx1 named): take a `demoteSingleSourceRecent: boolean` parameter, default false. When true, add a NEW primary sort key `isSingleSourceRecent ? 1 : 0` BEFORE the existing 5-key chain (`hint > openLoop > recent > size > negMedianAge`), so non-single-source-recent clusters sort first. The existing 5-key chain becomes the tiebreaker WITHIN each partition. **Do NOT implement this as a `recent_activity=0` override** — an earlier draft of this spec described that approach and it was rejected in R2 because it doesn't dominate the `hint` and `openLoop` signals. Strict partition is the contract. The call site in `find-clusters.ts` passes `true` only after the single-source-recent auto-expand fires.
- `get_atoms` `prefer` parameter: zod schema in the existing `inputSchema`; default `"as_requested"` to preserve back-compat for non-resume callers (search_memories pipeline, group-session subscribers, etc.). The `format` parameter is unchanged.
- For the missing-ID position rule (AC2): `getByIds(readonly EventId[])` does NOT return null-padded arrays — it returns only rows that exist (preserving relative request order among existing rows; see `src/storage/sqlite.ts:~161-183`). `get_atoms` already walks the full input `atom_ids` list and pushes IDs not present in the storage result into `atoms_dropped_ids`. To implement `prefer="newest_first"`: build the timestamp-keyed sort over the rows STORAGE RETURNED; for each input ID not present in the returned set, append it to a "missing" suffix preserving request order; concatenate `[sorted_existing..., missing...]` and apply the deterministic prefix-drop budget loop to that combined sequence. Missing IDs naturally land last → dropped first.
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
- **Cx1 (HIGH — load-bearing demo-bar gap)** — `rank.ts` sorts on `recent_activity` before `size`, so a single-source-recent cluster outranks an older multi-source prior cluster even after auto-expand. R1 patch added a demotion rule that forced `recent_activity=0` — that was REJECTED in R2 because it doesn't dominate `hint`/`openLoop`. Current fix (R2): strict-partition primary sort key (see AC1 "Demotion" paragraph + Implementation Notes). Demo bar is now a structural guarantee.
- **Cx2 ("self" misnomer)** — predicate doesn't actually prove identity. Renamed throughout from `non-self` / `self-only-recent` to `single-source-recent`. Spec is now honest about the heuristic. Documented explicitly in AC1 "Naming note."
- **Cx3 (dogfooding AC misplaced)** — moved from AC5 to After Completion as a founder/strategist verification step.

**Cursor-only findings (3):**
- **Cu1 (P1 — description-string lock-step)** — `FIND_CLUSTERS_DESCRIPTION` in `find-clusters.ts:64-65` and any `outputSchema` docs must update in lockstep with behavior. Added as AC3 (renumbered; old AC3 → AC3 absorbed into the same bullet).
- **Cu2 (timestamp field unnamed)** — AC1 referenced "latest atom" without naming the field. The R1 patch initially named `CaptureEvent.occurred_at` and added `src/normalize/event.ts` to `spec_refs` — both wrong (caught by R2-1, see below). The current spec uses `NormalizedContextEvent.time.occurred_at` (the field the trace + ranking layers actually use), with `spec_refs` pointing at `src/storage/interface.ts` + `src/normalize/types.ts`.
- **Cu3 (resume_tail_source non-standard)** — kept in frontmatter (item 029 also uses it; effectively the emerging hint-field convention per Codex's spec-template improvements). Tools validate-tolerant. No-op for this revision.

**Disposition:** All 9 findings addressed in this revision.

# Review Round 2 — Post-patch verification (Cursor + Codex, 2026-05-10 15:32 PDT)

The R1 patch was reviewed by both Cursor (composer `c15c2eca`, bubbles `f64ac5f7` + `823c123f`) and Codex (session `019e10a5-...`, turn 15). 3 new findings, all convergent or single-source — all applied in this revision. Pattern note: **fifth independent confirmation cycle** of cross-tool-review-finds-things-single-tool-misses, **first cycle where one reviewer caught issues introduced by the previous round's patch itself.**

**Convergent (both caught):**
- **R2-1 (Codex HIGH / Cursor nit) — Field naming was wrong.** R1's patch referenced `CaptureEvent.occurred_at` (doesn't exist) and added `src/normalize/event.ts` to `spec_refs` (doesn't exist). Storage's `CaptureEvent` has `.timestamp` (`src/storage/interface.ts:6`); the trace/rank layer operates on `NormalizedContextEvent.time.occurred_at` (`src/normalize/types.ts:19`). **Fixed:** AC1 + AC2 + Implementation Notes all reference `NormalizedContextEvent.time.occurred_at`; `spec_refs` updated to `src/storage/interface.ts` + `src/normalize/types.ts` with a per-file note explaining which timestamp lives where.

**Codex-only:**
- **R2-2 (Medium) — Demotion-by-`recent=0` insufficient.** `rank.ts:110-118` sorts `hint > openLoop > recent > size > negMedianAge`. The R1 fix only neutralized the `recent` signal, leaving the noise cluster able to outrank prior work via `hint` or `openLoop`. **Fixed:** AC1 demotion is now a strict partition — single-source-recent clusters sort STRICTLY BELOW all non-single-source-recent clusters via a new primary sort key in `rank.ts`, regardless of all other signals. The existing 5-key chain becomes the tiebreaker within each partition. Demo bar is now a structural guarantee.
- **R2-3 (Medium/Low) — Duplicate-ID claim was factually wrong.** R1's AC2 said duplicate-ID-collapse was "existing behavior — confirm preserved." But storage's `getByIds(readonly EventId[])` doesn't dedupe at the contract level; duplicates ARE returned multiple times. **Fixed:** AC2 now declares dedup-to-first-occurrence as NEW opt-in behavior introduced with `prefer="newest_first"`. `prefer="as_requested"` (default) preserves the existing duplicate-returns-duplicates contract. The asymmetry is documented in the tool description.

**Disposition:** All 3 R2 findings addressed.

# Review Round 3 — Internal-contradiction cleanup (Cursor + Codex, 2026-05-10 15:39 PDT)

Both reviewers ran a third pass on the R2-patched spec and converged on internal contradictions between AC1/AC2 (which had been updated) and Implementation Notes (which had stale wording from earlier rounds). Verdicts: Codex *"Pushback, but small. After those two wording fixes: proceed."* / Cursor *"Verdict: Proceed (hygiene only — not a reason to block). Optionally apply a tiny spec-only edit."* 3 unique findings, all wording-only, all applied in this revision.

**Convergent (both caught):**
- **R3-1 — Implementation Notes contradicted AC1's strict-partition rule.** The R2 patch updated AC1 to a strict partition (new primary sort key in `rank.ts`) but left the Implementation Notes describing the older "override `recent_activity` to false" approach. A builder reading Implementation Notes literally would have implemented the rejected weaker fix. **Fixed:** Implementation Notes now describes the strict-partition implementation explicitly, with an inline rejection note pointing back to R2 so future readers don't reintroduce the weaker fix.
- **R3-2 — AC2 timestamp field crossed layer boundaries.** AC2 said `get_atoms` sorts by `NormalizedContextEvent.time.occurred_at`, but `get_atoms` operates on `CaptureEvent` from storage and doesn't import the normalize layer. **Fixed:** AC2 now sorts by `CaptureEvent.timestamp` (the storage-layer canonical), with a note that AC1's predicate (normalized clusters) uses `NormalizedContextEvent.time.occurred_at` — same physical instant, different per-layer canonical name. The two-layer disambiguation is explicit.

**Cursor-only:**
- **R3-3 — `getByIds` missing-ID semantics wrong.** Implementation Notes claimed `getByIds` returns a request-order-aligned array with `null` entries for missing IDs (which would have implied `get_atoms` pre-sorts using `null` as a sentinel). Storage's actual contract: `getByIds` returns only existing rows, preserving relative request order; `get_atoms` already walks the full input list and pushes missing into `atoms_dropped_ids`. **Fixed:** Implementation Notes now describes the actual pattern — sort over the rows storage returned, append missing IDs as a suffix preserving request order, then apply the prefix-drop loop.

**Disposition:** All 3 R3 findings applied. **Cursor explicitly says "Proceed"; Codex says "After those two wording fixes: proceed."** Both fixes now landed. Spec is ready for builder claim (assuming founder agrees with this assessment).

**Pattern note (load-bearing — sixth confirmation):** This is the **sixth independent confirmation cycle** of cross-tool-review-finds-things-single-tool-misses, and the **second cycle where reviewers caught regressions in the previous patch round** (R2 caught R1 regressions; R3 caught R2 regressions). Strategist has now introduced patch-induced regressions in TWO consecutive rounds — R1→R2 was hallucinated field/path names; R2→R3 was internal-contradiction-between-AC-and-Implementation-Notes when only AC was updated. **Hypothesis:** strategist patches that touch one section but not the cross-referencing sections of the same spec are a recurring failure mode. Worth a process change — when patching AC, grep the rest of the spec for stale cross-references before commit.

# References

- `raw/internal/dogfooding/mcp-interactions-journal.md` — 2026-05-10 13:06 PDT entry (empirical trigger); 14:46 / 14:48 / 14:53 / 14:55 / 15:00 PDT entries (Codex + strategist mirror-pair confirming sequencing); the 15:15 PDT review-synthesis entry capturing this R1 cycle
- `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — M1/M2 vocab origin (then named L1/L2 demo layers; renamed Magic Moments 2026-05-10)
- `backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — predecessor; AC10c synthesized entry that this item's empirical data refutes
- `backlog/complete/2026-05-09-029-cursor-source-breakdown-falsification.md` — parallel V1.6 work on M1-1 surface (no overlap with this item; both shipped 2026-05-10)
- Codex session `019e10a5-4046-7a20-9396-2543df466702`, turn 8 (`2026-05-10T21:50:11Z`) — pushback #5 endorsing this as the smallest-first item; turn 11 (`2026-05-10T22:12:47Z`) — R1 spec-review findings
- Cursor composer `c15c2eca-914a-4d9f-aceb-5d4c4dfac226`, assistant bubble `dc15993e-9ccf-4f03-9eb8-873ad8cc767c` — R1 spec-review findings (recovered via Cursor SQLite due to ECHO Cursor extractor agentKv gap, item 029 follow-ups)
