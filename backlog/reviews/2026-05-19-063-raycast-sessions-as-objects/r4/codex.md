---
item_id: "2026-05-19-063-raycast-sessions-as-objects"
round: 4
reviewer: "codex"
artifact_sha: "153e321640fd9c3ec49c278e42f8f195a9bfcbdd"
completed_at: '2026-05-19T23:17:55Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:249"
    finding: >-
      AC6.7 still treats a read-merge-write of the single `echo.sessions.v1` LocalStorage key as sufficient to make two overlapping Raycast extension processes safe. That closes stale React-snapshot bugs inside one writer, but it is not atomic across processes: process A and process B can both `getItem` the same old array, each merge its own row, and the later `setItem` overwrites the earlier writer's unrelated row. Raycast's Storage API exposes async `getItem`/`setItem` primitives, not compare-and-swap or transactions, so AC8.10(a)'s stale-snapshot unit test can pass while the production interleaving still loses sessions. Patch the storage contract to avoid single-key lost updates (for example, per-session row keys plus an index rebuilt from `LocalStorage.allItems()`, or an explicit lock/CAS mechanism), and add a test that simulates interleaved read-before-write ordering.
  - severity: "medium"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:236"
    finding: >-
      The recent-asks migration is underspecified against the current persisted shape and the new strict `Session` shape. Existing `tools/raycast-echo/src/lib/recent-asks.ts` rows contain `{ id, question, launchedTo, at }`, not an `agentKind`, while AC6.1 says historical sessions have `question + at + agent`. AC6.1 also says the migrated rows have "no auditCalls, no answer body, no log path; just question + at + agent", but the `Session` interface at lines 120-132 requires `completedAt`, `answer`, `auditCalls`, `subprocessLogPath`, `sourceBreakdown`, `evidenceClusters`, and `forkedFrom`. A builder must currently invent both the `launchedTo -> agentKind` mapping and the default field values, which means migration tests can pass a shape that later components reject. Patch AC6.1/AC10.2 to specify full historical `Session` defaults and the mapping (or a deliberate default agent), and fold Risk #4's backup-key assertion into AC8 if that backup is required.
  - severity: "low"
    where: "backlog/ready/2026-05-19-063-raycast-sessions-as-objects.md:147"
    finding: >-
      Session-row UI language still alternates between source-app and agent-kind semantics. The Session model has `agentKind` but no `sourceApp`; AC1.3 requires a "source-app icon" on session rows, the frontmatter says SessionsList is "Filterable by source-app", while AC5.3 defines the dropdown as `all / claude / codex / custom`, i.e. agentKind. Because AC4.2/OoS #9 also acknowledge the current audit result shape does not expose source paths or source breakdown, the source-app icon/filter cannot be implemented from available session data. Patch the row/filter contract to use agent icons/agentKind, or add an explicit `primarySourceApp` field with a defined fallback when audit data cannot derive it.
---

# Codex Review

Verdict: proceed_after_patches

## Findings

1. MEDIUM - AC6.7's single-key LocalStorage merge is still a lost-update race across overlapping Raycast processes. Re-reading before writing is not a transaction; two writers can both read the same old `echo.sessions.v1` array and the later `setItem` can drop the earlier writer's unrelated session. The spec needs a per-row storage shape or an explicit lock/CAS strategy before the AC6.7 safety claim is true.

2. MEDIUM - The recent-asks migration does not define a valid full `Session` row. Old rows have `launchedTo`, not `agentKind`, and the spec says migrated rows are minimal even though downstream components expect required fields like `auditCalls`, `answer`, `completedAt`, and `forkedFrom`. Specify defaults and the mapping, and make the backup-key requirement testable if it is intended.

3. LOW - Session list rows mix source-app wording with agentKind data. The available model supports `agentKind`; it does not support a source-app icon/filter unless the spec adds a field or a derivation rule.

## Focus-hint Checks

- AC6.7's composite audit-call key `(ts, tool, args_shape)` plus terminal-over-pending precedence is implementable for merging audit rows within a session, assuming the client canonicalizes `args_shape` before comparing.
- AC6.7's Partial-patch scoping plus monotonic status precedence closes the late debounced-update lifecycle regression inside a single row.
- AC4.2's "omit Open/Tail when log is unopenable" fallback matches the Raycast Action API shape; AC8.9 now tests absence rather than disabled actions.
- AC8.3 no longer owns fork row creation timing; AC8.8 correctly owns the deferred fork assertions.
