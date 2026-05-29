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
  signals: Signal[];     // alarms-as-attributes (A1 / A2), NOT a feed
};
type Signal = { kind: "runaway_churn" | "non_converging_patch"; detail: string };
```

## Acceptance Criteria

1. **AC1 — daemon `pending_decisions` tool.** New `src/mcp/tools/pending-decisions.ts` exporting `registerPendingDecisions`, registered in `server.ts`, mirroring find-clusters' shape. Param `repo_path` (required v0). Returns `PendingDecisionsResult`. Deterministic; zero LLM; no agent subprocess.
2. **AC2 — v0 playbook source adapter.** `decision-source-playbook.ts` projects `backlog/reviews/**/combined.md` + backlog state → `DecisionCard[]` for decisions awaiting the founder (escalated/at-boundary and not-yet-dispositioned). Pure, unit-tested, tolerant of older rounds missing fields. Filesystem-read logic isolated here (J1).
3. **AC3 — alarms as card attributes.** A1 runaway-churn (≥ threshold consecutive rounds since last founder touch; resets on touch) and A2 non-converging-patch (≥MED finding recurring across ≥2 rounds; escalated when its spec line moved) are computed and attached to each card's `signals[]` — NOT rendered as a standalone feed.
4. **AC4 — Raycast `decisions` board.** `decisions.tsx` renders the cards (current repo), read-only SEE+JUMP (every action opens where to act; zero writes anywhere under `backlog/`), live re-read while open with teardown on dismount. `mcp.ts` gains an additive `pendingDecisions(repoPath)` client method.
5. **AC5 — boundary holds.** `DecisionCard`/`PendingDecisionsResult` types contain NO knowledge of combined.md/backlog/reviewers; the only playbook-aware module is `decision-source-playbook.ts`. Swapping playbooks = new adapter, same type, same board.
6. **AC6 — command discipline.** Add ONLY the `decisions` command; do NOT add `monitor`; `echo` unchanged. README "Decisions" section added. Extension stays ≤3 commands now, targeted to 2 by beta (recap folds — After Completion).
7. **AC7 — tests + checks green.** Daemon unit tests for the tool + adapter (incl. the A1/A2 boundaries reconstructed from the real 072 round sequence, and missing-field tolerance); Raycast tests per the `files_to_modify` notes. `npm run typecheck` + `npm test` green in `tools/raycast-echo`; daemon test + lint + typecheck green.
8. **AC8 — founder dogfooding gate** (merged → validated): ≥3 `decisions` sessions across ≥2 calendar days, ≥1 where an alarm signal fired on a real awaiting-you decision, with a founder note on whether seeing decisions-as-cards kept them in command. (This validates the CARD MODEL — the adapter is acknowledged playbook-specific.)

## Design judgment calls (flagged for r1 reviewer pushback)

- **J1 — daemon reads working-tree files (new pattern).** The v0 source is repo files (combined.md/backlog), not the atom store. Existing tools never read the working tree. Isolated in `decision-source-playbook.ts`. Reviewers: is daemon-side fs-read acceptable, or should the adapter run elsewhere and feed the tool? (Founder chose daemon-owned for durability; this is the cost.)
- **J2 — read-only SEE+JUMP for v0.** SEE+ACT (approve/override from the card, writing into the pipeline) is deferred — zero write-path risk, fastest dogfood. Reviewers may argue act-from-card is the real magic; default stays SEE+JUMP.
- **J3 — alarm thresholds are provisional content.** Starting values (runaway ≥4 rounds; non-converging ≥2 rounds) iterate post-merge. Invariants only: A1 counts consecutive un-escalated rounds since a founder touch and resets on touch; A2 keys on a recurring ≥MED finding and escalates on a moved spec line.
- **J4 — "awaiting the founder" predicate.** v0 = a round at the {proceed*, pushback} boundary / escalated and not-yet-dispositioned. Reviewers refine what counts as a card vs. noise (the "useful feed vs. noise you ignore" line).
- **J5 — wire-shape.** Does `pending_decisions` need the compact/rich projection (064) machinery, or is its payload small enough to skip it? Default: small, skip; reviewers confirm.

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

## After Completion (Strategist Notes — post-shipment, NOT build-time)

When this lands in `complete/`, the strategist (not the builder):
1. **Files the recap-fold follow-up:** remove the `recap` command entry from `package.json` (keep the code; expose "Recap recent work" as an action from the board or `echo` empty-state), gated on 077's dogfooding gate completing — so the extension hits the 2-command beta ceiling (`echo` + `decisions`).
2. **Amends `wiki/principles/felt-not-seen.md`** with the manager-altitude exception ("felt by default, visible on demand at manager altitude") citing this item + the 2026-05-28 founder decision.
3. **Creates `wiki/surfaces/decisions-board.md`** (status: shipped) documenting the DecisionCard primitive, the `pending_decisions` tool, the playbook-adapter boundary, and alarms-as-attributes.
4. **Records the surface + positioning decision** in `raw/internal/decisions/2026-05-28-decision-card-surface-and-sequencing.md`: the DecisionCard primitive, ① now / ② on signal, the overlay as the card's V1.5 channel, recap-fold, and the defined ② flip signal. Updates `.manifest.json` + regenerates `wiki/index.md` for pages actually created.
5. **Does NOT** change the public brand promise — V1.5+ call gated on the beta ② signal.
