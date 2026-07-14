---
item_id: 2026-07-13-133-local-echo-brain-source-extraction
round: 13
combined_at: '2026-07-14T02:43:11Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 58870d8c6dca1ed230cd3af8f9262cd36bc1087c
next_round: 14
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
| 1 | HIGH | codex | AC7 — verification-plan schema and runner bootstrap | patched | 58870d8c — defined the complete token vocabulary, single-pass expansion/containment rules, template/rendered hashes, and malformed/cross-root fixtures. |
| 2 | HIGH | codex | AC5/AC7 — baseline, hostile, and rebuild execution | patched | 58870d8c — fixed fetch/baseline/hostile/audit/rebuild row ownership, repetitions, canaries, canonical baseline, and distinct cache/install/output manifests. |
| 3 | HIGH | codex | AC5 — command process lifecycle | patched | 58870d8c — made quiescence mandatory after every exit and pinned started identity, sysctl descendant tracking, lsof writer/listener evidence, and escape fixtures. |
| 4 | MEDIUM | codex | AC1/AC3/AC7 — pinned-source extraction and operator audit | patched | 58870d8c — replaced archive trust with literal ls-tree/raw cat-file reads, explicit source/boundary inputs, read-only audit profile, and source/target object-state checks. |
| 5 | MEDIUM | codex | AC7 — semantic-normalizer.v1.json | patched | 58870d8c — enumerated the only normalizable pointers/tokens and prohibited status, hash, artifact, Git, containment, and probe normalization. |
| 6 | MEDIUM | codex | AC5/AC7 — toolchain and filesystem mode contract | patched | 58870d8c — pinned exact Git/clang/SDK/compiler invocation and recursive cache, publisher, evidence, and post-handoff modes. |
| 7 | MEDIUM | codex | AC8 — independent reviewer evidence | patched | 58870d8c — defined canonical attempt seal coverage plus request-bound reviewer bootstrap, sealed input copying, namespaces, and builder-root write denial. |
| 8 | HIGH | codex-ops | AC5 evidence-publisher bootstrap / AC8 failure durability | patched | 58870d8c — added publisher-independent create-once bootstrap intent/streams/result with exact compiler, environment, limits, and retained failure evidence. |
| 9 | HIGH | codex-ops | AC5 command lifecycle / AC1 interrupted-target recovery | patched | 58870d8c — added pre-exec PID/PGID/session/start-token record and all-exit descendant/listener/writer quiescence including double-fork fixtures. |
| 10 | HIGH | codex-ops | AC5 no-replace publication / AC8 builder-attempt sealing | patched | 58870d8c — specified link/fsync/unlink/second-fsync state machine, sole temp-removal exception, descriptor closure, canonical seal, and recursive freeze. |
| 11 | MEDIUM | codex-ops | AC7 verification roster / AC1 clean-target requirement | patched | 58870d8c — added shared-target porcelain plus no-follow filesystem-versus-HEAD enumeration before/after verification and ignored/untracked rejection. |
| 12 | HIGH | codex-ops | AC8 exact handoff commit and sole push | patched | 58870d8c — bound exact parent/staged path set/tree/commit/ref/endpoint, pushed literal recorded SHA with expected-absent lease, and parsed sole porcelain update. |
| 13 | MEDIUM | codex-ops | AC8 independent reviewer evidence | patched | 58870d8c — required full parent-chain validation, descriptor-created reviewer roots, immutable request identity, attempt seal, and independent hash-verified tools. |

## Convergence call

needs R14 — focus_hints: template rendering and namespace roster; publisher bootstrap/sealing; all-exit process quiescence; raw-source audit; shared-target cleanliness; exact Project_echo SHA/ref handoff; request-bound reviewer evidence.
