---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 17
reviewer: "codex-ops"
artifact_sha: "0ef00dc09815a77ec237aadbc1df7de6d87c017d"
completed_at: '2026-07-16T12:04:40Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC4 — reviewed launcher/envelope cleanup and deadline contracts; AC6 — hard-loss semantics"
    finding: "Inner Git/gh children run in process groups distinct from the launcher, but no production mechanism gives the outer host ownership of those groups after abrupt launcher death. Killing or reaping the launcher cannot guarantee termination of an orphan credential-bearing push. Require a host-owned spawn broker or atomic registration-before-exec protocol that preserves kill/wait ownership across launcher failure, plus tests that kill the launcher while a TERM-resistant inner writer is active."
  - severity: "high"
    where: "AC4 — review commit R and landing-plan P_L publication; AC6 — source-publication plan/authorization commit"
    finding: "The three Project_echo authority commits are merely described as committed and pushed, without the exact CAS and failure contract applied to target writes. Require a clean isolated worktree, authenticated expected-old-main, absolute Git and canonical URL, no hooks or followed tags, an expected-base lease, one bounded attempt, no pull/rebase/autostash, process-group termination, porcelain validation, ambiguous-outcome reconciliation, and exact-commit/path public readback before those commits authorize target access."
  - severity: "medium"
    where: "AC3 — fresh-clone verifier child execution and source temporary-directory cleanup"
    finding: "The exact npm/Git trace has no per-step or aggregate deadline, cancellation, process-group termination, or reap contract. A hung npm install, test, fsck, artifact check, or secret scan can stall unattended acceptance indefinitely and prevent cleanup of T. Add finite deadlines, TERM/grace/KILL/reap and stream-closure semantics, cleanup in the outer finally, and never-resolving plus TERM-resistant fixtures."
  - severity: "medium"
    where: "AC6 — unique source-release workflow-run selection"
    finding: "The workflow definition is authenticated at `.github/workflows/source-release-build.yml`, but candidate runs are required to report path `.github/workflows/source-release-build.yml@main` without an endpoint-specific normalization contract. Workflow-run path and branch/ref are separate API fields, so this can reject every legitimate exact-M run until timeout. Bind run.path to the plain workflow path, retain the separate main/ref/head checks, and add a protocol-faithful raw response fixture."
---
