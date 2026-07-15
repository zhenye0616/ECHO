---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 3
combined_at: '2026-07-15T22:56:32Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: null
claude_response: claude.md
patch_commit_sha: 9997f07362d9fa7849c4069642019c536657ff77
next_round: 4
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — all 4 actionable codex findings target mechanisms the r2 patch commit 0f05a7ce added (in-artifact tuple record, publication staging/cleanup, two-mode fresh-clone contract, tuple/hash field contract); count >= 2, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`, gpt-5.6-sol). Verdict: `propagation_completion` — the r2 mechanisms are load-bearing r1 controls (the r2 gate already established removal would reopen accepted r1 HIGH findings); the r3 findings expose unpropagated edges, not removable scaffolding: the platform assigns a workflow-artifact ID only after upload (inner record can't contain it), the command surface omitted npm ci and the direct builder invocation, same-run cleanup can't survive cancellation/runner loss and same-name rejection can't stop other-version runs, and "artifact SHA-256" was ambiguous with no defined producer for the dispatch-input expected hashes. Diagnostic check applied: traced every tuple field, hash, mode, and partial state producer → carrier → approver/consumer → negative/restart test; the artifact ID/digest arise only post-upload (hence the inner/outer split), interruption after every external write is detected by a later different-version run via the cross-version preflight, and expected hashes are reproducible from the landed SHA without violating release-path build-once (AC5 determinism makes the local verification computation byte-equal). Investigator risk noted: if GitHub artifact/approval/draft-release/API semantics cannot support stable outer-tuple validation or cross-run orphan detection, the spec's existing hosting-tier stop path routes to founder disposition rather than structural redesign by prose; claude's r3 zero-finding proceed is consistent (its lens verified r2-disposition fidelity, not platform-order feasibility).

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC6 — tuple handoff | accepted — patched (propagation_completion) | 9997f073 — approval tuple split into two layers: pre-upload seven-field inner tuple record (source SHA, tree, version, source-archive SHA-256, lock hash, manifest hash, run ID) persisted inside the workflow artifact; post-upload outer fields (workflow artifact ID, workflow-artifact digest) captured to run summary + job outputs; founder approves the combined nine-field tuple; publish-release downloads by exact artifact ID, verifies the digest, and revalidates every inner+outer field; still exactly three release assets |
| 2 | MEDIUM | codex | AC3 — fresh-clone command and argument contract | accepted — patched (propagation_completion) | 9997f073 — command surface now exactly `npm ci` + named package.json scripts + `git fsck --full`, no other executable; builder invocation named as `build:artifact` script with exact `--source-sha/--out` interface, version derived from package.json at the source SHA, gitignored output dir; `verify:artifact` argument interface defined; unknown/missing/duplicate/wrong-mode arguments fail with usage; release mode never builds; Tests bullet gains the negative grammar cases + test:operator non-invocation assertion |
| 3 | MEDIUM | codex | AC6 — publication staging and surviving partial state | accepted — patched (propagation_completion) | 9997f073 — concurrency group made explicitly non-cancelling (queued, never cancel-in-progress); publish-release records run-owned identifiers (draft ID, asset IDs, tag name) at creation time; pre-first-write preflight now lists ALL tags/releases/assets and stops for founder disposition on any release-namespace state of any version not attributed to a completed prior release in the migration record — orphaned state from cancellation/runner loss is caught by the next run, not by same-run cleanup promises |
| 4 | MEDIUM | codex | AC6 and Tests — hash-field and dispatch-input contract | accepted — patched (propagation_completion) | 9997f073 — distinct hash vocabulary defined in AC5 (source-archive SHA-256 = .sha256 sidecar binding; manifest hash = canonical-JSON bytes; lock hash = package-lock blob at source SHA; workflow-artifact digest = uploaded CI artifact) and propagated through AC6/handoff/migration-record/Tests; dispatch-input expected-hash producer named (dispatching founder/operator, exact commands recorded: git cat-file blob + shasum for lock, local build:artifact + manifest hash via AC5 determinism); workflow-policy tests gain wrong-expected-lock-hash and wrong-expected-manifest-hash failure fixtures |

## Convergence call

needs R4 — focus_hints: Verify the r3 patches at 9997f073: (1) inner/outer tuple layering — pre-upload seven-field inner record inside the workflow artifact, post-upload artifact-ID + workflow-artifact-digest capture as run-summary fields and job outputs, founder approval over the nine-field combined tuple, publish-release digest-verified artifact-ID-bound download + full inner/outer revalidation, still exactly three release assets; (2) AC3 command surface — exactly npm ci + named scripts (incl. new build:artifact with --source-sha/--out and package.json version derivation) + git fsck --full, unknown/missing/duplicate/wrong-mode argument failures, release mode never builds, test:operator never invoked; (3) publication staging — non-cancelling concurrency, run-owned identifier logging at creation time, cross-version partial-state preflight stopping for founder disposition, same-run cleanup retained as best-effort only; (4) hash naming — source-archive SHA-256 / manifest hash / lock hash / workflow-artifact digest used distinctly and consistently across AC5/AC6/handoff/Tests, dispatch-input expected-hash producers + exact commands defined without violating release-path build-once, wrong expected lock/manifest hash negative fixtures; (5) no new mechanism beyond these completions — workflow/job/asset shape unchanged, the only new named surface is the build:artifact npm script wrapping the existing AC5 builder.

