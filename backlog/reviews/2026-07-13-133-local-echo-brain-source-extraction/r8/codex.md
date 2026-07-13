---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 8
reviewer: "codex"
artifact_sha: "0f4063700b43a79b7f6f1b6375a5502bcd186bc3"
completed_at: '2026-07-13T23:52:27Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3, AC6, AC7, and AC8"
    finding: "The standalone provenance and parity checks run while Project_echo is denied, and AC8 compares the record only with the target and artifact. They therefore cannot prove that recorded source blobs, hashes, or substitutions match pinned commit `2971310441b69735cbe759293abd8c4d044bf347`; a stale source manifest paired with matching destination hashes would pass. Require an explicit read-only operator-side audit that recomputes every source blob and content hash from the pinned commit, validates declared rewrites against the committed target HEAD, and records rerunnable command and exit evidence. This need not become shipped migration machinery."
  - severity: "medium"
    where: "AC3 — Preserve file-level provenance"
    finding: "AC3 requires destination path and hash fields for every row while permitting `disposition: excluded`, although an excluded source has no destination. It also limits completeness to copied files, leaving intentionally excluded boundary inputs undefined. Specify the manifest universe and conditional schema: materialized dispositions require destination fields, while excluded rows require source identity and reason with destination fields absent."
  - severity: "medium"
    where: "AC1 — Materialize one local Git repository without shipping migration machinery"
    finding: "The absence precondition is not atomic: a check followed by `git init` can write into a directory created between those operations. Require the attended procedure to claim the path with an atomic plain `mkdir` that aborts on `EEXIST`, then run the sanitized initialization only inside that newly created directory."
  - severity: "medium"
    where: "AC5, AC7, and AC8"
    finding: "The artifact is emitted to an unspecified temporary output directory, but AC8 requires a later independent reviewer to hash and execute that exact artifact. Require a stable retained output path, ownership and permissions, and a no-cleanup-until-review rule, then record that path and artifact hash in the migration handoff."
---
