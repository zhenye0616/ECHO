---
item_id: "2026-06-02-087-reviewer-invocation-argv-contract"
round: 3
reviewer: "codex-ops"
artifact_sha: "887fbe1cf2112458140ecb28a0114a03adc4c088"
completed_at: '2026-06-03T03:44:43Z'
verdict: "proceed"
findings: []
---

# codex-ops review

No operational/runtime findings. The r3 artifact now keeps the prompt path out of argv and tests it as stdin, requires the wrapper to observe the gate rc plus a non-empty argv before any exec, keeps reviewer invocation on `reviewer-bindings.json` without changing sandbox or commit ownership, and leaves the legacy `reviewers.json.invoke_command` retirement explicitly out of scope.
