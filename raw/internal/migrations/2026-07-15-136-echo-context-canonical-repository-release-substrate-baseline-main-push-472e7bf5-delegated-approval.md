# Delegated authorization — publish the exact echo-context baseline as initial main

Date: 2026-07-16
Approval timestamp: 2026-07-16T08:44:22Z
Approval ID: `472e7bf5-553a-4e6e-b160-63ab300f1c1b`
Single-use nonce: `echo-context-136-baseline-main-push-472e7bf5-553a-4e6e-b160-63ab300f1c1b`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Authority and exact bindings

- Founder-locked delegation: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2`.
- Active item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification commit / ready content seal: `f130ba6fd89bd598a06e7603b700fb0f66c6dd54` / `42d2d266660453fc204b6cd3ddaed3b41768c410e1e007ebca9465e60022833e`.
- Project_echo canonical SHA / tree at issuance: `e1ec8f74ae812e5df0983cd11a9a0827a9aefb67` / `b810080a7ae225638b8b91dc417decd4d0ef2822`.
- echo-context exact source SHA / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Baseline package version: `0.0.0` (source identity only; no release is authorized).
- Manifest and artifact identities / SHA-256: `not-applicable` — this operation publishes the already-reviewed Git commit only and creates no source artifact, tag, release, installation, or live mutation.
- Destination: private repository `zhenye0616/echo-context`, numeric ID `1302541575`, node ID `R_kgDOTaM1Bw`, ref `refs/heads/main`.
- Tag-object OID, release ID, asset IDs, and deterministic release/asset names: `not-applicable` — no tag, release, or asset operation is authorized.
- Authority boundary after the operation: `authority:false`, `installed:false`; Project_echo remains the live context authority.

## Creation and pre-push evidence

- Repository creation authorization: `raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-repository-create-6a2e8326-delegated-approval.md`, published by Project_echo commit `e1ec8f74ae812e5df0983cd11a9a0827a9aefb67`.
- The authorized create call returned direct HTTP 201 at `2026-07-16T08:43:51Z` with request ID `EF10:1722F:13EC350:144B8EA:6A5899C5`, repository ID `1302541575`, node ID `R_kgDOTaM1Bw`, owner login / ID `zhenye0616` / `73834646`, `private:true`, and default branch name `main`.
- Authenticated ID-addressed readback returned HTTP 200 with the identical IDs, owner/name, private visibility, default branch, and zero repository size.
- Authenticated branches readback returned HTTP 200 and the fully paginated empty set. Authenticated exhaustive `git ls-remote` returned exit 0 and zero refs.
- The canonical compact preflight object is `{"branches_api":"fully-paginated-empty","default_branch":"main","git_ls_remote_ref_count":0,"owner_id":73834646,"owner_login":"zhenye0616","private":true,"repository_id":1302541575,"repository_node_id":"R_kgDOTaM1Bw","repository_readback_status":200,"repository_size":0}`. Its SHA-256 over exactly those compact bytes with no final newline is `24cb71ae5ff5b9ed7261965a2787863c3d269afb8aa5b623e62072462624d2c9`.
- The byte-frozen secret-scan contract remains 946 bytes at SHA-256 `b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453`. The pre-publication gitleaks `8.30.1` full-history scan used the official Darwin x64 binary SHA-256 `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291` and passed at the exact baseline with zero findings.

## Builder and review evidence

- Fresh item-136 builder: `codex-builder-136-20260716` (`/root/build_136`). The builder prepared and verified this bootstrap but is not authorized to execute either main push.
- Frozen-baseline builder / independent reviewer: `codex-builder-135` / `codex-ops` (`/root/fresh_review_135_r2`), with approval bound in `raw/internal/migrations/2026-07-13-135-echo-context-review.md` to the exact SHA/tree above.
- Item-136 specification reviewers: `codex` and `codex-ops`, both `proceed` with zero findings at exact spec SHA `f130ba6fd89bd598a06e7603b700fb0f66c6dd54`; combined artifact `backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r14/combined.md`.
- The fresh item-136 implementation reviewer and reviewed successor heads do not yet exist because the reviewed protocol requires this exact-baseline bootstrap first. They remain mandatory before implementation merge.

## Exact execution plan

The canonical compact execution-plan object is:

```json
{"baseline_sha":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","expected_porcelain_flag":"*","local_branch_after":"main","local_branch_before":"migration/2026-07-13-135","push_argv":["git","push","--porcelain","--force-with-lease=refs/heads/main:","origin","0cf7b006eba665c0bf55e82ff04da70f19f01ebb:refs/heads/main"],"remote_name":"origin","remote_url":"https://github.com/zhenye0616/echo-context.git","repository_id":1302541575,"repository_node_id":"R_kgDOTaM1Bw","single_attempt":true}
```

Its SHA-256 over exactly those compact bytes with no final newline is `370d86c2179b2cc348a837a6c0f609e0241ae6507e76fa67fafabab52e8a9c6c`.

Immediately before the push, the operator must reverify the exact local SHA/tree, cleanliness, sole local ref, frozen contract hash, repository IDs/owner/name/private visibility, fully paginated empty branches, and exhaustive zero-ref `git ls-remote`. The local migration branch is then renamed to `main` without rewriting the commit, remote `origin` is added with the bound URL, and the exact push command is issued once. Only porcelain flag `*` for a newly created ref is success. A rejection, up-to-date result, lost or ambiguous response, or any pre-existing ref consumes this authorization and permits no retry, adoption, or cleanup.

## Backup, rollback, and recovery

- Backup identity: untouched local baseline `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`; all-object/reachable-object list SHA-256 `d92d3f614807907ac694e7c163dbba190c2f1fbef8198ab32c5b1f23abc6c1ee`; tracked/filesystem path-list SHA-256 `cb0516ae7a7b638925fee349464d74cccf5ab1c1ca3c03bc97701d72896ea64b`.
- Restore-proof identity: `raw/internal/migrations/2026-07-13-135-echo-context-review.md`, which independently approved the exact baseline and clean object closure.
- Rollback state / generation: pre-push destination generation is repository ID `1302541575` with zero refs; local recovery source is the exact baseline object database and old ref target. This operation does not authorize remote ref deletion, repository deletion, cleanup, or history rewrite.
- Recovery entry point: after an unambiguous created-ref result, authenticated readback must prove the same repository IDs/private owner/name/default branch and `refs/heads/main` exactly `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`. After any ambiguous outcome, only read-only reconciliation is permitted; no retry or adoption. Any successor mutation needs a fresh authorization or the reviewed feature-branch lane as applicable.
- The current account tier's inability to enforce the later private-repository protection remains a hard gate before protected implementation landing or release. It is not weakened by this exact-baseline bootstrap.

This authorization's use and readback results belong in the separate item-136 migration/evidence record. These bytes are immutable after publication to `origin/main`.
