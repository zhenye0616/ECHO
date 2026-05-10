---
id: 2026-05-10-032-m2-first-call-reliability
title: M2 first-call reliability — non-self auto-expand + resume-friendly get_atoms ordering
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
  - src/trace/recent-work-context.ts
  - src/mcp/tools/get-atoms.ts
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

Make the first `find_clusters()` + `get_atoms()` chain call **work usefully on its own** in the resume-after-long-gap scenario, without forcing the caller to (a) pre-widen the lookback, or (b) pre-reorder atom_ids. Demo bar: founder cold-starts in any of {Cursor, Claude Code, Codex} after a multi-hour gap, runs the documented chain with no args (or with the minimal migration-recipe args), and gets back the prior work session — not the current calling session.

# In Scope (Acceptance Criteria)

1. **Non-self cluster auto-expand predicate.** In `src/mcp/tools/find-clusters.ts` (and the underlying `src/trace/recent-work-context.ts` empty-expand path), the auto-expand trigger changes from `clusters.length === 0` to `no_useful_cluster`, where `no_useful_cluster` is true when **all** returned clusters satisfy ANY of:
   - The cluster contains atoms only from a single source-app
   - AND the latest atom in the cluster is within `SELF_CLUSTER_RECENT_THRESHOLD_MS` of `now` (default: 5 minutes)
   - AND `source_breakdown` keys count ≤ 1
   In English: "the only cluster I got back is just my own current activity from the last few minutes." On `no_useful_cluster=true`, fire the existing 24h auto-expand exactly once. Emit a `[AUTO_EXPAND]`-prefixed warning identifying the trigger ("self-only-recent" vs the existing "empty"). Do NOT auto-expand if the user passed an explicit `since`/`until` — explicit-over-implicit per item 027 conventions.

2. **Resume-friendly `get_atoms` ordering option.** In `src/mcp/tools/get-atoms.ts`, accept a new optional parameter `prefer: "as_requested" | "newest_first"` (default: `"as_requested"` to preserve current contract). When `prefer="newest_first"`:
   - Sort `atom_ids[]` by atom timestamp descending before applying the deterministic prefix-drop budget loop
   - The deterministic prefix-drop semantics are unchanged (drops fall on the END of the processed order)
   - Net effect: oldest atoms get dropped, not newest — matching the resume-call intent
   - Returned `atoms[]` are still in the post-sort order (newest-first); `atoms_dropped_ids` lists the dropped IDs in that same order
   - When `prefer="newest_first"` AND the consumer passed `atom_ids` already in a meaningful order, document the override behavior clearly in the tool description.

3. **Update the migration recipe in `recent-work-context.ts:24-53` (the deprecation banner)** to call out:
   - "For resume-style queries (where did I leave off), pass `prefer='newest_first'` to `get_atoms`."
   - "No-args `find_clusters()` now auto-expands to 24h when the only returned cluster is your own current session."

4. **Test coverage:**
   - Unit test: `no_useful_cluster` predicate against 4 fixture cases — empty, self-only-recent, self-only-old, multi-source. Auto-expand fires only on the first two.
   - Unit test: `get_atoms(atom_ids, prefer='newest_first')` on a fixture where the budget can only fit half the atoms — verify dropped IDs are the OLDEST, not the newest. Compare against `prefer='as_requested'` baseline on the same fixture.
   - Integration test: chain `find_clusters({})` → pick rank-1 cluster → `get_atoms(cluster.atom_ids, prefer='newest_first')` on a 24h-spanning fixture where the first 4h is empty + the prior 4-24h has a multi-source work session. Assert: chain returns the prior work session's most-recent atoms (not dropped), with `[AUTO_EXPAND] self-only-recent` warning surfaced.

5. **Dogfooding:** After merge, founder (or strategist) runs the same chain that was logged at 2026-05-10 13:06 PDT — no-args `find_clusters()` after a multi-hour gap — and logs an entry to `raw/internal/dogfooding/mcp-interactions-journal.md` documenting whether the auto-expand fired and whether the newest atom landed in the response.

# Out of Scope (Don't Drift)

- **Do NOT touch `search_memories` ranking semantics.** The "verdict-turn ranking" friction (M1-2, separate item 033 candidate, sequenced after this) is a different surface. Substring + recency stays as today.
- **Do NOT add `get_atom(id, full=true)`** the full-atom recovery escape hatch (M1-3 / item 034 candidate). Separate item per Codex pushback #5 split.
- **Do NOT touch envelope ceiling constants** (`WIRE_SHAPE_CAPS.match_content`, `FIND_CLUSTERS_RESPONSE_BYTE_CEILING`, `GET_ATOMS_RESPONSE_BYTE_CEILING`). 030 fixup `c12617b` enforced them; leave alone.
- **Do NOT remove `get_recent_work_context`.** Item 031 owns the deprecation; this item ships before that one per Codex pushback #2 sequencing.
- **Do NOT add hotkey overlay scaffolding** even though this item unblocks it. Overlay is item 035 candidate.
- **Do NOT change `find_clusters`' atom_ids[] ordering** — it stays cluster-internal (timestamp-ascending). The change is purely in `get_atoms`' opt-in `prefer` parameter. Don't push order-flipping upstream.
- **Don't widen the auto-expand beyond 24h.** Today's path is 4h → 24h. If `no_useful_cluster` is still true after the 24h pass, return the (uninformative) cluster set and let the caller widen further explicitly. Don't ladder to 48h / 1w — that's a separate UX question for V1.7+.

# Implementation Notes

- `find-clusters.ts` already has the `clusters.length === 0` empty-expand path with `[AUTO_EXPAND]` warning. Extend, don't replace.
- The `no_useful_cluster` predicate should be a pure function (no IO), unit-testable in isolation.
- `SELF_CLUSTER_RECENT_THRESHOLD_MS` default 5 minutes is judgment-bound by the AI-client's typical "I just sent a message + got a response" turnaround. Make it a named constant; don't hardcode in the predicate.
- `get_atoms` `prefer` parameter: zod schema in the existing `inputSchema`; default `"as_requested"` to preserve back-compat for non-resume callers (search_memories pipeline, group-session subscribers, etc.).
- Bump `mcp-integration-smoke.sh` to validate `prefer='newest_first'` round-trip if it has time. Not strictly required for acceptance.

# After Completion (Strategist Notes)

- **Promote the new behavior to `wiki/surfaces/`:**
  - Update `wiki/surfaces/mcp-find-clusters.md` (post-030 strategist promotion will create this) — add a "Auto-expand triggers" sub-section documenting the empty-expand AND self-only-recent expand paths.
  - Update `wiki/surfaces/mcp-get-atoms.md` (post-030 strategist promotion will create this) — add a "Resume-call usage" sub-section documenting `prefer='newest_first'`.
- **Move M2-1 + M2-2 from `_followups.md` "biting" to "resolved" subsection** with this item's merge SHA + the dogfooding-verification entry timestamp.
- **Update `wiki/architecture/group-session.md`** (post-030 strategist promotion will create this) — note that the first-call reliability gate is now closed for resume-after-gap scenarios; group-session continuation calls (subsequent `wait_for_new_turns` rounds) are unaffected.
- **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness** after ≥1 week of post-merge dogfooding entries. The judgment-step + first-call-reliability gates can BOTH close before item 031 ships per Codex pushback #2.

# References

- `raw/internal/dogfooding/mcp-interactions-journal.md` — 2026-05-10 13:06 PDT entry (the empirical trigger); 2026-05-10 14:46 / 14:48 / 14:53 / 14:55 PDT entries (Codex + strategist mirror-pair confirming sequencing)
- `raw/internal/decisions/2026-05-10-coordination-layer-defer-pending-030.md` — M1/M2 vocab origin (then named L1/L2 demo layers; renamed Magic Moments 2026-05-10)
- `backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — predecessor; AC10c synthesized entry that this item's empirical data refutes
- `backlog/complete/2026-05-09-029-cursor-source-breakdown-falsification.md` — parallel V1.6 work on M1-1 surface (no overlap with this item; both can be in-flight simultaneously)
- Codex session `019e10a5-4046-7a20-9396-2543df466702`, turn 8 (`2026-05-10T21:50:11Z`) — pushback #5 explicitly endorsing this as the smallest-first item to ship
