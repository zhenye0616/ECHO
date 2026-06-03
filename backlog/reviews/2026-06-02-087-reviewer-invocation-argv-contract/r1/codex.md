---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 1
reviewer: "codex"
artifact_sha: "0fc8a8cc0d817b9f3657aa9cda3aaa968e77ff42"
completed_at: '2026-06-03T03:09:49Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:11-18,72,76; package.json:12-21 at 0fc8a8c"
    finding: >-
      The spec introduces tools/review-queue/reviewer-bindings.json as runtime state, but package.json's files whitelist currently includes only coord-roles.json, reviewers.json, and schemas/** under tools/review-queue. Because AC5 forbids touching files outside files_to_modify and package.json is not listed, a literal build either leaves the new binding file out of npm-packaged installs or violates AC5. Patch the spec to allow the package manifest update and add a packaging/manifest assertion, or explicitly prove this config is never consumed from the packaged artifact.
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:72-75; tools/review-queue/_run_reviewer.sh:124-168 at 0fc8a8c"
    finding: >-
      AC2 says _reviewer_gate.py should resolve an argv vector and _run_reviewer.sh should exec it, but the spec does not define the lossless handoff format from Python to Bash or require a spaces/metacharacter regression. That is the exact boundary currently protected by shlex.quote -> bash -c; if a builder replaces it with whitespace splitting, the bash-c seam is gone but worktree/prompt paths can still break or become injectable. Patch AC2/AC4 to require a concrete safe representation, for example JSON decoded by Python execvp or NUL-delimited argv consumed by Bash mapfile -d '', plus a WT/PROMPT-with-spaces test and a clarification that stdin_from carries the prompt path for today's stdin-driven reviewers.
---

# Codex Review

Verdict: `proceed_after_patches`.

The narrow split is the right implementation shape and it correctly keeps `agent_sandbox` and `commit_policy` descriptive for 087. The two patches above keep that work shippable: include the new binding file in packaged installs, and pin the argv handoff so the shell-string removal does not turn into unsafe argv reconstruction.
