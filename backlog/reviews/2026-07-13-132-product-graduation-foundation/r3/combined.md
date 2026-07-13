---
item_id: 2026-07-13-132-product-graduation-foundation
round: 3
combined_at: '2026-07-13T09:41:10Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 03817c4e3b21c9fc79a271db164999b2e3c5f183
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
Reframe gate: findings 1, 3, 5 target prior-round patch mechanisms (291870c3, a532c695) and findings 2/4 target the r1/r2-introduced probe adapter — mandatory investigator ran (codex exec read-only). Verdict `propagation_completion`, validated: (2/4) is one real convergent defect in the adapter's selection rule; (5) is a genuine wiring contradiction the r2 ci.yml patch introduced; (1) resolves by making the fence tool the FIRST deliverable, killing the circularity; (3) is accepted via the investigator-endorsed NARROW static rule (fence-enforced child_process ban inside the shipped closure, dev-side build tools explicitly outside the hermeticity claim) instead of runtime preload into every tool process.

| 1 | MEDIUM | codex | AC1 — Closure inventory is two-phase | accepted — patched (corrective) | 03817c4e — check-boundary.mjs is the builder's first deliverable with a `--seed-inventory --roots` mode (deterministic sorted output); phase 2 fence compares against phase-1 inventory; executable from a clean checkout |
| 2 | HIGH | codex | AC2 — deepest-match mount selection (convergent with #4) | accepted — patched | 03817c4e — selection takes the unique deepest decoded-component match independent of table order; `/` fallback only; equal-depth ambiguity → unknown (fail closed); root-before-nested-network fixture where the nested mount must win |
| 3 | HIGH | codex | AC4 — child_process in standalone tool processes | accepted — patched (narrow static rule) | 03817c4e — fence statically forbids child_process/node:child_process (incl. sync variants) inside the shipped closure + tests/product except the spawnSanitizedChild owner; red fixture; tools/product/ declared controlled build machinery outside the hermeticity claim |
| 4 | HIGH | codex-ops | AC2 — first-match can classify SMB/NFS as local | accepted — patched | 03817c4e — same patch as #2 |
| 5 | HIGH | codex-ops | AC4/AC5 — ci.yml lacks the artifact-dir producer for packaged-product.test.ts | accepted — patched | 03817c4e — ci.yml quality job builds one non-qualification scratch lineage from its checked-out SHA (pinned Node), exports ECHO_PRODUCT_ARTIFACT_DIR before test:product; test never packs in CI; scratch lineage is run-local evidence, never uploaded, AC7 build-once untouched |

## Convergence call

needs R4 — focus_hints: verify the r3 patch set at 03817c4e. (1) AC1: fence-tool-first + --seed-inventory — any remaining ordering circularity? (2) AC2: unique-deepest-match + equal-depth-unknown — is the selection rule now unambiguous and does the root-before-nested fixture force it? (3) AC4: static closure child_process ban + dev-tool scoping — enforcement complete for the shipped closure without over-claiming for build machinery? (4) AC4/AC5/AC7: does the ci.yml scratch lineage stay cleanly non-qualification (never uploaded, never named), leaving AC7 build-once intact? This is the fourth round; all four patches are completions of already-accepted contracts. Converge unless a NEW load-bearing defect is found — do not reopen accepted mechanisms for wording preferences.

