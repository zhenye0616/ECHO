---
item_id: 2026-05-14-053-reviewer-completed-at-coercion
agent_id: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
binding: claude-code
started: 2026-05-15T19:11:10Z
finished: 2026-05-15T19:18:00Z
branch: agent/reviewer-completed-at-coercion
head_sha: 4ce5fc8318582ba91a556837e27c729980716a19
---

# Run 1 — 053 reviewer-completed-at-coercion

Two-prong friction fix: tighten reviewer prompts so emitted YAML is always parseable as `str`, AND coerce a YAML-auto-parsed `datetime.datetime` into the canonical ISO 8601 Z-suffixed string before jsonschema validates the reviewer schema. Spec landed at r6 CLAIM-READY; no clarification gaps surfaced during implementation.

## What I implemented (this attempt)

### AC1 — reviewer prompts (canonical + sync)

Added the quoted-`completed_at` example block + the prose "MUST be single-quoted" sentence to:

- `skills/review-queue-codex.md` — between the per-reviewer verdict-enum sentence and Step 5.
- `skills/review-queue-codex-ops.md` — same insertion point.
- `skills/review-queue-cursor.md` — same insertion point.

Ran `tools/sync-skills.sh` to refresh the three `.claude/commands/review-queue-{codex,codex-ops,cursor}.md` adapters byte-identical; `tools/sync-skills.sh --check` reports `OK: all adapters match canonical skills/`.

AC5 shell-safe grep gate (per spec):

```
missing="$(grep -L "completed_at: '2026-05-XXTHH:MM:SSZ'" \
    .claude/commands/review-queue-codex.md \
    .claude/commands/review-queue-codex-ops.md \
    .claude/commands/review-queue-cursor.md || true)"
[ -z "$missing" ] || { echo "AC5 fail" >&2; exit 1; }
```

→ exits 0; all three adapters contain the canonical quoted-example string.

### AC2 — `validate.py` coercion

`tools/review-queue/validate.py` gains:

- A module-scope `import datetime`.
- A module-scope helper:
  ```python
  def _coerce_completed_at(value: datetime.datetime) -> str:
      if value.tzinfo is not None:
          value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
      return value.strftime("%Y-%m-%dT%H:%M:%SZ")
  ```
  Exact signature per spec; placed at module scope (above `_detect_task_state_quotation`) so AC3.1 can import it directly with no I/O.
- A two-line coercion hook between `_lib.parse_frontmatter(path)` and `_lib.validate_frontmatter(fm, schema_name)` gated on `schema_name == "reviewer" and isinstance(fm.get("completed_at"), datetime.datetime)`. Replaces `fm["completed_at"]` in-place; original file bytes on disk are never rewritten.

Schema unchanged; `request` and `combined` paths unaffected; CLI contract / stderr / exit codes unchanged.

### AC3 — test file

`tests/review-queue/053-completed-at-coercion.test.ts` covers:

- **AC3.1 — direct unit-test** of `_coerce_completed_at` with four sub-cases (UTC, `-07:00`, `+09:00`, naive). Each asserts EXACT expected string `"2026-05-12T23:56:42Z"`.
- **AC3.2 — hermetic end-to-end** in a temp git repo with a bare local origin (`mktemp`-ed), `-b main` initialization, LOCAL git identity, file-replacement push-with-retry.sh stub pushing to the temp origin (PATH-stub explicitly forbidden by spec). Pre-pipeline origin-URL assertion (`!/github\.com/`); pre-test production-repo snapshot of HEAD + porcelain status + `ls-remote origin refs/heads/main` (validated as non-empty 40-hex); afterEach re-captures the snapshot and asserts equality on every exit path. Pipeline runs `validate_response_yaml.py → commit-reviewer-response.sh → combine.py` over a fixture round whose `request.requested_reviewers: [codex]` plus a single emitted `codex.md` with an UNQUOTED `completed_at: 2026-05-12T23:56:42Z`. Assertions: every stage exits 0; no `codex.md.invalid.<ts>` sibling produced; no `VALIDATION-FAIL: codex r1 on <item_id>` row in `raw/internal/queue-errors.md`; `combined.md` parses with a non-`malformed_reviewer_response` `combined_verdict`.
- **AC3.3 — source-bytes-unchanged.** Captures `readFileSync(reviewerPath)` before the pipeline; re-reads after combine; `Buffer.equals` must be true. Pins the in-memory-only invariant.
- **Bonus AC4 regression watch** — a quoted-`completed_at` fixture still passes `validate_response_yaml.py`, guarding against AC2 accidentally short-circuiting the happy path.

### AC5 — adapter re-sync

Already executed under AC1; the agent branch ships the three adapter files refreshed in the same commit.

## Files modified

| File | Lines (added/removed) | Branch | Head SHA |
|---|---|---|---|
| `tools/review-queue/validate.py` | +12 / -0 | `agent/reviewer-completed-at-coercion` | `4ce5fc8` |
| `skills/review-queue-codex.md` | +14 / -0 | same | same |
| `skills/review-queue-codex-ops.md` | +14 / -0 | same | same |
| `skills/review-queue-cursor.md` | +14 / -0 | same | same |
| `.claude/commands/review-queue-codex.md` | +14 / -0 (synced from canonical) | same | same |
| `.claude/commands/review-queue-codex-ops.md` | +14 / -0 (synced from canonical) | same | same |
| `.claude/commands/review-queue-cursor.md` | +14 / -0 (synced from canonical) | same | same |
| `tests/review-queue/053-completed-at-coercion.test.ts` | +345 / -0 (NEW) | same | same |

Total: 8 files changed, +441/-0 (approx; commit reports `8 files changed, 534 insertions(+)`).

## Decisions made

1. **Single-reviewer eligibility for AC3.2** — spec allows shape (a) `requested_reviewers: [codex]` OR shape (b) multi-reviewer + stub responses. Picked (a) per spec recommendation ("the simpler default") because it's a smaller surface and the test is exercising timestamp behavior, not multi-reviewer combine.
2. **AC3.2 push-stub shape** — file-replacement (option a), not the optional `--remote=<url>` flag (option b). Spec marks (b) as in-scope only if (a) is not viable; (a) is viable here.
3. **`spawnSync` vs `execFileSync` for ls-remote** — used `execFileSync` for both `rev-parse` / `status` and `ls-remote` to keep the path uniform; the try/catch IS the success-or-throw check (codex R5 F1 — `execFileSync` returns stdout on success and throws on non-zero exit). Subsequent 40-hex assertion guards against the rare empty-stdout-on-exit-0 case.
4. **Seeded an extra commit for `tools/review-queue` in the test fixture** so the checkout's HEAD is clean before the pipeline mutates anything. Belt-and-braces; the autoStash path would survive without it but the test is easier to debug when the only post-pipeline diff is `codex.md` + `combined.md`.

No drift events caught. Implementation stayed entirely inside `files_to_modify`.

## Acceptance criteria status

| AC | Status | Evidence |
|---|---|---|
| AC1 | ✅ | Three canonical skill files + three synced adapters contain the literal `'2026-05-XXTHH:MM:SSZ'` quoted example plus the prose sentence. `tools/sync-skills.sh --check` clean. |
| AC2 | ✅ | `_coerce_completed_at` is module-scope at `validate.py:50-54` (per the spec's exact signature); hook lives between `parse_frontmatter` and `validate_frontmatter` at lines ~79-80; schema-name-gated on `"reviewer"`; pathological non-string types untouched. |
| AC3 | ✅ | `tests/review-queue/053-completed-at-coercion.test.ts` covers AC3.1 (4 helper unit cases), AC3.2 (hermetic e2e), AC3.3 (bytes unchanged). All assertions exact-match per spec. |
| AC4 | ✅ | Full vitest run: 933 passed / 21 skipped / 0 failed across 70 test files. `tests/review-queue/`: 110 passed / 0 failed across 16 test files (053 contributes 6). |
| AC5 | ✅ | `tools/sync-skills.sh --check` reports "OK: all adapters match canonical skills/"; the shell-safe `grep -L` AC5 assertion passes. |

## Test results (verbatim — review-queue subset)

```
$ npx vitest run tests/review-queue/
...
 ✓ tests/review-queue/053-completed-at-coercion.test.ts (6 tests) 12168ms
   ✓ 053 AC3.1 — _coerce_completed_at helper direct unit-test > UTC tz-aware datetime → 2026-05-12T23:56:42Z 905ms
   ✓ 053 AC3.1 — _coerce_completed_at helper direct unit-test > -07:00 tz-aware (PDT) → 2026-05-12T23:56:42Z (UTC conversion applied) 345ms
   ✓ 053 AC3.1 — _coerce_completed_at helper direct unit-test > +09:00 tz-aware (JST) → 2026-05-12T23:56:42Z (day-boundary crossing handled) 341ms
   ✓ 053 AC3.1 — _coerce_completed_at helper direct unit-test > naive (tzinfo=None) datetime → 2026-05-12T23:56:42Z (assumed-UTC fallthrough) 326ms
   ✓ 053 AC3.2 — hermetic end-to-end pipeline with unquoted completed_at > AC3.2 — unquoted completed_at flows through validate_response_yaml → commit-reviewer-response → combine without quarantine 9716ms
   ✓ 053 AC4 — quoted-string completed_at unaffected by AC2 coercion > quoted completed_at still passes validate_response_yaml.py 533ms

 Test Files  16 passed (16)
      Tests  110 passed (110)
```

Full-suite summary (entire `npx vitest run`):

```
 Test Files  69 passed | 1 skipped (70)
      Tests  933 passed | 21 skipped (954)
   Duration  38.49s
```

The 21 pre-existing skips are not from `tests/review-queue/`; 053 introduces no new skips.

## Open questions for founder

None. Spec was r6 CLAIM-READY; all branches resolved during implementation. No surface area in scope of 053 left ambiguous after reading `spec_refs`.

## Drift events caught

None. Two temptations were noted in passing and rejected without writing a drift-log:

1. While reading `_lib.parse_frontmatter`, considered whether the coercion belongs in `_lib.py` (so future schemas could reuse it). Rejected per "Out of Scope" #1 — 053 narrows to the reviewer path only.
2. While reading `combine.py`, considered adding a similar coercion in `read_response` for symmetry. Rejected per "Out of Scope" #6 — `request` / `combined` schemas have different field shapes and are explicitly not in scope.

Both temptations match the spec's "Out of Scope (Don't Drift)" list, so they did not warrant a separate drift-log entry — they were correctly absorbed by the spec's pre-existing guardrails.
