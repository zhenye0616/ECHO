---
item_id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
round: 2
combined_at: '2026-06-05T23:26:15Z'
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

Reframe gate: considered, not triggered — finding #1 targets the r1 patch (8e9dcd81's isolation contract) but count of prior-patch-targeting findings = 1 (< 2 threshold; #2 targets original AC1 spec text). Removal evaluated for #1 and rejected: the isolation mechanism was reviewer-REQUIRED in r1 (codex F1 + codex-ops F1 convergent), and the r2 finding asks for concretization (falsifiability), not repair of a defect — codex's own r2 prose confirms "I do not see a reframe-gate issue."

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC4 - packaged rehearsal is the gate | accepted — text_patch (concretize, don't add mechanism) | 7c1fd79f — AC4 now names the exact env contract verified against source (`HOME`/`USERPROFILE`/`ECHO_HOME`/`CODEX_HOME`, selftest.ts:390-394), the `ECHO_MCP_PORT=0` throwaway-daemon fact + must-not-override rule, a normative command skeleton, and the required run-log fields |
| 2 | MEDIUM | codex | AC1 - Codex skill second-hop | accepted — text_patch | 7c1fd79f — missing shipped source = hard failure with diagnostic naming the path; no partial SKILL.md, no marker write; unit test asserts error + absence of partial writes |

## Convergence call

needs R3 — focus_hints: verify the r2 patches at 7c1fd79f close both findings with zero new mechanism: AC4's env contract matches `selftest.ts:390-394` ground truth and the skeleton + run-log fields are executable/falsifiable as written; AC1's missing-source hard-failure contract is consistent with the adapter layer's atomic-write discipline. Expect terminal if clean.

