---
id: 2026-05-09-029-cursor-source-breakdown-falsification
title: "Cursor `source_breakdown` miss — 3-way falsification + targeted fix at the right layer"
status: claimed
priority: HIGH
estimate: 1-1.5d
created: 2026-05-09
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-09T21:39:03Z"
branch: "agent/cursor-source-breakdown-falsification"
worktree: "~/Desktop/Project_echo--cursor-source-breakdown-falsification"
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/trace/index.ts
  - src/capture/extractors/cursor.ts
  - src/normalize/adapters/cursor.ts
  - src/mcp/util/source-app.ts
  - src/mcp/tools/recent-work-context.ts
  - raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md
  - raw/internal/dogfooding/mcp-interactions-journal.md
  - backlog/_followups.md
  - backlog/complete/2026-05-08-028-rwc-envelope-skeleton-format.md
blocked_by: []
acceptance:
  - "**Phase 1 — Three-way falsification (read-only diagnostic, no code changes).** For a defined test window W (the agent's own active Cursor session, e.g. composer-id passed via `agent_notes`), produce a written diagnostic report in the run log answering all three questions in order: (a) **Capture:** does `echo.db` have ≥1 normalized cursor atom for the test composer in window W? Use `sqlite3 ~/Library/Application\\ Support/ECHO/echo.db \"SELECT COUNT(*), MAX(timestamp) FROM events WHERE source LIKE '%state.vscdb%' AND json_extract(metadata, '$.composer_id') = '<composer-id>' AND timestamp >= '<W.start>';\"`. (b) **Clustering:** for those captured atoms, does `getRecentWorkContext({since: W.start, until: W.end, format: 'full'})` (called via the unit test seam, NOT MCP wire) include them in the rank-1 cluster's `atom_ids[]`, OR do they sit in a sibling cluster (rank ≥ 2)? Inspect `src/trace/index.ts` cluster-building output directly. (c) **Truncation:** if cursor atoms sit in a sibling cluster, did the MCP wire-layer `limit` parameter drop that cluster? Re-run the same call via the MCP wire path with the default `limit=20` and inspect the `truncation` field in the response — `clusters_returned vs clusters_total` tells you whether truncation hid cursor activity. The diagnostic report MUST answer (a), (b), AND (c) with concrete numbers before the agent picks a fix bucket. Three separate yes/no answers, not one verdict."
  - "**Phase 2 — Targeted fix at the surfaced layer.** Based on Phase 1 outcomes: (a) If capture is broken (no cursor atoms in `echo.db` for window W despite Cursor SQLite showing bubble writes), fix `src/capture/extractors/cursor.ts` (extractor regression). (b) If capture is fine but clustering splits cursor atoms into a sibling cluster, fix the cluster-builder's edge/join logic in `src/trace/index.ts` (likely an artifact-identity rule or edge-kind sufficiency issue — see `wiki/architecture/work-trace.md` for the design intent). (c) If capture + clustering are both fine but truncation drops the cursor cluster, fix the truncation UX in `src/mcp/tools/recent-work-context.ts` (e.g., add a `next_cluster_cursor` for pagination, OR raise `source_breakdown` to be computed pre-truncate so it reflects all clusters in the window even when only N are returned). Pick exactly ONE bucket; do not multi-fix without re-running Phase 1 to confirm the second cause is real."
  - "**Phase 3 — Live verification.** Founder runs Cursor for ≥30 min of normal activity (chat + tool calls in any mode — Ask, Agent, Composer). After: agent runs `mcp__echo__get_recent_work_context()` (no args, default 4h window) and confirms `cluster.source_breakdown` contains a non-zero `cursor` count for the dominant cluster. Capture the response in the run log. Acceptance: the most recent activity-dominant cluster's `source_breakdown` reports `cursor: ≥1` when Cursor was active in the window. Verification MUST happen against a real founder session, not a synthetic fixture (Cursor's actual usage is the load-bearing test surface)."
  - "**Phase 4 — Regression test.** Add a test that fails on a manual revert of the Phase 2 fix. Test placement depends on the bucket: capture-fix → `tests/capture/cursor.test.ts`; clustering-fix → `tests/trace/index.test.ts` (or wherever `getRecentWorkContext` unit tests live); truncation-fix → `tests/mcp/recent-work-context.test.ts`. Test must use a fixture sourced from real `echo.db` data (redacted of `/Users/zhenye/...` paths per item 028's precedent) — NOT a hand-authored synthetic fixture, because the bug class lives in shape-density assumptions that synthetics don't reproduce."
  - "**Out-of-scope guardrail (do not drift):** This item does NOT touch `agentKv:`, `messageRequestContext:`, or `checkpointId:` extraction. Those are item 030's territory and gated on this item's Phase 1 finding. If Phase 1 concludes capture IS broken AND the broken capture is specifically agent-mode composers writing only to agentKv:/messageRequestContext: (no bubbleId entries), STOP and move to `pending_review/` with a note — do not implement agentKv: extraction inside this item's scope. Item 030 gets its own spec."
  - "**Decision-note + journal hygiene:** This item references `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md` as load-bearing context. Do NOT modify the decision note during implementation (it's the historical record). The 2026-05-08 20:55 PDT journal entry will get a `[CORRECTED 2026-05-09]` amendment from the strategist post-merge — agent does NOT touch the journal beyond logging Phase 1/3 MCP calls per the standard 6-field template."
  - "**Tests overall:** `npm test` passes (full suite); `npm run lint` passes; `npm run typecheck` passes. The new regression test fails on a clean revert of the Phase 2 fix."
  - "Run log appended to `raw/internal/agent-runs/<run-date>-2026-05-09-029-cursor-source-breakdown-falsification.md` with: (a) the full Phase 1 diagnostic transcript with concrete numbers for (a)/(b)/(c), (b) the chosen fix bucket and rationale, (c) the Phase 2 diff with one-line summary per file, (d) the Phase 3 live `get_recent_work_context` response showing non-zero cursor in `source_breakdown`, (e) any 030-deferral observations (what agent-mode-only capture would buy beyond legacy bubble capture, if anything)."
files_to_modify:
  - "depends on Phase 1 outcome — exactly ONE of: src/capture/extractors/cursor.ts | src/trace/index.ts | src/mcp/tools/recent-work-context.ts"
  - "tests/<corresponding test path per Phase 4>"
  - "raw/internal/agent-runs/2026-05-09-2026-05-09-029-cursor-source-breakdown-falsification.md (NEW)"
---

# Cursor `source_breakdown` miss — 3-way falsification + targeted fix at the right layer

> **Strategist note (2026-05-09):** frontmatter intentionally omitted from this draft to keep the current session a strategist conversation, not a builder claim. The claiming builder (a separate Claude Code agent already in flight per founder direction) will populate the standard frontmatter (`id`, `status`, `priority`, `estimate`, `created`, `claimed_by`, `claimed_at`, `branch`, `worktree`, `head_sha`, `pr_url`, `agent_notes`, `review_notes`, `spec_refs`, `blocked_by`, `acceptance`, `files_to_modify`) at atomic-claim time, lifting the acceptance bullets verbatim from the **Acceptance Criteria** section below.
>
> Spec refs the claiming builder will need: `src/trace/index.ts`, `src/capture/extractors/cursor.ts`, `src/normalize/adapters/cursor.ts`, `src/mcp/util/source-app.ts`, `src/mcp/tools/recent-work-context.ts`, `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`, `raw/internal/dogfooding/mcp-interactions-journal.md`, `backlog/_followups.md`, `backlog/complete/2026-05-08-028-rwc-envelope-skeleton-format.md`.

## What

When `mcp__echo__get_recent_work_context()` is called over a window that contains active Cursor traffic, the returned cluster's `source_breakdown` does not list `cursor` even though `echo.db` has captured ≥1 cursor atom in the same window. This item diagnoses **which of three candidate root causes** is responsible and fixes it at the correct layer.

The bug surfaced today (2026-05-09 13:41 PDT resume call) when a `get_recent_work_context()` call returned `cluster.source_breakdown = {claude_code:123, git:59}` despite 657 cursor events in `echo.db` for the same day, including 7 events from the founder's then-active composer `c15c2eca-914a-4d9f-aceb-5d4c4dfac226`.

## Why this scope (not "agentKv: rewrite")

The 2026-05-08 V1.5.7 journal entry diagnosed the missing-cursor symptom as a "Cursor schema migration to agentKv:/messageRequestContext: on 2026-05-01" and demoted Cursor capture to "known degraded" in `wiki/product/v1-spec.md`. Empirical SQLite + echo.db probes today (recorded in `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`) showed all three V1.5.7 claims were wrong:

- bubbleId/composerData are **active**, not frozen (1387/1413 composers post-2025-05-01; today's composer has 78 actively-growing bubble entries)
- agentKv:blob: is **content-addressed deduped message-body storage**, not a schema replacement (sample value: the Cursor system prompt)
- ECHO **is capturing today's Cursor traffic** (657 events today, 932 yesterday)

The V1.5.7 fix (commit `4c6915f`) correctly quieted ~902K orphan_assistant_bubble warnings — but the root-cause diagnosis attached to the patch over-attributed cause to a non-existent migration. The actual remaining bug is much narrower: `cluster.source_breakdown` doesn't reflect cursor activity even when capture is healthy.

Per independent code-read by Codex (journal 2026-05-09 14:15 PDT) and Cursor's Claude (composer `c15c2eca` bubble `f28acde5...` at ~14:04 PDT), `src/trace/index.ts:119` computes `source_breakdown` as `countByApp(clusterAtoms)` — only atoms that landed in **that specific cluster** count. So a missing `cursor` in `source_breakdown` can mean three different things:

1. **Capture / normalization** — nothing (or few) cursor atoms in `echo.db` for the window
2. **Graph / clustering** — cursor atoms exist but cluster-builder placed them in a sibling cluster (rank ≥ 2), not the rank-1 returned cluster
3. **Truncation** — cursor atoms are in a sibling cluster AND `limit` truncated that cluster out of the response

These have **three different fixes at three different layers**. Picking a fix without falsifying all three would land work in the wrong layer.

## Implementation Direction

Two-phase, then verify:

**Phase 1 (diagnostic, ~2-3h)** — answer all three falsification questions with concrete numbers before writing any code. Use the agent's own active Cursor session as the test surface (the dogfooding loop: AI client whose data drove the bug is the one verifying the fix).

**Phase 2 (targeted fix, ~3-5h)** — implement at the layer Phase 1 identified. Pick exactly one; do not multi-fix without re-running Phase 1.

**Phase 3 (live verification, ~30 min)** — founder uses Cursor normally for ≥30 min, agent runs `get_recent_work_context()` and confirms `cursor` appears in `source_breakdown`. Real session, not synthetic.

**Phase 4 (regression test)** — test fails on revert of Phase 2 fix. Fixture sourced from real `echo.db` data per item 028's precedent.

## Why a builder agent (not founder)

The diagnostic phase requires interleaved MCP calls (`get_recent_work_context`, `tail_session`), live Cursor SQLite reads (`sqlite3` against `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`), and live `echo.db` reads (`sqlite3` against `~/Library/Application Support/ECHO/echo.db`). All three require an agent that can run shell commands — i.e., **Cursor's Claude in Agent mode** (Ask mode cannot run MCP tools per Cursor product behavior; observed live in composer `c15c2eca` at 13:43 PDT). Cursor's Claude is the natural builder because it can verify Phase 3 against its own active session in real-time and produce dogfooding journal entries from a Cursor source — closing a known cross-tool source-diversity gap in the journal.

## Why a measurement-gated 030 punt (not "always defer agentKv:")

Item 030 (`agentKv:` / `messageRequestContext:` enrichment for agent-mode composers) is **not** scheduled by this item. But it is **not** unconditionally killed either. Phase 1's outcome decides:

- **If Phase 1 finds healthy capture for ALL composer types (including the 27 agent-mode composers with messageRequestContext: entries):** 030 is deferred indefinitely. Strategist files an updated `_followups.md` note: "agentKv: extraction not needed — legacy bubble pair capture is sufficient."
- **If Phase 1 finds healthy capture for legacy composers ONLY, and agent-mode composers (those with messageRequestContext: but no bubbleId rows for recent activity) are silently invisible:** 030 gets a real spec, scoped to agent-mode capture only.

The decision is gated on **measurement** (per-composer-type capture coverage), not narrative. This is what Cursor's Claude pushed back on at 14:04 PDT and the gating is recorded here so the agent can hand off correctly.

## Out of Scope (Don't Drift)

- Do NOT touch `agentKv:`, `messageRequestContext:`, or `checkpointId:` extraction. That's item 030, gated on Phase 1.
- Do NOT modify the decision note `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md`. It's the historical record.
- Do NOT modify the 2026-05-08 V1.5.7 journal entry. The strategist will append a `[CORRECTED 2026-05-09]` block post-merge.
- Do NOT update wiki pages. Wiki demotion-reversal happens after merge per the strategist's "After Completion" notes in this file.
- Do NOT widen `SOURCE_APP_VALUES` or change the source-app→prefix map.
- Do NOT add new MCP tools.
- Do NOT touch the `extractors-causal-metadata` branch.
- Do NOT change the default `format` or `limit` of `get_recent_work_context`. If the fix bucket is "truncation," prefer adding a paginator (`next_cluster_cursor`) or a pre-truncate `source_breakdown` field over silently raising the default — the truncation UX is part of item 028's contract.
- Do NOT implement multi-bucket fixes. Pick one. If Phase 1 surfaces two real causes, surface that to founder via `pending_review/` and ask which to scope first.

If the agent discovers Phase 1 is harder to instrument than the spec assumes (e.g., `getRecentWorkContext` doesn't have a unit-test seam that exposes pre-truncate cluster lists), STOP, document what would need to change, and move to `pending_review/` with the question. Do not invent the seam silently.

## After Completion (Strategist Notes)

Post-shipment, the strategist will:

1. **Reverse the wiki demotion** (per `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md` "Downstream actions" section):
   - `wiki/capture/cursor-extractor.md` — remove `capture_status: degraded` frontmatter + warning callout
   - `wiki/capture/per-app/cursor-collected-data.md` — same
   - `wiki/product/v1-spec.md` — remove "Cursor capture degraded" subsection from Known V1 Limitations; un-flag the Bundle table row
2. **Amend the 2026-05-08 20:55 PDT journal entry** with a `[CORRECTED 2026-05-09]` block linking to the decision note. Original entry text stays intact.
3. **Move `_followups.md` "Cursor capture — `agentKv:` migration"** from "Known V1 degraded surfaces" to a new "Resolved (with corrected diagnosis)" subsection.
4. **Update `wiki/capture/cursor-extractor.md`** with whichever architectural finding Phase 1 produced (e.g., a "Source-app coverage in trace clustering" subsection) — only if Phase 1 surfaced something publishable beyond "capture works fine, clustering had a bug."
5. **File item 030** if and only if Phase 1's per-composer-type measurement showed agent-mode capture is genuinely insufficient. Otherwise, update `_followups.md` to record "agentKv: extraction not needed (Phase 1 measurement)."

## Acceptance Criteria

The claiming builder lifts these bullets verbatim into the frontmatter `acceptance:` field at atomic-claim time. Each bullet is enforceable as written.

1. **Phase 1 — Three-way falsification (read-only diagnostic, no code changes).** For a defined test window W (the agent's own active Cursor session, e.g. composer-id passed via `agent_notes`), produce a written diagnostic report in the run log answering all three questions in order:
   - **(a) Capture:** does `echo.db` have ≥1 normalized cursor atom for the test composer in window W? Use `sqlite3 ~/Library/Application\ Support/ECHO/echo.db "SELECT COUNT(*), MAX(timestamp) FROM events WHERE source LIKE '%state.vscdb%' AND json_extract(metadata, '$.composer_id') = '<composer-id>' AND timestamp >= '<W.start>';"`.
   - **(b) Clustering:** for those captured atoms, does `getRecentWorkContext({since: W.start, until: W.end, format: 'full'})` (called via the unit test seam, NOT MCP wire) include them in the rank-1 cluster's `atom_ids[]`, OR do they sit in a sibling cluster (rank ≥ 2)? Inspect `src/trace/index.ts` cluster-building output directly.
   - **(c) Truncation:** if cursor atoms sit in a sibling cluster, did the MCP wire-layer `limit` parameter drop that cluster? Re-run the same call via the MCP wire path with the default `limit=20` and inspect the `truncation` field in the response — `clusters_returned vs clusters_total` tells you whether truncation hid cursor activity.

   The diagnostic report MUST answer (a), (b), AND (c) with concrete numbers before the agent picks a fix bucket. Three separate yes/no answers, not one verdict.

2. **Phase 2 — Targeted fix at the surfaced layer.** Based on Phase 1 outcomes:
   - **(a)** If capture is broken (no cursor atoms in `echo.db` for window W despite Cursor SQLite showing bubble writes), fix `src/capture/extractors/cursor.ts` (extractor regression).
   - **(b)** If capture is fine but clustering splits cursor atoms into a sibling cluster, fix the cluster-builder's edge/join logic in `src/trace/index.ts` (likely an artifact-identity rule or edge-kind sufficiency issue — see `wiki/architecture/work-trace.md` for the design intent).
   - **(c)** If capture + clustering are both fine but truncation drops the cursor cluster, fix the truncation UX in `src/mcp/tools/recent-work-context.ts` (e.g., add a `next_cluster_cursor` for pagination, OR raise `source_breakdown` to be computed pre-truncate so it reflects all clusters in the window even when only N are returned).

   Pick exactly ONE bucket; do not multi-fix without re-running Phase 1 to confirm the second cause is real.

3. **Phase 3 — Live verification.** Founder runs Cursor for ≥30 min of normal activity (chat + tool calls in any mode — Ask, Agent, Composer). After: agent runs `mcp__echo__get_recent_work_context()` (no args, default 4h window) and confirms `cluster.source_breakdown` contains a non-zero `cursor` count for the dominant cluster. Capture the response in the run log. Acceptance: the most recent activity-dominant cluster's `source_breakdown` reports `cursor: ≥1` when Cursor was active in the window. Verification MUST happen against a real founder session, not a synthetic fixture.

4. **Phase 4 — Regression test.** Add a test that fails on a manual revert of the Phase 2 fix. Test placement depends on the bucket: capture-fix → `tests/capture/cursor.test.ts`; clustering-fix → `tests/trace/index.test.ts` (or wherever `getRecentWorkContext` unit tests live); truncation-fix → `tests/mcp/recent-work-context.test.ts`. Test must use a fixture sourced from real `echo.db` data (redacted of `/Users/zhenye/...` paths per item 028's precedent) — NOT a hand-authored synthetic fixture, because the bug class lives in shape-density assumptions that synthetics don't reproduce.

5. **Out-of-scope guardrail (do not drift).** This item does NOT touch `agentKv:`, `messageRequestContext:`, or `checkpointId:` extraction. Those are item 030's territory and gated on this item's Phase 1 finding. If Phase 1 concludes capture IS broken AND the broken capture is specifically agent-mode composers writing only to agentKv:/messageRequestContext: (no bubbleId entries), STOP and move to `pending_review/` with a note — do not implement agentKv: extraction inside this item's scope. Item 030 gets its own spec.

6. **Decision-note + journal hygiene.** This item references `raw/internal/decisions/2026-05-09-cursor-capture-diagnosis-correction.md` as load-bearing context. Do NOT modify the decision note during implementation (it's the historical record). The 2026-05-08 20:55 PDT journal entry will get a `[CORRECTED 2026-05-09]` amendment from the strategist post-merge — agent does NOT touch the journal beyond logging Phase 1/3 MCP calls per the standard 6-field template.

7. **Tests overall:** `npm test` passes (full suite); `npm run lint` passes; `npm run typecheck` passes. The new regression test fails on a clean revert of the Phase 2 fix.

8. **Run log appended** to `raw/internal/agent-runs/<run-date>-2026-05-09-029-cursor-source-breakdown-falsification.md` with: (a) the full Phase 1 diagnostic transcript with concrete numbers for (a)/(b)/(c), (b) the chosen fix bucket and rationale, (c) the Phase 2 diff with one-line summary per file, (d) the Phase 3 live `get_recent_work_context` response showing non-zero cursor in `source_breakdown`, (e) any 030-deferral observations (what agent-mode-only capture would buy beyond legacy bubble capture, if anything).

**Files to modify** (claiming builder lifts into frontmatter `files_to_modify:`):
- depends on Phase 1 outcome — exactly ONE of: `src/capture/extractors/cursor.ts` | `src/trace/index.ts` | `src/mcp/tools/recent-work-context.ts`
- `tests/<corresponding test path per Phase 4>`
- `raw/internal/agent-runs/<run-date>-2026-05-09-029-cursor-source-breakdown-falsification.md` (NEW)
