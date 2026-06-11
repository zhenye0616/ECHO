# Retro-review brief — "sharpest five" audit fixes (merged 2026-06-11)

**What this is:** a post-merge cross-tool review request over five strategist-orchestrated
bugfix commits already on `origin/main`. These came out of the 2026-06-10/11 full-system
friction-and-bug audit (context layer first, then orchestration seams; seven parallel
auditors, findings deduped against `backlog/_followups.md`). Each fix was built under
strict TDD (watched RED before implementation) by a dedicated subagent; the founder
approved push with an independent review round queued — this brief is that round's
artifact. Reviewers: verify the fixes are correct, minimal, and didn't bend any adjacent
contract. The commits are the review surface; this brief is the map.

## The five commits (review in this order)

### 1. `f6b30569` — fix(storage): SqliteStorage source-matching conformance
- Bug: `source`/`source_prefix` semantics existed only in MemoryStorage
  (`normalizePathLikeSource`: backslash→slash, trailing-slash strip, Windows case-fold,
  component-boundary prefix). Production SQLite did raw `=`/`LIKE` — Windows beta-gate
  breaker; `fs:/a/b` matched `fs:/a/bc`; ASCII-case-insensitive `LIKE` matched `GIT:`.
- Fix shape: helpers extracted verbatim to `src/storage/source-match.ts` (memory.ts
  imports them — zero behavior change there); sqlite applies the shared JS predicate
  post-SQL behind a `likePrefilterChunk` LIKE prefilter, `LIMIT` relocated to JS when the
  predicate is active. New parameterized conformance suite
  (`tests/storage/source-match-conformance.test.ts`) runs both adapters over one table.
- **Scrutinize:** the prefilter superset proof (non-ASCII guard, separator edge cases);
  the non-path-like exact-source SQL fast path being provably identical to `sourceEquals`;
  cursor-pagination (`before`) interaction with the JS-relocated LIMIT; the accepted perf
  regression on path-like `limit:1` MRU lookups (deliberately not optimized — flagged
  for a measured follow-up).

### 2. `24dc37f7` — fix(capture): per-turn checkpoint, invalid_timestamp guard, rejection containment
- Bugs (three P1s): mid-batch append throw → duplicate-atom storm on every poll tick
  (offset persisted only after the batch, CC+Codex extractors); unparseable timestamp
  throwing `RangeError` AFTER gate-accept in `pipeline.ts`; unhandled rejections from
  fs-watcher's bare `void` emit and git-watcher's `.finally`-only `track()` with no
  process-level handler.
- Fix shape: per-successful-turn `offsetMap.set` in both extractors (Cursor's proven
  pattern); `processCandidate` returns `{accepted:false, reason:'invalid_timestamp'}`
  (new `PipelineRejectionReason` union member) instead of throwing; `.catch`+log on both
  watcher paths plus a log-don't-exit `unhandledRejection` handler in `src/daemon/index.ts`.
- **Scrutinize:** checkpoint correctness on the Codex cluster-pairing path (the
  `checkpoint` vs final `next` offsets at codex.ts:835/844); whether `invalid_timestamp`
  rejection should also count somewhere observable (it warn-logs only); whether the
  global `unhandledRejection` handler could mask future genuine bugs (deliberate trade —
  log-don't-crash for a capture daemon).

### 3. `9fdf95de` — fix(review-queue): combine.py wrong-verdict holes O1+O2
- Bugs: optional-only roster → `all([])` made rounds eligible instantly → false terminal
  `no_responses` escalation before any reviewer tick; 044 AC4 auto-disposition fired
  with zero REQUIRED reviewers present (optional `proceed` substituted for the silent
  required reviewer).
- Fix shape: eligibility for zero-required rosters = first-response-present OR fallback
  timeout; auto-disposition branch gains `present.keys() & required_set` conjunct.
  Docstring verdict table updated.
- **Scrutinize:** the new eligibility gate's interaction with `--timeout-hours` override
  and per-reviewer `timeout_hours`; that every 043 AC6 / 044 AC3/AC4 case is untouched;
  whether the optional-only timeout path produces the right `combined.md` body wording.

### 4. `fa903208` — fix(review-queue): launchd blackout + selection-parser truncation
- Bugs: reviewer plists wrote StandardOut/ErrPath to `/dev/null` → everything before the
  wrapper's exec-redirect failed silently every 10 min (the original coord-layer
  motivator, never actually closed); the request-SELECTION heredoc still used naive
  `split('---', 2)` (the 099 incident class) → a `---` inside a frontmatter value
  silently skipped the round in scan mode.
- Fix shape: installer bakes the absolute per-reviewer log path into both plist keys
  (launchd appends — interleaves with the wrapper's own `>>`); selection parser inlines
  the line-anchored frontmatter regex. **Deviation found during the fix:** `import _lib`
  inside `python3 -` heredocs is itself a silent-failure vector — under a non-arm64
  parent, `_lib`'s darwin arch-retry re-execs `arch -arm64 python3 -` with stdin already
  consumed → silent exit 0. This made `validate_request_binding` FAIL OPEN under Rosetta
  parents; the same inline-parse fix was applied there.
- **Scrutinize:** the fail-open discovery (is the inline-regex duplication acceptable vs
  a structural `_lib` stdin fix? two "keep in sync" regex copies now exist); rotation ×
  launchd-held-fd interaction (documented, not mechanized); operational follow-up owed —
  installed plists keep `/dev/null` until `_install_reviewer_launchd.sh <slug>` is re-run.

### 5. `5336d475` — fix(mcp): wait_for_new_turns lossless chaining
- Bugs: `next_since = now()` (wall clock) vs capture-ingest lag → turns landing in the
  gap permanently invisible to chained calls (inline comment claimed the opposite);
  >20-turn bursts returned the NEWEST 20 with no signal, cursor jumped past the rest.
- Fix shape (contract change, deliberate): `next_since` = max RETURNED turn timestamp,
  or the canonicalized caller `since` echoed back on empty timeout — never the clock;
  overflow returns the OLDEST page ascending `(timestamp, id)` + `warnings[]` entry;
  same-timestamp boundary groups never split (page may exceed cap by tie count;
  per-source fetch window 2×cap+1). Delivery order changed DESC→ASC; three old-contract
  tests deliberately updated; outputSchema byte-identical.
- **Scrutinize:** the documented pathological limit (single-ms tie group > ~2×cap);
  starvation behavior when the `since` boundary tie group sits inside the fetch window;
  whether any live consumer (group-session docs, skills, overlay) assumed newest-first
  ordering or wall-clock `next_since`.

## Verification already performed (don't re-litigate, spot-check)
- Watched RED for every fix; GREEN: product suite 1700 passed (packed-manifest snapshot
  updated for the new shipped module; `recent-calls-endpoint` is the known R5
  full-suite-load flake, 2/2 in isolation); orchestration combine/wrapper/readonly/smoke
  suites 64/64 re-run on the final combined tree; `tsc --noEmit` + `eslint --max-warnings 0` clean.

## Out of scope (do not expand)
- Everything else in the 2026-06-10 audit (filed separately; `_followups.md` candidates
  pending a strategist pass): cluster-engine demotion-after-truncation, coord reconcile
  idempotency, artifact-identity case-fold/relative-path joins, validate-after-write
  ordering, etc.
- Daemon rebuild/reinstall + per-slug plist reinstall are operator actions, not review items.
