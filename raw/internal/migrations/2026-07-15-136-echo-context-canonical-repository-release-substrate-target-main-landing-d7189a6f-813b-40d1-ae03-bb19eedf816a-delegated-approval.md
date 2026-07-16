# Delegated authorization — land exact reviewed item-136 source on echo-context main (replacement attempt)

Date: 2026-07-16
Approval timestamp: 2026-07-16T20:01:46Z
Approval ID: `d7189a6f-813b-40d1-ae03-bb19eedf816a`
Single-use nonce: `echo-context-136-target-main-landing-d7189a6f-813b-40d1-ae03-bb19eedf816a`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Prior authorization is consumed without a target write

- Prior approval ID / path: `372e5d50-ae1e-43c6-a557-ab874994784c` / `raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-target-main-landing-372e5d50-ae1e-43c6-a557-ab874994784c-delegated-approval.md`.
- Prior approval-containing Project commit: `d6c7baa92c1a0aff9cc96553cfce12671cb804a3` / tree `681a996195ff6f7c82520d6d825e1a7aa7c6ce04`.
- The prior serialized shell used `$M:refs/heads/main`; zsh interpreted `:r` as a parameter modifier and passed malformed local refspec `78bf523e87c8b9986d31ba28fdf987cf6ea66c29efs/heads/main`. Git failed client-side with `src refspec ... does not match any` before sending an update. There was no porcelain update row.
- That prior authorization is treated as consumed and is never retried, edited, adopted, or reused. Read-only authenticated reconciliation then proved repository/user identity unchanged, target `main=B`, feature `H`, and the same two named remote branch refs. No remote target mutation occurred.
- The repair is operational only: this replacement binds fully literal argv tokens and forbids shell-variable or parameter expansion. Literal `M` is preserved; it is not reconstructed or rewritten.

## Authority and exact bindings

- Founder-locked delegation: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, originally landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2` and currently effective with its create-only-ID amendment at `02e4568ff10cade430bc1c39e0e78749ed5ee291`.
- Founder-locked item-136 hosted-gate deferral: `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md`, landed by `4acb3bbebfeefc2d47b1b88cc2c739229c9b6512`.
- Active item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification / ready seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` / `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Project_echo canonical SHA / tree at issuance: `d6c7baa92c1a0aff9cc96553cfce12671cb804a3` / `681a996195ff6f7c82520d6d825e1a7aa7c6ce04`.
- Independent-review record: `raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md`, committed by Project SHA `058eeed26f217e1a4d3f35fc7f2070138b2540a8`, 14,230 bytes, SHA-256 `e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5`, Git blob `e9697f2172cfe0c685085a1faaa4f7958d7a09b8`, verdict `merge_ready`.
- Target baseline `B` / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Reviewed feature `H` / tree: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` / `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Preserved literal merge `M` / tree: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29` / `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Ordered parents: `[0cf7b006eba665c0bf55e82ff04da70f19f01ebb, ad370ae0a666f366e1ff93c9ec5b920763e9cbb8]`.
- Fixed merge message / timestamp: `Merge item 136 echo-context canonical source` / `2026-07-16T19:49:32Z` for both author and committer.
- Fixed author and committer: `ECHO Coordinator <echo-coordinator@users.noreply.github.com>`.
- Package version: `0.1.0-dev.136.1`.
- Product manifest and artifact identities / SHA-256: `not-applicable` for this landing — AC6 creates the final dual-build tuple only after `M` lands. No tag, release, asset, installation, client artifact, or live-state mutation is authorized.
- Destination: private repository `zhenye0616/echo-context`, numeric ID `1302541575`, node ID `R_kgDOTaM1Bw`, default branch `main`, ref `refs/heads/main`; owner login / ID `zhenye0616` / `73834646`.
- Tag-object OID, tag/release/asset names, release ID, and asset IDs: `not-applicable` — no tag, release, or asset operation is authorized.
- Authority boundary after landing: `source_authority:echo-context/main`; source artifact non-installable; `runtime_authority:false`, `state_authority:false`, `installed:false`, maturity `DEV`; Project_echo remains live daemon, state, client-endpoint, and rollback authority.

## Independent evidence and literal merge

- Builder actor / run: `codex-136-cycle3-builder-mendel-222cc09b` / `cycle3-mendel-222cc09b-20260716T184207Z`.
- Reviewer actor / run: `codex-136-final-reviewer-b9e01c42` / `codex-136-final-rereview-20260716T192413Z`; actor and run IDs are nonempty and unequal.
- Exact reviewed Project feature / handoff / review commits: `7f156ba44b3ff17095a55198a7463ede713f81f7` / `3e21634393543f31cfbaae52587191a7c1d534e3` / `058eeed26f217e1a4d3f35fc7f2070138b2540a8`.
- Review gates: AC3 49/49; full CI 1,086 passed / 17 skipped; typecheck; lint; inventory 340/23; authority; operator 2/2; four-ref history scan; two independent canonical-HTTPS acceptances; dual deterministic review builds; fsck; scope audit; exact-tree merge preview. Zero HIGH or MEDIUM remains.
- Retained clone: `/private/tmp/echo-136-target-landing.MlKFEq/clone`, system/global config disabled, controlled local helpers `osxkeychain` and `!/usr/local/bin/gh auth git-credential`, clean status, no alternates, full fsck success.
- Semantic merge argv: `git -c core.hooksPath=/dev/null -c commit.gpgSign=false merge --no-ff --no-edit -m "Merge item 136 echo-context canonical source" ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` under the fixed author/committer environment above.
- Sanitized `git cat-file commit M`: tree `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`; parents `B`, then `H`; author and committer `ECHO Coordinator <echo-coordinator@users.noreply.github.com> 1784231372 +0000`; blank separator; exact merge message. There is no `gpgsig`.
- `M` must never be reconstructed, amended, signed, rebased, or replaced.

## Canonical preflight identity

```json
{"approval_id":"d7189a6f-813b-40d1-ae03-bb19eedf816a","project_main":"d6c7baa92c1a0aff9cc96553cfce12671cb804a3","project_tree":"681a996195ff6f7c82520d6d825e1a7aa7c6ce04","prior_approval_id":"372e5d50-ae1e-43c6-a557-ab874994784c","prior_approval_commit":"d6c7baa92c1a0aff9cc96553cfce12671cb804a3","prior_attempt":"consumed-client-side-malformed-refspec-no-remote-write","reconciled_target_main":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","reconciled_target_feature":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","review_record_commit":"058eeed26f217e1a4d3f35fc7f2070138b2540a8","review_record_sha256":"e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5","review_record_blob":"e9697f2172cfe0c685085a1faaa4f7958d7a09b8","spec":"f80003a7fbd08755dbff669951ed07bf43b390d0","ready_seal":"a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca","user_login":"zhenye0616","user_id":73834646,"target_repo_id":1302541575,"target_repo_node_id":"R_kgDOTaM1Bw","target_private":true,"target_default_branch":"main","target_main":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","target_main_tree":"70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05","target_feature":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","target_feature_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","pull_request_head":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","merge_commit":"78bf523e87c8b9986d31ba28fdf987cf6ea66c29","merge_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","ordered_parents":["0cf7b006eba665c0bf55e82ff04da70f19f01ebb","ad370ae0a666f366e1ff93c9ec5b920763e9cbb8"],"merge_message":"Merge item 136 echo-context canonical source","merge_timestamp":"2026-07-16T19:49:32Z","builder_actor_id":"codex-136-cycle3-builder-mendel-222cc09b","builder_run_id":"cycle3-mendel-222cc09b-20260716T184207Z","reviewer_actor_id":"codex-136-final-reviewer-b9e01c42","reviewer_run_id":"codex-136-final-rereview-20260716T192413Z","verdict":"merge_ready"}
```

SHA-256 over those exact compact bytes with no final newline: `200dd472a9125cceadae39b7991a42476802936966db587c3d72962f39c1165c`.

## Exact execution plan

```json
{"merge_environment":{"GIT_AUTHOR_NAME":"ECHO Coordinator","GIT_AUTHOR_EMAIL":"echo-coordinator@users.noreply.github.com","GIT_COMMITTER_NAME":"ECHO Coordinator","GIT_COMMITTER_EMAIL":"echo-coordinator@users.noreply.github.com","GIT_AUTHOR_DATE":"2026-07-16T19:49:32Z","GIT_COMMITTER_DATE":"2026-07-16T19:49:32Z"},"merge_argv":["git","-c","core.hooksPath=/dev/null","-c","commit.gpgSign=false","merge","--no-ff","--no-edit","-m","Merge item 136 echo-context canonical source","ad370ae0a666f366e1ff93c9ec5b920763e9cbb8"],"credential_config":{"global_disabled":true,"system_disabled":true,"local_helpers":["osxkeychain","!/usr/local/bin/gh auth git-credential"]},"argv_construction":"fully literal tokens; no shell variables or parameter expansion","push_argv":["git","-c","http.followRedirects=false","push","--porcelain","--no-verify","--no-follow-tags","--force-with-lease=refs/heads/main:0cf7b006eba665c0bf55e82ff04da70f19f01ebb","https://github.com/zhenye0616/echo-context.git","78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main"],"expected_rows":1,"expected_ref":"refs/heads/main","expected_update":"fast-forward","single_attempt":true,"retry":false,"adopt":false,"rewrite":false,"cleanup":false}
```

SHA-256 over those exact compact bytes with no final newline: `d2a1542cc70954aac71cc6ae9c1ccc7f5a9833555a3e55e3cef8d6514dd0abea`.

Before the target write, the same coordinator session must read back this replacement authorization's exact containing Project commit and bytes; repeat exact user/repository/main/feature/PR reads; require `main=B`, feature/PR=`H`; and revalidate literal `H` / `M`, ordered parents/tree/message/metadata/timestamp/no-signature, controlled local credential configuration, clean status, fsck, and absence of proxy/rewrite configuration. Any drift invalidates this authorization.

The sole authorized target-write command is copied as fully literal shell text and contains no variable expansion:

```text
/usr/local/Cellar/git/2.37.3/bin/git -c http.followRedirects=false push --porcelain --no-verify --no-follow-tags --force-with-lease=refs/heads/main:0cf7b006eba665c0bf55e82ff04da70f19f01ebb https://github.com/zhenye0616/echo-context.git 78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main
```

Exactly one parsed fast-forward porcelain row for `refs/heads/main` is success, followed by authenticated readback `main=M`. A redirect, missing/additional/malformed row, other ref, rejection, non-fast-forward, ambiguous result, or failed readback consumes this replacement and allows read-only inspection only: no retry, adoption, rewrite, cleanup, feature deletion, or second push.

## Backup, rollback, recovery, and idempotency

- Backup identity: authenticated target `main=B` / tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`; retained clone contains exact `B`, `H`, `M` and full fsck proof.
- Restore proof: immutable review record at `058eeed26f217e1a4d3f35fc7f2070138b2540a8`; `M` is a two-parent child of `B` with tree exactly reviewed `H^{tree}`; read-only reconciliation after the consumed prior attempt returned exact `B` / `H`.
- Rollback state / generation: repository ID `1302541575`, `refs/heads/main=B`. No automatic rollback write is authorized; after an unambiguous fast-forward, `M` is reviewed canonical source. A later rollback requires a new authorization.
- Recovery entry point: retained clone, exact objects `B` / `H` / `M`, prior consumed authorization, this replacement authorization, and the review record. After ambiguity, readback only.
- Single-use and non-resumable once the literal push begins. Before it begins, any bound drift requires another new approval ID; these bytes are never edited.

Execution and readback results, including the consumed prior client-side failure, belong in the separate item-136 migration record. These authorization bytes are immutable after publication to `origin/main`.
