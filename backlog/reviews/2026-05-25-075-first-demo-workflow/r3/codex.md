---
item_id: "2026-05-25-075-first-demo-workflow"
round: 3
reviewer: "codex"
artifact_sha: "707b41e58e1bd24e431e5f2687ed9649494ba984"
completed_at: '2026-05-26T20:24:50Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:60-63 and :300-302; src/cli/commands/run.ts:87-99,195 at 707b41e"
    finding: >-
      The spec promises `echoctl run change-review` produces findings on stdout, but the shipped 074 run renderer only prints `reviewer: exit <code>` in human mode and keeps the child stdout inside the DispatchOutcome object. JSON mode exposes the captured stdout, but the first-demo path in AC/J7 is the normal `echoctl run change-review` command. Because 075's file list omits `src/cli/commands/run.ts` and Out of Scope forbids changes to the 074 run/dispatch/match/load surface, a builder can implement every listed 075 file and still ship a demo that hides the review findings from the user. Patch the spec to either include a narrowly-scoped run renderer change plus a run.test assertion that child stdout/stderr is surfaced in default human output, or explicitly scope the demo to `--json` and update the first-demo claim/copy accordingly.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:90-95 and :203-207"
    finding: >-
      The prompt-content test still does not pin the load-bearing diff-resolution contract. `contains('git diff HEAD')` is satisfied by the Priority 4 string `git diff HEAD~1..HEAD`, so the test can pass with Priority 3 omitted; the same AC4.1 check also does not assert priority order or the r2 command-failure fallthrough text from AC1.3 line 95. A builder can leave out staged-change handling or the "priority unavailable, continue" semantics while satisfying the listed substring assertions. Patch AC4.1 to use order-aware checks and an unambiguous Priority 3 marker, for example a regex/backticked `git diff HEAD` not followed by `~`, plus explicit assertions for command-not-found/non-zero/auth-failure/empty-output fallthrough.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:184-190 and :251-255"
    finding: >-
      AC3.5 requires `overallOk: false` for workflow `error` actions and non-empty `workflowsErrors`, but AC6.3 only exercises the syncAll rollup for `source-missing` and `user-modified`. Moving the chmod case to the `syncDefaultWorkflows` unit test proves the helper can emit `action: 'error'`; it does not prove `syncAll().overallOk` consumes that error. A builder can implement the source-missing branch in `computeOverallOk`, ignore `workflowsErrors`/`action === 'error'`, and still pass every listed integration assertion. Add a workflow-error integration case in `tests/echo-home/adapter-sync.test.ts`, for example precreate `<ECHO_HOME>/workflows/change-review.toml` as a directory or use an EISDIR source fixture, then assert `workflowsResult.results[0].action === 'error'`, `workflowsErrors.length === 1`, and `overallOk === false`.
---

# Codex review

Verdict: `pushback`.

The r3 spec resolves the earlier package-scope and chmod-placement ambiguity, but the demo still has a blocking runtime visibility gap: the current `echoctl run` path does not print the agent's findings in normal human output, and 075 currently forbids touching the run surface that would need to change. The two medium findings are test-contract gaps that should be patched in the same respec so the builder cannot satisfy the letter of AC7 while missing load-bearing behavior.
