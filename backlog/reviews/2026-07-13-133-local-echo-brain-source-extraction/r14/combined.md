---
item_id: 2026-07-13-133-local-echo-brain-source-extraction
round: 14
combined_at: '2026-07-14T03:15:17Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 75b5ce407a8b680a7a53ac280d26281ff73e2387
next_round: 15
combined_verdict: pushback
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC5 — bootstrap publisher | superseded | 75b5ce40 — removed the dedicated evidence tree/native publisher; ordinary run records plus fresh-clone reruns are the proof. |
| 2 | HIGH | codex | AC5 — publisher state machine; AC8 — final seal | superseded | 75b5ce40 — removed crash-atomic publication and attempt sealing entirely. |
| 3 | HIGH | codex | AC5 — process-watch quiescence | superseded | 75b5ce40 — removed adversarial descendant-containment claims and states the attended trusted-process threat model explicitly. |
| 4 | MEDIUM | codex | AC5 and AC7 — verification-plan namespace roster | superseded | 75b5ce40 — replaced migration namespaces with one explicit target-local verification roster rerun in independent clones. |
| 5 | MEDIUM | codex | AC7 — template token vocabulary | superseded | 75b5ce40 — removed the templated runner; SOURCE_DATE_EPOCH derives directly from verified target commit time. |
| 6 | HIGH | codex | AC3 and AC7 — raw-source audit and parity dispositions | patched | 75b5ce40 — pinned roots/fixed-point traversal plus exact rewrite/exclusion/target-only allowlists and omission/evasion fixtures. |
| 7 | HIGH | codex | AC8 — Project_echo handoff and attempt-seal ordering | superseded | 75b5ce40 — removed the cyclic seal/custom handoff and delegated Project_echo publication to the existing builder workflow. |
| 8 | MEDIUM | codex | AC8 — independent-review shared-target checks | patched | 75b5ce40 — reviewer reruns status, filesystem-versus-HEAD, refs/config/object-state, and fsck before/after its clone verification. |
| 9 | MEDIUM | codex | AC8 — exact Project_echo SHA/ref handoff | superseded | 75b5ce40 — existing builder workflow owns its normal feature-branch publication; target repo remains no-remote. |
| 10 | MEDIUM | codex | AC8 — request-bound reviewer evidence | patched | 75b5ce40 — reviewer binds canonical request bytes/path, spec SHA, roster, target HEAD/tree, migration commit, commands, and results. |
| 11 | HIGH | codex-ops | AC8 — handoff commit and attempt sealing | superseded | 75b5ce40 — removed the non-cyclic impossibility by deleting the second evidence/handoff protocol. |
| 12 | HIGH | codex-ops | AC5 and AC7 — publisher bootstrap | superseded | 75b5ce40 — no bootstrap publisher or process-watch recursion remains. |
| 13 | HIGH | codex-ops | AC7 and AC8 — retained installs, tool-bin, and attempt seal | superseded | 75b5ce40 — ordinary scratch installs are not sealed; independent clones reproduce the accepted artifact. |
| 14 | HIGH | codex-ops | AC5 — all-exit process quiescence | superseded | 75b5ce40 — no race-free hostile-child claim remains in this trusted attended migration. |
| 15 | MEDIUM | codex-ops | AC5 and AC7 — verification namespace roster | superseded | 75b5ce40 — final-repo verification is a single explicit ordered command set, not a migration namespace protocol. |

## Convergence call

needs R15 — focus_hints: final-repo reproducibility; raw-object source closure and disposition allowlists; clean-clone artifact/test parity; shared-target reviewer checks; normal builder handoff only.
