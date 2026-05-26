---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 7
reviewer: "codex-ops"
artifact_sha: "ce81ff3abf3f07508a507f09001483e28d6c3df4"
completed_at: '2026-05-26T00:57:50Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:334 (also :139, :159, :162)"
    finding: >-
      AC7.2a makes atomicWrite follow every symlinked target, but AC4's skill sync paths are fully-owned overwrites and AC4.2 still promises the function never reads or writes outside sourceDir/targetDir. In production, a stale or malicious symlink at ~/.echo/skills/<name>.md or ~/.claude/commands/<name>.md would be followed and overwritten with ECHO skill bytes; the source-dir symlink guards do not protect target symlinks. Patch the spec so symlink write-through is opt-in only for the intended dotfile targets, or make skill/role target symlinks return a structured conflict/error before atomicWrite. Add regression tests for target symlinks in both the populateEchoSkills first hop and syncClaudeSkills second hop.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:506"
    finding: >-
      The Definition of Done still says the advisory lock has a 30s retry budget and stale-lock recovery via process.kill(pid, 0), which contradicts AC6's r7 posture at lines 271-282 and AC9 case 11's lockfile-present -> RETRY_CONFLICT contract. Because DoD text is part of the builder/merge contract, an implementer can reintroduce the exact unattended-runtime race the r7 patch removed: a crashed-prior-run lock is treated as auto-recoverable instead of a one-shot structured failure, risking live-lock deletion or surprise blocking behavior. Remove the stale retry/stale-recovery clause and make the DoD say the lock is one-shot, never auto-removed, and manually cleared or future-doctor-handled.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:229 (also :268, :426-448)"
    finding: >-
      The default repo-root discovery path has no structured failure contract. syncAll walks upward from import.meta.url until it finds package.json plus skills/, while later claiming no exception escapes syncAll; in a packaged/bundled install, or any runtime where the skills directory is not adjacent to the compiled module, that lookup can fail before populateEchoSkills or role sync can convert the condition into SyncResult. At 03:00 an unattended echo init/doctor path would crash instead of returning the per-agent/lock-style result the caller can render. Patch AC6 to define the exact SyncResult for repo-root resolution failure, or require callers to pass repoRoot and return a typed AdapterError when omitted, and add a test that forces the no-package-or-no-skills discovery failure.
---

# codex-ops review - r7

Verdict: `proceed_after_patches`.

The r7 artifact removes the stale-lock auto-recovery mechanism from the main ACs, which is the right runtime posture. The remaining production concerns are boundary conditions: symlink write-through is now too broad for fully-owned skill fan-out, the DoD still carries the removed stale-lock behavior, and repo-root discovery needs a non-throwing failure shape before 073/074 call this unattended.
