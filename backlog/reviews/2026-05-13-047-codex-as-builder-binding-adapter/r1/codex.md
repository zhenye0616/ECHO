---
item_id: "2026-05-13-047-codex-as-builder-binding-adapter"
round: 1
reviewer: "codex"
artifact_sha: "4cce421586cd05f1d7d31b2e8871886f7c1ef112"
completed_at: "2026-05-14T05:51:42Z"
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC3 line 65; tools/task-state/push-round-state.sh lines 47-56"
    finding: >-
      AC3 says `push-round-state.sh` is suitable as-is for `builder.md`, but the installed helper is hardcoded to `backlog/task-state/${TASK_ID}/round-state.md`: it accepts only `<task-id> <base-blob>`, derives `PATH_REL` with `round-state.md`, requires that path to exist, and commits with a round-state message. A builder following the spec cannot use this helper to write `builder.md`. Patch AC3 to use ordinary builder-owned commits for `builder.md` (my recommendation, because the builder role has a single writer after atomic claim), or explicitly generalize the helper to accept a pointer filename and add tests for the new path.
  - severity: "high"
    where: "frontmatter; skills/process-backlog.md Step D"
    finding: >-
      The spec does not define `files_to_modify`, while the builder protocol still says to touch only files listed there and escalate if another file is needed. This item requires edits/new files under at least `tools/backlog/`, `skills/process-backlog.md`, `.claude/commands/process-backlog.md`, `tests/backlog/`, and `raw/internal/dogfooding/role-typed-state-comparison-047.md`. Add an exhaustive `files_to_modify` list before claim, otherwise a strict builder must either violate the protocol or stop immediately.
  - severity: "medium"
    where: "AC1 line 44 and AC4 line 73"
    finding: >-
      The local builder lock is specified as a file to check/write, but the spec never pins an atomic acquisition primitive. A check-then-write implementation can let two near-simultaneous wrapper invocations both enter the critical section. AC4 only covers a pre-existing lockfile, so it would miss that race. Require an atomic primitive such as `mkdir` on a lock directory, `ln`, or `noclobber` redirection, and add an overlapping-process fixture where the first codex stub sleeps while the second invocation attempts to start.
  - severity: "medium"
    where: "AC4 lines 72-75"
    finding: >-
      The proposed `codex exec` stub can make the item move from ready to pending_review by doing the builder workflow itself, which proves the stub behavior more than the wrapper. Keep the stub, but make the wrapper assertions explicit: record exact `codex exec` argv (`-C`, `--sandbox danger-full-access`, `-`), inherited `ECHO_AGENT_ID`, temp `HOME` for `~/.echo/agent-id`, PATH/log behavior, prompt stdin, and lock visibility while the child runs. If the test keeps the ready-to-pending assertions, label them as proof that the child process receives enough environment to run the protocol, not as wrapper-owned git ops.
---

# Codex Review

Verdict: `pushback`.

The adapter direction is sound, and `codex exec -C ... --sandbox danger-full-access -` matches the installed Codex CLI. The blockers are mechanical: AC3 currently points builders at a helper that cannot write the requested file, and the item omits the file-scope list that the builder protocol still treats as the write gate.

Patch those before claim. While there, tighten the lock acquisition and the mocked-wrapper test so the implementation proves the wrapper contract rather than only proving that a shell stub can perform the workflow.
