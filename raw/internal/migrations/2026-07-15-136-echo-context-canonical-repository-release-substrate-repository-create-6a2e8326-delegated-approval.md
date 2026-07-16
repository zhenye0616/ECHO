# Delegated authorization — create the empty private echo-context repository

Date: 2026-07-16
Approval timestamp: 2026-07-16T08:41:44Z
Approval ID: `6a2e8326-3213-45cb-856a-56a2952ab125`
Single-use nonce: `echo-context-136-repository-create-6a2e8326-3213-45cb-856a-56a2952ab125`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Authority and scope

- Founder-locked delegation: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2`.
- Active item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification commit: `f130ba6fd89bd598a06e7603b700fb0f66c6dd54`.
- Ready content seal: `42d2d266660453fc204b6cd3ddaed3b41768c410e1e007ebca9465e60022833e`.
- Exact intended operation: make exactly one authenticated `POST /user/repos` call that requests an empty private repository named `echo-context` for the authenticated personal account `zhenye0616`. This authorization covers repository creation only. It does not authorize an initial Git push, implementation merge, tag, release, artifact publication, installation, service mutation, migration, client rewiring, or authority transfer.
- Authority boundary after the operation: `authority:false`, `installed:false`; Project_echo remains the live context authority.

## Immutable source and target bindings

- Project_echo canonical SHA / tree at issuance: `02e4568ff10cade430bc1c39e0e78749ed5ee291` / `78f7a3be036d6aaa27f83f879449b163554cc413`.
- Project_echo canonical remote readback: `origin/main=02e4568ff10cade430bc1c39e0e78749ed5ee291`.
- echo-context frozen baseline SHA / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Baseline package version: `0.0.0` (observed identity only; this operation is not a release).
- Manifest identity / SHA-256: `not-applicable` — an empty-repository creation neither consumes nor publishes the future deterministic source manifest.
- Artifact identities / SHA-256: `not-applicable` — this operation creates no artifact and publishes no bytes.
- Deterministic destination: owner `zhenye0616`, repository `echo-context`, visibility `private`, `auto_init:false`, no README, license, or gitignore template.
- Repository numeric ID / node ID: `pending allocation by this operation`; neither value is guessed or adopted from a later name lookup.
- Tag-object OID, release ID, asset IDs, tag name, release name, and asset names: `not-applicable` — no tag, release, or asset operation is authorized.

## Builder, review, and staged scan evidence

- Fresh item-136 builder: `codex-builder-136-20260716` (`/root/build_136`); implementation target head does not yet exist because the locked bootstrap must precede the successor branch.
- Frozen-baseline builder / independent reviewer: `codex-builder-135` / `codex-ops` (`/root/fresh_review_135_r2`). The independent approval at `raw/internal/migrations/2026-07-13-135-echo-context-review.md` binds target `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05` with verdict `APPROVE — merge as-is` and keeps `authority:false`, `installed:false`.
- Item-136 specification reviewers: `codex` and `codex-ops`; both returned `proceed` with zero findings on exact specification SHA `f130ba6fd89bd598a06e7603b700fb0f66c6dd54`. Combined convergence artifact: `backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r14/combined.md`.
- A separate item-136 implementation reviewer is intentionally not yet assigned: this operation creates only the empty destination required before implementation and carries no successor byte. A fresh independent implementation review remains mandatory before any implementation merge.
- Byte-frozen future target contract: `/tmp/echo-context-136-secret-scan-contract.json`, 946 bytes, SHA-256 `b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453`. The path is staging provenance, not durable authority; the digest is durable. The successor branch must commit byte-identical content at `tools/secret-scan-contract.json`, and any digest drift invalidates this authorization lineage.
- Focused independent sequencing adjudication: AC4 and the R8 disposition make the pre-publication scan's binding migration evidence, while the locked bootstrap forbids successor bytes in the initial push. Exact staged bytes are therefore permitted only if the later committed file has the identical recorded digest; post-hoc prose equivalence is forbidden.
- Scanner: gitleaks `8.30.1`; executed Darwin x64 binary SHA-256 `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`. The frozen contract also binds Darwin arm64, Linux arm64, and Linux x64 binary digests.
- Scan interval / invocation: `2026-07-16T08:39:25Z`–`2026-07-16T08:39:26Z`; `gitleaks detect --source . --log-opts=--all --redact=100 --no-banner --no-color --report-format json --report-path <temporary-report>` from the clean target.
- Scan coverage / result: sole ref `refs/heads/migration/2026-07-13-135=0cf7b006eba665c0bf55e82ff04da70f19f01ebb`, 35 reachable commits, non-shallow, full fsck pass, 190 tracked paths, exit `0`, zero findings, empty sanitized path/rule list.

## Preflight and exact execution plan

The canonical compact preflight object is:

```json
{"account_id":73834646,"account_login":"zhenye0616","account_status":200,"baseline_head":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","baseline_tree":"70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05","contract_sha256":"b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453","fsck_full":"pass","gitleaks_binary_sha256":"cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291","gitleaks_version":"8.30.1","name_lookup_status":404,"owned_repository_listing_match_count":0,"remote_count":0,"scan_exit":0,"scan_findings":0,"scan_finished_utc":"2026-07-16T08:39:26Z","scan_started_utc":"2026-07-16T08:39:25Z","sole_ref":"refs/heads/migration/2026-07-13-135=0cf7b006eba665c0bf55e82ff04da70f19f01ebb","tracked_paths":190}
```

Its SHA-256, over exactly the compact bytes above with no final newline, is `7586d2ff5461bf33e99c11ea3aca6502354be9b5bb0663f20a3e1026f1f790f4`.

The canonical compact execution-plan object is:

```json
{"api_version":"2022-11-28","body":{"auto_init":false,"name":"echo-context","private":true},"expected_status":201,"method":"POST","owner":"zhenye0616","path":"/user/repos","single_attempt":true}
```

Its SHA-256, over exactly the compact bytes above with no final newline, is `d6ab57346a8f9b329b4384649eb7403aec3b5682714fcfc1791db5dee90e70e7`.

Immediately before the write, authenticated `GET /user` must still return HTTP 200 with login `zhenye0616` and account ID `73834646`, and authenticated `GET /repos/zhenye0616/echo-context` must still be negative. The negative lookup never establishes durable absence. The operator then issues the exact plan once with no transport retry. Only a direct HTTP 201 response is success. Any redirect, other status, transport error, lost response, or ambiguous response consumes this authorization and permits zero push.

## Backup, rollback, and recovery

- Pre-operation destination state: `{"owner":"zhenye0616","repository":"echo-context","repository_id":null,"repository_node_id":null,"verified_name_lookup_status":404,"verified_owned_listing_match_count":0}`; SHA-256 `79cc1450e572e00e8b172c7ca667cf91e36f00bf5a5977495fb6817d91d5bbdf` over those exact compact bytes with no final newline.
- Backup identity: the untouched local echo-context object database at baseline `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`, all-object/reachable-object list SHA-256 `d92d3f614807907ac694e7c163dbba190c2f1fbef8198ab32c5b1f23abc6c1ee`, tracked/filesystem path-list SHA-256 `cb0516ae7a7b638925fee349464d74cccf5ab1c1ca3c03bc97701d72896ea64b`.
- Restore-proof identity: `raw/internal/migrations/2026-07-13-135-echo-context-review.md`; its approved target is the exact baseline above and its migration-record SHA-256 is `eed83d4ad6d6706a3b2b1a454716f4344016481ba6108257b9f46f9055b0cc28`.
- Rollback state / generation: the hashed pre-operation destination state above plus the untouched local baseline. Repository deletion, cleanup, adoption, or retry is not authorized and is not an automatic rollback.
- Recovery entry point: on an unambiguous HTTP 201, capture the response's numeric repository ID and node ID, then authenticate and read back those exact IDs, owner/name, private visibility, and an exhaustively empty ref namespace. On any ambiguity, perform read-only reconciliation only, make zero push, and issue no retry or cleanup. Any later operation requires a fresh single-use authorization bound to the captured IDs.
- Current GitHub tier cannot yet enforce the reviewed private-repository protection and protected-environment controls. This does not alter the empty-create contract, but it is a hard unresolved gate before protected implementation landing or release; this authorization neither waives nor weakens it.
- The required distinct PR-author/approver identities are likewise a later landing gate, not permission to bypass review. They must be established and evidenced before protected merge.

This authorization's use and all authenticated readback results belong in the separate item-136 migration/evidence record. These bytes are immutable after publication to `origin/main`.
