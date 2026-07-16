---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 17
reviewer: "codex"
artifact_sha: "0ef00dc09815a77ec237aadbc1df7de6d87c017d"
completed_at: '2026-07-16T12:00:18Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3/AC4 — fresh-clone acceptance and hosted quality workflows"
    finding: "The isolated acceptance contract is not wired into `quality-macos` or `quality-ubuntu`, and the workflow tests do not require an equivalent exact command vector or complete history even though baseline-object checks need it. Require `fetch-depth: 0`, caller-owned mode-0700 `HOME` and `HOME/tmp`, and the exact source-mode `tools/fresh-clone-acceptance.sh` argv in both jobs; assert all of this structurally in `tests/governance/workflow-policy.test.ts`."
  - severity: "high"
    where: "AC3 — `tools/fresh-clone-acceptance.sh` bootstrap contract"
    finding: "The wrapper does not define how it resolves the committed verifier before executing it. A relative verifier selected from an incorrect cwd can run before the verifier's own cwd check. Specify canonical non-symlink wrapper-to-sibling resolution for `tools/fresh-clone-verifier.mjs`, bind its `import.meta.url` and cwd to the same clone root, and add a wrong-cwd decoy fixture proving the decoy never executes."
  - severity: "high"
    where: "AC4/AC6 — private-target Git credential transport"
    finding: "The credential-pipe mechanism is not executable as written: `GIT_ASKPASS_REQUIRE=force` does not select `tools/git-askpass-fd.mjs`, and the inherited descriptor variable is unnamed. Bind the authenticated absolute helper path through `GIT_ASKPASS`, define the fixed nonsecret FD environment key, reject alternate `core.askPass`/`SSH_ASKPASS` sources, set `http.followRedirects=false`, and test missing or substituted helpers, redirects, single-pipe consumption, and teardown."
  - severity: "high"
    where: "AC6 — unique source-build selection"
    finding: "The candidate predicate applies the authorized time window before uniqueness, so another exact-workflow, exact-`M` run outside that window is ignored and an in-window run can appear unique. Fully paginate all runs for the numeric workflow and `head_sha=M`, require exactly one run identity total, and only then validate interval, event, ref, title, and attempt; repeat this check before collect returns and before publish writes, with a late-duplicate fixture."
  - severity: "high"
    where: "AC6 — release publication transitions"
    finding: "Intermediate readbacks authenticate only the object just created; whole-namespace equality is required only at preflight and final postcondition. A foreign tag, release, or asset inserted between steps can therefore remain unnoticed while later writes proceed. Before every subsequent mutation, fully paginate and compare tags, releases, and captured-release assets against the exact expected prefix state, with insertion-race fixtures asserting zero later writes."
  - severity: "medium"
    where: "AC4/AC6 — deadline and cleanup policy"
    finding: "The finite-deadline table omits local Git children such as `hash-object`, `cat-file`, `merge-base`, `rev-parse`, `status`, and config inspection, as well as root removal and bounded settlement after HTTP abort or process-group KILL. Assign every operation and cleanup transition an exact maximum, add a final abort/KILL/reap settlement bound, and test never-settling local-Git and cleanup adapters before credential zeroing and root removal."
---
