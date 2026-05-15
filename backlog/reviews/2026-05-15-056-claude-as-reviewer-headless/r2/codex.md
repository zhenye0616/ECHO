---
item_id: "2026-05-15-056-claude-as-reviewer-headless"
round: 2
reviewer: "codex"
artifact_sha: "5207612bf11241a01c81ef2d4ab1483553195b90"
completed_at: '2026-05-15T23:45:10Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC2 combined.schema.json option plus Out of Scope no combine.py edits plus AC9 combined-schema test"
    finding: "AC2 still permits the preferred patternProperties route for claude_response, but combine.py at this SHA discovers response fields only from combined.schema.json properties via _schema_response_fields(). If the builder follows the preferred regex option while Out of Scope forbids combine.py edits, build_combined() will not emit claude_response at all; AC9 only validates a synthetic combined.md and would not catch the missing emitted field. Patch the spec to require an explicit claude_response property, or include combine.py in scope and add a build_combined() test that proves a claude-requested round emits claude_response."
  - severity: "high"
    where: "AC7 fail-open/fail-closed split and AC9 install-context fail-closed test"
    finding: "The install-context contract requires changing tools/review-queue/_install_reviewer_launchd.sh, but that file is absent from files_to_modify and the current script only recognizes --smoke, writes the plist before smoke, and has no --install-context or test plist/launchctl isolation path. A builder cannot satisfy AC9's `tools/review-queue/_install_reviewer_launchd.sh claude --smoke --install-context` assertions within the declared file scope. Add the installer to files_to_modify and spell out the required flags/test hooks and cleanup/no-plist behavior."
  - severity: "medium"
    where: "AC5 part 3 Option B argv-style template"
    finding: "The Option B example includes '<' as an argv element under shell=False. That is not stdin redirection; codex or claude would receive literal '<' and the prompt path as arguments, so the prompt body would not be delivered on stdin. Either forbid '<' in argv templates and require an explicit stdin_from field, or keep Option A as the only allowed implementation. The AC9 mock should assert the child process receives the prompt body on stdin, not just that the prompt path appears in argv."
  - severity: "medium"
    where: "AC2 reviewers-config required fields plus AC5 part 1 loader validation plus AC9 all-4-slugs assertion"
    finding: "The spec makes invoke_command required for every roster entry and AC9 asks for codex, codex-ops, cursor, and claude to each carry one, while AC5 is only a headless-wrapper mechanism and cursor is mode=ide. Requiring a WT/PROMPT command on the IDE row either forces a fake cursor command into the source of truth or makes the loader reject the existing cursor row. Patch the contract to make invoke_command required and token-validated only when mode=headless, with cursor allowed to omit it."
---

# Codex review

Verdict: proceed_after_patches.

The r2 patch set closes the first-round core issues, but the spec still leaves two build-blocking paths ambiguous: the combined-schema regex option does not match the current combine.py discovery mechanism, and the install-context acceptance tests require installer changes outside the declared file scope. The two medium findings are smaller but should be patched before claim so the builder does not choose a broken argv strategy or encode a meaningless headless command for the IDE reviewer row.
