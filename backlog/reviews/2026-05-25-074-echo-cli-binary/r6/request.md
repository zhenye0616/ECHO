---
item_id: 2026-05-25-074-echo-cli-binary
round: 6
spec_commit_sha: 78ca68b1ba80aebd0dd1e489f73998dda93543a7
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T06:58:06Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9b75bfbc-6fbd-4490-86a0-28517efc991a
focus_hints: 'r6 convergence check: r5 was 0H/3M+1L both proceed_after_patches. Expecting
  r6 at ''proceed'' or near-zero MED. Verify: (1) signalGate.beforeNextSpawn moved
  to iteration TAIL (NEW step 7); case 12a''s wasCalledForStep(2)===false assertion
  catches the r5 ordering bug; gate-emitted SIGTERM is observed by iteration N+1''s
  step 0 aborted check. (2) package.json files allowlist + AC1.5 subcommand smoke
  catch the multi-file dist/cli packaging gap; the npm-semantics ''files supersedes
  .gitignore'' claim is what makes this work. (3) Case 12b baseline-relative listener-count
  is order-independent. (4) Per 058 discipline: are r5 patches sound, or did the gate-placement
  reorder introduce its OWN bug? Particularly: when there is no step N+1 (single-step
  workflow + gate-at-tail), does the loop correctly observe receivedSignal.current
  after dispatchWorkflow resolves?'
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `78ca68b1ba80aebd0dd1e489f73998dda93543a7`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
