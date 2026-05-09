# Run log — 2026-05-09-029-cursor-source-breakdown-falsification

**Builder:** Claude Code (`78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`)
**Branch:** `agent/cursor-source-breakdown-falsification`
**Worktree:** `~/Desktop/Project_echo--cursor-source-breakdown-falsification`
**Claim commit:** `9e65f31`

> Founder note: this item's strategist draft labelled Cursor's Claude (Agent mode) as the recommended claimer for dogfooding-loop reasons. Founder explicitly asked Claude Code to claim instead. Phase 3 ("agent verifies against its own active Cursor session") is therefore reframed: founder runs Cursor in parallel; Claude Code runs the live MCP call from this session.

## Run 1 — Phase 1 diagnostic + Phase 2 implementation

### What I implemented (this attempt)

Phase 2 fix at the surfaced layer (bucket (c) — truncation), implemented as a window-wide `source_breakdown` field on `truncation`, computed pre-truncate in `src/trace/index.ts`. Plus a regression test in `tests/mcp/recent-work-context.test.ts` that fails on a manual revert of the fix.

### Phase 1 — Three-way falsification

Test window W: `2026-05-09T20:30:00Z` → `2026-05-09T21:50:00Z` (≈ 13:30–14:50 PDT, ~80 min).
Test composer: `c15c2eca-914a-4d9f-aceb-5d4c4dfac226` (the founder's then-active composer cited in the spec body and in the diagnosis-correction note).

#### (a) Capture — ✅ HEALTHY

`sqlite3 echo.db` direct probe:

```
=== cursor events for c15c2eca composer in window W ===
n_events=12   first_ts=2026-05-09T20:40:37.239Z   last_ts=2026-05-09T20:40:37.347Z

=== ALL cursor events in window W (any composer) ===
n_events=12   distinct_composers=1   first_ts=…20:40:37.239Z   last_ts=…20:40:37.347Z

=== per-source-app event counts in window W ===
claude_code   336
codex         238
fs-meta        80
cursor         12
git             7
```

Verdict: ≥ 1 cursor atom for the test composer, in the test window. Capture is fine.

Side-observation (not in spec acceptance, not load-bearing for this item): all 12 cursor events landed in the same 110ms burst at 13:40:37 PDT (the moment composer `c15c2eca` was created; ECHO captured the seed bubbles). Subsequent bubbles in that composer (the 78-bubble growth recorded in the diagnosis-correction note Probe 3 between 13:45 and 14:25 PDT) did NOT produce additional events in echo.db over the next ~80 min. That's a downstream capture-cadence question — separate item, not this one.

#### (b) Clustering — ✅ CORRECT (with a narrow-emission observation)

Diagnostic via `getRecentWorkContext(storage, {since, until, limit:500, format:'full'})` — unit-test seam, not MCP wire. Limit=MAX_LIMIT means no truncation, every cluster surfaces.

```
atoms_total_in_window: 43
clusters_total: 3
clusters_returned: 3
truncated: false
cursor atoms in response.atoms: 13

clusters (rank, n_atoms, source_breakdown, label):
  rank=1  n=25  cursor_in_cluster=0   sb={"claude_code":18,"git":7}    "discussion about Project_echo"
  rank=2  n=13  cursor_in_cluster=13  sb={"cursor":13}                  "discussion about c15c2eca…"
  rank=3  n=5   cursor_in_cluster=0   sb={"codex":5}                    "discussion about echo_wiki"
```

Cursor atoms ARE in a sibling cluster (rank-2), not rank-1. The cluster builder placed them correctly given their artifacts. Sample atom:

```
id: 02e7bed8-1286-4318-a27c-efb25f1cc111
artifacts (1):
  cursor:conversation:cursor:c15c2eca-914a-4d9f-aceb-5d4c4dfac226
```

Cursor atoms emit exactly one artifact each — `conversation:cursor:<composer_id>` — by `src/normalize/adapters/cursor.ts:49`. No file artifact, no repo/scope artifact. So:

- They join other cursor atoms in the same composer (✓ — that's why the rank-2 cluster has 13 atoms).
- They have no shared artifact with claude_code/git/codex atoms in the window, so the cluster-builder's connected-components correctly puts them in their own component.

Conclusion: clustering is doing the right thing. The narrow artifact emission is a separate pre-existing observation worth documenting as a follow-up (cursor adapter could emit a `repo` artifact when `workspace_id` resolves to a git remote) — but per the item's "Out of Scope (don't drift)" rule and bucket-pick discipline, that is not in scope here. Logged as future-item candidate, not implemented.

#### (c) Truncation — ❌ DROPS THE CURSOR CLUSTER

Same call, default `limit=20` (the MCP wire default per `DEFAULT_LIMIT = 20` at `src/mcp/tools/recent-work-context.ts:73`):

```
atoms_total_in_window: 43
atoms_returned:        20
clusters_total:        3
clusters_returned:     1
truncated:             true
warnings: ["limit dropped 2 entire cluster(s); raise `limit` or narrow the (since, until) window to retain them"]
cursor atoms in response.atoms: 0

clusters at limit=20:
  rank=1  n=20  cursor_in_cluster=0  sb={"claude_code":18,"git":7}  label="discussion about Project_echo"
```

Truncation arithmetic (per `truncate()` at `src/trace/index.ts:294`): toDrop = 43 − 20 = 23. Lowest-rank-first: rank-3 drops 5 (toDrop→18), rank-2 drops all 13 (toDrop→5), rank-1 drops 5 oldest (atoms_returned=20). Both lower-rank clusters end empty and are dropped from `clusters[]` (line 338). Result: only rank-1's `source_breakdown` reaches the consumer — it lists `{claude_code:18, git:7}` and **omits cursor entirely**, even though cursor was active in the window.

This is the journal-reported bug, reproduced exactly. The existing `warnings[]` entry (`"limit dropped 2 entire cluster(s)…"`) tells the consumer something was dropped but does NOT say *which sources* were active in the dropped clusters. An AI client trying to answer "is cursor active recently?" gets a false negative.

#### Phase 1 verdict

Three answers (per spec acceptance bullet 1's "Three separate yes/no answers, not one verdict"):

- (a) Capture broken? **NO.** 12 cursor atoms exist in echo.db for the test composer; trace pipeline normalizes 13 of them.
- (b) Clustering split puts cursor in a sibling cluster? **YES — but correctly.** Cursor atoms emit only `conversation:cursor:<id>` artifact, so they're structurally isolated from claude_code/git/codex by design. Cluster builder is faithful.
- (c) Truncation drops the cursor cluster at default limit? **YES.** At `limit=20` over a window with 43 atoms across 3 clusters, the cursor and codex clusters are entirely dropped; only rank-1's source_breakdown survives.

**Fix bucket: (c) Truncation.** Implementation venue: where `truncation` is built, i.e. `src/trace/index.ts`. Spec mapping for bucket (c) names `src/mcp/tools/recent-work-context.ts`, but truncation is constructed inside `buildRecentWorkContext`; the wire-layer file has no access to pre-truncate atoms without redoing the storage query and the normalizer pass. Choosing trace/index.ts is the only architecturally clean placement for "raise `source_breakdown` to be computed pre-truncate". Files_to_modify allows trace/index.ts as one of three options — picking it is in-bounds.

### Phase 2 — Targeted fix (bucket (c))

(see commits + diff below.)

### Phase 3 — Live verification

(deferred until founder runs Cursor for ≥30 min; agent_notes flags the handoff.)

### Phase 4 — Regression test

(see test file below.)

### Files modified (this attempt)

| File | Branch | Change |
|---|---|---|
| `src/trace/index.ts` | `agent/cursor-source-breakdown-falsification` | Compute window-wide `source_breakdown` over ALL normalized atoms in window, populate `truncation.source_breakdown`. |
| `src/trace/types.ts` | same | Extend `Truncation` interface with optional `source_breakdown?: Record<string, number>`. Mechanically required by the acceptance ("raise source_breakdown to be computed pre-truncate"); precedent for type-widens outside `files_to_modify` set by item 028 review_notes. |
| `tests/mcp/recent-work-context.test.ts` | same | Add a unit test asserting that when truncation drops a sibling cluster, `truncation.source_breakdown` still reports the dropped cluster's source contributions. Test fails on a manual revert. |

### Decisions made during implementation

1. **Field name `truncation.source_breakdown` (not `window_source_breakdown` or `dropped_clusters[]`).** Spec text said "raise `source_breakdown` to be computed pre-truncate". Same name at a different scope (window-level vs cluster-level) — disambiguated by location in the response (`truncation.source_breakdown` vs `cluster.source_breakdown`). Permissive `outputSchema` at `src/mcp/tools/recent-work-context.ts:506` (`truncation: z.record(z.string(), z.unknown())`) accepts the new field without schema changes.

2. **Optional, not required.** Adding it as `source_breakdown?: Record<string, number>` (optional on the Truncation interface) keeps backward compatibility for any non-MCP caller that constructs a partial Truncation in a test.

3. **Computed from `atoms[]` after normalization but BEFORE the rankClusters/truncate pipeline,** so it reflects every normalized atom in the window — including atoms whose clusters get dropped later. Same `countByApp` helper used for per-cluster source_breakdown; reuse keeps the implementation tiny.

4. **No change to default `limit` or `format`.** Per Out-of-Scope rule: do not silently raise the default. The fix surfaces information; consumer keeps control of pagination.

### Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | Phase 1 — three-way falsification with concrete numbers | ✅ above |
| 2 | Phase 2 — targeted fix at the surfaced layer | ✅ window source_breakdown in truncation |
| 3 | Phase 3 — live verification with founder Cursor session | ⏸ pending founder; agent_notes documents handoff |
| 4 | Phase 4 — regression test that fails on revert | ✅ tests/mcp/recent-work-context.test.ts |
| 5 | Out-of-scope guardrail (no agentKv: drift) | ✅ untouched |
| 6 | Decision-note + journal hygiene (don't modify) | ✅ untouched |
| 7 | npm test / lint / typecheck all green; new test fails on revert | (see verbatim output below) |
| 8 | Run log appended | ✅ (this file) |

### Files modified — final list (with branch + head_sha)

Branch: `agent/cursor-source-breakdown-falsification`
head_sha: `8b36287504405068e4dbf4ec5d6498cd48a52bab`

| File | Lines | Note |
|---|---|---|
| `src/trace/index.ts` | +8 | Compute `windowSourceBreakdown = countByApp(atoms)` pre-truncate; populate `truncation.source_breakdown`. In `files_to_modify`. |
| `src/trace/types.ts` | +5 | Extend `Truncation` with optional `source_breakdown?: Record<string,number>`. **Outside files_to_modify** — mechanically required by acceptance 2(c) (item 028 precedent). |
| `tests/mcp/tools/recent-work-context.test.ts` | +154 | New `describe('truncation.source_breakdown (item 029)')` with 2 tests. In `files_to_modify` (Phase 4 truncation-bucket path; actual file lives at `tests/mcp/tools/...`, not `tests/mcp/...` — taking spec mapping liberally per the existing repo layout). |
| `tests/trace/build.test.ts` | +3 | Strict-equality `toEqual({...truncation...})` updated to include the new optional field. **Outside files_to_modify** — mechanical test fallout from the Truncation type widen. Same pattern as item 028 review_notes. |

### Phase 3 — live verification (post-fix, via unit-test seam against real echo.db)

Same diagnostic script over the same window (`2026-05-09T20:30:00Z` → `2026-05-09T21:50:00Z`), now with the fix applied:

```
== Phase 1c: limit=20 (MCP wire default) ==
atoms_total_in_window: 48
atoms_returned: 20
clusters_total: 3
clusters_returned: 1
truncated: true
truncation.source_breakdown (NEW, item 029): {"cursor":16,"git":7,"claude_code":19,"codex":6}
warnings: ["limit dropped 2 entire cluster(s); raise `limit` or narrow the (since, until) window to retain them"]
```

The new field surfaces all four sources active in the window, even though the surviving rank-1 cluster's `source_breakdown` is `{claude_code:19, git:7}` and `clusters_returned=1` of 3.

**Phase 3 wording caveat to flag for reviewer.** Spec text: *"the most recent activity-dominant cluster's source_breakdown reports cursor: ≥1 when Cursor was active in the window."* That phrasing was bucket-(b)-shaped (cluster.source_breakdown). For the bucket-(c) fix path I took, cursor remains structurally in a sibling cluster (it only emits a `conversation:cursor:<id>` artifact, no shared file/repo with claude_code/git/codex), so `cluster[rank=1].source_breakdown` will still NOT contain cursor — that would require a separate fix bucket (b) (cursor adapter enrichment OR cluster-builder edge enrichment, both expressly out-of-scope for 029).

For the bucket-(c) fix, the Phase 3 acceptance test is: **`response.truncation.source_breakdown.cursor ≥ 1` when Cursor was active in the window.** Reviewer judgment call: does this satisfy the intent? The journal-reported false negative ("ECHO doesn't see Cursor") is closed — the consumer can now read `truncation.source_breakdown` and correctly answer "is cursor active?".

Wire-path verification (running daemon on `main` doesn't yet have this branch): deferred to founder. Procedure post-merge: `launchctl kickstart -k gui/$(id -u)/com.echo.daemon` → call `mcp__echo__get_recent_work_context()` from any client → confirm `truncation.source_breakdown` is present and includes cursor when Cursor was active in the 4h window.

### Test results (verbatim)

```
=== full test suite ===
 Test Files  34 passed | 1 skipped (35)
      Tests  568 passed | 21 skipped (589)
   Start at  14:57:02
   Duration  16.85s

=== lint ===
(no output — clean)

=== typecheck ===
(no output — clean)

=== targeted regression test (item 029) ===
 ✓ tests/mcp/tools/recent-work-context.test.ts > truncation.source_breakdown (item 029) > window-wide source_breakdown includes sources from clusters dropped by limit
 ✓ tests/mcp/tools/recent-work-context.test.ts > truncation.source_breakdown (item 029) > window-wide source_breakdown is populated even when no truncation occurs

=== load-bearing check: revert trace/index.ts populate-line, run tests ===
[REVERTED]
 FAIL  tests/mcp/tools/recent-work-context.test.ts > truncation.source_breakdown (item 029) > window-wide source_breakdown includes sources from clusters dropped by limit
   AssertionError: expected undefined to be defined
 FAIL  tests/mcp/tools/recent-work-context.test.ts > truncation.source_breakdown (item 029) > window-wide source_breakdown is populated even when no truncation occurs
   AssertionError: expected undefined to be defined
 Test Files  1 failed (1)
      Tests  2 failed | 57 skipped (59)
[RESTORED — both tests pass again]
```

### 030-deferral observation (per acceptance bullet 8(e))

Phase 1 measurement of cursor capture coverage by composer type:

- **Test composer `c15c2eca`** (an Agent-mode composer per its `messageRequestContext:` entries — but ALSO has `composerData:` and `bubbleId:` rows): 12 events captured by ECHO from the legacy bubbleId schema, all in a 110ms burst at composer-creation. Subsequent ~52 bubble pairs (per Probe 3 in the diagnosis-correction note) did NOT produce additional ECHO events in the next 80 minutes.
- **Per-composer-type coverage measurement is not exhaustive in this run.** Acceptance bullet 8(e) asks "what agent-mode-only capture would buy beyond legacy bubble capture, if anything." Honest answer: I did not measure all 27 messageRequestContext-bearing composers' capture coverage. The single test composer's pattern (initial-burst captured, ongoing-growth not) suggests **the gap may NOT be agentKv: vs bubbleId** but rather **a capture-cadence / WAL-flush issue on the cursor extractor's debounce or polling cycle**. That's a different item — neither the truncation fix here nor an agentKv: rewrite would close that gap.
- **030 verdict:** keep deferred. Phase 1 found NO evidence that agent-mode capture needs `agentKv:` extraction beyond legacy bubble capture; the cursor-side gap I observed is in capture freshness/cadence, not schema coverage. _followups.md should be updated post-merge per the strategist's "After Completion" notes ("agentKv: extraction not needed — legacy bubble pair capture is sufficient (per item 029 Phase 1 measurement)") with a new item 030 candidate for capture-cadence investigation if dogfooding signal accumulates.

### Open questions for founder

1. **Phase 3 live verification.** Spec demands a real founder Cursor session ≥30 min. I'm Claude Code, not Cursor's Claude — Phase 3 needs the founder to run Cursor in parallel with this session, then I'll run `mcp__echo__get_recent_work_context()` and confirm the rank-1 cluster's `source_breakdown` (or `truncation.source_breakdown` if cursor is in a sibling) reports `cursor: ≥1`. Status: handing off; founder triggers when ready.
2. **Field placement: `truncation.source_breakdown` vs a top-level `window_source_breakdown`.** I picked `truncation.source_breakdown` because (a) the spec literally said "raise `source_breakdown` to be computed pre-truncate" — i.e. lift it out of `cluster` to a higher scope — and (b) the `truncation` envelope is the natural home for "what got truncated, what's still there window-wide." If founder/strategist prefers a top-level field, one-line move.
3. **Cursor adapter narrow-emission observation.** Cursor atoms emit only `conversation:cursor:<composer_id>` — no file/repo artifact. This makes them structurally always-sibling-clustered against claude_code/git/codex even when they share a workspace. Worth a follow-up item to enrich the cursor adapter with `workspace_id`-derived repo artifact (or a workspace.json read per the existing `_followups.md` 2026-05-04 entry). NOT in scope here; logging.

### Drift events caught

None during implementation. The clustering-narrow-emission temptation ("while I'm in here, let me also fix the cursor adapter to emit repo artifacts") was caught and logged as a follow-up observation only, not implemented (per Out-of-Scope rule and bucket-pick discipline).
