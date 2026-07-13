---
id: 2026-05-22-069-raycast-cold-start-continuity-hero
title: "Raycast cold-start continuity hero — confidence-gated 'where you left off' row, replacing the over-approximating Open loops list"
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-22
blocked_by: []
task_state_ref: 2026-05-22-069-raycast-cold-start-continuity-hero
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/trace/rank.ts  # AC1 — replace the over-approximating has_open_loop signal with has_unresolved_open_loop (counts only hints whose `resolved === false`); add code_session_anchor signal; ranking chain unchanged
  - src/trace/types.ts  # AC1 — extend RankSignals to include has_unresolved_open_loop + code_session_anchor; keep has_open_loop for backwards compat (deprecated but not removed in V1)
  - tools/raycast-echo/src/components/EmptyState.tsx  # AC2 — replace `Open loops · Today` section (lines 31-49) with a single conditional `Continue` hero row gated by the V1 confidence contract
  - tools/raycast-echo/src/echo.tsx  # AC2 — surface unresolved-count + selected code anchor to the hero render path
  - tools/raycast-echo/src/lib/format.ts  # AC2 — formatHeroLine(label?, unresolvedCount) helper, kept narrow (no codeAnchor in V1 per r1 codex F3)
  - tools/raycast-echo/src/lib/mcp.ts  # AC2 (r2 codex F1) — Raycast client passes explicit 18h `since` arg to findClusters so the daemon's lookback matches the V1 freshness window (current client at :91-93 sends only {view: "compact"})
  - src/mcp/wire-shape/compact.ts  # AC1b (r1 codex F1 + codex-ops F5) — widen the compact projection's rank_reason allowlist to include the two new reason strings; pure passthrough, no semantic change
  - tests/trace/rank.test.ts  # AC3 — new cases pinning the unresolved-only semantics and the code_session_anchor signal
  - tests/mcp/wire-shape/compact-rank-reason.test.ts  # AC3b (r1 patches) — pin that has_unresolved_open_loop + code_session_anchor survive the compact projection
  - tools/raycast-echo/test/empty-state-hero.test.tsx  # AC3 — new file pinning the four hero-gate decision branches (running session / gate-pass / gate-fail / cold-start)

spec_refs:
  - tools/raycast-echo/src/echo.tsx  # current landing surface; `warmSession` Resume + Open loops · Today + sessions buckets
  - tools/raycast-echo/src/components/EmptyState.tsx  # the over-approximating Open loops · Today section that this spec replaces (lines 31-49); filters by `c.rank_reason?.includes("has_open_loop") === true` and shows up to 3
  - tools/raycast-echo/src/lib/sessions.ts  # `status: "running"` detection (lines 8-24, 85-98) — first gate of the hero contract
  - src/trace/rank.ts  # current `hasOpenLoop = cluster.open_loop_hints.length > 0` at lines 79-87 — counts resolved hints, the over-approximation bug this spec fixes
  - src/trace/hints.ts  # `OpenLoopHintEnriched.resolved` boolean (line 76) — the field the new signal must consult
  - src/trace/types.ts  # `RankSignals` shape (line 104) — extension target
  - src/mcp/internal/cluster-engine.ts  # cluster engine that emits open_loop_hints into clusters (lines 200-280) — read-only reference; not modified
  - src/mcp/wire-shape/compact.ts  # passes through rank_reason in compact projection — read to ensure no wire-shape change is needed for the new signal
  - src/capture/sources.ts  # current capture sources (Cursor + Claude Code + Codex + git only) — boundary for what an open loop can be derived from
  - backlog/complete/2026-05-19-063-raycast-sessions-as-objects.md  # sessions-as-objects model that the hero links to
  - backlog/complete/2026-05-20-065-raycast-cluster-resume.md  # cluster-resume singleflight; hero respects existing session-lookup behavior
  - backlog/_followups.md  # codex strategist consult on confidence contract (2026-05-22 brainstorm); cold-start friction taxonomy

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-22T20:42:15Z"
branch: "agent/raycast-cold-start-continuity-hero"
worktree: "~/Desktop/Project_echo--raycast-cold-start-continuity-hero"
head_sha: "4eea5fd76602181065b1a49373208eecc51638ed"
pr_url: ""
review_notes: |
  Merged on 2026-05-25 via founder reconciliation.

  Conflicts resolved: none — clean merge, sidecar predicted no conflicts and git merge-tree was correct.

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - Founder/manual — opened Raycast at 2026-05-25 ~01:58 PDT pre-merge (showed pre-merge Resume section as expected); real Continue-hero verification deferred to post-Step-D live-checkout bringup.

  Fixups deferred to follow-up items:
  - (none)

  Verify: root 1185/0 tests pass (21 skipped); raycast 106/0; lint clean; typecheck clean (root + raycast); sync-skills --check clean.

  Follow-up items (non-blocking):
  - Update empty view copy at tools/raycast-echo/src/components/EmptyState.tsx:64 (still says "Open loops and sessions appear here" after the visible Open-loops section was removed).
agent_notes: |
  AC1 + AC1b + AC2 + AC3 implemented across rank.ts/types.ts (new
  has_unresolved_open_loop + code_session_anchor signals, has_open_loop
  preserved deprecated), compact wire-shape passthrough (allowlist
  widened to the two new reasons), Raycast EmptyState (single Continue
  hero replacing Open loops · Today, gated by V1 confidence contract),
  Raycast findClusters() (explicit 18h since), plus four new test files
  pinning unresolved-only rank semantics, compact passthrough, Raycast
  since arg, and the six hero decision branches. Codex builder run
  pushed bca36f3 then ended mid-pipeline (orphaned without running
  tests, writing the run log, or transitioning state). Claude Code
  Opus 4.7 adopted the orphan 2026-05-24: AC verification surfaced two
  shipped-broken gaps the builder hadn't caught — stale rank_reason
  singleton in tests/mcp/find-clusters.test.ts and missing nowMs
  forwarding from EmptyState component down to pickHero. Finishing
  patches at 4eea5fd6 (+9/-2). After patches: root npm test 1185/0,
  root tsc clean, Raycast npm test 106/0, Raycast typecheck clean.
  Drift log: orphan-adoption patches stayed surgical — only the two
  failing tests + one source change required to pass them; no
  additional refactoring, fixture sprawl, or contract broadening.
  See run log at raw/internal/agent-runs/2026-05-24-...md for full
  detail of both runs.
---

# Raycast cold-start continuity hero

## Why this spec exists

ECHO Raycast's landing view today (`tools/raycast-echo/src/components/EmptyState.tsx:31-49`) shows up to three clusters filtered by `c.rank_reason?.includes("has_open_loop")`. The signal name implies these are unfinished threads worth resuming, but the underlying definition counts **any** open-loop hint — including hints that the resolver in `src/trace/hints.ts:39-95` already marked `resolved: true`. The over-approximation means the section regularly elevates threads where the user already answered their own question or where a later turn closed the loop.

The product brief from the founder reframes the landing view: *"ECHO is the first thing to open to check where the user left off from last session. Display minimum amount of clean info to assist the user get their train of thought back on one or multiple projects, with the option to dive into details with their own choice of coding agent."* That's a continuity-first surface, not a feed. The current Open-loops section serves the feed reading and burns trust the first time it surfaces a closed loop.

069 closes the gap by (a) tightening the open-loop signal to count only unresolved hints, and (b) replacing the up-to-three Open-loops list with a single confidence-gated **Continue** hero row that fires only when ECHO has strong evidence the user has somewhere specific to resume.

## Cold-start friction this addresses (from the codex consult)

At first open of the day the operator reconstructs five things in priority order:

1. *What was I trying to finish?* — picked up by hero label/title.
2. *What was the unresolved next step?* — picked up by the `<N> open` unresolved-count badge.
3. *What changed in code since I last reasoned?* — V1.5+; out of scope (see Out of Scope §3).
4. *Which agent/tool holds the latest useful reasoning?* — partially served today by `agentKind` on the secondary list rows; not expanded in 069.
5. *Can I resume without duplicating work?* — already shipped by 065 (cluster_id singleflight); 069 preserves the click-through path unchanged.

069 closes items 1 and 2 explicitly. The rest are deferred.

## The minimum-viable fix (80% ROI cut)

**What ships in 069:**

- One new `RankSignals` field: `has_unresolved_open_loop` (counts hints where `resolved === false`).
- One new `RankSignals` field: `code_session_anchor` (cluster has any of: artifact with `type` ∈ `{'repo','file','commit'}` per `src/normalize/artifacts.ts`, an atom with `source.app === 'git'`, OR ≥3 distinct apps in `source_breakdown`). **Linked-session anchoring lives Raycast-side**, NOT in this substrate signal — see AC2's `pickHero` (r1 codex F2 + codex-ops F7).
- The existing `has_open_loop` field is **kept** for backwards compatibility; nothing else in the codebase changes because of it. It is marked deprecated in a header comment and no longer drives Raycast UI.
- Raycast `EmptyState`'s "Open loops · Today" section (`tools/raycast-echo/src/components/EmptyState.tsx:31-49`) is **replaced** with a single conditional `Continue` hero row, gated by the V1 confidence contract below.
- Hero text shape: `Continue: <label or 'Untitled work'> · <N> open` — where `<N>` is the count of unresolved hints in the elevated cluster. **No "dominant file/repo" suffix in V1** (deferred per Out of Scope §1). **No atom-preview fallback in V1** (r1 codex F3: compact clusters carry IDs not bodies; preview fetch path is V1.5+).
- All existing surfaces below the hero (sessions buckets, search bar, EmptyView) are untouched.
- The Raycast client passes an explicit 18h `since` arg to `findClusters` so the daemon's lookback matches the contract's freshness window (r2 codex F1: the current client at `tools/raycast-echo/src/lib/mcp.ts:91-93` sends only `{ view: "compact" }`, and the daemon defaults to 4h with conditional 24h auto-expansion, which can hide a valid 16h continuity cluster or let an auto-expanded older cluster occupy rank 0).

**The V1 confidence contract.** Hero fires iff EITHER:

- A `running` session exists in `useSessions()` — specifically `sessions.find(s => s.status === 'running')`. **NOT** the existing `selectWarmSession()` helper at `tools/raycast-echo/src/lib/sessions.ts:79-80`, which returns the first `done` session. The Continue hero MUST NOT fire on a lone `done` warm session — that would replicate the old Resume behavior of promoting a completed prior answer, which the V1 contract explicitly rejects (r3 codex F1). OR
- The top cluster (rank 0 from `findClusters({since: <18h-ago>, view: "compact"})`) satisfies ALL THREE:
  - `has_unresolved_open_loop === true`
  - `time_range.to` is within the last 18h
  - Either substrate-anchored (`'code_session_anchor'` in `rank_reason`) OR Raycast-side linked-session anchored (`sessions.some(s => s.clusterId === top.cluster_id)`)

Otherwise: no hero row. The user sees only the existing sessions buckets and search bar. No fallback to "best guess" — the V1 contract explicitly prefers an empty hero slot over a low-confidence promotion (codex consult: *"the costly failure is trust erosion: if the first row is often wrong, the user starts scanning past ECHO's opinion"*).

**Why the 18h window.** Operator-cohort heuristic for "last session boundary" — sleep, weekend break, after-lunch context switch. Below 18h, freshness is meaningful; above, the user almost certainly does NOT mean "resume yesterday's work" without explicit query. Tunable in V1.5 from dogfooding evidence.

## Architectural invariant

The Raycast landing view NEVER promotes a cluster to the hero slot when ECHO cannot anchor it to (a) a running session, OR (b) all three of `{unresolved hint, fresh (time_range.to within 18h), anchored}` — where "anchored" is the disjunction of the substrate's `code_session_anchor` reason AND the Raycast-side linked-session check (`sessions.some(s => s.clusterId === top.cluster_id)`). There is no fallback / "best guess" hero. Trust is preserved by making the hero's appearance itself the confidence signal: it appears iff ECHO is confident.

## Acceptance Criteria

### AC1 — `src/trace/rank.ts` gains `has_unresolved_open_loop` + `code_session_anchor` signals; `has_open_loop` preserved but deprecated

- `RankSignals` (`src/trace/types.ts:104`) extends to include `has_unresolved_open_loop: boolean` and `code_session_anchor: boolean`.
- `signalsFor(cluster)` (around `src/trace/rank.ts:79-87`):
  - `has_unresolved_open_loop` = `cluster.open_loop_hints.some(h => h.resolved === false)`.
  - `code_session_anchor` = any of (corrected against current code per r1 codex F2 + codex-ops F7):
    - cluster has any artifact whose `type` is `'repo'`, `'file'`, OR `'commit'` (the actual enum values per `src/normalize/artifacts.ts:33-140`; the field name is `type`, NOT `kind`).
    - cluster's `atom_ids` include at least one atom with `source.app === 'git'` (the actual field is `source.app`, NOT `source_app`).
    - `Object.keys(cluster.source_breakdown).length >= 3`.
  - **The `cluster_id !== undefined` branch is REMOVED** (per r1 codex F2 + codex-ops F7): `Cluster.cluster_id` is a required string per `src/trace/types.ts:65-76`, so the predicate is tautological — it would make every cluster code-anchored and collapse the gate to "unresolved+fresh." The linked-session anchor is preserved but moved to the **Raycast-side** `pickHero` (see AC2) as `sessions.some(s => s.clusterId === top.cluster_id)`, which is a real anchor signal (a linked session exists vs. an unlinked cluster).
- `has_open_loop` is unchanged in semantics for backwards compat; a header comment at `src/trace/rank.ts` documents that it is **deprecated for V1+ UI use** and Raycast must consume `has_unresolved_open_loop`. Existing tests that assert on `has_open_loop` are not modified.
- `rank_reason` strings: when `has_unresolved_open_loop` is true, append `'has_unresolved_open_loop'` to `rank_reason`. The existing `'has_open_loop'` reason continues to be emitted whenever the old condition holds (a cluster can have both reasons in `rank_reason`; that's fine for V1).
- The 5-key ranking chain (`hint > openLoop > recent > size > ...`) is **unchanged**. The new signals are surfaced for downstream consumers; they do not (yet) re-order the chain.

### AC1b — `src/mcp/wire-shape/compact.ts` widens the compact `rank_reason` allowlist (r1 codex F1 + codex-ops F5)

- **Why this AC exists.** Raycast calls `find_clusters` with `view: "compact"` (`tools/raycast-echo/src/lib/mcp.ts:91-93`). The current `compactCluster` projection (`src/mcp/wire-shape/compact.ts:50-68`) narrows `rank_reason` to exactly `['has_open_loop']` and drops every other reason. Without this AC, AC1's new reason strings (`has_unresolved_open_loop`, `code_session_anchor`) would be stripped at the wire boundary and AC2's hero gate would always fail the unresolved+anchored check, making the cluster hero unreachable in production.
- **Modified file:** `src/mcp/wire-shape/compact.ts`.
- **Type widening:** the `CompactCluster.rank_reason` type at `src/mcp/wire-shape/compact.ts:16-27` (currently `['has_open_loop']`) extends to a `readonly string[]` typed as the union of `'has_open_loop' | 'has_unresolved_open_loop' | 'code_session_anchor'`. Allowlist, not free-form — future reason strings must be explicitly added.
- **Projection widening:** the body of `compactCluster` that currently emits `out.rank_reason = ['has_open_loop']` (lines ~50-68) is changed to filter `cluster.rank_reason ?? []` against the allowlist and emit the survivors in their original order. If the cluster has none of the allowed reasons, `out.rank_reason` is omitted (preserving the current "optional field when empty" wire-shape contract).
- **No semantic change** to any other field of the compact projection. The widening is additive and order-preserving.

### AC2 — Raycast `EmptyState` replaces "Open loops · Today" with a single confidence-gated Continue hero row

- **Removed:** the `Open loops · Today` `<List.Section>` (currently at `tools/raycast-echo/src/components/EmptyState.tsx:31-49`).
- **Added:** a `Continue` hero `<List.Section title="Continue">` containing exactly zero or one `<List.Item>`, computed by:

  ```ts
  // r1 corrections folded in:
  //  - time_range.to (NOT .most_recent — the wire shape is {from, to} per FindClustersCluster)
  //  - linked-session anchor is here (Raycast-side), not in the substrate rank signal
  function pickHero(clusters, sessions): HeroPick | null {
    const running = sessions.find((s) => s.status === 'running');
    if (running) return { kind: 'running', session: running };
    const top = clusters[0];
    if (!top || !top.time_range?.to) return null;
    const fresh = (Date.now() - new Date(top.time_range.to).getTime()) < 18 * 60 * 60 * 1000;
    const reasons = top.rank_reason ?? [];
    const unresolved = reasons.includes('has_unresolved_open_loop');
    const substrateAnchored = reasons.includes('code_session_anchor');
    const sessionAnchored = sessions.some((s) => s.clusterId === top.cluster_id);
    const anchored = substrateAnchored || sessionAnchored;
    if (fresh && unresolved && anchored) return { kind: 'cluster', cluster: top };
    return null;
  }
  ```

  - AC1 must additionally include `'code_session_anchor'` in `rank_reason` whenever the signal is true (one line in `rankReasonsFor`).
  - When `pickHero` returns `null`, the `<List.Section title="Continue">` is omitted entirely (no empty section header).

- **Hero row content:**
  - Title: `formatHeroLine(label, unresolvedCount)` returns `Continue: <label-or-fallback> · <N> open` where `<label-or-fallback>` is `cluster.label` if present (truncated to 60 chars), else the literal string `Untitled work` (r1 codex F3: the "newest USER atom preview" fallback is OUT OF SCOPE for V1 — compact clusters only carry atom_ids, not bodies, so resolving previews requires a new fetch path that doesn't exist; V1.5 may add it via a `clusterPreviews` map plumbed through `EmptyState`).
  - Subtitle: `formatRelativeTime(cluster.time_range.to)` (corrected from `.most_recent`).
  - Accessories: agent icon resolved from the linked session if any, else from `source_breakdown` (codex.tsx-equivalent: highest-count source = primary agent). One accessory only.
  - Action panel: identical to the existing cluster-row actions (`renderCluster(cluster)`'s ActionPanel in `echo.tsx`), so cluster-resume (065) and ask-again behaviors are preserved.
  - For the `running` session variant: identical to the existing `SessionRow` content, but rendered inside the `Continue` section instead of `Resume` (the section title becomes the unified label; the old `Resume` section is removed in favor of `Continue`).

- **No new visual styling** beyond Raycast's standard `List.Item` accessories. No iconography changes. No color tinting changes beyond `agentIcon()`.

### AC3 — Tests pin the contract

- `tests/trace/rank.test.ts`: five new cases (r2 codex F2: add the two anchor-branch tests that pin the r1 field-name corrections)
  1. Cluster with two hints, both `resolved: true` → `has_unresolved_open_loop === false`, `has_open_loop === true` (the old signal still fires; the new one doesn't).
  2. Cluster with one hint `resolved: false` and three distinct apps in `source_breakdown` → `has_unresolved_open_loop === true`, `code_session_anchor === true` (source-breakdown branch), both reasons appear in `rank_reason`.
  3. Cluster with one hint `resolved: false`, one source app, no git atom, BUT carrying an artifact with `type: 'file'` (or `'repo'` or `'commit'`) → `code_session_anchor === true` (artifact-anchor branch). Pins r1 codex F2 + codex-ops F7 field-name corrections: the test must FAIL on an implementation that checks `artifact.kind === 'repo_root'` or `'file_ref'`.
  4. Cluster with one hint `resolved: false`, one source app, no artifacts, BUT carrying at least one atom whose `source.app === 'git'` → `code_session_anchor === true` (git-source-atom branch). Pins r1 codex F2 + codex-ops F7: the test must FAIL on an implementation that checks `source_app` instead of `source.app`.
  5. Cluster with a single hint `resolved: false` but only one source app and no repo/file/commit artifacts and no atom with `source.app === 'git'` → `has_unresolved_open_loop === true`, `code_session_anchor === false` (anchor is independent of hint; **and** importantly: the `cluster_id` being present does NOT make the cluster anchored — that branch was removed per r1 codex F2 + codex-ops F7).

- `tools/raycast-echo/test/mcp-find-clusters-since.test.ts` (new file, r2 codex F1): one case pinning the explicit `since` arg
  1. `findClusters()` (no args) issues a POST to `/mcp` whose JSON-RPC `params.arguments` includes `since: <ISO timestamp 18h before now>` and `view: "compact"`. The test must FAIL on an implementation that sends only `{ view: "compact" }`.

- `tests/mcp/wire-shape/compact-rank-reason.test.ts` (new file, r1 codex F1 + codex-ops F5): two cases pinning the compact projection
  1. Cluster has rank_reason `['has_open_loop', 'has_unresolved_open_loop', 'code_session_anchor']` → compact projection preserves all three in the same order.
  2. Cluster has rank_reason `['some_future_reason', 'has_open_loop']` → compact projection emits only `['has_open_loop']` (allowlist filtering; future-reason is dropped until explicitly allowed).

- `tools/raycast-echo/test/empty-state-hero.test.tsx` (new file): six cases pinning the hero-pick decision tree
  1. Running session exists → hero shows the running session row; no cluster-derived hero even if a high-confidence cluster also exists.
  2. No running session; top cluster passes all three gates (unresolved + 18h-fresh via `time_range.to` + `code_session_anchor` reason in `rank_reason`) → hero shows the cluster row with `Continue: <label> · <N> open` title.
  3. No running session; top cluster has unresolved hint and code anchor but `time_range.to` is 20h ago → no hero (18h gate fails).
  4. No running session; top cluster has unresolved hint and is fresh but neither `code_session_anchor` is in `rank_reason` nor any session in `sessions` has matching `clusterId` → no hero.
  5. **(r1 codex F2 + codex-ops F7):** No running session; top cluster has unresolved hint and is fresh but only `code_session_anchor === false`; HOWEVER, `sessions` includes one session whose `clusterId` matches `top.cluster_id` → hero fires via the Raycast-side session-anchor fallback. Pins that the linked-session anchor is preserved despite being removed from the substrate rank signal.
  6. **New (r3 codex F1):** No running session; `sessions` contains exactly one `done` session (the kind `selectWarmSession()` would return as the old "warm" session); top cluster fails the unresolved/fresh/anchored gate → no hero. Pins that the old Resume-warm-session behavior does NOT bleed into the new Continue hero (which V1 explicitly rejects).

- All existing tests in `tools/raycast-echo/test/` (per-package Vitest) and `tests/` (root Vitest) continue to pass without modification.

## Out of Scope (Don't Drift)

1. **"Dominant file/repo" suffix on hero text.** The codex consult proposed `Continue: <label> · <N> open · <dominant file/repo>`. V1 ships only `Continue: <label> · <N> open`. The dominant-anchor selection logic (top file_ref by atom count, fallback to repo_root, fallback to dominant source_app) is V1.5; defer.
2. **Additive ranking boosts** (failed tool, dirty git state, recent commit in cluster) — codex listed these as boosts above the gates. V1 ships gate-only. Boosts are V1.5+; they re-order the rank chain and need their own dogfooding window.
3. **Cold-start friction items 3, 4, 5** (code-change diff visibility, agent-mix in hero, resume-singleflight UI). Items 3 and 4 are V1.5+; item 5 is already shipped via 065.
4. **Adaptive grouping in secondary list** (the F/G/A decision from the brainstorm). V1 keeps the existing time-bucketed sections (Today / Yesterday / This week) unchanged. Adaptive grouping is V1.5+ if dogfooding shows the time buckets are insufficient for multi-project visibility.
5. **Frontmost-app anchored hero.** Codex flagged that `tools/raycast-echo/src/lib/launch.ts:28-40` detects only app *name*, not CWD. Frontmost-CWD-based hero elevation requires a Cursor-side or shell-hook extension to expose working-directory at launch time; deferred until that exists.
6. **Removing the deprecated `has_open_loop` signal.** Kept in place; only the Raycast UI consumer is migrated. Removal across MCP wire-shape, ranking, etc., is a separate cleanup spec — file as 069-follow-up only if a real consumer is found to depend on it post-merge.
7. **Tuning the 18h window from config or env.** Hardcoded constant in V1. Tuning happens via a follow-up spec when dogfooding has 2+ data points of "the hero should/shouldn't have fired for this case."
8. **New MCP tools or wire-shape changes.** No new MCP tool; no new fields in `find_clusters` wire shape beyond what `rank_reason` already conveys (the two new reason strings are additive to the existing `string[]`).
9. **Per-tool / per-AI personalization.** The hero is the same shape regardless of which coding agent the user prefers; the `agentKind` preference already shipped (062/065) governs handoff target, not hero contents.
10. **Visual polish.** No new icon set, no color theme changes, no animations. Standard Raycast `List.Item` patterns only.

## Risks

- **R1 — `has_unresolved_open_loop` is too tight in practice.** If the resolver in `src/trace/hints.ts` is more eager than the user's mental model (marks loops resolved when the user still considers them open), the hero will under-fire. Mitigation: AC3 Test 1 pins the resolved-vs-unresolved distinction; dogfooding within first 2 weeks of merge will surface false-negatives. V1.5 follow-up may tighten the resolver's R1.Q / R1.AQ / R1.TODO rules.

- **R2 — `code_session_anchor` is too permissive.** `≥3 distinct apps in source_breakdown` could elevate a cluster spanning Cursor + Codex + git that's actually just incidental cross-tool noise. Mitigation: the gate is AND-composed with `has_unresolved_open_loop` and the 18h window; pure noise without an unresolved hint cannot promote.

- **R3 — Removing the Open loops · Today list eliminates a section users may have depended on.** Users who currently scan that section will see only sessions buckets if no hero fires. Mitigation: the new contract is strictly higher-precision; what users were scanning was mostly noise. If dogfooding surfaces "I want to see the old list back," that's a follow-up spec for a `View → All open loops` action behind cmd-shift-O or similar — not a 069-scope rollback.

- **R4 — Time-based 18h gate jitters around session boundaries.** Open a thread at 5pm, sleep, open Raycast at 9am next morning = 16h, hero fires. Same thread at 5pm Friday, open Monday morning = 63h, hero does NOT fire even though the user clearly means to resume. V1 accepts this as the V1.5 tuning surface; the cost of false-non-fire is "user types into search bar" — much cheaper than false-fire (trust erosion).

- **R5 — `formatHeroLine` falls back to `Untitled work` when `cluster.label` is missing.** Per r1 codex F3, the original "newest USER atom preview" fallback is OUT of V1 scope (compact clusters carry IDs not bodies; no fetch path exists). The V1 fallback is the literal `Untitled work`. Mitigation: item 064 already emits `label: null` under compact when the daemon would otherwise emit a UUID-fallback label, so the missing-label case is bounded. If dogfooding shows `Untitled work` appears too often, V1.5 plumbs a `clusterPreviews` map through `EmptyState` and resolves the fallback via the existing previews-by-cluster fetch.

## Tests

All test changes are additive — no existing test rewrites.

- `tests/trace/rank.test.ts` — five new cases per AC3.
- `tests/mcp/wire-shape/compact-rank-reason.test.ts` — new file, two cases per AC3 (r1 codex F1 + codex-ops F5).
- `tools/raycast-echo/test/mcp-find-clusters-since.test.ts` — new file, one case per AC3 (r2 codex F1).
- `tools/raycast-echo/test/empty-state-hero.test.tsx` — new file, six cases per AC3 (r1 codex F2 + codex-ops F7 added the linked-session-anchor case; r3 codex F1 added the done-warm-session negative case).

Verify steps (r1 codex F4: root `npm typecheck` excludes `tools/raycast-echo/**`, so root commands alone do NOT cover the edited TSX; per-package commands are required):

- Root (substrate) checks:
  - `npm test -- tests/trace/rank.test.ts tests/mcp/wire-shape/compact-rank-reason.test.ts`
  - `npm test`
  - `npm run lint`
  - `npm run typecheck`
- Raycast package (covers the edited `EmptyState.tsx` + new test):
  - `(cd tools/raycast-echo && npm test)`
  - `(cd tools/raycast-echo && npm run typecheck)`

All seven of the above must pass before the builder moves 069 to `pending_review/`.

## Definition of Done

- AC1: `src/trace/rank.ts` exports `has_unresolved_open_loop` and `code_session_anchor` signals; deprecation comment present on `has_open_loop`; `rank_reason` strings include the two new reasons when their signals are true; the tautological `cluster_id !== undefined` predicate is NOT in the substrate signal.
- AC1b: `src/mcp/wire-shape/compact.ts` widens `rank_reason` to the three-string allowlist; future reason strings remain filtered out until explicitly allowed.
- AC2: `tools/raycast-echo/src/components/EmptyState.tsx` no longer renders "Open loops · Today"; renders a single conditional `Continue` hero row per the `pickHero` decision tree (uses `time_range.to`, the Raycast-side linked-session anchor, and the substrate's `code_session_anchor` reason); existing surfaces below the hero are byte-identical to pre-merge (modulo the unrelated reverts the merge naturally picks up).
- AC3: All fourteen new test cases pass (5 rank + 2 compact wire-shape + 1 raycast mcp-since + 6 hero); all existing tests in `tests/trace/`, `tests/mcp/`, `tools/raycast-echo/test/`, and elsewhere continue to pass.
- All seven verify commands above (root + Raycast package) clean.
- The merged code dogfoods cleanly on a real Raycast open: hero appears when expected, does NOT appear when expected (sanity check before review-pending).

## After Completion (Strategist Notes)

- **Wiki page candidate:** `wiki/surfaces/raycast-extension.md` (does not yet exist). If 069 ships AND a second Raycast-surface spec lands, write the page then. Single-spec basis = not enough; defer.
- **Update `wiki/surfaces/mcp-find-clusters.md`** with one line noting the two new `rank_reason` strings (`has_unresolved_open_loop`, `code_session_anchor`) and what they mean.
- **`backlog/_followups.md` annotations:** when 069 lands in `complete/`, append two entries:
  - "Dominant file/repo suffix on hero text (V1.5)" — Out of Scope §1
  - "Adaptive grouping in secondary list (V1.5+, dogfooding-evidence-gated)" — Out of Scope §4
  - "Tune 18h window from dogfooding evidence (≥2 false-non-fire data points)" — Out of Scope §7
- **Trigger for `has_open_loop` removal spec:** if no consumer outside the legacy ranking path is found to depend on it within 4 weeks of merge, file a one-paragraph cleanup spec to delete the signal and its `rank_reason` string. Until then, deprecated-but-present is fine.
- **No new principle page.** Continuity-first surface design is one occurrence; promote on second occurrence per project rule.
