---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 4
reviewer: "codex"
artifact_sha: "8d863930d444b2cef91739f104039f12e5024675"
completed_at: '2026-07-16T03:33:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 canonical transaction record and AC2 authority-fence serialization"
    finding: "The exclusive lock is prescribed on the canonical transaction record, but that record is absent in an allowed startup state and is also the replaceable commit point. Locking its current inode cannot serialize a contender that opens a replacement inode, leaving the start-versus-activation race open. Name a stable sibling lock object that is never replaced with the record, define descriptor-relative no-follow creation for the initially absent state, require every transition and rollback-full start to acquire it before reading authority state, and hold it through either the complete authority-bearing startup handoff or neutralization/quiescence plus phase commit. Add a barrier test covering record creation and atomic replacement while a contender is paused."
  - severity: "medium"
    where: "files_to_modify and AC8"
    finding: "AC8 requires the subsequent evidence-only commit to update this item's completed frontmatter, but files_to_modify lists proposed, ready, claimed, and pending_review paths without backlog/complete/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md. Add that exact completed path with an evidence-readback rationale so the required SHA-authority update is authorized."
  - severity: "medium"
    where: "AC5 deterministic cross-repository candidate builds"
    finding: "Each repository's candidate manifest must bind both repositories' source SHA/tree inputs, but the spec gives only separately invoked npm script names and does not define how either build receives and verifies the other repository's identity. Specify the exact flags or committed manifest handoff, build order and owner, clean-tree/readback checks, and cross-manifest consistency assertion; add a negative test that swaps the counterpart SHA or tree and requires candidates:verify to fail."
---
