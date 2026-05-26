---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 7
reviewer: "codex"
artifact_sha: "ce81ff3abf3f07508a507f09001483e28d6c3df4"
completed_at: '2026-05-26T00:59:48Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:506"
    finding: >-
      The Definition of Done still requires the old lock behavior: a 30s retry budget plus stale-lock recovery via process.kill(pid, 0). That directly contradicts AC6 lines 271-282, which now make lock acquisition one-shot and explicitly remove automatic stale recovery. A builder following the DoD would reintroduce the unsafe stale-reaper mechanism that the r6 patch removed, while a builder following AC6 would fail the DoD text. Patch the DoD to match the one-shot lockfile-present contract and the AC9 cases at lines 436-441.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:94"
    finding: >-
      AC2 leaves serverConfig open as { [k: string]: unknown } and line 99 says renderInlineKeys emits one key = <smol-toml-stringified-value> per top-level value, but smol-toml@1.6.1 only exposes document-level stringify(obj): it rejects primitive values and renders nested objects as subtables, not inline values. A literal implementation has no public smol-toml value renderer for arbitrary unknown values, and AC9 does not pin this. Patch by either narrowing the TOML serverConfig value type for V1 and testing the supported shapes, or specifying an in-tree TOML value renderer with tests for strings, booleans, arrays, and any object shape the adapter promises to accept.
  - severity: "low"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:466"
    finding: >-
      R1 is stale prose from the pre-byte-range design. It still says smol-toml is only a lead candidate, instructs the builder to parse/stringify the founder's real config as the first action, and describes a fallback library path. That conflicts with AC2 lines 96-102 and the DoD at line 512, which already choose byte-range surgery and use smol-toml only as a target-slice value comparator. Patch R1 so the risk register does not send the builder down a contradictory implementation path.
---

# Codex R7 Review

Verdict: proceed_after_patches.

## Findings

1. Medium - The Definition of Done still names the removed 30s retry / stale-lock recovery behavior, contradicting the one-shot lock contract in AC6.

2. Medium - The TOML renderer contract assumes a smol-toml value-rendering API that 1.6.1 does not expose for primitives or inline object values.

3. Low - R1 still describes the old parse/stringify library-choice investigation even though AC2 has already locked the byte-range editor strategy.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `ce81ff3abf3f07508a507f09001483e28d6c3df4` and the r7 request. Checked the smol-toml 1.6.1 exported types/implementation for the AC2 renderer assumption. I did not consume task-state for this reviewer tick.
