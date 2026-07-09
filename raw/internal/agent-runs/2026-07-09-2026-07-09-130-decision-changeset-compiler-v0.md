---
backlog_item: 2026-07-09-130-decision-changeset-compiler-v0
agent_run_started: 2026-07-09T19:21:55Z
agent_run_ended: 2026-07-09T19:41:14Z
status: ready_for_review
test_status: passing
---

# Agent Run: Decision to Linear Changeset Compiler v0

## What I Implemented

Implemented the v0 decision changeset compiler on `agent/decision-changeset-compiler-v0` at `cad471afc2f6f1feb05720eee02e0154bf328dfb`.

The implementation adds a core changeset compiler/apply module, a file-backed `ChangesetDraft` lifecycle alongside the existing decision draft store, team-decision atom metadata for `decision_type` / `line_key` / meeting provenance / `supersedes`, Linear create idempotency stamping plus close marker handling, Slack responder batch card/action/edit wiring, and thin Granola decision-type classification.

## Files Modified

- `src/enrich/granola-intake-candidates.ts` — decision_type parsing/classification seam for meeting-derived cards.
- `src/surfaces/ceo-slack-responder/decision-changeset.ts` — new compiler/render/parser/apply module.
- `src/surfaces/ceo-slack-responder/decision-store.ts` — changeset atom append/read path, line_key idempotency, supersedes metadata.
- `src/surfaces/ceo-slack-responder/draft-store.ts` — `ChangesetDraft` store, edit history, CAS apply ownership, owner fencing.
- `src/surfaces/ceo-slack-responder/linear-client.ts` — create idempotency stamp and close marker/comment/state-transition path.
- `src/surfaces/ceo-slack-responder/responder.ts` — batch card post, edit reply handling, confirm/dismiss action handling.
- `tests/surfaces/decision-changeset.test.ts` — focused AC1-AC8 coverage.

Feature branch diff stat:

```text
cad471af 2026-07-09-130 implement decision changeset compiler
 src/enrich/granola-intake-candidates.ts            |  55 +-
 .../ceo-slack-responder/decision-changeset.ts      | 336 ++++++++
 src/surfaces/ceo-slack-responder/decision-store.ts | 186 ++++-
 src/surfaces/ceo-slack-responder/draft-store.ts    | 870 +++++++++++++++++++++
 src/surfaces/ceo-slack-responder/linear-client.ts  | 246 +++++-
 src/surfaces/ceo-slack-responder/responder.ts      | 300 ++++++-
 tests/surfaces/decision-changeset.test.ts          | 434 ++++++++++
 7 files changed, 2371 insertions(+), 56 deletions(-)
```

## Decisions Made During Implementation

### Decision 1: Keep changeset draft state inside `draft-store.ts`

- **Options considered:** a separate mutable store file; extending the existing decision draft store file; encoding all state in Slack only.
- **Chose:** extend `draft-store.ts` with `changeset_drafts`.
- **Why:** the spec explicitly listed `draft-store.ts` for the batch record and forbade new mutable stores beyond this draft record. This mirrors the existing file-lock/tmp-rename pattern.
- **Worth founder review?** No.

### Decision 2: Preserve existing `source_app` type

- **Options considered:** add `granola` to `DecisionSourceApp`; keep existing `claude-code|codex` and store meeting provenance separately.
- **Chose:** keep the existing type and write Granola provenance under `meeting`.
- **Why:** `answerFromTeamDecisions` consumes the existing brain-facing decision-store interface, whose source_app type is still `claude-code|codex`. Extending it would require editing files outside `files_to_modify`.
- **Worth founder review?** No; this is a compatibility constraint.

### Decision 3: Linear close state is supplied per close target

- **Options considered:** add a new global Linear closed-state config; carry `close_state_id` on each target selected/resolved by the human/lineage path.
- **Chose:** carry `close_state_id` on `ChangesetCloseTarget`.
- **Why:** adding new config outside the listed files would widen scope; target resolution already needs explicit issue metadata in v0.
- **Worth founder review?** No.

## Acceptance Criteria Status

- [x] **AC1 batch card** — `createChangesetDraftFromCards` dedupes by note, `postDecisionChangesetDraftCard` posts one batch card, and the test asserts no `DecisionDraft` records are created.
- [x] **AC2 editability** — store supports retitle, reassign, reproject, retype, retarget, strike, restore, split, add; duplicate source event keys no-op; failed parses record edit history and leave revision unchanged.
- [x] **AC3 nothing-before-confirm** — tests assert no team-decision atoms or Linear calls before confirm; dismiss only marks the draft dismissed.
- [x] **AC4 execute + stamp** — apply appends atoms for all active lines before Linear calls; create bodies carry `decision_atom_id` and Granola link; closes carry the decision comment.
- [x] **AC5 idempotency** — note reruns dedupe one draft; line atoms dedupe by `line_key`; create uses `decision_atom_id`; close uses marker; retry/duplicate tests cover no duplicate atoms or side effects.
- [x] **AC6 no-guess resolution** — unresolved negative lines return `needs_input` and do not execute.
- [x] **AC7 supersession** — changeset atom append writes `supersedes` when an operative subject already exists; test asserts the pointer.
- [x] **AC8 edit/confirm race + apply ownership** — revision-bound confirm rejects stale cards; fresh `applying` lease returns in-progress; stale lease takeover works; old owner fencing returns null.

## Test Results

Initial `npm run typecheck` failed before dependency install because `node_modules/` was absent in the fresh worktree:

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit

sh: tsc: command not found
```

Installed dependencies with `npm ci`:

```text
npm warn deprecated prebuild-install@7.1.3: No longer maintained. Please contact the author of the relevant native addon; alternatives are available.

added 292 packages, and audited 293 packages in 4s

92 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (3 moderate, 2 high, 1 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

Focused regression command:

```text
npx vitest run tests/surfaces/decision-changeset.test.ts tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts tests/surfaces/ceo-slack-responder/linear-client.test.ts tests/surfaces/ceo-slack-responder/intake-gate.test.ts tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts tests/enrich/granola-intake-candidates.test.ts
```

Output:

```text
✓ tests/surfaces/ceo-slack-responder/linear-client.test.ts (4 tests) 11ms
✓ tests/surfaces/ceo-slack-responder/decision-store-latest-wins.test.ts (3 tests) 10ms
✓ tests/enrich/granola-intake-candidates.test.ts (10 tests) 47ms
✓ tests/surfaces/ceo-slack-responder/confirm-idempotency.test.ts (2 tests) 31ms
✓ tests/surfaces/ceo-slack-responder/intake-gate.test.ts (4 tests) 41ms
✓ tests/surfaces/decision-changeset.test.ts (6 tests) 78ms
✓ tests/surfaces/ceo-slack-responder/intake-confirm-idempotency.test.ts (8 tests) 82ms

Test Files  7 passed (7)
Tests  37 passed (37)
```

Typecheck and lint:

```text
> echoctl@0.1.0-beta.1 typecheck
> tsc --noEmit


> echoctl@0.1.0-beta.1 lint
> eslint . --max-warnings 0 && npm run lint:task-state


> echoctl@0.1.0-beta.1 lint:task-state
> python3 tools/task-state/lint.py
```

Diff check:

```text
git diff --check
```

passed with no output.

## Open Questions for Founder

None.

## Drift Events Caught

None. I did not add package allowlist entries for the new responder-side module because `package.json` is outside `files_to_modify`; any packaging-surface follow-up should be reviewed separately.

## Prior-State Handling

Fresh claim, not a resume. No previous-attempt state was present.
