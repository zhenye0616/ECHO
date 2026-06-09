---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 4
reviewer: "codex-ops"
artifact_sha: "0ec5208afb98c2e4b3f0e5d1e5709d0f8093304b"
completed_at: '2026-06-09T17:53:06Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-08-100-codex-adapter-freshness-check.md / Acceptance Criteria / AC5"
    finding: >-
      AC5 says an unstubbed test runs the real `--check` from a non-repo cwd with a minimal PATH, but that only exercises the installer path and cannot prove AC3's doctor-to-installer absolute-path/execFile behavior. Patch AC5 to require an unstubbed `echoctl doctor` invocation from a non-repo cwd with a minimal PATH, against a managed temp HOME install, so the unattended doctor runtime path is covered.
---

## Findings

- **Medium — AC5 does not actually cover the doctor runtime path.** The spec correctly requires `echoctl doctor` to resolve `tools/install-echo-codex-skills.sh` from a stable absolute anchor and invoke it execFile-style, but AC5's unstubbed coverage is phrased as running the real `--check`. That can prove cwd-independent `source` handling inside the installer, but it does not prove that doctor itself can find and execute the installer from a launchd/cron-style cwd/PATH. Require the unstubbed test to invoke `echoctl doctor` itself with a minimal PATH and non-repo cwd, using a temp HOME managed install.
