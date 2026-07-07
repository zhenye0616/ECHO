---
item_id: 2026-07-07-125-observability-hardening-batch
round: 1
combined_at: '2026-07-07T07:16:07Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
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
| 1 | MEDIUM | codex | Acceptance Criteria / AC3 | accepted (scoped, not atomic-primitive) — falsifiability hardening | 980d0fa7 — took codex's offered alternative: AC3 now explicitly scopes the check-then-append guard + test to the **sequential** markPosted-throw retry edge and declares concurrent double-append out of scope. An atomic unique-append primitive is a 123 persisted-contract change (locked out of scope), so it is deferred as a documented blind spot, not built. Paired with #6. |
| 2 | MEDIUM | codex | Acceptance Criteria / AC4 | accepted — falsifiability hardening | 980d0fa7 — AC4 now enumerates the exact store set for `--note` mode (default + every channel-specific store; `--seed-store` narrows) and pins a terminal-only pre-123 note fixture. Paired with #7. |
| 3 | MEDIUM | codex | files_to_modify / AC2 | accepted — falsifiability hardening | 980d0fa7 — the brain proxy test already lives at `tests/enrich/brain-retrieval-capture.test.ts` (a permitted path); files_to_modify now names it concretely and AC2 names the file + assertions. No new permitted path needed. Paired with #5. |
| 4 | LOW | codex | Acceptance Criteria / AC5 | accepted — made required + concrete | 980d0fa7 — removed the unenforceable "optional"; AC5's present-db byte-identity test is now REQUIRED, placed in `tests/tools/trace-card.test.ts` (belt-and-braces to 123's existing absent-db case at :218) with a concrete before/after byte-identity assertion. Not a removal-matrix case (targets original r1 text, not a prior-round patch). |
| 5 | MEDIUM | codex-ops | Acceptance Criteria / AC2 | accepted — falsifiability hardening | 980d0fa7 — AC2 now requires BOTH stream directions (downstream client-destroy AND upstream-destroy/timeout of the brain child), asserting no unhandled process error + a durable capture_failed/partial record. Paired with #3. |
| 6 | MEDIUM | codex-ops | Acceptance Criteria / AC3 | accepted as documented blind spot — concurrent path deferred | 980d0fa7 — same disposition as #1: concurrent-tick race needs an atomic primitive/lock = 123-contract change, out of scope. New Out-of-Scope bullet records the deferral; AC3 states intake is single-flight today so the sequential edge is the live risk. |
| 7 | MEDIUM | codex-ops | Acceptance Criteria / AC4 | accepted — falsifiability hardening | 980d0fa7 — same patch as #2: full store enumeration for `--note` mode closes the terminal-only silent-miss; terminal-only pre-123 note test pinned. |

## Reframe gate

Not triggered: r1 has zero prior-round `spec-r*-patches` commits (0 patch-on-patch findings < 2 threshold). All findings target original AC2–AC5 / files_to_modify text. The one removal-language disposition (#4, removing "optional") targets original r1 text, not a prior-round patch, so the removal proof matrix does not fire. Investigator not run.

## Convergence call

`needs R2` — spec patched (980d0fa7); proposed artifact takes a verification round (branch b). focus_hints: verify AC2 requires both stream directions with concrete test file; AC3 is scoped to the sequential retry edge with concurrent-append explicitly deferred (no 123 persisted-contract change); AC4 enumerates the full seed-store set for --note mode; AC5's present-db test is required+concrete; files_to_modify test paths match the ACs and add no capture/schema-side files.

