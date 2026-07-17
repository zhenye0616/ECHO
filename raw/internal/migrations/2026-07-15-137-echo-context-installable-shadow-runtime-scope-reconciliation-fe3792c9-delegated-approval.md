# Delegated operation authorization — item 137 two-pass scope reconciliation (replacement)

Status: authorized, unused
Authorized at: 2026-07-17T20:41:37Z
Coordinator: persistent Codex program coordinator
Approval ID: fe3792c9-6d58-408a-b75f-eea5f2a8703d
Single-use nonce: fe3792c9-6d58-408a-b75f-eea5f2a8703d

## Authority

- Delegation decision: `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`
- Delegation landed commit: `02e4568ff10cade430bc1c39e0e78749ed5ee291`
- Active item: `2026-07-15-137-echo-context-installable-shadow-runtime`
- Exact reviewed specification SHA: `e6ee720f09d72db7694ac25ff1a1d1cdd4cdbc5a`
- Ready-content seal: not-applicable — the proposal stopped at R8 and was never promoted
- Independent review evidence: `backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/r8/{codex.md,codex-ops.md,combined.md}`
- Reviewer verdict: divergent; six recurring families; founder escalation

The founder's 2026-07-17 direction to proceed in full-auto mode with the
coordinator's two-pass approach resolves that escalation. This authorization
permits only the coordination-repository scope reconciliation described below.
It does not authorize target-source mutation, build, installation, service
mutation, or live-path access.

The earlier authorization ending in `2fca855f` is permanently unusable because
it named `zhenye0616/Project_echo`, while authenticated remote readback proved
the coordination repository is `zhenye0616/ECHO`. It was never used for the
scope-reconciliation push and may not be amended or reused.

## Bound identities

- Project_echo source SHA: `041f339f5fb3304ad0e350e1d4cd43b73c92acb3`
- Project_echo source tree: `a23afcfef42927a7d1ccb012ec02bb42dff32719`
- echo-context canonical target SHA: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`
- echo-context canonical target tree: `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`
- Version: `0.1.0-dev.136.1` predecessor; no new runtime version is produced
- Manifest identity: item-136 source manifest
- Manifest SHA-256: `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01`
- Artifacts: not-applicable — this is a coordination-only repository operation
- Repository owner/name: `zhenye0616/ECHO`
- Destination ref: `refs/heads/main`
- Existing platform repository ID: not bound by the current local evidence; the
  authenticated remote URL and exact canonical ref readback are mandatory
- Tag/release/asset identities: not-applicable — no publication occurs

## Exact operation

Push one non-force descendant commit to `zhenye0616/ECHO`
`refs/heads/main` whose program changes are limited to:

1. preserve all existing item-137 R1–R8 review artifacts byte-for-byte;
2. cancel the terminal non-convergent item 137 into `backlog/complete/`;
3. record the founder-locked two-pass decomposition;
4. create proposed item 137a for a disposable candidate-only runtime;
5. create proposed item 137b for a later real shadow installation, blocked by
   completed 137a evidence;
6. make item 138 depend on and reference 137b;
7. reconcile affected operating instructions, task-state pointers, follow-up
   lines, generated command adapters, and `docs/BACKLOG.md`.

No implementation bytes, external-repository bytes, real user paths, release
artifacts, services, or authority state may change.

## Plan, preflight, recovery

- Execution-plan identity: `project-echo-scope-reconciliation-v2`
- Execution-plan SHA-256: `097379c6dfac1581cba479de5979c2c48c7a44da1b46cb31471676a988ac448c`
- Preflight: require origin/main at the bound Project_echo SHA; require
  echo-context canonical main at the bound predecessor; lint both new
  strategist pointers; regenerate the backlog index; run skill-sync check and
  `git diff --check`; inspect the exact changed-path set.
- Execution: commit only the enumerated coordination changes; push
  `HEAD:refs/heads/main` without force; read back the canonical SHA, tree, and
  changed-path set.
- Backup identity: canonical Project_echo commit
  `041f339f5fb3304ad0e350e1d4cd43b73c92acb3`; Git history is the byte-exact,
  immutable pre-operation backup.
- Backup hash: the bound source tree
  `a23afcfef42927a7d1ccb012ec02bb42dff32719`.
- Restore proof: `git cat-file -e` must resolve both bound source commit and
  tree before execution; any later correction is a separately reviewed,
  additive revert commit, never a force push.
- Rollback state/generation: not-applicable — no runtime or service state is
  mutated.
- Recovery entry point: compare `git ls-remote origin refs/heads/main` with
  the locally created commit; on ambiguity, stop and reconcile the remote ref
  before any retry.
- Resumability/idempotency: single non-force push; if the remote already equals
  the created commit, treat it as completed after readback; any other remote
  value blocks.
- Fail-closed response: stop on any source identity, validation, changed-path,
  push, or readback mismatch. Never amend or reuse this authorization.
