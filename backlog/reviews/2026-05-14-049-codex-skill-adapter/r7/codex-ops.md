---
item_id: 2026-05-14-049-codex-skill-adapter
round: 7
reviewer: codex-ops
artifact_sha: f1a9bd74dd3df02eaa49d8e1f5f219ccfe8ed2f9
completed_at: '2026-05-14T21:07:17Z'
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:98"
    finding: >-
      AC2 makes parse failure a hard per-item failure, but the required diagnostic only records the child's stderr+rc while the malformed review content lives on stdout and the RUN_DIR cleanup trap deletes that stdout file on exit. The common runtime failure here is rc=0, stderr empty, and stdout missing one required heading; the operator would get a queue-errors row that says parsing failed but loses the only artifact that explains why. Require the parse-failure path to name the missing headings and either persist a bounded stdout excerpt/path outside the cleanup trap or keep that run directory until the operator has a durable pointer.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:140"
    finding: >-
      The stale-lock recovery path only specifies locks with a readable timestamp older than 600 seconds. A crash, SIGKILL, or disk error can happen after `mkdir "$LOCK"` but before `date -u +%s > "$LOCK/timestamp"`, leaving a lock directory with no usable timestamp. The next install can then fail under `set -euo pipefail` while reading the timestamp or treat the lock as active forever, blocking both symlink and copy installs until manual cleanup. Treat missing/non-integer timestamps as recoverable stale locks using the lock directory mtime (with a warning), and add a test for that corrupted-lock shape.
  - severity: medium
    where: "backlog/ready/2026-05-14-049-codex-skill-adapter.md:155"
    finding: >-
      The AGENTS.md copy says to run `tools/install-codex-adapters.sh` once, but R2 explicitly keeps `--copy` as the fallback if Codex discovery does not honor symlinks. In copy mode, future `tools/sync-skills.sh` runs update `adapters/codex/skills/*` in the repo but do not update `~/.codex/skills/*`, so Codex can keep executing a stale `SKILL.md` while the repo and review queue have moved on. Document that copy-mode installs must be refreshed after adapter updates, or add a helper check/version sentinel that makes stale copied adapters observable before a Codex session starts.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-14-049-codex-skill-adapter.md` at `f1a9bd74dd3df02eaa49d8e1f5f219ccfe8ed2f9` from the operational/runtime lens.

Verdict: `proceed_after_patches`. The r7 spec has the major fan-out and installer guardrails in place, but three failure paths still need runtime hardening: parse-failure evidence can be cleaned up before anyone can inspect it, corrupted lock directories can block future installs, and copy-mode installs can silently drift stale after later syncs.
