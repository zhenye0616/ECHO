---
item_id: 2026-05-13-043-per-round-reviewer-roster
round: 5
reviewer: codex
artifact_sha: e66306189eb85feb34bbd99f6db63c19a55c31d2
completed_at: '2026-05-13T07:03:04Z'
verdict: proceed_after_patches
findings:
- severity: medium
  where: "AC1f dispatch-next-round.py branch (c)"
  finding: "AC1f says to apply the roster propagation fix to dispatch-next-round.py branch (c), but the pinned helper's branch (c) only appends the verification-waived line and intentionally leaves next_round=null; it never invokes request.py. A builder cannot pass --reviewers there without changing terminal-waiver behavior, and AC1f only tests branch (b). Patch the spec to say roster propagation applies only to branch (b), or explicitly redefine branch (c) and add a branch-(c) test."
- severity: medium
  where: "AC6 Phase 3 findings_by_anchor / union-find pseudocode"
  finding: "The proposed N-way bucket shape is keyed as {anchor: {reviewer: finding}}, so two findings from the same reviewer with the same normalized anchor overwrite each other at findings_by_anchor.setdefault(primary, {})[slug] = f. That changes current combine.py behavior and can silently drop a finding before disposition; it also keeps cross_ref matching from ever respecting finding_index. Store per-finding IDs or lists per reviewer and add a falsifying duplicate-same-anchor test."
- severity: medium
  where: "AC3 helper scripts _run_reviewer.sh and _install_reviewer_launchd.sh"
  finding: "The new helpers are executed directly by the 5-line drivers, but the spec never requires them to be executable. Files created by apply_patch land 0644 unless the builder runs chmod, so run-codex-reviewer.sh would fail with Permission denied when it execs _run_reviewer.sh. Add an explicit chmod +x implementation step and an AC3 assertion that both new helpers are executable."
---

# Codex review

The F1 timeout clarification and AC7b regression shape are implementable, and the F2 union-find direction fixes the prior transitive-chain issue. I still found three patchable implementation gaps above, so this should take one more patch round rather than proceed terminally.
