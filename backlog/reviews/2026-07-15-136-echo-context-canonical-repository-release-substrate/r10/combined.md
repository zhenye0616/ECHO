---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 10
combined_at: '2026-07-16T05:43:06Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings

Reframe gate: assessed. Rows 1 and 3 are semantically convergent (same AC6 write-ahead durability boundary, listed divergent only because the `where` strings differ) and target the marker contract as it evolved across prior-round patch commits — the >=2 trigger would fire. The mandatory fresh-context investigator is superseded this tick by explicit founder instruction: the disposition is a formal founder decision boundary (choose substrate A or B below), not a strategist patch/cut/propagation choice, so the investigator's question is moot. No spec mutation of any kind this tick per the same instruction.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC6 — write-ahead attempt-marker durability | escalated to founder — formal decision boundary held; no patch this tick | none — see FOUNDER DECISION REQUIRED below; same boundary as row 3 |
| 2 | MEDIUM | codex | AC1 prepared main push and AC6 annotated-tag push | accepted — patch deferred; both create-only push contracts must gain `--porcelain` (and fixtures must reject its absence), but no spec mutation is permitted this tick | none — fold into the single R11 patch set once the founder selects substrate (A) or (B); do not patch piecemeal ahead of that decision |
| 3 | HIGH | codex-ops | backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md: AC6 write-ahead attempt-marker contract | escalated to founder — formal decision boundary held; no patch this tick | none — see FOUNDER DECISION REQUIRED below; same boundary as row 1 |

## FOUNDER DECISION REQUIRED — AC6 write-ahead durability substrate

Both reviewers independently returned HIGH pushback on the same boundary: a GitHub Actions run log provides no synchronous, acknowledged durable-flush primitive, so "marker durably emitted before release mutation" is not buildable as written — abrupt runner/VM loss can leave a committed tag/release mutation with no visible marker, and injected process-termination fixtures cannot prove hosted-runner durability. The founder must choose exactly one:

- **(A) Independently durable acknowledged marker substrate.** Write-ahead markers go to a store with an acknowledged persistence primitive (not the run log), and the marker write itself gets its own CAS/idempotency/ambiguity contract plus an end-to-end failure model proving the ack precedes each release mutation.
- **(B) Destination namespace/readback as durable authority.** Recovery treats readback of the destination namespace (tags/releases) as the sole durable truth; run-log markers are explicitly downgraded to best-effort evidence, with the recovery contract and tests rewritten around the selected authority.

Until the founder records this choice, the item stays in `backlog/proposed/` — no R11 dispatch, no promotion, no build/claim, no external mutation.

## Convergence call

HELD FOR FOUNDER DECISION after R10 — not claim-ready; R11 dispatch deliberately withheld. R11 (verification round over the substrate patch + the row-2 `--porcelain` patch) fires only after the founder selects (A) or (B) above.

