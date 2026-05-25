---
item_id: 2026-05-25-070-echo-global-home-scaffold
round: 2
combined_at: '2026-05-25T22:59:10Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 3
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157 | accepted — mechanism dropped (paired with F4) | AC2.2 over-broad claim removed. The text no longer asserts `wx` provides crash-atomic file-content durability — it now scopes the invariant strictly to **concurrent-first-create exclusion** (which `O_CREAT \| O_EXCL` does guarantee). Partial-write recovery is explicitly out-of-scope for 070; the recovery contract is downstream `schema_version === 1` check in 071–074. The durable-publish primitive (temp+fsync+linkSync+EEXIST-loser+unlink) is deferred to a V1.5+ follow-up if observability shows non-trivial partial-write rates. Per disposition discipline: r1 added a too-strong claim; r2 removes it rather than patching deeper with linkSync mechanism that the substrate doesn't yet need. |
| 2 | MEDIUM | codex | backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:194 | accepted — mechanism dropped (paired with F5) | AC4 Test 4 (Promise.all microtask "race") removed entirely. `ensureEchoHome` is synchronous, so `Promise.resolve().then(syncCall)` serializes on the microtask queue and does not interleave the two calls — the test was theatrical. The EEXIST-handler contract is now pinned by Test 3 (Partial-state recovery), expanded inline to document the dual purpose: pre-existing file → impl encounters EEXIST → must treat as no-op. EEXIST is EEXIST regardless of how the pre-existing file got there. Per disposition discipline: removal-only patch on r1-introduced mechanism. |
| 3 | LOW | codex | backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-245 | self-resolves via F2 | With Test 4 removed, scaffold.test.ts is back to 3 cases; total = 3 + 3 = 6, which matches the existing Tests section ("three cases") and DoD ("All six new test cases pass"). No further patch needed. |
| 4 | MEDIUM | codex-ops | backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:155-160; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-195 | accepted — mechanism dropped (paired with F1) | Same disposition as F1. codex and codex-ops independently converged on the same diagnosis: r1's `wx`-is-atomic claim was too strong. r2 weakens the claim to the truthful concurrent-create-exclusion contract and explicitly defers durable-publish to a V1.5+ spec. |
| 5 | LOW | codex-ops | backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157-158; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-195; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:224-245 | accepted — mechanism dropped (paired with F2) | The "1/1 per-file split" concern is mooted by removing Test 4 entirely. The spec no longer asserts a "2/0 vs 1/1" winner pattern. Test counts self-correct (see F3). |

## Convergence call

`needs R3` — verification round to confirm the two r2 removals (`wx`-as-atomic claim, AC4 Test 4) landed correctly, that the new AC2.2 wording is honest about what `wx` provides, that Test 3 fairly pins the EEXIST handler, and that the downstream `schema_version === 1` check is sufficient as the partial-write recovery contract for V1.

