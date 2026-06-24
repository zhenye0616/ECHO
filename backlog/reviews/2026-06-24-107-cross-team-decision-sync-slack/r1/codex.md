---
item_id: "2026-06-24-107-cross-team-decision-sync-slack"
round: 1
reviewer: "codex"
artifact_sha: "a7451e2742d60f9d98bb7b3ff2d0f6417c357f3f"
completed_at: '2026-06-24T04:44:39Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "Open questions for spec-review"
    finding: >-
      The spec explicitly leaves the shared decision store unresolved, but AC1-AC3 require cross-team reads and confirmed shared writes. This is not buildable until the spec chooses one physical store topology, names the owning module/process, and updates files_to_modify/tests for the chosen write/read path.
  - severity: "high"
    where: "AC3 / AC4"
    finding: >-
      The piggyback extractor is required to submit candidate decisions to the propose-confirm gate, but the spec does not define a concrete callable interface for Claude/Codex agents: no command, MCP tool, HTTP endpoint, Slack webhook, payload schema, auth context, or target file is specified. Patch the spec with the exact invocation the skill/snippets will use and the responder/server code that receives it.
  - severity: "medium"
    where: "AC1 / AC2"
    finding: >-
      The peer-versus-self scope rule is stated, but the implementation contract is underspecified. A Slack responder cannot enforce "peer shared decisions only, own raw drill-down only" without an identity and store-routing model that maps Slack users to machine-scoped stores. Add that mapping/routing design and tests that prove a user can reach their own raw store while the same request against a peer raw store is refused.
  - severity: "medium"
    where: "AC5"
    finding: >-
      The shared decision atom schema lists required fields and says append-only/latest-wins, but the spec does not define dedupe_key normalization, ordering semantics for latest-wins, or the concrete query assertion that proves re-confirming appends instead of mutating. Add the schema contract and tests for duplicate subjects, latest selection, and immutable prior atoms.
---

## Verdict

Pushback. The direction is coherent, but the artifact is not yet buildable because the shared store and submission interface are still open design decisions. Resolve those before promoting this from `proposed` to `ready`.
