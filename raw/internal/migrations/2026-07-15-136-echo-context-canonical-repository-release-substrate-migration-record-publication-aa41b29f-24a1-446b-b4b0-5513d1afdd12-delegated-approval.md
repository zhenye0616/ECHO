# Delegated authorization — publish item-136 canonical repository and source-artifact seal evidence

Date: 2026-07-16
Approval timestamp: 2026-07-16T20:17:09Z
Approval ID: `aa41b29f-24a1-446b-b4b0-5513d1afdd12`
Single-use nonce: `echo-context-136-migration-record-publication-aa41b29f-24a1-446b-b4b0-5513d1afdd12`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Authority and exact bindings

- Founder-locked delegation:
  `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`,
  originally landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2`
  and effective with its create-only-ID amendment at
  `02e4568ff10cade430bc1c39e0e78749ed5ee291`.
- Founder-locked item-136 hosted-gate deferral:
  `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md`,
  landed by `4acb3bbebfeefc2d47b1b88cc2c739229c9b6512`.
- Active item:
  `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification / ready seal:
  `f80003a7fbd08755dbff669951ed07bf43b390d0` /
  `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Project_echo canonical SHA / tree before this authorization:
  `66509501308942e18f00b78dbdc0fec3982c160f` /
  `ad27d982e080c5e4d41fe398f7306b9defc5eba4`.
- echo-context canonical main SHA / tree:
  `78bf523e87c8b9986d31ba28fdf987cf6ea66c29` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Package version: `0.1.0-dev.136.1`.
- Exact publication payload:
  `raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md`,
  16,946 bytes, SHA-256
  `6c17caf511a1ea7712ed2ccc0c98137061475f2004b9f2cb349ff3ba5b05f2c4`,
  Git blob `29660e321815180743553ba3e32de7e818be1f3d`.
- Source manifest typed identity / SHA-256:
  `echo-context-0.1.0-dev.136.1-source.manifest.json` /
  `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`.
- Source archive typed identity / source-archive SHA-256:
  `echo-context-0.1.0-dev.136.1-source.tgz` /
  `3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef`.
- Checksum-sidecar typed identity / file SHA-256:
  `echo-context-0.1.0-dev.136.1-source.tgz.sha256` /
  `6b3cd9a2e3f45cffe1619ca2527f03f92a17b8d6bd428bb05f2d00bd2819e104`.
- Lock hash:
  `13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b`.
- Destination: repository `zhenye0616/ECHO`, numeric ID `1225417447`,
  node ID `R_kgDOSQpi5w`, `private:false`, default branch `main`, ref
  `refs/heads/main`; owner login / ID `zhenye0616` / `73834646`.
- Context target: private repository `zhenye0616/echo-context`, numeric ID
  `1302541575`, node ID `R_kgDOTaM1Bw`, default branch `main`; this
  authorization permits no write to it.
- Tag-object OID, tag/release/asset names, release ID, and asset IDs:
  `not-applicable` — this operation publishes one Markdown evidence record to
  Project main and creates no tag, release, asset, install, or live mutation.
- Authority boundary after publication:
  `source_authority:echo-context/main`,
  `artifact_authority:versioned-source-artifact`,
  `runtime_authority:false`, `state_authority:false`, `installed:false`,
  maturity `DEV`. Project_echo remains installed runtime and live-state
  authority.

## Independent review and seal evidence

- Implementation-review record:
  `raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md`,
  Project commit `058eeed26f217e1a4d3f35fc7f2070138b2540a8`, verdict
  `merge_ready`, zero HIGH and zero MEDIUM findings.
- Builder actor / run:
  `codex-136-cycle3-builder-mendel-222cc09b` /
  `cycle3-mendel-222cc09b-20260716T184207Z`.
- Reviewer actor / run:
  `codex-136-final-reviewer-b9e01c42` /
  `codex-136-final-rereview-20260716T192413Z`.
- Actor and run IDs are nonempty and independently unequal.
- Reviewed feature `H` / tree:
  `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` /
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Replacement landing approval ID / Project commit:
  `d7189a6f-813b-40d1-ae03-bb19eedf816a` /
  `66509501308942e18f00b78dbdc0fec3982c160f`.
- The authorized target push produced exactly one fast-forward main row and
  authenticated readback `main=78bf523e87c8b9986d31ba28fdf987cf6ea66c29`.
- Two AC6 builds from a fresh no-local clone at that exact main used separate
  mode-0700 HOME/TMP/cache/output roots. All three emitted file pairs were
  byte-identical. Both committed-verifier invocations exited zero.
- Independent read-only output audit: PASS at the exact tuple and empty clone
  porcelain.
- Exact six-field tuple:
  - source SHA: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`
  - source tree: `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`
  - version: `0.1.0-dev.136.1`
  - source-archive SHA-256:
    `3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef`
  - lock hash:
    `13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b`
  - manifest hash:
    `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`
- The exact migration-record draft received a separate read-only audit at the
  byte identity above: PASS with all AC4/AC6 literals, commands, classifications,
  bootstrap lineage, and prohibited-scope boundaries matched.

## Canonical preflight identity

```json
{"approval_id":"aa41b29f-24a1-446b-b4b0-5513d1afdd12","spec":"f80003a7fbd08755dbff669951ed07bf43b390d0","ready_seal":"a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca","project_main":"66509501308942e18f00b78dbdc0fec3982c160f","project_tree":"ad27d982e080c5e4d41fe398f7306b9defc5eba4","project_repo_id":1225417447,"project_repo_node_id":"R_kgDOSQpi5w","project_private":false,"record_path":"raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md","record_path_absent":true,"record_bytes":16946,"record_sha256":"6c17caf511a1ea7712ed2ccc0c98137061475f2004b9f2cb349ff3ba5b05f2c4","record_blob":"29660e321815180743553ba3e32de7e818be1f3d","target_repo_id":1302541575,"target_repo_node_id":"R_kgDOTaM1Bw","target_private":true,"target_main":"78bf523e87c8b9986d31ba28fdf987cf6ea66c29","target_main_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","baseline":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","baseline_tree":"70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05","reviewed_feature":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","review_record_commit":"058eeed26f217e1a4d3f35fc7f2070138b2540a8","landing_approval_id":"d7189a6f-813b-40d1-ae03-bb19eedf816a","landing_approval_commit":"66509501308942e18f00b78dbdc0fec3982c160f","builder_actor_id":"codex-136-cycle3-builder-mendel-222cc09b","builder_run_id":"cycle3-mendel-222cc09b-20260716T184207Z","reviewer_actor_id":"codex-136-final-reviewer-b9e01c42","reviewer_run_id":"codex-136-final-rereview-20260716T192413Z","verdict":"merge_ready","version":"0.1.0-dev.136.1","source_archive_sha256":"3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef","lock_hash":"13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b","manifest_hash":"6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01","checksum_sidecar_file_sha256":"6b3cd9a2e3f45cffe1619ca2527f03f92a17b8d6bd428bb05f2d00bd2819e104","source_authority":"echo-context/main","artifact_authority":"versioned-source-artifact","runtime_authority":false,"state_authority":false,"installed":false,"maturity":"DEV","user_login":"zhenye0616","user_id":73834646}
```

SHA-256 over those exact compact bytes with no final newline:
`48f838875d74cad6c4a1740c28c05b4172949db3adf24cf95091b44c2ff4983a`.

Immediately before publication, authenticated readback must still prove exact
user and Project/target repository identities. Project `origin/main` must equal
`A`, defined below; target main must remain exact `M`; the destination record
path must be absent from `A`; and the untracked payload must still match the
authorized length, SHA-256, and blob. Any drift invalidates this authorization.

## Exact execution plan

This authorization's containing commit cannot name itself. After this file is
committed, pushed, and read back from Project `origin/main`, that exact commit
is `A`. It is invalid unless `A` has exactly one parent, adds only this
authorization path, and still contains no migration-record path.

```json
{"authorized_parent":"A=the authorization-record containing commit read back from origin/main","publication_commit":"P=one child of A containing only the exact migration record path","record_path":"raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md","record_bytes":16946,"record_sha256":"6c17caf511a1ea7712ed2ccc0c98137061475f2004b9f2cb349ff3ba5b05f2c4","record_blob":"29660e321815180743553ba3e32de7e818be1f3d","changed_paths":["raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md"],"commit_message":"evidence: seal item 136 canonical source artifact","commit_timestamp":"2026-07-16T20:20:00Z","author_name":"ECHO Coordinator","author_email":"echo-coordinator@users.noreply.github.com","commit_argv":["git","-c","core.hooksPath=/dev/null","-c","commit.gpgSign=false","commit","-m","evidence: seal item 136 canonical source artifact"],"push_argv":["git","-c","http.followRedirects=false","-c","credential.helper=","-c","credential.helper=!/usr/local/bin/gh auth git-credential","push","--porcelain","--no-verify","--no-follow-tags","--force-with-lease=refs/heads/main:A","https://github.com/zhenye0616/ECHO.git","P:refs/heads/main"],"expected_rows":1,"expected_ref":"refs/heads/main","expected_update":"fast-forward","single_attempt":true,"retry":false,"adopt":false,"rewrite":false,"cleanup":false}
```

SHA-256 over those exact compact bytes with no final newline:
`03cdaa9b7410fe4cebfc59562951cc6d267b0656b925c2610222b47f87bd6a8c`.

After authorization readback, the same serialized, config-isolated clone must
be at exact `A`. The index is cleared and the only untracked program path is the
authorized migration record. The coordinator stages only that record, proving
the staged changed-path set is exact. The fixed nonsecret commit environment is:

```text
GIT_AUTHOR_NAME=ECHO Coordinator
GIT_AUTHOR_EMAIL=echo-coordinator@users.noreply.github.com
GIT_COMMITTER_NAME=ECHO Coordinator
GIT_COMMITTER_EMAIL=echo-coordinator@users.noreply.github.com
GIT_AUTHOR_DATE=2026-07-16T20:20:00Z
GIT_COMMITTER_DATE=2026-07-16T20:20:00Z
```

With hooks and signing disabled, the coordinator runs the bound commit argv and
defines the resulting literal commit as `P`. Before push, it requires sole
parent `[A]`; changed path exactly the authorized record; exact byte count,
SHA-256, and blob; fixed message/metadata; no `gpgsig`; clean status; and
`git fsck --full --strict` success. It then substitutes literal `A` and `P`
into the bound push argv and invokes it exactly once.

Exactly one parsed fast-forward porcelain row for `refs/heads/main` is success.
Authenticated readback must prove Project main exact `P`, identical repository
identity, exact record bytes/blob/length, and no other changed path. A redirect,
rejection, missing/additional/malformed row, other ref, ambiguous transport
result, failed readback, or any identity/byte drift consumes this authorization
and permits read-only inspection only: `retry:false`, `adopt:false`,
`rewrite:false`, no second push, no force-update, and no cleanup mutation.

## Backup, rollback, recovery, and idempotency

- Pre-authorization backup: Project main
  `66509501308942e18f00b78dbdc0fec3982c160f`, tree
  `ad27d982e080c5e4d41fe398f7306b9defc5eba4`; migration-record path absent.
- Operation backup: exact authorization commit `A` after authenticated readback.
  `A` contains this immutable authorization and no migration record.
- Restore proof: `A` plus absence of the migration-record path and the frozen
  16,946-byte payload identities above.
- Rollback artifact/state/generation: evidence-only Project generation `A`;
  target `main=M` remains canonical and unchanged. No automatic revert, target
  write, release, installation, or live-state mutation is authorized.
- Recovery entry point: exact `A`, this authorization, the frozen payload, and
  authenticated Project/target readbacks. After ambiguity, readback only.
- Single-use and non-resumable once the literal push starts. Before it starts,
  bound drift requires a new approval ID rather than an edit.

The later completion move must set `project_landed_sha=P`, cannot edit this
record or the migration record, and requires its own fresh one-use
authorization before its Project-main push. These authorization bytes are
immutable after publication to `origin/main`.
