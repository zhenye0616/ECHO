---
item_id: 2026-05-14-049-codex-skill-adapter
round: 5
reviewer: codex
artifact_sha: 55d2b1707039cad96dd38712cea45c9a66e27219
completed_at: '2026-05-14T20:22:20Z'
verdict: pushback
consumed_task_state: false
findings:
- severity: high
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md@55d2b17:83-88; skills/review-pending.md:42-65
  finding: AC2 requires the codex orchestrator to parse each child stdout as JSON,
    but the current per-item prompt contract returns markdown sections and 049 does
    not require a JSON envelope, JSON Schema, --output-schema usage, or an explicit
    prompt replacement. A builder can satisfy the stated body edits and still produce
    codex children whose normal output must be rejected as parse failures. Patch the
    spec to define the exact child JSON shape the orchestrator consumes, and require
    the codex invocation/prompt to enforce that shape; otherwise remove the JSON-parse
    requirement and keep the markdown contract.
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md@55d2b17:136-138
  finding: 'The prescribed stale-staging cleanup command lacks -mindepth 1: find "$HOME/.codex/.echo-staging"
    -maxdepth 1 -type d -mmin +60 -exec rm -rf {} + can match and delete the .echo-staging
    root itself once that directory is older than 60 minutes. The next mkdir "$STAGE"
    then fails because the parent was removed. Patch the command to skip the root
    and add a test where the staging root is old but must survive while old child
    staging dirs are removed.'
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md@55d2b17:125-137
  finding: AC4 says --symlink is the default and both modes share conflict semantics,
    but the per-target lock is specified only inside the --copy staging bullet. The
    default symlink path still does probe -> optional rm -> ln without a required
    lock, so two concurrent installs or a symlink/copy mode switch can interleave
    through the same target despite the AC3 concurrent-lock test. Require the per-target
    mkdir lock around classify/remove/finalize for both modes, and specify per-target
    lock release/cleanup so a loop over multiple skills does not rely on one mutable
    global trap variable.
- severity: low
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md@55d2b17:172-176
  finding: The Tests summary says codex-adapter.test.ts has six cases and references
    a singular targeted vitest file, while AC3 lists nine codex-adapter cases plus
    the separate install-codex-adapters.test.ts suite. Patch the summary/verification
    command text so the builder cannot under-run the required test surface by following
    the summary section.
---

# Codex review — r5

Verdict: pushback.

The adapter direction is sound, but the spec still leaves one executable contract undefined and two shell-mechanics hazards in the install helper. The child-output contract needs to be falsifiable before codex can safely materialize `review-pending`, and the installer should lock/clean up exactly the paths it claims to protect.
