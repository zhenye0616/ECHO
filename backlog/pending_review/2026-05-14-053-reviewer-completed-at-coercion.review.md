---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
verdict: merge as-is
reviewed_at: 2026-05-15T09:45:00Z
test_counts: { passed: 933, failed: 0, skipped: 21 }
---

## Verdict

All five ACs Met with file:line evidence; 6/6 new tests pass; full suite green at 933 passed / 21 skipped / 0 failed across 70 files; lint + typecheck + `tools/sync-skills.sh --check` all clean. Implementation follows the converged r1/r2/r3 design exactly — module-scope helper, reviewer-schema-gated hook, no on-disk rewrites, no schema widening, hermetic temp-repo for e2e, file-replacement push stub, 40-hex pre-snapshot validation, `afterEach` try/finally guard. No drift; only the 8 files in `files_to_modify` were touched.

## Acceptance status

- **AC1 (quoted example + prose, three skills) — Met.** `skills/review-queue-codex.md:67-80`, `skills/review-queue-codex-ops.md`, `skills/review-queue-cursor.md` each insert the same prose sentence + frontmatter example with `completed_at: '2026-05-XXTHH:MM:SSZ'`. Adapters in `.claude/commands/` byte-identical to canonical.
- **AC2 (`_coerce_completed_at` + gated hook) — Met.** `tools/review-queue/validate.py:53-58` defines the helper at module scope. `validate.py:87-88` adds the schema-name-gated, isinstance-gated, in-memory-only call between `parse_frontmatter` and `validate_frontmatter`. No `_lib.py` edit; no schema edit.
- **AC3.1 (4 tz unit cases) — Met.** `tests/review-queue/053-completed-at-coercion.test.ts:116-144` covers UTC, -07:00 (PDT), +09:00 (JST day-boundary), and naive — each asserts exact string `"2026-05-12T23:56:42Z"`.
- **AC3.2 (hermetic e2e) — Met.** `053-completed-at-coercion.test.ts:157-238` performs 8-step setup: bare origin (165), checkout -b main (169), local identity (173-174), origin-URL safety assert with github.com block (179-183), seed commit + push (186-189), copy of production helpers + schemas + reviewers.json (194-213), file-replacement push stub at `$CHECKOUT/tools/review-queue/push-with-retry.sh` (218-229), tools-copy commit (235-237). `captureProdSnapshot()` lines 54-89 validates non-empty 40-hex. `afterEach` lines 240-257 wraps post-snapshot in try/finally.
- **AC3.3 (source-bytes byte-identity) — Met.** Line 309 captures pre-pipeline bytes; lines 392-395 re-read + `Buffer.equals()` assert identity.
- **AC4 (full suite green) — Met.** Observed: `Test Files 69 passed | 1 skipped (70); Tests 933 passed | 21 skipped (954)`. 053 alone contributes 6 passing tests.
- **AC5 (adapters re-synced) — Met.** `tools/sync-skills.sh --check` returns `OK: all adapters match canonical skills/`.

## Drift findings

No drift detected. `git diff main...HEAD --name-only` lists exactly the 8 paths in `files_to_modify`. `_lib.py` untouched; `reviewer.schema.json` untouched.

## Design-choice judgments

- **Module-scope `_coerce_completed_at` helper** (codex R1 F1) — **stand**. Directly importable, enables AC3.1's `python3 -c "from validate import _coerce_completed_at"`.
- **Reviewer-schema-gated hook** — **stand**. `validate.py:87` correctly limits coercion to `schema_name == "reviewer"`. `request`/`combined` schemas untouched.
- **In-memory-only coercion** (codex-ops R1 F4) — **stand**. Hook mutates `fm` dict in memory only; AC3.3 byte-identity test pins this contract.
- **No schema widening** (spec invariant) — **stand**. `reviewer.schema.json` untouched.
- **Hermetic temp-repo with file-replacement push stub** (codex R2 + R3 F1) — **stand**. Stub written to `$CHECKOUT/tools/review-queue/push-with-retry.sh`, not PATH. Real-remote shielding works at three layers: origin-URL pre-assert, push-stub redirection, `afterEach` post-snapshot.
- **40-hex ls-remote pre-validation** (codex R3 F3) — **stand**. Lines 82-87 reject empty/malformed SHA.
- **`afterEach` try/finally cleanup** (codex-ops R2 F4) — **stand**. Ensures production-repo guard fires even if `rmSync` throws.
- **`execFileSync` shape** (codex R4 F2 + R5 F1) — **stand**. Throw-on-failure pattern, no incorrect `status` field check.

## Bugs/risks

None found that block merge. Two minor cosmetic observations (non-blocking):
- `tests/review-queue/053-completed-at-coercion.test.ts:298` writes the unquoted timestamp inside a frontmatter that does NOT exercise round-trip-into-commit — intentional per AC3.3 but could use a comment.
- `.gitkeep` seed file at line 186 is idiosyncratic naming (`.gitkeep` is conventionally for empty-dir markers); a plain `README.md` seed would read more naturally. Cosmetic.

## Merge-conflict preview

- **vs `main`:** no conflicts. Clean fast-forwardable.
- **vs 050:** 050 also edits all three `skills/review-queue-{codex,codex-ops,cursor}.md` + adapters. 050's hunks at lines ~15, ~104, ~114; 053's hunk at line ~64. **No textual overlap** — `git merge` resolves via context offsets. Whichever lands second needs `tools/sync-skills.sh` re-run, which 052's C5 step enforces mechanically.
- **vs 051:** touches `push-with-retry.sh` + `_run_reviewer.sh` only. No overlap with 053.
- **vs 052:** touches `merge-and-cleanup.md` + pre-commit hook. No overlap. 052 strengthens 053's AC5 guarantee post-merge.

**Recommended merge order: 052 → 051 → 050 → 053.** Rationale: 052 first so sync-skills check is in merge-and-cleanup before any skill-touching item merges; 051 independent and lockless; 050 makes the larger skill edits; 053 last because its skill edits are smallest and easiest to re-sync if context-line offsets shift after 050 lands.

## Suggested fixups

**Pre-merge punch list (blocking):** None.

**Non-blocking follow-ups:**
- After all four items merge, re-run `tools/sync-skills.sh --check` once on `main` as belt-and-suspenders (052's C5 step already does this at merge time).
- Optional: tiny inline comment at `validate.py:87` referencing item 053 so future readers find the spec from the code site. Non-blocking.

## Test counts observed

- `npx vitest run tests/review-queue/053-completed-at-coercion.test.ts`: 6 passed / 0 failed (10.02s).
- `npx vitest run` (full suite): **Test Files 69 passed | 1 skipped (70); Tests 933 passed | 21 skipped (954)**, 38.93s.
- `npm run lint`: exit 0 (ESLint + task-state lint clean).
- `npm run typecheck`: exit 0 (`tsc --noEmit` clean).
- `tools/sync-skills.sh --check`: exit 0, `OK: all adapters match canonical skills/`.
