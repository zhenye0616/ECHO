---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 8
reviewer: "codex-ops"
artifact_sha: "1956ef920d7f3991429f221048e49cf40f030d98"
completed_at: '2026-06-09T18:31:31Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — install-echo-codex-skills.sh --check / AC3 — doctor integration"
    finding: "The spec classifies a managed sentinel whose recorded source no longer exists as exit 1 drift and routes doctor remediation to the installer, but re-running the installer cannot re-render or remove a skill whose source file was deleted or renamed. That leaves unattended doctor in a persistent degraded loop with a non-fixing command. Patch the spec/tests so missing-source has its own actionable remediation, such as removing that managed skill dir or invoking an explicit prune path, and assert the follow-up check clears only after that remediation."
  - severity: "medium"
    where: "AC2 — absent-install guard / AC5 — tests"
    finding: "The absent-install clean pass does not distinguish no managed install from an existing but unreadable ~/.codex/skills tree or unreadable .echo-managed sentinel. Under launchd or permission drift, glob-based discovery could silently find zero managed dirs and doctor would report ok while the installed adapter state is uninspectable. Patch AC1/AC2/AC5 to require existing-but-untraversable skill dirs or unreadable managed sentinels to exit 2 with stderr, and require doctor to surface check-error with non-empty detail."
---
