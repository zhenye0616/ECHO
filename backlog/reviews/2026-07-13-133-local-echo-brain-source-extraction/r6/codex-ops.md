---
item_id: "2026-07-13-133-local-echo-brain-source-extraction"
round: 6
reviewer: "codex-ops"
artifact_sha: "780fb99a7384626e89be7b293f444e776d712e45"
completed_at: '2026-07-13T22:57:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — record-first publication and discard recovery"
    finding: "Publishing the migration record before the final-target rename can leave that record behind after EEXIST or a crash. Discard does not explicitly recover the published destination, and a fresh run will render different run-ID/time bytes and remain permanently blocked by EEXIST. Specify and test owned-record recovery: persist whether publication occurred; require the final target absent and no live process; compare the destination no-follow against the exact run bytes and identity; RENAME_EXCL-archive and fsync it; and refuse foreign or mutated records. Cover a crash after record rename and a foreign-target race followed by discard and a fresh extraction."
  - severity: "high"
    where: "AC7 — dependency-cache-ready acquisition before isolation"
    finding: "The network-enabled npm acquisition runs before the explicitly sanitized isolation phase, so inherited HOME, npm configuration, environment credentials, proxies, or auth settings can be read and transmitted despite the no-credentials boundary. Require acquisition itself to use env -i, a run-owned HOME and npm configuration, scrubbed auth-bearing variables, and the filesystem sandbox with only the necessary network permission broadened. Add a hostile HOME/.npmrc/environment sentinel test proving acquisition neither reads nor forwards operator credentials."
  - severity: "medium"
    where: "AC1, AC7, and AC8 — active orchestrator worktree binding"
    finding: "The tool publishes into the active orchestrator worktree without an explicit clean-tree and identity contract. A concurrent checkout, index mutation, or HEAD/branch change can put the record on the wrong lineage or make the promised evidence-only commit impossible. Bind canonical worktree/common-dir identity, branch, control HEAD, index state, and record path at preflight; require a clean index/worktree; revalidate immediately before publication; and make verify-handoff prove that the sole permitted HEAD advance is the record-only commit atop the bound control commit. Persist a visible failure on drift."
  - severity: "medium"
    where: "AC1 — durable lifecycle and PUBLISHED fact"
    finding: "The spec names a parent fsync only after final-target publication but does not define crash-durable state transitions, migration-record durability, or flushing of staged candidate contents before directory rename. Power loss can therefore leave visible target/record names with missing bytes or corrupt FAILED evidence, contradicting the claimed durable PUBLISHED fact. Require atomic temp-write, file fsync, RENAME_EXCL/replace, and directory fsync for state and record updates; flush candidate files and directories before final rename and fsync the destination parent; and add injected durability-failure tests proving PUBLISHED is never reported and the claim is never silently reusable when any persistence step fails."
---
