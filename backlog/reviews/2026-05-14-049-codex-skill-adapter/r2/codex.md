---
item_id: "2026-05-14-049-codex-skill-adapter"
round: 2
reviewer: "codex"
artifact_sha: "2a132696dd6a27c4920bc052e1e2389592848416"
completed_at: "2026-05-14T20:01:41Z"
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC2 lines 81-87 - codex fan-out temp files and cleanup"
    finding: >-
      The proposed per-child files are keyed only by item id (`$TMPDIR/echo-review-pending-<item-id>.stdout/.stderr/.rc`) and the cleanup trap removes the broad glob `$TMPDIR/echo-review-pending-*`. That is not operationally safe under overlapping `/review-pending` runs: two orchestrators reviewing the same item can overwrite each other's stdout/rc files, and either orchestrator's EXIT trap can delete the other's still-running child outputs. Patch the contract to allocate a per-run temp directory with `mktemp -d` (or a UUID/PID-scoped prefix), put every child file under that run-scoped path, and trap only that directory/prefix.
  - severity: "medium"
    where: "AC2 lines 82-85 - codex child sandbox/worktree safety"
    finding: >-
      The spec requires each child to run `codex exec --sandbox workspace-write -C <repo> -` and justifies it by saying workspace-write is needed for the orchestrator's final sidecar write. That rationale does not match the installed Codex CLI contract: the child sandbox controls model-generated commands inside that child, while the parent/orchestrator can collect stdout and write sidecars independently. The installed CLI also supports `--sandbox read-only`. As written, every parallel child gets write access to the production checkout and relies only on prompt discipline to avoid edits. Change the child invocation to read-only, or explicitly justify workspace-write for test execution and add a concrete mutation guard/failure path before sidecar emission.
  - severity: "medium"
    where: "AC4 lines 121-124 and AC3 lines 103-111 - install conflict semantics"
    finding: >-
      AC4 prescribes `ln -snf` for symlink mode while also requiring the installer to preserve any non-ECHO-managed existing skill path. `ln -snf` will overwrite an unrelated symlink at `~/.codex/skills/<name>`, and the AC3 conflict test only covers a pre-existing regular directory. Tighten the installer contract so it probes the target before any `ln`/`rm -rf`, treats every existing path that is not the expected ECHO symlink or a `.echo-managed` copy as a conflict, and add tests for at least a non-matching symlink and regular file as well as the directory case.
---

# Codex Review R2

Verdict: `proceed_after_patches`.

The narrowed adapter scope and YAML-safe frontmatter requirement are implementable, and the two-skill materialization rule avoids exposing Claude-coupled skills to Codex prematurely. The remaining issues are all mechanical safety gaps in the codex binding notes and installer contract: temp files need run-scoped isolation, child Codex processes should not get production-checkout write access without a real guard, and install conflict handling needs to cover non-managed symlinks/files before using forceful link/copy commands.

Patch those before handing 049 to a builder.
