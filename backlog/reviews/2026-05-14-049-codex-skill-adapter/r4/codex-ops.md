---
item_id: 2026-05-14-049-codex-skill-adapter
round: 4
reviewer: codex-ops
artifact_sha: bd50b28b1d0a8d865e1bb547de5f50fee640c4e7
completed_at: "2026-05-14T20:13:37Z"
verdict: pushback
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:129"
    finding: "AC4 stages copy-mode installs inside $HOME/.codex/skills/.staging-<name>-$$ and states those directories are never seen as real skills. At runtime that is not guaranteed: Codex's skill root already contains dot-prefixed system skills, the staging directory contains a valid SKILL.md before the final mv, and EXIT traps do not run on SIGKILL or power loss. An interrupted install can leave a duplicate or partial skill visible to the next Codex startup. Stage outside ~/.codex/skills on the same filesystem, clean stale stages, or require and test that Codex ignores the chosen staging location before proceeding."
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:122-129"
    finding: "The probe/remove/stage/mv sequence is not atomic across concurrent installer processes. Two --copy runs can both classify a missing target as absent, both build PID-suffixed stages, and then the second mv may move its stage inside the directory created by the first rather than replace it; mixed --symlink/--copy runs can similarly race between probe and removal. Since AC4 claims parallel-install safety, add a per-target lock or re-probe-and-claim step around final installation and cover it with a concurrent install test."
---

# codex-ops review

Verdict: pushback.

## Findings

1. HIGH — `backlog/ready/2026-05-14-049-codex-skill-adapter.md:129`: AC4 stages complete copy-mode skill installs under the live Codex discovery root. A killed installer can leave `.staging-*` with a valid `SKILL.md`, and dot-prefix alone is not an operational isolation boundary for Codex skills.

2. MEDIUM — `backlog/ready/2026-05-14-049-codex-skill-adapter.md:122-129`: The installer still has a probe-to-install race between concurrent copy/symlink runs. The PID-suffixed stage name avoids one filename collision, but it does not serialize the final target claim.
