---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 20
reviewer: "codex"
artifact_sha: "672d3deffa2512d88a5b2e487d6c095d95fca75d"
completed_at: '2026-07-16T15:09:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4 — Landing authorization record / The single external write"
    finding: "The authorization does not explicitly bind a preconstructed exact merge commit M: it binds B, H, H^{tree}, a message, and a push template, while M is subsequently created with unspecified identity, timestamps, signing configuration, and ancestry checks. Those inputs do not uniquely determine M. Patch AC4 to construct and validate M before publishing the approval, require B to be an ancestor of H, verify M's ordered parents, tree, exact message, and unsigned commit bytes, bind literal M/M^{tree} and literal push argv in the committed record, then revalidate B and push only that authorized object."
  - severity: "medium"
    where: "frontmatter files_to_modify; AC4 — Landing authorization record"
    finding: "AC4 requires creating raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-target-main-landing-<approval-id>-delegated-approval.md, but that path is absent from files_to_modify. Add the dynamic approval-record path explicitly so the coordinator can satisfy AC4 without violating the modification boundary."
  - severity: "medium"
    where: "AC4 — The single external write; Tests"
    finding: "Only the push argv is concrete; the config-isolated clone/fetch, proxy and URL-rewrite rejection, remote-helper rejection, authenticated identity checks, porcelain parser, and readback commands have no exact argv/environment or implementation owner. Patch AC4 with an executable command sequence or committed tool contract, including structural porcelain parsing and evidence fields. Both pre-push and post-push readback must verify repository ID, node ID, owner/name, private visibility, default branch, and main SHA; checking only ID and main permits a transfer, rename, or visibility change to pass."
  - severity: "medium"
    where: "AC3 — release mode; Tests; Out of Scope"
    finding: "A full production release mode, release-mode deadline contract, release-review wording, and release-mode fixtures remain even though AC6 distributes no artifact files, invokes only source mode, and hosted release work is deferred. This is orphaned release-surface scope. Remove it for item 136 or rename and reframe it as a non-hosted tuple-verification mode with an explicit item-137 consumer; update the mode vectors, deadlines, tests, and AGENTS/release-review wording consistently."
  - severity: "medium"
    where: "AC3 — source-mode trace; AC6 — tuple seal"
    finding: "AC6 requires comparing the source-mode acceptance's rebuilt source-archive SHA-256, lock hash, and manifest hash with the seal, but AC3 exposes only manifest_hash from the build child and deletes T before completion. No operational output contract makes all three authenticated values observable to the coordinator. Define an exact sanitized tuple carrier or return value emitted after verification and final cleanliness checks, and add fixtures proving all three values originate from the verified manifest/archive and survive cleanup for AC6 comparison."
  - severity: "medium"
    where: "AC6 — migration record"
    finding: "The required migration-record field authority:false contradicts AC2 and the completion statement that echo-context owns source and source-artifact authority, and it is too ambiguous to distinguish runtime/state authority. Replace it with explicit source_authority, artifact_authority, runtime_authority:false, state_authority:false, and installed:false fields consistent with the authority record and manifest."
---
