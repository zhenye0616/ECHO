---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 9
reviewer: "codex"
artifact_sha: "19449fd0c8a57f132ad11e87a786ef36ae12d450"
completed_at: '2026-07-16T05:18:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 — protected-environment policy; Tests — hosting-controls fixtures"
    finding: "The verifier constrains the custom deployment-policy name set to the single literal main but never constrains each policy's type. GitHub distinguishes branch and tag policies, so a policy with name main and type tag could satisfy the written check without authorizing refs/heads/main. Require the fully paginated set to contain exactly one policy with name main and type branch, and add missing-type and wrong-type fixtures."
  - severity: "medium"
    where: "AC6 — annotated-tag publication sequence; Tests — release-identity fixtures"
    finding: "The tag must carry an exact expected message, but the spec defines only a message stating the version and source SHA, without a literal template, field labels, encoding, or final-newline rule. Define the byte-exact UTF-8 annotation template and make creation, readback, and negative whitespace/newline fixtures use that reviewed oracle."
  - severity: "medium"
    where: "AC6 — lost or ambiguous external-write responses; Tests — lost-response fixtures"
    finding: "The workflow must record every attempted write, but the prescribed mechanism does not require a write-ahead attempt marker. A runner or process loss during tag push, draft creation, asset upload, or publish can prevent post-call logging. Require a flushed attempt marker in the workflow log before each mutation, permit only read-only reconciliation afterward, and assert marker-before-call ordering under injected timeout or termination."
---
