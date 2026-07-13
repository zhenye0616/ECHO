---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 3
reviewer: "codex"
artifact_sha: "b86104c8fad4211f90df7486f5460a7bb79b3195"
completed_at: '2026-07-13T21:52:56Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC1, AC5, and AC7 — extraction/build lock lifecycle"
    finding: "The extractor holds `/Users/zhenye/Desktop/.echo-brain-extraction-133.lock` through every AC7 gate, but AC7 invokes `npm run build:artifact` and AC5 requires that command to acquire the same atomic-mkdir lock. A conforming build therefore fails on its own live lock. Specify either a distinct artifact-build lock or an exact token-checked reentrant ownership protocol, including acquire, release, resume, competing-process, and stale-owner behavior."
  - severity: "high"
    where: "AC1 and AC8 — publication recovery and immutable clean HEAD"
    finding: "Renaming staging and marking the lifecycle `published` are separate operations. A crash after rename leaves an existing final directory that the stated retry rules must refuse, so the run cannot be completed or safely resumed. In addition, updating the repository-owned `.echo-extraction.json` after verification either dirties the final tree or requires a post-verification commit whose HEAD was not used to build the artifact. Define a recoverable publication protocol for a cryptographically matching run and place mutable lifecycle state outside the candidate HEAD, or otherwise specify how the final clean HEAD, marker, and artifact manifest remain identical and verified."
  - severity: "medium"
    where: "AC1 and Tests — extractor ownership and invocation"
    finding: "No executable path, owner, command line, or resume/fault-injection flags are specified for the extractor whose behavior `tests/migration/extraction-lifecycle.test.ts` must exercise. The allowed files name only the final repository and migration record, leaving the pre-publication mechanism unowned. Add the exact extractor path and invocation contract, explain how it is bootstrapped before the final repository exists, and extend `files_to_modify` if any orchestrator-side implementation is required."
  - severity: "medium"
    where: "AC6 and AC7 — isolated test-parity proof"
    finding: "During AC7 the source repository is unreadable, while the standalone repository records only the old blob ID and destination metadata. An unrelated Git repository cannot reconstruct the pre-rewrite bytes from that blob ID, so `check-test-parity.mjs` cannot prove that only allowlisted literals changed. Require durable normalized source baselines or hashes computed during extraction, define the normalization and substitution algorithm, and clarify that the eight-file parity count excludes the additional synthetic end-to-end test from destination-count equality."
---
