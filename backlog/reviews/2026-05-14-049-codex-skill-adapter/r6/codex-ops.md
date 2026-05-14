---
item_id: 2026-05-14-049-codex-skill-adapter
round: 6
reviewer: codex-ops
artifact_sha: dc38b684a4397b44e422eda091b4673f577092e5
completed_at: "2026-05-14T20:56:10Z"
verdict: proceed_after_patches
findings:
  - severity: high
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:83-88"
    finding: >-
      The codex fan-out contract requires each background child to leave stdout, stderr, and an rc file, and says parse failure logs stderr+rc, but it does not specify failure-tolerant child wrapping or wait semantics. Under the usual shell shape for this workflow (`set -euo pipefail` plus `(...) &`), a non-zero `codex exec` can exit the child before `.rc` is written, and a plain parent `wait` can terminate the orchestrator before it reads the child artifacts or writes the queue-errors row. At runtime that turns a failed per-item review into a missing/ambiguous child result instead of the hard per-item failure AC2 intends. Require the codex notes to spell out `set +e`/`rc=$?` capture inside each child and `wait "$pid" || true`-style parent draining before parsing or cleanup.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:129-141"
    finding: >-
      The install helper now adds per-target mkdir locks for both modes, but there is no stale-lock recovery path. `trap` cleanup covers normal exits, not SIGKILL or power loss; a killed installer can leave `$HOME/.codex/.echo-locks/<name>` behind forever, after which both `--symlink` and `--copy` runs fail as "another install in progress" even though nothing is running. Staging has a 60-minute stale cleanup, so locks need an equivalent operational story: write pid/timestamp into the lock and either clean safely stale locks or print the lock path plus explicit recovery guidance, with a test for a stale prior lock.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-049-codex-skill-adapter.md` at `dc38b684a4397b44e422eda091b4673f577092e5` from the operational/runtime lens.

Verdict: `proceed_after_patches`.

## Findings

1. HIGH - `backlog/ready/2026-05-14-049-codex-skill-adapter.md:83-88`: The codex fan-out notes need explicit rc capture and parent wait-draining semantics so a failing child still produces observable artifacts and a queue-errors row under strict shell execution.

2. MEDIUM - `backlog/ready/2026-05-14-049-codex-skill-adapter.md:129-141`: The new per-target locks can become permanent after SIGKILL/power loss; add stale-lock recovery or clear manual recovery diagnostics and test it.
