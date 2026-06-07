---
item_id: "2026-06-07-096-workspace-identity-resolver"
round: 3
reviewer: "codex-ops"
artifact_sha: "33d647bce765638f94f42497b108f89b48112410"
completed_at: '2026-06-07T19:24:24Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — Ambient-root guard"
    finding: >-
      The guard uses $HOME as both a forbidden discovered root and an ascent ceiling, but it does not define runtime behavior when the capture path is outside $HOME or HOME is unset in a daemon/launchd environment. A literal implementation can stop before inspecting /tmp/<workspace> or external-volume ancestors, or mishandle the missing-HOME case, causing subdir launches to fall back to reported dirs and fragment joins. Patch AC1 and AC8 to specify that the home ceiling applies only when the start path is under a resolved home directory; otherwise walk until an ambient/filesystem root while never returning those ambient roots, and add tests for an anchored temp/external-style workspace plus missing-HOME behavior.
---
