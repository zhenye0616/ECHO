---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 8
combined_at: '2026-07-16T04:55:14Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: 9
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — this round's actionable set (2 codex findings + a founder-verified strategist audit incorporated at disposition, items 1 and 3–6) targets mechanisms introduced or reshaped by prior `spec-r*-patches` commits: the draft-staged write sequence and `target_commitish` semantics (r5 3d74d33b, r6 d309cdeb), the two-mode fresh-clone argument contract (r2 0f05a7ce) plus `--expected-manifest-hash` and source-mode self-derivation (r7 92a03132), the environment-policy readback and workflow-artifact download (r6/r7), and the secret-scan contract binding (r7). Non-mechanical, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`). Verdict: `propagation_completion` — each finding is a missing producer→carrier→consumer→observable→fixture link on a retained load-bearing control, not removable scaffolding; cutting the release/inventory/approval/scan controls would reopen accepted invariants, and the one true ordering defect (draft-before-tag, impossible because GitHub mints a missing tag at release creation/publication) is a state-machine correction, not a mechanism to drop. Diagnostic check applied: AC6 now resolves exactly as empty namespace → push+verify annotated tag → create draft without mutating the tag → upload three assets → publish → fully paginated exact-set readback; no stale draft-first path or unused argument remains. Investigator preferred removing release-mode `--source-sha`/`--version` but flagged the risk that they are independently approved values — they are (operator-transcribed from the founder-approved tuple), so per the audit's first option they are retained with an explicit three-way cross-check (approved record vs authenticated manifest vs checkout/package identity) and wrong-value fixtures; this override is recorded here. Patch commit: 822e6bf50e7aa21de5bdc8aafa1baebe08b1060b (`spec-r8-patches`).

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | Frontmatter files_to_modify; AC2; AC3 | accepted — patched | 822e6bf5: regenerated inventory is the successor file provenance/runtime-inventory.v2.json (committed generator over the successor tree's closure); runtime-inventory.v1.json stays byte-identical as frozen item-135 evidence; `verify:inventory`, its generator, and current-inventory tests bind to v2; governance test asserts v1 byte identity + v2 validity; frontmatter/spec_refs comments and AC3 validation target updated |
| 2 | MEDIUM | codex | AC3 release-mode argument contract; Tests | accepted — patched | 822e6bf5: release-mode `--source-sha`/`--version` retained as founder-approved-tuple transcriptions and made non-ignorable via three-way cross-check after manifest authentication (must equal the authenticated manifest's source commit/version AND the checked-out clone HEAD/package.json version); wrong-source and wrong-version fixtures added to the fresh-clone negative tests |
| 3 | HIGH | strategist-audit | AC6 write sequence; lost-response + release-identity fixtures | accepted — patched | 822e6bf5: draft-before-annotated-tag ordering was impossible (GitHub creates a missing tag at release creation/publication, so draft-first can never prove tag provenance); sequence reordered to push+verify annotated tag (ref → tag object → peeled approved source SHA + exact annotation) → create draft referencing the existing tag (`target_commitish` never source authority) → readback proving the draft did not replace/retarget/mutate the tag → upload exactly three assets → publish with `make_latest: "false"` → final fully paginated exact-set readback; ambiguity semantics updated (lone tag / tag+draft partial states fail-stop, founder cleanup, re-entry only via fresh empty-namespace dispatch); lost-response and release-identity fixtures reordered accordingly. Refs: https://cli.github.com/manual/gh_release_create , https://docs.github.com/en/rest/releases/releases |
| 4 | MEDIUM | strategist-audit | AC3 source-mode expected-hash carrier | accepted — patched | 822e6bf5: `build:artifact` emits the built manifest's canonical-JSON SHA-256 as the machine-readable final stdout line `manifest_hash=<hex>` (mapped to a `manifest_hash` job output in workflows); source-mode acceptance consumes exactly that carrier as `--expected-manifest-hash`; carrier + tampered-value fixtures added |
| 5 | MEDIUM | strategist-audit | AC6 environment main-only verification | accepted — patched | 822e6bf5: verify-hosting-controls pin made exact — `deployment_branch_policy.protected_branches` false, `custom_branch_policies` true, fully paginated branch-policy set exactly the single literal `main`; wildcard/extra-entry/truncated-page fixtures added |
| 6 | MEDIUM | strategist-audit | AC6 workflow-artifact identity | accepted — patched | 822e6bf5: deterministic workflow-artifact name `echo-context-<version>-release` and ZIP archive format defined; workflow-artifact digest defined as SHA-256 of the raw un-extracted ZIP bytes from the exact-artifact-ID endpoint; publish-release name check and fixtures pinned to the exact name |
| 7 | MEDIUM | strategist-audit | AC1/AC4 secret-scan output + bootstrap binding | accepted — patched | 822e6bf5: non-disclosure fixture added (injected known fake secret literal never appears in scan stdout/stderr); bootstrap-scan relation rephrased as migration-evidence verification (recorded contract-file SHA-256 must equal committed tools/secret-scan-contract.json digest) while tests prove the committed script and hosted job enforce the shared contract |

## Convergence call

needs R9 — focus_hints: verify the r8 correction patches: tag-before-draft AC6 write sequence (annotated tag pushed and verified — ref → tag object → peeled approved source SHA + exact annotation — before any draft; draft references the existing tag with `target_commitish` never source authority; draft readback proves the tag was not replaced/retargeted/mutated; lone-tag and tag-plus-draft ambiguity fail-stop with founder cleanup and fresh empty-namespace re-entry; lost-response/release-identity fixtures reordered); successor provenance/runtime-inventory.v2.json with immutable v1 bytes and v2-bound generator/verifier/tests; release-mode `--source-sha`/`--version` three-way cross-check (approved tuple vs authenticated manifest vs checkout/package identity) with wrong-value fixtures; `build:artifact` machine-readable `manifest_hash=<hex>` stdout/job-output carrier consumed by source-mode acceptance; exact main-only environment policy pin (`protected_branches` false, `custom_branch_policies` true, fully paginated set exactly {main}); deterministic `echo-context-<version>-release` ZIP workflow-artifact identity; secret-literal non-disclosure fixture and bootstrap binding as migration evidence; Tests bullet alignment for all of the above.

