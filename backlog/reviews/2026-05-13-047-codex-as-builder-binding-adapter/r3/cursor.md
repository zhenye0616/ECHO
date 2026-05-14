---
item_id: 2026-05-13-047-codex-as-builder-binding-adapter
round: 3
reviewer: cursor
artifact_sha: ac9fa7d46d67b1c1227e56fc92eba539f8cb0624
completed_at: '2026-05-14T06:05:21Z'
verdict: proceed_after_patches
findings:
  - severity: low
    where: "§Out of Scope — Multi-machine builder coordination"
    finding: |
      The bullet still parenthetically cites `.git/echo-builder-in-progress`, while AC1 and AC4 use the atomic lock directory `.git/echo-builder-in-progress.d` (with `info` inside). Align that sentence so stale-lock guidance and mental model match the real path operators see in ERROR output (`rm -rf …/echo-builder-in-progress.d`).
  - severity: nit
    where: "§AC4 case 3 — synchronization pseudocode"
    finding: |
      The poll snippet increments `WAITED` but does not show initialization (`WAITED=0`) before the loop; under `set -u` copy-paste into a shell fixture this can trip. One initializer line in the spec snippet closes the gap.
---

# Cursor review (R3)

**AC1 lock-info:** Timestamp + wrapper PID (`$$`) + `agent=$ECHO_AGENT_ID` is enough for “whose lock is this?” on a single machine; pairing PID with the stable agent id distinguishes concurrent human troubleshooting from stale orphans.

**AC4 case-3 polling:** Waiting up to ~2s in 0.1s steps for `info` to appear is ample—the wrapper creates the directory and writes `info` before spawning `codex`, so the gate covers scheduler skew without materially slowing CI.

**DoD / R4 / AC5:** Definition of Done now matches the three-case AC4 partition; R4 explicitly points cursor qualitative signal at the `§3-cursor (qualitative)` subsection mandated in AC5 §3—no remaining cross-section drift on the Cursor-facing measurement story.

Residual scope is documentation hygiene only (Out of Scope path string + snippet initializer).
