---
item_id: 2026-07-13-133-local-echo-brain-source-extraction
round: 12
combined_at: '2026-07-14T02:06:36Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 69a11b2c6780b759f15ef2944aeb31d0e048793d
next_round: 13
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
| 1 | HIGH | codex | AC3 — provenance checks / AC7 — source-independent private-clone verification | patched | 69a11b2c — assigned pinned-source replay solely to the operator audit; target-local verification now checks only target-owned evidence and manifests. |
| 2 | HIGH | codex | AC5 — immutable intent/result publication | patched | 69a11b2c — replaced overwrite-capable rename publication with a retained descriptor-relative `linkat` no-replace helper and create-new raw streams. |
| 3 | HIGH | codex | AC5 — retained attempt evidence / AC7 — Phase 1 cleanup | patched | 69a11b2c — retained the phase-1 install and moved baseline, hostile, and rebuild runs into separate clone/cache/install roots. |
| 4 | HIGH | codex | AC7 — committed verification plan and sealed retained runner | patched | 69a11b2c — specified exact retained runner, audit, normalizer, plan schema, namespaces, and bootstrap command. |
| 5 | MEDIUM | codex | AC7 — final Git verification roster | patched | 69a11b2c — made the final tree check recursive with `git diff-tree -r --check --root HEAD`. |
| 6 | MEDIUM | codex | AC5 — single-writer attempt root / AC8 — independent review | patched | 69a11b2c — made builder evidence read-only after handoff and gave every reviewer a separate attempt root and ledger. |
| 7 | MEDIUM | codex | AC3 — source-extraction and rewrite provenance schemas | patched | 69a11b2c — included Git modes and required byte-identical test copies with mode equality. |
| 8 | MEDIUM | codex-ops | AC5 — immutable evidence publication | patched | 69a11b2c — required no-replace publication for both evidence files and raw command streams. |
| 9 | MEDIUM | codex-ops | AC5 no-cleanup contract and AC7 phase-1 installation | patched | 69a11b2c — retained phase-1 dependencies and isolated all later installs instead of deleting the first tree. |
| 10 | MEDIUM | codex-ops | AC5 build:artifact output and AC7 exact runner | patched | 69a11b2c — required separate, byte-identical baseline, hostile, and rebuild artifact roots. |
| 11 | MEDIUM | codex-ops | AC5 command ledger timeouts and AC7 retained runner | patched | 69a11b2c — every command now owns a fresh process group with bounded TERM/KILL/wait and quiescence verification. |
| 12 | MEDIUM | codex-ops | AC1 parent-chain preflight | patched | 69a11b2c — defined exact owner and write-bit policy for `/`, `/Users`, the home/Desktop chain, and mode-0700 evidence directories. |

## Convergence call

needs R13 — focus_hints: source-audit responsibility and modes; no-replace evidence; retained phase installs; exact runner, normalizer, and namespaces; recursive Git checks; process quiescence; reviewer evidence isolation; parent ownership.
