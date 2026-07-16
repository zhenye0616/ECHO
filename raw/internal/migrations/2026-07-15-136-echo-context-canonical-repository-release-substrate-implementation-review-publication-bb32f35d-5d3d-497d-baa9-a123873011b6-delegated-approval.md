# Delegated authorization — publish item-136 independent implementation review

Date: 2026-07-16
Approval timestamp: 2026-07-16T19:42:43Z
Approval ID: `bb32f35d-5d3d-497d-baa9-a123873011b6`
Single-use nonce: `echo-context-136-implementation-review-publication-bb32f35d-5d3d-497d-baa9-a123873011b6`
Coordinator: persistent Codex program coordinator (`/root`)
Status at issuance: authorized once; unused

## Authority and exact bindings

- Founder-locked delegation: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, originally landed by `9b84631edc7f266684d1c40c6ecaab747cde57b2` and currently effective with its create-only-ID amendment at `02e4568ff10cade430bc1c39e0e78749ed5ee291`.
- Founder-locked item-136 hosted-gate deferral: `raw/internal/decisions/2026-07-16-136-defer-github-hosted-gates.md`, landed by `4acb3bbebfeefc2d47b1b88cc2c739229c9b6512`.
- Active item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`.
- Exact reviewed specification / ready seal: `f80003a7fbd08755dbff669951ed07bf43b390d0` / `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`.
- Project_echo canonical SHA / tree before this authorization: `3e21634393543f31cfbaae52587191a7c1d534e3` / `66692a5cef1a5d7bee3424faae07423698a13973`.
- Project evidence feature SHA / tree: `7f156ba44b3ff17095a55198a7463ede713f81f7` / `6b23ee3310c3714c1292d9dbcfa80a1c1b03e119`; the independent review concluded that this divergent coordination branch must not be merged because canonical main already contains the complete Run-3 evidence.
- echo-context canonical main SHA / tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Exact reviewed echo-context feature SHA / tree: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8` / `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`.
- Package version: `0.1.0-dev.136.1`.
- Exact publication payload: `raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md`, 14,230 bytes, SHA-256 `e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5`, Git blob OID `e9697f2172cfe0c685085a1faaa4f7958d7a09b8`.
- Product manifest and product artifact identities / SHA-256: `not-applicable` — this operation publishes one reviewer-owned Markdown evidence record only. It creates no source archive, manifest, tag, release, asset, installation, migration, or live-state mutation.
- Destination: repository `zhenye0616/ECHO`, numeric ID `1225417447`, node ID `R_kgDOSQpi5w`, `private:false`, default branch `main`, ref `refs/heads/main`.
- Context target: private repository `zhenye0616/echo-context`, numeric ID `1302541575`, node ID `R_kgDOTaM1Bw`, default branch `main`; this authorization permits no write to it.
- Repository owner login / ID: `zhenye0616` / `73834646`.
- Tag-object OID, tag/release/asset names, release ID, and asset IDs: `not-applicable` — no tag, release, or asset operation is authorized.
- Authority boundary after publication: source candidate remains unlanded; `runtime_authority:false`, `state_authority:false`, `installed:false`, maturity `DEV`; Project_echo remains active daemon, live-state, client-endpoint, and rollback authority.

## Independent review evidence

- Builder actor / run: `codex-136-cycle3-builder-mendel-222cc09b` / `cycle3-mendel-222cc09b-20260716T184207Z`.
- Reviewer actor / run: `codex-136-final-reviewer-b9e01c42` / `codex-136-final-rereview-20260716T192413Z`.
- The actor IDs and run IDs are each nonempty and unequal. Canonical evidence is the pending-review item and run log at Project main `3e21634393543f31cfbaae52587191a7c1d534e3`.
- Verdict: exact string `merge_ready`; zero HIGH and zero MEDIUM findings.
- Reviewer record draft source: `/private/tmp/echo136-c3-review-record.HKPCG6/2026-07-15-136-echo-context-implementation-review.md`. The temporary path is not authority; only the exact byte count, SHA-256, blob OID, and destination path above are authorized.
- Review gates bound by the payload: focused AC3 49/49; full CI 1,086 passed / 17 skipped; typecheck; lint; inventory 340 packages / 23 sources; repository authority; operator replay 2/2; four-ref exhaustive history scan; two independent canonical-HTTPS no-local/no-hardlinks acceptances; dual deterministic review builds; fsck; exact identity readbacks; source/hosted-scope audit; and a conflict-free target merge preview yielding exact reviewed tree.
- All three prior formal AC3 findings are closed at the reviewed head: terminal-proof completion time, monotonic production deadline accounting, and per-call synchronous-filesystem deadline checks with immediate owned-root recording.

## Canonical preflight identity

The canonical compact preflight object is:

```json
{"approval_id":"bb32f35d-5d3d-497d-baa9-a123873011b6","spec":"f80003a7fbd08755dbff669951ed07bf43b390d0","ready_seal":"a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca","project_main":"3e21634393543f31cfbaae52587191a7c1d534e3","project_tree":"66692a5cef1a5d7bee3424faae07423698a13973","project_repo_id":1225417447,"project_repo_node_id":"R_kgDOSQpi5w","project_private":false,"review_path_absent":true,"review_record_bytes":14230,"review_record_sha256":"e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5","review_record_blob":"e9697f2172cfe0c685085a1faaa4f7958d7a09b8","target_main":"0cf7b006eba665c0bf55e82ff04da70f19f01ebb","target_main_tree":"70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05","target_feature":"ad370ae0a666f366e1ff93c9ec5b920763e9cbb8","target_feature_tree":"3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec","target_repo_id":1302541575,"target_repo_node_id":"R_kgDOTaM1Bw","target_private":true,"user_login":"zhenye0616","user_id":73834646,"builder_actor_id":"codex-136-cycle3-builder-mendel-222cc09b","builder_run_id":"cycle3-mendel-222cc09b-20260716T184207Z","reviewer_actor_id":"codex-136-final-reviewer-b9e01c42","reviewer_run_id":"codex-136-final-rereview-20260716T192413Z","verdict":"merge_ready"}
```

Its SHA-256 over exactly those compact bytes with no final newline is `48557a7e86ae0d34d8982ef3424d13426b86cdafe745c6660176b53de75e5555`.

Immediately before the authorized review-record publication, authenticated readback must still prove exact user login / ID, Project repository ID / node / owner / visibility / default branch, and target repository ID / node / owner / private visibility / default branch. Project `origin/main` must equal `A`, defined below; target main must remain the exact baseline and target feature must remain exact reviewed `H`. The exact review payload must still match the authorized length, SHA-256, and blob OID. Any drift invalidates this authorization.

## Exact execution plan

This authorization's containing commit cannot name itself. After this file is committed, pushed, and read back from Project `origin/main`, that exact containing commit is defined as `A`. `A` becomes the immutable expected parent and force-with-lease value for the review-record commit. The authorization is invalid unless `A` has exactly one parent, contains this exact authorization path, and still has no review-record path.

The canonical compact execution-plan object is:

```json
{"authorized_parent":"A=the authorization-record containing commit read back from origin/main","review_commit":"R=one child of A containing only the exact review record path","record_path":"raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md","record_sha256":"e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5","record_blob":"e9697f2172cfe0c685085a1faaa4f7958d7a09b8","commit_message":"review: item 136 implementation merge readiness","commit_timestamp":"2026-07-16T19:45:00Z","author_name":"ECHO Independent Reviewer","author_email":"echo-reviewer@users.noreply.github.com","commit_argv":["git","-c","core.hooksPath=/dev/null","-c","commit.gpgSign=false","commit","-m","review: item 136 implementation merge readiness"],"push_argv":["git","-c","http.followRedirects=false","-c","credential.helper=osxkeychain","push","--porcelain","--no-verify","--no-follow-tags","--force-with-lease=refs/heads/main:A","https://github.com/zhenye0616/ECHO.git","R:refs/heads/main"],"single_attempt":true,"retry":false,"adopt":false,"rewrite":false}
```

Its SHA-256 over exactly those compact bytes with no final newline is `97b2e47cab05095753ba742052b61cd3b1019e19e8abe614fbff385659ed05fe`.

The reviewer must create a new config-isolated clone at exact `A`, prove a clean tree and `git fsck --full`, recreate the authorized review path with byte-identical content, and prove that it is the only changed path. The exact nonsecret commit environment is:

```text
GIT_AUTHOR_NAME=ECHO Independent Reviewer
GIT_AUTHOR_EMAIL=echo-reviewer@users.noreply.github.com
GIT_COMMITTER_NAME=ECHO Independent Reviewer
GIT_COMMITTER_EMAIL=echo-reviewer@users.noreply.github.com
GIT_AUTHOR_DATE=2026-07-16T19:45:00Z
GIT_COMMITTER_DATE=2026-07-16T19:45:00Z
```

With hooks disabled and signing disabled, the reviewer runs the bound commit argv. Let the resulting commit be `R`. Before any push, require: ordered parent exactly `[A]`; changed path exactly the authorized record path; record blob and byte SHA-256 exact; fixed message and metadata exact; no `gpgsig`; clean status; and `git fsck --full` success. The reviewer then substitutes literal `A` and `R` into the bound push argv and invokes it exactly once.

Only one structurally parsed fast-forward porcelain row for `refs/heads/main` is success. Authenticated post-readback must prove Project main exact `R`, identical repository identity, exact record blob / SHA-256 / length, and no other changed path. A redirect, rejection, other/missing/additional/malformed row, ambiguous transport result, failed readback, or any identity/byte drift consumes this authorization and permits read-only inspection only: `retry:false`, `adopt:false`, `rewrite:false`, no second push, no force-update, and no cleanup mutation.

## Backup, rollback, and recovery

- Pre-authorization backup identity: Project main `3e21634393543f31cfbaae52587191a7c1d534e3` / tree `66692a5cef1a5d7bee3424faae07423698a13973`; the review-record path is absent and the repository is clean. The authorization publication adds only this create-only record.
- Operation backup identity: exact authorization commit `A` after its authenticated readback. `A` contains the immutable authorization and no review record; it is the sole parent of `R` and the exact lease value.
- Restore-proof identity: exact `A` tree plus `git ls-tree A -- raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md` returning no entry, and the byte-frozen reviewer payload hashes above. The reviewed target candidate and both remote refs remain unchanged by this Project-only operation.
- Rollback artifact/state/generation: product artifact fields are `not-applicable`; the relevant generation is Project main at `A`. This authorization does not authorize reverting, deleting, amending, or replacing either record. If the pre-push checks fail, `A` remains the recovery state and no review commit is published.
- Recovery entry point: exact `A`, the immutable authorization path, and the byte-frozen reviewer payload. After an unambiguous successful push, `R` is append-only evidence and later operations bind its exact commit. After any ambiguous outcome, only authenticated readback is permitted; no retry or adoption.
- Resumability / idempotency: single-use and non-resumable after the push starts. Before the push starts, any bound drift makes this record stale and requires a new approval ID rather than an edit.

This authorization's use and readback result are recorded by the exact review-record commit identity consumed by the later target-main landing authorization. These bytes are immutable after publication to `origin/main`.
