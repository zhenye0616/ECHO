---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 3
reviewer: "codex-ops"
artifact_sha: "887fbe1cf2112458140ecb28a0114a03adc4c088"
completed_at: '2026-06-03T03:46:07Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74-75"
    finding: "AC1/AC2 move reviewer invocation to reviewer-bindings.json and carry the prompt through stdin_from, but the new binding shape still does not say where the unattended wrapper gets the concrete slash-command prompt path. Today _run_reviewer.sh derives PROMPT from the slash_command returned by _reviewer_gate.py/reviewers.json before it resolves invoke_command. Post-087 a launchd tick can either keep consulting legacy reviewer config for prompt selection, weakening the one-runtime-source rule, or derive the prompt path ad hoc with no test coverage. Pin the prompt source in the binding (or an explicit deterministic derivation from reviewer name) and add an AC4 regression that a headless tick resolves the expected .claude/commands/review-queue-<reviewer>.md path without reading reviewers.json.invoke_command."
---

# codex-ops review

One operational finding remains. The r3 artifact now closes the argv/stdin split and gate-rc failure path, but it still needs to pin how the launchd wrapper resolves the prompt file after invocation moves to `reviewer-bindings.json`.
