---
item_id: "2026-05-15-056-claude-as-reviewer-headless"
round: 1
reviewer: "codex-ops"
artifact_sha: "a37c9b9cbb3670641e9d9b9f181842b19f0eac42"
completed_at: '2026-05-15T23:34:34Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:16-36,121-139; tools/review-queue/_reviewers.py:26-35,62-72"
    finding: >-
      AC5 adds an `invoke_command` field to every reviewers.json entry and makes the wrapper depend on it, but the spec does not include `tools/review-queue/_reviewers.py` in the edit set or acceptance contract. At the frozen baseline, `Reviewer(**r)` rejects unknown fields and the NamedTuple has no place to carry `invoke_command`; once the roster gains that field, `_reviewer_gate.py` can fail before any child process launches, taking down existing codex and codex-ops launchd ticks as well as the new claude tick. Patch AC5/AC9 to require updating the loader type/validation and to prove `REVIEWER_NAME=codex`, `codex-ops`, and `claude` all pass the gate and expose both `slash_command` and the resolved invoke command without regressing current headless reviewers.
  - severity: "high"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:145-163; tools/review-queue/_install_reviewer_launchd.sh:121-131"
    finding: >-
      AC7 lets `smoke-test-claude-runner.sh` exit 0 when the `claude` CLI is missing, but AC8 verifies the launchd installer path and the current installer bootstraps/kickstarts the job before running the smoke runner. In production that means an operator can run the normal install-with-smoke flow on a machine without `claude`, see a green skip, and leave `com.echo.review-queue-claude` firing every 10 minutes with command-not-found failures. Patch the spec so the fail-open skip is only allowed in non-install CI/unit contexts, while installer smoke either preflights the resolved `invoke_command` executable before plist writes or fails non-zero when `claude` is absent after installation.
  - severity: "medium"
    where: "backlog/ready/2026-05-15-056-claude-as-reviewer-headless.md:123-137"
    finding: >-
      The `invoke_command` examples rely on unquoted literal substitution plus shell redirection (`{{WT}}` / `{{PROMPT}}` inside a `bash -c` command string). A launchd environment with a TMPDIR or repo path containing spaces or shell metacharacters turns this into a runtime-only failure at the dispatch boundary, before the reviewer prompt can log a queue error or write a response. Patch AC5/AC9 to require shell-safe substitution (for example quoted/escaped path interpolation or an argv-style template) and an integration test where the worktree or prompt path contains spaces so codex/codex-ops backwards compatibility and claude dispatch are both exercised under realistic macOS paths.
---

# codex-ops review

Verdict: `pushback`.

Reviewed the frozen artifact at `a37c9b9cbb3670641e9d9b9f181842b19f0eac42` through the operational/runtime lens.

The spec is pointed at the right missing binding, but AC5 changes the launch substrate for every headless reviewer. Before this ships, the acceptance criteria need to close the roster-loader outage, make install-time CLI absence fail closed, and harden command-template substitution so unattended launchd ticks do not fail before the queue can observe them.
