# Retro-review packet — "sharpest five" audit fixes (r3: r2 dispositions applied)

**What this is:** the r3 packet for the post-merge cross-tool review of the audit-fix
commits on `origin/main`. r1 taught us the packet shape: the content-only reviewer child
cannot run git, so since r2 this packet embeds the COMPLETE diffs of every commit under
review (bottom of this document) — self-contained and code-grounded. r2 produced two MED
findings, both dispositioned below; the diff set now contains EIGHT commits (the original
six plus the two r2-disposition commits #7 and #8).

## r2 findings → dispositions (both closed in this revision)

| r2 finding | Disposition |
|---|---|
| codex MED — `sqlite.ts`: "when both `filter.source` and `filter.source_prefix` are provided, the prefix branch overwrites the exact-source JS predicate" | **Refuted with evidence**: the scenario is unreachable — `query()` throws `'QueryFilter.source and source_prefix are mutually exclusive'` at entry, BEFORE any predicate is built, in all three adapters (`sqlite.ts:101-103`, `memory.ts:51-53`, `atom-store-readonly.ts:54-56`). The guard predates the fix and sat outside the r2 diff's hunk context, which is why a packet-only review couldn't see it. Made packet-visible in commit `81c3c178` (diff #7): a conformance case pinning the both-set throw on BOTH adapters — see the post-image `rejects source + source_prefix together` test. 22/22. |
| codex-ops MED — `_run_reviewer.sh` tripwire: only rc=1 warns; any other `--check` failure (installer missing, syntax error, permission failure) is swallowed, so the detector can break invisibly | **Adopted, fixed in commit `4fd77f56`** (diff #8): any nonzero rc other than 3 now logs `WARNING: STALE_PLIST_CHECK_FAILED` with the rc + captured output; rc=3 stays silent (normal for manual/on-demand ticks); still non-fatal. Wrapper suites 21/21. |

## r1 findings → dispositions (all three closed in r2)

| r1 finding | Disposition |
|---|---|
| codex MED — packet contained only the brief, no diffs; commits unreviewable by a git-barred child | **Fixed by this packet**: full `git show` output for all six commits embedded below. |
| codex-ops HIGH — log-path fix only covers future installs; already-installed plists stay silently blacked out at `/dev/null` | **Adopted and fixed in commit `98c04815`** (now under review here too): `_install_reviewer_launchd.sh --check` renders the would-be plist via a shared `render_plist()` and byte-compares the installed one (exit 0 match / 1 STALE with loud diff + reinstall hint / 3 not installed; never touches launchd), plus a best-effort tick-start tripwire in `_run_reviewer.sh` that logs `WARNING: STALE_PLIST` on drift only (rc=3 silent — normal for manual ticks). Operationally closed on this machine: both reviewer plists reinstalled 2026-06-11; live `--check` returns 0. |
| codex-ops MED — overflow signal relies on `warnings[]`; prove it is schema-declared | **Satisfied-by-fact, evidence in diff #5**: `warnings: z.array(z.string())` is declared in the tool outputSchema (`src/mcp/tools/wait-for-new-turns.ts`, OUTPUT_SCHEMA block — visible in the embedded diff, post-image line `warnings: z.array(z.string()),`), the field predates this change (schema byte-identical), and the new burst-of-25 test asserts the overflow warning text end-to-end. |

## The eight commits under review

7. **`81c3c178` test(storage)** — conformance pin for the r2 codex MED refutation
   (mutual-exclusion throw on `source`+`source_prefix`, both adapters).
8. **`4fd77f56` fix(review-queue)** — tripwire hardening for the r2 codex-ops MED
   (`STALE_PLIST_CHECK_FAILED` warning on unexpected `--check` rc).


1. **`f6b30569` fix(storage)** — SqliteStorage source-matching conformance. Scrutinize:
   the `likePrefilterChunk` superset proof (non-ASCII guard, separator edges); the
   non-path-like exact-source SQL fast path vs `sourceEquals` equivalence; `before`
   cursor × JS-relocated LIMIT; accepted perf regression on path-like `limit:1` MRU
   lookups (deliberate non-optimization).
2. **`24dc37f7` fix(capture)** — per-turn offset checkpoint (CC+Codex), post-gate
   `invalid_timestamp` rejection, watcher/daemon rejection containment. Scrutinize:
   checkpoint offsets on the Codex cluster-pairing path (the mid-loop `checkpoint` vs
   final `next`); `invalid_timestamp` being warn-log-only; whether the global
   log-don't-exit `unhandledRejection` handler can mask genuine bugs (deliberate trade
   for a capture daemon).
3. **`9fdf95de` fix(review-queue/combine.py)** — O1 optional-only roster eligibility
   (first-response-or-timeout instead of `all([])`-instant), O2 auto-disposition now
   requires `present ∩ required_set`. Scrutinize: interaction with `--timeout-hours`
   and per-reviewer `timeout_hours`; 043 AC6 / 044 AC3-AC4 table preservation;
   `no_responses` body wording on the optional-only timeout path.
4. **`fa903208` fix(review-queue/wrapper+installer)** — plist log routing (was
   `/dev/null`), selection-parser line-anchored frontmatter parse (was `split('---',2)`),
   and the discovered-during-fix Rosetta fail-open: `import _lib` inside `python3 -`
   heredocs silently exits 0 under a non-arm64 parent (arch-retry re-exec with stdin
   consumed) — `validate_request_binding` was failing OPEN; both sites now inline the
   line-anchored regex. Scrutinize: the two "keep in sync with `_lib.FRONTMATTER_RE`"
   regex copies (accepted duplication vs a structural `_lib` stdin fix — opine);
   rotation × launchd-held-fd interaction (documented, not mechanized).
5. **`5336d475` fix(mcp/wait_for_new_turns)** — lossless chaining contract change:
   `next_since` = max RETURNED timestamp (or caller `since` echoed on empty timeout),
   never wall clock; overflow returns OLDEST page ascending `(timestamp,id)` +
   `warnings[]` entry; boundary tie groups never split (page may exceed cap by tie
   count; per-source fetch window 2×cap+1). Delivery order DESC→ASC (3 old-contract
   tests deliberately updated; id sets unchanged; outputSchema byte-identical).
   Scrutinize: the documented pathological limit (single-ms tie group > ~2×cap);
   boundary-tie starvation of the fetch window; any consumer assuming newest-first
   ordering or wall-clock `next_since`.
6. **`98c04815` fix(review-queue/stale-plist)** — the r1 HIGH adoption described above.
   Scrutinize: `render_plist()` as single source of truth (install write and check
   compare can't disagree); exit-code contract (0/1/3) and the tripwire's
   drift-only-warn choice; check mode's deliberately minimal validation scope (slug
   gate only — no wrapper -x, no argv preflight, no launchctl).

## Verification record (spot-check, don't re-litigate)
Watched RED before every fix; product suite 1700 passed (packed-manifest snapshot
updated for the new shipped `source-match` module; `recent-calls-endpoint` is the known
R5 full-suite-load flake, 2/2 in isolation); orchestration combine/wrapper/readonly/
smoke/worktree suites green on the final tree (79/79 combine-touching, 26/26
wrapper-touching incl. the three new `--check` cases, 27/27 wait suite, 440/440
tests/mcp+tests/coord); `tsc --noEmit` + `eslint --max-warnings 0` clean.

## Out of scope (do not expand)
Everything else in the 2026-06-10 audit (cluster-engine demotion-after-truncation,
coord reconcile idempotency, artifact-identity case-fold/relative-path joins,
validate-after-write ordering, …) — followups candidates pending a strategist pass.

---

# Embedded diffs (complete `git show` per commit)

## Commit f6b30569 — fix(storage): conform SqliteStorage source matching to the shared normalized contract

````diff
commit f6b305693540f49332b0fa605129f640595a0a4f
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 10:40:41 2026 -0700

    fix(storage): conform SqliteStorage source matching to the shared normalized contract
    
    Audit fix ① of 5. MemoryStorage's normalizePathLikeSource semantics
    (backslash→slash, trailing-slash strip, Windows case-fold, component-
    boundary prefix) were the de-facto contract but production SqliteStorage
    used raw = / LIKE — backslash-stored Windows sources were invisible to
    forward-slash filters (Windows beta gate), 'fs:/a/b' matched 'fs:/a/bc',
    and ASCII-case-insensitive LIKE matched 'GIT:' to 'git:'.
    
    Helpers extracted verbatim to src/storage/source-match.ts; sqlite now
    applies the shared JS predicate post-SQL behind a proven-superset LIKE
    chunk prefilter, with LIMIT relocated to JS when the predicate is active.
    New parameterized conformance suite runs both adapters over the same
    table (RED: 7 sqlite failures; GREEN: 90/90 storage+windows-compat).
    packed-manifest snapshot updated for the new shipped module.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/src/storage/memory.ts b/src/storage/memory.ts
index 24832131..71ab40cb 100644
--- a/src/storage/memory.ts
+++ b/src/storage/memory.ts
@@ -7,6 +7,7 @@ import {
   type QueryFilter,
   type Storage,
 } from './interface.js';
+import { sourceEquals, sourceHasPrefix } from './source-match.js';
 import { canonicalizeTimestamp } from '../util/timestamp.js';
 
 // 057a AC3 — monotonic insertion counter parallel to SQLite's rowid.
@@ -17,59 +18,6 @@ interface InternalEvent extends CaptureEvent {
   _seq: number;
 }
 
-function stripTrailingSlash(value: string): string {
-  let out = value;
-  while (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
-  return out;
-}
-
-function pathStartIndex(value: string): number | null {
-  if (/^[A-Za-z]:[\\/]/.test(value)) return 0;
-  if (value.startsWith('/') || value.startsWith('~/') || value.startsWith('\\')) return 0;
-  const match = /^([A-Za-z_][A-Za-z0-9_+.-]*:)(.*)$/.exec(value);
-  if (match === null) return value.includes('\\') ? 0 : null;
-  const rest = match[2]!;
-  if (
-    rest.startsWith('/') ||
-    rest.startsWith('\\') ||
-    rest.startsWith('~/') ||
-    /^[A-Za-z]:[\\/]/.test(rest)
-  ) {
-    return match[1]!.length;
-  }
-  return null;
-}
-
-function normalizePathLikeSource(value: string): string | null {
-  const start = pathStartIndex(value);
-  if (start === null) return null;
-  const sourcePrefix = value.slice(0, start);
-  const pathPart = stripTrailingSlash(value.slice(start).replace(/\\/g, '/'));
-  const windowsLike = process.platform === 'win32' || /^[A-Za-z]:(?:\/|$)/.test(pathPart);
-  const normalized = `${sourcePrefix}${pathPart}`;
-  return windowsLike ? normalized.toLowerCase() : normalized;
-}
-
-function sourceEquals(left: string, right: string): boolean {
-  const normalizedLeft = normalizePathLikeSource(left);
-  const normalizedRight = normalizePathLikeSource(right);
-  if (normalizedLeft !== null && normalizedRight !== null)
-    return normalizedLeft === normalizedRight;
-  return left === right;
-}
-
-function sourceHasPrefix(source: string, prefix: string): boolean {
-  const normalizedSource = normalizePathLikeSource(source);
-  const normalizedPrefix = normalizePathLikeSource(prefix);
-  if (normalizedSource !== null && normalizedPrefix !== null) {
-    if (normalizedSource === normalizedPrefix) return true;
-    return normalizedSource.startsWith(
-      normalizedPrefix.endsWith('/') ? normalizedPrefix : `${normalizedPrefix}/`,
-    );
-  }
-  return source.startsWith(prefix);
-}
-
 function stripSeq(e: InternalEvent): CaptureEvent {
   // Re-construct to drop `_seq` — the internal sequence counter is
   // exposed only via iterateCoordAtomsByAppendOrder's typed
diff --git a/src/storage/source-match.ts b/src/storage/source-match.ts
new file mode 100644
index 00000000..1f5c9228
--- /dev/null
+++ b/src/storage/source-match.ts
@@ -0,0 +1,86 @@
+// Shared source / source_prefix matching semantics for both storage
+// adapters. Extracted verbatim from MemoryStorage (whose behavior is the
+// contract) so SqliteStorage can apply the SAME predicate as a post-SQL
+// filter instead of raw `source = ?` / ASCII-case-insensitive `LIKE` —
+// those diverged on backslash-stored Windows sources, component
+// boundaries (`fs:/a/b` vs `fs:/a/bc`), prefix case (`GIT:` vs `git:`),
+// and trailing-slash equality.
+
+function stripTrailingSlash(value: string): string {
+  let out = value;
+  while (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
+  return out;
+}
+
+function pathStartIndex(value: string): number | null {
+  if (/^[A-Za-z]:[\\/]/.test(value)) return 0;
+  if (value.startsWith('/') || value.startsWith('~/') || value.startsWith('\\')) return 0;
+  const match = /^([A-Za-z_][A-Za-z0-9_+.-]*:)(.*)$/.exec(value);
+  if (match === null) return value.includes('\\') ? 0 : null;
+  const rest = match[2]!;
+  if (
+    rest.startsWith('/') ||
+    rest.startsWith('\\') ||
+    rest.startsWith('~/') ||
+    /^[A-Za-z]:[\\/]/.test(rest)
+  ) {
+    return match[1]!.length;
+  }
+  return null;
+}
+
+export function normalizePathLikeSource(value: string): string | null {
+  const start = pathStartIndex(value);
+  if (start === null) return null;
+  const sourcePrefix = value.slice(0, start);
+  const pathPart = stripTrailingSlash(value.slice(start).replace(/\\/g, '/'));
+  const windowsLike = process.platform === 'win32' || /^[A-Za-z]:(?:\/|$)/.test(pathPart);
+  const normalized = `${sourcePrefix}${pathPart}`;
+  return windowsLike ? normalized.toLowerCase() : normalized;
+}
+
+export function sourceEquals(left: string, right: string): boolean {
+  const normalizedLeft = normalizePathLikeSource(left);
+  const normalizedRight = normalizePathLikeSource(right);
+  if (normalizedLeft !== null && normalizedRight !== null)
+    return normalizedLeft === normalizedRight;
+  return left === right;
+}
+
+export function sourceHasPrefix(source: string, prefix: string): boolean {
+  const normalizedSource = normalizePathLikeSource(source);
+  const normalizedPrefix = normalizePathLikeSource(prefix);
+  if (normalizedSource !== null && normalizedPrefix !== null) {
+    if (normalizedSource === normalizedPrefix) return true;
+    return normalizedSource.startsWith(
+      normalizedPrefix.endsWith('/') ? normalizedPrefix : `${normalizedPrefix}/`,
+    );
+  }
+  return source.startsWith(prefix);
+}
+
+/** Coarse SQL prefilter for SqliteStorage: the portion of a source /
+ *  source_prefix filter value before its first path separator (`/` or
+ *  `\`), e.g. `fs:` from `fs:/a/b`, `C:` from `C:/Users/me/`, the whole
+ *  string from separator-free values like `coord:`. Matching it with an
+ *  ASCII-case-insensitive `LIKE chunk%` is provably a SUPERSET of the JS
+ *  predicates above: normalization never alters the pre-separator chunk
+ *  except by case-folding (backslash→slash and trailing-slash stripping
+ *  only touch the path part at/after the first separator), and SQLite
+ *  LIKE's case-insensitivity covers both the Windows case-fold and the
+ *  case-sensitive raw-startsWith fallback. Returns null (no usable
+ *  prefilter — caller must full-scan) when the value starts with a
+ *  separator, or when the chunk contains non-ASCII characters (LIKE's
+ *  case-insensitivity is ASCII-only, so it could NOT cover a win32
+ *  case-fold of a non-ASCII letter and the superset guarantee would
+ *  break). The JS predicate remains authoritative; this only narrows
+ *  the candidate rows. */
+export function likePrefilterChunk(value: string): string | null {
+  const sep = value.search(/[\\/]/);
+  if (sep === 0) return null;
+  const chunk = sep === -1 ? value : value.slice(0, sep);
+  for (let i = 0; i < chunk.length; i++) {
+    if (chunk.charCodeAt(i) > 0x7f) return null;
+  }
+  return chunk;
+}
diff --git a/src/storage/sqlite.ts b/src/storage/sqlite.ts
index 343b6447..f46370ad 100644
--- a/src/storage/sqlite.ts
+++ b/src/storage/sqlite.ts
@@ -12,6 +12,12 @@ import {
   type Storage,
 } from './interface.js';
 import { canonicalizeTimestamps, migrate } from './migrate.js';
+import {
+  likePrefilterChunk,
+  normalizePathLikeSource,
+  sourceEquals,
+  sourceHasPrefix,
+} from './source-match.js';
 import { createLogger } from '../logging/index.js';
 import { canonicalizeTimestamp } from '../util/timestamp.js';
 
@@ -104,13 +110,39 @@ export class SqliteStorage implements Storage {
     const until = filter?.until !== undefined ? canonicalizeTimestamp(filter.until) : undefined;
     const clauses: string[] = [];
     const params: Record<string, unknown> = {};
+    // Source matching semantics are shared with MemoryStorage via
+    // source-match.ts — raw SQL `=` / `LIKE prefix%` diverged on
+    // backslash-stored Windows sources, component boundaries, prefix
+    // case (LIKE is ASCII-case-insensitive), and trailing-slash
+    // equality. When the JS predicate is needed, SQL keeps only a
+    // provably-superset coarse prefilter (LIKE on the pre-separator
+    // chunk — see likePrefilterChunk) and the predicate + LIMIT move to
+    // JS so the page can't run short.
+    let jsSourcePredicate: ((source: string) => boolean) | undefined;
     if (filter?.source !== undefined) {
-      clauses.push('source = @source');
-      params['source'] = filter.source;
+      const source = filter.source;
+      if (normalizePathLikeSource(source) === null) {
+        // Non-path-like source: sourceEquals degrades to raw string
+        // equality for every stored row, which SQL's BINARY `=`
+        // implements exactly — keep the pure-SQL fast path.
+        clauses.push('source = @source');
+        params['source'] = source;
+      } else {
+        jsSourcePredicate = (s) => sourceEquals(s, source);
+      }
     }
     if (filter?.source_prefix !== undefined) {
-      clauses.push("source LIKE @source_prefix || '%' ESCAPE '\\'");
-      params['source_prefix'] = filter.source_prefix.replace(/[\\%_]/g, '\\$&');
+      // Even non-path-like prefixes need the JS predicate: LIKE's
+      // ASCII-case-insensitivity would let 'GIT:%' match 'git:...'.
+      const prefix = filter.source_prefix;
+      jsSourcePredicate = (s) => sourceHasPrefix(s, prefix);
+    }
+    if (jsSourcePredicate !== undefined) {
+      const chunk = likePrefilterChunk(filter!.source ?? filter!.source_prefix!);
+      if (chunk !== null) {
+        clauses.push("source LIKE @source_chunk || '%' ESCAPE '\\'");
+        params['source_chunk'] = chunk.replace(/[\\%_]/g, '\\$&');
+      }
     }
     if (since !== undefined) {
       clauses.push('timestamp >= @since');
@@ -177,8 +209,12 @@ export class SqliteStorage implements Storage {
     }
 
     const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
-    const limitClause = filter?.limit !== undefined ? 'LIMIT @limit' : '';
-    if (filter?.limit !== undefined) params['limit'] = filter.limit;
+    // When a JS source predicate is active, SQL's WHERE is only a superset
+    // prefilter — applying LIMIT in SQL would count rows the predicate
+    // later drops and return a short page. Move the limit to JS then.
+    const limitInSql = filter?.limit !== undefined && jsSourcePredicate === undefined;
+    const limitClause = limitInSql ? 'LIMIT @limit' : '';
+    if (limitInSql) params['limit'] = filter!.limit;
 
     const order = filter?.order ?? 'desc';
     const orderSql = order === 'asc' ? 'ASC' : 'DESC';
@@ -192,7 +228,14 @@ export class SqliteStorage implements Storage {
       stmt = this.db.prepare(sql);
       this.queryStmtCache.set(sql, stmt);
     }
-    const rows = stmt.all(params) as EventRow[];
+    let rows = stmt.all(params) as EventRow[];
+    if (jsSourcePredicate !== undefined) {
+      const predicate = jsSourcePredicate;
+      rows = rows.filter((r) => predicate(r.source));
+      if (filter?.limit !== undefined && rows.length > filter.limit) {
+        rows = rows.slice(0, filter.limit);
+      }
+    }
     return rows.map(rowToEvent);
   }
 
diff --git a/tests/packaging/packed-manifest.test.ts b/tests/packaging/packed-manifest.test.ts
index f3373d6e..e4a3a9d5 100644
--- a/tests/packaging/packed-manifest.test.ts
+++ b/tests/packaging/packed-manifest.test.ts
@@ -270,6 +270,8 @@ describe('packed package manifest', () => {
         "dist/storage/migrate.d.ts",
         "dist/storage/migrate.js",
         "dist/storage/migrations/0001_initial.sql",
+        "dist/storage/source-match.d.ts",
+        "dist/storage/source-match.js",
         "dist/storage/sqlite.d.ts",
         "dist/storage/sqlite.js",
         "dist/trace/auto-expand.d.ts",
diff --git a/tests/storage/source-match-conformance.test.ts b/tests/storage/source-match-conformance.test.ts
new file mode 100644
index 00000000..7ffb4fc6
--- /dev/null
+++ b/tests/storage/source-match-conformance.test.ts
@@ -0,0 +1,151 @@
+import { afterEach, beforeEach, describe, expect, it } from 'vitest';
+import type { CaptureEvent, Storage } from '../../src/storage/interface.js';
+import { MemoryStorage } from '../../src/storage/memory.js';
+import { SqliteStorage } from '../../src/storage/sqlite.js';
+
+function eventInput(overrides: Partial<Omit<CaptureEvent, 'id'>> = {}): Omit<CaptureEvent, 'id'> {
+  return {
+    source: 'fs:test',
+    timestamp: '2026-04-30T12:00:00.000Z',
+    content: 'hello',
+    ...overrides,
+  };
+}
+
+// Conformance suite: the SAME table of source / source_prefix cases runs
+// against BOTH storage adapters. MemoryStorage's normalization semantics
+// (src/storage/source-match.ts — backslash→slash, trailing-slash strip,
+// Windows case-folding, component-boundary prefix matching) ARE the
+// contract; SqliteStorage must produce identical results, not raw
+// `source = ?` / ASCII-case-insensitive `LIKE prefix%` results.
+const backends = [
+  { name: 'MemoryStorage', create: (): Storage => new MemoryStorage() },
+  { name: 'SqliteStorage', create: (): Storage => new SqliteStorage(':memory:') },
+];
+
+describe.each(backends)('source matching conformance — $name', ({ create }) => {
+  let store: Storage;
+
+  beforeEach(() => {
+    store = create();
+  });
+
+  afterEach(() => {
+    if (store instanceof SqliteStorage) store.close();
+  });
+
+  describe('path-like normalization (divergence class: Windows separators + case)', () => {
+    it('matches a backslash-stored Windows source via a forward-slash source_prefix', async () => {
+      await store.append(
+        eventInput({ source: 'C:\\Users\\me\\.codex\\sessions\\a.jsonl', content: 'win-row' }),
+      );
+      const r = await store.query({ source_prefix: 'C:/Users/me/.codex/sessions/' });
+      expect(r.map((e) => e.content)).toEqual(['win-row']);
+    });
+
+    it('matches a backslash-stored Windows source via a forward-slash exact source', async () => {
+      await store.append(
+        eventInput({ source: 'C:\\Users\\me\\.codex\\sessions\\a.jsonl', content: 'win-row' }),
+      );
+      const r = await store.query({ source: 'C:/Users/me/.codex/sessions/a.jsonl' });
+      expect(r.map((e) => e.content)).toEqual(['win-row']);
+    });
+
+    it('case-folds Windows drive-letter paths on both sides of a prefix match', async () => {
+      await store.append(
+        eventInput({ source: 'C:\\DEV\\Project_echo\\notes.md', content: 'case-row' }),
+      );
+      const r = await store.query({ source_prefix: 'c:/dev/project_echo' });
+      expect(r.map((e) => e.content)).toEqual(['case-row']);
+    });
+  });
+
+  describe('component-boundary prefix matching (divergence class: raw LIKE prefix%)', () => {
+    it('source_prefix "fs:/a/b" does NOT match "fs:/a/bc" (boundary enforced)', async () => {
+      await store.append(eventInput({ source: 'fs:/a/bc', content: 'sibling' }));
+      await store.append(
+        eventInput({
+          source: 'fs:/a/b/leaf',
+          timestamp: '2026-04-30T12:01:00.000Z',
+          content: 'child',
+        }),
+      );
+      const r = await store.query({ source_prefix: 'fs:/a/b' });
+      expect(r.map((e) => e.content)).toEqual(['child']);
+    });
+  });
+
+  describe('case sensitivity for non-path-like prefixes (divergence class: ASCII-insensitive LIKE)', () => {
+    it('source_prefix "GIT:" does NOT match a "git:..." source', async () => {
+      await store.append(eventInput({ source: 'git:repo-events', content: 'git-row' }));
+      expect(await store.query({ source_prefix: 'GIT:' })).toHaveLength(0);
+    });
+  });
+
+  describe('trailing-slash equality (divergence class: raw source = ?)', () => {
+    it('a trailing-slash-stored path-like source matches the slashless exact source', async () => {
+      await store.append(eventInput({ source: 'fs:/repo/dir/', content: 'dir-row' }));
+      const r = await store.query({ source: 'fs:/repo/dir' });
+      expect(r.map((e) => e.content)).toEqual(['dir-row']);
+    });
+  });
+
+  describe('limit composes with source_prefix matching (page must not run short)', () => {
+    it('limit counts only rows the prefix predicate accepts', async () => {
+      // Newest row is a boundary NON-match — if the adapter applies LIMIT
+      // before the real predicate (e.g. SQL LIMIT over a LIKE superset),
+      // the page comes back short with 1 row instead of 2.
+      await store.append(
+        eventInput({
+          source: 'fs:/a/b/one',
+          timestamp: '2026-04-30T12:00:00.000Z',
+          content: 'one',
+        }),
+      );
+      await store.append(
+        eventInput({ source: 'fs:/a/bc', timestamp: '2026-04-30T12:02:00.000Z', content: 'noise' }),
+      );
+      await store.append(
+        eventInput({
+          source: 'fs:/a/b/two',
+          timestamp: '2026-04-30T12:01:00.000Z',
+          content: 'two',
+        }),
+      );
+      const r = await store.query({ source_prefix: 'fs:/a/b', limit: 2 });
+      expect(r.map((e) => e.content)).toEqual(['two', 'one']);
+    });
+  });
+
+  describe('canonical inputs (regression anchors — already pass on both adapters)', () => {
+    it('exact non-path-like source match stays exact', async () => {
+      await store.append(eventInput({ source: 'fs:cursor', content: 'cur' }));
+      await store.append(
+        eventInput({ source: 'api:github', timestamp: '2026-04-30T12:01:00.000Z', content: 'gh' }),
+      );
+      const r = await store.query({ source: 'fs:cursor' });
+      expect(r.map((e) => e.content)).toEqual(['cur']);
+      expect(await store.query({ source: 'api:slack' })).toHaveLength(0);
+    });
+
+    it('non-path-like scheme prefix "coord:" matches coord atoms case-sensitively', async () => {
+      await store.append(eventInput({ source: 'coord:claude:tick', content: 'coord-row' }));
+      await store.append(
+        eventInput({ source: 'git:repo', timestamp: '2026-04-30T12:01:00.000Z', content: 'other' }),
+      );
+      const r = await store.query({ source_prefix: 'coord:' });
+      expect(r.map((e) => e.content)).toEqual(['coord-row']);
+    });
+
+    it('canonical forward-slash prefix matches a deeper canonical path', async () => {
+      await store.append(
+        eventInput({
+          source: 'fs:/Users/zhen/.claude/projects/abc/s.jsonl',
+          content: 'session-row',
+        }),
+      );
+      const r = await store.query({ source_prefix: 'fs:/Users/zhen/.claude/' });
+      expect(r.map((e) => e.content)).toEqual(['session-row']);
+    });
+  });
+});
````

## Commit 24dc37f7 — fix(capture): per-turn offset checkpoint, invalid-timestamp guard, rejection containment

````diff
commit 24dc37f773f5db7530148c29effd0eb2f0c8cc56
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 10:40:53 2026 -0700

    fix(capture): per-turn offset checkpoint, invalid-timestamp guard, rejection containment
    
    Audit fix ② of 5, three P1s:
    (A) JSONL extractors persisted byte offsets only after the whole batch;
        a mid-batch append throw re-appended every prior turn on each poll
        tick (duplicate-atom storm). Both extractors now checkpoint per
        successfully-processed turn (the Cursor extractor's proven pattern).
    (B) gate accepts any non-empty timestamp string but the pipeline's
        canonicalization threw RangeError post-accept on unparseable
        instants, poisoning extractor batch loops. processCandidate now
        rejects with reason 'invalid_timestamp' (warn-logged) so offsets
        advance past poison lines.
    (C) fs-watcher's bare void emit and git-watcher's .finally-only track()
        chain re-rejected unhandled with no process-level handler — one
        transient storage error could kill the daemon. Both paths now catch
        and log; daemon installs a log-don't-exit unhandledRejection guard.
    
    TDD: RED reproduced all three (duplicate re-append, post-gate throw,
    escaped rejection); GREEN: tests/capture 241 passed, typecheck + lint
    clean. (Agent session died mid-run; completed and lint-fixed by
    strategist — RejectingStorage unused param dropped in both watcher
    tests.)
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/src/capture/extractors/claude-code.ts b/src/capture/extractors/claude-code.ts
index 864021ad..765738ab 100644
--- a/src/capture/extractors/claude-code.ts
+++ b/src/capture/extractors/claude-code.ts
@@ -605,6 +605,10 @@ export async function startClaudeCodeExtractor(
       } else {
         log.warn('candidate_rejected', { reason: result.reason, path });
       }
+      // Checkpoint per processed turn (cursor.ts's per-turn lastSeenMap.set is
+      // the in-tree precedent): a mid-batch throw on a later turn then resumes
+      // AFTER this one instead of durably re-appending it on every poll tick.
+      offsetMap.set(path, { offset: turn.byte_offset, turn_index: nextTurnIndex - 1 });
     }
     offsetMap.set(path, { offset: newOffset, turn_index: nextTurnIndex - 1 });
   }
diff --git a/src/capture/extractors/codex.ts b/src/capture/extractors/codex.ts
index ac386fdf..e3c09e5d 100644
--- a/src/capture/extractors/codex.ts
+++ b/src/capture/extractors/codex.ts
@@ -822,6 +822,17 @@ export async function startCodexExtractor(
       } else {
         log.warn('candidate_rejected', { reason: result.reason, path });
       }
+      // Checkpoint per processed turn (cursor.ts's per-turn lastSeenMap.set is
+      // the in-tree precedent): a mid-batch throw on a later turn then resumes
+      // AFTER this one instead of durably re-appending it on every poll tick.
+      const checkpoint: OffsetEntry = { offset: turn.byte_offset, turn_index: nextTurnIndex - 1 };
+      const cpCwd = turn.cwd ?? cur.cwd;
+      const cpGit = turn.git ?? cur.git;
+      const cpCodex = turn.codex ?? cur.codex;
+      if (cpCwd !== undefined) checkpoint.cwd = cpCwd;
+      if (cpGit !== undefined) checkpoint.git = cpGit;
+      if (cpCodex !== undefined) checkpoint.codex = cpCodex;
+      offsetMap.set(path, checkpoint);
     }
     const nextCwd = passCwd ?? cur.cwd;
     const nextGit = passGit ?? cur.git;
diff --git a/src/capture/pipeline.ts b/src/capture/pipeline.ts
index cde90b07..a7a85dbf 100644
--- a/src/capture/pipeline.ts
+++ b/src/capture/pipeline.ts
@@ -1,9 +1,17 @@
+import { createLogger } from '../logging/index.js';
 import type { CaptureEvent, EventId, Storage } from '../storage/interface.js';
 import { gate, type RejectionReason } from './gate.js';
 
+const log = createLogger('capture.pipeline');
+
+/** Gate rejections plus the pipeline's own post-gate canonicalization
+ *  rejection: the gate only requires a non-empty timestamp string, so an
+ *  unparseable instant (e.g. "n/a") is detected here, not there. */
+export type PipelineRejectionReason = RejectionReason | 'invalid_timestamp';
+
 export type PipelineResult =
   | { accepted: true; id: EventId }
-  | { accepted: false; reason: RejectionReason };
+  | { accepted: false; reason: PipelineRejectionReason };
 
 // Single capture-pipeline chokepoint that all surfaces flow through. Surfaces
 // emit timestamps in any ISO 8601 TZ form (git-watcher uses `±HH:MM` from
@@ -32,6 +40,20 @@ export async function processCandidate(event: unknown, storage: Storage): Promis
     metadata?: Record<string, unknown>;
   };
 
+  // Guard canonicalization: the gate only checks for a non-empty string, so
+  // an unparseable instant would otherwise throw RangeError AFTER gate-accept
+  // — poisoning extractor batch loops (offset never advances past the bad
+  // line) and watcher emit paths. Reject like a gate rejection instead so
+  // callers' existing "rejected turns are dropped while offset advances"
+  // semantics apply.
+  const withTz = TZ_MARKER_RE.test(validated.timestamp)
+    ? validated.timestamp
+    : validated.timestamp + 'Z';
+  if (Number.isNaN(new Date(withTz).getTime())) {
+    log.warn('rejected', { reason: 'invalid_timestamp', source: validated.source });
+    return { accepted: false, reason: 'invalid_timestamp' };
+  }
+
   const toAppend: Omit<CaptureEvent, 'id'> = {
     source: validated.source,
     timestamp: canonicalizeTimestamp(validated.timestamp),
diff --git a/src/capture/surfaces/fs-watcher.ts b/src/capture/surfaces/fs-watcher.ts
index 467e03e8..fb648e12 100644
--- a/src/capture/surfaces/fs-watcher.ts
+++ b/src/capture/surfaces/fs-watcher.ts
@@ -101,14 +101,23 @@ export async function startFsWatcher(
     ignored,
   });
 
+  // emitCandidate has no internal try/catch, so a storage failure would
+  // otherwise escape the fire-and-forget call as an unhandled rejection and
+  // kill the daemon. Mirror the extractors' handler_error containment.
+  function emitSafely(event_type: EventType, p: string, stats: Stats | undefined): void {
+    emitCandidate(event_type, p, stats, storage).catch((err: unknown) => {
+      log.error('handler_error', { message: (err as Error).message, path: p });
+    });
+  }
+
   watcher.on('add', (p: string, stats?: Stats) => {
-    void emitCandidate('add', p, stats, storage);
+    emitSafely('add', p, stats);
   });
   watcher.on('change', (p: string, stats?: Stats) => {
-    void emitCandidate('change', p, stats, storage);
+    emitSafely('change', p, stats);
   });
   watcher.on('unlink', (p: string) => {
-    void emitCandidate('unlink', p, undefined, storage);
+    emitSafely('unlink', p, undefined);
   });
   watcher.on('error', (err: unknown) => {
     log.error('watcher_error', { message: (err as Error).message });
diff --git a/src/capture/surfaces/git-watcher.ts b/src/capture/surfaces/git-watcher.ts
index 49cd64c1..31ddb70e 100644
--- a/src/capture/surfaces/git-watcher.ts
+++ b/src/capture/surfaces/git-watcher.ts
@@ -349,7 +349,12 @@ export async function startGitWatcher(
 
   function track(p: Promise<void>): void {
     inFlight.add(p);
-    p.finally(() => inFlight.delete(p));
+    // .catch before .finally: a bare .finally on a rejected promise derives a
+    // NEW rejected promise with no handler — an unhandled rejection that can
+    // kill the daemon. Log instead (extractors' handler_error pattern).
+    p.catch((err: unknown) => {
+      log.error('handler_error', { message: (err as Error).message });
+    }).finally(() => inFlight.delete(p));
   }
 
   async function refreshRepo(state: RepoState): Promise<void> {
diff --git a/src/daemon/index.ts b/src/daemon/index.ts
index eff45220..bad42df2 100644
--- a/src/daemon/index.ts
+++ b/src/daemon/index.ts
@@ -35,6 +35,17 @@ function createStorage(): { storage: Storage; backend: 'memory' | 'sqlite'; disp
   return { storage: sqlite, backend: 'sqlite', dispose: () => sqlite.close() };
 }
 
+// Last-resort guard: a stray rejection escaping any capture surface or
+// fire-and-forget path must not kill the daemon. Surfaces own their local
+// catch-and-log (handler_error); this only catches what they miss. Log via
+// the structured logger and keep running.
+const daemonLog = createLogger('daemon');
+process.on('unhandledRejection', (reason: unknown) => {
+  daemonLog.error('unhandled_rejection', {
+    message: reason instanceof Error ? reason.message : String(reason),
+  });
+});
+
 const dataDir = resolveDataDir();
 acquirePidLockOrExit(dataDir);
 
diff --git a/tests/capture/extractors/claude-code.test.ts b/tests/capture/extractors/claude-code.test.ts
index bf3d6640..7eafae06 100644
--- a/tests/capture/extractors/claude-code.test.ts
+++ b/tests/capture/extractors/claude-code.test.ts
@@ -7,11 +7,30 @@ import {
   startClaudeCodeExtractor,
   type ClaudeCodeExtractorHandle,
 } from '../../../src/capture/extractors/claude-code.js';
+import type { CaptureEvent, EventId } from '../../../src/storage/interface.js';
 import { MemoryStorage } from '../../../src/storage/memory.js';
 import { resetAllowlist, restoreFsPaths, snapshotFsPaths } from '../../fixtures/allowlist.js';
 import { appendJsonl, tmpDir, waitFor, writeJsonl as writeJsonlFresh } from '../../fixtures/jsonl.js';
 import { captureStdout } from '../../fixtures/stdout.js';
 
+/** Storage whose append throws once for the event whose content contains the
+ *  marker — simulates a mid-batch storage failure inside handleJsonlChange. */
+class MidBatchFailingStorage extends MemoryStorage {
+  private failedOnce = false;
+
+  constructor(private readonly failContentMarker: string) {
+    super();
+  }
+
+  override async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
+    if (!this.failedOnce && event.content.includes(this.failContentMarker)) {
+      this.failedOnce = true;
+      throw new Error('synthetic append failure');
+    }
+    return super.append(event);
+  }
+}
+
 interface JsonlLine {
   type: 'user' | 'assistant';
   sessionId: string;
@@ -826,6 +845,38 @@ describe('startClaudeCodeExtractor (lifecycle + integration)', () => {
     expect(md['model']).toBe('claude-opus-4-7');
   });
 
+  it('does not re-append already-stored turns when a mid-batch append throws (per-turn offset checkpoint)', async () => {
+    // Bug A: turns are appended one-by-one but the offset map was only
+    // persisted after the loop. A throw on turn 2 left the offset at the
+    // pre-batch position, so the next change event re-appended turn 1.
+    const flaky = new MidBatchFailingStorage('ASSISTANT: A2');
+    handle = await startClaudeCodeExtractor(flaky, { projectsPrefix });
+    const path = join(projDir, 'sess.jsonl');
+
+    // Two closed clusters in one batch: turn 1 = Q1/A1 (closed by u2),
+    // turn 2 = Q2/A2 (closed by u3). The append for turn 2 throws once.
+    writeJsonlFresh(path, [
+      userText('s1', 'u1', 'Q1'),
+      assistantText('s1', 'a1', 'A1'),
+      userText('s1', 'u2', 'Q2'),
+      assistantText('s1', 'a2', 'A2'),
+      userText('s1', 'u3', 'Q3'),
+    ]);
+
+    // Turn 1 lands; turn 2 throws mid-batch and surfaces as handler_error.
+    await waitFor(async () => (await flaky.count()) >= 1);
+    await waitFor(() => captured.writes.join('').includes('handler_error'));
+
+    // A later append triggers the next handler run; appends now succeed.
+    appendJsonl(path, [assistantText('s1', 'a3', 'A3'), userText('s1', 'u4', 'Q4')]);
+    await waitFor(async () => (await flaky.count()) >= 3);
+
+    const events = await flaky.query({ order: 'asc' });
+    expect(events.filter((e) => e.content === 'USER: Q1\n\nASSISTANT: A1')).toHaveLength(1);
+    expect(events.some((e) => e.content === 'USER: Q2\n\nASSISTANT: A2')).toBe(true);
+    expect(events.some((e) => e.content === 'USER: Q3\n\nASSISTANT: A3')).toBe(true);
+  });
+
   it('stop() resolves cleanly and prevents further events', async () => {
     handle = await startClaudeCodeExtractor(storage, { projectsPrefix });
     const path = join(projDir, 'sess.jsonl');
diff --git a/tests/capture/extractors/codex.test.ts b/tests/capture/extractors/codex.test.ts
index 0354de97..77c69c84 100644
--- a/tests/capture/extractors/codex.test.ts
+++ b/tests/capture/extractors/codex.test.ts
@@ -7,11 +7,30 @@ import {
   startCodexExtractor,
   type CodexExtractorHandle,
 } from '../../../src/capture/extractors/codex.js';
+import type { CaptureEvent, EventId } from '../../../src/storage/interface.js';
 import { MemoryStorage } from '../../../src/storage/memory.js';
 import { resetAllowlist, restoreFsPaths, snapshotFsPaths } from '../../fixtures/allowlist.js';
 import { appendJsonl, tmpDir, waitFor, writeJsonl } from '../../fixtures/jsonl.js';
 import { captureStdout } from '../../fixtures/stdout.js';
 
+/** Storage whose append throws once for the event whose content contains the
+ *  marker — simulates a mid-batch storage failure inside handleJsonlChange. */
+class MidBatchFailingStorage extends MemoryStorage {
+  private failedOnce = false;
+
+  constructor(private readonly failContentMarker: string) {
+    super();
+  }
+
+  override async append(event: Omit<CaptureEvent, 'id'>): Promise<EventId> {
+    if (!this.failedOnce && event.content.includes(this.failContentMarker)) {
+      this.failedOnce = true;
+      throw new Error('synthetic append failure');
+    }
+    return super.append(event);
+  }
+}
+
 // ─── JSONL line builders matching Codex's wire format ───────────────────────
 
 interface CodexLine {
@@ -1085,6 +1104,38 @@ describe('startCodexExtractor (lifecycle + integration)', () => {
     expect((fresh!.metadata as Record<string, unknown>)['turn_index']).toBe(1);
   });
 
+  it('does not re-append already-stored turns when a mid-batch append throws (per-turn offset checkpoint)', async () => {
+    // Bug A: turns are appended one-by-one but the offset map was only
+    // persisted after the loop. A throw on turn 2 left the offset at the
+    // pre-batch position, so the next change event re-appended turn 1.
+    const flaky = new MidBatchFailingStorage('ASSISTANT: a2');
+    handle = await startCodexExtractor(flaky, { sessionsPrefix });
+
+    // Two closed clusters in one batch: turn 1 = q1/a1 (closed by q2),
+    // turn 2 = q2/a2 (closed by q3). The append for turn 2 throws once.
+    writeJsonl(path, [
+      sessionMeta(),
+      userMsg('q1'),
+      assistantMsg('a1'),
+      userMsg('q2'),
+      assistantMsg('a2'),
+      userMsg('q3'),
+    ]);
+
+    // Turn 1 lands; turn 2 throws mid-batch and surfaces as handler_error.
+    await waitFor(async () => (await flaky.count()) >= 1);
+    await waitFor(() => captured.writes.join('').includes('handler_error'));
+
+    // A later append triggers the next handler run; appends now succeed.
+    appendJsonl(path, [assistantMsg('a3'), userMsg('q4')]);
+    await waitFor(async () => (await flaky.count()) >= 3);
+
+    const events = await flaky.query({ order: 'asc' });
+    expect(events.filter((e) => e.content === 'USER: q1\n\nASSISTANT: a1')).toHaveLength(1);
+    expect(events.some((e) => e.content === 'USER: q2\n\nASSISTANT: a2')).toBe(true);
+    expect(events.some((e) => e.content === 'USER: q3\n\nASSISTANT: a3')).toBe(true);
+  });
+
   it('stop() resolves cleanly and prevents further events', async () => {
     handle = await startCodexExtractor(storage, { sessionsPrefix });
     writeJsonl(path, [sessionMeta(), userMsg('q'), assistantMsg('a'), userMsg('next')]);
diff --git a/tests/capture/pipeline.test.ts b/tests/capture/pipeline.test.ts
index 19cb2250..a58edb6f 100644
--- a/tests/capture/pipeline.test.ts
+++ b/tests/capture/pipeline.test.ts
@@ -200,6 +200,39 @@ describe('processCandidate', () => {
       expect(evt!.timestamp).toBe('2026-05-08T07:00:00.000Z');
     });
   });
+
+  describe('reject path — unparseable timestamp (Bug B)', () => {
+    beforeEach(() => {
+      const apis = CAPTURED_SOURCES.apis as unknown as string[];
+      apis.push('github');
+    });
+
+    it('rejects with invalid_timestamp instead of throwing; storage untouched', async () => {
+      // Gate only requires a non-empty string, so "n/a" passes the gate but
+      // cannot be canonicalized. Pre-fix this threw RangeError AFTER
+      // gate-accept, poisoning the extractor loops (Bug A) and the watcher
+      // emit paths (Bug C).
+      const result = await processCandidate(
+        validEvent({ source: 'api:github', timestamp: 'n/a' }),
+        storage,
+      );
+
+      expect(result).toEqual({ accepted: false, reason: 'invalid_timestamp' });
+      expect(await storage.count()).toBe(0);
+    });
+
+    it('logs a warn line naming the rejection reason and source', async () => {
+      const captured = captureStdout();
+      try {
+        await processCandidate(validEvent({ source: 'api:github', timestamp: 'n/a' }), storage);
+      } finally {
+        captured.restore();
+      }
+      const out = captured.writes.join('');
+      expect(out).toContain('invalid_timestamp');
+      expect(out).toContain('api:github');
+    });
+  });
 });
 
 describe('canonicalizeTimestamp (pure helper)', () => {
diff --git a/tests/capture/surfaces/fs-watcher.test.ts b/tests/capture/surfaces/fs-watcher.test.ts
index 272a5436..caf82e3c 100644
--- a/tests/capture/surfaces/fs-watcher.test.ts
+++ b/tests/capture/surfaces/fs-watcher.test.ts
@@ -1,4 +1,4 @@
-import { mkdtempSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
+import { mkdtempSync, realpathSync, rmSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 import { afterEach, beforeEach, describe, expect, it } from 'vitest';
@@ -8,9 +8,10 @@ import {
   startFsWatcher,
   type FsWatcherHandle,
 } from '../../../src/capture/surfaces/fs-watcher.js';
-import type { CaptureEvent } from '../../../src/storage/interface.js';
+import type { CaptureEvent, EventId } from '../../../src/storage/interface.js';
 import { MemoryStorage } from '../../../src/storage/memory.js';
 import { resetAllowlist, restoreFsPaths, snapshotFsPaths } from '../../fixtures/allowlist.js';
+import { waitFor } from '../../fixtures/jsonl.js';
 import { captureStdout } from '../../fixtures/stdout.js';
 
 async function waitForCount(
@@ -174,6 +175,65 @@ describe.skip('startFsWatcher', () => {
   });
 });
 
+// NOT part of the quarantined block above: a single watcher instance with no
+// sibling watcher tests racing its stop() — the quarantine's flake mode
+// (afterEach close racing the NEXT test's chokidar setup) doesn't apply.
+describe('startFsWatcher emit-path error containment (Bug C)', () => {
+  class RejectingStorage extends MemoryStorage {
+    override async append(): Promise<EventId> {
+      throw new Error('synthetic storage failure');
+    }
+  }
+
+  let dir: string;
+  let handle: FsWatcherHandle | null = null;
+  let originalFsPaths: string[];
+  let captured: ReturnType<typeof captureStdout>;
+
+  beforeEach(() => {
+    originalFsPaths = snapshotFsPaths();
+    // realpath so chokidar's resolved event paths (macOS /var → /private/var)
+    // match the allowlist entry — same trick as the git-watcher harness.
+    dir = realpathSync(mkdtempSync(join(tmpdir(), 'echo-fs-watcher-bugc-')));
+    captured = captureStdout();
+    (CAPTURED_SOURCES.fs_paths as unknown as string[]).push(`${dir}/`);
+  });
+
+  afterEach(async () => {
+    if (handle !== null) {
+      await handle.stop();
+      handle = null;
+    }
+    captured.restore();
+    resetAllowlist();
+    restoreFsPaths(originalFsPaths);
+    rmSync(dir, { recursive: true, force: true });
+  });
+
+  it('logs handler_error instead of leaking an unhandled rejection when storage append rejects', async () => {
+    const unhandled: unknown[] = [];
+    const onUnhandled = (reason: unknown): void => {
+      unhandled.push(reason);
+    };
+    process.on('unhandledRejection', onUnhandled);
+    try {
+      handle = await startFsWatcher([dir], new RejectingStorage());
+      writeFileSync(join(dir, 'a.txt'), 'hello');
+
+      await waitFor(
+        () => unhandled.length > 0 || captured.writes.join('').includes('handler_error'),
+      );
+      // Give any still-in-flight rejection a beat to surface as unhandled.
+      await new Promise((r) => setTimeout(r, 100));
+
+      expect(unhandled).toHaveLength(0);
+      expect(captured.writes.join('')).toContain('handler_error');
+    } finally {
+      process.off('unhandledRejection', onUnhandled);
+    }
+  });
+});
+
 describe('classifyKind', () => {
   it("returns 'cursor-workspace' for paths under the Cursor workspace prefix", () => {
     const path = `${process.env['HOME']!}/Library/Application Support/Cursor/User/workspaceStorage/abc/state.vscdb`;
diff --git a/tests/capture/surfaces/git-watcher.test.ts b/tests/capture/surfaces/git-watcher.test.ts
index c87e0ae2..34e676b8 100644
--- a/tests/capture/surfaces/git-watcher.test.ts
+++ b/tests/capture/surfaces/git-watcher.test.ts
@@ -10,10 +10,19 @@ import {
   startGitWatcher,
   type GitWatcherHandle,
 } from '../../../src/capture/surfaces/git-watcher.js';
-import type { CaptureEvent } from '../../../src/storage/interface.js';
+import type { CaptureEvent, EventId } from '../../../src/storage/interface.js';
 import { MemoryStorage } from '../../../src/storage/memory.js';
+import { waitFor } from '../../fixtures/jsonl.js';
 import { captureStdout } from '../../fixtures/stdout.js';
 
+/** Storage whose append always rejects — exercises the watcher's error
+ *  containment (Bug C: track()'s .finally-only chain re-rejected unhandled). */
+class RejectingStorage extends MemoryStorage {
+  override async append(): Promise<EventId> {
+    throw new Error('synthetic storage failure');
+  }
+}
+
 const execFileP = promisify(execFile);
 
 async function makeRepo(): Promise<string> {
@@ -274,6 +283,37 @@ describe('startGitWatcher', () => {
     }
   });
 
+  it('logs handler_error instead of leaking an unhandled rejection when storage append rejects (Bug C)', async () => {
+    const repo = await makeRepo();
+    cleanups.push(pushAllowedRepo(repo));
+    cleanups.push(() => rmSync(repo, { recursive: true, force: true }));
+    await commitFile(repo, 'a.txt', '1', 'first');
+
+    const unhandled: unknown[] = [];
+    const onUnhandled = (reason: unknown): void => {
+      unhandled.push(reason);
+    };
+    process.on('unhandledRejection', onUnhandled);
+    const captured = captureStdout();
+    try {
+      const h = await startGitWatcher([repo], new RejectingStorage(), { enableFsWatch: false });
+      handles.push(h);
+
+      await waitFor(
+        () => unhandled.length > 0 || captured.writes.join('').includes('handler_error'),
+        8000,
+      );
+      // Give any still-in-flight rejection a beat to surface as unhandled.
+      await new Promise((r) => setTimeout(r, 100));
+
+      expect(unhandled).toHaveLength(0);
+      expect(captured.writes.join('')).toContain('handler_error');
+    } finally {
+      captured.restore();
+      process.off('unhandledRejection', onUnhandled);
+    }
+  });
+
   it('respects ECHO_GIT_BACKFILL_COMMITS for backfill window', async () => {
     const repo = await makeRepo();
     cleanups.push(pushAllowedRepo(repo));
````

## Commit 9fdf95de — fix(review-queue): close two wrong-verdict holes in combine.py

````diff
commit 9fdf95decff7594f1df478a04da6a30b1dd3b9e3
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 10:41:11 2026 -0700

    fix(review-queue): close two wrong-verdict holes in combine.py
    
    Audit fix ③ of 5, two P1s:
    (O1) Optional-only rosters: all([]) made the round eligible the instant
         request.md existed → terminal no_responses escalation seconds after
         dispatch, before the reviewer's first tick. Eligibility now requires
         a first response OR the fallback timeout when zero required
         reviewers are requested; timeout-with-none-present then escalates
         correctly.
    (O2) 044 AC4 auto-disposition never checked that any PRESENT reviewer
         was REQUIRED — an optional reviewer's proceed could substitute for
         the silent required one. The branch now also requires
         present ∩ required_set; otherwise it escalates.
    
    Verdict-table docstrings updated. RED reproduced both wrong verdicts;
    GREEN: 79/79 across all seven combine-touching suites; 64/64 re-run on
    the combined tree; combined.schema.json untouched.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/tests/review-queue/n-reviewer-framework.test.ts b/tests/review-queue/n-reviewer-framework.test.ts
index 342826d7..0988e84f 100644
--- a/tests/review-queue/n-reviewer-framework.test.ts
+++ b/tests/review-queue/n-reviewer-framework.test.ts
@@ -536,3 +536,95 @@ describe('043 AC6 — N-way verdict roll-up', () => {
     expect(fm.escalated_to_founder).toBe(true);
   });
 });
+
+// --- Fix ③ — combiner wrong-verdict bugs O1 / O2 ---
+//
+// O1: optional-only roster (zero required reviewers requested) made the
+//     round eligible the instant request.md existed (`all([]) == True`),
+//     producing a terminal no_responses escalation seconds after dispatch —
+//     before the optional reviewer's first tick.
+// O2: the 044 AC4 auto-disposition branch never checked that any PRESENT
+//     reviewer is REQUIRED, so a round in which only an optional reviewer
+//     responded could be auto-dispositioned with zero required reviews.
+
+describe('fix ③ — O1: optional-only roster eligibility gate', () => {
+  let root: string;
+  beforeEach(() => {
+    root = setupRoot();
+  });
+  afterEach(() => {
+    rmSync(root, { recursive: true, force: true });
+  });
+
+  it('O1a: optional-only roster, zero responses, seconds after dispatch → NOT eligible (no instant no_responses)', () => {
+    // claude is the only requested reviewer and is required:false. 30s
+    // after requested_at the round must stay gated — NOT combine into a
+    // terminal no_responses escalation.
+    const dir = writeRequest(root, 1, ['claude'], '2026-05-13T08:00:00Z');
+    const r = runCombine(root, ['--now=2026-05-13T08:00:30Z']);
+    expect(r.code, r.stderr).toBe(0);
+    expect(r.stdout).toMatch(/no rounds to combine/);
+    expect(existsSync(join(dir, 'combined.md'))).toBe(false);
+  });
+
+  it('O1b: optional-only roster, zero responses, past fallback timeout → no_responses + escalated', () => {
+    // claude is headless (timeout_hours: null → FALLBACK_TIMEOUT_HOURS =
+    // 0.5h). 1h elapsed with zero responses → the no_responses escalation
+    // is now correct.
+    const dir = writeRequest(root, 1, ['claude'], '2026-05-13T07:00:00Z');
+    const r = runCombine(root, ['--now=2026-05-13T08:00:00Z']);
+    expect(r.code, r.stderr).toBe(0);
+    const fm = readCombinedFm(dir);
+    expect(fm.combined_verdict).toBe('no_responses');
+    expect(fm.escalated_to_founder).toBe(true);
+    expect(fm.claude_response).toBe(null);
+  });
+
+  it('O1c: optional-only roster, response present → combines on that response (optionals never gate)', () => {
+    const dir = writeRequest(root, 1, ['claude'], '2026-05-13T08:00:00Z');
+    writeReviewer(dir, 'claude', 1, 'proceed');
+    const r = runCombine(root, ['--now=2026-05-13T08:01:00Z']);
+    expect(r.code, r.stderr).toBe(0);
+    const fm = readCombinedFm(dir);
+    expect(fm.combined_verdict).toBe('proceed');
+    expect(fm.escalated_to_founder).toBe(false);
+    expect(fm.claude_response).toBe('claude.md');
+  });
+});
+
+describe('fix ③ — O2: auto-disposition requires a present REQUIRED reviewer', () => {
+  let root: string;
+  beforeEach(() => {
+    root = setupRoot();
+  });
+  afterEach(() => {
+    rmSync(root, { recursive: true, force: true });
+  });
+
+  it('O2a: required codex missing past timeout, only optional claude present (proceed) → escalates, NOT auto-disposition', () => {
+    // requested [codex(required), claude(optional)]. codex never responds;
+    // claude says proceed. 1h elapsed clears codex's 0.5h fallback timeout.
+    // 044 AC4 auto-disposition must NOT fire — zero required reviewers
+    // actually reviewed anything.
+    const dir = writeRequest(root, 1, ['codex', 'claude'], '2026-05-13T07:00:00Z');
+    writeReviewer(dir, 'claude', 1, 'proceed');
+    const r = runCombine(root, ['--now=2026-05-13T08:00:00Z']);
+    expect(r.code, r.stderr).toBe(0);
+    const fm = readCombinedFm(dir);
+    expect(fm.combined_verdict).toBe('partial_responses');
+    expect(fm.escalated_to_founder).toBe(true);
+  });
+
+  it('O2b guard: required codex present (proceed) + optional claude present (proceed), required cursor missing past timeout → auto-disposition preserved', () => {
+    // A present required reviewer keeps the 044 AC4 single-required-missing
+    // auto-disposition path intact. 3h elapsed clears cursor's 2h timeout.
+    const dir = writeRequest(root, 1, ['codex', 'cursor', 'claude'], '2026-05-13T05:00:00Z');
+    writeReviewer(dir, 'codex', 1, 'proceed');
+    writeReviewer(dir, 'claude', 1, 'proceed');
+    const r = runCombine(root, ['--now=2026-05-13T08:00:00Z']);
+    expect(r.code, r.stderr).toBe(0);
+    const fm = readCombinedFm(dir);
+    expect(fm.combined_verdict).toBe('partial_responses');
+    expect(fm.escalated_to_founder).toBe(false);
+  });
+});
diff --git a/tools/review-queue/combine.py b/tools/review-queue/combine.py
index 68a58c24..56a2ab28 100755
--- a/tools/review-queue/combine.py
+++ b/tools/review-queue/combine.py
@@ -122,13 +122,20 @@ def compute_combined_verdict(
 
     Verdict table (043 AC6, refined by 044 AC4):
       - No responses at all (all requested are missing) → ("no_responses", True)
+        (optional-only rosters reach this only after the find_eligible_rounds
+        first-response-or-timeout gate — see O1 fix there; a round is never
+        combined into no_responses at dispatch time)
       - Some required missing (and at least one present):
-          - 044 AC4: exactly ONE required missing AND every present
-            reviewer's verdict is in PROCEED_STAR → ("partial_responses", False)
+          - 044 AC4: exactly ONE required missing AND at least one PRESENT
+            reviewer is REQUIRED AND every present reviewer's verdict is in
+            PROCEED_STAR → ("partial_responses", False)
             (auto-disposition: strategist watcher dispositions through the
             normal path-(a)/(b)/(c) flow as if all reviewers had responded;
-            the missing reviewer is surfaced as a divergent row.)
-          - Otherwise (multi-missing OR any-pushback-with-missing) →
+            the missing reviewer is surfaced as a divergent row. The
+            present-required check is the O2 fix: a round in which only
+            OPTIONAL reviewers responded must never auto-disposition.)
+          - Otherwise (multi-missing OR any-pushback-with-missing OR
+            zero-present-required) →
             ("partial_responses", True)   # 043 AC6 founder-escalation path
             (the legacy `single_reviewer_timeout` enum value stays in
             combined.schema.json for back-compat with rounds in complete/)
@@ -150,8 +157,13 @@ def compute_combined_verdict(
         # reviewer is in PROCEED_STAR → strategist watcher autonomously
         # dispositions (escalated_to_founder: false). Multi-missing OR any
         # present pushback still escalates to founder.
+        # O2 fix: auto-disposition additionally requires at least one
+        # PRESENT reviewer to be REQUIRED — otherwise a round in which only
+        # optional reviewers responded would be autonomously dispositioned
+        # with zero required reviews.
         if (
             len(missing_required) == 1
+            and (present.keys() & required_set)
             and all(v in PROCEED_STAR for v in present.values())
         ):
             return "partial_responses", False
@@ -248,6 +260,17 @@ def find_eligible_rounds(
           timeout. Reviewers whose own timeout has not yet elapsed gate
           the round.
 
+    Optional-only rosters (zero required reviewers requested) — O1 fix:
+    `all([]) == True` previously made such rounds eligible the instant
+    request.md existed, producing a terminal no_responses escalation seconds
+    after dispatch. Instead, an optional-only round is eligible iff:
+      (a') at least ONE requested reviewer has its <slug>.md present
+           (optionals never gate each other — first response combines), OR
+      (b') zero responses AND every requested reviewer has individually
+           exceeded its per-reviewer timeout (null → FALLBACK_TIMEOUT_HOURS),
+           measured from requested_at — after which no_responses escalation
+           is correct.
+
     `timeout_hours_override`: when non-None, applies uniformly to every
     reviewer (current `--timeout-hours` CLI semantics). When None,
     per-reviewer values from reviewers.json are used (null → fallback).
@@ -280,11 +303,21 @@ def find_eligible_rounds(
                 continue
             required_requested = [r for r in requested if required_by_name[r]]
 
-            # (a) all required-and-requested reviewers have responses
-            all_required_present = all(
-                (round_dir / f"{r}.md").exists() for r in required_requested
-            )
-            if all_required_present:
+            if required_requested:
+                # (a) all required-and-requested reviewers have responses
+                gate_satisfied = all(
+                    (round_dir / f"{r}.md").exists() for r in required_requested
+                )
+                gating_reviewers = required_requested
+            else:
+                # O1 fix: optional-only roster. (a') first response combines;
+                # otherwise fall through to the per-reviewer timeout gate (b')
+                # over the full requested roster.
+                gate_satisfied = any(
+                    (round_dir / f"{r}.md").exists() for r in requested
+                )
+                gating_reviewers = requested
+            if gate_satisfied:
                 out.append(round_dir)
                 continue
 
@@ -300,7 +333,7 @@ def find_eligible_rounds(
             elapsed = (now - requested_at).total_seconds()
             all_missing_timed_out = True
             any_missing = False
-            for name in required_requested:
+            for name in gating_reviewers:
                 if (round_dir / f"{name}.md").exists():
                     continue
                 any_missing = True
````

## Commit fa903208 — fix(review-queue): close the launchd pre-redirect blackout + selection-parser --- truncation

````diff
commit fa903208904dedb3c4e30659a81b8e9f81f084ed
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 10:41:11 2026 -0700

    fix(review-queue): close the launchd pre-redirect blackout + selection-parser --- truncation
    
    Audit fix ④ of 5:
    (4a) Reviewer plists pointed StandardOut/ErrPath at /dev/null, so every
         failure before _run_reviewer.sh's exec-redirect (REVIEWER_NAME
         check, repo cd, gate, rotation) was invisible — the original silent
         kickstart-fail class that motivated the coord layer. The installer
         now bakes the absolute per-reviewer log path into both keys
         (launchd appends; interleaves safely with the wrapper's own >>).
         NOTE: installed plists keep /dev/null until the installer is re-run
         per slug.
    (4b) The request-SELECTION heredoc still used the naive split('---', 2)
         that validate_request_binding was fixed for — a --- inside a
         frontmatter value silently skipped the round for every wrapper
         reviewer. Now uses the line-anchored parser inline.
         Deviation from plan: import _lib inside python3 - heredocs is
         itself unsafe — under a non-arm64 parent its arch-retry re-execs
         with stdin already consumed → silent exit 0. That made
         validate_request_binding FAIL OPEN under Rosetta parents; same
         inline-parse fix applied there (wrong_binding test now actually
         exercises the gate).
    
    RED: fixture round with '---' in focus_hints silently skipped; plist
    rendered /dev/null. GREEN: 14/14 reviewer-readonly, 78/78 across the
    wrapper/installer suites.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/tests/review-queue/045-smoke-gate-fail-closed.test.ts b/tests/review-queue/045-smoke-gate-fail-closed.test.ts
index 1d56d76e..71e6c27c 100644
--- a/tests/review-queue/045-smoke-gate-fail-closed.test.ts
+++ b/tests/review-queue/045-smoke-gate-fail-closed.test.ts
@@ -230,6 +230,33 @@ describe('045 AC2 — _install_reviewer_launchd.sh smoke gate fail-closed', () =
     expect(invocations.some((l) => l.startsWith('launchctl kickstart'))).toBe(false);
   });
 
+  it('plist routes launchd stdout/stderr to the per-reviewer log file, not /dev/null', () => {
+    const fx = setup({ withSmokeRunner: false });
+    fixtures.push(fx);
+
+    const r = runInstaller(fx, [REVIEWER]);
+    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(0);
+
+    const plistPath = join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`);
+    const plist = readFileSync(plistPath, 'utf-8');
+
+    // The launchd-level log path must be the SAME absolute file the wrapper
+    // itself appends to (~/Library/Logs/echo-review-queue-<slug>.log), baked
+    // expanded at install time — launchd does not expand ~ or env vars in
+    // StandardOutPath/StandardErrorPath. /dev/null here is the silent-fail
+    // window: everything _run_reviewer.sh does BEFORE its own block redirect
+    // (REVIEWER_NAME validation, repo-root cd/git checks, the reviewer gate,
+    // log rotation) would otherwise fail invisibly.
+    const logPath = join(fx.home, 'Library/Logs', `echo-review-queue-${REVIEWER}.log`);
+    expect(plist).toContain(`<key>StandardOutPath</key>\n    <string>${logPath}</string>`);
+    expect(plist).toContain(`<key>StandardErrorPath</key>\n    <string>${logPath}</string>`);
+    expect(plist).not.toContain('/dev/null');
+
+    // The installer must guarantee the log directory exists so launchd can
+    // open/create the file on first tick.
+    expect(existsSync(join(fx.home, 'Library/Logs'))).toBe(true);
+  });
+
   it('AC2c — --smoke + present smoke runner: exit 0, plist installed, bootout + bootstrap + kickstart recorded', () => {
     const fx = setup({ withSmokeRunner: true });
     fixtures.push(fx);
diff --git a/tests/review-queue/reviewer-readonly.test.ts b/tests/review-queue/reviewer-readonly.test.ts
index 4001a0f0..f1064124 100644
--- a/tests/review-queue/reviewer-readonly.test.ts
+++ b/tests/review-queue/reviewer-readonly.test.ts
@@ -26,7 +26,12 @@ type MockMode =
   | 'empty_stdout'
   | 'write_denied'
   | 'wrong_binding';
-type RequestState = 'selected' | 'none' | 'stale_combined' | 'bind_failed';
+type RequestState =
+  | 'selected'
+  | 'selected_fm_dashes'
+  | 'none'
+  | 'stale_combined'
+  | 'bind_failed';
 
 interface Fixture {
   base: string;
@@ -129,24 +134,29 @@ function writeRequest(repo: string, reviewer: Reviewer, specSha: string, state:
   const roundDir = join(repo, 'backlog/reviews', ITEM_ID, 'r1');
   mkdirSync(roundDir, { recursive: true });
   const requested = state === 'bind_failed' ? otherReviewer(reviewer) : reviewer;
+  const fmLines = [
+    '---',
+    `item_id: "${ITEM_ID}"`,
+    'round: 1',
+    `spec_commit_sha: "${specSha}"`,
+    `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
+    'class: "narrow"',
+    'requested_at: "2026-06-03T20:00:00Z"',
+    'requested_reviewers:',
+    `  - "${requested}"`,
+    `correlation_id: "${CORRELATION_ID}"`,
+  ];
+  if (state === 'selected_fm_dashes') {
+    // A frontmatter string VALUE containing a `---` token. A naive
+    // text.split("---", 2) truncates the frontmatter mid-string, the YAML
+    // parse raises, and scan mode swallows the error — the round is then
+    // silently skipped by every wrapper reviewer forever. The line-anchored
+    // parser (_lib.parse_frontmatter) must select this round normally.
+    fmLines.push('focus_hints: "quote the --- frontmatter delimiter when reviewing the sidecar"');
+  }
   writeFileSync(
     join(roundDir, 'request.md'),
-    [
-      '---',
-      `item_id: "${ITEM_ID}"`,
-      'round: 1',
-      `spec_commit_sha: "${specSha}"`,
-      `artifact_path: "backlog/ready/${ITEM_ID}.md"`,
-      'class: "narrow"',
-      'requested_at: "2026-06-03T20:00:00Z"',
-      'requested_reviewers:',
-      `  - "${requested}"`,
-      `correlation_id: "${CORRELATION_ID}"`,
-      '---',
-      '',
-      'Review this synthetic artifact.',
-      '',
-    ].join('\n'),
+    [...fmLines, '---', '', 'Review this synthetic artifact.', ''].join('\n'),
   );
   if (state === 'stale_combined') {
     writeFileSync(join(roundDir, 'combined.md'), '---\ncombined_verdict: "proceed"\n---\n');
@@ -413,6 +423,23 @@ describe('087b reviewer read-only wrapper publisher', () => {
     );
   });
 
+  it('selects a request whose frontmatter value contains a --- token instead of silently skipping it', () => {
+    const fx = setupFixture({ requestState: 'selected_fm_dashes' });
+    fixtures.push(fx);
+
+    const r = runWrapper(fx, 'valid');
+    expect(r.status, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);
+
+    // Under the naive split("---", 2) parser this round is invisible: the
+    // tick exits 0 with "no codex reviews to write" and never publishes.
+    expect(
+      originHas(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`),
+      `stderr=${r.stderr}`,
+    ).toBe(true);
+    const response = showOrigin(fx, `backlog/reviews/${ITEM_ID}/r1/codex.md`);
+    expect(response).toContain('Mock codex review from final assistant message.');
+  });
+
   it('classifies no-candidate before spawning the child', () => {
     const fx = setupFixture({ requestState: 'none' });
     fixtures.push(fx);
diff --git a/tools/review-queue/_install_reviewer_launchd.sh b/tools/review-queue/_install_reviewer_launchd.sh
index 81c3a718..ca0b1b86 100755
--- a/tools/review-queue/_install_reviewer_launchd.sh
+++ b/tools/review-queue/_install_reviewer_launchd.sh
@@ -133,6 +133,24 @@ fi
 
 mkdir -p "$(dirname "$PLIST")"
 
+# launchd-level stdout/stderr go to the SAME per-reviewer log file the
+# wrapper itself appends to. Previously both keys were /dev/null, which left
+# a silent-failure window: everything _run_reviewer.sh does BEFORE its own
+# `{ ... } >> $LOG_FILE` block redirect (REVIEWER_NAME validation, repo-root
+# cd/git checks, sourcing _effect-runner.sh, the reviewer gate, log rotation)
+# failed invisibly — the exact silent-launchd-fail class this queue exists
+# to prevent. launchd does NOT expand ~ or environment variables in
+# StandardOutPath/StandardErrorPath, so the absolute expanded path is baked
+# at install time (this script runs as the operator, so $HOME is correct).
+# launchd opens these paths O_CREAT|O_APPEND (append, not truncate), and the
+# wrapper's own block redirect also opens in append mode, so the two fds
+# interleave safely on the same file. Rotation caveat: the wrapper rotates
+# by `mv` at >10MB; the tick that performs the rotation already holds the
+# launchd fd on the old inode, so that one tick's pre-redirect lines land in
+# the .1 sidecar — subsequent ticks reopen the fresh path.
+LAUNCHD_LOG_FILE="$HOME/Library/Logs/echo-review-queue-${REVIEWER}.log"
+mkdir -p "$(dirname "$LAUNCHD_LOG_FILE")"
+
 # launchd's per-LaunchAgent environment does NOT reliably inherit TMPDIR
 # from the user's Aqua session — _run_reviewer.sh hard-aborts when TMPDIR
 # is unset (the 050 ephemeral-worktree path needs a real temp dir). Pin
@@ -160,9 +178,9 @@ cat > "$PLIST" <<EOF
     <key>WorkingDirectory</key>
     <string>$REPO_ROOT</string>
     <key>StandardOutPath</key>
-    <string>/dev/null</string>
+    <string>$LAUNCHD_LOG_FILE</string>
     <key>StandardErrorPath</key>
-    <string>/dev/null</string>
+    <string>$LAUNCHD_LOG_FILE</string>
     <key>EnvironmentVariables</key>
     <dict>
         <key>TMPDIR</key>
diff --git a/tools/review-queue/_run_reviewer.sh b/tools/review-queue/_run_reviewer.sh
index 249549ab..63e01869 100755
--- a/tools/review-queue/_run_reviewer.sh
+++ b/tools/review-queue/_run_reviewer.sh
@@ -437,9 +437,9 @@ EOF
     local response_path="$1"
     PYTHONDONTWRITEBYTECODE=1 python3 - "$response_path" "$REVIEWER_NAME" "$ITEM_ID" "$ROUND_NUM" "$SPEC_COMMIT_SHA" <<'PY'
 from pathlib import Path
+import re
 import sys
-
-import _lib  # robust, line-anchored frontmatter parse shared with validate.py
+import yaml
 
 path = Path(sys.argv[1])
 expected_reviewer = sys.argv[2]
@@ -447,15 +447,28 @@ expected_item = sys.argv[3]
 expected_round = sys.argv[4]
 expected_sha = sys.argv[5]
 
-# Use the same robust parser as the schema-validation path. A bare
+# Use the same robust parse as the schema-validation path. A bare
 # text.split("---", 2) truncates the frontmatter when a string VALUE contains
 # a `---` token, then crashes yaml.safe_load with an unhandled traceback
 # (observed on the 099 spec-review tick — whose subject IS `---` sidecar
 # frontmatter). Any parse failure here must surface as a clean
 # binding-mismatch diagnostic, never a traceback.
+#
+# The regex is inlined (keep in sync with _lib.FRONTMATTER_RE) rather than
+# `import _lib`: _lib imports jsonschema at module level, and its darwin
+# arch-retry re-execs `python3 -` with stdin already consumed — under a
+# non-arm64 parent process that turns an ImportError into a silent exit-0,
+# which here would mean the binding gate FAILS OPEN (a mismatched response
+# would be published without any check running).
+FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
 try:
-    fm, _ = _lib.parse_frontmatter(path)
-except ValueError as exc:
+    m = FRONTMATTER_RE.match(path.read_text(encoding="utf-8"))
+    if not m:
+        raise ValueError(f"{path}: no frontmatter block found")
+    fm = yaml.safe_load(m.group(1)) or {}
+    if not isinstance(fm, dict):
+        raise ValueError(f"{path}: frontmatter is not a mapping")
+except (ValueError, yaml.YAMLError) as exc:
     print(f"request binding mismatch: {exc}", file=sys.stderr)
     raise SystemExit(1)
 
@@ -562,6 +575,7 @@ from pathlib import Path
 import glob
 import json
 import os
+import re
 import sys
 import yaml
 
@@ -572,12 +586,27 @@ env_corr = os.environ.get("ECHO_COORD_CORRELATION_ID") or ""
 capture_failure_state_file = os.environ.get("CAPTURE_FAILURE_STATE_FILE") or ""
 
 
+# Keep in sync with _lib.FRONTMATTER_RE. Line-anchored: only delimiter
+# LINES terminate the frontmatter, so a `---` token inside a string value
+# (e.g. a focus_hints entry quoting frontmatter) parses correctly.
+FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
+
+
 def read_fm(path: Path):
+    # Same robust mechanism as validate_request_binding/_lib.parse_frontmatter:
+    # a naive text.split("---", 2) truncates the frontmatter when a string
+    # VALUE contains a `---` token, the YAML parse raises, and the scan
+    # loop's except-continue then skips the round silently — for every
+    # wrapper reviewer, forever. The regex is inlined (not `import _lib`)
+    # deliberately: _lib imports jsonschema at module level, and its
+    # darwin arch-retry re-execs `python3 -` with stdin already consumed,
+    # turning an ImportError into a silent exit-0 with no selection state
+    # written — the same silent-failure class this parser fix removes.
     text = path.read_text(encoding="utf-8")
-    parts = text.split("---", 2)
-    if len(parts) < 3:
-        raise ValueError(f"{path}: missing YAML frontmatter")
-    fm = yaml.safe_load(parts[1]) or {}
+    m = FRONTMATTER_RE.match(text)
+    if not m:
+        raise ValueError(f"{path}: no frontmatter block found")
+    fm = yaml.safe_load(m.group(1)) or {}
     if not isinstance(fm, dict):
         raise ValueError(f"{path}: frontmatter must be a mapping")
     return fm
````

## Commit 5336d475 — fix(mcp): make wait_for_new_turns chaining lossless

````diff
commit 5336d475ab9f118b3dfb426ade1a433d2ec20608
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 10:41:22 2026 -0700

    fix(mcp): make wait_for_new_turns chaining lossless
    
    Audit fix ⑤ of 5. The chaining contract lost turns two ways:
    (a) next_since was the server wall clock — turns landing in storage
        after the final poll (Cursor ingest lag ~15s; CC/codex/git seconds)
        were permanently invisible to every chained call, the opposite of
        what the inline comment claimed.
    (b) bursts >20 returned the NEWEST 20 with no truncation signal, then
        the cursor jumped past the dropped older turns.
    
    New contract: next_since = max RETURNED turn timestamp (or the
    canonicalized caller since echoed back on empty timeout) — never the
    clock; overflow returns the OLDEST page ascending (timestamp, id) with
    an explicit warnings[] entry, so chaining pages losslessly through
    backlogs; same-timestamp boundary groups are never split across the
    page. Tool description rewritten to state the real semantics;
    outputSchema byte-identical.
    
    RED: 7 watched failures (lag-invisible turn, newest-20 burst, clock
    next_since); GREEN: 27/27 tool suite, 440/440 tests/mcp+tests/coord.
    Three old-contract tests deliberately updated (DESC→ASC delivery order,
    clock assertions); id sets unchanged.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/src/mcp/tools/wait-for-new-turns.ts b/src/mcp/tools/wait-for-new-turns.ts
index 90092664..d474869e 100644
--- a/src/mcp/tools/wait-for-new-turns.ts
+++ b/src/mcp/tools/wait-for-new-turns.ts
@@ -33,9 +33,19 @@ export const WAIT_MAX_SOURCES = 8;
 export const WAIT_DEFAULT_TIMEOUT_SECONDS = 30;
 export const WAIT_MAX_TIMEOUT_SECONDS = 60;
 export const WAIT_DEFAULT_POLL_INTERVAL_MS = 1_000;
-export const WAIT_PER_POLL_LIMIT_PER_SOURCE = 20;
-// Final return cap — matches spec §3 "LIMIT 20" overall after merge.
+// Final return cap — matches spec §3 "LIMIT 20" overall after merge. (A
+// same-timestamp group at the page boundary may push the page past this —
+// see pollOnce: never split a tie group across the strict `> since` chain.)
 export const WAIT_MAX_RETURNED_TURNS = 20;
+// Per-source raw fetch window (ASC, oldest-first). Must exceed the return
+// cap so that (a) overflow is detectable (cap+1), (b) rows AT exactly
+// `since` — the previous page's boundary tie group, dropped by the
+// strict-after post-filter — don't starve the window, and (c) the boundary
+// tie-group extension has headroom. 2*cap+1 absorbs a full cap-sized stale
+// boundary group plus cap+1 fresh rows. A tie group larger than this window
+// could still be split — documented limitation, pathological (>20 atoms
+// sharing one millisecond at the boundary).
+export const WAIT_PER_POLL_LIMIT_PER_SOURCE = 2 * WAIT_MAX_RETURNED_TURNS + 1;
 
 // Recognised source_app names that resolve via PREFIX MATCH (different
 // from echo_resolve_mru's MRU exact-source resolution). Sources NOT in this
@@ -61,14 +71,18 @@ export const WAIT_FOR_NEW_TURNS_DESCRIPTION =
   String(WAIT_MAX_TIMEOUT_SECONDS) +
   '.\n\n' +
   // behavior — IDs-only contract (item 038 / AC4)
-  "BEHAVIOR: polls echo.db every 1s. Returns immediately on any non-empty result; returns at `timeout` with empty `turn_ids[]` and `next_since` set to the server's current timestamp.\n\n" +
+  'BEHAVIOR: polls echo.db every 1s. Returns immediately on any non-empty result; returns at `timeout` with empty `turn_ids[]`.\n\n' +
+  'CHAINING (lossless — `next_since` is NEVER the server wall clock): when turns are returned, `next_since` = the max timestamp among the RETURNED turns (canonical Z form, as stored); when the call times out empty, `next_since` = your own `since` (canonicalized) echoed back. Always chain with `since = next_since` — safe unconditionally, even after a timeout. Atom timestamps are event times that land in storage with ingest lag (Cursor re-poll ~15s; CC/codex/git seconds), so a wall-clock watermark would permanently skip late-ingested turns; anchoring `next_since` to delivered data makes the chain lossless.\n\n' +
+  'OVERFLOW PAGING: at most ' +
+  String(WAIT_MAX_RETURNED_TURNS) +
+  ' turns per call. When more match, the call returns the OLDEST page (ascending by timestamp, id) plus a warning in `warnings[]` — chain immediately with `next_since` to page through the backlog. A same-timestamp group is never split across the page boundary: all turns sharing the boundary timestamp are included, so the page may exceed the cap by the tie count (a tie group larger than ~2x the cap within one millisecond is the documented pathological limit). `turn_ids` are ordered oldest→newest.\n\n' +
   'RESPONSE (item 038 / AC4 — IDs-only): the response now carries `turn_ids: string[]` instead of body-projected `turns[]`. The envelope shrinks dramatically (no body projection in the wait response); the caller composes one extra MCP call per wake (`get_atoms(turn_ids)` for cost-bounded summaries, or `get_atom(turn_ids[i])` for verbatim of one atom) to fetch bodies. No parallel-vocabulary deprecation window — the bodies-bundled shape is removed in the same release that ships the IDs-only shape.\n\n' +
   // canonical wake → fetch pattern
   'CANONICAL COMPOSITION:\n' +
   '  const w = await wait_for_new_turns({sources: [...], since: last});\n' +
+  '  last = w.next_since;  // safe unconditionally — echoes `since` back on timeout\n' +
   '  if (!w.timed_out) {\n' +
   '    const atoms = await get_atoms(w.turn_ids);  // summary bodies\n' +
-  '    last = w.next_since;\n' +
   '  }\n\n' +
   // polling fallback
   'POLLING FALLBACK: if your MCP client has issues with long-running calls (timeout limits, no streaming), poll instead — works on any MCP client:\n' +
@@ -146,15 +160,27 @@ export function resolveSources(sources: readonly string[]): ResolvedSources {
   return { exact, prefixes };
 }
 
+interface PollPage {
+  /** Oldest-first (timestamp ASC, id ASC) page of matched rows. */
+  rows: CaptureEvent[];
+  /** True when more rows matched than the page carries — caller should
+   *  chain immediately with next_since to page through the backlog. */
+  overflow: boolean;
+}
+
 /** One poll pass: fan out one storage query per (exact source) and per
- *  (prefix) entry, post-filter to STRICT-after `since` (storage uses
- *  `>=`), merge by timestamp DESC, cap at WAIT_MAX_RETURNED_TURNS. */
+ *  (prefix) entry — each ASC oldest-first — post-filter to STRICT-after
+ *  `since` (storage uses `>=`), merge by id, sort ASC (timestamp, id), and
+ *  page: when more than WAIT_MAX_RETURNED_TURNS matched, return the OLDEST
+ *  cap-sized page, extended through any same-timestamp group at the page
+ *  boundary (never split a tie group — with strict `> since` chaining, a
+ *  split group's unreturned members would be skipped forever). */
 async function pollOnce(
   storage: Storage,
   resolved: ResolvedSources,
   since: string,
   normalisedRepoPath: string | null,
-): Promise<CaptureEvent[]> {
+): Promise<PollPage> {
   // Item 038 / AC5: route the fs-watcher exclusion through the shared helper
   // so a re-hardcoded inline literal is caught by the CI grep-scan.
   const filterCommon: Pick<
@@ -167,12 +193,16 @@ async function pollOnce(
     // filter on each per-source query below.
     ...(normalisedRepoPath !== null ? { metadata_match: { repo_root: normalisedRepoPath } } : {}),
   });
+  // Fix ⑤: ASC oldest-first per-source fetch — the lossless chaining
+  // contract pages from the OLDEST end. (DESC newest-first silently dropped
+  // the oldest of a >cap burst, and chaining skipped them forever.)
+  const filterCommonAsc: QueryFilter = { ...filterCommon, order: 'asc' };
   const queries: Promise<CaptureEvent[]>[] = [];
   for (const exact of resolved.exact) {
-    queries.push(storage.query({ ...filterCommon, source: exact }));
+    queries.push(storage.query({ ...filterCommonAsc, source: exact }));
   }
   for (const prefix of resolved.prefixes) {
-    queries.push(storage.query({ ...filterCommon, source_prefix: prefix }));
+    queries.push(storage.query({ ...filterCommonAsc, source_prefix: prefix }));
   }
   const results = await Promise.all(queries);
 
@@ -188,16 +218,27 @@ async function pollOnce(
     }
   }
   const all = [...merged.values()];
-  // Sort by (timestamp DESC, id DESC) for newest-first delivery —
-  // matches storage's default ordering convention.
+  // Sort by (timestamp ASC, id ASC) — oldest-first delivery, matching the
+  // storage adapters' ASC tie-break, so the cap below keeps the OLDEST page
+  // and `since = next_since` chaining pages through a backlog losslessly.
   all.sort((a, b) => {
-    if (a.timestamp < b.timestamp) return 1;
-    if (a.timestamp > b.timestamp) return -1;
-    if (a.id < b.id) return 1;
-    if (a.id > b.id) return -1;
+    if (a.timestamp < b.timestamp) return -1;
+    if (a.timestamp > b.timestamp) return 1;
+    if (a.id < b.id) return -1;
+    if (a.id > b.id) return 1;
     return 0;
   });
-  return all.slice(0, WAIT_MAX_RETURNED_TURNS);
+  if (all.length <= WAIT_MAX_RETURNED_TURNS) {
+    return { rows: all, overflow: false };
+  }
+  // Overflow: take the oldest cap-sized page, then extend through any
+  // same-timestamp group straddling the boundary. next_since will be the
+  // boundary timestamp; strict `> since` on the chained call skips that
+  // whole timestamp — safe only because we delivered ALL of it.
+  const boundaryTs = all[WAIT_MAX_RETURNED_TURNS - 1]!.timestamp;
+  let end = WAIT_MAX_RETURNED_TURNS;
+  while (end < all.length && all[end]!.timestamp === boundaryTs) end += 1;
+  return { rows: all.slice(0, end), overflow: true };
 }
 
 const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
@@ -209,7 +250,9 @@ export interface WaitForNewTurnsOptions {
    *  fast; production never overrides. NOT exposed via the MCP schema —
    *  tunable from in-process callers only. */
   pollIntervalMs?: number;
-  /** Inject a clock so tests can drive deterministic next_since values. */
+  /** Inject a clock so tests can drive deterministic poll deadlines. NOT
+   *  used for next_since — that is derived from returned-turn timestamps
+   *  (or echoes the caller's `since`), never from the wall clock. */
   now?: () => Date;
 }
 
@@ -275,7 +318,9 @@ export async function waitForNewTurns(
       schema_version: SCHEMA_VERSION,
       tool: 'wait_for_new_turns',
       turn_ids: [],
-      next_since: now().toISOString(),
+      // Lossless-chaining contract: nothing delivered → echo the
+      // canonicalized `since` back. Never a wall-clock read.
+      next_since: since,
       timed_out: true,
       warnings: ['wait_for_new_turns: no sources resolved to a query'],
     };
@@ -287,22 +332,36 @@ export async function waitForNewTurns(
   // Initial poll first (no wait) — common case is "content is already
   // there"; the long-poll's whole point is to NOT round-trip the wait
   // when there's nothing newer than `since`.
-  let rows = await pollOnce(storage, resolved, since, normalisedRepoPath);
-  while (rows.length === 0 && now().getTime() < deadlineMs) {
+  let page = await pollOnce(storage, resolved, since, normalisedRepoPath);
+  while (page.rows.length === 0 && now().getTime() < deadlineMs) {
     // Sleep then re-poll. Cap the sleep at remaining-time so we don't
     // overshoot the deadline by up to one poll interval.
     const remaining = deadlineMs - now().getTime();
     if (remaining <= 0) break;
     await sleep(Math.min(pollIntervalMs, remaining));
-    rows = await pollOnce(storage, resolved, since, normalisedRepoPath);
+    page = await pollOnce(storage, resolved, since, normalisedRepoPath);
   }
 
-  // next_since is the server's current clock when we return — caller
-  // chains by passing it back in. We do NOT use the newest-row timestamp
-  // because that would silently skip rows that landed in the gap between
-  // poll-start and our return.
-  const next_since = now().toISOString();
+  // Lossless chaining (Fix ⑤): next_since is NEVER the wall clock. Atom
+  // timestamps are EVENT times that land in storage LATER (Cursor re-poll
+  // ~15s; CC/codex/git seconds of ingest lag) — a wall-clock next_since
+  // ran AHEAD of delivered data, so a turn that occurred before our return
+  // moment but ingested after the final poll was permanently invisible to
+  // every chained call (strict `> since`). Instead:
+  //   • turns returned → next_since = max timestamp among RETURNED turns
+  //     (rows are ASC-sorted, so the last row's stored canonical-Z value);
+  //   • timed out empty → next_since = the canonicalized caller `since`,
+  //     echoed back — nothing was delivered, so re-delivery is impossible
+  //     and nothing can be skipped.
+  const { rows, overflow } = page;
+  const next_since = rows.length > 0 ? rows[rows.length - 1]!.timestamp : since;
   const timed_out = rows.length === 0;
+  const warnings: string[] = [];
+  if (overflow) {
+    warnings.push(
+      `wait_for_new_turns: more than ${WAIT_MAX_RETURNED_TURNS} new turns matched; returning the oldest ${rows.length} — chain immediately with next_since to page through the backlog`,
+    );
+  }
 
   return {
     schema_version: SCHEMA_VERSION,
@@ -310,7 +369,7 @@ export async function waitForNewTurns(
     turn_ids: rows.map((r) => r.id),
     next_since,
     timed_out,
-    warnings: [],
+    warnings,
   };
 }
 
diff --git a/tests/mcp/wait-for-new-turns.test.ts b/tests/mcp/wait-for-new-turns.test.ts
index 8b22a84f..cb3f1c97 100644
--- a/tests/mcp/wait-for-new-turns.test.ts
+++ b/tests/mcp/wait-for-new-turns.test.ts
@@ -140,8 +140,10 @@ describe('wait_for_new_turns — happy path', () => {
     );
     expect(r.turn_ids).toEqual([]);
     expect(r.timed_out).toBe(true);
-    // next_since is server clock at return — string parses as a date.
-    expect(new Date(r.next_since).getTime()).not.toBeNaN();
+    // Fix ⑤ lossless chaining: on a timed-out-empty return, next_since
+    // echoes the canonicalized caller `since` back — NEVER a wall-clock
+    // read, which would permanently skip turns that ingest late.
+    expect(r.next_since).toBe('2026-05-09T10:00:00.000Z');
   });
 
   it('wakes when content lands during the wait (poll loop)', async () => {
@@ -320,7 +322,11 @@ describe('wait_for_new_turns repo_path (item 037 / AC5)', () => {
 
 // Item 038 / AC4 — IDs-only contract.
 describe('wait_for_new_turns — AC4 IDs-only response shape', () => {
-  it('(a) returned `turn_ids` matches what would have been the old `turns[].id` (DESC newest-first)', async () => {
+  it('(a) returned `turn_ids` carries the matched atom ids in chronological (ASC) delivery order', async () => {
+    // Fix ⑤ lossless chaining: delivery order changed from newest-first
+    // (DESC) to oldest-first ASC (timestamp, id) so that the overflow page
+    // ("oldest cap-sized page") and the no-overflow page share one ordering
+    // contract. The id SET is unchanged from the AC4 contract.
     const store = new MemoryStorage();
     const idA = await store.append({
       source: 'fs:/A',
@@ -342,8 +348,8 @@ describe('wait_for_new_turns — AC4 IDs-only response shape', () => {
       { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
       { pollIntervalMs: 30 },
     );
-    // Newest-first order, all three captured.
-    expect(r.turn_ids).toEqual([idC, idB, idA]);
+    // Oldest-first order, all three captured.
+    expect(r.turn_ids).toEqual([idA, idB, idC]);
   });
 
   it('(b) no `content`, `metadata`, or `truncations` fields appear on the response', async () => {
@@ -397,9 +403,135 @@ describe('wait_for_new_turns — AC4 IDs-only response shape', () => {
       { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
       { pollIntervalMs: 30 },
     );
-    expect(w.turn_ids).toEqual([idB, idA]);
+    // Fix ⑤: delivery order is now chronological ASC (was [idB, idA]).
+    expect(w.turn_ids).toEqual([idA, idB]);
     // Compose the canonical wake → fetch pattern.
     const atoms = await store.getByIds(w.turn_ids);
-    expect(atoms.map((a) => a.content)).toEqual(['pre-038 body B', 'pre-038 body A']);
+    expect(atoms.map((a) => a.content)).toEqual(['pre-038 body A', 'pre-038 body B']);
+  });
+});
+
+// Fix ⑤ — lossless chaining contract for `next_since` + overflow paging.
+//
+// The old contract lost turns two ways:
+//   (a) next_since = server wall clock at return. Atom timestamps are EVENT
+//       times that land in storage LATER (Cursor re-poll ~15s; CC/codex/git
+//       seconds of lag). A turn that occurred before the return moment but
+//       ingested after the final poll was permanently invisible to every
+//       chained call (strict `> since` filter).
+//   (b) per-poll cap kept the NEWEST 20 — a burst of >20 silently dropped
+//       the oldest, with no truncation signal, and chaining skipped them
+//       forever.
+describe('wait_for_new_turns — Fix ⑤ lossless chaining (next_since + overflow paging)', () => {
+  it('chaining-with-ingest-lag: a turn whose event-time predates the wall-clock return moment, appended after the response, is returned by the chained call', async () => {
+    const store = new MemoryStorage();
+    const tsA = '2026-05-09T10:01:00.000Z';
+    const idA = await store.append(ev('fs:/A', tsA, 'turn A'));
+
+    const r1 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r1.turn_ids).toEqual([idA]);
+    // Contract: next_since = max timestamp among RETURNED turns — never a
+    // wall-clock read (the old code returned now(), i.e. real 2026-06 time,
+    // which is far ahead of every event timestamp below).
+    expect(r1.next_since).toBe(tsA);
+
+    // Ingest lag: turn B occurred at 10:02 (before the wall-clock moment
+    // r1 returned — all test timestamps are in the past) but lands in
+    // storage only AFTER r1's response. Under the old wall-clock
+    // next_since, B was permanently invisible to every chained call.
+    const idB = await store.append(ev('fs:/A', '2026-05-09T10:02:00.000Z', 'turn B late ingest'));
+    const r2 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: r1.next_since, timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r2.turn_ids).toEqual([idB]);
+    expect(r2.timed_out).toBe(false);
+  });
+
+  it('burst of 25: first call returns the OLDEST 20 + overflow warning; chained call returns the remaining 5', async () => {
+    const store = new MemoryStorage();
+    const ids: string[] = [];
+    for (let i = 1; i <= 25; i++) {
+      const ts = `2026-05-09T10:00:${String(i).padStart(2, '0')}.000Z`;
+      ids.push(await store.append(ev('fs:/A', ts, `burst turn ${i}`)));
+    }
+
+    const r1 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    // Oldest cap-sized page, ascending by (timestamp, id).
+    expect(r1.turn_ids).toEqual(ids.slice(0, 20));
+    expect(r1.warnings.some((w) => /more than 20 new turns/.test(w))).toBe(true);
+    expect(r1.next_since).toBe('2026-05-09T10:00:20.000Z');
+    expect(r1.timed_out).toBe(false);
+
+    // Chaining since=next_since pages through the backlog losslessly.
+    const r2 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: r1.next_since, timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r2.turn_ids).toEqual(ids.slice(20));
+    expect(r2.warnings).toEqual([]);
+    expect(r2.next_since).toBe('2026-05-09T10:00:25.000Z');
+  });
+
+  it('timeout-empty: next_since echoes the canonicalized caller `since`, not a fresh clock value', async () => {
+    const store = new MemoryStorage();
+    const r = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: '2026-05-09T23:00:00.000+0900', timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r.timed_out).toBe(true);
+    expect(r.turn_ids).toEqual([]);
+    // Canonical Z form of the +0900 input — NOT today's wall clock. Nothing
+    // was delivered, so echoing `since` back can never re-deliver anything.
+    expect(r.next_since).toBe('2026-05-09T14:00:00.000Z');
+  });
+
+  it('same-timestamp group at the page boundary is never split (page may exceed the cap by the tie count)', async () => {
+    const store = new MemoryStorage();
+    const ids: string[] = [];
+    // 19 distinct-timestamp turns…
+    for (let i = 1; i <= 19; i++) {
+      const ts = `2026-05-09T10:00:${String(i).padStart(2, '0')}.000Z`;
+      ids.push(await store.append(ev('fs:/A', ts, `tie test turn ${i}`)));
+    }
+    // …then 3 turns sharing the timestamp that lands at page index 19 (the
+    // cap boundary). With strict `> since` chaining, splitting this group
+    // would skip the unreturned members forever; the page must include all
+    // three (22 returned > cap 20).
+    const tieTs = '2026-05-09T10:00:20.000Z';
+    for (let i = 0; i < 3; i++) {
+      ids.push(await store.append(ev('fs:/A', tieTs, `tie group member ${i}`)));
+    }
+
+    const r1 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: '2026-05-09T10:00:00.000Z', timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r1.turn_ids).toHaveLength(22);
+    expect(new Set(r1.turn_ids)).toEqual(new Set(ids));
+    expect(r1.warnings.some((w) => /more than 20 new turns/.test(w))).toBe(true);
+    expect(r1.next_since).toBe(tieTs);
+
+    // Chained call: everything was delivered, so nothing remains.
+    const r2 = await waitForNewTurns(
+      store,
+      { sources: ['fs:/A'], since: r1.next_since, timeout: 0 },
+      { pollIntervalMs: 10 },
+    );
+    expect(r2.turn_ids).toEqual([]);
+    expect(r2.timed_out).toBe(true);
+    expect(r2.next_since).toBe(tieTs);
   });
 });
````

## Commit 98c04815 — fix(review-queue): stale-installed-plist detection (--check) + per-tick tripwire

````diff
commit 98c04815151bbb59aeb15232638f81006ba271fe
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 11:20:34 2026 -0700

    fix(review-queue): stale-installed-plist detection (--check) + per-tick tripwire
    
    Adopts 101-retro r1 codex-ops HIGH: the launchd log-path fix only changed
    FUTURE installs; already-installed plists keep /dev/null until their slug
    is reinstalled, so a merge-only deploy could leave the queue silently
    blacked out with the fix 'shipped'.
    
    - _install_reviewer_launchd.sh --check: renders the would-be plist via the
      new shared render_plist() (single source of truth with the install write)
      and byte-compares against the installed one. Exit 0 match / 1 STALE with
      loud diff + reinstall hint / 3 not installed. Touches neither the
      filesystem nor launchd.
    - _run_reviewer.sh: best-effort tick-start tripwire — WARNING: STALE_PLIST
      on drift (rc=1) only; rc=3 stays silent (normal for manual/on-demand
      ticks); never fatal.
    - TDD: 3 RED cases (missing/match/drifted-to-/dev/null) watched failing
      under the flagless installer, now 7/7 in the installer suite; wrapper
      suites 26/26. Operator plists for codex + codex-ops were reinstalled and
      live --check returns 0.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/tests/review-queue/045-smoke-gate-fail-closed.test.ts b/tests/review-queue/045-smoke-gate-fail-closed.test.ts
index 71e6c27c..8ffc966a 100644
--- a/tests/review-queue/045-smoke-gate-fail-closed.test.ts
+++ b/tests/review-queue/045-smoke-gate-fail-closed.test.ts
@@ -279,3 +279,71 @@ describe('045 AC2 — _install_reviewer_launchd.sh smoke gate fail-closed', () =
     expect(r.stdout).toMatch(/mock smoke ran/);
   });
 });
+
+describe('101-retro — _install_reviewer_launchd.sh --check stale-plist detection', () => {
+  let fixtures: Fixture[] = [];
+
+  beforeEach(() => {
+    fixtures = [];
+  });
+
+  afterEach(() => {
+    for (const fx of fixtures) {
+      rmSync(fx.home, { recursive: true, force: true });
+      rmSync(fx.pathStubDir, { recursive: true, force: true });
+    }
+    fixtures = [];
+  });
+
+  it('--check with no installed plist: exit 3 (not installed), zero launchctl invocations', () => {
+    const fx = setup({ withSmokeRunner: false });
+    fixtures.push(fx);
+
+    const r = runInstaller(fx, [REVIEWER, '--check']);
+
+    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(3);
+    expect(`${r.stdout}${r.stderr}`).toMatch(/not installed/i);
+    expect(readLaunchctlInvocations(fx.launchctlLog)).toHaveLength(0);
+    // Check mode must never write the plist.
+    expect(existsSync(join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`))).toBe(false);
+  });
+
+  it('--check after a fresh install: exit 0 (match), no NEW launchctl invocations from the check', () => {
+    const fx = setup({ withSmokeRunner: false });
+    fixtures.push(fx);
+
+    expect(runInstaller(fx, [REVIEWER]).status).toBe(0);
+    const invocationsAfterInstall = readLaunchctlInvocations(fx.launchctlLog).length;
+
+    const r = runInstaller(fx, [REVIEWER, '--check']);
+
+    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(0);
+    expect(`${r.stdout}${r.stderr}`).toMatch(/ok|match/i);
+    expect(readLaunchctlInvocations(fx.launchctlLog)).toHaveLength(invocationsAfterInstall);
+  });
+
+  it('--check against a drifted plist (log path reverted to /dev/null): exit 1, loud stale diagnostic, no launchctl', () => {
+    const fx = setup({ withSmokeRunner: false });
+    fixtures.push(fx);
+
+    expect(runInstaller(fx, [REVIEWER]).status).toBe(0);
+    const invocationsAfterInstall = readLaunchctlInvocations(fx.launchctlLog).length;
+
+    // Simulate a pre-fix installed plist: both log keys back at /dev/null —
+    // the exact stale-install shape the r1 codex-ops HIGH flagged (merge-only
+    // deploy leaves old launchd jobs silently blacked out).
+    const plistPath = join(fx.home, 'Library/LaunchAgents', `${LABEL}.plist`);
+    const logPath = join(fx.home, 'Library/Logs', `echo-review-queue-${REVIEWER}.log`);
+    writeFileSync(
+      plistPath,
+      readFileSync(plistPath, 'utf-8').replaceAll(`<string>${logPath}</string>`, '<string>/dev/null</string>'),
+    );
+
+    const r = runInstaller(fx, [REVIEWER, '--check']);
+
+    expect(r.status, `stdout: ${r.stdout}\nstderr: ${r.stderr}`).toBe(1);
+    expect(`${r.stdout}${r.stderr}`).toMatch(/stale/i);
+    expect(`${r.stdout}${r.stderr}`).toMatch(/re-run.*_install_reviewer_launchd|reinstall/i);
+    expect(readLaunchctlInvocations(fx.launchctlLog)).toHaveLength(invocationsAfterInstall);
+  });
+});
diff --git a/tools/review-queue/_install_reviewer_launchd.sh b/tools/review-queue/_install_reviewer_launchd.sh
index ca0b1b86..89bee4d5 100755
--- a/tools/review-queue/_install_reviewer_launchd.sh
+++ b/tools/review-queue/_install_reviewer_launchd.sh
@@ -45,10 +45,12 @@ shift
 # positional logic (none today, but defensive) is unaffected.
 SMOKE_REQUESTED=0
 INSTALL_CONTEXT_FLAG=0
+CHECK_MODE=0
 for arg in "$@"; do
   case "$arg" in
     --smoke) SMOKE_REQUESTED=1 ;;
     --install-context) INSTALL_CONTEXT_FLAG=1 ;;
+    --check) CHECK_MODE=1 ;;
   esac
 done
 # The installer IS the install-context by definition. The explicit
@@ -69,6 +71,79 @@ PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
 WRAPPER="$TOOL_DIR/run-$REVIEWER-reviewer.sh"
 SMOKE="$TOOL_DIR/smoke-test-${REVIEWER}-runner.sh"
 
+# launchd's per-LaunchAgent environment does NOT reliably inherit TMPDIR
+# from the user's Aqua session — _run_reviewer.sh hard-aborts when TMPDIR
+# is unset (the 050 ephemeral-worktree path needs a real temp dir). Pin
+# the user's canonical per-user temp dir into the plist so launchd-spawned
+# ticks see the same value as interactive runs.
+USER_TMPDIR="$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo "/tmp/")"
+LAUNCHD_LOG_FILE="$HOME/Library/Logs/echo-review-queue-${REVIEWER}.log"
+
+# Single source of truth for the plist content — used by the install write
+# AND by --check's drift compare, so the two can never disagree about what
+# "current" means.
+render_plist() {
+  cat <<EOF
+<?xml version="1.0" encoding="UTF-8"?>
+<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
+<plist version="1.0">
+<dict>
+    <key>Label</key>
+    <string>$LABEL</string>
+    <key>ProgramArguments</key>
+    <array>
+        <string>$WRAPPER</string>
+    </array>
+    <key>StartInterval</key>
+    <integer>600</integer>
+    <key>RunAtLoad</key>
+    <false/>
+    <key>KeepAlive</key>
+    <false/>
+    <key>WorkingDirectory</key>
+    <string>$REPO_ROOT</string>
+    <key>StandardOutPath</key>
+    <string>$LAUNCHD_LOG_FILE</string>
+    <key>StandardErrorPath</key>
+    <string>$LAUNCHD_LOG_FILE</string>
+    <key>EnvironmentVariables</key>
+    <dict>
+        <key>TMPDIR</key>
+        <string>$USER_TMPDIR</string>
+    </dict>
+</dict>
+</plist>
+EOF
+}
+
+# --check — stale-installed-plist detection (101-retro r1 codex-ops HIGH).
+# The 2026-06-11 log-path fix only changes FUTURE installs; an installed
+# launchd job keeps its old plist (e.g. StandardErrorPath=/dev/null — the
+# silent-blackout shape) until the slug is reinstalled. Check mode renders
+# the would-be plist and byte-compares it against the installed one,
+# touching neither the filesystem nor launchd. Exit contract:
+#   0 = installed plist matches current render
+#   1 = installed plist is STALE (drift) — loud diagnostic + reinstall hint
+#   3 = no plist installed for this slug
+# Validation scope is deliberately minimal (slug gate only): rendering needs
+# no executable wrapper, CLI preflight, or smoke runner.
+if [ "$CHECK_MODE" -eq 1 ]; then
+  if [ ! -f "$PLIST" ]; then
+    echo "--check: $LABEL not installed (no plist at $PLIST)"
+    exit 3
+  fi
+  if drift="$(diff -u "$PLIST" <(render_plist) 2>&1)"; then
+    echo "--check OK: installed plist matches current render ($PLIST)"
+    exit 0
+  fi
+  echo "--check: STALE installed plist for $LABEL" >&2
+  echo "  installed: $PLIST" >&2
+  echo "  drift (installed -> current render):" >&2
+  printf '%s\n' "$drift" | sed 's/^/    /' >&2
+  echo "  fix: re-run _install_reviewer_launchd.sh $REVIEWER to reinstall + re-bootstrap" >&2
+  exit 1
+fi
+
 if [ ! -x "$WRAPPER" ]; then
   echo "error: wrapper not executable at $WRAPPER" >&2
   echo "create a 5-line driver: '#!/usr/bin/env bash; exec env REVIEWER_NAME=$REVIEWER \"\$(dirname \"\$0\")/_run_reviewer.sh\"' and chmod +x" >&2
@@ -148,47 +223,9 @@ mkdir -p "$(dirname "$PLIST")"
 # by `mv` at >10MB; the tick that performs the rotation already holds the
 # launchd fd on the old inode, so that one tick's pre-redirect lines land in
 # the .1 sidecar — subsequent ticks reopen the fresh path.
-LAUNCHD_LOG_FILE="$HOME/Library/Logs/echo-review-queue-${REVIEWER}.log"
 mkdir -p "$(dirname "$LAUNCHD_LOG_FILE")"
 
-# launchd's per-LaunchAgent environment does NOT reliably inherit TMPDIR
-# from the user's Aqua session — _run_reviewer.sh hard-aborts when TMPDIR
-# is unset (the 050 ephemeral-worktree path needs a real temp dir). Pin
-# the user's canonical per-user temp dir into the plist so launchd-spawned
-# ticks see the same value as interactive runs.
-USER_TMPDIR="$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo "/tmp/")"
-
-cat > "$PLIST" <<EOF
-<?xml version="1.0" encoding="UTF-8"?>
-<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
-<plist version="1.0">
-<dict>
-    <key>Label</key>
-    <string>$LABEL</string>
-    <key>ProgramArguments</key>
-    <array>
-        <string>$WRAPPER</string>
-    </array>
-    <key>StartInterval</key>
-    <integer>600</integer>
-    <key>RunAtLoad</key>
-    <false/>
-    <key>KeepAlive</key>
-    <false/>
-    <key>WorkingDirectory</key>
-    <string>$REPO_ROOT</string>
-    <key>StandardOutPath</key>
-    <string>$LAUNCHD_LOG_FILE</string>
-    <key>StandardErrorPath</key>
-    <string>$LAUNCHD_LOG_FILE</string>
-    <key>EnvironmentVariables</key>
-    <dict>
-        <key>TMPDIR</key>
-        <string>$USER_TMPDIR</string>
-    </dict>
-</dict>
-</plist>
-EOF
+render_plist > "$PLIST"
 
 # Detect macOS version to choose bootstrap (Sonoma+) vs load (older).
 MACOS_VER="$(sw_vers -productVersion 2>/dev/null || echo 0)"
diff --git a/tools/review-queue/_run_reviewer.sh b/tools/review-queue/_run_reviewer.sh
index 63e01869..97efabd3 100755
--- a/tools/review-queue/_run_reviewer.sh
+++ b/tools/review-queue/_run_reviewer.sh
@@ -77,6 +77,22 @@ fi
 {
   echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] tick start REVIEWER=$REVIEWER_NAME ECHO_REVIEW_QUEUE_REPO_ROOT=$REPO_ROOT"
 
+  # ── 101-retro — stale-installed-plist tripwire (best-effort) ───────────
+  # A merge-only deploy changes the installer but not already-installed
+  # launchd plists; a stale plist can silently revert operator-visible
+  # guarantees (e.g. the pre-2026-06-11 StandardErrorPath=/dev/null
+  # blackout). Warn loudly on DRIFT only (rc=1): rc=3 (not installed) is
+  # the normal shape for manual/on-demand ticks and stays silent, and any
+  # check failure is non-fatal — this is a tripwire, not a gate.
+  set +e
+  stale_check_out="$(bash "$TOOL_DIR/_install_reviewer_launchd.sh" "$REVIEWER_NAME" --check 2>&1)"
+  stale_check_rc=$?
+  set -e
+  if [ "$stale_check_rc" -eq 1 ]; then
+    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: STALE_PLIST for $REVIEWER_NAME — installed launchd plist drifted from the installer's current render; re-run tools/review-queue/_install_reviewer_launchd.sh $REVIEWER_NAME"
+    printf '%s\n' "$stale_check_out" | sed 's/^/  stale-plist: /'
+  fi
+
   # ── 057b AC7 Phase 1 — scheduler health (bootstrap-scoped) ─────────────
   # Emit coord:scheduler_health at log-redirect-open. This opens a SHORT
   # bootstrap-window deadline (default 120s / max 300s per 057a's
````

## Commit 81c3c178 — test(storage): pin source+source_prefix mutual-exclusion contract (101-retro r2 codex MED refutation)

````diff
commit 81c3c178f79d75464bafe3ad4aaf992813179ce1
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 11:28:49 2026 -0700

    test(storage): pin source+source_prefix mutual-exclusion contract (101-retro r2 codex MED refutation)
    
    The r2 finding ('prefix branch overwrites the exact-source predicate when
    both filters are set') is unreachable: all three adapters throw
    'mutually exclusive' at query() entry (sqlite.ts:102, memory.ts:52,
    atom-store-readonly.ts:55) before any predicate is built. The guard sat
    outside the diff hunk context a packet-only reviewer can see; this
    conformance case makes the contract visible in the table both adapters
    run. 22/22.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/tests/storage/source-match-conformance.test.ts b/tests/storage/source-match-conformance.test.ts
index 7ffb4fc6..2b83d443 100644
--- a/tests/storage/source-match-conformance.test.ts
+++ b/tests/storage/source-match-conformance.test.ts
@@ -34,6 +34,19 @@ describe.each(backends)('source matching conformance — $name', ({ create }) =>
     if (store instanceof SqliteStorage) store.close();
   });
 
+  // 101-retro r2 codex MED refutation pin: `source` + `source_prefix`
+  // together is structurally impossible — every adapter throws before any
+  // predicate is built, so the "prefix branch overwrites the exact-source
+  // predicate" scenario cannot be reached. This case makes the contract
+  // visible in the conformance table (the guard sits above the diff hunks
+  // a packet-only reviewer sees).
+  it('rejects source + source_prefix together (mutually exclusive by contract)', async () => {
+    await store.append(eventInput({ source: 'fs:/a/b/c.jsonl' }));
+    await expect(
+      store.query({ source: 'fs:/a/b/c.jsonl', source_prefix: 'fs:/a/b' }),
+    ).rejects.toThrow(/mutually exclusive/);
+  });
+
   describe('path-like normalization (divergence class: Windows separators + case)', () => {
     it('matches a backslash-stored Windows source via a forward-slash source_prefix', async () => {
       await store.append(
````

## Commit 4fd77f56 — fix(review-queue): warn when the stale-plist check itself fails (101-retro r2 codex-ops MED)

````diff
commit 4fd77f56bc96036f1e8221c9eb694f45a5728325
Author: Zhen <zhenge82261643@gmail.com>
Date:   Thu Jun 11 11:35:39 2026 -0700

    fix(review-queue): warn when the stale-plist check itself fails (101-retro r2 codex-ops MED)
    
    rc=1 (drift) already warned; rc=3 (not installed) stays silent — normal
    for manual/on-demand ticks. Any OTHER nonzero rc now logs
    WARNING: STALE_PLIST_CHECK_FAILED with the rc + captured output, so a
    broken detector (installer missing, syntax error, diff/permission
    failure) can't die invisibly. Still non-fatal — tripwire, not gate.
    Wrapper suites 21/21.
    
    Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

diff --git a/tools/review-queue/_run_reviewer.sh b/tools/review-queue/_run_reviewer.sh
index 97efabd3..b87bc778 100755
--- a/tools/review-queue/_run_reviewer.sh
+++ b/tools/review-queue/_run_reviewer.sh
@@ -81,9 +81,12 @@ fi
   # A merge-only deploy changes the installer but not already-installed
   # launchd plists; a stale plist can silently revert operator-visible
   # guarantees (e.g. the pre-2026-06-11 StandardErrorPath=/dev/null
-  # blackout). Warn loudly on DRIFT only (rc=1): rc=3 (not installed) is
-  # the normal shape for manual/on-demand ticks and stays silent, and any
-  # check failure is non-fatal — this is a tripwire, not a gate.
+  # blackout). rc=1 (drift) warns loudly; rc=3 (not installed) stays
+  # silent — it is the normal shape for manual/on-demand ticks; any OTHER
+  # nonzero rc means the DETECTOR ITSELF is broken (installer missing,
+  # syntax/runtime error, diff/permission failure) and is warned with the
+  # rc + captured output so stale-plist detection can't die invisibly
+  # (101-retro r2 codex-ops MED). Always non-fatal — tripwire, not gate.
   set +e
   stale_check_out="$(bash "$TOOL_DIR/_install_reviewer_launchd.sh" "$REVIEWER_NAME" --check 2>&1)"
   stale_check_rc=$?
@@ -91,6 +94,9 @@ fi
   if [ "$stale_check_rc" -eq 1 ]; then
     echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: STALE_PLIST for $REVIEWER_NAME — installed launchd plist drifted from the installer's current render; re-run tools/review-queue/_install_reviewer_launchd.sh $REVIEWER_NAME"
     printf '%s\n' "$stale_check_out" | sed 's/^/  stale-plist: /'
+  elif [ "$stale_check_rc" -ne 0 ] && [ "$stale_check_rc" -ne 3 ]; then
+    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: STALE_PLIST_CHECK_FAILED for $REVIEWER_NAME — --check itself failed (rc=$stale_check_rc); stale-plist detection is NOT functioning"
+    printf '%s\n' "$stale_check_out" | sed 's/^/  stale-plist-check: /'
   fi
 
   # ── 057b AC7 Phase 1 — scheduler health (bootstrap-scoped) ─────────────
````
