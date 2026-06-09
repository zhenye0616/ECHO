---
item_id: "2026-06-08-100-codex-adapter-freshness-check"
round: 2
reviewer: "codex-ops"
artifact_sha: "d6eadbab092ff18775090cbfd92dc439dfc80339"
completed_at: '2026-06-09T17:34:09Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — doctor integration"
    finding: "The spec says doctor should shell out to `install-echo-codex-skills.sh --check`, but it does not require resolving the script from the repo root or invoking it with launchd-safe cwd/PATH assumptions. In unattended or packaged `echoctl doctor` runs from an arbitrary working directory, this can degrade falsely because the script is not found. Patch AC3/AC5 to require an absolute repo-root script path, `execFile`-style invocation rather than PATH lookup, and a test that runs doctor from a non-repo cwd with a minimal PATH."
  - severity: "medium"
    where: "AC1 — install-echo-codex-skills.sh --check"
    finding: "The `--check` path re-renders to a temp stage, but the spec does not require a unique `mktemp -d` stage, cleanup trap, or safe `${TMPDIR:-/tmp}` fallback. Overlapping doctor/check runs could collide on a fixed temp path or leave durable temp artifacts after failures, which violates the operator-side selftest shape. Patch AC1/AC5 to require per-run temp dirs, cleanup on every exit path, and no writes outside that temp stage plus the intended read-only reads from `~/.codex`."
---
