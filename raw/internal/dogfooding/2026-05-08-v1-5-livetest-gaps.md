# V1.5 Full-Halt Live-Test Gaps — 2026-05-08 17:01–17:03 PDT

Companion to `mcp-interactions-journal.md` (same date entry). Each gap below cites the call(s) it surfaced from and proposes a scope label. Labels are first-pass categorizations for the strategist conversation that converts these to backlog items — *not* design decisions.

**Test surface exercised:** all 4 ECHO MCP tools (`echo_ping`, `get_recent_work_context`, `search_memories`, `tail_session`) and 4 of 5 `echo-memory` MCP tools (`memory_get_profile`, `memory_list_recent`, `memory_search`, `memory_ingest`; `memory_get_task_status` not testable since `memory_ingest` failed before returning a task_id; `memory_invalidate` not exercised — needs a fact_id).

**Cross-axis coverage:**
- **Cross-session:** ✅ tested — tail_session per app + search_memories cross-conversation
- **Cross-tool:** ✅ tested — source_app filter on search_memories (cursor/codex), source_breakdown in clusters
- **Cross-day:** ✅ tested — since/until 2 days back + 48h window

---

## Gap 1 — ~~Memory MCP (`echo-memory`) is fully broken end-to-end~~ **NOT-A-GAP (stale connector from a different project)**

**Status:** Reclassified 2026-05-08 evening — `echo-memory` is **not** an ECHO V1.5 surface. It's a stale MCP connector in `~/.claude.json` pointing at `~/Desktop/Projects/EchoChat/apps/backend/.venv/bin/python -m app.mcp` (the EchoChat project's memory server, an unrelated codebase). The real ECHO MCP is the `echo` connector (`http://127.0.0.1:38478/mcp`) which exposes `echo_ping`, `get_recent_work_context`, `search_memories`, `tail_session` — all healthy on this run.
**Scope label:** **out of V1.5 scope.** Founder's `~/.claude.json` housekeeping — the `echo-memory` entry can be removed (`claude mcp remove echo-memory`) so AI clients stop seeing the broken tools.
**Original symptom kept for record:** `memory_get_profile`, `memory_list_recent`, `memory_search`, `memory_ingest` all returned `(sqlite3.OperationalError) unable to open database file`. Root cause was the EchoChat server's relative `DATABASE_URL` resolving against whatever CWD Claude Code launched it from — irrelevant to ECHO.

---

## Gap 2 — Cursor turn capture is silently 7 days stale

**Severity:** P0 (V1 cohort bundle promise: "Cursor + Claude Code + GitHub + Slack + web AI extension")
**Calls:** 6, 13 (corroborated by 5 returning 0 hits on a query that *should* land on recent Cursor turns if any existed)
**Symptom:** `tail_session(source_app="cursor")` auto-resolves to a `state.vscdb` session whose newest turn is **2026-05-01T08:40Z** (7 days old) on a machine where Cursor has been used since. No warning, no degraded-source signal.
**Scope label:** **V1.5 ship-blocker.** "Cursor + Claude Code" is the V1 demo's anchor. If the cursor lane has no turns from this week the demo is hollow — the AI client gets the *fs-event noise* in Gap 3 below and nothing else.
**Owner hint:** `src/capture/extractors/cursor.ts` — the post-2026-05-01 silence may be (a) Cursor's bubble-row schema changed again (similar to the original 2026-04-30 `{type:1|2, text, bubbleId}` fix), (b) the chokidar lifecycle bug from `_followups.md` regressing the boot-time scan, or (c) a permission/ACL change on `state.vscdb`. Diagnosis-first; this gap is *what to investigate*, not *what to fix*.

---

## Gap 3 — `source_app="cursor"` lane is contaminated with fs-watcher noise

**Severity:** P0 — same fix family as Bug B but in a different code path
**Calls:** 13
**Symptom:** `search_memories(query="", source_app="cursor", since="2026-05-07T00:00:00Z")` returns **3/3 matches that are fs-watcher change events** on `cursor-retrieval/embeddable_files.txt` and `high_level_folder_description.txt`, not Cursor turns. Content shape: `{event_type:"change", path, mtime, size}`, `metadata.surface="fs"`, `metadata.file_kind="cursor-workspace"`.
**Scope label:** **V1.5 ship-blocker.** Same architectural issue Bug B closed for the `claude_code`/`codex` lanes (the fs-watcher exclusion in `search-memories.ts`); evidently the fix didn't extend to the `source_app="cursor"` mapping. The AI-client contract on `source_app` ("Cursor + Claude Code + Codex *conversations*") is broken for cursor.
**Owner hint:** likely a missing prefix exclusion in the `source_app="cursor"` → `source_prefix` resolution. Cursor's correct prefix is `fs:/Users/.../Library/Application Support/Cursor/User/globalStorage/state.vscdb`; the contaminating prefix is `.../Cursor/User/workspaceStorage/...`. Both currently match the cursor lane.

---

## Gap 4 — `get_recent_work_context` skeleton format spills above default-ish `limit` values

**Severity:** P1 (regression of V1.5.6's "skeleton fits in budget" claim)
**Calls:** 15
**Symptom:** `format="skeleton"` at `limit=100` over 48h returned **53,413 chars (>25k consumer budget)** — saved to spill file, AI client cannot consume inline. 100/330 atoms returned in 1/4 clusters. The 028 review notes flagged exactly this risk: *"3% headroom is a future flake risk if atom shape grows."* Live-test confirms it bites at `limit=100` on a real 48h window.
**Scope label:** **V1.5 (post-V1.5.6 patch).** Skeleton's per-cluster byte cost is unbounded in `atom_ids[]` length and `open_loop_hints[]` length (one entry per atom). Schema allows `limit ≤ 500` but skeleton was only sized against a 30-atom fixture. Two options for the strategist (don't design here): (a) cap `atom_ids[]` at e.g. first/last N with a `more_atom_ids_omitted: count` summary, (b) document a hard cap like `limit ≤ 50` for skeleton or auto-clamp inside the tool — both leave the docstring's "low-budget context-pull" promise intact.

---

## Gap 5 — Cross-tool clustering excludes Codex even when Codex is active in the same window

**Severity:** P1 — undermines the rwc tool's headline use case
**Calls:** 2 (corroborated by 4: codex IS in the store and reachable via direct query)
**Symptom:** `get_recent_work_context(window_hours=24)` returned a 144-atom cluster with `source_breakdown={git: 49, claude_code: 84}` — zero codex, zero cursor — even though codex sessions from the same window exist (Call 4: codex `rollout-2026-05-08T13-09-48-...jsonl` at 21:32Z). The strict shared-artifact join (post-019 edge filter) likely requires per-artifact co-occurrence (specific file paths, conversation ids) that codex turns don't share with claude_code turns even when both reference the same `repo_root`.
**Scope label:** **V1.5+ (likely V1.6).** This is the docstring use case: *"answered via `cluster.source_breakdown`, which counts atoms per app inside each cluster"* — but the cluster currently doesn't span apps when both are active on the same repo. Two diagnosis questions for the strategist before any fix: (a) is `repo_root` an indexed artifact-join key today, and (b) should there be a `cross_tool_join_kind: "repo_root"` edge added back without re-introducing the noise that 019 cleaned up.

---

## Gap 6 — Inconsistent timezone-validation between `search_memories` and `get_recent_work_context`

**Severity:** P2 (correctness, not blocker)
**Calls:** 3 vs 8
**Symptom:** Call 3 passed `since="2026-05-06T00:00:00"` (no Z) and got **no warning**. Call 8 passed the same shape and got the warning `input.since or input.until lacks a TZ specifier and was parsed as local time`. Both tools share the same regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}` which doesn't enforce a TZ; the warning text only fires from `get_recent_work_context`.
**Scope label:** **V1.5 (small).** Either lift the warning into a shared validator (cheap), or make the schema regex require `Z` / `±HH:MM` and reject ambiguity at the schema layer (cheaper for the AI client because the error is structured, not advisory). Founder is PDT — the local-time silent-parse is a real correctness foot-gun on this machine.

---

## Gap 7 — No "stage 1 surface-then-deep-dive" affordance for cross-day queries

**Severity:** P2 (UX, surfaces in cross-day workflow)
**Calls:** 8, 15
**Symptom:** A 48h window has 4–5 clusters. Default `limit=20` returns 1 cluster + drops 4. Raising `limit` to retain clusters spills the envelope (Gap 4). There's no opt-in to *just see cluster headers* (label + atom_count + source_breakdown + time_range) before deciding which clusters to hydrate. Founder explicitly raised this in the bcc0a351 conversation today: *"initial retrieval should be surface level high level context… then there should be option to go in depth."*
**Scope label:** **V1.5+ (V1.6 candidate).** Today the three rungs are skeleton/minimal/full but they all return *atoms* per cluster. A fourth "headers-only" rung — return clusters with `cluster_id`, `label`, `atom_count`, `source_breakdown`, `time_range`, and `rank_reasons`, no `atom_ids[]`, no `open_loop_hints[]`, no atoms — would resolve both Gap 4 and the surface-then-deep-dive intent. The AI client iterates: headers first, then re-queries with `cluster_id_hint` to hydrate one cluster's atoms in skeleton/minimal. This is a structural change, not a tune; flag for full strategist conversation.

---

## Gap 8 — No structured "degraded source" signal when an `source_app` lane is silently empty/stale

**Severity:** P2 (related to Gaps 2 + 3)
**Calls:** 5, 6, 13
**Symptom:** When `source_app="cursor"` returns turn data 7 days old (Call 6) or fs-noise instead of turns (Call 13), the response shape is identical to a healthy lane. The AI client cannot tell from the response shape that something is wrong — it has to know *a priori* that recent Cursor turns should exist. The journal's "Sources" discipline exists exactly because of this — but the AI client's hands are empty without a structured signal.
**Scope label:** **V1.5+ (V1.6 candidate).** Add a `lane_health` field per response (or a top-level `warnings`-extension) that flags lanes whose newest atom is older than some threshold (e.g., 24h) when explicitly filtered. Diagnostic, not blocking.

---

## Gap 9 — `echo_ping` returns UTC-only timestamp; founder is PDT

**Severity:** P3 (cosmetic, correct at wire layer)
**Calls:** 1
**Symptom:** `{ts: "2026-05-09T00:01:17.797Z"}`. Correct for the wire; would surprise a human-shown surface. No fix needed for the wire-only contract, but worth noting if any human surface ever displays the ping payload directly.
**Scope label:** **Beyond V1.5 / non-blocker.** Park.

---

## Summary

| Gap | Scope label | V1.5.7 status (2026-05-08 evening, post-restart) |
|---|---|---|
| 1 — ~~`echo-memory` broken~~ | **out of scope** (stale EchoChat connector) | dropped — not an ECHO surface |
| 2 — Cursor turn capture 7 days stale | V1.5 | 🟡 partial — log-noise patch landed (`940448eb`); capture freshness still broken |
| 3 — `source_app="cursor"` returns fs-watcher noise | V1.5 | ✅ closed (V1.5.7 `aaf34243` — `exclude_metadata_surface:['fs']`) |
| 4 — Skeleton format spills at `limit=100` | V1.5 (V1.5.7 patch) | ✅ closed (V1.5.7 `aaf34243` — cluster bounds) |
| 5 — Cross-tool clustering excludes Codex | V1.5+ (likely V1.6) | ⏸ deferred to V1.6 |
| 6 — TZ-validation inconsistency between tools | V1.5 (small) | ✅ closed (V1.5.7 `aaf34243` — TZ-warning parity) |
| 7 — No "headers-only" rung for cross-day surface-then-deep-dive | V1.5+ (V1.6) | 🟡 design-call |
| 8 — No degraded-source signal on stale/empty lanes | V1.5+ (V1.6) | 🟡 design-call |
| 9 — `echo_ping` UTC-only timestamp | Beyond V1.5 | ❌ park |

**V1.5 closure status:** 3/4 in-scope V1.5 gaps closed (3, 4, 6). **Gap 2 is the only V1.5 ship-blocker still partial** — the cursor extractor's capture path is still silent post-orphan-warning patch. Gaps 5/7/8 are V1.6 design conversations; Gap 9 parks; Gap 1 dropped from scope.

**Test data inputs preserved:**
- Skeleton spill at `limit=100/48h`: `/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/9a6f2f41-0be1-4ba9-84e3-01ac1e6d736d/tool-results/mcp-echo-get_recent_work_context-1778284948118.txt` (53,413 chars; 100/330 atoms; 1/4 clusters; cluster source_breakdown `{git:56, claude_code:217}`).
- All 15 call-by-call records: `mcp-interactions-journal.md` entry dated `2026-05-08 17:01–17:03 PDT`.
