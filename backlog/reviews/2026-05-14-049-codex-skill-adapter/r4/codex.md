---
item_id: 2026-05-14-049-codex-skill-adapter
round: 4
reviewer: codex
artifact_sha: bd50b28b1d0a8d865e1bb547de5f50fee640c4e7
completed_at: '2026-05-14T20:14:49Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md:127
  finding: AC4 claims the copy installer is PID-suffixed for parallel-install safety, but the probe/remove/stage/mv sequence is not protected by any lock. Two install-codex-adapters.sh processes can both classify a target as absent or managed, stage separately, and then the second mv to an already-created directory will nest the staging directory under the skill target (or race with a mode switch). Add a global or per-skill mkdir lock around the full probe-to-finalize section, and add a concurrent install test so the claimed safety is enforceable.
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md:66
  finding: The spec fixes the codex adapter set to exactly process-backlog and review-pending, but --check only requires expected in-scope adapters to exist and skips out-of-scope canonical skills. It never fails on unexpected adapters/codex/skills/* directories. A stray merge-and-cleanup or review-queue adapter could be committed or installed while tools/sync-skills.sh --check stays green, which defeats the stated drift guard against exposing Claude-coupled skills. Require --check to reject unexpected codex adapter directories and add a test for stale/out-of-scope adapter rejection.
---

# Codex review

Verdict: `proceed_after_patches`

## Findings

1. **Medium - install helper parallel safety is not actually guarded** (`AC4`, around lines 127-130). The staged copy path uses a PID-suffixed staging directory, but there is no lock across target probing, managed-target removal, staging, and final `mv`. If two installer invocations overlap, both can see the same target as installable; after the first creates `$HOME/.codex/skills/<name>`, the second `mv "$STAGE" "$target"` can move the staging directory inside the already-created target rather than replacing it. A mode-switch race has the same shape. Patch by adding a global or per-skill atomic lock directory around the full probe-to-finalize operation, then add a concurrent install test.

2. **Medium - exact adapter set is not mechanically enforced** (`AC1 --check`, around lines 66-70). The spec says the materialized codex set is exactly `process-backlog` and `review-pending`, and out-of-scope skills must not be exposed. The `--check` contract verifies expected in-scope adapters and skips out-of-scope canonical skills, but it does not require failure on unexpected `adapters/codex/skills/*` directories. That leaves a stale or accidental adapter installable while `tools/sync-skills.sh --check` remains green. Patch the AC to reject unexpected codex adapter directories and add a stale/out-of-scope adapter fixture test.

## Notes

The Codex CLI assumptions in the spec match the local install: `codex-cli 0.130.0` supports `codex exec --sandbox read-only -C <repo> -`, and the installed skill anatomy uses `name`, `description`, and optional `metadata.short-description`.
