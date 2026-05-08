# Dogfooding journal — V1.5 trace layer (`get_recent_work_context`)

**Item shipped:** [`2026-05-06-018-recent-work-context-tool`](../../../backlog/complete/2026-05-06-018-recent-work-context-tool.md)
**Dogfooding window:** 2026-05-07 → ~2026-05-21 (2 weeks; extend if signal is thin)
**Sources active in store:** claude-code, codex, cursor, git
**Goal:** generate enough observations to know what V1.5+ should fix, what V2 should preserve, and whether item 017 (`search_memories` returning normalized atoms) is even needed.

## How to use this journal

Fill an entry **in the moment** when ECHO's `get_recent_work_context` either delights or disappoints. The cost should be ~30 seconds per entry — copy the template, jot a one-liner, move on. Aspirational entries written at end-of-week are useless; lossy in-the-moment entries are gold.

Codex, Claude Code, and any other AI client must log every ECHO MCP interaction here during this dogfooding window, including `get_recent_work_context`, `search_memories`, `echo_ping`, and equivalent local MCP/CLI calls. Multiple calls from one task may be grouped into one detailed entry if the inputs and observed results are all captured.

This journal is the **input**; the V1.5+ backlog items the strategist writes after the window are the **output**. Don't try to design fixes here — just observe.

## Quick-fill observation template

Copy this block when adding an entry. **All times are local (PDT, America/Los_Angeles)** — convert from raw ISO 8601 UTC on write so the journal reads naturally on the founder's machine.

```
### YYYY-MM-DD HH:MM PDT — <one-line context>
- **Trigger:** what I (or Cursor's Claude) just did that called the tool
- **Query inputs:** since=…  until=…  artifact_hint=…
- **Returned:** N clusters, M atoms; top cluster: "<label or none>"; rank_reasons: […]
- **Verdict:** ✅ right / 🟡 partial / ❌ wrong
- **Note:** one-line observation — what felt right or off
- **Conjecture:** (optional) what algorithm/config change might help
```

## What to watch for (from item 018's "what V1.5 will teach us")

Use these as the prompts you scan against during the day:

| Signal category | Sounds like | Implication |
|---|---|---|
| **Artifact-identity policy joins** | "Two atoms reference the same file but ECHO split them into different clusters" | The canonical-id rule needs amendment (most likely a different fallback for some artifact type) |
| **4h window correctness** | "ECHO included Friday morning's work in Monday's cluster" or "ECHO split a coherent 6h thread" | Default window needs tuning; possibly per-source |
| **Label heuristic quality** | "The label said 'discussion about <random file>' which was misleading" | Heuristic needs work, or `label?` should be dropped from V1.5 |
| **Rank ordering vs gut** | "I expected the open-loop cluster first; ECHO ranked it third" | Tune ranking signals or add a new one |
| **Edge-kind sufficiency** | "Two atoms about the same idea but no shared artifact got split" | `temporal_near` / `same_conversation` edges might be needed in V1.5.1 |
| **AI client uptake** | "Claude in Cursor responded better / worse / not differently when the trace was available" | Validates whether the contract is right |
| **Latency** | "I waited" or "felt instant" | 500ms p95 SLO holds or doesn't |
| **Open-loop hint quality** | "ECHO surfaced an 'open question' that was actually closed" | Atom-level hint regex too greedy; or hint-resolution work moved up from V2 |
| **Source-diversity bias** | "All 12 atoms were Cursor; the matching Claude Code session was missing" | Storage query may need ordering; or normalizer dropped events silently |

If something happens that doesn't fit any of these, **make a new category and call it out** — that's the highest-signal observation.

## Daily entries

### 2026-05-07 — dogfooding day 1

> **Timezone convention:** all times in this journal are **founder's local time (PDT, America/Los_Angeles)** unless explicitly noted. Source data (CaptureEvent timestamps, MCP responses) stores ISO 8601 UTC; entries here are converted on write.

#### 2026-05-07 01:08 PDT — first call wedged the consumer's context budget

- **Trigger:** founder asked "check my echo mcp and see if you can know what codex is currently working on." Claude Code session called `get_recent_work_context` with no args.
- **Query inputs:** all defaults (since = now − 4h, until = now, no artifact_hint, limit = 100).
- **Returned:** 3 clusters, 40 atoms, top cluster "discussion about Project_echo" (rank_reasons: `["recent_activity", "dense"]`). Total response: **454,871 chars**.
- **Verdict:** ❌ wrong — response was too big to even read. Tool result handler refused the payload.
- **Note:** trace algorithm was correct (clustering, ranking, rank_reasons all looked right in the saved file). The bug is **payload representation, not clustering**. Forensic analysis: 97% of edges in the dominant 36-atom cluster were redundant (restated cluster anchors); 48% of per-atom bytes were inline `action.input`/`action.output` text.
- **Conjecture:** drop edges whose shared artifacts are all `scope` or `session` role; add opt-in `format: 'minimal'` for atom-content truncation. Specced as item 019. Forensic data preserved at `raw/internal/dogfooding/2026-05-07-trace-response-sample/`.

#### 2026-05-07 15:39 PDT — first end-to-end success; sub-minute capture latency

- **Trigger:** founder asked "can you see me and codex convo in the past 5 mins" — testing whether ECHO actually captures live activity.
- **Query inputs:** `search_memories` (not `get_recent_work_context`) with `source_prefix: 'fs:/Users/zhenye/.codex/'`, `limit: 10`. Used the targeted retrieval to dodge the 019-blocked bloat.
- **Returned:** 10 events; the most recent turn-pair was timestamped 15:39:34 PDT, ~7 minutes before the query at 15:46 PDT. Recovered the full prompt + assistant response.
- **Verdict:** ✅ right — capture pipeline + retrieval are working end-to-end.
- **Note:** sub-minute capture latency from codex's JSONL append → SQLite. The conversation codex was having (about whether V1 schema supports non-git work like Google Docs / Salesforce deals) **independently validated the V1 design** — codex's framing converged with what we locked in items 016/018 (open vocabulary, `state.snapshot`/`state.delta`, work-object inferred at trace layer). Two reasoning processes converging from different starts ≈ structural correctness signal.
- **Conjecture:** none for this observation. Worth tracking longitudinally whether other independent design conversations land on similar primitives — that's repeatable validation.

#### 2026-05-07 15:56 PDT — one-hour cross-platform context retrieval from Codex

- **Trigger:** founder clarified "we are currently on V1.5 use ECHO MCP and read into Claude for better context; limit the time window to the past one hour." Codex called `get_recent_work_context` directly through ECHO MCP to pull the last hour into context.
- **Query inputs:** `since=2026-05-07T21:56:33.000Z` (14:56 PDT), `until=2026-05-07T22:56:33.000Z` (15:56 PDT), `artifact_hint=null`, `limit=100`.
- **Returned:** 2 clusters, 21 atoms; top cluster had no `label`, anchors `Project_echo`, Claude Code conversation `684f37f7...`, and `backlog/ready/2026-05-07-019-trace-edge-filter-and-format.md`; rank_reasons: `["recent_activity", "has_open_loop", "dense"]`.
- **Verdict:** 🟡 partial — the retrieval found the right recent work across surfaces, but the response still carried the pre-019 dense edge payload.
- **Note:** this is the V1.5 loop working in miniature: Codex used ECHO MCP to recover recent Claude Code implementation context for item 019 plus the active Codex design conversation, without the founder manually pasting either thread. The one-hour window felt like the right scope for "what is happening right now" context.
- **Conjecture:** after 019 is merged/restarted, repeat the same one-hour call with default `format: 'full'` and then opt-in `format: 'minimal'` to compare whether Claude/Codex gets the same orientation with less payload.

#### 2026-05-07 16:15 PDT — false-negative: edge filter "didn't work" because daemon was stale

- **Trigger:** post-019-merge dogfooding. Claude Code called `get_recent_work_context` with the same one-hour window (`22:00 → 23:00 UTC`).
- **Query inputs:** `since=2026-05-07T22:00:00.000Z`, `until=2026-05-07T23:00:00.000Z`, defaults otherwise.
- **Returned:** 2 clusters, 24 atoms. Total response 163,060 chars (already 64% smaller than yesterday's 454K, so something improved). BUT cluster 1 had 91 edges = K_14 (100% of pairs), cluster 2 had 45 edges = K_10. Surviving edges all had only `conversation` + `repo` artifacts — exactly the case 019's predicate should drop. `query.format` echoed `null` instead of `'full'`.
- **Verdict:** ❌ wrong — looked like the predicate was broken.
- **Note:** **the daemon was stale.** PID 59875 had been running since 01:04 PDT this morning (14+ hours); 019's code shipped at 15:51 PDT. `vite-node` hot-loads from source files but only at process start. **Same pattern as post-018 yesterday** — the merge commit didn't auto-restart the daemon.
- **Conjecture:** worth documenting daemon restart as a standard step in `merge-and-cleanup`, OR adding a launchd `WatchPaths` entry on `src/` so launchd restarts the process on code changes. Filed as a meta-observation below — not a backlog item yet; want to see if it recurs.

#### 2026-05-07 16:16 PDT — post-restart: edge filter validated

- **Trigger:** restarted daemon via `launchctl kickstart -k gui/$(id -u)/com.echo.daemon`. New PID 41940. Repeated identical query.
- **Query inputs:** identical to 16:15 (`22:00 → 23:00 UTC`, defaults).
- **Returned:** 2 clusters, 24 atoms (same membership). Total response 126,473 chars (**72% smaller than yesterday baseline**). Cluster 1: 91 → **2 edges** (97.8% drop). Cluster 2: 45 → **0 edges** (100% drop). Both surviving edges in cluster 1 carry at least one `file` artifact. `query.format` echoes `'full'`.
- **Verdict:** ✅ right — predicate works exactly as 019 specified.
- **Note:** the byte distribution shifted as predicted: `clusters[]` collapsed from 170KB → 4.5KB (97% drop), making `atoms[]` now 99.3% of payload. The brainstorm prediction (97% redundant edges) matched live data within 1pp. **Edge work was overstated as half the bloat — in reality, edges were the easy half; atom envelope is the dominant half and untouched by 019.**

#### 2026-05-07 16:16 PDT — `format: 'minimal'` validated

- **Trigger:** same query, opt-in `format: 'minimal'`.
- **Query inputs:** identical to 16:16-prior plus `format: 'minimal'`.
- **Returned:** 2 clusters, 24 atoms. Total response **64,006 chars (86% smaller than yesterday baseline)**. `query.format` echoes `'minimal'`. 8 of 24 atoms had `action.input` truncated; all 24 had `action.output` truncated (long assistant turns). Truncation suffix verbatim per spec: `"… [truncated; 1707 chars omitted; fetch full atom via search_memories]"`.
- **Verdict:** ✅ right — minimal mode caps content, leaves all other fields unchanged, suffix carries the fetch hint.
- **Note:** even at 64K, **still over Claude Code's tool-result context budget** (the harness saved to disk again). The reduction is real but the bottleneck has moved: with edges already optimal, the 99.3% of payload that's atom-envelope (artifacts, provenance, conversation refs, source, time, actors) sets the floor. `format: 'minimal'` only attacks the content blob inside atoms; it doesn't shrink the envelope itself.

---

**Round 2 themes (post-019):**

- **Edge filter is fully effective** — predicate matched the brainstorm prediction within 1pp on live data.
- **`format: 'minimal'` is fully effective** at what it targets — long content blobs — but the per-atom envelope (~3-4KB of structural metadata) is now the floor, not the content.
- **Atom envelope is the next bottleneck.** Edge optimization (B) would save maybe 4KB from already-small `clusters[]`. The bigger lever is some form of "atom-id-only" mode where consumer fetches selected atoms via `search_memories(id=…)` only when needed.
- **Daemon-restart-after-merge is a recurring pattern** (yesterday post-018, today post-019). First post-merge call silently runs on stale code → looks like the patch didn't ship. Worth a small follow-up: either `WatchPaths` in `com.echo.daemon.plist` or a step in `merge-and-cleanup` that calls `launchctl kickstart -k`.
- **Smoke script has a SIGPIPE bug** introduced by 019's edge-filter assertion (python `sys.exit(0)` early-exits before consuming all stdin → upstream `printf` fails under `set -o pipefail`). Trivial fix: `sys.stdin.read()` first, then process.
- The brainstorm's framing of A/B/C ordering needs a small adjustment in light of the real bottleneck: B (`shared_artifacts[]`) becomes lower-priority because edges are already small; a hypothetical D (atom-skeleton-only mode) becomes the high-leverage move.

**Decision (founder, 2026-05-07 16:19 PDT):** no changes for now. Keep dogfooding; collect interaction patterns; revisit the prioritization once we have ~1 week of real-use observations.

#### 2026-05-07 16:22 PDT — Codex asks ECHO what Claude just changed

- **Trigger:** founder asked Codex: "use echo to see the recent changes done by claude."
- **Query inputs:** `search_memories(query="claude recent changes Project_echo", source_prefix="claude", limit=10)` returned 0; `search_memories(query="Project_echo", source_prefix="cc", limit=20)` returned 0; `search_memories(source_prefix="cc", limit=20)` returned 0; `search_memories(query="Claude Code", limit=20)` returned 1 Codex memory that revealed the real Claude prefix; `search_memories(source_prefix="fs:/Users/zhenye/.claude/", limit=20)` returned the recent Claude project events.
- **Returned:** final Claude-prefix query returned 20 matches. Top meaningful event was the Claude Code turn at `2026-05-07T23:20:09Z` / 16:20 PDT in session `684f37f7...`, referencing `raw/internal/dogfooding/2026-05-07-trace-layer.md`. It said Claude logged round-2 dogfooding observations, added three entries plus "Round 2 themes", recorded "no changes for now", and left the journal uncommitted.
- **Verdict:** right — ECHO found the recent Claude work, but only after broadening past the guessed `claude` / `cc` prefixes to the captured filesystem source prefix.
- **Note:** prefix discovery is still awkward. The useful answer was there, but the source-prefix taxonomy is not obvious to an AI client without either prior memory or a fallback broad query.

#### 2026-05-07 16:33 PDT — Codex repeats Claude lookup using only trace clustering

- **Trigger:** founder asked Codex to find what Claude had been doing today using ECHO MCP, with the hard constraint: do not use `search_memories`; only use `get_recent_work_context`.
- **Query inputs:** three `get_recent_work_context(format="minimal")` calls: full local day `2026-05-07T07:00:00Z → 2026-05-08T07:00:00Z`, narrowed afternoon `2026-05-07T21:00:00Z → 2026-05-08T07:00:00Z`, and middle-day gap `2026-05-07T08:30:00Z → 2026-05-07T21:00:00Z`.
- **Returned:** full-day query returned 2 clusters / 23 atoms, top cluster all `claude_code` around `Project_echo` from 00:06-01:28 PDT. Afternoon query returned 3 clusters / 42 atoms, top cluster 25 `claude_code` atoms around `Project_echo` from 15:03-16:26 PDT. Middle-day query returned 2 clusters / 7 atoms, top cluster 2 `claude_code` atoms around `Echo_Extension` / `echo_gateway/src/privacy.ts` from 11:10-11:15 PDT.
- **Verdict:** right — trace clustering alone was enough to reconstruct the main Claude work threads, and the narrower windows fixed the full-day ranking blind spot.
- **Note:** this is a better interaction pattern than source-prefix guessing. The tradeoff is that `get_recent_work_context` needs time-window iteration when the day contains multiple unrelated work threads; otherwise top-ranked clusters can hide later activity.

---

**Round 3 themes (cross-AI handoff + tool framing):**

The 16:22 (codex via `search_memories`) and 16:33 (codex via `get_recent_work_context` only) entries together form a controlled experiment with hard signal:

- **Hypothesis A confirmed: the trace tool reaches the answer when constrained to it.** Yesterday's brainstorm flagged that codex chose `search_memories` for "what is X doing" questions and asked whether `get_recent_work_context` was structurally able to answer — the founder ran the test, codex succeeded. The fix is in **tool description framing**, not the tool itself: the description currently frames `get_recent_work_context` as "what was *I* doing" rather than "what was *anyone* doing." A line about `cluster.source_breakdown` answering source-anchored queries would have routed codex correctly on the first attempt.
- **Hypothesis 2 (independent of A): `search_memories` source-prefix taxonomy is opaque.** Codex's first session (15:10 session, see 16:22 entry) needed 5 attempts because it guessed `claude` / `cc` as logical lane names. ECHO's storage uses literal filesystem-prefix-encoded `source` strings (e.g., `fs:/Users/zhenye/.claude/`). The tool description gives no example. Codex recovered only because a *prior captured Codex session* had recorded the right prefix — ECHO self-healed via its own ledger, but a fresh install with no prior captures couldn't.
- **New observation surfaced: long time windows + default `limit=100` truncate to single dense cluster.** Codex's full-day call returned only the early-morning Project_echo cluster; afternoon Claude work was missing. Codex worked around it by splitting the day into morning / midday / afternoon bands. **The truncation strategy (drop lowest-rank atoms first) silently loses entire clusters** when the time window contains multiple disjoint work threads. There's no warning to the consumer; codex had to *notice* the missing afternoon work and iterate. Failure mode candidates: (a) higher default `limit` for wider windows, (b) truncate by clusters rather than atoms, (c) explicit warning in `response.warnings` when clusters were dropped, (d) a hint in the tool description recommending narrower windows for >12h queries.
- **Cross-AI compliance held for 3 rounds.** Codex independently logged 16:22 and 16:33; the journal-discipline line added at 13:xx PDT propagated correctly. First operational evidence that "all AI clients log every ECHO MCP interaction" works in practice.
- **The 3-call workaround pattern is itself a signal.** Splitting a day into ~10-hour bands to fit within `limit=100` is fine once but expensive at scale (3× round-trips, 3× model thinking turns). If this becomes a habitual pattern across queries, the tool should help — either by surfacing the truncation explicitly or by changing the default.

**Cumulative observation count (day 1):** 6 entries spanning 4 distinct AI clients (Claude Code, Codex 15:10 session, Codex 16:21 session, founder via Cursor not yet captured) and 3 tools (`search_memories`, `get_recent_work_context`, `echo_ping` indirectly). Strong signal for ~24 hours of dogfooding; pace suggests the 2-week window will produce 50-100 entries if the pattern holds.

---

**Day 1 themes so far:**
- The trace algorithm is doing its job (clustering, ranking, time-windowing, hint enrichment).
- The wire-format / payload sizing is wrong; 019 fixes it.
- Capture latency feels effectively real-time at the founder's traffic level.
- The V1 atom design is holding up under independent stress-testing.
- A one-hour `get_recent_work_context` window is enough to orient an AI client to the active cross-platform thread without asking the founder for a recap.

The `format: 'minimal'` parallel observation track will start once 019 ships. For now: the workaround is to use `search_memories` with `source_prefix` to bypass the trace tool's bloat, which works fine for "what's codex doing right now" type queries but doesn't exercise the cross-tool-clustering value V1.5 is supposed to deliver.

---

#### 2026-05-07 22:40 PDT — "where did I leave off on the hotkey render" — KNN sensitivity + design-conversation orphaning

- **Trigger:** founder asked Claude Code: "use echo and retrieve claude code context on where i left off on the hot key render." Claude Code attempted multiple ECHO MCP queries to recover the prior design thread.
- **Query inputs (sequence of 8 calls):**
  1. `search_memories(query="hotkey overlay render", source_prefix="claude_code", limit=15)` → 0 matches
  2. `search_memories(query="hotkey render", limit=15)` → 0 matches
  3. `search_memories(query="hotkey overlay", limit=15)` → **1 match** (the substantive 2026-05-08T05:37 UTC design turn from session `684f37f7…`, ~5h earlier)
  4. `get_recent_work_context()` with all defaults (since=now−4h) → 0 clusters, 0 atoms (window cut off the morning's work)
  5. `search_memories(query="overlay UI render summon", limit=10)` → 0 matches
  6. `get_recent_work_context(since=2026-05-07T00:00:00, until=2026-05-08T23:59:59, limit=10, format="minimal")` → 1 cluster / 6 atoms — **all 6 are git commits** anchored on `src/trace/index.ts` and `tests/trace/build.test.ts` from 00:03–01:07 PDT
  7. `search_memories(query="open loops resolution heuristic", limit=10)` → 0 matches
  8. `search_memories(query="overlay loops magic moment", since=2026-05-07T00:00:00, limit=10)` → 0 matches; same query for "⌘⇧E activity card" → 0 matches
- **Returned:** the relevant design conversation was found exactly once (call #3, free-text "hotkey overlay") — never via `get_recent_work_context` clustering, even on a full-day window. The trace cluster found the morning's *implementation* work (commits) but not the evening's *design* work (Claude Code conversation atom).
- **Verdict:** 🟡 partial — the answer was recoverable, but only via brittle keyword search, and neither tool surfaced both threads (design + implementation) as the same work.
- **Note (multiple):**
  1. **`search_memories` KNN is wording-sensitive.** "hotkey render" returned 0; "hotkey overlay" returned the right atom. The founder's phrasing in the request ("hot key render") was off from the assistant's vocabulary in the captured turn ("hotkey overlay UI"). Three of eight queries failed on phrasing alone.
  2. **`source_prefix="claude_code"` returned 0 — same opacity bug Codex hit at 16:22.** The real prefix is `fs:/Users/zhenye/.claude/projects/...`. Two distinct AI clients have now made the same wrong guess on the same day.
  3. **Default 4h window is wrong for "where did I leave off" queries.** The relevant turn was 21h before the query (00:37 vs 22:40 PDT, but actually the timestamp is `2026-05-08T05:37 UTC` ≈ 22:37 PDT yesterday relative to query… wait, let me re-check — actually, the design turn was `2026-05-08T05:37:16Z` which is **22:37 PDT on 2026-05-07**, just 3 minutes before this query). So the 4h default *should* have caught it — except the conversation atom apparently isn't being included in the cluster window or doesn't make it into a cluster at all.
  4. **Design conversations are orphaned from implementation clusters.** A Claude Code conversation atom about "the hotkey overlay V1 scope" and a git commit on `src/trace/index.ts` reference the *same project* but no shared file/conversation artifact, so they cluster separately. The full-day `get_recent_work_context` returned only the commits cluster — the conversation never surfaced even though it's the most relevant atom for the founder's question.
- **Conjecture (multiple, none yet a backlog item):**
  - **(C1)** Tool description for `search_memories` should give an explicit `source_prefix` example like `"fs:/Users/zhenye/.claude/projects/"` plus a fallback recommendation: "if a logical prefix like `claude_code` returns 0, broaden to `fs:` and inspect results." Two failures from two AI clients in one day argues for this.
  - **(C2)** Tool description for `get_recent_work_context` should mention that the default 4h window is for "active right now" queries; for "where did I leave off" queries (overnight, after a break) the consumer should pass an explicit wider `since`. Or change the default itself — 4h covers continuous coding bursts but not the morning-after orientation use case, which is arguably the *primary* hotkey-overlay use case.
  - **(C3)** The bigger structural observation: **the trace layer doesn't yet join design conversations to their implementation work.** A conversation atom with `repo` artifact `Project_echo` and a commit atom on the same repo only share a `repo` (scope) artifact — and 019's edge filter explicitly drops scope-only edges. So the 019 fix that solved the bloat problem may also be **suppressing the cross-thread join** the hotkey overlay's "where did I leave off" use case needs. This is potentially significant — first observation that 019's predicate may be too aggressive for some real queries. Worth a closer look.
  - **(C4)** Re-test: re-run `get_recent_work_context` with a window that *should* include both the design conversation (22:37 PDT) and any later commit, and verify whether they cluster together at all post-019. If not, that's a new backlog item.
- **Cross-reference for resumption:** the design turn the founder was asking about is captured at atom `e876e889-076b-4fa5-b100-767875d0aa88`, session `684f37f7-866d-48b7-9b36-ebbfa0ed6862`, 22:37 PDT. The hotkey overlay V1 scope was reshaped to lead with **open loops as headline** (R1 heuristic resolution in `src/trace/hints.ts`). The unanswered fork: "only loops unresolved as of now" vs "most recent ~5 loops with resolved ones marked." No backlog item exists yet.

---

#### 2026-05-07 22:50 PDT — investigation: C3 conjecture WAS WRONG; two real bugs surfaced underneath

- **Trigger:** founder said "investigate more into c3 issue. it might need a backlog by itself." Goal: empirically test whether 019's edge filter is actually suppressing the design-conversation ↔ implementation-commit join, or whether the symptom has a different root cause.
- **Query inputs (sequence of 6 calls):**
  1. `search_memories(query="hotkey overlay open loops headline", limit=3)` → 0
  2. `get_recent_work_context(since="2026-05-07T07:00:00", until="2026-05-08T08:00:00", limit=200, format="minimal")` → 4 clusters / 31 atoms; **target atom `e876e889` (22:37 PDT) NOT in response despite being in window**
  3. `get_recent_work_context(since="2026-05-08T05:00:00", until="2026-05-08T06:30:00", limit=50, format="minimal")` → 0 clusters / 0 atoms (naive ISO without `Z` parsed as PDT local → wrong window)
  4. `search_memories(query="hotkey overlay reshape open loops", since="2026-05-08T05:00:00", until="2026-05-08T06:00:00", limit=3)` → 0 (same TZ-parse issue)
  5. `search_memories(query="hotkey overlay", limit=3)` × 3 → 0 (KNN result instability — same query that returned 1 match earlier today now returns 0; embedding/KNN appears non-deterministic across calls)
  6. `get_recent_work_context(since="2026-05-08T05:00:00Z", until="2026-05-08T06:00:00Z", limit=50, format="minimal")` → 1 cluster / 8 atoms — **target atom DOES join 7 other Project_echo atoms via shared `repo` artifact, exactly as designed**
- **Returned:** call #6 was decisive — when the target atom is actually fetched into the trace pipeline within a tight 1h window, it clusters correctly with cross-conversation atoms via `repo: Project_echo` (a scope-role artifact). 019's filter drops the scope edge, but `cluster.atom_ids[]` still includes all 8 atoms because `connectedComponents` runs on the unfiltered graph (per 019 spec). **The original C3 conjecture — "019's filter is breaking the join" — is FALSE.**
- **Verdict:** ❌ original C3 was wrong; ✅ but two genuine new bugs surfaced underneath.
- **Note (root-cause analysis):** Read `src/trace/cluster.ts` and `src/storage/sqlite.ts` directly. Two independent bugs are jointly responsible for the symptom the founder noticed:
  - **Bug A — Storage `query()` truncation drops the newest events on high-traffic days.** `src/storage/sqlite.ts:106` runs `SELECT … FROM events … ORDER BY timestamp ASC LIMIT @limit`. With `STORAGE_OVERFETCH=10` and tool default `limit=100`, storage caps at **2000 rows**. SQLite verification: today's window had 3,107 events; row 2000 is at `2026-05-07T22:37:05.661Z`, the row immediately before the design atom at `2026-05-08T05:37:16.114Z`. **The atom is in storage; the storage layer silently drops it because it's the 2001st row and `ORDER BY ASC` keeps the oldest, not the most recent.** This breaks the implicit contract of "give me the last N hours" — for any day with >2K events, the latest atoms vanish.
  - **Bug B — `buildGraph` enforces a hardcoded 4h temporal cap on edges (`src/trace/cluster.ts:75-78`), and the cap isn't exposed via MCP.** Two atoms can be in the same `since/until` window but if their `occurred_at` are >4h apart, **no edge forms even when they share artifacts**, and `connectedComponents` splits them. The MCP tool input schema (`src/mcp/tools/recent-work-context.ts:134-140`) doesn't expose `window_hours` — it's pinned at `DEFAULT_WINDOW_HOURS=4` (line 106). The "where did I leave off" use case is *defined* by gaps >4h (sleep, lunch, after-meeting). With Bug A masked or fixed, Bug B would still split the design conversation from the morning commits because they're 21h apart.
  - **Independent third issue (out of C3 scope):** naive ISO timestamps without `Z` are silently TZ-shifted by `Date.parse` in Node (treated as local time), producing wrong windows when AI clients pass naive strings. The MCP tool's regex accepts both forms but doesn't normalize. Worth a one-line tool-description edit ("always pass ISO strings with explicit Z or offset") plus optional input validation.
  - **Independent fourth issue (out of C3 scope):** `search_memories` KNN is non-deterministic — query "hotkey overlay" returned 1 match earlier today and 0 matches now, with the same store. Either (a) the embedding model is being re-rolled per call, (b) the KNN threshold is borderline, or (c) the index is being rebuilt and shifting cosine-similarity ranks. Worth a separate investigation; not blocking for the overlay use case but undermines journal/founder trust in retrieval.
- **Conjecture (now grounded in code reading, not guesses):**
  - **(C3-fix-A)** Storage `query()` should support either an explicit `order_by: 'asc' | 'desc'` parameter or, for the trace layer's specific need, swap to `ORDER BY timestamp DESC LIMIT N` when the consumer cares about recency. Then re-sort ascending in memory before clustering. Trivial change; protects every `(since, until, limit)` query against silent-truncation bugs.
  - **(C3-fix-B)** Either expose `window_hours` in the MCP tool input schema, or change the default to "infer from `(since, until)` span — if span ≤ 1d, use 4h; otherwise use a fraction of the span." Or just raise the default to 24h, since the temporal cap's only purpose is preventing accidental cross-day collisions, and the `(since, until)` filter already does that more precisely.
- **Backlog implication:** YES — C3 needs its own backlog item, but framed against the actual root causes (Bugs A + B), not the original "019's filter" misdiagnosis. Specced as item 021. The investigation overturns the journal's "C3" working theory, which is itself a high-signal observation: **forensic code reading must precede backlog spec authorship**, especially when symptoms might cross multiple modules. The 18-minute investigation prevented a wrongly-specced backlog item.

---

## Aggregated learnings (filled at end of window)

*To be written by the founder + strategist together at end of window. Sections to cover:*

- **What's the trace layer's actual hit rate** (% of calls that returned the right cluster) on a representative sample
- **Most common failure modes** (ranked by frequency and severity)
- **Surprises** (positive and negative — things we didn't predict in item 018's spec)
- **Whether the founder's daily workflow felt different** (the V1.5 north star)
- **Whether Claude-in-Cursor used the graph** vs ignored it
- **Whether item 017 is needed** based on real use, or if `get_recent_work_context` makes `search_memories` mostly redundant

## Recommendations / candidate V1.5+ backlog items

*Filled at end of window. Each candidate item should name:*

- The observation it's responding to (link to the daily entry/entries)
- The proposed change (algorithm / shape / config)
- Estimated cost
- Whether it's a minor tune (V1.5.1) or a structural change (V1.6 / V2)

## Notes on running this journal

- Entries with **only** a one-line note are fine. Don't gate on having a conjecture.
- Negative observations are more valuable than positive ones for V1.5+ planning. Don't filter.
- Screenshots / paste of MCP responses welcome — drop them inline as code blocks.
- If the founder forgets and skips a day, no problem. Quality of entries beats coverage.
- This file is not a backlog item — `tools/blocked.py` will not pick it up.
