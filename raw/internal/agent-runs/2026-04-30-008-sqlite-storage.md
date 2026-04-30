# Run log: 2026-04-30-008-sqlite-storage

**Agent:** Mac.attlocal.net-zhenye
**Branch:** agent/008-sqlite-storage (NOT created — escalated before any code was written)
**Head SHA:** none
**Started:** 2026-04-30T21:30:00Z
**Status:** ESCALATED to pending_review

## Why this didn't progress

After reading the item spec and item 007's freshly-shipped lifecycle.ts, I identified a spec gap that I can't unilaterally resolve under the drift rules.

The acceptance criteria for 008 include:

> - Daemon's startup log payload now shows `storage_backend: 'sqlite'` (or `'memory'` for the opt-out)
> - Daemon's lifecycle calls `storage.close()` on graceful shutdown

Both observables are produced inside `src/daemon/lifecycle.ts` (which item 007 shipped):

- The `started` log uses a hardcoded `const STORAGE_BACKEND = 'memory'` constant.
- `shutdown()` runs `releasePidLock()` and `clearInterval(keepAlive)` but has no hook for storage close.

To satisfy these criteria, `lifecycle.ts` must be edited. But `lifecycle.ts` is **not in `files_to_modify`**:

```
files_to_modify:
  - src/storage/sqlite.ts
  - src/storage/migrate.ts
  - src/storage/migrations/0001_initial.sql
  - src/daemon/index.ts
  - package.json
  - tests/storage/sqlite.test.ts
```

Per drift rule 4 ("No file creation outside files_to_modify; if your implementation requires touching a file not listed in files_to_modify, escalate") and rule 8 ("STOP, log, escalate" on ambiguities), the right move is to flag this and stop.

## Workarounds I considered (and rejected)

1. **Register competing SIGTERM/SIGINT handlers from `index.ts`.** Could call `storage.close()` from a handler before lifecycle's runs. But:
   - Doesn't fix the `storage_backend: 'sqlite'` log (that line fires inside `startLifecycle()` with a hardcoded constant)
   - Layering violation — the daemon entrypoint shouldn't own signal handling that lifecycle already owns
2. **Duplicate lifecycle.ts logic into index.ts** so I never call `startLifecycle()`. Works mechanically without "modifying" lifecycle.ts, but is an immediate regression of item 007's clean separation. Strongly contrary to the spirit of the codebase.
3. **Skip the two contested acceptance items.** Drift rule 1: acceptance is the contract. Skipping is not an option.

None of these work cleanly. The right move is small and obvious: add `lifecycle.ts` to `files_to_modify` and parameterize it.

## Recommended fix

Update item 008's `files_to_modify` to include `src/daemon/lifecycle.ts`, then:

```ts
// proposed lifecycle.ts shape
export interface LifecycleOptions {
  storage?: Storage;
  storageBackend?: string; // logged in 'started' payload; default 'memory'
  onShutdown?: () => void | Promise<void>; // run before keep-alive cleared
}

export async function startLifecycle(opts?: LifecycleOptions): Promise<LifecycleHandle>;
```

Then `index.ts` owns storage instantiation and passes `{ storage, storageBackend: 'sqlite', onShutdown: () => storage.close() }` (or `'memory'` for the opt-out). ~25–30 lines of changes to lifecycle.ts; back-compat preserved for callers that pass nothing (current default = MemoryStorage + 'memory' label).

## What I did NOT do

- No code was written in any worktree
- No agent branch was created or pushed
- No package.json edits, no `npm install` for `better-sqlite3`
- No tests written

The item moved `ready/ → claimed/ → pending_review/` purely on the `main` branch.

## Acceptance criteria status

All criteria: NOT ATTEMPTED (escalated before implementation).

## Open questions for founder

1. Confirm: may I edit `src/daemon/lifecycle.ts` to add the parameterization above? (Or, prefer a different shape, e.g., a separate `storage.ts` module that owns the storage decision and the close hook?)
2. Once confirmed, the item can be moved back to `ready/` (or kept in `pending_review/` with the spec amended) and any agent can pick it up.

## Drift events caught

This escalation IS the drift-prevention move. Per drift rule 8: "If you encounter an ambiguity not resolved by spec ... STOP, log, escalate. You do not push through." Done.
