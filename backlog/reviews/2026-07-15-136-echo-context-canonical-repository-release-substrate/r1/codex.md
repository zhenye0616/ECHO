---
item_id: "2026-07-15-136-echo-context-canonical-repository-release-substrate"
round: 1
reviewer: "codex"
artifact_sha: "f62b6f503176b8c8367153a6647786d342b6948c"
completed_at: '2026-07-15T22:23:56Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC5 and AC6 — source artifact build and founder release approval"
    finding: "The artifact SHA-256 must be known before founder approval, but the guarded workflow is then required to build the artifact, while AC5 already builds it twice. This leaves the approved object and the build-once boundary ambiguous. Patch the protocol to build once in an unprivileged job from the landed SHA, persist an immutable artifact identified by run ID, artifact ID, and digest, present its complete tuple for founder approval, and have the protected publish job download, rehash, and publish those exact bytes without rebuilding. Update the workflow-policy test to enforce that separation."
  - severity: "high"
    where: "AC4 and AC6 — source-release.yml authorization and atomic publication"
    finding: "The release workflow lacks concrete trigger, ref, actor, concurrency, and collision rules. Patch the spec to name the protected environment and authorized founder identity; require explicit SHA, version, and expected hashes; prove the SHA equals canonical main; re-read repository ID, owner, and private visibility immediately before publication; serialize releases; reject pre-existing mismatched tags, releases, or assets; forbid clobbering; and read back the annotated tag and uploaded asset hashes before success."
  - severity: "high"
    where: "AC1 and AC4 — full-history secret scan bootstrap"
    finding: "The mandatory pre-publication scan runs before tools/secret-scan.sh exists in the baseline, and no scanner, pinned version, ruleset, installation source, or exact command is specified. Patch AC1 with a reproducible bootstrap scanner and immutable version or digest, exact configuration and invocation, full-ref and non-shallow coverage, redacted output contract, and ownership. AC4 must then make the committed scanner equivalent and test the pre-push and post-push commands."
  - severity: "medium"
    where: "AC3 and AC4 — executable quality gate and repository rules"
    finding: "The spec refers to scripts, named checks, and a scripted fresh-clone run without defining their names or paths, so CI policy tests and hosting-rule readback cannot assert the same contract. Patch package.json with exact script names and commands, name the fresh-clone driver, workflow/job IDs, and required status contexts, and specify the exact branch-protection or ruleset fields including approval count, strictness, bypass actors, force-push, and deletion settings."
  - severity: "medium"
    where: "AC5 and AC6 — archive, manifest, and release asset format"
    finding: "It is unclear whether artifact-manifest.json is inside the archive whose own size and hash it records, which risks a recursive manifest, and AC6 alternates between one private asset and three emitted files. Patch the format to define the manifest as a sidecar or otherwise remove self-reference, specify canonical JSON and checksum-file encoding, the complete tar include/exclude set and root layout, modes, timestamps, gzip metadata, exact release asset names, and the verifier inputs used by the fresh-clone acceptance run."
---
