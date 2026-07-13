---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 6
reviewer: "codex"
artifact_sha: "780fb99a7384626e89be7b293f444e776d712e45"
completed_at: '2026-07-13T22:58:28Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC1 — publication and discard protocol"
    finding: "The record is published before the final target, but a crash or target conflict after the record rename leaves a run-specific record containing run/staging IDs and extraction time. A fresh run cannot accept that record as byte-identical, while discard only explicitly archives the pre-rendered record and does not define ownership-checked removal of the published record. This contradicts the promised pre-target discard-and-fresh-extract path. Define a crash-safe rollback/archive or reconciliation protocol for the published record, including failpoints after its rename/fsync and before target publication."
  - severity: "high"
    where: "AC1 and AC7 — process registration and hard-kill recovery"
    finding: "Atomic claim creation is not paired with a durable initialization and child-launch handshake. A hard kill can occur after mkdir but before valid state is fsynced, or after a child/process group starts but before its identity is durably recorded; discard then cannot safely prove liveness or absence. Specify atomic state writes and directory fsyncs plus a supervisor/group protocol that makes process identity durable before executable work begins, and test the claim-to-state and spawn-to-registration failpoints."
  - severity: "medium"
    where: "AC6 — canonical evidence binding"
    finding: "The required external ready_to_publish binding has no path, schema, owner, publication point, or recovery behavior and resembles a retained checkpoint despite AC1 forbidding checkpoint reuse. Remove it or define it as an immutable run-local evidence artifact within the four-state lifecycle, add its path to the allowed outputs, and test that it cannot authorize resume or reuse."
  - severity: "medium"
    where: "AC8 — control binding after the evidence-only commit"
    finding: "The requirement to accept Project_echo HEAD advancement only by the generated-record commit is not falsifiable as written. Define the exact ancestry and tree-diff check, such as one descendant commit whose sole changed path and bytes are the bound migration record, and add tests that accept that commit while rejecting an unrelated commit that leaves all control blobs unchanged."
---
