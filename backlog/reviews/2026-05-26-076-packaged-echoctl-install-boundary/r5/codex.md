---
item_id: "2026-05-26-076-packaged-echoctl-install-boundary"
round: 5
reviewer: "codex"
artifact_sha: "2df181d10a46d8de00e08bf2644b94f88a1142dd"
completed_at: '2026-05-27T05:53:43Z'
verdict: "proceed"
findings: []
---

## Findings

No findings.

## Convergence Notes

The r5 artifact resolves the two r4 Codex blockers: AC3.5 now makes `home`, `data-dir`, and `db-path` required `status` output, and AC3.4.1 now separates preflight-failure exit-2 cases from post-bootstrap probe-timeout exit-1 cases for both `restart` and recovery-load `start`.

I also rechecked the shell-smoke wording against the current `tests/cli/shell-reachable.test.ts` shape. The spec now consistently drives cleanup through `daemon stop` plus `daemon uninstall` with the full override set, and it no longer leaves a SIGTERM cleanup path for the packaged LaunchAgent smoke.
