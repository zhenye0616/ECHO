---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 1
reviewer: "codex-ops"
artifact_sha: "0fc8a8cc0d817b9f3657aa9cda3aaa968e77ff42"
completed_at: '2026-06-03T03:15:11Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:72-75"
    finding: "AC1 tells the builder to put {{PROMPT}} as an argv array element while AC2 also redirects stdin_from. Today's codex/codex-ops/claude commands pass the prompt only through stdin (`- < {{PROMPT}}` or `-p < {{PROMPT}}`). If implemented literally, a launchd tick can start the reviewer with a prompt path as an extra argv or with no stdin prompt, causing an unattended hang or a review of the wrong input. Patch the binding contract so current headless bindings use stdin_from={{PROMPT}}, keep the codex `-` argv sentinel, omit {{PROMPT}} from argv, and add an AC4 assertion that no current headless argv contains the prompt path."
  - severity: "medium"
    where: "backlog/ready/2026-06-02-087-reviewer-invocation-argv-contract.md:14-18; tools/review-queue/_install_reviewer_launchd.sh:62-104"
    finding: "087 removes `_reviewer_gate.py --print invoke_command` and moves invocation data to reviewer-bindings, but `_install_reviewer_launchd.sh` is not in files_to_modify and currently uses that removed gate path for install-context preflight. After 087, any fresh install or repair of a headless reviewer's LaunchAgent can fail before writing the plist, even if existing scheduled jobs keep running. Include the installer migration/back-compat in AC2/AC4, or keep a compatibility resolver until the installer is moved."
---

## Review

Ops lens: this is the right narrow split from 085. It keeps the current child self-commit and danger-full-access behavior as data, so I am not re-raising the deferred 087b migration here. The two issues above are about what breaks when the current launchd/headless path runs unattended after the argv migration.
