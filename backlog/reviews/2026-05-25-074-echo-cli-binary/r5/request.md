---
item_id: 2026-05-25-074-echo-cli-binary
round: 5
spec_commit_sha: 2ce9fc2af9a09bdd775df7cc047ef22d00291217
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T06:46:54Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: e3a4272b-6c1d-40e3-91bb-b511c5a3434a
focus_hints: 'r5 convergence check: r4 was 0 HIGH / 5 MED both proceed_after_patches.
  If r5 lands at ''proceed'' (0 findings) or near-zero MED cleanup, this item is claim-ready.
  Specifically verify: (1) AC7.3 case 5 now exits 1 + cleanupConflicts entry + per-agent
  isolation preserved; matches AC4.1 step 4 contract. (2) AC5.4 step 8 outer try/finally
  wraps the FULL flow including computeExitCode; handler outlives derivation; AC7.4
  case 12b''s listenerCount sub-assertion catches handler-lifetime regressions. (3)
  NEW AC5.4 stateProjectsPath seam + step 1 projects.json read; NEW AC7.4 case 15
  exercises J8 default_project fallback in git-rootless cwd. (4) signalGate test seam:
  beforeNextSpawn (forwarded to dispatchWorkflow), beforeExitDerivation (runRun-side),
  both default-no-op in production; deterministic timing for cases 12a/12b. (5) Per
  058 discipline: did r4''s signalGate seam (new abstraction) introduce sub-detail
  bugs that need correction in r5? If so, prefer simplification over deeper patching.'
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `2ce9fc2af9a09bdd775df7cc047ef22d00291217`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
