---
item_id: "2026-07-15-139-echo-context-founder-mac-authority-activation"
round: 4
reviewer: "codex-ops"
artifact_sha: "fb36dd9820f3a05dda2a6a76270ab240b6a7542a"
completed_at: '2026-07-16T03:48:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC1 and Tests — disposable clone confinement"
    finding: "The echo-context suites are named with literal /Users/zhenye/Desktop/echo-context paths, which permits execution from the mutable sibling checkout despite AC1 requiring disposable pinned clones. Make every suite path clone-relative and require runner, module-resolution, and entrypoint realpath checks proving the tests execute from the exact pinned clone and consume only the candidate artifact bytes."
  - severity: "high"
    where: "AC6 and AC9 — com.echo.daemon launchd retirement and rollback"
    finding: "AC6 only bootouts and snapshots com.echo.daemon while its plist remains in Library/LaunchAgents, so a later login/bootstrap can reload it and a KeepAlive configuration can enter an unattended respawn loop. AC9 also ambiguously restores the old global package/plist. Require controller-journaled persistent disablement or protected relocation during G1/G2, prove a fresh launchd bootstrap cannot load the retired job, and restore only a compatibility path backed by the approved authority-fenced rollback-full artifact rather than unfenced package bytes."
  - severity: "high"
    where: "AC7 — rollback after live client-target drift"
    finding: "Restoring every before-image after detecting live-target drift can overwrite a concurrent unrelated edit to Claude, Codex, Cursor, or installed-adapter configuration, contradicting the preservation requirement. Require compare-and-swap recovery: restore only controller-written targets whose current bytes match their journaled after-images, leave drifted targets untouched, keep services unactivated, and record durable manual-recovery evidence when exact safe restoration is impossible. If item 138 does not already own this crash-safe behavior, block item 139 on a new source proposal."
  - severity: "medium"
    where: "AC8 and AC10 — committed evidence schema"
    finding: "The artifact calls reason codes enumerated but never defines the allowed values, verdict-to-reason combinations, exact field types, or whether event and atom counts are deltas or cumulative. Add the literal closed vocabulary and count semantics, specify when reason must be absent, and require unknown-value rejection so free-form or sensitive text cannot enter committed evidence."
  - severity: "high"
    where: "AC10 — daily continuity matrix cardinality"
    finding: "Exactly one row per enabled adapter per day conflicts with coverage of every plan-configured source slot and with adjudication rows for disabled adapters; a multi-slot adapter can either omit sources or appear duplicated. Define one exact key and expected set, such as generation plus America/Los_Angeles date plus adapter plus plan source-slot index, including an explicit disabled-adapter representation, and evaluate missing, duplicate, and plan-unknown rows against that set before the window can pass."
  - severity: "medium"
    where: "AC10 — seven-day acceptance-clock boundary"
    finding: "The spec does not define whether a partial G2 activation day counts or the earliest freeze timestamp, so activation just before midnight could satisfy seven dated matrices in materially less than seven days. Define the start and close rule using America/Los_Angeles boundaries, including DST and resets, and require freeze approval no earlier than the resulting close timestamp."
---
