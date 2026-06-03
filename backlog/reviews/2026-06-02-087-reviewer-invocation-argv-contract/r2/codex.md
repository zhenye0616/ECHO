---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 2
reviewer: "codex"
artifact_sha: "77ce84a51f2ae112d83473551d0167c8d907100e"
completed_at: '2026-06-03T03:24:48Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:74-77"
    finding: >-
      The r1 prompt-delivery patch is still internally inconsistent: AC1 and AC4(vi) correctly say the prompt path must not appear in any current headless argv, but AC2/AC4(v) still require a {{PROMPT}} path-with-spaces substitution to survive the Python-to-Bash handoff as one argv element. A builder cannot satisfy both literally: either the prompt path becomes argv, violating the no-prompt-in-argv contract, or the test is nonsensical because stdin_from is not argv. Patch the regression to split the two channels: {{WT}} survives as one argv element, and a space/metacharacter prompt path survives as the single stdin redirection operand via the resolved stdin_from value, for example `exec "${ARGV[@]}" < "$STDIN_FROM"`.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:11-20,24,75,78; tools/review-queue/_reviewers.py:117-136; tools/review-queue/schemas/reviewers-config.schema.json:38-48"
    finding: >-
      The spec claims one invocation source of truth and says reviewer-bindings.json supersedes the reviewers.json shell-string invoke_command, but AC5 forbids touching files outside files_to_modify while the current reviewers loader/schema still require every headless reviewer to carry a non-empty invoke_command containing {{PROMPT}}. If those files stay untouched, the obsolete shell-string invocation remains mandatory and packaged, so the project still has two invocation configs. If the builder removes or relaxes it, they violate AC5 because reviewers.json, _reviewers.py, and reviewers-config.schema.json are not in files_to_modify. Add the legacy roster/schema files to scope and test that runtime invocation no longer depends on reviewers.json.invoke_command, or explicitly narrow the claim to one runtime-read source and mark the old field as legacy-unused with an assertion that no wrapper/installer path reads it.
---

# Codex Review

Verdict: `proceed_after_patches`.

The r2 spec correctly keeps 087 behavior-preserving: no read-only flip, no commit move, and no SLA migration. The remaining gaps are both patchable, but they are build-contract issues at the exact argv/stdin and source-of-truth boundaries this item is meant to stabilize.
