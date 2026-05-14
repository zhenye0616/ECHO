# Role-typed task-state baseline — empirical reference for measuring 046's effect

**Created:** 2026-05-13 22:45 PDT (immediately post-046 merge at `4968aca`).
**Purpose:** Concrete, falsifiable numbers from the 046 cycle itself — which ran *without* the role-typed task-state primitive available — so the next qualifying spec cycle can prove (or disprove) the primitive's effect on context fatigue.

**Status:** baseline (immutable). Comparison reports live in `raw/internal/dogfooding/role-typed-state-comparison-<spec-id>.md`.

---

## Why a baseline is needed

046 shipped the role-typed task-state primitive (`backlog/task-state/<task-id>/{strategist,builder,round-state}.md` + ECHO MCP `get_role_state` / `list_task_states` + AC3 fresh-eyes lint). AC8 + After-Completion #4 require a post-merge dogfooding measurement, but a 50% / 70% target is meaningless without a measured pre-state. This doc fixes the pre-state.

The 046 cycle is the obvious baseline because the spec was actively about its own friction; the strategist + builder + reviewers all experienced the friction the primitive aims to eliminate, while building it.

---

## 1. Strategist cold-start (session resume after `/clear`)

**Single observed event:** 2026-05-13 ~16:30 PDT, journaled in `raw/internal/dogfooding/mcp-interactions-journal.md` under heading "session resume after /clear (claude strategist)".

| Metric | Baseline value |
|---|---|
| ECHO MCP calls to re-establish state | **3** (`find_clusters` + `get_atoms` × 2) |
| Atoms returned in budget | 7 + 11 = **18 atoms** (rank-1 cluster size: 98 atoms; rank-2 cluster: 13 atoms — 80 prefix-dropped) |
| Broad-corpus file reads before productive work | CLAUDE.md (~340 lines), MEMORY.md (12 entries), `git log` (8 commits), `ls backlog/{ready,claimed,pending_review}` |
| Wall time to first productive output | ~3–4 minutes (3 MCP roundtrips + atom-body synthesis + summary message) |
| Approximate tokens consumed | 50–80k (3 MCP responses + atom bodies + CLAUDE.md + transcript) |

**Target post-046** (After Completion #4): ≥50% reduction in MCP-call count + ≥70% reduction in atom-body bytes consumed. Concretely:
- **≤1 MCP call** (a single `get_role_state(<task-id>, "strategist")` reads the pointer).
- **≤200 lines read total** for state recovery (the pointer body capped at 120 + canonical_anchors as discovery edges).
- **<60s to first productive output.**

---

## 2. Cross-tool consults (claude-strategist → codex-strategist via `codex exec`)

| Metric | Baseline value |
|---|---|
| Informal cross-strategist consults during brainstorm | **4** (root-cause framing, scoping a/b/c, location a/b/c/d, pressure-test) |
| Per-consult prompt size | 1.5–3 KB of *hand-summarized* prior state + question (claude paraphrasing into each prompt) |
| Per-consult wall time | 30–90 s |
| Closed-loop event (codex→codex via ECHO) | **1** (16:45 PDT — codex retrieved prior codex strategist's load-bearing sentence from a different session via `search_memories` + `get_atom` after `find_clusters` returned 0 on tz-mismatched query) |
| Codex MCP calls during closed-loop consult | **3** (1 failed `find_clusters` + 1 `search_memories` + 1 `get_atom`) |

The closed-loop event is the *demonstration* of the primitive; it worked, but cost 3 MCP calls and required 1 retry. The other 3 consults required claude to hand-summarize the state into each prompt (a manual workaround for the missing pointer).

**Target post-046:**
- Consult prompts CITE pointer paths (`backlog/task-state/<id>/strategist.md`) instead of inlining hand-summarized state.
- Consultee makes **1 `get_role_state` call** instead of needing context hand-fed.
- ≥50% reduction in per-consult prompt size (1.5–3 KB → ~750 B – 1.5 KB).
- Tz-mismatch / retry friction surfaced in the closed-loop event should be filed as a separate `find_clusters` ergonomics issue (NOT covered by 046; out of scope).

---

## 3. Strategist between-rounds work (R1→R2 ... R4→R5)

| Metric | Baseline value |
|---|---|
| Round transitions in this cycle | **5** (R1→R2, R2→R3, R3→R4, R4→R5, R5→claim-ready) |
| Per-transition reads | full spec at HEAD (~180–290 lines) + both `<reviewer>.md` (1–4 KB each) + previous `combined.md` (1–2 KB) + working-memory recall of prior rounds |
| Per-transition outputs | disposition table (in current combined.md) + spec patches (Edit calls) + new combined.md + next-round `request.md` |
| Per-transition wall time | 5–10 min |
| Approximate tokens per transition | 5–10 k (strategist disposition + Edit calls + request.py invocation) |
| Total inter-round strategist work | ~30–50 k tokens across 5 transitions |

**Target post-046:**
- `round-state.md` exists from R1 onward; each transition writes the pointer's `current_round / locked_decisions / open_questions / dont_touch` deltas instead of regenerating from scratch.
- Subsequent transitions READ `round-state.md` first (CAS protocol step 1: `git rev-parse HEAD:<path>`).
- ≥50% reduction in tokens-per-transition (5–10 k → 2.5–5 k).

---

## 4. Reviewer-tick cold-start (codex / codex-ops)

| Metric | Baseline value |
|---|---|
| Total reviewer ticks in this cycle | **10** (5 rounds × 2 reviewers) |
| Per-tick reads | full spec at pinned SHA + reviewer prompt (`.claude/commands/review-queue-<reviewer>.md`, ~80–120 lines) + reviewer schema + `reviewers.json` + prior-round `combined.md` (R2+ ticks) |
| Per-tick wall time | 30–90 s (codex CLI exec; logged in `~/Library/Logs/echo-review-queue-<reviewer>.log`) |
| Per-tick token usage (from `tokens used` in codex output) | R1 codex ~9.9 k / codex-ops ~? · R2 ~18 k / 88 k · R3 ~12 k / ? · R4 ~? / ? · R5 ~? / ? — varied widely; ops-side spelunking inflated some ticks past 90 k |
| Findings by round | R1: 9 → R2: 7 → R3: 3 → R4: 2 → R5: 2 (decay 9→5→2→1→2 unique root) |

**INVARIANT post-046, NOT a target:** Reviewer cold-start must NOT change. Fresh-eyes-at-SHA is preserved by AC3 hard-fail lint (≥3-of-6 required-block heading-pattern threshold; `consumed_task_state: true` schema gate). If reviewer-tick tokens DROP post-046, AC3's enforcement is broken — that's a regression, not a win. Lock the baseline numbers here as the floor.

---

## 5. Founder bridging cost

| Metric | Baseline value |
|---|---|
| Manual push authorizations (founder typed approval) | **2** (R1 "permit to push here" + standing auth "full auto mode till the spec converges") |
| Founder decisions on escalation | **1** (R4 divergent verdicts — founder picked option (A) "treat-as-convergent" via implicit "check now" + auto-mode reaffirmation) |
| Direction shifts during cycle | **2** ("full auto till the spec converges" → "auto mode until merge") |
| Founder activations *within* the review queue (042 AC8 metric) | **0** ✓ — the load-bearing metric continues to pass (the queue self-disposed across 5 rounds; founder only weighed in on the R4 escalation, which is the operating-model checkpoint) |

**Target post-046:** Hold all five metrics. Specifically:
- Founder activations within review queue MUST remain 0 (regression test).
- Manual push authorizations may shrink if `task_state_ref` discovery lets cron-driven auto-pushes operate more safely — but only if the irreversible-action invariant is preserved. Not a target; observe.

---

## 6. Wall time + commit count

| Metric | Baseline value |
|---|---|
| Spec commit (`5480034`) → R1 push | ~10 min (request generation + commit + manual push) |
| R1 push → R1 combined.md (both responses + combine.py) | ~13 min |
| R1 disposition → R5 claim-ready (`ba3c2f4`) | 4h 15m wall total across the 5 rounds |
| Claim → builder pushes to pending_review (`c7b68b7`) | 24 min |
| Sidecar (`8e66f5c`) → merge (`b419994`) → followups (`4968aca`) | 16 min |
| **Total spec-to-ship wall time** | **~5 hours** (17:22 PDT → 22:20 PDT, 2026-05-13) |
| Commits on main across cycle (`5480034^..4968aca`) | **42** |
| Findings dispositioned across all rounds | **23** (R1: 9 + R2: 7 + R3: 3 + R4: 2 + R5: 2) |
| Unique root issues | **12** (R1: 9 + R2: 5 unique + R3: 2 + R4: 1 + R5: 2 = 19 surfaced, 12 distinct after cross-reviewer dedup) |
| Final spec body | 292 lines |

**Target post-046:** for a *similar-sized* spec (~200 lines, 1.5–2d estimate, 4–5 rounds):
- 25–40% reduction in spec-to-ship wall time → ~3h to 3h 45m target.
- Commit count structurally similar (each round still has request + 2 responses + combined + disposition + next request + journals — that's ~7 commits per round; the savings come from FEWER ROUNDS, not from condensing per-round commits).
- A 4-round cycle on a similar spec is the operational target (R1→R2→R3→R4 converge instead of R1→R2→R3→R4→R5).

---

## Falsifiable PASS criteria for the next qualifying cycle

The next cycle counts as a PASS for 046's effect when ALL three conditions hold:

1. **Strategist cold-start: ≤1 MCP call + ≤200 lines read + <60s to productive output.** (§1 target.)
2. **Reviewer-tick cold-start INVARIANT: token counts within 10% of baseline floor.** (§4 — no regression in fresh-eyes.)
3. **Founder activations within review queue: 0.** (§5 — the 042 AC8 metric.)

Soft signals (observe + report, not gate):
- Cross-tool consult prompt-size reduction (§2 target: 50%).
- Inter-round strategist tokens (§3 target: 50%).
- Wall-time reduction (§6 target: 25–40%).
- Round count (§6 target: 4 not 5).

A FAIL on any of the three hard conditions means 046's primitive didn't ship the friction-elimination it claimed. The right response is `047-role-typed-state-empirical-fixes` (or rollback), not "next time we'll measure better."

---

## What's NOT in this baseline (out of scope)

- **Builder cold-start cost.** The builder ran for ~24 min and the run log captured its experience, but the builder did not use `task-state/<id>/builder.md` (which would have required reading R5/combined.md's builder-applied dispositions). The cost was therefore confounded with the builder-omission bug F1+F2 surfaced by /review-pending. Future cycles can baseline builder cold-start cleanly once builders dogfood the pointer.
- **Watcher pointer cost.** Watcher is explicitly out of 046 scope.
- **Cross-vendor (claude+codex+cursor) measurement.** This cycle's reviewers were only `codex` + `codex-ops`; cursor's lens wasn't on the roster. A future cycle with the cursor reviewer adapter dogfooding `task_state_ref` discovery would be the right place to measure cross-vendor effect.

---

## Provenance

- 046 spec final SHA at merge: `b419994` (merge ceremony commit) / `d8d8493` (--no-ff merge of `agent/context-fatigue-via-role-typed-state`).
- All 5 review rounds: `backlog/reviews/2026-05-13-046-context-fatigue-via-role-typed-state/{r1,r2,r3,r4,r5}/{request,codex,codex-ops,combined}.md`.
- Strategist resume journal entry: `raw/internal/dogfooding/mcp-interactions-journal.md` § "2026-05-13 16:30 PDT — session resume after /clear (claude strategist)".
- Closed-loop event journal entry: same journal § "2026-05-13 16:45 PDT — closed-loop event: codex reads prior codex strategist via ECHO".
- Builder run log: `raw/internal/agent-runs/2026-05-13-2026-05-13-046-context-fatigue-via-role-typed-state.md`.
- /review-pending sidecar (deleted at merge; viewable at SHA `8e66f5c`): `backlog/pending_review/2026-05-13-046-context-fatigue-via-role-typed-state.review.md`.

**Do not edit this file.** Comparison reports go in sibling `role-typed-state-comparison-<spec-id>.md` files. If the baseline is wrong, file a follow-up explaining why and write the corrected baseline as a new dated file — but never silently overwrite this one. The empirical pre-state is load-bearing precisely because it can't move.
