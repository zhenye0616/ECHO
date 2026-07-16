---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 16
reviewer: "codex"
artifact_sha: "60a8191af0eebf106e27009d11db508a4bcbc0ef"
completed_at: '2026-07-16T11:04:08Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4 target-main landing gate and AC6 publication entrypoint, lines 231-239 and 288-290"
    finding: "The irreversible controllers are not provenance-bound at launch. AC4 never requires the landing controller to execute from clean reviewed H, while AC6 authenticates only a verifier inside the new M clone, not the already-running publication controller or adapters. Require exact launches from clean detached H/M, with HEAD/tree/status and executable dependency bytes authenticated before credential or API access; stale or tampered entrypoint/module fixtures must prove zero token fetch and zero write."
  - severity: "high"
    where: "AC4/AC6 private-target authentication, lines 239 and 284-286"
    finding: "Identity and scopes are checked once, but the adapter reacquires a keyring token before each later operation. A mid-run keyring or active-account change can therefore execute a write with an unauthorised principal. Either retain one authenticated credential for the invocation or revalidate each newly fetched Buffer's user, scopes, and provenance before using that same Buffer. Define strict gh-auth-token stdout parsing, removing exactly one terminal LF while rejecting CR, NUL, extra lines, or extra bytes, and add credential-rotation fixtures."
  - severity: "high"
    where: "AC6 workflow dispatch contract, lines 253-259"
    finding: "The numeric workflow ID source, three non-correlation input names, and complete POST body are undefined, and the prescribed request omits the opt-in `return_run_details: true` needed for the asserted HTTP 200 run-details response. Bind the workflow ID through authenticated pre-POST metadata readback to the target repository, active state, and `.github/workflows/source-release-build.yml`; name the inputs exactly; and pin the canonical body with `return_run_details` outside `inputs`. Tests must reject omission/false, wrong workflow identity, and renamed or extra request fields before any POST."
  - severity: "medium"
    where: "AC4 and AC6 Git push commands, lines 237 and 292"
    finding: "Both future pushes permit ambient `pre-push` hooks and configured `push.followTags`, which can perform or add writes outside the authorised refspec before porcelain validation. Sanitize Git configuration and environment and bind explicit `--no-verify` and `--no-follow-tags` semantics in both plans. Test an executable pre-push hook and `push.followTags=true`, proving neither executes nor publishes another ref."
  - severity: "medium"
    where: "files_to_modify and AC4 implementation-review evidence, lines 229 and 233-235"
    finding: "The required fresh immutable review sidecar has no exact path or allowed files_to_modify entry, while the P_L review record must bind the sidecar's containing commit. Creating both in P_L would be self-referential, and reusing the cycle-one sidecar would not evidence the fresh review. Specify an exact sidecar path and an earlier additive commit R containing reviewer-owned bytes, require coordinator push/readback of R, then bind R/path/blob/hash from P_L; test rejection of same-commit and stale sidecars."
  - severity: "medium"
    where: "AC6 discovery polling and workflow-dispatch tests, lines 257 and 336"
    finding: "Discovery is simultaneously required to perform exactly 25 polls and to begin terminal tracking once a unique run appears, leaving early-visibility call counts undefined. Choose one executable contract, such as at most 25 polls stopping at the first unique match, and make the fake-clock oracle assert every visibility boundary with all 25 polls reserved for no-match timeout or diagnostic reconciliation."
---
