---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 5
reviewer: "codex"
artifact_sha: "28f70ee0595ab062cd6bef628c85a0cadfabf119"
completed_at: '2026-07-16T03:22:29Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC6 publication marker and annotated-tag paragraph"
    finding: "Release identity remains underspecified: there is no exact tag ref or release name, explicit GitHub prerelease flag, canonical marker and approval-tuple byte encoding, hash algorithm for the approved tuple hash, or fixed tagger identity, timestamp, and message framing. Consequently the deterministic tag-object SHA and exact ambiguous-response readback are not independently falsifiable. Name the schema and implementation path, define these bytes and metadata exactly, and add governance fixtures that independently derive the marker and tag SHA without creating a fourth release asset."
  - severity: "medium"
    where: "AC6 empty-namespace and staged-publication paragraphs"
    finding: "The workflow proves an empty namespace only before its first write; normal-response stages and the final success check do not require an exhaustive paginated namespace readback. Workflow concurrency does not serialize manual or API tag and release mutations, so foreign state could appear after the initial check while this run still declares success. Require each stage to accept only the exact same-run state produced so far and require a final fully paginated postcondition of one marked published prerelease, one expected annotated tag, exactly the three release assets, and no other tag, release, or asset."
  - severity: "medium"
    where: "AC6 failure cleanup paragraph"
    finding: "Cleanup names only the same-run draft, assets, and tag. If the publish update succeeded, or ambiguous-response readback proves that it succeeded, a later verification failure leaves a marked published release that is no longer a draft even though the API permits deleting it. Define cleanup for the exactly marked release object in either draft or published state, require exact-content ownership before deletion, and read back every attempted deletion; uncertain or foreign state must remain blocking."
  - severity: "medium"
    where: "AC5 deterministic archive contract and AC6 expected-manifest-hash computation"
    finding: "AC6 assumes a founder-local build produces the same manifest hash as the workflow build, but AC5 does not fully pin tar format and long-path policy, gzip compression and header normalization, or the release job runner and Node/npm versions. Two builds on one host do not prove this cross-host equality. Define the canonical tar and gzip byte contract, pin the release build environment, and add a fixed-fixture digest assertion exercised by both quality runners, or require the pre-dispatch computation to run in the identical pinned environment."
---
