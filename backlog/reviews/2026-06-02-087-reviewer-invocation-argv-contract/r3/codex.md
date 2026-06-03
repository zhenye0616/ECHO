---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 3
reviewer: "codex"
artifact_sha: "887fbe1cf2112458140ecb28a0114a03adc4c088"
completed_at: '2026-06-03T03:39:47Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1/AC2/AC4(x), lines 74-77"
    finding: >-
      The binding shape lists argv/stdin_from/cwd but does not say where the wrapper gets the concrete prompt/slash-command path that is redirected into stdin. In the current wrapper, PROMPT is computed from SLASH_COMMAND returned by _reviewer_gate.py before the invoke_command path is resolved. After 087, if the wrapper keeps reading reviewers.json/_reviewers.py for slash_command, the runtime reviewer invocation still depends on legacy reviewer config while AC2 says reviewer-bindings.json is the only invocation source; if it instead derives review-queue-$REVIEWER_NAME, that behavior-preserving rule is not specified or tested. Patch by making reviewer-bindings.json own an explicit prompt/slash_command/prompt_path field, or by explicitly requiring deterministic prompt-path derivation, and add an AC4 assertion that STDIN_FROM resolves without reading legacy reviewer config.
---

## Codex Review

The r2 corrections called out in the request are otherwise present: prompt delivery is separated from argv, the gate rc/empty-argv failure mode is testable, and the legacy reviewers.json invoke_command field is left as non-runtime data rather than removed in this item.

The remaining issue is the prompt-path handoff. The spec removes the old shell-string invocation source, but the wrapper still needs a source for the slash-command prompt file before it can perform `exec "${ARGV[@]}" < "$STDIN_FROM"`. That source should be in the new binding contract or explicitly derived and tested.
