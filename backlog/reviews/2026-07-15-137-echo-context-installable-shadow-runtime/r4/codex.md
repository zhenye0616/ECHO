---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 4
reviewer: "codex"
artifact_sha: "65b9a0af5a4ab21a34ad71d6258c8e231427a180"
completed_at: '2026-07-16T05:30:48Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 writer lock / AC5 supervisor / AC6 doctor truth table"
    finding: "The prescribed process topology is contradictory: AC5 makes launchd report the bundled supervisor PID while the spawned runtime child acquires the AC1 writer lock, but AC6 requires the lock holder PID to equal the PID launchd reports. Define and test either a single-process topology or distinct supervisor_pid/runtime_pid fields with verified parent-child identity, start times, executable hashes, and the runtime child as the required lock holder."
  - severity: "high"
    where: "AC5 layout resolver and bootstrap installation sequence"
    finding: "The POSIX bootstrap must choose an extraction/release location before bundled Node or src/install/layout.ts can run, yet AC5 requires every release-root decision to pass through that single TypeScript resolver and says extraction goes directly into the immutable resolved release. This also leaves candidate-root isolation underspecified. Require bootstrap to extract only into an explicitly safe temporary staging directory and let the bundled CLI perform the sole resolved move/install, or prescribe one non-duplicated resolver mechanism usable before extraction, with exact candidate flags and denial tests."
  - severity: "high"
    where: "AC4 release FSM approval and durable resume contract"
    finding: "tools/release-runtime.mjs exposes only stage|resume, but the spec does not define how the separate founder approval is authenticated and atomically recorded, so the approved transition is not implementable without inventing a manual journal mutation. Specify the exact approval input or resume flag, journal schema/path/mode, compare-and-swap transition rules, file-and-parent-directory fsync protocol, and pre-build intent/completion checkpoints that make a crash after byte creation resumable without a second build."
  - severity: "high"
    where: "AC4 asset-set manifest / AC5 exact bootstrap invocation"
    finding: "The exact bootstrap invocation supplies only mutually downloadable assets; its expected self-hash comes from the supplied manifest, while the approved asset-set manifest hash remains only in the release journal. A coherently tampered bootstrap, manifest, checksum, and SBOM therefore have no trust anchor at this invocation, and the canonicalization of a complete asset-set hash that covers its containing manifest is undefined. Define a non-recursive canonical asset-set digest and require the checkpointed approved digest or a signature to authenticate the downloaded manifest before executing the bootstrap; add a coherent multi-asset tamper test."
  - severity: "medium"
    where: "AC5 launchd StandardOutPath/StandardErrorPath retention"
    finding: "The supervisor merely truncates launchd's two last-resort files on each spawn and counts them toward the 64 MiB aggregate cap. A long-lived supervisor writing to either descriptor can exceed that cap without another spawn. Give these files explicit numeric caps and continuous rotation/truncation enforcement, and extend the real-launchd test to drive supervisor-channel output rather than only child-runtime output."
  - severity: "medium"
    where: "AC5 candidate port reservation / AC7 parallel cleanup proof"
    finding: "Holding a reservation listener 'until handoff' does not define an atomic transfer to the launchd-started runtime; closing the reservation before bind creates a port-stealing race. Specify descriptor inheritance or a bounded close-bind verification protocol that treats any intervening claimant as failure without touching canonical state, and add a competing-binder test."
---
