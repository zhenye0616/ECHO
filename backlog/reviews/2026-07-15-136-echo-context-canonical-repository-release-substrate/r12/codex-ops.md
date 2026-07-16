---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 12
reviewer: "codex-ops"
artifact_sha: "5d4637faeee5ef8677275a8d90c3a7ef1875f2c7"
completed_at: '2026-07-16T07:22:33Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 — Make a sibling-free clean clone fully self-testing; Tests — scripted fresh-clone acceptance"
    finding: "The verifier equates `git rev-parse HEAD` with the bytes exercised by typecheck, lint, and tests, but HEAD equality does not detect staged, unstaged, nonignored-untracked, or `npm ci` lifecycle mutations. Require fail-closed cleanliness checks before and after dependency installation and acceptance checks, and add dirty-index, dirty-worktree, nonignored-untracked, and install-time-mutation fixtures for both modes."
  - severity: "medium"
    where: "AC3 — fresh-clone verifier child-process allowlist; Tests — scripted fresh-clone acceptance"
    finding: "The purported exact allowlist remains underspecified as `npm run <script>` for the scripts named above, which includes `test:operator` despite the same AC forbidding it and leaves parameterized argv shapes unconstrained. Enumerate the exact executable-and-argv contracts per mode, exclude `test:operator` from the allowed set, require shell-free spawning, and test disallowed script names and extra arguments as well as disallowed executables."
---
