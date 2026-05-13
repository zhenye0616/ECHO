---
item_id: 2026-05-13-044-reviewer-cycle-infrastructure-debt
round: 1
reviewer: codex-ops
artifact_sha: a13e52b9583a7c0721e89cc5583ce40e2271cf05
completed_at: '2026-05-13T20:25:17Z'
verdict: pushback
findings:
  - severity: high
    where: "AC2 - Direct-invoke pattern for manual reviewer force-fires"
    finding: >-
      The replacement command is specified as `nohup tools/review-queue/_run_reviewer.sh codex ...`, but `_run_reviewer.sh` at the requested commit does not consume a positional reviewer argument and fails fast unless `REVIEWER_NAME` is set. In production this replaces the `launchctl kickstart` footgun with a manual-fire recipe that exits immediately under the wrapper's `set -u`, leaving the operator with only a dead log file. Specify an actually runnable command, for example `nohup env REVIEWER_NAME=codex tools/review-queue/_run_reviewer.sh ...` or the existing `run-<reviewer>-reviewer.sh` driver, and test that exact documented command.
  - severity: high
    where: "Pre-flight step 1 + AC3 - Per-reviewer timeout from reviewers.json"
    finding: >-
      The spec asks for a `codex-ops` row with `mode: headless` and `timeout_hours: 0.5`, but the reviewer loader at the requested commit rejects non-null `timeout_hours` for headless reviewers. If a builder follows the pre-flight literally, `_reviewer_gate.py`, `_run_reviewer.sh`, `request.py`, and `combine.py` all fail before a queue tick can do useful work. Either keep headless reviewers at `timeout_hours: null` and rely on the new fallback policy, or explicitly amend the loader/schema contract as part of AC3.
  - severity: high
    where: "AC3 - Per-reviewer timeout from reviewers.json"
    finding: >-
      The timeout acceptance criteria talk about individual reviewer slots becoming eligible, but the runtime primitive is still a round-level `combined.md`. Without a specified rule for reviewers whose own timeout has not elapsed, the obvious implementation can mark every absent requested reviewer as missing as soon as the fastest missing reviewer times out. That would let AC4 auto-dispose a round while a slow reviewer such as Cursor is still inside its configured 2 hour window, silently defeating the rare-event correctness the spec says to preserve. Define the round-level eligibility semantics, or pass an explicit `timed_out_missing` set into combined emission so not-yet-due reviewers are not treated as timed out.
  - severity: high
    where: "AC4 - Single-reviewer auto-disposition"
    finding: >-
      AC4 introduces a non-escalated `combined_verdict: proceed_after_patches_partial` and says `next_round` is filled when the present reviewer returned `proceed_after_patches`, but the strategist watcher command only branches on the existing verdict families and currently expects `dispatch-next-round.py` to fill `next_round` after disposition. At runtime, combine.py can therefore publish a valid-looking combined file that the next watcher tick does not know how to disposition, or that points at a next round before the request exists. Include the watcher/dispatch contract change in AC4 and test the unattended watcher path, not only `compute_combined_verdict()`.
---

# codex-ops review

Reviewed `backlog/ready/2026-05-13-044-reviewer-cycle-infrastructure-debt.md` at `a13e52b9583a7c0721e89cc5583ce40e2271cf05` from the operational/runtime lens.

Verdict: pushback. The spec is pointed at the right frictions, but as written the manual force-fire recipe, reviewer timeout config, round eligibility semantics, and watcher disposition path can all break unattended queue operation.
