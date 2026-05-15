---
id: 2026-05-14-053-reviewer-completed-at-coercion
title: Reviewer schema accepts/coerces unquoted-YAML completed_at timestamps (two-prong — quoted-example prompts + defensive coercion)
status: ready
priority: MEDIUM
estimate: 0.5-1d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-053-reviewer-completed-at-coercion
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/review-queue/validate.py  # AC2 — pre-jsonschema coercion of datetime.datetime → ISO 8601 Z-suffixed string in `completed_at`
  - skills/review-queue-codex.md  # AC1 — quoted completed_at example + prose "single-quoted required" sentence
  - .claude/commands/review-queue-codex.md  # re-synced via tools/sync-skills.sh post-AC1
  - skills/review-queue-codex-ops.md  # AC1 — same change for codex-ops reviewer prompt
  - .claude/commands/review-queue-codex-ops.md  # re-synced post-AC1
  - skills/review-queue-cursor.md  # AC1 — same change for cursor reviewer prompt
  - .claude/commands/review-queue-cursor.md  # re-synced post-AC1
  - tests/review-queue/053-completed-at-coercion.test.ts  # NEW — AC3 (unquoted YAML now passes end-to-end) + AC4 (quoted YAML still passes)
spec_refs:
  - backlog/_followups.md  # lines 633–644 — the originating finding (042 cycle gap #5), candidate fixes (a/c) that 053 adopts as a two-prong, and the recursive-risk observation
  - tools/review-queue/schemas/reviewer.schema.json  # AC2 target shape — `completed_at: { type: string, pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }`. 053 does NOT widen this schema; it only ensures the value reaches validation as a python `str`.
  - tools/review-queue/validate.py  # AC2 patch site — coercion hook lands between `_lib.parse_frontmatter()` (line ~75) and `_lib.validate_frontmatter()` (line ~80)
  - tools/review-queue/_lib.py  # context — `parse_frontmatter()` calls `yaml.safe_load()` which is the source of the datetime.datetime auto-coercion that breaks `type: string`. 053 does NOT patch _lib.py; the fix is upstream of jsonschema in validate.py only.
  - tools/review-queue/validate_response_yaml.py  # context — pre-link gate that shells out to validate.py per AC1 of 045. 053 inherits AC2's coercion automatically by being inside validate.py.
  - backlog/complete/2026-05-12-042-reviewer-emission-yaml-validation.md  # 042 is the spec that built the quarantine-on-bad-yaml machinery (AC4) that absorbed the wasted-compute cost. 053 closes the gap 042 left open.
  - backlog/complete/2026-05-13-045-queue-reliability-friction-cluster.md  # 045 is the friction-fix precedent shape this spec matches.
  - backlog/ready/2026-05-14-052-merge-cleanup-sync-skills-check.md  # complementary spec — 052 adds `tools/sync-skills.sh --check` to merge-and-cleanup C5 so AC5's re-sync drift is caught mechanically. 053 and 052 are independent but mutually reinforcing for skill/.claude-commands consistency.

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Reviewer schema accepts/coerces unquoted-YAML completed_at timestamps

## Why this spec exists

`tools/review-queue/schemas/reviewer.schema.json` declares `completed_at: { type: string, pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$" }`. PyYAML's `safe_load` auto-coerces an unquoted ISO 8601 timestamp like `2026-05-12T23:56:42Z` into a `datetime.datetime` object — not a `str`. jsonschema then rejects with `'datetime.datetime(...)' is not of type 'string'`. The 045 pre-link gate (`validate_response_yaml.py`) propagates the rejection; `commit-reviewer-response.sh` quarantines the response per 041 AC4; the reviewer tick must regenerate.

During the 042 review cycle, r1/r2 happened to emit single-quoted strings (passing); r3 first-attempt emitted unquoted (failing → quarantine). The variance is non-deterministic across Codex ticks — same prompt, same context, different emission. Cost per occurrence: one extra ~3-min round-trip in the affected round. AC4 absorbed it without founder activation, but the wasted compute compounds across rounds and across specs.

The fix is **two-prong** because either alone is insufficient:

- **Prong A — prompt** — Tighten reviewer prompts so emitted YAML is always parseable as `str` (single-quoted timestamp). Reviewers today have no concrete `completed_at` example in their canonical prompt body; they improvise the formatting and roll the dice on whether the improvisation happens to be quoted. A literal example fixes the modal case.
- **Prong B — coercion** — Add a defensive coercion in `validate.py` upstream of `jsonschema.validate()`: if `fm["completed_at"]` is parsed as `datetime.datetime`, coerce to ISO 8601 Z-suffixed `str` before the schema check. This catches the long-tail case where a reviewer (or a future binding) emits unquoted timestamps despite the prompt example.

Prompts alone leave a known YAML quirk silently fragile; coercion alone leaves prompts vague and propagates inconsistent emission shapes across `<reviewer>.md` files (a downstream readability cost). Both prongs together: prompts make the modal emission correct + defensive coercion makes the rare outlier survive.

**Recursive risk note.** 053's own review cycle is at non-zero risk of triggering the bug it's spec'ing the fix for: if codex or codex-ops emits an unquoted `completed_at` while reviewing this spec, the queue may quarantine the response. The strategist driving 053's review queue MUST log every such occurrence in detail in `raw/internal/dogfooding/2026-05-14-3-spec-parallel-run-issues.md` — that's empirical evidence the spec is needed and a forcing function for the cycle to converge cleanly.

## Architectural invariant

**Schema stays narrow; emission gets concrete; reception is forgiving.** The `reviewer.schema.json` `completed_at` field remains `{ type: string, pattern: ISO 8601 Z-suffixed }` — 053 does NOT widen the schema to accept `datetime.datetime` or `oneOf` shapes; the canonical wire format on disk is and remains a quoted ISO 8601 string. The prompts emit the canonical shape verbatim. The validator coerces a `datetime.datetime` (which means YAML accidentally auto-parsed an unquoted timestamp) to the canonical `str` shape before validation — equivalent semantics, no schema widening, no validator special-case beyond a single one-line coercion.

**Coercion is in-memory only — on-disk source bytes are NEVER rewritten.** This is a deliberate scope choice (codex-ops R1 F4). The validator reads the file, parses the YAML, coerces in memory, validates against the schema. The original file content on disk is untouched: a `<reviewer>.md` whose source had an unquoted `completed_at` will still have an unquoted `completed_at` on disk after `validate.py` runs and exits 0. Trade-off accepted: on-disk shape MAY drift from the canonical quoted form if the AC1 prompt-prong regresses, but the runtime cost (wasted compute from quarantine + regenerate) is eliminated. Detection of prompt-prong regression rides on AC5's grep-gate over `.claude/commands/review-queue-*.md` (mechanical, fast, scoped to the three prompt files) — NOT on a stored-on-disk grep over `backlog/reviews/**/r*/<reviewer>.md` (which would require a separate scan surface and is filed as 053-followup-B). AC3 includes an inline assertion that the stored file source bytes are byte-identical before vs. after the validate.py + commit-reviewer-response.sh + combine.py pipeline runs successfully on an unquoted fixture; this pins the in-memory-only contract into the test surface so a future change that flips to source-rewriting cannot land silently.

## Acceptance Criteria

### AC1 — Reviewer prompts include a literal quoted `completed_at` example + prose requirement

- **Modified files (canonical):** `skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md`, `skills/review-queue-cursor.md`. After each canonical edit, run `tools/sync-skills.sh` so the `.claude/commands/review-queue-{codex,codex-ops,cursor}.md` adapters are re-synced byte-for-byte (verify with `tools/sync-skills.sh --check`).
- **Each reviewer prompt body MUST contain BOTH:**
  1. A literal example block showing the canonical frontmatter shape with `completed_at: '2026-05-XXTHH:MM:SSZ'` (single-quoted). Use placeholders `XX` / `HH:MM:SS` so reviewers do not blindly copy the example date. The example block should be a complete `---`-delimited frontmatter fence (item_id, round, reviewer, artifact_sha, completed_at, verdict, findings) so the quoted-timestamp shape is visible in context, not floating in isolation.
  2. A one-sentence prose requirement immediately following or preceding the example block: "The `completed_at` value MUST be single-quoted (`'2026-05-XXTHH:MM:SSZ'`); unquoted ISO 8601 timestamps are auto-parsed by PyYAML as `datetime.datetime` and rejected by the schema."
- **Each reviewer prompt's existing instructions for writing `<reviewer>.md` are unchanged in all other respects.** AC1 is purely additive prose + a frontmatter example block; no instruction is removed or reordered.

### AC2 — `validate.py` coerces `datetime.datetime` → ISO 8601 Z-suffixed string before jsonschema validation

- **Modified file:** `tools/review-queue/validate.py`.
- **Coercion logic MUST live in a small private helper function (codex R1 F1 — directly testable signature).** Required signature, name, and location:
  ```python
  def _coerce_completed_at(value: datetime.datetime) -> str:
      """Coerce a YAML-auto-parsed datetime.datetime into the canonical ISO 8601 Z-suffixed string the reviewer schema expects."""
      if value.tzinfo is not None:
          value = value.astimezone(datetime.timezone.utc).replace(tzinfo=None)
      return value.strftime("%Y-%m-%dT%H:%M:%SZ")
  ```
  Place this helper at module scope in `validate.py` (NOT inside another function) so AC3 can import + call it directly with no I/O. The helper takes a `datetime.datetime` and returns a `str`; it has no side effects, no exception paths for the documented input type, and is the single source of truth for the conversion.
- **Coercion hook (caller of `_coerce_completed_at`) lives between `_lib.parse_frontmatter(path)` (which returns `fm, body`) and `_lib.validate_frontmatter(fm, schema_name)` (which runs jsonschema).** Lines ~74-80 in today's file. Insert a small coercion block: if `schema_name == "reviewer"` AND `isinstance(fm.get("completed_at"), datetime.datetime)`, replace `fm["completed_at"]` with `_coerce_completed_at(fm["completed_at"])`. Use the canonical `datetime` import; do not import `pytz` or other dependencies.
- **Schema-name gate is load-bearing.** Coercion runs only for `schema_name == "reviewer"`. The `request` and `combined` schemas do not have a `completed_at` field at the same shape; touching them risks unintended downstream behavior. 053 narrows the coercion to the reviewer schema only — extending to other schemas is out of scope and not on the followup list (no observed need).
- **Error path is unchanged.** If `fm["completed_at"]` is some other non-string type (e.g. an integer, a list — pathological cases), 053 does NOT coerce; the value flows through to jsonschema and is rejected with today's `is not of type 'string'` error. The coercion targets the specific YAML-auto-parses-as-datetime quirk only.
- **No public API change.** `validate.py`'s CLI contract, exit codes, and stderr message shape are unchanged. The coercion is internal and silent (no print on success). The 041 AC4 quarantine path is NOT triggered by a successful coercion — coercion happens before jsonschema sees the value, so a previously-failing-now-passing emission yields a passing validate.py run.

### AC3 — End-to-end test: unquoted-YAML `completed_at` passes validate → commit-reviewer-response → combine

- **New test file:** `tests/review-queue/053-completed-at-coercion.test.ts`. Use the existing test harness (the same TypeScript runner that exercises `tests/review-queue/045-pre-link-yaml-validation.test.ts` and `tests/review-queue/yaml-error-handling.test.ts` today — verify by reading `package.json`'s test script and at least one existing review-queue test fixture before writing).

- **AC3.1 — Direct helper unit-test (codex R1 F1).** Import `_coerce_completed_at` from `tools/review-queue/validate.py` (or invoke it via `python3 -c "from validate import _coerce_completed_at; ..."` if direct Python-from-TypeScript import isn't supported by the harness). Required sub-cases with EXACT expected output strings:
  - UTC tz-aware: `datetime.datetime(2026,5,12,23,56,42,tzinfo=datetime.timezone.utc)` → `"2026-05-12T23:56:42Z"`.
  - `-07:00` tz-aware (the realistic Pacific Daylight Time case): `datetime.datetime(2026,5,12,16,56,42,tzinfo=datetime.timezone(datetime.timedelta(hours=-7)))` → `"2026-05-12T23:56:42Z"` (NOT `"2026-05-12T16:56:42Z"` — the naive `strftime` without `astimezone` would produce the wrong value; this sub-case is the falsifier for the "implementation skipped UTC conversion" failure mode codex R1 F1 surfaced).
  - `+09:00` tz-aware (JST, the other realistic non-UTC case): `datetime.datetime(2026,5,13,8,56,42,tzinfo=datetime.timezone(datetime.timedelta(hours=9)))` → `"2026-05-12T23:56:42Z"` (asserts the day-boundary crossing is handled, not just hour math).
  - Naive (tzinfo=None) datetime: `datetime.datetime(2026,5,12,23,56,42)` → `"2026-05-12T23:56:42Z"` (assumed-UTC fallthrough; the helper's first branch is skipped because `tzinfo is None`, formatting proceeds directly).
  All four sub-cases assert against the EXACT string. A test that only checks "is type `str`" or "ends with `Z`" is INSUFFICIENT and does not satisfy AC3.1.

- **AC3.2 — End-to-end pipeline test in an isolated temp git repo (codex-ops R1 F3 + codex/codex-ops R2 hermetic-runtime hardening).** Construct a synthetic `<reviewer>.md` whose frontmatter contains `completed_at: 2026-05-12T23:56:42Z` (UNQUOTED), with all other required fields valid. The test MUST run the actual reviewer-side pipeline (`validate_response_yaml.py <path>` → `commit-reviewer-response.sh` → `combine.py`) inside a **hermetic temp git repo** with a **stubbed local "origin"**.

  - **Test repo setup (load-bearing, hermetic — codex R2 F2 + codex-ops R2 F3) — exact sequence required:**
    1. `WORK="$(mktemp -d)"; ORIGIN="$WORK/origin.git"; CHECKOUT="$WORK/checkout"`.
    2. `git -c init.defaultBranch=main init --bare "$ORIGIN"` — bare origin repo on default branch `main`.
    3. `git -c init.defaultBranch=main init -b main "$CHECKOUT"` — `-b main` is REQUIRED; on hosts where the system git default is `master`, omitting `-b main` produces a `master` branch that `push-with-retry.sh`'s `git pull --rebase origin main && git push origin main` cannot reconcile (codex-ops R2 F3).
    4. `cd "$CHECKOUT"`; configure LOCAL git identity (`git config user.email "test@echo.local"` + `git config user.name "ECHO Test Harness"`) — REQUIRED because cron/CI/launchd environments often have no `--global` git identity; without local identity `commit-reviewer-response.sh`'s `git commit` aborts with `Please tell me who you are` (codex R2 F2 + codex-ops R2 F3).
    5. `git remote add origin "$ORIGIN"`.
    6. Seed an initial commit (`echo "init" > .gitkeep && git add .gitkeep && git commit -m "init"`) and push to the bare origin (`git push origin main`) so the local `origin/main` ref exists. Without this seed, `commit-reviewer-response.sh`'s downstream `push-with-retry.sh` invocation runs `git pull --rebase origin main` against a refspec that does not yet exist, producing a fetch error rather than exercising the unquoted-`completed_at` path (codex R2 F2).
    7. Copy `tools/review-queue/` (including `validate.py`, `validate_response_yaml.py`, `commit-reviewer-response.sh`, `combine.py`, `_lib.py`, `_reviewers.py`, `dispatch-next-round.py`, `request.py`, **`reviewers.json`**, and the `schemas/` directory) into the checkout so the helpers are runnable in place. The `reviewers.json` file is REQUIRED (codex R3 F2 — `combine.py` imports `_reviewers.py` at module-load time, which reads `tools/review-queue/reviewers.json`; copying only validate/commit/combine + schemas leaves combine.py crashing before it can exercise the timestamp behavior). After copying, immediately overwrite `$CHECKOUT/tools/review-queue/push-with-retry.sh` with the stub per the Push-stub contract subsection above (or apply the `--remote` flag patch path).
    8. Copy `backlog/reviews/<fixture-item-id>/r1/request.md` into the expected location with a fixture `spec_commit_sha` (any valid hex SHA acceptable — the helper does not enforce SHA reachability against the bare origin) AND with `requested_reviewers` configured so that **`combine.py` is eligible to produce a `combined.md` after the single emitted response** (codex R3 F2). Two acceptable shapes: (a) set `requested_reviewers` in the fixture `request.md` to exactly `[<emitted-reviewer>]` (single-reviewer eligibility — straight path); OR (b) set `requested_reviewers` to multiple reviewers AND create stub `<other-reviewer>.md` response files for all required-but-not-tested reviewers BEFORE invoking `combine.py`. Shape (a) is the simpler default; shape (b) is only needed if the test wants to exercise multi-reviewer combine behavior. Document the choice in the test file's header comment. Without this, `combine.py` exits 0 with no `combined.md` produced (because the round is partial/incomplete from its perspective) and the pipeline assertion `combine.py output is well-formed` becomes vacuous.

  - **Push-stub contract (codex R3 F1 — load-bearing mechanism, not "may either"):** the test MUST stub `push-with-retry.sh` by **replacing the script file at `$CHECKOUT/tools/review-queue/push-with-retry.sh`** with a stub that writes to the temp-local `origin.git` (e.g. `git push "$LOCAL_ORIGIN_PATH" HEAD:main`) — NEVER the founder's `github.com/zhenye0616/ECHO` remote. The PATH-stub approach (placing a `push-with-retry.sh` earlier on `PATH`) is **explicitly forbidden**: `commit-reviewer-response.sh` resolves `PUSH_HELPER` via `git rev-parse --show-toplevel` to an absolute path in the repo root, so PATH-shadowing has no effect (codex R3 F1 — verified against current helper source). Two acceptable concrete shapes:
    - (a) **File-replacement stub (default):** copy the production helpers into `$CHECKOUT/tools/review-queue/`, then overwrite ONLY `$CHECKOUT/tools/review-queue/push-with-retry.sh` with the local-push stub. The stub MUST be marked executable (`chmod +x`).
    - (b) **Additive `--remote=<url>` flag on the real `push-with-retry.sh`** (in-scope only if (a) is not viable — e.g. if the builder wants to exercise the real retry logic). Document the choice in the test file's header comment. If (b) is taken, add the flag implementation to `push-with-retry.sh` as part of this spec and add a separate test that the flag rejects values containing `github.com` (defense-in-depth).

  - **Pre-pipeline origin-URL assertion (codex R2 F1 — defense-in-depth against accidental real-remote pointing):** BEFORE invoking `commit-reviewer-response.sh`, the test MUST assert `git -C "$CHECKOUT" remote get-url origin` returns a string that begins with `file://` OR equals the literal `$ORIGIN` path. Any value containing `github.com` FAILS the test immediately with a clear "AC3.2 fixture has origin pointing at a real remote — refusing to run" message. This guards against the case where the test environment inherited an `origin` config from a parent template.

  - **Production-repo untouched assertion (load-bearing — codex R2 F1 + codex-ops R2 F4) — required shape:**
    1. **Pre-test snapshot** (captured outside any `try`, BEFORE the pipeline starts): `PROD_HEAD_PRE="$(git -C ~/Desktop/Project_echo rev-parse HEAD)"`; `PROD_STATUS_PRE="$(git -C ~/Desktop/Project_echo status --porcelain)"`; `PROD_REMOTE_MAIN_PRE="$(git -C ~/Desktop/Project_echo ls-remote origin refs/heads/main | awk '{print $1}')"` — capture the SHA of `refs/heads/main` on the REAL github.com remote (not a fixture-branch pattern — `push-with-retry.sh` pushes `origin main`, NOT a fixture-named branch, so the guard MUST be against the actual `main` ref that the helper would touch). **Non-empty 40-hex validation (codex R3 F3):** after capturing `PROD_REMOTE_MAIN_PRE`, immediately assert it is a non-empty 40-character lowercase hex string (`^[a-f0-9]{40}$`). If empty (network failure, ls-remote silent failure, awk pipeline silently dropped the value), ABORT the test setup with a clear "AC3.2 cannot verify production-remote safety — pre-snapshot ls-remote returned empty; refusing to run" message. **Without this validation, a transient ls-remote failure produces `empty == empty` in the post-test guard and silently passes the test even if a real push leaked.** Acceptable alternative implementation: use `execFileSync(['git', '-C', '~/Desktop/Project_echo', 'ls-remote', 'origin', 'refs/heads/main'])` (no shell pipeline, surfaces non-zero exit synchronously) and parse the result, asserting command success AND a non-empty 40-hex SHA before entering the pipeline.
    2. **Post-test re-capture (MUST run in a `try { ... } finally { ... }` / `afterEach` block — codex-ops R2 F4):** re-capture all three values inside a guard that fires on EVERY exit path — happy-path success, assertion failure mid-pipeline, exception thrown by `validate.py` / `commit-reviewer-response.sh` / `combine.py`, and timeout. Assert `PROD_HEAD_POST === PROD_HEAD_PRE` AND `PROD_STATUS_POST === PROD_STATUS_PRE` AND `PROD_REMOTE_MAIN_POST === PROD_REMOTE_MAIN_PRE`. Any inequality FAILS the test loudly with `"AC3.2 leaked: production repo was modified — pre={...}, post={...}"`. The finally-block guard is the load-bearing protection against "test crashed at line N before reaching the post-pipeline assertions" (codex-ops R2 F4 — without the finally wrapper, a crashed-mid-pipeline run that DID write to production would skip the guard entirely).
    3. Implementation hint: in Jest / Vitest harnesses, use `afterEach` (NOT `afterAll` — the latter only fires at the end of the file, masking per-test leaks). In the bash-test path, use `trap '...' EXIT`.

  - **Pipeline assertions:** every stage exits 0; no quarantine is triggered (no file appears under `raw/internal/quarantine/` in the temp checkout); the response file lands at the expected path in the temp checkout's `backlog/reviews/<fixture-item-id>/r1/<reviewer>.md`; `combine.py`'s output is well-formed (frontmatter parses, `combined_verdict` field present and is a valid value).

- **AC3.3 — On-disk source bytes unchanged assertion (codex-ops R1 F4).** Before running the AC3.2 pipeline on the unquoted fixture, capture `Buffer.from(fs.readFileSync(<fixture-path>))`. After the pipeline completes, re-read the same file and assert the bytes are byte-identical. This pins the "coercion is in-memory only — on-disk source bytes are NEVER rewritten" architectural invariant into the test surface (per Architectural Invariant clarification above). If a future change makes the validator (or any downstream helper) rewrite the source to the canonical quoted form, AC3.3 will fail and force the change to either be explicit-in-scope or to update this assertion deliberately.

- **The test MUST use the real `validate.py` and `validate_response_yaml.py` code paths**, not a mock. The whole point of AC3 is end-to-end coverage that catches a future regression where someone removes the coercion or wraps it in a code path that doesn't fire.

### AC4 — Existing tests for quoted `completed_at` still pass

- The existing review-queue test suite (`tests/review-queue/*.test.ts`) MUST remain green after AC1-AC3 land. In particular:
  - `tests/review-queue/045-pre-link-yaml-validation.test.ts` and `tests/review-queue/yaml-error-handling.test.ts` exercise the same validate.py code path; their existing quoted-string fixtures must continue to pass.
  - `tests/review-queue/schemas.test.ts` (if it exercises reviewer.schema.json directly) must show no behavioral change — coercion happens before jsonschema sees the value, so direct schema validation of a pre-quoted string is identical to today.
- The builder MUST run `pnpm test` (or the equivalent test command discoverable from `package.json`) before opening pending_review and paste the full pass/fail summary into `agent_notes`. Specifically call out the count of tests in `tests/review-queue/` that ran and the count that passed; partial-run output is not acceptable evidence.

### AC5 — `.claude/commands/review-queue-{codex,codex-ops,cursor}.md` re-synced byte-for-byte from canonical

- After AC1 edits to the canonical `skills/review-queue-{codex,codex-ops,cursor}.md` files, the builder MUST run `tools/sync-skills.sh` and verify with `tools/sync-skills.sh --check` that the three adapter files in `.claude/commands/` are byte-identical to their canonical counterparts.
- **If 052 (`merge-cleanup-sync-skills-check`) has merged before 053's merge, the merge-and-cleanup C5 step will catch any drift mechanically.** 053 does not depend on 052 — AC5 explicitly enforces the re-sync inside 053's own builder workflow, independent of merge-time gates. Mention 052 in the spec body for context only.
- **Shell-safe assertion (codex R1 F2):** `grep -L` exits non-zero when EVERY file matches the pattern (the desired zero-lines state), which under `set -e` looks like a failure. The check MUST be spelled as a shell-safe assertion that captures the missing-files list and tests it is empty:
  ```bash
  missing="$(grep -L "completed_at: '2026-05-XXTHH:MM:SSZ'" \
      .claude/commands/review-queue-codex.md \
      .claude/commands/review-queue-codex-ops.md \
      .claude/commands/review-queue-cursor.md || true)"
  [ -z "$missing" ] || { echo "AC5 fail: adapters missing canonical quoted-example string:" >&2; echo "$missing" >&2; exit 1; }
  ```
  Equivalently acceptable: loop with `grep -q` per file and `exit 1` on first miss. A bare `grep -L ... | <pipeline>` under `set -e` is INSUFFICIENT and MUST NOT be used — the success case (all files match) would abort the surrounding script.

## Out of Scope (Don't Drift)

- **No broader YAML normalization layer.** 053 coerces ONLY the `completed_at` field on the `reviewer` schema path. Do NOT introduce a generic "post-parse, pre-validate normalization" hook in `_lib.py` that walks every field and reshapes types. Such a layer is a known footgun (it hides bugs by making the schema effectively optional). If another field surfaces the same datetime-auto-parse failure mode, file a separate spec rather than generalizing 053's coercion.
- **No schema widening.** Do NOT change `reviewer.schema.json` to accept `oneOf: [{ type: string }, { type: string, format: date-time }]` or similar. The on-disk canonical format remains a quoted ISO 8601 string; coercion brings non-canonical emissions back to canonical before validation.
- **No emission-format change.** Reviewer prompts still emit quoted ISO 8601 Z-suffixed strings. Do NOT introduce a unix-timestamp format, a non-Z-suffixed UTC offset format, or any other alternative. The single-source-of-truth for `completed_at` shape is `reviewer.schema.json`'s pattern.
- **No retroactive fixup of past quarantined responses.** If `raw/internal/quarantine/` or its equivalent contains historical quarantined files that failed for this reason, 053 does NOT recover or re-replay them. They were absorbed by AC4's quarantine path at the time and the next reviewer tick produced a fresh response. Leave them as historical artifacts.
- **No reviewer-prompt changes beyond the AC1-listed additions.** Do not refactor the prompt structure, reorder sections, change the "One review per tick" rule, or touch anything not explicitly enumerated in AC1. The change is purely additive prose + example.
- **No `request` / `combined` schema coercion.** Other schemas have different field shapes and the coercion is narrow per AC2. Do not add `if schema_name in (...)` to widen.
- **No new test framework or test-helper extraction.** Reuse the existing harness shape; do not introduce a new test runner, a new fixture-generation utility, or refactor `tests/review-queue/_helpers.ts` beyond what AC3 requires.

## Crash semantics

- **Coercion is idempotent.** A `completed_at` value that's already a `str` flows through without modification. Re-running `validate.py` on the same file produces identical exit codes and stderr.
- **Coercion is silent on success.** No stderr emission, no log entry, no journal mark when coercion fires. Rationale: the coercion is a defensive normalization, not an error condition; reporting every successful coercion would flood reviewer logs with non-actionable noise. The dogfooding journal will surface the savings empirically (no quarantine entries from unquoted timestamps after 053 ships).
- **Coercion does not interfere with the fresh-eyes-violation path.** AC2's hook runs before the `schema_name == "reviewer"` block at line 90+ that detects task-state quotation. Both checks fire independently; a response with both an unquoted timestamp AND a fresh-eyes violation gets the fresh-eyes error (the more important one) — the timestamp is coerced silently first, then the fresh-eyes check fires and rejects.

## Risks / Open Questions

- **Risk R1 — Future YAML lib upgrade changes auto-parse behavior.** PyYAML's safe_load auto-parsing of ISO 8601 strings to `datetime.datetime` is well-established but not strictly required by the YAML spec. A future PyYAML version (or a switch to `ruamel.yaml`) could change the behavior. **Mitigation:** AC3 exercises the unquoted-string path end-to-end; if the underlying lib stops auto-parsing, the test still passes (the value reaches validation as a `str`, schema accepts, no coercion needed). The coercion is a no-op in that future world.
- **Risk R2 — Timezone-aware datetime edge case.** If PyYAML ever emits a tz-aware `datetime.datetime` for an unquoted ISO 8601 string with a non-Z UTC offset (e.g. `2026-05-12T16:56:42-07:00`), AC2's coercion converts to UTC first then strips tzinfo. The resulting string ends in `Z` and matches the schema pattern. **Mitigation:** AC3 test fixture should include at least one tz-offset case as a sub-test to confirm the conversion is correct (or, if narrowing to UTC-only is preferred, the spec should explicitly reject non-UTC inputs — but I'm choosing convert-then-strip for forgiveness, matching the rest of the prong-B defensive posture).
- **Risk R3 — Coercion masks a reviewer prompt regression.** If a future reviewer prompt edit accidentally removes the quoted-example block from AC1, coercion will silently absorb the resulting unquoted emissions and no quarantine will fire. The drift would only surface if someone reads a stored `<reviewer>.md` file and notices a non-quoted `completed_at` on disk. **Mitigation (intentional design choice — codex-ops R1 F4):** the spec accepts that on-disk shape MAY drift while in-memory validation always normalizes; this is now stated explicitly in the Architectural Invariant. Two-layer defense:
  - **Prompt-side drift:** AC5's grep gate (rewritten in r1 disposition to use shell-safe `grep -L` capture, codex R1 F2) catches it mechanically — one of the three `.claude/commands/review-queue-*.md` files lacking the canonical quoted-example string fails the assertion at AC5-runtime.
  - **On-disk shape drift in `backlog/reviews/**/r*/<reviewer>.md`:** explicitly out of 053's scope. Filed as **053-followup-B** — a separate "stored `<reviewer>.md` must round-trip as quoted YAML" lint script that runs as a CI assertion (not in the validator hot path). AC3.3 in this spec asserts the validator does NOT rewrite on-disk bytes; the lint script is the complementary check for prompt-prong regressions. ~20 LOC; not load-bearing for the wasted-compute fix.
- **Open question Q1 — Should AC2 also coerce `datetime.date` (no time component)?** No. The schema pattern requires `T\d{2}:\d{2}:\d{2}Z` which a bare `date` cannot satisfy after coercion (no time fields). If a reviewer ever emits a bare date, it should fail validation loudly so the prompt can be fixed — silent date→datetime promotion to e.g. `T00:00:00Z` would mask a real error. Coercion target is `datetime.datetime` only.
- **Open question Q2 — Is the `validate_response_yaml.py` shell-out path affected?** No special handling needed. `validate_response_yaml.py` shells out to `validate.py reviewer <path>`; the coercion happens inside the child process before jsonschema runs; the exit code propagates back through the shell-out the same as today. AC3's end-to-end test exercises this path.

## After Completion (Strategist Notes)

- **No wiki page required.** This is a friction-fix spec — the change is internal to the review-queue plumbing. Document the fix in `wiki/operating-model/` only if a future page about "review-queue plumbing invariants" lands; until then, the inline code comment in `validate.py` + the spec body + the test fixture are the documentation surface.
- **Followups to file under `backlog/_followups.md`:**
  - **053-followup-A — Generic YAML quirk handling.** If a second field (e.g. a future `started_at` or similar timestamp) ever surfaces the same datetime-auto-parse failure mode, file a follow-up to either generalize the coercion narrowly OR add a per-field coercion hook. Do NOT generalize speculatively.
  - **053-followup-B — Stored on-disk shape assertion.** If R3 ever materializes (a reviewer prompt drift sneaks through and only the validator absorbs the resulting unquoted emissions), add a separate test that asserts every `<reviewer>.md` file under `backlog/reviews/**/r*/` round-trips with `completed_at` as a quoted string at the source level. Costs ~20 LOC in test harness; not load-bearing today.
- **No `.manifest.json` change.** No new wiki page is created.
- **Cycle-shape expectation.** This is a narrow two-prong friction fix with a single test file and a coercion-block patch. R1 should surface at most 1-2 HIGH findings (likely on the coercion's tz-handling edge case or on the AC3 test surface), R2 should converge. If the cycle exceeds R3, escalate per the convergence decay-curve rule (049 lesson) — the simplification path is "drop one prong or shrink AC3" rather than expand.
