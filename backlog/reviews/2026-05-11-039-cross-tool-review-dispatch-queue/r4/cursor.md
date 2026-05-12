---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 4
reviewer: cursor
artifact_sha: c364ac2216b850a3a53e6a9ace1d06adb81e90d8
completed_at: 2026-05-12T10:45:00Z
verdict: proceed
findings: []
---

# Reviewer notes

## R4 verification (RC4 @ `c364ac2`)

**(1) AC3.5 step 3 (a)/(b)/(c) vs §Out of Scope #7 and AC6b “0 dispatch”**

- First bullet (escalation): `escalated_to_founder: true` only for cross-`{proceed*, pushback}` roll-up (`divergent`), `single_reviewer_timeout`, and `no_responses`. Strategist exits after a journal pointer; no adjudication. Matches #7 for boundary-crossing disagreement.
- `(b)` DEFAULT: disposition stays inside `{proceed*, pushback}` roll-ups; intra-proceed prescription merge is strategist judgment inside the tick, which #7 already assigns to the disposition column — autonomous execution does not expand founder workload beyond the counted judgment messages when not escalated.
- `(a)` vs `(b)` vs `(c)` are mutually exclusive by construction: patches absent → (a); patches present + default verification → (b); patches present + explicit waiver → (c). No single tick can legally both run `request.py <N+1>` and set `next_round: null` unless on the (c) waiver path (null after waive) or (a) (null, no new request). **(b)** always pairs `next_round: <N+1>` with a new `request.md`. **Residual risk is implementer error**, not spec ambiguity — AC4 tests explicitly require all three branches.

**(2) R3 LOWs — all five verified landed**

| R3 ID | Check | RC4 evidence |
|-------|--------|----------------|
| L1 | `no_responses` in `escalated_to_founder` comment | §Architecture `combined.md` template l.156–159 |
| L2 | AC6b cites `/review-queue-watch` + AC3.5 | §AC6b l.430–431, repeats b/c and (a)/(c) termination |
| L3 | one-round-per-tick | §AC3.5 step 4 l.332–333 + `combine.py` one eligible round |
| L4 | session bootstrap excluded from dispatch count | §AC6b success criteria l.434–435 |
| L5 | journal pointer “not a queue artifact” | §Architecture push-race l.231 |

**(3) Drift watch**

- §AC0 step 4 still **explicitly rejects** keyboard automation and detached Cursor auto-paste (❌ bullets). No R2 H2 regression.
- Queue path unified to `raw/internal/queue-errors.md` (not `.log`); push-with-retry, reviewer SHA-drift note, and Implementation Notes align. **Seed file present** (`raw/internal/queue-errors.md` one-line SEED); does not interact with `tools/blocked.py` (backlog-only). No manifest/wiki coupling in spec beyond normal `raw/internal/` files.
- Codex R3 **M1** (a)/(b)/(c) state machine and **M2** (exact sub-anchor + observational `related_where_sections` + R2 fixture) are substantive additions, not scope creep — they close live-found bugs.

**(4) (a) vs (b) exclusivity — “both ways” race**

- In one tick, step 3 is an if/else ladder: escalate OR else `(a)|(b)|(c)` subtree. **(b)** requires patch commit + `request.py` + `next_round: N+1` commits; **(a)** requires no patch commits and `next_round: null`. **(c)** requires waiver line + `next_round: null` after patches. Double-application would be a buggy implementation (e.g. committing both convergence and `r{N+1}/request.md`); the spec’s ordered bullets and separate commits make the intended state machine auditable in code review.

## Optional polish (not raised as findings)

§AC6b narrative paragraph (l.430) still reads like a single “happy path” (“patches spec … runs `request.py` for r2/`”). Termination correctly references step 3 **(a)** or **(c)**. A reader skimming only the paragraph could miss that **(a)** ends without patch or new request; cross-ref to AC3.5 is one screen away. Acceptable for R4; builder reads AC3.5.

## Convergence call

**R4 verdict `proceed`, zero findings.** RC4 satisfies the R3 verification round. Recommend strategist declare convergence once Codex R4 matches (`proceed*` + no HIGH/MED), per §Review History R3 convergence prediction.
