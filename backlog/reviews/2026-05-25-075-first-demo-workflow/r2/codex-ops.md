---
item_id: "2026-05-25-075-first-demo-workflow"
round: 2
reviewer: "codex-ops"
artifact_sha: "00246ec3241bb5346a210241350a4fdcbbc081f3"
completed_at: '2026-05-26T20:10:42Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:71; backlog/ready/2026-05-25-075-first-demo-workflow.md:273-289; backlog/ready/2026-05-25-075-first-demo-workflow.md:319"
    finding: >-
      The r2 package fix still leaves the packed-install demo nonfunctional: the workflow targets the shipped reviewer role, but AC9.2 explicitly forbids adding assets/echo-roles/** to the npm files allowlist, and AC9.3 only proves the workflow TOML is in the tarball. In a real npm-pack install, echoctl init can copy change-review.toml while syncDefaultRoles has no packaged reviewer.toml source; the next echoctl run change-review then has no role definition to match, or init reports a role source-missing failure before the demo ever runs. Patch the spec so the package/runtime contract is coherent: either include the default role asset in the same allowlist and pack-shape smoke, or explicitly remove packed-install readiness from 075 and limit the first-demo claim to repo-local dogfooding until the 074 asset-packaging follow-up lands.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-075-first-demo-workflow.md:60-63; backlog/ready/2026-05-25-075-first-demo-workflow.md:87-100"
    finding: >-
      The prompt invariants name the diff-source commands but do not define the unattended failure path when a priority command is unavailable or exits non-zero. At runtime, gh may be missing or unauthenticated, network access may be unavailable under the headless agent, an upstream may be unset, or HEAD~1 may not exist in a fresh/shallow repo. With only "use the first priority that returns non-empty content," the demo can stall or fail instead of cleanly falling through to the next priority or reporting that no diff source was available. Add prompt text and a content test requiring command-not-found/non-zero stderr to be treated as "priority unavailable, continue," plus an explicit no-diff/no-source terminal output so echoctl run change-review behaves predictably in empty or freshly initialized repos.
---

# codex-ops review

Verdict: `pushback`.

The r1 workflow-sync runtime fixes are represented, but r2 still leaves a production install path that can pass the new package smoke while failing the first demo. The prompt also needs explicit command-failure fallthrough so the unattended review does not fail on missing `gh`, missing upstream, or initial-commit repos.
