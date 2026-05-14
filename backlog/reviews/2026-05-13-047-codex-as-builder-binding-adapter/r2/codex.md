---
item_id: "2026-05-13-047-codex-as-builder-binding-adapter"
round: 2
reviewer: "codex"
artifact_sha: "966ef059e71dd6ac5a6d29bb7f1d7c6575ed53f8"
completed_at: "2026-05-14T06:00:47Z"
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 lines 62-70; tools/review-queue/_run_reviewer.sh set -euo shape"
    finding: >-
      The lock-info snippet writes `echo "$ITEM_ID @ ..." > "$LOCK_DIR/info"`, but the wrapper does not know an item id before it invokes `codex exec`; item selection happens inside `skills/process-backlog.md` after the child starts. Because AC1 also says to match `_run_reviewer.sh`'s shell shape, an implementation with `set -euo pipefail` will abort on the unbound `ITEM_ID` immediately after acquiring the lock and before launching Codex. Patch the snippet/AC to record wrapper-known metadata instead, e.g. `codex-builder @ <ts> by $$ agent=$ECHO_AGENT_ID`, or explicitly define a wrapper-level item-selection step if that is intended.
  - severity: "low"
    where: "AC4 lines 118-122"
    finding: >-
      The overlapping-invocation test is buildable, but the spec should make the synchronization point explicit: start the slow first wrapper, then poll until `.git/echo-builder-in-progress.d` (or the stub's first-action marker) exists before running the second wrapper. Without that gate, a Vitest `spawn`/`spawnSync` implementation can race the first process's `mkdir` and occasionally let the second invocation acquire the lock first on a loaded machine.
  - severity: "low"
    where: "Definition of Done line 167 vs. AC4 lines 105-122"
    finding: >-
      AC4 now defines three integration-test cases, but the Definition of Done still says `tests/backlog/run-codex-builder.test.ts` has `2 cases green`. Update the DoD to three cases so merge verification matches the acceptance criteria the builder is supposed to implement.
---

# Codex Review R2

Verdict: `proceed_after_patches`.

R1's main structural issues are resolved: `builder.md` direct commits fit the single-owner builder pointer model, the `files_to_modify` list is sufficient for the implementation surface, and the wrapper-vs-stub test partition is pointed at the right contract. The remaining blocker is mechanical in the AC1 lock snippet: `$ITEM_ID` is not available in the shell wrapper before `codex exec` starts.

Patch that lock-info line before implementation. While editing, tighten the AC4 test wording so the overlapping-process test waits for lock acquisition deterministically, and fix the DoD count from two to three test cases.
