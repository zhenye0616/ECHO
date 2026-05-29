---
id: 2026-05-28-078-decision-card-board
title: "Decisions — DecisionCard board (daemon pending_decisions tool + Raycast decisions command), read-only SEE+JUMP, alarms-as-card-attributes"
status: ready
priority: HIGH
estimate: 2-3d
created: 2026-05-28
blocked_by: []
task_state_ref: 2026-05-28-078-decision-card-board
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # --- Daemon: the durable primitive (chosen daemon-owned over extension-only so every future channel — in-AI cards, the V1.5 overlay — reads ONE source) ---
  - src/mcp/tools/internal/decision-card-types.ts  # AC5 — the playbook-AGNOSTIC `DecisionCard` type + the `PendingDecisionsResult` wire shape. The type knows NOTHING about combined.md / backlog / reviewers. Fields: { id, title, decision, whyNow, options[], default, deadline?, blocking[]?, agents[], sources[], signals[] }. `signals[]` is where alarms live (see AC3). This file is the boundary — the durable contract every channel and every future source-adapter targets.
  - src/mcp/tools/internal/decision-source-playbook.ts  # AC2 — the v0 SOURCE ADAPTER (the ONLY playbook-aware module). Pure-ish projection: given a repo root, read `backlog/reviews/**/r*/combined.md` + `backlog/{pending_review,claimed,ready}/` state, emit `DecisionCard[]` for decisions AWAITING THE FOUNDER. Reuses the combined.md field contract emitted by `tools/review-queue/combine.py` (combined_verdict, escalated_to_founder, per-reviewer responses, findings[severity/where/disposition], convergence call, spec SHA). Tolerant of older rounds missing newer fields. NOTE (J1): this introduces working-tree filesystem reads into the daemon — existing tools read the ATOM STORE by metadata.repo_root, not repo files. Keep the fs-read logic isolated in THIS module so the tool layer stays storage-shaped; reviewers should weigh whether the daemon should read repo files at all vs. the adapter being invoked another way.
  - src/mcp/tools/pending-decisions.ts  # AC1 — new MCP tool `pending_decisions`, mirroring the find-clusters.ts tool shape (zod params, `registerPendingDecisions(server, deps)` export, wire-shape projection, result_caps/envelope discipline). Params: `repo_path` (absolute repo root — REQUIRED for v0; the decision source is repo-scoped, unlike the machine-scoped atom-store tools). Returns `PendingDecisionsResult { decisions: DecisionCard[], source_breakdown, result_caps }`. Calls the playbook adapter. Deterministic — ZERO LLM, no agent subprocess.
  - src/mcp/server.ts  # AC1 — register the new tool: `import { registerPendingDecisions } from './tools/pending-decisions.js'` + call it alongside the existing `registerFindClusters(...)` etc. Single additive registration; no change to existing tools.
  # (Daemon tests: add alongside the existing MCP-tool test layout — mirror find-clusters' test location/naming. AC7.)
  # --- Raycast: the v0 board (thin consumer of the daemon tool) ---
  - tools/raycast-echo/src/decisions.tsx  # AC4 — new command entry point. Raycast manifest maps command `name: "decisions"` → `src/decisions.tsx` (same mapping as echo→echo.tsx, recap→recap.tsx). A List "board" of pending DecisionCards (the founder's current repo via the configured repoPath). Each card row: title + whyNow + a `signals` accessory (alarm highlight). Card detail shows decision / options / default / deadline / blocking / agents / source links. READ-ONLY SEE+JUMP: every action is "open where I act" (the review round dir / the backlog item / the linked artifact) via the existing `launch.ts` deep-link pattern. WRITES NOTHING. Re-reads on an interval while open so it stays fresh while agents work; AbortController + interval torn down on dismount (mirror echo.tsx/recap.tsx cleanup).
  - tools/raycast-echo/src/lib/mcp.ts  # AC4 — additive: add `pendingDecisions(repoPath: string): Promise<PendingDecisionsResult>` following the existing `callTool` pattern (the same one findClusters/searchMemories use). No change to existing client methods.
  - tools/raycast-echo/package.json  # AC6 — add ONE command entry `decisions` → `src/decisions.tsx`. Do NOT add `monitor`. `echo` + `recap` entries unchanged in THIS item (recap-fold is a separate pre-beta follow-up — see After Completion). Bump extension version. HARD CEILING: the extension must not exceed 3 command entries here and is slated for 2 (echo + decisions) by beta once recap folds.
  - tools/raycast-echo/test/decisions.test.tsx  # AC7 — vitest: board renders one row per card, signals accessory appears on alarm cards, SEE+JUMP actions resolve to the right deep-link target and the board issues NO writes, interval re-read + unmount teardown. Extend test/raycast-api-mock.ts additively if it lacks the List surface (test-support only, mirrors 077 r2 F2 precedent).
  - tools/raycast-echo/test/mcp-pending-decisions.test.ts  # AC7 — vitest on the new `pendingDecisions` client method (arg shape, result typing, daemon-unreachable toast path mirrors the existing mcp.ts error handling).
  - tools/raycast-echo/test/raycast-api-mock.ts  # AC7 — additive-only: extend the mock with whatever List surface decisions.tsx consumes. Faithful shadow of the installed @raycast/api. No production-API change.
  - tools/raycast-echo/README.md  # AC6 — new "Decisions" section: what a DecisionCard is, the read-only SEE+JUMP model, the repoPath preference, and the dogfooding template with a `**Surface:** Decisions` marker.

spec_refs:
  - tools/review-queue/combine.py  # AUTHORITATIVE emitter of combined.md — the v0 adapter's data contract. The adapter pins to THIS output. READ-ONLY: 078 consumes what combine.py writes; it does not modify the emitter (compose-not-capture / projection, not new capture).
  - src/mcp/tools/find-clusters.ts  # the tool-shape precedent the new pending_decisions tool mirrors (zod params, register* export, repo_path handling, wire-shape/result_caps discipline). NOTE the divergence: find_clusters' repo_path filters the ATOM STORE by metadata.repo_root; pending_decisions' repo_path scopes a WORKING-TREE file read (J1) — a deliberate new pattern, isolated in decision-source-playbook.ts.
  - src/mcp/server.ts  # tool registration pattern (import + call). READ to copy the registration idiom exactly.
  - tools/raycast-echo/src/lib/mcp.ts  # the Raycast MCP client + `callTool` pattern the new `pendingDecisions` method follows. Inherited infra is GREEN (140/140 tests, typecheck clean, verified 2026-05-28) — build on it, do not rewrite it.
  - tools/raycast-echo/src/echo.tsx  # READ-ONLY reference for List rendering, preferences, deep-link/launch, and cleanup-on-dismount. `echo` is KEPT unchanged (different altitude: retrieval/ask, not decisions).
  - tools/raycast-echo/src/lib/launch.ts  # the deep-link/open pattern SEE+JUMP uses to send the founder to where they act.
  - skills/review-queue-watch.md  # defines escalated_to_founder semantics + the {proceed*, pushback} boundary + founder-touch moments. The adapter's "awaiting the founder" predicate and the A1 (runaway-churn) reset-on-touch logic derive from here. READ-ONLY.
  - wiki/architecture/coord-substrate-and-observability.md  # 057a: the coord ledger stays health/deadline-only; receipt-shape REJECTED. pending_decisions is a SEPARATE read-projection tool (like find_clusters), NOT the coord ledger and NOT a new coord event. This distinction is load-bearing — do not route decision content through the coord ledger.
  - wiki/principles/compose-not-capture.md  # 064: consumer-side projection of substrate/pipeline data is explicitly allowed. The DecisionCard board is projection, not capture. SEE+JUMP (not act-from-card) keeps it from becoming a capture/collaboration tool ("ECHO doesn't send messages").
  - wiki/principles/felt-not-seen.md  # relies on the AMENDED reading agreed 2026-05-28 ("felt by default, visible on demand at manager altitude" — audit-page doctrine). The board is summoned + read-only; no push, no OS notification. Wiki amendment is post-shipment (see After Completion).
  - wiki/principles/drift-prevention.md  # Pattern 5 (chat-UI trap) + strategist "remove-don't-patch-deeper" discipline. The board is a read-only List of cards — no chat, no follow-up turns, no mutating input.
  - raw/internal/decisions/2026-05-06-v15-trace-layer-design.md  # rejected daemon-side LLM/natural-language rendering on the read path. pending_decisions does ZERO LLM — deterministic projection + threshold arithmetic only.
  - backlog/complete/2026-05-27-077-cognitive-recap-via-raycast.md  # recap precedent (command-add mechanics, single-shot discipline, dogfooding-gate shape). Recap's command entry folds before beta (After Completion); its CODE is kept and reused.
  - docs/AGENT_INSTRUCTIONS.md  # builder contract — update task-state at handoff; do not write strategist-only files (wiki/**, docs/BACKLOG.md).
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # journaling sink. AC8 gate: ≥3 entries with `**Surface:** Decisions` across ≥2 days, ≥1 where an alarm signal fired on a real awaiting-you decision. The `decisions` board itself DOES call an ECHO MCP tool (pending_decisions), so board usage IS journal-worthy (unlike the old file-only monitor design).
---

# 078 — Decisions: the DecisionCard board

## Why (the friction this closes)

Agent throughput went ~10x (commits ramped ~12→348/day; 1011 review-round commits = 44% of the repo) while the operator's ability to watch *what is being decided* did not move. **81% of review rounds (164/202) ran founder-blind**; items run 8–18 rounds in 2–3-hour bursts (072: 18 rounds re-litigating a HIGH TOCTOU lock-race; 077: 11 rounds, cut its fork at r7 and dropped persistence at r8) where the founder appears at only the two protocol checkpoints. The founder pays the lost real-time context back as expensive after-the-fact recaps. Founder's verbatim pain: *"a team of agents will spec-review for 8 rounds / 2 hours and I do not know what is being decided, pushed back, patched, or fixed."*

The need: **stay in the decision/validation loop, out of execution, with a trapdoor down to execution by choice** — the manager rung of the executor→validator→manager ladder.

## What this is (and the journey to it)

The surface PRIMITIVE is a **DecisionCard**: *a decision a human needs to make about delegated agent work.* This item ships the **board** — a summoned Raycast `decisions` command rendering the cards awaiting the founder — backed by a **daemon-owned `pending_decisions` MCP tool** so the primitive is durable and every future channel reads one source. This replaces the earlier "live monitor feed" framing: per Codex's consult, *"monitor" frames a feed; the locked primitive is a card*, and alarms are **attributes of cards**, not the surface's reason to exist.

### Locked decisions (founder, 2026-05-28)
- **Primitive = DecisionCard** (not a raw round-timeline, not an ambient edge). Playbook-agnostic.
- **v0 channel = summoned Raycast `decisions` board.** in-AI cards next; a whole-computer ambient overlay is the **V1.5 channel for the same card** (reads the same `pending_decisions` tool — that's WHY the source is daemon-owned).
- **Source = daemon-owned `pending_decisions` MCP tool** (chosen over extension-only: durable, no rewrite when the overlay arrives).
- **Action model = read-only SEE + JUMP** for v0 (card shows the decision + links you to where you act; writes nothing). SEE + ACT is a deliberate later phase.
- **Boundary = card model agnostic; the ECHO dev playbook (combined.md + backlog state) is the v0 source ADAPTER.** New users with a different playbook → a new adapter feeding the same card model into the same surfaces. This is what keeps it from being "a tool for our own process called a product."
- **Positioning = ① hold the line** (personal context layer; this authority surface ships as dogfooding that graduates later). The "ECHO is the command layer for delegated agency" ② pivot stays deferred to a defined beta signal. Building the board must NOT silently flip ① → ②.

## The DecisionCard model

```ts
type DecisionCard = {
  id: string;            // stable key, e.g. `${itemId}#r${round}`
  title: string;         // "072 · adapter-sync — lock-race re-raised"
  decision: string;      // the call the founder must make
  whyNow: string;        // "r6 · HIGH recurring 3 rounds · spec line moved"
  options: string[];     // ["proceed_after_patches","pushback","more rounds"]
  default: string;       // the combined verdict / watcher-proposed default
  deadline?: string;     // if the pipeline carries one
  blocking?: string[];   // what's stalled waiting on this
  agents: string[];      // which agents are involved/waiting
  sources: { label: string; href: string }[];  // SEE+JUMP targets
  signals: Signal[];     // alarms-as-attributes, NOT a feed. v0 populates A1 only (A2 deferred — see AC3 / r1 codex F2)
};
type Signal = { kind: "runaway_churn"; detail: string };  // v0: A1 only. "non_converging_patch" (A2) is reserved but NOT emitted in v0 (V1.5 — needs a cross-round finding-fingerprint algorithm the queue doesn't yet encode)

// The tool result carries freshness so the board can never silently show a stale "no decisions" (r1 codex-ops F4):
type PendingDecisionsResult = {
  decisions: DecisionCard[];
  source_state: {           // freshness contract — the board renders a warning, never lies by omission (r2 codex-ops F1 HIGH)
    local_head: string;     // HEAD sha of the read repo_path
    upstream_head: string | null;  // origin/main sha known to the daemon (null if never observed)
    behind: number;         // commits local_head is behind the OBSERVED upstream_head (0 ≠ "fresh" on its own — qualify with upstream_checked_at)
    upstream_checked_at: string | null;  // ISO ts the cached origin/main ref was last *successfully* refreshed (from ref mtime/reflog). null = never. THIS is the real freshness proof: behind=0 only means "fresh AS OF upstream_checked_at".
    upstream_stale: boolean; // true if upstream_checked_at is older than the refresh window (or null) — board MUST warn ("remote last seen Xm ago — may be stale"), so behind=0 can never silently imply current
    dirty: boolean;         // working tree has uncommitted changes under backlog/ (review state may be mid-write)
    scanned_items: number;  // in-flight items scanned (bounds the scan — see AC2)
    partial: boolean;       // true if the scan hit its budget and results may be incomplete (board shows a partial warning)
  };
  result_caps?: unknown;    // J5: only if the payload needs the 064 compact/rich machinery; default omitted
};
```

## Acceptance Criteria

1. **AC1 — daemon `pending_decisions` tool.** New `src/mcp/tools/pending-decisions.ts` exporting `registerPendingDecisions`, registered in `server.ts`, mirroring find-clusters' shape. Param `repo_path` (required v0). Returns `PendingDecisionsResult` **including the `source_state` freshness block** (local_head, upstream_head, behind, **upstream_checked_at, upstream_stale**, dirty, scanned_items, partial — r1 codex-ops F4 + r2 codex-ops F1). `behind`/`upstream_head` come from `git rev-list --count`/`rev-parse` against the cached `origin/main` ref. **Bounded refresh (r2 codex-ops F1 HIGH):** to stop `behind=0` lying when the cached ref is itself stale, the tool runs a best-effort `git fetch origin main` **rate-limited to ≤1/refresh-window (default 60s) and OFF the hot 5s poll path** — most polls use the cached ref; at most once per window the ref is refreshed before computing `behind`, then `upstream_checked_at` is stamped. **The fetch runner is hard-bounded and non-interactive (r3 codex-ops F1 HIGH):** a child-process wall-clock timeout **shorter than the Raycast client's ~2s MCP abort** (default 1.2s) with the child **killed** on timeout (no leaked/stuck `git` children across windows); non-interactive git env — `GIT_TERMINAL_PROMPT=0`, `GIT_SSH_COMMAND='ssh -oBatchMode=yes'`, no credential askpass — so it can never block on a prompt. **Timeout OR prompt-failure OR offline are treated identically:** keep the last successful `upstream_checked_at`, set `upstream_stale=true`, return the warning state — the request never hangs and the board shows "remote last seen Xm ago" instead of timing out as "daemon unreachable." Deterministic projection; zero LLM; no agent subprocess.
2. **AC2 — v0 playbook source adapter + exact predicates (r1 codex F1 / codex-ops F2+F6; r3 codex F1).** `decision-source-playbook.ts` projects → `DecisionCard[]`, using ONLY durable facts: per-round `combined.md` frontmatter (`escalated_to_founder`, `next_round`), the set of round dirs (`r1..rN`), and the item's backlog dir. **NO body-text / convergence-call / table-prose parsing.** **Latest round `rN`** = the highest round with a `combined.md` (no `r(N+1)/request.md` yet). **Card-open predicate:** an item shows a card IFF (c) it is in a review-active backlog dir (`ready/`|`claimed/`|`pending_review/`) AND (its latest round is unresolved) AND **either (i) `rN/combined.md` has `escalated_to_founder: true` (explicit escalation — your call needed now), OR (ii) A1 runaway-churn fires (AC3 — the item churned blind past threshold).** **Card-close:** the item leaves the review-active dirs (claimed → built → merged → `complete/`). **Known v0 limitation (documented, not a bug; r2 F4):** an item that converges `claim-ready` and sits in `ready/` unclaimed keeps its card (genuinely still pending — your call to claim/build); its round count is static so A1 stays frozen. A machine-readable terminal-disposition frontmatter field is deferred (would touch combine.py — OoS #6). **Scan bounded to in-flight items** (`ready/`|`claimed/`|`pending_review/` — NOT the ~1000-commit `backlog/reviews/` history), so cost scales with open work. Pure, unit-tested, tolerant of older rounds missing fields. Filesystem-read logic isolated here (J1).
3. **AC3 — alarms as card attributes (v0 = A1 ONLY; A2 deferred per r1 codex F2; A1 reset fixed per r3 codex F1).** A1 runaway-churn measures **founder-blind churn** — exactly the 072 case (18 rounds, none escalated). `signals[]` gets a `runaway_churn` entry when the count of **consecutive most-recent rounds with `escalated_to_founder: false`** ≥ `staleTouchThreshold` (default 4). **Reset = a round with `escalated_to_founder: true`** (the watcher actually pulled the founder in) — NOT `next_round` (which the queue sets on *every* dispatch, so it can never serve as the reset; r3 codex F1). Detail string carries the count (e.g. "churned 7 rounds without pulling you in"). Computed deterministically from per-round `escalated_to_founder` frontmatter. Satisfiable in AC7/AC8: a 4-non-escalated-round fixture fires A1; an `escalated_to_founder: true` round resets it; the real 072 sequence fires it large. **A2 (non-converging-patch) is NOT implemented in v0** (no cross-round fingerprint/line-move algorithm); reserved in the `Signal` type, deferred to V1.5. Alarms are card attributes, NOT a standalone feed.
4. **AC4 — Raycast `decisions` board.** `decisions.tsx` renders the cards (current repo), read-only SEE+JUMP (every action opens where to act; zero writes anywhere under `backlog/`). **Freshness:** when `source_state.behind > 0` OR `upstream_stale` OR `dirty` OR `partial`, the board shows a visible banner ("source N commits behind origin", "remote last seen Xm ago — may be stale", "scan partial") — it never silently renders "no decisions" over a stale read, including the doubly-stale case where the cached origin ref itself is old (r1 codex-ops F4 + r2 codex-ops F1). **Polling budget (r1 codex-ops F6):** a fixed re-read interval (default 5s) with **single-flight** (no overlapping fetches) + backoff on daemon-unreachable; because AC2 bounds the scan to in-flight items the per-call cost is small. **Cleanup:** on dismount, clear the interval AND suppress late/stale results via a `cancelled` flag (the inherited `mcp.ts` `callTool` owns its own internal `AbortController` and exposes no caller signal — so AC4 requires interval-cleanup + stale-result suppression, NOT a caller-provided abort; r1 codex F3). `mcp.ts` gains an additive `pendingDecisions(repoPath)` client method.
5. **AC5 — boundary holds.** `DecisionCard`/`PendingDecisionsResult` types contain NO knowledge of combined.md/backlog/reviewers; the only playbook-aware module is `decision-source-playbook.ts`. Swapping playbooks = new adapter, same type, same board.
6. **AC6 — command discipline.** Add ONLY the `decisions` command; do NOT add `monitor`; `echo` unchanged. README "Decisions" section added. Extension stays ≤3 commands now, targeted to 2 by beta (recap folds — After Completion).
7. **AC7 — tests + checks green.** Daemon unit tests for the tool + adapter: (a) the **card-open / A1 predicates** via fixtures — an `escalated_to_founder: true` round shows a card; the item moving to `complete/` removes it; a sequence of ≥4 consecutive `escalated_to_founder: false` rounds **fires A1**, and inserting an `escalated_to_founder: true` round **resets** the count (explicitly NOT keyed on `next_round`, which is set every dispatch — r3 codex F1); the real 072 sequence fires A1 large; (b) **freshness** — `source_state.behind`/`dirty` for a behind/dirty fixture, the **stale-after-push** case (origin advanced but cached ref older than the window → `upstream_stale=true`, board warns, no clean "no decisions"; r2 codex-ops F1), an offline-fetch-fails case keeping last `upstream_checked_at`, AND a **hung-fetch** case (fetch exceeds the 1.2s timeout → child killed, treated as offline, `upstream_stale=true`, request still returns — r3 codex-ops F1); (c) **scan-bound** — a fixture with many completed review dirs + few in-flight asserts only in-flight items are scanned (`scanned_items` small); missing-field tolerance for older rounds. (A2 is deferred, so no A2 tests.) Raycast tests per the `files_to_modify` notes incl. the stale/partial banner + single-flight interval + dismount suppression. `npm run typecheck` + `npm test` green in `tools/raycast-echo`; daemon test + lint + typecheck green.
8. **AC8 — founder dogfooding gate** (merged → validated): ≥3 `decisions` sessions across ≥2 calendar days, ≥1 where an alarm signal fired on a real awaiting-you decision, with a founder note on whether seeing decisions-as-cards kept them in command. (This validates the CARD MODEL — the adapter is acknowledged playbook-specific.)

## Design judgment calls (flagged for r1 reviewer pushback)

- **J1 — daemon reads working-tree files (new pattern).** The v0 source is repo files (combined.md/backlog), not the atom store. Existing tools never read the working tree. Isolated in `decision-source-playbook.ts`. Reviewers: is daemon-side fs-read acceptable, or should the adapter run elsewhere and feed the tool? (Founder chose daemon-owned for durability; this is the cost.)
- **J2 — read-only SEE+JUMP for v0.** SEE+ACT (approve/override from the card, writing into the pipeline) is deferred — zero write-path risk, fastest dogfood. Reviewers may argue act-from-card is the real magic; default stays SEE+JUMP.
- **J3 — A1 threshold is provisional content; A2 deferred.** `staleTouchThreshold` default 4 iterates post-merge. Invariant: A1 counts consecutive most-recent rounds with `escalated_to_founder: false` and resets on an `escalated_to_founder: true` round (r3 codex F1 — NOT `next_round`). A2 is OUT of v0 (r1 codex F2 — no cross-round fingerprint algorithm yet); reserved in the type, deferred to V1.5.
- **J4 — RESOLVED at r1 (codex F1 / codex-ops F2):** the card-open / founder-touch / dispositioned predicates are now exact and durable (AC2) — built only from `combined.md` frontmatter (`escalated_to_founder`, convergence call), the presence of `r<N+1>/request.md`, and the backlog dir. No inferred state.
- **J5 — wire-shape.** Does `pending_decisions` need the compact/rich projection (064) machinery, or is its payload small enough to skip it? Default: small, skip (`result_caps` omitted); reviewers confirm. (Card count is bounded by in-flight items — typically single digits — so the payload is small.)

## Out of Scope (Don't Drift)

1. **No SEE+ACT / no writes under `backlog/`.** Read-only board for v0; it observes the pipeline, never acts on it.
2. **No `monitor` command, no 4th command, no separate extension.** Command ceiling: ≤3 now, 2 by beta. Adding surfaces is the pile-up this item exists to reverse.
3. **No public brand/positioning change** (wiki/product brand pages untouched). ① holds; building the board must not flip to ②.
4. **No whole-computer overlay / ambient edge.** That is the V1.5 channel for the same card; this item ships the board only.
5. **No LLM / no agent subprocess in the board or the tool.** Deterministic projection + threshold arithmetic. (Unlike echo/recap.)
6. **No new coord event and no change to the coord ledger / combine.py / the watcher.** `pending_decisions` is a separate read-projection tool that CONSUMES combined.md. (057a: receipt-shape rejected.)
7. **No recap deletion in this item.** Recap's command-entry fold is a separate pre-beta follow-up (After Completion); recap code stays untouched here.
8. **No multi-repo/multi-machine aggregation.** Single configured repo. Cross-machine portfolio = V2+.
9. **Do not rewrite the inherited Raycast infra** (`mcp.ts`, `agent-runner.ts`, etc.) — it's green and tested; build additively.
10. **No A2 (non-converging-patch) alarm in v0** (r1 codex F2). Only A1 (runaway-churn) ships. No caller-provided `AbortSignal` added to `mcp.ts`/`callTool` (r1 codex F3) — cleanup is interval + stale-result suppression. **No `git fetch` on the hot 5s poll path** — the freshness refresh is the bounded ≤1/60s decoupled best-effort fetch in AC1 (r2 codex-ops F1 superseded the r1 "no fetch at all" stance: a no-fetch design cannot honestly prove freshness, so a *rate-limited, off-hot-path* fetch + observable `upstream_checked_at` is the correct minimal contract). No terminal-disposition frontmatter field added to combine.py in this item (the claim-ready-card limitation is documented in AC2 instead).

## After Completion (Strategist Notes — post-shipment, NOT build-time)

When this lands in `complete/`, the strategist (not the builder):
1. **Files the recap-fold follow-up:** remove the `recap` command entry from `package.json` (keep the code; expose "Recap recent work" as an action from the board or `echo` empty-state), gated on 077's dogfooding gate completing — so the extension hits the 2-command beta ceiling (`echo` + `decisions`).
2. **Amends `wiki/principles/felt-not-seen.md`** with the manager-altitude exception ("felt by default, visible on demand at manager altitude") citing this item + the 2026-05-28 founder decision.
3. **Creates `wiki/surfaces/decisions-board.md`** (status: shipped) documenting the DecisionCard primitive, the `pending_decisions` tool, the playbook-adapter boundary, and alarms-as-attributes.
4. **Records the surface + positioning decision** in `raw/internal/decisions/2026-05-28-decision-card-surface-and-sequencing.md`: the DecisionCard primitive, ① now / ② on signal, the overlay as the card's V1.5 channel, recap-fold, and the defined ② flip signal. Updates `.manifest.json` + regenerates `wiki/index.md` for pages actually created.
5. **Does NOT** change the public brand promise — V1.5+ call gated on the beta ② signal.
6. **Files the A2 (non-converging-patch alarm) V1.5 follow-up** (deferred r1): needs a cross-round finding-fingerprint + spec-line-move algorithm over the combined.md findings tables. Sibling V1.5 successors already named: the in-AI card channel and the whole-computer ambient overlay (both read the same `pending_decisions` tool). Optionally, a live `git fetch`-backed freshness mode if the daemon's known-ref staleness proves insufficient in dogfooding.
