---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 4
combined_at: '2026-07-16T03:36:16Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 677c585a8ca839233d9c1c79596345ab2e427515
next_round: 5
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: fired — all 7 findings target r2/r3 patch-introduced or patch-reworded mechanism text (broad lookback window: 9c37bd8c spec-r2-patches, 8d863930 spec-r3-patches). Fresh-context investigator (codex exec, read-only) returned `kind: propagation_completion`: the start-versus-activation serialization, fence-before-mutation, and deterministic-build invariants are original spec contract; r3's implementation choices (record-inode lock, unstated evidence-sink provenance, absolute "only mutation-capable command" / "write nothing vs journal everything" wording) propagated incompletely rather than being removable mechanisms. Removal was rejected via the proof matrix: cutting the lock serialization would leave `remaining_invariants` demanding a compensating serialization contract — relabeling, not removal — and would reopen the r3 HIGH race. Strategist validated the recommendation against the spec contract and applied it as propagation-completing text patches in 677c585a8ca839233d9c1c79596345ab2e427515 (spec-r4-patches): one stable never-replaced per-root `authority.lock` unifying AC1's root lock with AC2's fence lock; stop/verify-quiescent of already-started full processes before phase commit; preprovisioned evidence sink with cross-process bound and no in-memory limiter state; completed-path ownership in files_to_modify; explicit four-identity `--counterpart-manifest` build handoff; AC1 absolutes narrowed (controller/runtime-state mutation only; pre-trust writes no journal/temp/cache/log). Diagnostic check applied: no r2 command catalogue or remote-landing gate revived, no second lock introduced, no durable rate-limiter state added, no pre-trust evidence sink added.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC1 canonical transaction record and AC2 authority-fence serialization | accepted — patched (treated as one HIGH with #4) | 677c585a — lock target moved off the replaceable/absent record inode to the stable never-replaced sibling `authority.lock` (descriptor-relative no-follow creation for the absent state), unified with AC1's per-root lock; every transition and rollback-full start acquires it before reading authority state; held through the entire authority-bearing startup handoff or neutralization + stop/verify + phase commit; barrier test added for record creation and atomic replacement with a paused contender |
| 2 | MEDIUM | codex | files_to_modify and AC8 | accepted — patched | 677c585a — backlog/complete/2026-07-15-138-….md added to files_to_modify with AC8 evidence-only readback rationale |
| 3 | MEDIUM | codex | AC5 deterministic cross-repository candidate builds | accepted — patched | 677c585a — explicit handoff defined: echo-context builds first, Project_echo receives `--counterpart-manifest`, clean-tree + local-git-object verification of counterpart SHA/tree, candidates:verify asserts the identical {context SHA, context tree, project SHA, project tree} tuple across both manifests, swapped-counterpart negative test required |
| 4 | HIGH | codex-ops | AC2 — authority-fence lock protocol | accepted — patched (treated as one HIGH with #1) | 677c585a — same stable-lock rework; additionally the controller, while holding the lock before prepared/active commit, stops and verifies quiescent (zero writers) every already-started full process, closing the release-after-startup write path; tests cover absent-record, replacement, both race orders, and a post-commit write attempt |
| 5 | MEDIUM | codex-ops | AC2 and tests/daemon/authority-fence.test.ts | accepted — patched | 677c585a — evidence sink preprovisioned at package install (pre-open fence never creates directories); relaunch bound enforced cross-process via bounded-retention/coalescing sink + start-job neutralization, no in-memory limiter state assumed; fake-launchd fixture launches a fresh process per attempt and asserts bounded attempts + evidence visible after restart |
| 6 | MEDIUM | codex-ops | AC1 — pre-trust journaling contract | accepted — patched | 677c585a — durable journaling begins only after root trust + lock acquisition; pre-trust failures write no durable journal, temporary file, cache, or secondary log anywhere; zero-mutation matrix extended to sentinel temp/cache/log locations |
| 7 | MEDIUM | codex-ops | AC1 and AC5 — command-surface contract | accepted — patched | 677c585a — AC1 narrowed to the only controller/runtime-state mutation entrypoint; AC5 builds classified artifact-output-only (no service/client/state adapters), candidates:verify read-only apart from scratch extraction under build output; command-surface separation test added |

## Convergence call

needs R5 — focus_hints: verify the propagation-completion patches at 677c585a: stable per-root `authority.lock` protocol (absent-record creation, replacement immunity, acquire-before-read, hold-through-handoff-or-commit, stop/verify-quiescent before prepared/active), completed-path files_to_modify addition, four-identity counterpart-manifest build handoff + swapped-counterpart negative test, pre-trust write-nothing vs post-trust journaling boundary, preprovisioned cross-process fence-evidence sink, and rehearse-vs-candidates command-surface separation.

