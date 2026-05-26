---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 15
reviewer: "codex"
artifact_sha: "262a4c01b97e2a6208962fadb221da63e235e529"
completed_at: '2026-05-26T01:54:38Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:92"
    finding: >-
      The concrete AC1 / AC2 / AC3 conflict return shapes omit the `kind` discriminator, while AC8 later defines `SyncConflict` as a discriminated union whose marker and config variants require `kind: 'marker'` or `kind: 'config'`. A literal implementation either fails typecheck once the union is used, or weakens the result types enough that 073/074 cannot safely branch on conflict kind. Patch the adapter branch contracts and tests so marker conflicts include `kind: 'marker'` and codex/cursor config conflicts include `kind: 'config'`.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:191"
    finding: >-
      The role-target symlink branch returns `conflict: { filePath, targetIsSymlink: true, userBytes: null }`, and AC9 case 29 asserts the same shape, but AC8's `RolePerFileConflict` interface requires both `sourceBytes` and `userBytes`. A builder must either violate the test/AC5 shape or loosen the type. Patch one side explicitly, preferably by requiring `sourceBytes: null` in the symlink branch and test so the no-byte-payload contract stays type-compatible.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:298"
    finding: >-
      AC6 promises parse errors become safe `AdapterError.message` values with no file bytes, but AC9 only pins that for malformed Cursor JSON. The TOML adapter parses the existing `[mcp_servers.echo]` slice with `smol-toml`; a malformed slice may contain Authorization headers or other secret-bearing keys, and a naive `error.message` passthrough could leak those bytes to callers that render AdapterError messages. Specify the TOML parse-error sanitizer and add a malformed codex-config redaction test mirroring the Cursor case.
---

# Codex R15 Review

Verdict: proceed_after_patches.

## Findings

1. High - The adapter conflict branch shapes omit the `kind` discriminator required by the `SyncConflict` union. Patch AC1 / AC2 / AC3 and their tests to include `kind: 'marker'` and `kind: 'config'`.

2. Medium - The role symlink conflict shape omits `sourceBytes`, but `RolePerFileConflict` requires it. Align AC5 / AC8 / AC9 on `sourceBytes: null` or make the field optional deliberately.

3. Medium - The parse-error redaction contract is only tested for Cursor JSON. Add a codex TOML malformed-slice case and require parser messages to be sanitized before becoming `AdapterError.message`.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `262a4c01b97e2a6208962fadb221da63e235e529` and the r15 request. I did not consume task-state for this reviewer tick.
