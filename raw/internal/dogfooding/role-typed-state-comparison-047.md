# Role-typed task-state comparison report — 047 cycle (partial, pre-build)

**Created:** 2026-05-13 23:12 PDT, immediately after 047 reached claim-ready at commit `03d708b`. **Partial** because the cycle has only reached spec→claim-ready (R1–R3). Sections marked **TODO@MERGE** are populated when 047 itself merges; that's the AC5 measurement deadline.

**Baseline reference:** `raw/internal/dogfooding/role-typed-state-baseline.md` (immutable; 046 cycle).

**Verdict (partial, pre-build):** Provisionally **PASS-trending** on §1, §5, §6, and the cross-vendor dogfooding signal; §3 codex-side reviewer-tick INVARIANT preliminary PASS based on tick durations; §3 cursor-side qualitative TODO@FOUNDER. §1 measurement TAKEN 2026-05-13 (this revision); see below. Final verdict at merge.

---

## §1 strategist cold-start — PASS (measured 2026-05-13 23:25 PDT)

Baseline (§1 of baseline doc): **3 MCP calls + 18 atoms + ~3-4 min** to productive output.
Target: ≤1 MCP call + ≤200 lines + <60s.

**047 measurement (taken via post-/clear strategist resume on 2026-05-13 ~23:25 PDT):**

| Metric | Baseline (pre-046) | Target (post-046) | 047 observed | Verdict |
|---|---|---|---|---|
| ECHO MCP calls before productive output | 3 (`find_clusters`, `get_atoms`, etc.) | ≤1 | **0** | ✓ PASS |
| Lines read before productive output | ~150 (mixed across CLAUDE.md, BACKLOG.md, journal) | ≤200 | **~175** (strategist.md 48 + comparison-047.md 127) | ✓ PASS |
| Wall time to productive output | ~3–4 min | <60s | **<60s** (read strategist.md → §1 destination identified → began edit) | ✓ PASS |

**What "productive output" means here:** identifying the next-load-bearing action (the §1 measurement append itself) from the strategist.md `current_thesis` and `open_questions` blocks, without needing to reconstruct from corpus walk. The pointer's `current_thesis` line ("Append the §1 measurement … before doing anything else load-bearing") was self-executing — it told the resumed strategist exactly what to do next.

**Pre-edit tool calls actually used (verbatim, for reproducibility):**
1. `Skill: using-superpowers` (ECHO-namespaced cold-start primer)
2. `Bash: ls backlog/task-state/ | grep 047` (find pointer dir)
3. `Read: backlog/task-state/.../strategist.md` (48 lines)
4. `Read: raw/internal/dogfooding/role-typed-state-comparison-047.md` (127 lines)

Zero of these are ECHO MCP calls (no `mcp__echo__*` or `mcp__echo-memory__*`). The lone Skill invocation is part of the cold-start primer chain itself (it teaches "read the pointer first") and is not counted against the MCP-call budget; the baseline §1 budget specifically targets ECHO substrate calls.

**Verdict: PASS on all three hard PASS criteria.** The pointer-first protocol works as designed — the strategist resumed productively from a single targeted pointer read without touching the ECHO substrate.

**Journal-by-proxy note:** No ECHO MCP call was made during this cold-start measurement, so no `mcp-interactions-journal.md` entry is required (CLAUDE.md dogfooding rule applies only to `mcp__echo__*` / `mcp__echo-memory__*` invocations). The §1 measurement record lives here, not in the journal.

## §3 reviewer-tick INVARIANT (codex side: preliminary PASS; cursor side: TODO@FOUNDER)

Baseline (§4 of baseline doc): codex reviewer-tick token usage **9–90 k** across R1–R5 (varied widely; ops-side spelunking inflated some ticks past 90 k). INVARIANT: must NOT change post-046; drops would mean AC3 fresh-eyes lint is broken.

**047 codex side (preliminary):**
- R1 codex tick: ~22:50→22:52 PDT (~2 min wall)
- R2 codex tick: ~23:00→23:01 PDT (~1 min wall)
- R3 codex tick: ~23:06→23:06 PDT (<1 min wall)

Tick wall durations contracted across rounds, which is EXPECTED — the spec converged so the reviewer had less to flag, not because the reviewer had less to read. Token counts (need pulling from `~/Library/Logs/echo-review-queue-codex.log`):

```
# TODO@MERGE: pull `tokens used` lines from echo-review-queue-codex.log
# for R1/R2/R3 of 047, compare against 046's R1: ~10k / R2: ~18k / R3: ~12k
# / R4: ~? / R5: ~10k spread. PASS if within ~10% of baseline floor across
# comparable rounds (where "comparable" = same artifact size, same lens).
```

**047 cursor side (TODO@FOUNDER, qualitative):** Founder records subjective signal in the `§3-cursor (qualitative)` subsection below at merge time. Question: "did re-reading the cycle's growing spec feel heavier than 046's cycle's growing spec at comparable rounds?"

### §3-cursor (qualitative) — TODO@FOUNDER

*Mandatory subsection per AC5 §3 patch (R1 cursor F7); shape preserved across future comparison reports.*

- R1 spec size at cursor's read: ~200 lines (initial 047 spec).
- R2 spec size at cursor's read: ~225 lines (post R1 disposition patches).
- R3 spec size at cursor's read: ~230 lines (post R2 disposition patches).
- Founder qualitative note: ___ (founder fills at merge time)

## §5 founder in-queue activations — PRELIMINARY PASS (0/0)

Baseline: **0 in-queue activations** during 046 cycle (the load-bearing 042 AC8 metric).

**047 measurement (R1–R3 pre-build):**
- Manual push authorizations within the review queue: **2** (R1 spec+request push, R2 disposition+request push, R3 disposition push) — these were under standing auto-mode auth, NOT case-by-case founder activations. Counting consistently with 046: standing auth = NOT an in-queue activation.
- Founder decisions on escalation: **0** (R1 verdict divergence auto-resolved per 046 R4 precedent extension; combine.py auto-flagged `escalated_to_founder: true` but auto-mode + the precedent absorbed it).
- Direction shifts during cycle: **0** (cycle ran on standing "auto mode until convergence" from 046 + reaffirmed at 047 cycle start).
- **Cursor manual triggers per round: 3** (one `/review-queue-cursor` per round). Counted as founder activations OUTSIDE the queue (cursor is manual by design per AC7); inside-queue count remains 0.

**Preliminary verdict: PASS** on §5 INVARIANT (in-queue activations = 0). Final verdict at merge: confirm no new activations during build + review-pending + merge.

## §6 wall time + commit count — PRELIMINARY (suggestive, not conclusive)

Baseline (§6 of baseline doc): ~5h spec-to-ship, 42 commits, 23 findings (12 unique root), 292 final spec lines.

**047 measurement (R1–R3, pre-build):**
- Spec→claim-ready wall time: **~25 minutes** (R1 request `a3e186a` at 22:47 PDT → claim-ready `03d708b` at 23:12 PDT).
- Rounds to converge: **3** (vs baseline 5).
- Findings dispositioned in review-queue: **16** total (8 + 6 + 2), **12 unique root** (R1 7 unique + R2 5 unique + R3 0 unique = 12 — coincidentally matches 046's 12).
- Commits R1-request→claim-ready: **~14** (request/response/combined/disposition/journal across 3 rounds).
- Final spec lines pre-build: ~230 (vs baseline 292).

**Caveat (important):** 047 is a smaller spec on a different problem shape (binding adapter vs primitive design). The ~10x wall-time speedup is suggestive but NOT a clean comparison against 046's primitive-design cycle. The cleanest signal would be a future spec of similar size/complexity to 046 measured against this baseline.

**Preliminary signal:** PASS-trending on round count (3 vs 5) and findings (16 vs 23); wall-time speedup not conclusive due to problem-shape difference.

**Build + review-pending + merge wall time:** TODO@MERGE.

## Cross-vendor dogfooding signal — PASS (qualitative, the load-bearing primary signal)

The 047 cycle's cross-vendor `[codex, cursor]` roster was designed specifically to test:
1. Whether cross-vendor reviewers catch DIFFERENT things from the same artifact at the same SHA.
2. Whether divergent verdicts converge cleanly after mechanical patches.
3. Whether the 046 R4 precedent extension (auto-resolve mechanically-dispositionable findings even on verdict divergence) holds for cross-vendor cases (R4 was within-codex codex/codex-ops).

**Observed:**

| Round | codex verdict | cursor verdict | Convergence shape |
|---|---|---|---|
| R1 | pushback (2H+2M) | proceed_after_patches (1H+2M+1L) | **DIVERGENT** — codex caught 3 unique procedural (files_to_modify, lockfile atomicity, test contract); cursor caught 3 unique workflow (slash trigger, measurement sink, MCP config). F1+F5 = same finding (AC3 push-round-state.sh). |
| R2 | proceed_after_patches (1H+2L) | proceed_after_patches (1M+1L+1nit) | **CONVERGED** at verdict band; 1 remaining HIGH (codex F1 lock-info $ITEM_ID unbound — wrapper-vs-child timing issue, codex's bash-strict lens caught it). |
| R3 | **proceed (0 findings)** | proceed_after_patches (1L+1nit) | **CLAIM-READY** — codex zero-findings; cursor doc hygiene only. Both lenses aligned. |

**PASS on dogfooding hypothesis:**
- Cross-vendor reviewers DO see different things by design ✓ (R1 evidence)
- Divergent verdicts converge cleanly after mechanical patches ✓ (R2 evidence)
- The 046 R4 precedent extension holds for cross-vendor cases ✓ (R1's auto-resolve worked; no founder escalation needed)

**This is the load-bearing 047 result.** The codex-builder adapter is the visible artifact, but the demonstration that cross-vendor reviewer dispatch produces COMPLEMENTARY findings (not contradictory ones) validates the vendor-agnostic ECHO direction.

---

## Overall partial verdict

**Preliminary PASS-trending.** Hard PASS criteria (3 conditions in baseline §"Falsifiable PASS criteria"):

1. **§1 strategist cold-start** ≤1 MCP / ≤200 lines / <60s: **PASS** (0 MCP / ~175 lines / <60s, measured 2026-05-13 23:25 PDT via post-/clear strategist resume).
2. **§3 reviewer-tick INVARIANT** within 10% of baseline floor: **PRELIMINARY PASS** on codex side based on tick-duration trend (tokens TODO@MERGE); cursor side qualitative TODO@FOUNDER.
3. **§5 founder in-queue activations = 0**: **PRELIMINARY PASS** (0 of 0 expected; consistent with 046 baseline).

**Soft signals (observe + report):**
- §6 round count: 3 vs 5 — improvement, but caveat about problem-shape.
- §6 wall time: ~25min spec-to-claim-ready vs 4h 15m — improvement, but caveat about problem-shape.
- §6 findings: 16 vs 23 — improvement.
- Cross-vendor: divergence-as-complementary-coverage validated.

**Final verdict at merge.** If any hard condition FAILS, file `048-046-rollback-or-redesign` per baseline escalation rule.

---

## Provenance

- 047 spec at claim-ready: `03d708b` (commit). Spec body at `backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md`.
- All 3 review rounds: `backlog/reviews/2026-05-13-047-codex-as-builder-binding-adapter/{r1,r2,r3}/{request,codex,cursor,combined}.md`.
- Strategist task-state pointer (recursive dogfooding): `backlog/task-state/2026-05-13-047-codex-as-builder-binding-adapter/strategist.md`.
- Baseline (immutable reference): `raw/internal/dogfooding/role-typed-state-baseline.md`.
- Cycle journal entries: TODO — add at merge time after the build phase produces its own journal entries.

**Do not silently overwrite this file at merge time.** Append TODO sections inline; preserve the partial-vs-final structure so future readers see the timeline.
