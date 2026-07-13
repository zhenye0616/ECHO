---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 8
reviewer: "codex-ops"
artifact_sha: "0f4063700b43a79b7f6f1b6375a5502bcd186bc3"
completed_at: '2026-07-13T23:58:30Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — exported-head dependency installation"
    finding: "The lockfile install occurs before the stated network/filesystem sandbox, so npm lifecycle scripts or local/Git resolutions can read host credentials or Project_echo and write outside scratch while parity still passes. Require npm ci in an allowlisted environment with scratch cache/temp/config, reject file/link/Git resolutions, and either disable lifecycle scripts or run explicitly audited required scripts inside the same filesystem, credential, and PATH containment; state the install-time network policy."
  - severity: "medium"
    where: "AC1 and AC6–AC7 — Git environment and executable resolution"
    finding: "Disabling global/system Git config does not neutralize ambient GIT_DIR, GIT_WORK_TREE, index/object/config-injection variables, replace refs, or an interactive-shell PATH. These can redirect target writes, alter the pinned source object, or make verification depend on undeclared Homebrew tools. Require scrubbed environments for extraction and exported verification, GIT_NO_REPLACE_OBJECTS=1, explicit repository paths, controlled Git/Node/npm resolution with declared-version checks, and hostile-environment tests."
  - severity: "medium"
    where: "AC5–AC6 — reviewer/watcher concurrency parity"
    finding: "The listed tests cover publication and convergence only at the contract level; they do not require collision tests for duplicate same-reviewer ticks, watcher reads during response publication, or concurrent upstream pushes and cleanup failures. Add fixture cases proving single atomic publication, no partial watcher combine, preservation of unrelated upstream commits during retry, dirty-tree refusal without autostash loss, and durable operator-visible error evidence before ephemeral-worktree cleanup."
---
