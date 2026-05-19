---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 3
reviewer: "codex"
artifact_sha: "30ea59b3c4c243d8a321a3d8655707d689f1f194"
completed_at: '2026-05-19T23:05:23Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:242"
    finding: >-
      AC6.7 and AC8.10 require `auditCalls` to be unioned by call `id`, but the public audit-call shape does not expose an id. The daemon keeps an internal `MutableRecentMcpCall.id`, then `publicClone()` strips it before `/mcp/recent-calls` returns the row (`src/mcp/request-log.ts:6-13`, `src/mcp/request-log.ts:120-128`), and the Raycast parser/type only accepts `ts/tool/args_shape/result_shape/duration_ms/status` (`tools/raycast-echo/src/lib/audit.ts:3-10`, `tools/raycast-echo/src/lib/audit.ts:74-80`). Because AC3.5 and Out-of-Scope #4 forbid daemon contract changes, the builder cannot satisfy the required id-based merge or AC8.10 without inventing an unstated synthetic key. Patch the spec to merge by a key that exists in the current response shape, or explicitly allow exposing a stable call id and update the daemon-out-of-scope text.
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:215"
    finding: >-
      AC4.2 and AC8.9 require `[Open]` and `[Tail]` actions to remain visible but disabled/greyed out when `fs.statSync(subprocessLogPath)` fails. The current Raycast Action docs for `Action` and `Action.Open` list no `disabled`/`isDisabled` prop; `Action.Open` also requires a valid `target`. That leaves the builder choosing between removing the actions, rendering enabled no-op actions, or passing unsupported props that `npx tsc --noEmit` should reject. Patch the fallback contract to an implementable Raycast pattern, e.g. preserve the unavailable metadata row and omit unsafe actions, or render explicit no-op actions that show a toast, then adjust AC8.9 accordingly.
  - severity: "low"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:252"
    finding: >-
      AC8.3 still says the SessionDetail fork action "writes new session with `forkedFrom`", while AC4.5 and AC8.8 now say pressing Ask again only navigates to TypingState and must not create a LocalStorage row until the synthetic Ask row is submitted. This is likely leftover r2 wording, but it makes the test contract ambiguous: a builder following AC8.3 literally can violate AC4.5. Patch AC8.3 to say the fork action exposes the deferred fork flow, and leave row creation assertions solely in AC8.8.
---

# Codex Review

Verdict: proceed_after_patches

## Findings

1. MEDIUM - The merge-by-id rule for `auditCalls` is not implementable against the current audit contract. The daemon has an internal id, but the public endpoint and Raycast `AuditCall` type strip it, while this spec forbids daemon endpoint changes. Either change AC6.7/AC8.10 to use an available stable key, or explicitly make exposing a call id part of scope.

2. MEDIUM - The missing-log fallback asks for visible disabled `[Open]` / `[Tail]` actions, but Raycast's documented `Action` props do not include disabled/isDisabled. The spec should choose an implementable fallback shape before build, otherwise the builder has to violate either AC4.2 or typecheck.

3. LOW - AC8.3 retained old wording that says the fork action writes a new session. AC4.5/AC8.8 are clearer and safer: Cmd-R only navigates to TypingState; the new row appears only when the user submits the synthetic Ask row. Tighten AC8.3 so tests do not encode the wrong timing.

## Focus-hint Checks

- AC6.6's removal-only age-ceiling reconciliation is safer than the prior log-mtime predicate; AC8.6 now catches re-adding the unsafe mtime branch.
- AC6.2's post-`startAgent()` ordering is implementable with the current runner shape, assuming the test observes the record helper contract rather than real Raycast IPC timing.
- AC4.5's deferred TypingState fork flow is internally consistent after the r3 text, apart from the stale AC8.3 wording above.
