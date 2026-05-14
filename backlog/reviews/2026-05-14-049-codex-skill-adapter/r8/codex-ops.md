---
item_id: 2026-05-14-049-codex-skill-adapter
round: 8
reviewer: codex-ops
artifact_sha: f0bf4ea65aa9a1c8423b1258ee1aaff1b670208a
completed_at: '2026-05-14T21:18:59Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md:147
  finding: The stale-lock recovery contract writes a pid file but never requires checking
    whether that pid is still alive before removing an old lock. If a copy or symlink
    install stalls on a slow filesystem for more than 600 seconds, a second invocation
    can classify the lock as stale, remove it, and enter the probe/remove/finalize
    path concurrently with the still-running first process. That defeats the lock's
    production purpose and can leave ~/.codex/skills/<name> missing or half-rewritten.
    Require stale removal to be gated on a missing/non-running pid, or require lease
    renewal, and add a test where an old timestamp with a live pid is not stolen.
- severity: medium
  where: backlog/ready/2026-05-14-049-codex-skill-adapter.md:163
  finding: 'Copy-mode staleness is keyed to `git rev-parse HEAD`, not to the actual
    adapter/canonical skill content. That gives the operator the wrong runtime signal:
    an uncommitted skill edit plus sync leaves HEAD unchanged so the installed copy
    can be stale without a warning, while an unrelated commit or pull changes HEAD
    and can warn even when the copied SKILL.md bytes are current. Use a per-skill
    content hash or source adapter file hash in .echo-managed, and test both an uncommitted
    skill-body change and an unrelated-commit/no-skill-change case.'
---

# codex-ops review

Verdict: `proceed_after_patches`.

The spec is close from an ops/runtime perspective. The remaining gaps are both observability/serialization details in the install + stale-copy paths; they should be patched before builder claim so the implementation does not encode misleading runtime behavior.
