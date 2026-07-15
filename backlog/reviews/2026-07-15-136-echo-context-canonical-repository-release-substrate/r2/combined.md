---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 2
combined_at: '2026-07-15T22:39:33Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: null
claude_response: claude.md
patch_commit_sha: 0f05a7ce05b37e17b1c1d340ec166b7b1869df84
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — 4 actionable codex findings (rows 1–4) all target mechanisms introduced/reshaped by the r1 patch commit ad53c6c7 (dispatch guards, tuple approval, no-clobber/readback, fresh-clone contract); count >= 2, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`, gpt-5.6-sol). Verdict: `propagation_completion` — the findings expose missing edges in load-bearing r1 controls (workflow identity, exact-tuple handoff, safe publication staging, artifact-verification inputs); removing the r1 mechanisms would reopen accepted r1 HIGH findings 1–2, so removal is wrong and the right move is narrow AC3/AC6/Tests completion edits using the existing workflow/jobs/three-asset shape, with no new release asset or generic framework. Diagnostic check applied: traced workflow ref/input/main-HEAD, every tuple field, each publication state, and both fresh-clone modes producer→consumer→test; no mechanism was deletable without replacement while preserving the r1 invariants. Row 5 (claude nit, non-actionable) is excluded from the count and resolved by row 4's mode contract. Investigator risk noted: if GitHub environment/artifact/draft-release semantics cannot support immutable tuple approval or safe draft-stage recovery, the builder stops for founder disposition (the spec's existing hosting-tier stop path covers this) rather than adding prose.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC6 — source-release.yml dispatch and protected-environment trust boundary | accepted — patched (propagation_completion) | 0f05a7ce — AC6 now binds the run to the reviewed workflow definition: fails unless `github.ref` == `refs/heads/main`, `github.sha` == source-SHA input, and both equal the API-re-read canonical main HEAD; source-release environment deployment-branch policy restricted to main, read back and recorded; workflow-policy.test.ts asserts the ref/SHA guards |
| 2 | MEDIUM | codex | AC6 — founder tuple presentation and publish-release inputs | accepted — patched (propagation_completion) | 0f05a7ce — build-artifact fails on any computed-vs-dispatch-input lock/manifest hash mismatch, writes the complete tuple to the run summary + a machine-readable tuple record inside the persisted workflow artifact (workflow-only, not a fourth release asset), and exports every tuple field as job outputs; publish-release downloads by exact artifact ID and revalidates every tuple field against the approved record; static policy assertions added to Tests |
| 3 | MEDIUM | codex | AC6 — publication atomicity and no-clobber behavior | accepted — patched (propagation_completion) | 0f05a7ce — pre-first-write API re-read now includes canonical main HEAD (fails unless approved SHA still == main HEAD); publication staged as unpublished draft: upload + verify all three asset hashes before tag/release becomes visible; same-run cleanup of own draft/partial uploads where API permits; surviving partial state recorded and stops subsequent runs for founder disposition — retries never dead-end behind no-clobber or adopt partial state |
| 4 | MEDIUM | codex | AC3, AC6, and Tests — fresh-clone artifact-verification contract | accepted — patched (propagation_completion) | 0f05a7ce — tools/fresh-clone-acceptance.sh gains an explicit two-mode argument contract with no optional skips: `--mode=source --source-sha <sha>` (builds the artifact locally so verify:artifact always has a defined input) and `--mode=release --source-sha <sha> --version <v> --archive/--checksum/--manifest <paths>` (verifies downloaded assets); missing/extra args fail with usage; AC6 clone invokes `--mode=release` explicitly; Tests run both modes + negative missing-mode/missing-arg/mismatch cases |
| 5 | NIT | claude | AC3 fresh-clone script list ('drives only these named scripts plus git fsck') vs Tests fresh-clone enumeration | accepted — resolved by row 4's patch, no standalone patch | 0f05a7ce — the two-mode contract rewrites the ambiguous sentence as a command-surface whitelist and states `test:operator` is never invoked by either mode, eliminating the residual 'drives ALL of them' reading |

## Convergence call

needs R3 — focus_hints: Verify the r2 patches at 0f05a7ce: (1) AC6 dispatch guard — `github.ref`/`github.sha`/API-re-read main HEAD triple agreement + main-only source-release environment deployment-branch policy with readback; (2) tuple handoff — build-artifact's expected-hash mismatch failure, run-summary + in-artifact machine-readable tuple record (workflow-only, not a fourth asset), tuple-field job outputs, publish-release artifact-ID-bound download + full tuple revalidation; (3) publication staging — pre-first-write main-HEAD recheck, draft-stage upload-verify-then-publish ordering, same-run partial cleanup + surviving-partial-state founder-disposition stop; (4) fresh-clone two-mode argument contract consistent across AC3/AC6/Tests (source mode builds locally, release mode takes archive/checksum/manifest paths, no optional skips, test:operator never invoked); (5) no new mechanism beyond these completions — workflow/job/asset shape unchanged.

