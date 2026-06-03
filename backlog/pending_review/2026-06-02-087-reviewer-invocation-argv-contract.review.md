---
item_id: 2026-06-02-087-reviewer-invocation-argv-contract
verdict: merge as-is
reviewed_at: 2026-06-03T06:15:07Z
test_counts: { passed: 1513, failed: 0 }
---

## Verdict
The implementation satisfies the narrow 087 contract: it adds the argv binding file/schema, removes the live `bash -c` dispatch path, preserves current `danger-full-access`/child-commit behavior as data, and passes the required verification. I found one non-blocking legacy diagnostic surface, but it is not used by the wrapper/installer runtime paths.

## Pre-merge fixups
- [ ] None.

## Expected merge conflicts
- None expected. Local `main` is `44adbced`; `git merge-tree $(git merge-base main HEAD) main HEAD` reported no `CONFLICT` hunks. Preserve current main's backlog/review artifacts and take this branch's code/config changes.

## Follow-up items (defer, do not block merge)
- Migrate old 056 fixture overrides to `ECHO_REVIEWER_BINDINGS_CONFIG`, then remove the legacy `--print invoke_command` compatibility path.
