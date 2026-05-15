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

## Acceptance Criteria

### AC1 — Reviewer prompts include a literal quoted `completed_at` example + prose requirement

- **Modified files (canonical):** `skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md`, `skills/review-queue-cursor.md`. After each canonical edit, run `tools/sync-skills.sh` so the `.claude/commands/review-queue-{codex,codex-ops,cursor}.md` adapters are re-synced byte-for-byte (verify with `tools/sync-skills.sh --check`).
- **Each reviewer prompt body MUST contain BOTH:**
  1. A literal example block showing the canonical frontmatter shape with `completed_at: '2026-05-XXTHH:MM:SSZ'` (single-quoted). Use placeholders `XX` / `HH:MM:SS` so reviewers do not blindly copy the example date. The example block should be a complete `---`-delimited frontmatter fence (item_id, round, reviewer, artifact_sha, completed_at, verdict, findings) so the quoted-timestamp shape is visible in context, not floating in isolation.
  2. A one-sentence prose requirement immediately following or preceding the example block: "The `completed_at` value MUST be single-quoted (`'2026-05-XXTHH:MM:SSZ'`); unquoted ISO 8601 timestamps are auto-parsed by PyYAML as `datetime.datetime` and rejected by the schema."
- **Each reviewer prompt's existing instructions for writing `<reviewer>.md` are unchanged in all other respects.** AC1 is purely additive prose + a frontmatter example block; no instruction is removed or reordered.

### AC2 — `validate.py` coerces `datetime.datetime` → ISO 8601 Z-suffixed string before jsonschema validation

- **Modified file:** `tools/review-queue/validate.py`.
- **Coercion hook lives between `_lib.parse_frontmatter(path)` (which returns `fm, body`) and `_lib.validate_frontmatter(fm, schema_name)` (which runs jsonschema).** Lines ~74-80 in today's file. Insert a small coercion block: if `schema_name == "reviewer"` AND `isinstance(fm.get("completed_at"), datetime.datetime)`, replace `fm["completed_at"]` with the value's ISO 8601 Z-suffixed string form: `value.strftime("%Y-%m-%dT%H:%M:%SZ")`. The coerced value MUST be timezone-stripped to match the schema pattern (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$`); if the parsed datetime has a non-UTC tzinfo, convert to UTC first via `value.astimezone(datetime.timezone.utc).replace(tzinfo=None)` and THEN format. Use the canonical `datetime` import; do not import `pytz` or other dependencies.
- **Schema-name gate is load-bearing.** Coercion runs only for `schema_name == "reviewer"`. The `request` and `combined` schemas do not have a `completed_at` field at the same shape; touching them risks unintended downstream behavior. 053 narrows the coercion to the reviewer schema only — extending to other schemas is out of scope and not on the followup list (no observed need).
- **Error path is unchanged.** If `fm["completed_at"]` is some other non-string type (e.g. an integer, a list — pathological cases), 053 does NOT coerce; the value flows through to jsonschema and is rejected with today's `is not of type 'string'` error. The coercion targets the specific YAML-auto-parses-as-datetime quirk only.
- **No public API change.** `validate.py`'s CLI contract, exit codes, and stderr message shape are unchanged. The coercion is internal and silent (no print on success). The 041 AC4 quarantine path is NOT triggered by a successful coercion — coercion happens before jsonschema sees the value, so a previously-failing-now-passing emission yields a passing validate.py run.

### AC3 — End-to-end test: unquoted-YAML `completed_at` passes validate → commit-reviewer-response → combine

- **New test file:** `tests/review-queue/053-completed-at-coercion.test.ts`. Use the existing test harness (the same TypeScript runner that exercises `tests/review-queue/045-pre-link-yaml-validation.test.ts` and `tests/review-queue/yaml-error-handling.test.ts` today — verify by reading `package.json`'s test script and at least one existing review-queue test fixture before writing).
- **Test fixture body (paraphrased):** construct a synthetic `<reviewer>.md` whose frontmatter contains `completed_at: 2026-05-12T23:56:42Z` (UNQUOTED), with all other required fields valid. Pipe it through the actual reviewer-side pipeline: `validate_response_yaml.py <path>` (which shells out to `validate.py reviewer <path>`) → `commit-reviewer-response.sh` (dry-run or test-mode equivalent — do NOT actually commit to origin/main from a test) → `combine.py` (single-reviewer mode, simulating a round where only this reviewer responded). Assert: every stage exits 0; no quarantine is triggered; the response file lands at the expected path; `combine.py`'s output is well-formed.
- **The test MUST use the real `validate.py` and `validate_response_yaml.py` code paths**, not a mock. The whole point of AC3 is end-to-end coverage that catches a future regression where someone removes the coercion or wraps it in a code path that doesn't fire.

### AC4 — Existing tests for quoted `completed_at` still pass

- The existing review-queue test suite (`tests/review-queue/*.test.ts`) MUST remain green after AC1-AC3 land. In particular:
  - `tests/review-queue/045-pre-link-yaml-validation.test.ts` and `tests/review-queue/yaml-error-handling.test.ts` exercise the same validate.py code path; their existing quoted-string fixtures must continue to pass.
  - `tests/review-queue/schemas.test.ts` (if it exercises reviewer.schema.json directly) must show no behavioral change — coercion happens before jsonschema sees the value, so direct schema validation of a pre-quoted string is identical to today.
- The builder MUST run `pnpm test` (or the equivalent test command discoverable from `package.json`) before opening pending_review and paste the full pass/fail summary into `agent_notes`. Specifically call out the count of tests in `tests/review-queue/` that ran and the count that passed; partial-run output is not acceptable evidence.

### AC5 — `.claude/commands/review-queue-{codex,codex-ops,cursor}.md` re-synced byte-for-byte from canonical

- After AC1 edits to the canonical `skills/review-queue-{codex,codex-ops,cursor}.md` files, the builder MUST run `tools/sync-skills.sh` and verify with `tools/sync-skills.sh --check` that the three adapter files in `.claude/commands/` are byte-identical to their canonical counterparts.
- **If 052 (`merge-cleanup-sync-skills-check`) has merged before 053's merge, the merge-and-cleanup C5 step will catch any drift mechanically.** 053 does not depend on 052 — AC5 explicitly enforces the re-sync inside 053's own builder workflow, independent of merge-time gates. Mention 052 in the spec body for context only.
- `grep -L "completed_at: '2026-05-XXTHH:MM:SSZ'" .claude/commands/review-queue-codex.md .claude/commands/review-queue-codex-ops.md .claude/commands/review-queue-cursor.md` MUST return zero lines (i.e. all three files contain the quoted-example string). This is the mechanical check that AC1 + AC5 round-tripped successfully.

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
- **Risk R3 — Coercion masks a reviewer prompt regression.** If a future reviewer prompt edit accidentally removes the quoted-example block from AC1, coercion will silently absorb the resulting unquoted emissions and no quarantine will fire. The drift would only surface if someone reads a stored `<reviewer>.md` file and notices a non-quoted `completed_at` on disk. **Mitigation:** AC5's grep gate catches the prompt-side drift mechanically (one of the three .claude/commands files would lack the canonical example string, failing the assertion). For the on-disk shape, file as a 053-followup if it ever surfaces — a separate "stored `<reviewer>.md` must round-trip as quoted YAML" assertion is a cheap addition but not load-bearing for the wasted-compute fix 053 is targeting.
- **Open question Q1 — Should AC2 also coerce `datetime.date` (no time component)?** No. The schema pattern requires `T\d{2}:\d{2}:\d{2}Z` which a bare `date` cannot satisfy after coercion (no time fields). If a reviewer ever emits a bare date, it should fail validation loudly so the prompt can be fixed — silent date→datetime promotion to e.g. `T00:00:00Z` would mask a real error. Coercion target is `datetime.datetime` only.
- **Open question Q2 — Is the `validate_response_yaml.py` shell-out path affected?** No special handling needed. `validate_response_yaml.py` shells out to `validate.py reviewer <path>`; the coercion happens inside the child process before jsonschema runs; the exit code propagates back through the shell-out the same as today. AC3's end-to-end test exercises this path.

## After Completion (Strategist Notes)

- **No wiki page required.** This is a friction-fix spec — the change is internal to the review-queue plumbing. Document the fix in `wiki/operating-model/` only if a future page about "review-queue plumbing invariants" lands; until then, the inline code comment in `validate.py` + the spec body + the test fixture are the documentation surface.
- **Followups to file under `backlog/_followups.md`:**
  - **053-followup-A — Generic YAML quirk handling.** If a second field (e.g. a future `started_at` or similar timestamp) ever surfaces the same datetime-auto-parse failure mode, file a follow-up to either generalize the coercion narrowly OR add a per-field coercion hook. Do NOT generalize speculatively.
  - **053-followup-B — Stored on-disk shape assertion.** If R3 ever materializes (a reviewer prompt drift sneaks through and only the validator absorbs the resulting unquoted emissions), add a separate test that asserts every `<reviewer>.md` file under `backlog/reviews/**/r*/` round-trips with `completed_at` as a quoted string at the source level. Costs ~20 LOC in test harness; not load-bearing today.
- **No `.manifest.json` change.** No new wiki page is created.
- **Cycle-shape expectation.** This is a narrow two-prong friction fix with a single test file and a coercion-block patch. R1 should surface at most 1-2 HIGH findings (likely on the coercion's tz-handling edge case or on the AC3 test surface), R2 should converge. If the cycle exceeds R3, escalate per the convergence decay-curve rule (049 lesson) — the simplification path is "drop one prong or shrink AC3" rather than expand.
