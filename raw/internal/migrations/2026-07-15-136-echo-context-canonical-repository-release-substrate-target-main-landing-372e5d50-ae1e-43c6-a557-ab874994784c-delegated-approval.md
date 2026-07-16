# Delegated authorization — land exact reviewed item-136 source on echo-context main

Date: 2026-07-16
Approval timestamp: 2026-07-16T19:51:49Z
Approval ID: `372e5d50-ae1e-43c6-a557-ab874994784c`
Single-use nonce: `echo-context-136-target-main-landing-372e5d50-ae1e-43c6-a557-ab874994784c`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Authority and exact bindings

- Founder-locked delegation: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, originally landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2` and currently effective with its create-only-ID amendment at `02e4568ff10cade430bc1c39e0e78749ed5ee291`.
- Founder-locked item-136 hosted-gate deferral: `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md`, landed by `4acb3bbebfeefc2d47b1b88cc2c739229c9b6512`.
- Active item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification / ready seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` / `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Project_echo canonical SHA / tree at issuance: `058eeed26f217e1a4d3f35fc7f2070138b2540a8` / `86456d8249d495dffd6c1f974da61ae4de60c927`.
- Independent-review record: `raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md`, committed and pushed by Project SHA `058eeed26f217e1a4d3f35fc7f2070138b2540a8`, 14,230 bytes, SHA-256 `e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5`, Git blob `e9697f2172cfe0c685085a1faaa4f7958d7a09b8`, verdict `merge_ready`.
- Target baseline `B` / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Reviewed feature `H` / tree: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` / `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Preconstructed literal merge `M` / tree: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29` / `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Ordered parents: `[0cf7b006eba665c0bf55e82ff04da70f19f01ebb, ad370ae0a666f366e1ff93c9ec5b920763e9cbb8]`.
- Fixed merge message: `Merge item 136 echo-context canonical source`.
- Fixed merge timestamp: `2026-07-16T19:49:32Z` for both author and committer.
- Package version: `0.1.0-dev.136.1`.
- Product manifest and artifact identities / SHA-256: `not-applicable` for this landing operation — the reviewed specification requires the final dual-build AC6 tuple to be created only from landed `M`. This authorization creates no tag, release, asset, installation, or client artifact.
- Destination: private repository `zhenye0616/echo-context`, numeric ID `1302541575`, node ID `R_kgDOTaM1Bw`, default branch `main`, ref `refs/heads/main`.
- Owner login / ID: `zhenye0616` / `73834646`.
- Tag-object OID, tag/release/asset names, release ID, and asset IDs: `not-applicable` — no tag, release, or asset operation is authorized.
- Authority boundary after landing: `source_authority:echo-context/main`; source artifact remains non-installable; `runtime_authority:false`, `state_authority:false`, `installed:false`, maturity `DEV`; Project_echo remains live daemon, state, client-endpoint, and rollback authority.

## Independent builder and review evidence

- Builder actor / run: `codex-136-cycle3-builder-mendel-222cc09b` / `cycle3-mendel-222cc09b-20260716T184207Z`.
- Reviewer actor / run: `codex-136-final-reviewer-b9e01c42` / `codex-136-final-rereview-20260716T192413Z`.
- The actor and run IDs are independently recomputed as nonempty and unequal from the immutable review record.
- Exact reviewed heads: target `H` above; Project feature evidence `7f156ba44b3ff17095a55198a7463ede713f81f7`; Project pending-review handoff `3e21634393543f31cfbaae52587191a7c1d534e3`; review-record commit `058eeed26f217e1a4d3f35fc7f2070138b2540a8`.
- Gate evidence: focused AC3 49/49; full CI 1,086 passed / 17 skipped; typecheck; lint; inventory 340 packages / 23 sources; authority; operator replay 2/2; four-ref exhaustive history scan; two independent canonical-HTTPS no-local/no-hardlinks reviewer acceptances; dual deterministic review builds; fsck; source/hosted-scope audit; and conflict-free merge preview with tree exactly `H^{tree}`.
- No HIGH or MEDIUM finding remains. No Project feature merge is approved or needed.

## Literal merge object

The coordinator created `M` once in the retained config-isolated clone `/private/tmp/echo-136-target-landing.MlKFEq/clone`. System/global Git config was disabled, hooks and signing were disabled, the literal canonical remote was used, `B` was checked out detached, and `B` was proved an ancestor of exact remote feature `H`. The exact nonsecret merge environment was:

```text
GIT_AUTHOR_NAME=ECHO Coordinator
GIT_AUTHOR_EMAIL=echo-coordinator@users.noreply.github.com
GIT_COMMITTER_NAME=ECHO Coordinator
GIT_COMMITTER_EMAIL=echo-coordinator@users.noreply.github.com
GIT_AUTHOR_DATE=2026-07-16T19:49:32Z
GIT_COMMITTER_DATE=2026-07-16T19:49:32Z
```

Semantic merge argv was:

```text
git -c core.hooksPath=/dev/null -c commit.gpgSign=false merge --no-ff --no-edit -m "Merge item 136 echo-context canonical source" ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
```

Sanitized `git cat-file commit M` evidence is:

```text
tree 3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec
parent 0cf7b006eba665c0bf55e82ff04da70f19f01ebb
parent ad370ae0a666f366e1ff93c9ec5b920763e9cbb8
author ECHO Coordinator <echo-coordinator@users.noreply.github.com> 1784231372 +0000
committer ECHO Coordinator <echo-coordinator@users.noreply.github.com> 1784231372 +0000

Merge item 136 echo-context canonical source
```

The exact object has no `gpgsig`, its ordered parents/tree/message/author/committer/timestamp are exact, and the retained clone is clean with `git fsck --full` success. `M` must never be reconstructed, amended, signed, rebased, or replaced.

## Canonical preflight identity

The canonical compact preflight object is:

```json
{"approval_id":"372e5d50-ae1e-43c6-a557-ab874994784c","project_main":"058eeed26f217e1a4d3f35fc7f2070138b2540a8","project_tree":"86456d8249d495dffd6c1f974da61ae4de60c927","review_record_commit":"058eeed26f217e1a4d3f35fc7f2070138b2540a8","review_record_sha256":"e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5","review_record_blob":"e9697f2172cfe0c685085a1faaa4f7958d7a09b8","spec":"f80003a7fbd08755dbff669951ed07bf43b390d0","ready_seal":"a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca","user_login":"zhenye0616","user_id":73834646,"target_repo_id":1302541575,"target_repo_node_id":"R_kgDOTaM1Bw","target_private":true,"target_default_branch":"main","target_main":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","target_main_tree":"70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05","target_feature":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","target_feature_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","pull_request_head":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","merge_commit":"78bf523e87c8b9986d31ba28fdf987cf6ea66c29","merge_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","ordered_parents":["0cf7b006eba665c0bf55e82ff04da70f19f01ebb","ad370ae0a666f366e1ff93c9ec5b920763e9cbb8"],"merge_message":"Merge item 136 echo-context canonical source","merge_timestamp":"2026-07-16T19:49:32Z","builder_actor_id":"codex-136-cycle3-builder-mendel-222cc09b","builder_run_id":"cycle3-mendel-222cc09b-20260716T184207Z","reviewer_actor_id":"codex-136-final-reviewer-b9e01c42","reviewer_run_id":"codex-136-final-rereview-20260716T192413Z","verdict":"merge_ready"}
```

Its SHA-256 over exactly those compact bytes with no final newline is `484ab5bb43c47d4fec6aaf87415f4621c78a564eeee135c029ddb368096d9bde`.

## Exact execution plan

The canonical compact execution-plan object is:

```json
{"merge_environment":{"GIT_AUTHOR_NAME":"ECHO Coordinator","GIT_AUTHOR_EMAIL":"echo-coordinator@users.noreply.github.com","GIT_COMMITTER_NAME":"ECHO Coordinator","GIT_COMMITTER_EMAIL":"echo-coordinator@users.noreply.github.com","GIT_AUTHOR_DATE":"2026-07-16T19:49:32Z","GIT_COMMITTER_DATE":"2026-07-16T19:49:32Z"},"merge_argv":["git","-c","core.hooksPath=/dev/null","-c","commit.gpgSign=false","merge","--no-ff","--no-edit","-m","Merge item 136 echo-context canonical source","ad370ae0a666f366e1ff93c9ec5b920763e9cbb8"],"credential_config":{"global_disabled":true,"system_disabled":true,"local_helpers":["osxkeychain","!/usr/local/bin/gh auth git-credential"]},"push_argv":["git","-c","http.followRedirects=false","push","--porcelain","--no-verify","--no-follow-tags","--force-with-lease=refs/heads/main:0cf7b006eba665c0bf55e82ff04da70f19f01ebb","https://github.com/zhenye0616/echo-context.git","78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main"],"expected_rows":1,"expected_ref":"refs/heads/main","expected_update":"fast-forward","single_attempt":true,"retry":false,"adopt":false,"rewrite":false,"cleanup":false}
```

Its SHA-256 over exactly those compact bytes with no final newline is `8996e5e85c977a06faa6759eb9c47ee9f59e2599a1489ee741d60ee8722c8f6d`.

Before the target write, the same serialized coordinator session must read back this authorization's exact containing Project commit and bytes, then repeat authenticated `GET /user`, repository, and main-ref reads. They must return the exact owner / IDs / private visibility / default branch and `main=B`; the target feature and pull-request head must still equal `H`. The retained clone must revalidate literal `H`, `M`, ordered parents, tree, message, author/committer metadata, timestamp, absence of signature, controlled local credential-helper configuration, clean status, and fsck. Any drift invalidates this authorization.

The one authorized target write has fully literal semantic argv:

```text
git -c http.followRedirects=false push --porcelain --no-verify --no-follow-tags --force-with-lease=refs/heads/main:0cf7b006eba665c0bf55e82ff04da70f19f01ebb https://github.com/zhenye0616/echo-context.git 78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main
```

Exactly one structurally parsed fast-forward porcelain row for `refs/heads/main` is success. Authenticated post-readback must repeat the exact user/repository identity and prove `main=M`. A redirect, other ref, missing/additional/malformed row, rejection, non-fast-forward, lost or ambiguous response, or failed readback consumes this authorization and permits read-only inspection only: `retry:false`, `adopt:false`, `rewrite:false`, no second push, no remote cleanup, and no feature-branch deletion.

## Backup, rollback, and recovery

- Backup identity: canonical target main `B` / tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`, still authenticated at issuance; retained clone contains exact `B`, `H`, and literal `M` with full fsck success.
- Restore-proof identity: the immutable independent-review record at Project commit `058eeed26f217e1a4d3f35fc7f2070138b2540a8`, the exact `M` commit object above, and the proof that `M` is a two-parent child of `B` whose tree equals reviewed `H^{tree}`.
- Rollback artifact/state/generation: pre-write target generation is repository ID `1302541575`, `refs/heads/main=B`. No automatic rollback write is authorized; after an unambiguous successful fast-forward, `M` is the reviewed canonical source. Any later rollback needs a new immutable authorization.
- Recovery entry point: retained config-isolated clone `/private/tmp/echo-136-target-landing.MlKFEq/clone`, exact objects `B` / `H` / `M`, this authorization, and the independent-review record. After an ambiguous push outcome, authenticated readback only; no retry, adoption, rewrite, deletion, or cleanup.
- Resumability / idempotency: single-use and non-resumable once the push starts. Before the push starts, any bound drift makes this record stale and requires a new approval ID rather than an edit.

Execution and authenticated readback results belong in the separate item-136 migration record. These authorization bytes are immutable after publication to `origin/main`.
