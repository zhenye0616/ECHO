---
item_id: "2026-06-01-083-init-registers-claude-code-mcp"
round: 2
reviewer: "codex-ops"
artifact_sha: "de4620a122e659b40060a912e03e8cbd8822d6f6"
completed_at: '2026-06-02T07:11:44Z'
verdict: "proceed"
findings: []
---

# codex-ops review

Verdict: proceed.

## Findings

No findings.

## Ops notes

R2 focused on the five r1 patches. The patched spec now requires duplicate/stale-URL reconciliation instead of swallowing Claude's exit-1 duplicate, bounds the external `claude mcp` spawns with non-interactive stdio and captured output, makes the foreign smoke assertion a mechanical non-zero hard-fail, puts the local-shadow escape hatch in doctor copy, and corrects the probe-before-daemon wording.

I also checked the installed Claude CLI in a temporary HOME for the local-shadow edge: `claude mcp get echo` reports the local entry when both local and user entries exist. The spec explicitly keeps active shadow detection/resolution out of scope and covers the operational recovery path with doctor remediation copy, so I am not treating that residual risk as an R2 blocker.
