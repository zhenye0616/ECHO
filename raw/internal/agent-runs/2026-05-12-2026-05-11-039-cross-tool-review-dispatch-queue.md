---
item: 2026-05-11-039-cross-tool-review-dispatch-queue
agent: Claude Code (claude-opus-4-7[1m])
persona: 78D5AB0F-A8A3-4F01-BC2E-EB05961B2405
branch: agent/cross-tool-review-dispatch-queue
worktree: ~/Desktop/Project_echo--cross-tool-review-dispatch-queue
head_sha: cd02160a7781a2f037702959c34075cb67b0bc78
started: 2026-05-12T08:20:00Z
handed_off: 2026-05-12T08:40:00Z
---

# 039 — Cross-tool review dispatch queue (RC5 / R4-converged)

## Run 1

### What I implemented (this attempt)

All eight acceptance criteria (AC0 through AC6a; AC6b is explicitly a
post-merge follow-up). The pieces are tightly coupled — three Python
scripts (`request.py`, `combine.py`, `validate.py`) backed by a shared
`_lib.py`, three JSON Schemas, three slash-command prompts, a shared
push-with-retry shell helper, and two smoke shell scripts; tests are
vitest-driven and shell out to the Python scripts. Final state passes
`npx vitest run tests/review-queue/` (42/42), `npm test` (782 / 21
skipped, no regression), `npm run typecheck` (clean), `npm run lint`
(clean).

### Files modified

**New files:**

Tools:

- `tools/review-queue/_lib.py` (107 lines) — shared frontmatter parse + os.link atomic write + jsonschema validation + queue-errors append + iso_utc_now / head_sha helpers
- `tools/review-queue/validate.py` (54 lines) — CLI entry point; validates a frontmatter file against `{request, reviewer, combined}` schema
- `tools/review-queue/request.py` (137 lines) — `<item_id> <round>` writer; `--class` flag; `os.link` race-loser SHA check (same-SHA idempotency vs different-SHA bump-or-fix-history error per Codex R2 L5)
- `tools/review-queue/combine.py` (267 lines) — strategist watcher; normalized `primary_where_section` matching at exact sub-anchor specificity (Codex R3 M2); `cross_ref` override; verdict roll-up table; orphan-tmp cleanup (≥30 min); one-round-per-tick default; `--all` flag for batch; `--no-git` test hook; `--now` for deterministic timeout tests; `--timeout-hours` default 2
- `tools/review-queue/push-with-retry.sh` (29 lines) — shared push helper used by all three operational push types; on double-failure appends `PUSH-RACE-FALLBACK: <context> sha=<sha>` to `raw/internal/queue-errors.md` (NOT the journal, per R2 Cursor M3 carve-out)
- `tools/review-queue/test-reviewer-prompt.sh` (60 lines) — AC3 smoke; synthesizes a request, exercises the file-scan + state-check logic in the reviewer prompts, asserts next-step
- `tools/review-queue/test-watcher-prompt.sh` (55 lines) — AC3.5 smoke; both `escalated_to_founder: true/false` fixtures; asserts the watcher branches correctly

Schemas:

- `tools/review-queue/schemas/request.schema.json`
- `tools/review-queue/schemas/reviewer.schema.json` — per-reviewer verdict enum is `{proceed, proceed_after_patches, pushback}`
- `tools/review-queue/schemas/combined.schema.json` — combined enum adds `{divergent, single_reviewer_timeout, no_responses}`
- `tools/review-queue/schemas/README.md` — per-file vs combined enum doc + timezone discipline + reviewer-enum extension instructions

Slash commands (`.claude/commands/`):

- `review-queue-codex.md` — Codex-side reviewer loop tick prompt
- `review-queue-cursor.md` — Cursor-side reviewer loop tick prompt (identical structure, Cursor reviewer voice)
- `review-queue-watch.md` — strategist watcher tick body; (a)/(b)/(c) state-machine split per Codex R3 M1 (load-bearing)

Docs:

- `docs/review-queue-setup.md` — AC0; one recipe per reviewer client (Claude Code `/loop`, Codex `codex exec` + cron with `--sandbox workspace-write --ask-for-approval never`, Cursor paste-once-self-loop); Cursor recipe explicitly rejects keyboard-automation per §"Out of Scope" #1

Directory marker:

- `backlog/reviews/.gitkeep` — keep the directory present in fresh clones

Tests:

- `tests/review-queue/_helpers.ts` — shared `runPython()` (resolves `arch -arm64 python3` on Darwin Rosetta-node sessions) and `validatorPath()` / `requestScript()` / `combineScript()` resolvers
- `tests/review-queue/schemas.test.ts` (13 tests) — three valid baselines × three schemas; missing-required-field surfaces field name; per-reviewer enum scoping; class enum; requested_reviewers subset rule; combined-only enum values rejected at reviewer layer
- `tests/review-queue/request.test.ts` (7 tests) — happy path; `--class=structural-reform` reflected; item-not-found clear error; same-SHA idempotency; different-SHA error; out-of-enum reviewer rejected with clear "extend the schema first" message; written frontmatter validates against request.schema.json
- `tests/review-queue/combine.test.ts` (14 tests) — no eligible rounds → status line + no commits; non-convergent divergent table; exact-primary convergent; **R2 fixture (3-section vs single-section AC4 non-collapse)**; cross_ref override; verdicts crossing boundary → divergent + escalated; one-missing-within-timeout no-op; one-missing-past-timeout single_reviewer_timeout; both-missing-past-timeout no_responses; already-combined skip; orphan ≥30 min cleanup; **AC3.5 (a) zero-patches → next_round null + no r2/request**; **AC3.5 (b) load-bearing convergent HIGH → proceed_after_patches shape ready for verification round**; **AC3.5 (c) waiver fixture mirrors (a) at combine layer**
- `tests/review-queue/concurrency.test.ts` (7 tests) — request.py idempotency vs different-SHA error; `os.link` race-lose semantics on the bare primitive; orphan-tmp cleanup via combine.py; **push-with-retry.sh queue-errors.md fallback** (uses a tmp git repo with no remote → both pushes fail → PUSH-RACE-FALLBACK line lands in raw/internal/queue-errors.md); missing-reviewer timeout; same-SHA-checked-by-reading vs blindly-treating-FileExistsError-as-success (R2 Codex L5)
- `tests/review-queue/e2e.test.ts` (1 test) — scripted R1 → R2 cycle: fake spec in `backlog/ready/`, `request.py`, synthetic codex+cursor via atomic-link path, orphan-tmp injection (stale 31 min + fresh 1 min), `combine.py`, spec update, `r2/`, second `combine.py`, assertions on monotonic round numbering, dispatch-message-free harness, same-SHA idempotency + different-SHA error

### Acceptance criteria status

| AC | Status | Notes |
|---|---|---|
| AC0 — polling primitive parity in both reviewer clients | ✅ | `docs/review-queue-setup.md` ships one recipe per client; concrete `codex exec ... --sandbox workspace-write --ask-for-approval never` command; Cursor recipe with explicit "no keyboard-automation fallback" citing §"Out of Scope" #1. Verification step documented; **founder must run each recipe once at AC6b session bootstrap.** |
| AC1 — directory + file schema + tests | ✅ | Three schemas with per-file verdict enums (per-reviewer ⊂ combined). 13/13 tests pass including null combined responses for single_reviewer_timeout / requested_reviewers subset rule. |
| AC2 — strategist write helper | ✅ | `request.py` with `os.link` atomic write, same-SHA idempotency, different-SHA bump-or-fix-history error, `--class` flag, `--reviewers` validation. 7/7 tests. |
| AC3 — canonical reviewer-loop prompts | ✅ | Both `.claude/commands/review-queue-{codex,cursor}.md` follow the 7-step structure (pull / scan / read at SHA / review / atomic write + push-with-retry / journal AFTER commit / exit). Smoke test `test-reviewer-prompt.sh` passes. JOURNAL-AS-QUEUE PROHIBITION explicit in each prompt. |
| AC3.5 — strategist watcher slash-command | ✅ | `review-queue-watch.md` mirrors AC3 structure; explicit (a) zero patches / (b) patches → verification round (DEFAULT) / (c) verification waived branches per Codex R3 M1. Smoke test `test-watcher-prompt.sh` passes (escalated-vs-not branching). |
| AC4 — combine helper | ✅ | `combine.py` ships normalized `primary_where_section` parser (first §section up to `,`/`;`/`+`), exact-sub-anchor convergence rule, `cross_ref` canonical override. Verdict roll-up table per §AC4. **R2 fixture (Cursor R2 H1 3-section vs Codex R2 M2/M3 single-section AC4)** asserts non-convergence in combine.test.ts. AC3.5 (a)/(b)/(c) fixtures included. `[combine] no rounds to combine` exit-0 status line. Orphan tmp cleanup ≥30 min. |
| AC5 — race + timeout behavior | ✅ | concurrency.test.ts covers `os.link` race semantics directly + via request.py; orphan cleanup integration with combine.py; push-with-retry.sh queue-errors.md fallback; missing-reviewer timeout; same-SHA-checked-by-reading idempotency. 7/7 tests. |
| AC6a — synthetic end-to-end | ✅ | e2e.test.ts script with orphan-tmp injection inline (R2 Cursor M4 option a). 1/1 test. |
| AC6b — post-merge real-use validation | ⏳ | Filed as a separate post-merge item per the spec's own §"After Completion" §5.1; out of builder scope. |

### Verbatim test output

```
$ npx vitest run tests/review-queue/
 ✓ tests/review-queue/concurrency.test.ts (7 tests) 1861ms
 ✓ tests/review-queue/combine.test.ts (14 tests) 1590ms
 ✓ tests/review-queue/e2e.test.ts (1 test) 1372ms
 ✓ tests/review-queue/request.test.ts (7 tests) 1092ms
 ✓ tests/review-queue/schemas.test.ts (13 tests) 3391ms
 Test Files  5 passed (5)
      Tests  42 passed (42)

$ npm test
 Test Files  49 passed | 1 skipped (50)
      Tests  782 passed | 21 skipped (803)

$ npm run typecheck
> tsc --noEmit
[clean]

$ npm run lint
> eslint . --max-warnings 0
[clean]

$ tools/review-queue/test-reviewer-prompt.sh
[codex] next-step: perform review on backlog/ready/2026-05-12-040-example-spec.md at abc1234
[cursor] next-step: perform review on backlog/ready/2026-05-12-040-example-spec.md at abc1234
PASS: reviewer-loop polling logic surfaces the expected next-step for both reviewers

$ tools/review-queue/test-watcher-prompt.sh
[r1] next-step: escalate (verdict=divergent, round=1)
[r2] next-step: disposition + patch + next-request (verdict=proceed_after_patches, round=2)
PASS: watcher-tick logic branches correctly on escalated_to_founder
```

### Decisions made during implementation

1. **Python implementation, shelled-out from vitest.** The spec explicitly calls
   for `.py` scripts (matches `tools/blocked.py`, `tools/wiki_index.py`
   convention; Cursor R1 L5). Tests are `.test.ts` per the spec but call
   into the Python scripts via `child_process` — the test harness is the
   project's existing vitest infra.

2. **`tests/review-queue/_helpers.ts` resolves a working Python invocation.**
   The founder's machine has node x86_64 (Rosetta) but Python wheels are
   arm64 — direct `python3` from node fails to load `rpds` (a jsonschema
   transitive dep). The helper detects the case and falls back to
   `arch -arm64 python3`. This is environment-specific to the founder's
   machine; documented in the helper.

3. **Schema validation in Python, not Node.** No `ajv` dependency added —
   `jsonschema` is already available system-wide (Python). Per the
   drift-prevention rule "no new dependencies without escalation," ajv
   would have required an escalation; the Python-side approach avoids it.

4. **`combine.py` leaves `next_round: null` after writing combined.md.**
   The watcher (`review-queue-watch.md`) is responsible for filling
   `next_round: <N+1>` after dispositioning + patching + running the next
   request.py per AC3.5 step 3 (b). combine.py's job ends at "produce the
   combined.md with the convergent/divergent tables and verdict roll-up";
   the (a)/(b)/(c) split is post-combine state. The combine tests assert
   the input shape the watcher dispatches on, not the post-watcher state.

5. **`normalize_where()` regex `§[^,;+]+`.** The §-section-token shape per
   Codex R3 M2 stops at the next `,`, `;`, or `+` separator. This was
   verified against the R2 fixture: Cursor R2 H1's three-section
   `§Implementation Notes "Strategist watcher" + §AC3 + §AC4` parses into
   primary `§Implementation Notes "Strategist watcher"` + related
   `[§AC3, §AC4]`, which does NOT match Codex R2 M2's single-section
   `§AC4 combine.py polling semantics`. Test passes.

6. **Frontmatter `requested_at` style.** request.py emits the ISO-8601
   timestamp as a YAML quoted string (`'2026-05-12T08:29:41Z'`). The
   `serialize_frontmatter` helper uses `yaml.safe_dump`; PyYAML quotes
   timestamp-shaped strings to disambiguate from native YAML timestamp
   parsing. Schemas accept both quoted and unquoted (the regex matches
   the inner content); validate.py reads via yaml.safe_load which strips
   quotes.

7. **AC0 verification is documented but not asserted by tests.** The
   recipes are config + bootstrap — not unit-testable without running
   actual `cron`/`launchd` or actual Cursor IDE. The spec calls out
   "verified by the founder running it once before AC6b starts"; that's
   founder-side work that lives in AC6b, not here.

### Out-of-scope avoided / drift not taken

- I considered adding an `ajv` dep so schema validation could happen on
  the Node side and skip the Python shell-out. Rejected: spec doesn't
  name `ajv`; drift-prevention rule #3 says "no new dependencies without
  escalation." The Python path works.
- I considered writing `combine.py` to also commit/push automatically
  even with `--no-git` test mode. Rejected: the test hook is "skip git,"
  not "fake-commit"; the watcher slash-command owns the commit dance.
- I considered making `request.py` resolve `artifact_path` to absolute
  rather than repo-relative. Rejected: spec says `artifact_path` is the
  repo-relative path used in `git show <sha>:<path>` — absolute paths
  would not work in `git show`.

### Open questions for founder

None blocking merge. Two AC6b-shaped notes (filed as separate items per
the spec's own §After Completion §5):

1. AC6b post-merge real-use validation on the next qualifying spec.
2. `M1-1` sub-gap A retroactive — ECHO substring-index freshness; this
   isn't a 039 concern but the spec mentions it as a 034 follow-up.

### Drift events caught

None during this run. Implementation hewed to the acceptance criteria;
no "while I'm in here" additions. The spec's §"Out of Scope" list is
unusually well-developed (8 items, each load-bearing), and I read it
before writing any code.

### Sources field (per CLAUDE.md dogfooding journal discipline)

This run did not invoke any `mcp__echo__*` tools — the spec file itself
(claimed at `backlog/claimed/2026-05-11-039-...md`) was the canonical
artifact, consistent with the "0-ECHO-call reviewer property" §Context
bullet 2 in the spec. Tests touched local fs only; no MCP queries.
