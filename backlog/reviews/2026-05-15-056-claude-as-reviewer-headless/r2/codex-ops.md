---
item_id: "2026-05-15-056-claude-as-reviewer-headless"
round: 2
reviewer: "codex-ops"
artifact_sha: "5207612bf11241a01c81ef2d4ab1483553195b90"
completed_at: '2026-05-15T23:45:13Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:140,152-155"
    finding: >-
      AC5 requires `_reviewers.py` to reject any `invoke_command` that does not contain both `{{WT}}` and `{{PROMPT}}`, but the required Claude roster example is `claude -p --dangerously-skip-permissions < {{PROMPT}}` and has no `{{WT}}` token. Because `_reviewers.py` validates the entire roster before `_reviewer_gate.py`, `_run_reviewer.sh`, or the installer can proceed, landing those instructions literally makes the new `claude` entry invalid and can take down every headless launchd tick, including codex and codex-ops, before any reviewer process starts. Patch the contract so the example satisfies the validator, or relax the validator to allow cwd-driven commands that require only the prompt/stdin token, then make AC9 assert all four shipped roster entries load under the final rule.
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:93,160-167"
    finding: >-
      The accepted/preferred Option B is not runtime-safe as written. AC2 fixes `invoke_command` as a non-empty string, while Option B changes it to a JSON array; then it says to `shlex.quote()` each argv element while using `subprocess.Popen(..., shell=False)` and models stdin redirection as literal `"<", "{{PROMPT}}"` argv. If a builder follows the preferred path, either the roster schema/loader rejects the config, or the child process receives quoted path strings and a literal `<` argument instead of prompt stdin, so unattended reviewer ticks fail before writing any response. Patch the spec to choose Option A only, or fully specify an argv form with schema support, no per-argument shell quoting, and an explicit `stdin_from` field that the wrapper opens and passes to the child.
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:16-41,189-204,216-220"
    finding: >-
      The fail-closed install behavior depends on `_install_reviewer_launchd.sh` accepting or propagating an install-context signal, preflighting the resolved `claude` executable, and proving no plist is written when the CLI is absent, but that installer is not in `files_to_modify`. The current installer only detects `--smoke`, writes/loads the plist before running smoke, and invokes the smoke runner without forwarding any `--install-context` argument. A builder constrained to this file list can ship the Claude wrapper and smoke runner while the operator path still creates `com.echo.review-queue-claude.plist` on a machine with no `claude`, leaving a StartInterval job that fails every 10 minutes with command-not-found. Add `_install_reviewer_launchd.sh` to the spec's writable set and require either pre-plist executable resolution or explicit `--install-context` forwarding with the no-plist/no-job assertions in AC9.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The R2 patch set closes the first-round hazards in intent, but the runtime contracts still have contradictions that would show up under launchd or install smoke: the new loader rule rejects the required Claude command, the preferred argv-template path is not executable as described, and the install fail-closed path needs an explicit installer edit.
