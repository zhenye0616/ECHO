---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 19
reviewer: "codex"
artifact_sha: "98250a763cb24326b3ac989f7488399470d4a3ed"
completed_at: '2026-07-16T14:06:38Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC4 operation-host contract and AC6 post-publication fresh-clone acceptance"
    finding: "The required post-publication fresh no-local clone has no legal production path: the host exposes only land, collect, and publish; target workers are forbidden to spawn; and no finite RPC or child capability invokes fresh-clone-acceptance.sh, whose release mode spawns npm and Git children. Treating it as part of publish also truncates its fixed 3,700-second aggregate under publish's 1,800-second aggregate. Add a dedicated authenticated post-publication acceptance mode and entrypoint with exact credential/download, process-group, cleanup, and deadline contracts that preserve the verifier budget, plus executable end-to-end tests, or explicitly revise the topology and budgets."
---
