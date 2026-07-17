# Item 137 two-pass scope reconciliation evidence

Date: 2026-07-17
Coordinator: persistent Codex program coordinator
Authority: `raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md`

## Authorization reconciliation

- The authorization ending in `2fca855f` was not used for the scope reset.
  Authenticated remote inspection showed that it named the wrong repository
  owner/name. Its bytes remain immutable and its replacement permanently marks
  it unusable.
- Replacement authorization:
  `raw/internal/migrations/2026-07-15-137-echo-context-installable-shadow-runtime-scope-reconciliation-fe3792c9-delegated-approval.md`
- Replacement authorization commit/readback:
  `ce3883b73ea5fef2677d0e0aa165f867f6665fb3`
- Single-use nonce: `fe3792c9-6d58-408a-b75f-eea5f2a8703d`
- Operation result: used exactly once; successful

## Canonical preflight

- Project_echo/ECHO canonical pre-reset SHA:
  `ce3883b73ea5fef2677d0e0aa165f867f6665fb3`
- Authorized baseline before the two authorization-record commits:
  `18e9d713c9bb50cb193b7e1305fbebaefd2aa5c7`
- echo-context canonical main readback:
  `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`
- echo-context canonical tree:
  `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`
- Strategist task-state lint: passed for cancelled 137, new 137a, new
  137b, and blocked 138.
- `tools/sync-skills.sh --check`: passed after generated adapters were
  synchronized.
- `python3 tools/backlog_index.py`: regenerated successfully.
- `python3 -m unittest tools.test_blocked`: 35 tests passed.
- YAML frontmatter parse and `git diff --check`: passed.
- Existing 137 and 138 review artifact changed paths: none.

## Execution and readback

- Operation: one non-force push to `zhenye0616/ECHO`
  `refs/heads/main`.
- Scope-reset commit:
  `de3c249f8a586b2723616f010d6aab2586629744`
- Scope-reset tree:
  `93b27ad4e827c916bff652697bb4f98e7d2606f8`
- Authenticated canonical remote readback:
  `de3c249f8a586b2723616f010d6aab2586629744`
- Push mode: non-force descendant of the authorization commits.

The changed-path readback matches the authorization: operating instructions
and generated adapters were reconciled; old 137 moved to complete with a
cancellation note; 137a/137b proposals and strategist pointers were added;
138's predecessor and task state were updated; the decision/follow-up/index
were reconciled. No review artifact, target-source byte, runtime artifact,
service, credential, persistent runtime path, or authority state changed.

## Resulting program state

- 137: cancelled historical risk evidence; no R9 and no build.
- 137a: proposed and eligible for a fresh optimized review epoch.
- 137b: proposed but blocked until 137a completes and its observed evidence is
  reconciled.
- 138: proposed, blocked by 137b, and its existing review lineage is stale
  historical evidence.
- Project_echo remains authoritative at 38478.
