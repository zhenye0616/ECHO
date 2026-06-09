---
item_id: "2026-06-08-099-code-owned-sidecar-writer"
round: 2
reviewer: "codex-ops"
artifact_sha: "53e3d7138e5586d00aac01102c2f76029ffb9381"
completed_at: '2026-06-09T06:12:12Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1/AC2"
    finding: "The spec still allows default no-clobber finalization via direct open(O_CREAT|O_EXCL). That closes the existence TOCTOU but exposes the canonical sidecar path before the full validated content is written; an interrupted unattended run, disk-full write, or process kill can leave a truncated *.review.md that blocks reruns and later fails validation. Require same-directory temp write, close, validation, then atomic no-clobber publish via os.link or an equivalent no-replace rename; reserve direct canonical writes for no path."
  - severity: "medium"
    where: "Sidecar descriptor contract / AC1"
    finding: "target_path remains caller-supplied without an explicit confinement rule. A malformed unattended descriptor can write a valid sidecar to the wrong item path, outside backlog/pending_review, or to an unexpected absolute/parent-relative location, especially with --replace. Require emit-sidecar.py to resolve the repo root, reject absolute paths and '..', and enforce target_path == backlog/pending_review/<item_id>.review.md before staging any output."
  - severity: "medium"
    where: "AC7"
    finding: "The AC5 gate test requires an invalid committed *.review.md, but the spec does not require the shell test to isolate that committed fixture. A naive implementation can git-add or leave dirty pending_review artifacts in the operator checkout when a test fails. Require test-emit-sidecar.sh to run the gate checks inside a disposable temp git repo/worktree with a cleanup trap and no writes to the caller's index or working tree."
---
