---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 20
combined_at: '2026-07-16T15:14:39Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 65059d49663e3a0cd1f5651ab22021d692d017fe
next_round: 21
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: FIRED — all nine combined rows target the r19 cut's retained landing/tuple wording or the orphaned release mode left by that cut. The required read-only `codex exec` investigator ran and concluded that exact preauthorized `M` plus an observable tuple are necessary while an attempt ledger/runner is not, but it stalled before its fixed-format return and was interrupted. A separate fresh-context read-only investigator returned `kind: structural_cut`; after the patch, that investigator independently audited the exact diff and returned PASS. The strategist adopts the structural-cut result.

Patch: exact commit `65059d49663e3a0cd1f5651ab22021d692d017fe`; patched spec SHA-256 `edb84269652908323d01cc10d9e93ddee3d2a4bb48d4328a3ccda5356090d5e4`. R21 must verify these exact bytes; no claim, implementation repair, or target write is authorized by this disposition.

Removal proof matrix (covers rows 3, 4, and 7; the other rows are narrow propagation or a reasoned rejection):

- `state_removed`: the AC3 `--mode=release` grammar; caller-supplied `RA/RC/RM/RH` release inputs; the second mode trace/count/deadline branch; AC6's third source-acceptance tuple comparison and implied tuple receipt.
- `behavior_removed`: fresh-clone verification of caller-supplied release files and the redundant post-landing AC3 rebuild/tuple comparison. Item 136 now performs only source acceptance before landing and dual deterministic build plus verification at landed `M`.
- `owners_removed`: `fresh-clone-verifier.mjs`, its wrapper, `fresh-clone-acceptance.test.ts`, and target `AGENTS.md` are no longer responsible for a release mode or release-review contract. Their paths remain because they still own the source-only acceptance; no new implementation owner is added.
- `tests_removed_or_changed`: the release trace, release vector, release counts, release deadline branch, release cleanup assertion, and tuple-receipt/mismatch surface are deleted; the acceptance test owns one literal source oracle and rejects every other mode.
- `remaining_invariants`: AC3 source-only fresh-clone acceptance run by builder and independent reviewer; AC5 deterministic source build/verification; AC6 dual-build equality and six-field tuple at `M`; item 137 as the independent rebuild consumer; one exact reviewed target landing through a preconstructed `M`, immutable approval, one leased push, and authenticated readback.

Failure-mode check: every removed state/behavior/responsibility/test is absent, and no compensating mode, receipt, controller, schema, runner, credential helper, or attempt ledger replaces it. The AC4 exact-object/readback edits complete the already-retained one-push contract; they are not compensation for the deleted release/receipt behavior. Spec body lines fell from 258 to 242 while the only new `files_to_modify` entry is the coordinator-only approval record the existing landing contract already required.


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent on `AC4 — Landing authorization record / The single external write`) | AC4 — Landing authorization record / The single external write | accepted — exact object bound before authorization | `65059d49663e3a0cd1f5651ab22021d692d017fe` constructs `M` before approval with fixed nonsecret author/committer metadata and timestamp, then binds literal `M`, tree, ordered parents, message, merge environment/argv, and literal push argv; all identities are revalidated before the one push. |

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | frontmatter files_to_modify; AC4 — Landing authorization record | accepted — propagation completed | `65059d49663e3a0cd1f5651ab22021d692d017fe` lists the dynamic coordinator-only approval-record glob and explicitly forbids builder authorship. |
| 2 | MEDIUM | codex | AC4 — The single external write; Tests | accepted in scope; deeper runner demand rejected | `65059d49663e3a0cd1f5651ab22021d692d017fe` separates authenticated user, repository-metadata, and main-ref reads before/after push and removes unsupported proxy/remote-helper claims. AC4 remains procedural evidence; a committed landing tool, pinned runner, or credential subsystem would recreate removed machinery. |
| 3 | MEDIUM | codex | AC3 — release mode; Tests; Out of Scope | accepted — mechanism dropped | Release grammar, trace, counts, deadlines, fixtures, and release-review wording are deleted. See removal matrix. |
| 4 | MEDIUM | codex | AC3 — source-mode trace; AC6 — tuple seal | accepted — mechanism dropped | The redundant AC6 third reproduction run is deleted. Dual authenticated builds at `M` form the seal; item 137 is the independent tuple consumer. No receipt carrier is added. |
| 5 | MEDIUM | codex | AC6 — migration record | accepted — terminology corrected | The migration record now binds explicit source/artifact authority plus `runtime_authority:false`, `state_authority:false`, and `installed:false`; risk text distinguishes manifest classifications from authority-record fields. |
| 6 | HIGH | codex-ops | AC4 — Single-use authorization and external-write execution | rejected — contradicts founder-locked scope boundary | The locked topology has one persistent coordinator and one active item and explicitly accepts a process-level boundary. An atomic attempt ledger, hardened runner, pinned credential helper, and durable outcome controller would recreate r15–r19 machinery. The spec makes no false claim to detect an adversarial concurrent actor; exact `M`, approval, lease, one invocation, and readback remain mandatory. |
| 7 | HIGH | codex-ops | AC3 source mode and AC6 tuple-reproduction gate | accepted — mechanism dropped | Same root cause as row 4: the receipt/expected-tuple variant is unnecessary after deleting the redundant third reproduction path. See removal matrix. |
| 8 | MEDIUM | codex-ops | AC6 — Post-landing seal failure handling | accepted — existing evidence owner reused | A post-`M` seal failure must be appended, committed, pushed, and read back through the existing item run log before later disposition, binding phase/commands/toolchain/failure and no-auto-retry state. No new failure schema or subsystem is added. |

## Convergence call

needs R21 — focus_hints: verify exact patch `65059d49663e3a0cd1f5651ab22021d692d017fe`: (a) AC3 has one source-only mode with no release grammar/trace/deadline/test residue; (b) AC6 is only dual build + verification + six-field tuple, with item 137 as independent consumer and existing-run-log failure evidence; (c) AC4 constructs and validates literal `M` before approval, binds exact metadata/environment/argv/object, then performs one leased push with separate authenticated user/repository/ref readbacks; (d) no attempt ledger, runner, credential helper, controller, schema, receipt, hosted surface, or orphaned cross-reference was introduced.
