---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 9
reviewer: "codex-ops"
artifact_sha: "19449fd0c8a57f132ad11e87a786ef36ae12d450"
completed_at: '2026-07-16T05:19:14Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 — baseline preflight and initial push"
    finding: "The preflight precedes a human checkpoint, but the push contract requires neither an immutable-OID refspec nor an atomic absent-ref expectation. A local main move or concurrent remote creation can publish or adopt state before readback detects it. Require a final pre-write check and a create-only push of 0cf7b006eba665c0bf55e82ff04da70f19f01ebb to refs/heads/main, with any pre-existing ref—even the same OID—failing."
  - severity: "medium"
    where: "AC3 — fresh-clone source mode; Tests — scripted fresh-clone acceptance"
    finding: "Source mode does not require --source-sha to equal the clone's full HEAD, so it can test and lint HEAD while building and verifying a different reachable commit. Require equality before building and add a wrong-source source-mode fixture."
  - severity: "medium"
    where: "AC6 — source-release protected environment; Tests — hosting-controls fixtures"
    finding: "The verifier binds only the custom deployment-policy name main, not its ref type. A tag policy named main can satisfy the stated readback while blocking the refs/heads/main release job. Require the sole policy to be exactly name main and type branch, fail closed on a missing or unreadable type, and add wrong-type and missing-type fixtures."
  - severity: "medium"
    where: "AC6 — empty-namespace preflight and annotated-tag push; Tests — concurrency and release-identity fixtures"
    finding: "The namespace preflight is only a snapshot, and an ordinary push can report an up-to-date success if an identical expected tag appears before the push, causing the workflow to adopt state it did not create. Require an atomic create-if-absent operation that fails even for an identical pre-existing ref, record proof that this run created the ref, and test that interleaving."
  - severity: "medium"
    where: "AC6 — tag-before-draft sequence; Tests — release-identity fixtures"
    finding: "The tests require eventual failure for invalid or mutated tags but do not enforce the required write ordering. An implementation could create the draft before tag verification or upload assets before draft/tag readback and still pass those fixtures. Add trace fixtures proving exact tag-push, tag-verification, draft-create, draft-readback, asset-upload, and publish ordering; require zero draft writes after tag-verification failure and zero asset or publish writes after draft-readback failure."
---
