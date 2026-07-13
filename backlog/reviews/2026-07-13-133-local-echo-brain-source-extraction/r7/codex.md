---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 7
reviewer: "codex"
artifact_sha: "a4a4e1255143c8338bcfcfa123c0f59d5d7b1582"
completed_at: '2026-07-13T23:24:47Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 and AC7 — gated process identity and discard"
    finding: "The persisted PID/PGID/start identity/executable contract does not define whether the gate runner execs the command or remains as its supervisor. An exec changes the executable and can make live work appear quiescent; a killed group leader can also leave unregistered children while AC7 requires discard to refuse. Prescribe a concrete macOS process topology and precise start-identity primitive, keep a non-execing identified supervisor or register every executable before work, require group/session quiescence that remains safe under PID/PGID reuse, and test exec transition, leader SIGKILL, surviving children, and reuse. Add any required identity helper to files_to_modify."
  - severity: "high"
    where: "AC1 — claim election, whole-claim discard, and target publication"
    finding: "Each RENAME_EXCL crosses parent directories, but the spec fsyncs only an unspecified parent, the archive parent, or the destination parent. It also lets read-only status declare durable PUBLISHED after a crash between target rename and destination-parent fsync, when neither success nor error was recorded. Require the moved directory and both source and destination parents to be fsynced in an explicit order for election, discard, and publication; define a mutating exact-run recovery transition for the rename-to-fsync ambiguity while status reports recovery-required; and add failpoints at every rename and parent-fsync boundary."
  - severity: "high"
    where: "AC1 — publish-record post-publication CAS"
    finding: "The record is placed before update-ref, but only the exact-child post-CAS index window is explicitly recoverable. A crash after record placement or commit-tree and before CAS leaves the base ref plus the exact uncommitted record, which can be rejected as worktree drift. The index is not locked until after CAS, so normalization can also overwrite a concurrent index update. Specify atomic temp-write/file-fsync/rename/directory-fsync placement and an exhaustive state machine accepting base-plus-clean, base-plus-exact-record pre-CAS, and exact-child-plus-stale-index post-CAS under an extraction-owned worktree lease and index lock; revalidate ref and index immediately before CAS and test every crash window plus a concurrent index writer."
  - severity: "medium"
    where: "AC1 — bound control inputs"
    finding: "Opening and hashing the helper and sandbox profile once does not guarantee that their later executions consume those bytes, because Python and sandbox-exec normally reopen paths. Require all helper, profile, and gate-runner uses to execute or materialize only the already-bound committed bytes into claim-owned no-follow files, verify identity at use, and test replacement of each source path after preflight."
  - severity: "medium"
    where: "AC1, AC5, and AC7 — standalone Git repository construction"
    finding: "The spec does not define the candidate branch, init/commit commands, or configuration isolation. Git can otherwise consume operator global/system config, templates, hooks, signing settings, default-branch policy, and identity, contradicting hostile-environment isolation and leaving final Git identity non-falsifiable. Specify the exact branch/ref and sanitized Git environment, disable system/global config, templates, hooks, and signing, bind author/committer identity, apply equivalent isolation to record plumbing, and add hostile config/template/hook tests."
---
