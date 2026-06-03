---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 2
reviewer: "codex-ops"
artifact_sha: "77ce84a51f2ae112d83473551d0167c8d907100e"
completed_at: '2026-06-03T03:30:25Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:75"
    finding: >-
      AC2 now points the wrapper at a NUL-delimited argv handoff, but the
      spec's concrete pattern uses Bash process substitution (`mapfile -d ''
      ARGV < <(_reviewer_gate.py ...)`) without requiring the wrapper to
      observe the gate process's exit status before preflight/exec. In Bash,
      a failure inside process substitution does not make `mapfile` fail under
      `set -euo pipefail`; an invalid, missing, or unreadable binding can
      leave the launchd tick with an empty argv and a confusing shell/preflight
      failure instead of the intended durable gate diagnostic and clean retry.
      Add an explicit contract and regression for preserving the gate exit
      status, such as writing argv to a temp file through a normal command or
      checking a status side channel plus non-empty argv before any exec.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74"
    finding: >-
      AC1 correctly moves the prompt path out of argv and into `stdin_from`,
      but AC4's space/metacharacter regression still describes `{{PROMPT}}` as
      surviving "as ONE argv element." That lets a builder satisfy the argv
      preservation test while never proving the runtime path that matters now:
      the wrapper opens the prompt via `< "$STDIN_FROM"` when the prompt path
      contains spaces or shell metacharacters. Add a stdin_from redirection
      regression, or reword AC4(v) so PROMPT-path handling is tested as a
      quoted redirection rather than as argv membership.
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 spec fixes the major r1 operational hazards called out in the request:
prompt delivery is modeled as stdin rather than an argv element, the installer
preflight is in scope, and the package manifest is in scope. The remaining
runtime gaps are narrower but still matter for unattended launchd ticks because
both can turn a binding/config failure into a confusing no-response tick instead
of a traceable gate failure.
