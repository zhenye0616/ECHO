---
id: 2026-05-11-037-work-artifact-repo-scoping
title: Work-artifact (repo) scoping end-to-end — make `repo_path` a first-class filter across capture + storage + 4 retrieval tools (RC1)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-11
spec_refs:
  - src/capture/extractors/cursor.ts              # extractCursorTurns ~line 1130-1175 metadata-write block; Cursor today writes composer_id/session_id/workspace_id (conditional) but NOT repo_root — capture-side parity gap
  - src/capture/extractors/claude-code.ts         # line 555 — already writes metadata['repo_root'] = turn.repo_root (reference shape)
  - src/capture/extractors/codex.ts               # line 786 — already writes metadata['repo_root'] = turn.cwd (reference shape)
  - src/mcp/cursor-workspace-resolver.ts          # 035's composer↔workspace registry resolver — reuse to derive repo_root at extraction time
  - src/storage/interface.ts                      # line 56 — METADATA_MATCH_KEY_WHITELIST today = {workspace_id, composer_id, session_id}; add repo_root
  - src/mcp/tools/search-memories.ts              # SearchMemoriesParams line 86 — add repo_path?; today no work-artifact filter exists
  - src/mcp/tools/find-clusters.ts                # delegates to recent-work-context; add repo_path? to both surfaces
  - src/mcp/tools/recent-work-context.ts          # storage.query call site line ~379 — wire metadata_match through
  - src/mcp/tools/wait-for-new-turns.ts           # pollOnce line ~128 filterCommon — add repo_path? on input + thread to filter
  - src/mcp/tools/tail-session.ts                 # line 251 — drop the `repo_path is currently honored only for source_app=cursor` warn-ignore; generalize repo_path across source_apps
  - backlog/complete/2026-05-10-035-tail-session-repo-scoping.md  # Today's Cursor-only repo_path; this item generalizes it to claude_code/codex/git AND moves Cursor onto first-class repo_root filtering (with composer↔workspace registry as fallback for atoms without repo_root)
  - raw/internal/dogfooding/mcp-interactions-journal.md  # 2026-05-11 14:46 PDT + 14:56 PDT — Cursor→Claude repo-gating miss; 15:04 PDT — Codex validation; 15:26 PDT — Cursor validation (3-way concurrence). Full root-cause investigation
blocked_by: []
suggested_builder: any  # Single coherent change across capture + storage + 4 retrieval tools — any builder agent; Cursor extractor work is the most domain-specific piece but the 035 pattern is already proven on the Cursor side

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Context

Today's strategist conversation (2026-05-11, Claude Code session `95d30e5e-7154-476d-9e28-faaecbfce1cd`) ran a 3-way cross-tool root-cause investigation on 7 distinct retrieval-side issues encountered live across CC + Codex + Cursor. The full synthesis collapses 6 of 7 issues to **2 root causes** plus 1 isolated bug. This item closes the dominant root cause:

**RC1 — Work-artifact (repo) scoping is missing from the retrieval substrate, despite capture writing it for 2 of 3 client apps.**

| Layer | Claude Code | Codex | Cursor |
|---|---|---|---|
| Writes `metadata.repo_root` | ✅ `claude-code.ts:555` | ✅ `codex.ts:786` (`= turn.cwd`) | ❌ `cursor.ts:~1136` writes composer/session/bubble + conditional `workspace_id`, NO `repo_root` |
| Atom→repo lookup path | direct via metadata | direct via metadata | only via `workspace_id` → registry → repo (today's 035 path, falls through on fresh composers) |

| Retrieval tool | Has `repo_path` parameter today? |
|---|---|
| `tail_session` | 🟡 cursor-only (`tail-session.ts:251` explicitly warn-ignores for other apps) |
| `search_memories` | ❌ no work-artifact parameter exists (`search-memories.ts:86`) |
| `find_clusters` / `recent_work_context` | ❌ |
| `wait_for_new_turns` | ❌ |

| Storage seam | `METADATA_MATCH_KEY_WHITELIST` today |
|---|---|
| `storage/interface.ts:56` | `{workspace_id, composer_id, session_id}` — `repo_root` is **not** allowed |

**Empirical failure mode bitten this session (multiple times across CC, Codex, Cursor):**

- Cursor in Project_echo: `tail_session(source_app='claude_code', count=10)` → resolved to ISR demo Claude Code session (`bdb0905b-...` in `/Users/zhenye/Desktop/Projects/isr-demo-mohsen`), not Project_echo. Cursor logged this as a "❌ wrong" entry in the dogfooding journal at 14:46 PDT.
- CC in Project_echo: `tail_session(source_app='codex')` (no `repo_path`) → resolved to `019e18f5-...` ISR demo session. Same class.
- All 3 tools (CC, Codex, Cursor) independently re-derived this root cause in different starting points; consensus on the diagnosis is documented at journal entries 14:56 PDT (Codex), 15:04 PDT (CC), 15:26 PDT (Cursor).

**Why this item ships RC1 end-to-end (capture + storage + 4 retrieval tools) as one coherent merge:** the capture-side Cursor gap and the retrieval-side `repo_path` parameter additions are **not independently shippable**.

- Shipping retrieval-side `repo_path` without the Cursor capture-side write means Cursor atoms have no `repo_root` to filter on — repo-scoping still silently misses Cursor traffic, just as it does today.
- Shipping Cursor capture-side `repo_root` without retrieval-side parameter exposure is dead code — no tool reads the new field.

Splitting would create a fake item dependency that the founder + 3-way cross-tool brainstorm explicitly rejected (see journal 15:30 PDT). Both layers ship together.

# Goal

After this item ships, **any retrieval call from a known repo can scope its result set to that repo by passing `repo_path`** across the four retrieval tools, and the resolver / storage paths are uniform across all four source_apps (cursor, claude_code, codex, git). The 035 Cursor freshness gap is closed because the Cursor extractor writes `repo_root` at extraction time, eliminating the workspace_id → registry round-trip at query time.

**Demo bar:** founder opens Cursor in Project_echo, fires `mcp__echo__tail_session(source_app='claude_code', repo_path='/Users/zhenye/Desktop/Project_echo')` from a fresh Cursor agent-mode turn; result is a Claude Code session for **Project_echo** (not ISR), without depending on which project's Claude session is the global MRU. Repeat with `source_app='codex'` and `source_app='cursor'` — all three return Project_echo content. Same demo with `repo_path` pointing at `/Users/zhenye/Desktop/Projects/isr-demo-mohsen` returns ISR content. No bleed-through between projects.

# In Scope (Acceptance Criteria)

### AC1 — Cursor extractor writes `metadata.repo_root`

**Surface:** `src/capture/extractors/cursor.ts` `processCandidate` call site (the metadata-build block currently spanning roughly lines 1130-1175; anchor on the comment containing `composer_id: turn.composer_id`).

**Contract:**

1. For every captured Cursor turn, attempt to resolve `repo_root` at extraction time via the same workspace registry the 035 resolver consults (`src/mcp/cursor-workspace-resolver.ts`). The flow is: `composer_id` → `composerToWorkspace.get(composer_id)` (already in `cursor.ts` ~line 1136) → `workspace_id` → workspaceStorage lookup → `folder` URI → `fileURLToPath` → absolute path.
2. When the resolution succeeds, write `metadata['repo_root'] = <resolved absolute path>`. Mirror Claude Code's contract: an absolute filesystem path, no trailing slash, no `file://` prefix.
3. **Fresh composer fallback (closes 035 freshness gap explicitly).** When the workspace-registry resolution fails (fresh composer with no workspace binding yet), attempt a best-effort attribution via attached-file path walking:
   - Read `turn.context.referencedFiles` (or whichever shape `flattenContextFiles` returns) — same source `files_referenced` is derived from at `cursor.ts` ~line 1149.
   - For each absolute path in the set, walk upward looking for a `.git` directory. Collect the nearest-ancestor `.git` parent for each file.
   - If all files share a single common `.git` ancestor → use it as `repo_root`. If multiple distinct candidates → omit (ambiguous, refuse to guess).
   - If no `files_referenced` at all → omit.
   - Cache the per-composer result in a module-level `Map<composer_id, string | null>` so subsequent turns of the same fresh composer don't re-walk. Once the workspace registry binds the composer (typically a few turns later), the registry path takes priority for fresh turns (cache is invalidated when the workspace lookup first returns a non-undefined value for that composer).
4. When BOTH resolution paths (registry + file-walk fallback) fail, `repo_root` is omitted (not written as empty string or `null`). The atom is still captured; only the repo annotation is missing. Downstream filters that pass `repo_path` simply won't match this atom — same semantics as a Claude Code atom that genuinely lacks `repo_root`. The user-visible failure (cross-repo bleed-through) is closed for the common case (file-attached agent-mode turns); truly-zero-file fresh turns degrade gracefully.
5. The `workspace_id` write (today's conditional `if (ws !== undefined) metadata['workspace_id'] = ws`) stays as-is. Both fields can coexist; retrieval prefers `repo_root` (see AC6) and falls back to `workspace_id`/`composer_id` for atoms captured before this item shipped.
6. No new file system permissions beyond what the .git walk requires (read-only `stat` on a small ancestor chain). The workspace registry is already read at extraction time today for `workspace_id`; the new write reuses the same data without a second probe.

**Tests:**

- Fixture: a composer bound to a workspace whose folder URI decodes to `/tmp/echo-test-repo` → emit Cursor turn → assert atom metadata contains `repo_root: '/tmp/echo-test-repo'`.
- Fixture: a **fresh composer with no workspace binding** but with `files_referenced` pointing at `/tmp/echo-test-repo/src/foo.ts` (and a real `.git` dir at `/tmp/echo-test-repo/.git` set up by the test) → assert atom metadata contains `repo_root: '/tmp/echo-test-repo'` via the file-walk fallback. The cache is asserted: a second turn from the same fresh composer does NOT re-walk (mock the resolver count).
- Fixture: a fresh composer with `files_referenced` pointing at **two distinct repos** (`/tmp/repoA/x.ts` + `/tmp/repoB/y.ts`, both with `.git`) → assert atom metadata **omits `repo_root` key** (ambiguous → refuse to guess).
- Fixture: a fresh composer with `files_referenced=[]` → assert atom metadata omits `repo_root`.
- Fixture: a composer where workspace binding lands AFTER initial file-walk attribution → assert the cache is invalidated and the subsequent turn uses the registry path (registry takes priority once it returns non-undefined).
- Fixture: a composer with workspace binding present but `folder` URI absent or malformed AND no `files_referenced` → emit Cursor turn → assert atom metadata omits `repo_root` AND logs `warn('cursor_repo_root_resolution_failed', { composer_id, reason })` at most once per `composer_id` (module-level Set dedup, same shape as `not_in_composer_headers` from `9d00369`).
- Regression: the existing `workspace_id` write contract is unchanged on all six fixtures.

### AC2 — `repo_root` added to `METADATA_MATCH_KEY_WHITELIST`

**Surface:** `src/storage/interface.ts:56`.

**Contract:**

1. Add the literal string `'repo_root'` to `METADATA_MATCH_KEY_WHITELIST`. Final shape: `Set(['workspace_id', 'composer_id', 'session_id', 'repo_root'])`.
2. Both storage adapters (`src/storage/sqlite.ts` + `src/storage/memory.ts`) already honor `metadata_match` for any whitelisted key (per 035's AC3). No adapter code change should be necessary — verify by inspection.
3. Test: `storage.query({metadata_match: {repo_root: '/tmp/x'}})` against a memory storage with one atom whose metadata is `{repo_root: '/tmp/x'}` and another with `{repo_root: '/tmp/y'}` returns only the first. SQLite adapter mirror test must also pass.
4. Test: passing a non-whitelisted key (e.g. `metadata_match: {arbitrary_field: 'X'}`) still throws at the storage seam per 035's defense-in-depth contract.

### AC3 — `search_memories` accepts `repo_path` parameter

**Surface:** `src/mcp/tools/search-memories.ts` — `SearchMemoriesParams` interface + Zod input schema + handler body.

**Contract:**

1. Add `repo_path?: string` to `SearchMemoriesParams`. Zod schema: `z.string().optional()`.
2. Validation: when present, must be an absolute path (`node:path.isAbsolute`). Reject with `tool error` (isError on the MCP envelope) if not. Mirror tail_session's existing pattern at `tail-session.ts:~207`.
3. Forward `repo_path` to `storage.query` as `metadata_match: {repo_root: repo_path}`. When combined with existing filters (source_prefix, since, until), it joins via AND.
4. `query_echo` block surfaces `repo_path` so callers can verify which filter was applied: add `repo_path: string | null` to the echo.
5. Description string: extend `SEARCH_MEMORIES_DESCRIPTION` to mention `repo_path` as a new filter axis. Document that today only Claude Code, Codex, and (post-AC1) Cursor atoms carry `repo_root`; git-source atoms carry `repo_root` via the existing `git:` source-prefix encoding so the path-based filter inherits naturally (see AC6 Note 2 for the git-source path).
6. Test: 5 unit tests (no `repo_path` echoes baseline; with `repo_path` filters correctly; combined with `source_app`; combined with `since/until`; rejects non-absolute path with isError).

### AC4 — `find_clusters` / `recent_work_context` accepts `repo_path` parameter

**Surface:** both `src/mcp/tools/find-clusters.ts` (the V1.6 entry point) and `src/mcp/tools/recent-work-context.ts` (the V1.5 deprecated tool that find_clusters delegates to today, line 379 region).

**Contract:**

1. Add `repo_path?: string` to both tools' params and Zod input schemas.
2. Same validation gate as AC3 (absolute path or isError).
3. Forward to `storage.query({metadata_match: {repo_root: repo_path}, ...})` at the line-379 query site in `recent-work-context.ts`. The `find_clusters.ts` wrapper passes the parameter through unchanged.
4. `query_echo` (already present in `recent-work-context.ts`) surfaces `repo_path`.
5. The no-args auto-expand path (`recent-work-context.ts` 4h→24h fallback) carries `repo_path` through both passes. The single-source-recent demotion logic (item 032) is unaffected — `repo_path` filters the candidate set; the rank order is the same as today within that filtered set.
6. Test: 4 unit tests (find_clusters: passes through; recent_work_context: filters correctly; auto-expand carries through; single-source-recent demotion still fires within repo-filtered set).

### AC5 — `wait_for_new_turns` accepts `repo_path` parameter

**Surface:** `src/mcp/tools/wait-for-new-turns.ts` — `WaitForNewTurnsParams`, Zod input, `pollOnce` function (line ~128 `filterCommon`).

**Contract:**

1. Add `repo_path?: string` to params and input schema.
2. Validation gate same as AC3.
3. Forward to `pollOnce`'s `filterCommon`: `metadata_match: {repo_root: repo_path}` joins the existing `{since, limit, exclude_metadata_surface}` AND chain. Each per-source storage.query inherits the filter.
4. Test: 3 unit tests (no repo_path = today's behavior; with repo_path filters per-source results; rejects non-absolute).

### AC6 — `tail_session` `repo_path` generalized off Cursor-only branch

**Surface:** `src/mcp/tools/tail-session.ts` — the `if (source_app === 'cursor' && repo_path !== undefined)` branch around line 222 + the warn-ignore at line 251.

**Contract:**

1. Drop the warn-ignore at line 251 (`tail_session: repo_path is currently honored only for source_app=cursor; ignored for ${source_app}`).
2. For `source_app === 'claude_code' | 'codex' | 'git'` + `repo_path`: thread `metadata_match: {repo_root: repo_path}` through to the storage.query inside `resolveNewestSourceForApp` AND inside `tailExactSource`. The MRU resolver now picks the newest source for that app **within the specified repo**, not globally.
3. For `source_app === 'cursor'` + `repo_path`: keep the existing composer↔workspace resolver as the primary path (covers the 035 contract + atoms captured before AC1 lands). Additionally, after the composer is resolved, the tail's storage.query inherits `metadata_match: {composer_id: <resolved>}` as today — no change to the Cursor branch's resolver behavior. Once AC1 ships, fresh Cursor atoms carry `repo_root` directly; for those atoms the same query also returns by repo_root match (both predicates AND together with no contradiction).
4. **Note 2 (git source):** Git atoms carry `repo_root` in metadata today (git extractor — verify by inspection) AND encode the repo in their `source` field (`git:/Users/zhenye/Desktop/Project_echo`). For backward compatibility with atoms captured before AC1, when `source_app === 'git'` + `repo_path`, the source-path encoding remains the authoritative filter; `metadata_match: {repo_root: repo_path}` is additive (both must hold). Tests assert this combined-filter shape.
5. Input validation: today's `repo_path requires source_app=cursor` reject at line 205 is loosened to allow any source_app. The `repo_path requires source_app` check (must have ONE of `source_app` or `source` set) stays in place.
6. Test: 6 unit tests (each source_app × {with, without} repo_path on a mixed-repo fixture).

### AC7 — Dogfooding verification

**Procedure** (post-merge, runs once on the founder's daily-workflow stack; per the 036 pattern, two consecutive runs on different days close the verification):

1. Founder opens Cursor in Project_echo. Fresh Cursor agent-mode turn.
2. From the Claude Code session in Project_echo, run all four retrieval tools with `repo_path='/Users/zhenye/Desktop/Project_echo'`:
   - `tail_session(source_app='claude_code', repo_path=...)` → resolves to a Claude Code session in Project_echo (NOT ISR demo)
   - `tail_session(source_app='codex', repo_path=...)` → resolves to a Codex session in Project_echo
   - `tail_session(source_app='cursor', repo_path=...)` → resolves to the active Cursor composer in Project_echo (NOT a fresh-composer fall-through to an older session)
   - `search_memories(query='<distinctive token>', repo_path=...)` → returns only Project_echo atoms
   - `find_clusters(repo_path=...)` → returns clusters whose `source_breakdown` only references atoms with the matching `repo_root`
3. Repeat with `repo_path='/Users/zhenye/Desktop/Projects/isr-demo-mohsen'` from the same Project_echo terminal — every result set returns ISR demo content. Cross-project bleed-through is zero.
4. Negative case: `tail_session(source_app='claude_code', repo_path='/tmp/nonexistent-repo')` returns `turns: []` cleanly with a `warnings: ['no captured sessions found for source_app=claude_code in repo=...']` advisory (NOT a silent empty response — caller should see the empty-set was intentional).
5. Demo bar AC: ≥ 4 of 5 calls in step 2 return correct repo content; the 5th (find_clusters) may legitimately surface clusters with mixed source_breakdown if multiple repos share a git remote — this is acceptable per Out-of-Scope rule 3.
6. Log the dogfooding run as a standard journal entry per CLAUDE.md template; both Markdown + HTML twin updated in the same commit.

# Out of Scope (Don't Drift)

1. **Tool boundary atomicity refactor (RC2) is the next item (038).** Do NOT unbundle bodies from `wait_for_new_turns` here; do NOT rename `get_atom` / `get_atoms`; do NOT DRY the `exclude_metadata_surface: ['fs']` hardcoding across 4 sites. Those are 038's scope. This item adds one parameter to four tools — same atomicity / same body-bundling as today.
2. **TZ-naive rejection (RC3) is a separate follow-up.** Do NOT change `iso8601.ts` here. If a TZ-rejection refinement lands in `isoString` during the same touch surface, that's bleed; revert and queue to `_followups.md`.
3. **Cross-repo cluster handling.** When a project has a git remote that two repos share (e.g., main + worktree), `metadata.repo_root` may differ even though atoms describe the same logical work. Treat this as out-of-scope today — `repo_path` is path-equality, not symlink-resolved or worktree-aware. If this surfaces in dogfooding, file a follow-up.
4. **Cursor extractor — do NOT touch the workspace_id write path.** It's load-bearing for atoms captured before AC1 lands (the back-compat path in tail_session's Cursor branch reaches through it). AC1 adds a sibling write; it does not change the existing one.
5. **Do NOT add `repo_path` to `echo_ping`, `get_atom`, or `get_atoms`.** These are not discovery primitives; the parameter has no meaning on them.
6. **Mid-stream invisibility (Issue #3 in the journal).** Out of scope per 3-way cross-tool consensus 2026-05-11 15:30 PDT (CC, Codex, Cursor all endorsed "currently acceptable: extractors emit on completed turns/ticks, not live token streams"). File a separate item if it changes.
7. **Linux / Windows path-resolver shim.** Inherited from 035 Out-of-Scope rule 6. macOS-only paths until a non-macOS contributor needs it.
8. **Backfilling `repo_root` onto already-captured atoms.** Atoms captured before AC1 lands keep their existing metadata. `tail_session` Cursor-branch's fallback to `composer_id`-resolution handles the back-compat. A retroactive `metadata.repo_root` backfill pass is its own item if it ever ships.

# Implementation Notes

- **Suggested commit shape:** 4 commits — (a) AC1 Cursor extractor + tests; (b) AC2 storage whitelist + tests; (c) AC3-AC6 retrieval tools + tests; (d) AC7 dogfooding journal entry + HTML twin. Each commit independently passes `npm test`, lint, typecheck. The reviewer can stage their read incrementally.
- **The 035 resolver is the right reference.** `src/mcp/cursor-workspace-resolver.ts` already does `composer_id → workspace_id → folder URI → fileURLToPath → absolute path`. AC1 reuses this exact chain at extraction time. Do not reimplement; import.
- **Cursor extractor concurrency:** the metadata-build block runs inside the cadence-tick handler; the workspace registry is read into `composerToWorkspace` once per tick. Resolving `repo_root` inside the same map lookup adds no new I/O.
- **AC3-AC5 share a near-identical 6-line change** per tool (params + Zod + validation + storage.query field). If a builder agent prefers a tiny shared helper (`assertAbsolutePath(value, fieldName)`), one file at `src/mcp/util/repo-path.ts` is OK; otherwise inline is also acceptable. Reviewer's call — no preference.
- **Dogfooding cadence:** AC7 deliberately doesn't gate on the second run; the merge ships after one clean run. The second-run-on-a-different-day closes M1-2-A in the broader plan (see "After Completion" #2).

# After Completion (Strategist Notes)

1. **Wiki promotion (post-merge, after dogfooding lands):**
   - Update `wiki/surfaces/mcp-tail-session.md` — `repo_path` is no longer Cursor-only; document the uniform parameter across all source_apps.
   - Update or create `wiki/surfaces/mcp-search-memories.md` (currently absent — `tools/list` is the only authoritative source for `search_memories`'s shape today). Document `repo_path` from the start.
   - Update `wiki/architecture/storage.md` (or `mcp-server.md`) — `METADATA_MATCH_KEY_WHITELIST` now includes `repo_root`; document the rationale (work-artifact scoping as first-class retrieval predicate).
   - Add a new principle page candidate: `wiki/principles/work-artifact-first-class.md` — the principle that surfaces from this work ("retrieval primitives accept work-artifact filters; the substrate exposes what it captured"). Strategist drafts post-merge.
2. **Second dogfooding run on a different day closes M1-2-A** (the broader "search ranking / verdict-turn finding" plan first surfaced 2026-05-10). After 037 ships + the second run, the remaining M1-2 piece (verdict-turn ranking — semantic-aware retrieval) is genuinely small because repo-scoping eliminates the dominant wrong-cluster failure mode.
3. **Item 038 (RC2: MCP toolkit atomicity refactor) becomes the next strategic conversation.** The 3-way root-cause investigation today proposed a 5-6-primitive reform shape (`echo_cluster + echo_query + echo_wait + echo_fetch_summary + echo_fetch_full + echo_ping`). Strategist drafts 038 after 037 lands.
4. **TZ-naive rejection (RC3)** stays in `backlog/_followups.md` as a 30-LOC follow-up. Rolls into 038 if convenient (same retrieval-tool surface); otherwise standalone.
5. **Capture-side parity audit:** AC1 closes the Cursor-side gap. Periodically (~quarterly) confirm any new client app added to ECHO writes `metadata.repo_root` from day one. Add a single-line check to the extractor test fixtures' shared parity suite.

# Cross-tool review checklist (pre-claim)

- [ ] Has the AC1 Cursor extractor change been tested against a fresh composer (no workspace binding) to confirm `repo_root` is correctly omitted (not written as empty string)?
- [ ] Does AC3-AC6's tool description text mention `repo_path` so `tools/list` callers (Codex, Cursor, other MCP clients) discover it without reading source?
- [ ] Does AC7's dogfooding step #4 confirm the empty-result-set advisory message exists (not silent zero)?
- [ ] Does the diff respect Out-of-Scope rule #1 (no atomicity refactor bleed-through)?

# Review history

(filled at R1 review)
