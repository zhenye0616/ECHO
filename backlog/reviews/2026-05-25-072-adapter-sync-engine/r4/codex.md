---
item_id: "2026-05-25-072-adapter-sync-engine"
round: 4
reviewer: "codex"
artifact_sha: "e11470fc8fb3585ab31a213c43bc7d9c6dc335a3"
completed_at: '2026-05-26T00:14:41Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:84"
    finding: >-
      AC1/AC2 say existing marked/key content that differs from the proposed bytes returns a conflict, but AC6 says that when previous* is absent the conflict branch is unreachable and only append/add or noop can happen. That leaves the builder without a safe rule for an existing BEGIN/END block or mcpServers.echo table that differs from the new desired content but has no cached previous value. Patch the spec to make this branch explicit, preferably conflict/no-write unless current already equals proposed, so the no-clobber invariant remains implementable.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:183"
    finding: >-
      AC9 requires lock tests to reduce the retry budget to 500ms and exercise corrupt-lock freshness, but SyncAllOpts exposes no lock timing knobs. With the public interface as written, tests 11/14 either sleep the production 30s budget and cannot tune the 5-minute freshness gate without private hooks, or they have to patch module internals that the spec never permits. Add explicit opts such as lockRetryBudgetMs, lockRetryIntervalMs, corruptLockFreshnessMs, and foreignHostStaleMs, or rewrite the tests around a documented fake-clock/injection seam.
  - severity: "medium"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:226"
    finding: >-
      The public contract says no exception escapes syncAll, but the lock algorithm says non-EEXIST link/setup errors propagate before any SyncResult exists. If ECHO_HOME_PATHS.state is missing, ENOTDIR, or EACCES, lock temp creation/linking can throw outside the documented result shape; this is plausible for CLI/wizard callers unless they separately call the 070 scaffold first. Specify that syncAll ensures the state dir before locking, or that lock setup filesystem failures are converted into the lock-timeout SyncResult shape with syncLock populated and agents/roles empty.
  - severity: "low"
    where: "backlog/ready/2026-05-25-072-adapter-sync-engine.md:373"
    finding: >-
      The EACCES test setup is not POSIX-correct: chmod 0444 on the target file does not make rename fail when the parent directory is writable. On macOS, replacing a 0444 CLAUDE.md with mv succeeds because directory permissions govern the rename. Change the test to make the parent directory non-writable, use an invalid target parent, or inject/mock atomicWrite to throw EACCES; otherwise the required test will pass through the write path instead of exercising AdapterError handling.
---

# Codex R4 Review

Verdict: proceed_after_patches.

## Findings

1. Medium — Previous-value-absent conflict behavior is contradictory. AC1/AC2 preserve user edits by returning conflict on unexpected existing content, while AC6 says absent `previous*` makes the conflict branch unreachable. The builder needs one safe rule for existing ECHO-owned regions with no cached previous value.

2. Medium — The lock tests require timing controls that are not in `SyncAllOpts`. Add a documented injection seam or public options; otherwise AC9 either burns production-duration sleeps or relies on private hooks.

3. Medium — Lock acquisition can still throw outside `SyncResult`. Map setup filesystem failures into `syncLock`, or have `syncAll` create/ensure the state dir before lock acquisition.

4. Low — `chmod 0444` on the target file does not force rename to fail on POSIX. The EACCES test needs to remove write permission from the parent directory or inject the failure.

## Verification Notes

Reviewed `backlog/ready/2026-05-25-072-adapter-sync-engine.md` at `e11470fc8fb3585ab31a213c43bc7d9c6dc335a3`, plus the r4 request. I also verified the rename behavior locally in `/tmp`: replacing a `0444` file from a writable directory succeeds on this macOS environment.
