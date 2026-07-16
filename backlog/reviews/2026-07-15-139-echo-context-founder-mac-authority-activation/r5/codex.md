---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 5
reviewer: "codex"
artifact_sha: "2bdfbf45e7eb107841d5a1a16a897bd1b952b8ff"
completed_at: '2026-07-16T04:11:18Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC4 and AC6 — quiescence and mixed-daemon retirement ordering"
    finding: "AC4 provides only a point-in-time stop and exclusive-lock probe, while persistent launchd disable, plist relocation, and the bootstrap probe occur in AC6 after checkpointing and migration. A login, KeepAlive reload, or crash/resume can therefore restart the mixed daemon and mutate the source between the accepted checkpoint and the authority commit. Require the landed controller to establish and journal the durable no-restart fence before AC4 creates the checkpoint, hold it through the prepared commit, and on every resume re-prove job/PID/listener/writer absence and revalidate the source DB/WAL/sidecar cut and digest before using the backup. If item 138 cannot provide that ordering, stop before checkpoint mutation and require a new source item."
  - severity: "medium"
    where: "AC8 and AC10 — committed continuity-row schema and daily expected set"
    finding: "The purportedly closed row schema still lacks exact serialized keys and scalar constraints for generation, plan source-slot index, and UTC timestamp; AC10 adds an LA calendar date to the uniqueness key without explicitly deriving it from the timestamp; and a plan with no slot for a disabled adapter can silently shrink the mechanically expected set. Specify the exact keys/types, current-generation and plan-membership checks, timestamp-to-America/Los_Angeles-date derivation, per-row interval, and observed-count rule. Require plan validation to materialize stable slots for all six adapters, including disabled ones, derive the expected set as seven civil dates multiplied by those slots, and add negative checks for extra fields, malformed values, plan-unknown keys, duplicates, and zero-count observed rows."
  - severity: "medium"
    where: "AC1 and AC6 — post-approval artifact handling"
    finding: "AC1 says that after founder approval nothing reinstalls and only artifact-level reread verification occurs, but AC6 requires installing the approved residual/rollback-full package and replacing or neutralizing the global echoctl package and shim. Distinguish the permitted one-time live deployment from forbidden rebuilding or dependency reinstallation: prescribe the exact artifact deployment entrypoint, prohibit lifecycle/build scripts and byte mutation, and require installed-byte hash readback against the founder-approved hashes."
  - severity: "medium"
    where: "files_to_modify; AC1 and AC7 — new source-item failure gate"
    finding: "AC1 and AC7 say the item creates a new proposed source item on a source-capability failure, but files_to_modify authorizes only item 139's exact proposal path and does not assign proposal creation to an authorized strategist. Patch these gates to stop and escalate proposal creation to the strategist, or explicitly authorize and identify the new proposal's required repository artifacts and ownership."
---
