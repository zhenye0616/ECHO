# `tests/review-queue/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 26 files.

### `tests/review-queue/_helpers.ts` — shared test fixture helpers for review-queue tests

**Purpose:** Provides shared cross-platform helpers used by the review-queue test suite: resolving a working `python3` invocation (with an arm64 Rosetta fallback), running python scripts and capturing exit code/stdout/stderr, and resolving canonical paths to the `tools/review-queue/*` scripts under test.

**Depends on:** node:child_process, node:path

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REPO` | const | `tests/review-queue/_helpers.ts:4` | `process.cwd()`, assumed to be the repo root when tests run. |
| `tryPython(cmd, args)` | function | `tests/review-queue/_helpers.ts:8` | Spawns `<cmd> <args> -c "import jsonschema, yaml"` synchronously and returns whether it exits 0, used to probe for a usable python interpreter. |
| `pythonInvocation()` | function | `tests/review-queue/_helpers.ts:22` | Resolves and caches a `{cmd, args}` python invocation, trying plain `python3` first then `arch -arm64 python3` on darwin (Rosetta workaround), throwing if neither has `jsonschema`+`yaml`. |
| `runPython(scriptArgs)` | function | `tests/review-queue/_helpers.ts:34` | Runs the resolved python invocation with the given script args via `execFileSync`, returning `{code, stdout, stderr}` and normalizing thrown errors into a non-zero-code result object. |
| `validatorPath()` | function | `tests/review-queue/_helpers.ts:52` | Returns the absolute path to `tools/review-queue/validate.py`. |
| `requestScript()` | function | `tests/review-queue/_helpers.ts:56` | Returns the absolute path to `tools/review-queue/request.py`. |
| `combineScript()` | function | `tests/review-queue/_helpers.ts:60` | Returns the absolute path to `tools/review-queue/combine.py`. |
| `dispatchScript()` | function | `tests/review-queue/_helpers.ts:64` | Returns the absolute path to `tools/review-queue/dispatch-next-round.py`. |

### `tests/review-queue/044-autostash-dirty-tree.test.ts` — 044 AC1 autostash-on-dirty-tree falsification test

**Purpose:** Exercises the full strategist-watcher transaction (Step-1 pull → `combine.py` → its internal subprocess pull → `push-with-retry.sh`'s inner pull → push) against a dirty working tree (an uncommitted journal file), verifying that `rebase.autoStash=true` at all three git-pull sites lets the whole transaction succeed without the pre-044 "would be overwritten by merge" failure, that the dirty file survives untouched, and that no `PUSH-RACE-FALLBACK` rows appear in `queue-errors.md`.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID` | const | `tests/review-queue/044-autostash-dirty-tree.test.ts:29` | Fixture item id used across the round artifacts. |
| `SHA` | const | `tests/review-queue/044-autostash-dirty-tree.test.ts:30` | Fixture spec commit SHA embedded in request/reviewer frontmatter. |
| `git(cwd, ...args)` | function | `tests/review-queue/044-autostash-dirty-tree.test.ts:32` | Runs a git command synchronously in the given cwd and returns stdout. |
| `setupOriginAndClone()` | function | `tests/review-queue/044-autostash-dirty-tree.test.ts:36` | Bootstraps a bare origin, a working clone with copied `tools/review-queue` + `tools/blocked.py`, seeds a committed r1 round (request/codex/cursor responses), and creates a second "advance" clone that pushes unrelated commits to force real rebase work. |
| `describe: "044 AC1 — autostash on every watcher-transaction git pull"` | describe block | `tests/review-queue/044-autostash-dirty-tree.test.ts:142` | Single end-to-end test: dirties the journal file, runs `git pull --rebase` with autostash, re-advances origin, re-dirties the journal, runs `combine.py --all`, and asserts combined.md is written+pushed, the dirty file is preserved with its latest content, and no PUSH-RACE-FALLBACK rows were appended. |

### `tests/review-queue/045-pre-link-yaml-validation.test.ts` — 045 AC1 pre-link YAML validation gate tests

**Purpose:** Validates the shared pre-link YAML gate helper `tools/review-queue/validate_response_yaml.py`, covering valid response YAML (exit 0), malformed YAML with an embedded `""` literal (non-zero exit, line/column diagnostic), schema violations (verdict not in enum), that the helper never mutates `queue-errors.md` on failure (clean-tree invariant), and that all three reviewer slash-command prompts reference the helper in their Step-5 prose.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `HELPER_REL` | const | `tests/review-queue/045-pre-link-yaml-validation.test.ts:30` | Repo-relative path to `validate_response_yaml.py` under test. |
| `REVIEWER_PROMPTS` | const | `tests/review-queue/045-pre-link-yaml-validation.test.ts:31` | List of the three reviewer slash-command markdown files checked for helper invocation prose. |
| `runHelper(path)` | function | `tests/review-queue/045-pre-link-yaml-validation.test.ts:37` | Spawns the helper script against a given reviewer-response path and normalizes `{status, stdout, stderr}`. |
| `describe: "045 AC1 — pre-link reviewer-response YAML validation gate"` | describe block | `tests/review-queue/045-pre-link-yaml-validation.test.ts:49` | AC1a valid YAML exits 0; AC1b malformed embedded-quote YAML exits non-zero with line-numbered diagnostic; AC1c verdict-enum schema violation names the offending field; AC1d isolated-repo test proves the helper never mutates a staged `queue-errors.md` baseline (byte-identical staged blob before/after); AC1-prompt-grep confirms all three reviewer prompts mention `validate_response_yaml.py`. |

### `tests/review-queue/045-smoke-gate-fail-closed.test.ts` — 045 AC2 launchd installer fail-closed smoke-gate tests

**Purpose:** Falsifies the fail-closed smoke gate and stale-plist `--check` detection in `tools/review-queue/_install_reviewer_launchd.sh`, using a fully isolated `$HOME`, `launchctl`/`sw_vers`/`id` PATH stubs that log invocations, a copied `tools/review-queue` tree, and a synthetic `mock-reviewer` entry in a temp `reviewers.json`.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REVIEWER` | const | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:45` | Synthetic reviewer slug `mock-reviewer` used across the fixtures. |
| `LABEL` | const | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:46` | launchd job label `com.echo.review-queue-mock-reviewer`. |
| `Fixture` | interface | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:48` | Shape of a constructed fixture: `home`, `pathStubDir`, `toolDir`, `installer`, `launchctlLog`, `reviewersJson`. |
| `makeStub(dir, name, body)` | function | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:57` | Writes an executable (mode 0o755) shell-stub file with given body into a stub directory. |
| `setup(opts)` | function | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:63` | Builds an isolated `HOME`, stubs `launchctl`/`sw_vers`/`id`, copies `tools/review-queue` into the temp home, conditionally writes/removes the `smoke-test-mock-reviewer-runner.sh`, authors the `run-mock-reviewer-reviewer.sh` wrapper, and writes a synthetic `reviewers.json` with a headless `mock-reviewer` entry requiring `invoke_command`. |
| `runInstaller(fx, args)` | function | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:150` | Spawns `_install_reviewer_launchd.sh` with the isolated `HOME`/`PATH`/`ECHO_REVIEWERS_CONFIG` env and returns `{status, stdout, stderr}`. |
| `readLaunchctlInvocations(log)` | function | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:176` | Reads the launchctl stub log file and returns non-empty lines, or `[]` if absent. |
| `describe: "045 AC2 — _install_reviewer_launchd.sh smoke gate fail-closed"` | describe block | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:181` | AC2a: `--smoke` with missing smoke runner → exit 1, no plist, zero launchctl calls; AC2b: install without `--smoke` → exit 0, plist installed, bootout+bootstrap but no kickstart; plist StandardOut/ErrorPath route to the per-reviewer log file (never `/dev/null`) and the log dir is pre-created; AC2c: `--smoke` with present runner → exit 0, bootout+bootstrap+kickstart, mock smoke output surfaced. |
| `describe: "101-retro — _install_reviewer_launchd.sh --check stale-plist detection"` | describe block | `tests/review-queue/045-smoke-gate-fail-closed.test.ts:283` | `--check` with no installed plist → exit 3 "not installed", zero launchctl calls; `--check` after fresh install → exit 0 match, no new launchctl calls; `--check` against a drifted plist (log paths reverted to `/dev/null`) → exit 1 with a loud "stale" diagnostic instructing reinstall, no launchctl calls. |

### `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts` — 046 AC3 task_state_ref schema + reviewer fresh-eyes enforcement tests

**Purpose:** Verifies the `request.schema.json` extension accepting an optional `task_state_ref` field (with shape validation) and the reviewer-response fresh-eyes enforcement rule that rejects reviewer bodies which quote three or more of the six task-state required-block headings, or set `consumed_task_state: true`, while allowing legitimate critique mentions and `consumed_task_state: false`/omitted.

**Depends on:** node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID` | const | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:9` | Fixture item id for 046 test frontmatter. |
| `SHA` | const | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:10` | Fixture spec commit SHA. |
| `buildFile(frontmatter, body)` | function | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:12` | Serializes a frontmatter object (arrays, strings, booleans, other) plus a body string into a `---`-delimited markdown fixture. |
| `validate(schema, path)` | function | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:34` | Runs `validate.py <schema> <path>` via `runPython` and returns `{code, stderr}`. |
| `validRequest(overrides)` | function | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:42` | Builds a baseline valid `request.md` frontmatter object (item_id, round, spec_commit_sha, artifact_path, class, requested_at, requested_reviewers, correlation_id) with override support. |
| `validReviewer(overrides)` | function | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:57` | Builds a baseline valid reviewer-response frontmatter object with override support. |
| `describe: "046 — request.md task_state_ref extension"` | describe block | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:70` | Request without `task_state_ref` still validates (back-compat); request with a matching `task_state_ref` validates; malformed `task_state_ref` value is rejected with a message naming the field. |
| `describe: "046 — reviewer fresh-eyes enforcement"` | describe block | `tests/review-queue/046-task-state-ref-and-fresh-eyes.test.ts:102` | Negative cases (critique-quoting a marker, quoting one required-block heading, two markers below threshold) all validate; positive cases (three required-block headings quoted, or `consumed_task_state: true`) are rejected with `REVIEWER_FRESH_EYES_VIOLATION` in stderr; `consumed_task_state: false` or omitted still validates. |

### `tests/review-queue/053-completed-at-coercion.test.ts` — 053 AC3/AC4 completed_at timezone-coercion tests

**Purpose:** Verifies `_coerce_completed_at` in `tools/review-queue/validate.py` normalizes tz-aware and naive `completed_at` datetimes to a canonical UTC `Z`-suffixed string, and runs a hermetic end-to-end pipeline (`validate_response_yaml.py` → `commit-reviewer-response.sh` → `combine.py`) in an isolated local-origin git repo proving an unquoted YAML timestamp passes without quarantine and the on-disk reviewer file's bytes are unchanged (coercion is in-memory only); also guards that quoted-string `completed_at` is unaffected by the coercion.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PROD_REPO` | const | `tests/review-queue/053-completed-at-coercion.test.ts:45` | Absolute path to the founder's real `~/Desktop/Project_echo` checkout, snapshotted for safety. |
| `FIXTURE_ITEM_ID` | const | `tests/review-queue/053-completed-at-coercion.test.ts:46` | Item id for the 053 hermetic pipeline fixture. |
| `ProdSnapshot` | interface | `tests/review-queue/053-completed-at-coercion.test.ts:48` | Shape `{head, status, remoteMain}` capturing the production repo's HEAD SHA, porcelain status, and origin/main SHA. |
| `captureProdSnapshot(label)` | function | `tests/review-queue/053-completed-at-coercion.test.ts:54` | Reads HEAD, working-tree status, and `ls-remote origin refs/heads/main` from `PROD_REPO`, throwing (refusing to run) if any git call fails or the remote SHA isn't a valid 40-hex string — a safety guard against accidentally exercising the real production repo/remote. |
| `pyArgs(...rest)` | function | `tests/review-queue/053-completed-at-coercion.test.ts:91` | Builds a `{cmd, args}` invocation by prepending the resolved python invocation args to extra args. |
| `describe: "053 AC3.1 — _coerce_completed_at helper direct unit-test"` | describe block | `tests/review-queue/053-completed-at-coercion.test.ts:100` | Direct unit tests (via inline python `-c` scripts importing `_coerce_completed_at`) for UTC, -07:00 (PDT), +09:00 (JST, day-boundary crossing), and naive (assumed-UTC) datetimes all normalizing to the expected `Z`-suffixed string. |
| `describe: "053 AC3.2 — hermetic end-to-end pipeline with unquoted completed_at"` | describe block | `tests/review-queue/053-completed-at-coercion.test.ts:151` | Builds an isolated bare-origin + checkout with copied review-queue tooling and a local-origin push stub; single test seeds a fixture round with an unquoted `completed_at`, runs `validate_response_yaml.py` → `commit-reviewer-response.sh` → `combine.py --no-git`, asserts no quarantine sibling, no `VALIDATION-FAIL` row, a well-formed `combined.md` (not `malformed_reviewer_response`), and that the reviewer file's bytes on disk are byte-identical before/after (AC3.3); `afterEach` re-snapshots the production repo on every exit path to guarantee it was never touched. |
| `describe: "053 AC4 — quoted-string completed_at unaffected by AC2 coercion"` | describe block | `tests/review-queue/053-completed-at-coercion.test.ts:404` | Confirms a quoted ISO-8601 `completed_at` still passes `validate_response_yaml.py` unchanged (regression guard against the coercion short-circuiting the happy path). |

### `tests/review-queue/056-claude-reviewer-onboarding.test.ts` — 056 Claude-reviewer onboarding falsification tests

**Purpose:** Falsifies the 056 acceptance criteria for onboarding Claude Code as a fourth headless reviewer slug: `_reviewers.py` loader accepting all four slugs with mode-conditional `invoke_command`; `combined.schema.json`/`reviewer.schema.json`/`request.schema.json` accepting the `claude` reviewer surface; shell-safe argv substitution (`shlex.quote`) including under paths with spaces; `queue_error.sh` pre-spawn vs per-round row shapes; the `smoke-test-claude-runner.sh` fail-open/fail-closed `--install-context` gate; the launchd installer's executable preflight; and an end-to-end wrapper run against a `mock-claude.sh` stub for both a successful `produce_response` and a `sha_drift` failure path.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts, tests/review-queue/fixtures/mock-claude.sh

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID` | const | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:36` | Fixture item id for the 056 smoke repo. |
| `FAKE_SHA` | const | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:37` | An all-zero 40-char SHA used to force a `spec_sha_unreachable` failure. |
| `setupSmokeFixture()` | function | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:39` | Bootstraps a bare origin + working repo with copied `tools/review-queue`, the `review-queue-claude.md` slash-command prompt, a synthetic ready item, then commits and pushes; returns `{base, bare, repo, tmp}`. |
| `teardown(fx)` | function | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:86` | Recursively removes the fixture's base temp directory. |
| `writeRequestAtSha(repo, round, sha)` | function | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:90` | Writes and commits+pushes a `request.md` for a given round/sha requesting only the `claude` reviewer. |
| `describe: "056 AC1b/AC5 part 1 — _reviewers.py loader"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:121` | Loader returns exactly `[codex, cursor, codex-ops, claude]`; headless reviewers (codex/codex-ops/claude) have non-empty `invoke_command` containing `{{PROMPT}}` while `cursor` (IDE mode) has `None`; `_reviewer_gate.py --print invoke_command` exits non-zero for cursor with a documented IDE-mode diagnostic and exits 0 with a resolved template for the three headless slugs; codex/codex-ops resolved templates match the exact expected read-only sandbox argv string; paths with spaces are `shlex.quote`-escaped correctly for claude (AC5 part 3). |
| `describe: "056 AC2 — combined.schema.json 4-reviewer surface"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:242` | `combined.schema.json` validates a combined.md referencing codex/cursor/codex-ops/claude responses; `reviewer.schema.json` accepts `reviewer: "claude"`; `request.schema.json` accepts `requested_reviewers` including `"claude"`. |
| `describe: "056 AC5 part 4 — queue_error.sh row shapes"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:331` | Pre-spawn invocation (no artifact/sha args) produces a `QUEUE-ERROR` row without a `spec=` field; per-round invocation (with artifact_path + sha args) produces a row with `spec=<artifact_path>@<sha>`; both read back from `origin/main:raw/internal/queue-errors.md` via a helper `readUpstreamQueueErrors`. |
| `describe: "056 AC7 — smoke-test-claude-runner.sh install-context gate"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:392` | Without `--install-context` and no `claude` on a stripped PATH, the runner fails open (exit 0, `[skip]` line); with `--install-context` and no `claude` on PATH, the runner fails closed (non-zero exit) — both tests tolerate an inconclusive PATH-leak case. |
| `describe: "056 AC7b/AC8 — _install_reviewer_launchd.sh"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:430` | Installer preflights the resolved `invoke_command` executable and fails closed with a "not found on PATH" diagnostic (referencing `com.echo.review-queue-claude`) when `claude` is absent from a stripped PATH. |
| `E2E_TIMEOUT_MS` | const | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:457` | 60-second per-test timeout bound for the end-to-end wrapper tests, so a runaway real-`claude` invocation fails fast. |
| `describe: "056 AC9 — wrapper end-to-end with mock-claude"` | describe block | `tests/review-queue/056-claude-reviewer-onboarding.test.ts:459` | Rewrites the smoke repo's `reviewers.json` to route `claude`'s `invoke_command` at an absolute `mock-claude.sh` path (avoiding real-CLI PATH shadowing); one test drives `run-claude-reviewer.sh` in `produce_response` mode and asserts `claude.md` lands on `origin/main` with the mock-recorded stdin containing `MY_REVIEWER=claude`; another drives `sha_drift` mode and asserts the wrapper exits non-zero with a `spec_sha_unreachable` `QUEUE-ERROR` row on `origin/main`; both include a defensive precondition probe confirming `invoke_command` resolves to the mock before invoking the wrapper. |

### `tests/review-queue/combine-malformed-response.test.ts` — combine.py malformed-reviewer-response escalation tests (AC2/AC4)

**Purpose:** Exercises `tools/review-queue/combine.py`'s handling of malformed reviewer-response YAML (the canonical "`finding:` value starts with `""`" failure shape), verifying it degrades gracefully to a `malformed_reviewer_response` combined verdict with founder escalation, records `offending_response`/`parse_error` (scalar for one offender, index-aligned arrays for two), appends matching `MALFORMED-REVIEWER-RESPONSE` rows to `queue-errors.md` in the same commit, and leaves the git working tree clean.

**Depends on:** node:child_process, node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID` | const | `tests/review-queue/combine-malformed-response.test.ts:15` | Fixture item id for the malformed-response scenarios. |
| `SHA` | const | `tests/review-queue/combine-malformed-response.test.ts:16` | Fixture spec commit SHA. |
| `setupGitRepo()` | function | `tests/review-queue/combine-malformed-response.test.ts:18` | Creates a bare origin + working repo (with a fallback for git versions lacking `-b main` at init), copies `combine.py`/`_lib.py`/`push-with-retry.sh`/schemas in, commits a baseline README, and pushes. |
| `writeRequest(root, round)` | function | `tests/review-queue/combine-malformed-response.test.ts:56` | Writes a `request.md` for a round requesting codex+cursor reviewers. |
| `writeValidReviewer(roundDir, reviewer, round)` | function | `tests/review-queue/combine-malformed-response.test.ts:81` | Writes a well-formed `proceed` reviewer response with empty findings. |
| `writeMalformedCursor(roundDir, round)` | function | `tests/review-queue/combine-malformed-response.test.ts:105` | Writes a cursor response whose `finding:` value begins with an embedded `""` literal, reproducing the canonical 040 R1 YAML-parser failure. |
| `writeMalformedCodex(roundDir, round)` | function | `tests/review-queue/combine-malformed-response.test.ts:129` | Same malformed-YAML shape as `writeMalformedCursor` but for the codex reviewer, used in the both-malformed test. |
| `readCombinedFrontmatter(roundDir)` | function | `tests/review-queue/combine-malformed-response.test.ts:152` | Runs an inline python snippet to split `combined.md`'s frontmatter block and YAML-parse+JSON-serialize it, then parses the JSON in TS. |
| `gitStatusShort(root)` | function | `tests/review-queue/combine-malformed-response.test.ts:167` | Returns `git status --short` output for the repo root. |
| `runCombine(root)` | function | `tests/review-queue/combine-malformed-response.test.ts:171` | Runs `combine.py --repo-root=<root> --all` via `runPython`. |
| `describe: "combine.py — malformed-reviewer-response escalation (AC2/AC4)"` | describe block | `tests/review-queue/combine-malformed-response.test.ts:175` | AC2a: single malformed cursor.md → `combined_verdict: malformed_reviewer_response`, `escalated_to_founder: true`, scalar `offending_response`/`parse_error`, a matching `queue-errors.md` row committed in the same commit, and a clean git tree; AC2b: both codex.md and cursor.md malformed → length-2 array `offending_response`/`parse_error` in stable (codex-first) order, two `MALFORMED-REVIEWER-RESPONSE` rows, clean tree — proving combine.py parses/records both files rather than short-circuiting. |

### `tests/review-queue/combine.test.ts` — combine.py core state-machine and formatting tests

**Purpose:** The main unit-test suite for `tools/review-queue/combine.py`, covering round-eligibility scanning (custom `--reviews-root`, `.echo/project.json` defaults), convergent/divergent finding grouping (exact-`where` match, cross_ref override, and non-matching multi-section `where` strings), verdict-combination outcomes (`proceed`, `proceed_after_patches`, `divergent`+escalation, `partial_responses`/`no_responses` timeout handling), per-reviewer timeout gating from `reviewers.json` (including `--timeout-hours` override), idempotency (existing `combined.md` is never overwritten), orphaned `.tmp.*` file cleanup by age, and the 044 AC3.5/AC4 auto-disposition state-machine shapes for single-missing-reviewer rounds.

**Depends on:** node:fs, node:os, node:path, vitest, tests/review-queue/_helpers.ts

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID` | const | `tests/review-queue/combine.test.ts:16` | Fixture item id used across most tests in this file. |
| `SHA` | const | `tests/review-queue/combine.test.ts:17` | Fixture spec commit SHA. |
| `setupRepo()` | function | `tests/review-queue/combine.test.ts:19` | Creates and returns a fresh empty temp directory (no git init — `--no-git` mode is used throughout this file). |
| `Finding` | interface | `tests/review-queue/combine.test.ts:23` | Shape of a reviewer finding fixture: `severity`, `where`, `finding`, optional `cross_ref: {round, reviewer, finding_index}`. |
| `writeRequest(root, round, requestedAt, reviewsRoot)` | function | `tests/review-queue/combine.test.ts:30` | Writes a `request.md` for a round under a configurable reviews-root path, with configurable `requested_at` timestamp, requesting codex+cursor. |
| `writeReviewer(roundDir, reviewer, round, verdict, findings)` | function | `tests/review-queue/combine.test.ts:60` | Writes a reviewer-response fixture with given verdict and findings list (including optional `cross_ref` blocks), serialized as YAML frontmatter + body. |
| `runCombine(root, extra)` | function | `tests/review-queue/combine.test.ts:96` | Runs `combine.py --repo-root=<root> --no-git --all` plus extra CLI args, returning `{code, stdout, stderr}`. |
| `readCombined(roundDir)` | function | `tests/review-queue/combine.test.ts:103` | Parses `combined.md`'s frontmatter with a crude line-based key:value scanner (coercing `null`/`true`/`false`/numbers/quoted strings) and returns `{fm, body}`. |
| `describe: "combine.py"` | describe block | `tests/review-queue/combine.test.ts:123` | The full core-behavior suite: no-eligible-rounds no-op; custom `--reviews-root` and `.echo/project.json`-derived reviews_root scanning; divergent-vs-convergent finding grouping (no match, exact match, non-matching multi-section `where`, `cross_ref` override); verdict-crossing `{proceed*, pushback}` → `divergent`+escalated; missing-response-within-timeout → no combine; missing-response-past-timeout → `partial_responses` auto-disposition (044 AC4) with `escalated_to_founder: false`; both-missing-past-timeout → `no_responses`+escalated; existing `combined.md` is never overwritten (idempotency/no race-overwrite); stale `.tmp.*` files (>30min old) get cleaned up while fresh ones are left; AC3.5 (a)/(b)/(c) state-machine shape assertions for zero-patches, patches-accepted-inline, and explicit-waiver convergence cases (all leave `next_round: null`, deferring round-2 dispatch to the watcher); AC3a–AC3d per-reviewer timeout gating from `reviewers.json` defaults (codex 0.5h fallback, cursor 2h) plus `--timeout-hours` uniform override; AC4a–AC4c single-reviewer auto-disposition for missing-cursor with present codex in `proceed`, `proceed_after_patches`, and `pushback` (only the last still escalates). |

### `tests/review-queue/commit-reviewer-response.test.ts` — tests `tools/review-queue/commit-reviewer-response.sh`

**Purpose:** Verifies the shared reviewer-response commit helper: valid reviewer.md files get schema-validated, committed with the `review-r<N>: <reviewer> on <item_id>` message, and pushed to origin/main; malformed files get quarantined (renamed to `.invalid.<ts>`), logged as a `VALIDATION-FAIL` row in `raw/internal/queue-errors.md`, and never committed.

**Depends on:** `tests/review-queue/_helpers.js` (REPO constant), `tools/review-queue/commit-reviewer-response.sh`, `tools/review-queue/validate.py`, `tools/review-queue/_lib.py`, `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`, `tools/review-queue/schemas/reviewer.schema.json`, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupRepo()` | function | `tests/review-queue/commit-reviewer-response.test.ts:25` | Creates a bare origin + working repo on `main`, copies the commit-response helper and its dependencies into it, chmods them executable, and pushes a baseline commit. |
| `writeReviewerResponse(root, reviewer, round, variant)` | function | `tests/review-queue/commit-reviewer-response.test.ts:72` | Writes a `codex.md`/`cursor.md` reviewer response file with valid or malformed (missing `verdict`) frontmatter at the canonical review-round path. |
| `runHelper(root, args)` | function | `tests/review-queue/commit-reviewer-response.test.ts:117` | Spawns `commit-reviewer-response.sh` with given args in `root` and normalizes the result shape. |
| `describe: "commit-reviewer-response.sh"` | test suite | `tests/review-queue/commit-reviewer-response.test.ts:129` | Covers the valid-response commit+push path (correct commit message, origin/main matches HEAD) and the malformed-response quarantine path (file renamed, queue-errors row appended, no new commit). |

### `tests/review-queue/concurrency.test.ts` — tests review-queue concurrency/timeout invariants across `request.py`, `combine.py`, `push-with-retry.sh`

**Purpose:** Exercises race and timeout edge cases in the review-queue protocol: idempotent same-SHA `request.py` reinvocation, different-SHA conflict detection, atomic `os.link` write races for reviewer responses, orphaned `.tmp.*` cleanup by `combine.py`, push failure logging, and the 044 AC4 single-missing-reviewer auto-disposition path.

**Depends on:** `tests/review-queue/_helpers.js` (`combineScript`, `requestScript`, `runPython`), `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupRepo()` | function | `tests/review-queue/concurrency.test.ts:20` | Creates a temp root with a seeded `backlog/ready/<ITEM_ID>.md` file for request.py to resolve. |
| `runRequest(root, extra)` | function | `tests/review-queue/concurrency.test.ts:27` | Invokes `request.py` for round 1 at a fixed spec SHA against `root`, returning exit code + stderr. |
| `describe: "review-queue concurrency + timeout"` | test suite | `tests/review-queue/concurrency.test.ts:39` | Covers same-SHA idempotent double-request, different-SHA conflict error, `os.link` atomic-write race (loser gets `FileExistsError`), stale `.tmp` orphan cleanup by combine.py (30-min threshold), push-with-retry failure logging (`PUSH-RACE-FALLBACK`), 044 AC4 single-missing-reviewer auto-disposition (`partial_responses`/`escalated_to_founder: false`), and re-verification that same-SHA idempotency reads the existing file's SHA rather than treating `FileExistsError` as success. |

### `tests/review-queue/default-deploy-baseline.test.ts` — regression fixture for `combine.py`'s default-deploy output shape

**Purpose:** 043 AC7/AC7b regression guard: locks the exact byte-for-byte structure of `combined.md` produced by the default codex+cursor reviewer deploy (frontmatter field order, body sections, wording), so any unintentional drift in `combine.py`'s output trips the test.

**Depends on:** `tests/review-queue/_helpers.js` (`combineScript`, `runPython`), external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupRoot()` | function | `tests/review-queue/default-deploy-baseline.test.ts:26` | Creates a fresh temp root for a fixture round. |
| `writeFixture(root, reviewers, requestedAt)` | function | `tests/review-queue/default-deploy-baseline.test.ts:30` | Writes `request.md` plus per-reviewer response files (or omits a reviewer for `__missing__` verdict) for round 1. |
| `readCombinedStripped(dir)` | function | `tests/review-queue/default-deploy-baseline.test.ts:73` | Reads `combined.md` and replaces the non-deterministic `combined_at` timestamp with a fixed placeholder for exact-string comparison. |
| `describe: "043 AC7 — default-deploy baseline (codex + cursor happy path)"` | test suite | `tests/review-queue/default-deploy-baseline.test.ts:80` | Asserts byte-identical `combined.md` for the codex+cursor both-proceed case (full expected string literal) and for the codex-missing-past-timeout case (`partial_responses`, `escalated_to_founder: false`, `codex_response: null`). |

### `tests/review-queue/e2e.test.ts` — end-to-end scripted review-queue cycle

**Purpose:** AC6a synthetic end-to-end test driving a full two-round review cycle (request → reviewer responses via atomic-link write → combine → dispatch next round → combine again) through the real `request.py`/`combine.py` CLIs, including injected stale/fresh orphan `.tmp` files and same/different-SHA idempotency checks.

**Depends on:** `tests/review-queue/_helpers.js` (`combineScript`, `requestScript`, `runPython`), external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `writeReviewer(roundDir, reviewer, round, sha, verdict, findings)` | function | `tests/review-queue/e2e.test.ts:25` | Builds a reviewer response frontmatter+body and writes it via the same atomic tmp-file + `ln` (hardlink) + `rm` pattern real reviewer prompts use. |
| `describe: "review-queue e2e (AC6a synthetic)"` | test suite | `tests/review-queue/e2e.test.ts:60` | Drives R1 (codex+cursor both `proceed_after_patches` with a convergent HIGH finding) through combine, injects a stale (31min) and fresh (1min) orphan tmp file and confirms only the stale one is swept, advances the spec and runs R2 (both `proceed`), asserts monotonic round naming, no orphan tmps in r2, and same-SHA idempotency vs. different-SHA conflict on request.py. |

### `tests/review-queue/fixtures/mock-claude.sh` — test fixture standing in for the `claude` CLI (056 AC9)

**Purpose:** Replaces the real `claude` CLI in reviewer-loop tests. Records its argv/stdin, then per `MOCK_CLAUDE_MODE` either synthesizes a schema-valid `claude.md` reviewer response and commits it via `commit-reviewer-response.sh`, simulates a SHA-drift queue error via `queue_error.sh`, or is a no-op.

**Depends on:** `tools/review-queue/commit-reviewer-response.sh`, `tools/review-queue/queue_error.sh`, external: bash, `awk`, `date`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint (mode dispatch: `noop`/`sha_drift`/`produce_response`) | script flow | `tests/review-queue/fixtures/mock-claude.sh:1` | Records argv+stdin to `$MOCK_CLAUDE_RECORD_DIR` if set; `noop` exits 0 immediately; `sha_drift` finds a pending `request.md`, extracts `artifact_path`/`spec_commit_sha`, and calls `queue_error.sh spec_sha_unreachable ...` then exits 1; `produce_response` (default) scans `backlog/reviews/*/r*/request.md` for a round missing `claude.md`, synthesizes a `verdict: proceed` response with a 7-char short SHA, and commits it via `commit-reviewer-response.sh`. |

### `tests/review-queue/n-reviewer-framework.test.ts` — tests the N-reviewer roster framework (`combine.py`, `dispatch-next-round.py`, `_reviewers.py`, `_run_reviewer.sh`)

**Purpose:** Falsification suite for 043 AC1–AC4/AC6 (per-round reviewer roster, roster propagation across rounds, `reviewers.json` validation, shared-helper `REVIEWER_NAME` gating, late-response race guard) plus the 044 AC4 auto-disposition rule and the "fix ③" O1/O2 bugfixes for optional-only rosters and required-reviewer-present gating.

**Depends on:** `tests/review-queue/_helpers.js` (`combineScript`, `dispatchScript`, `REPO`, `runPython`), `tools/review-queue/_reviewers.py`, `tools/review-queue/_run_reviewer.sh`, `tools/review-queue/validate.py`, external: `node:fs`, `node:child_process` (`spawnSync`), `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupRoot()` | function | `tests/review-queue/n-reviewer-framework.test.ts:30` | Creates a fresh temp root for a fixture round. |
| `writeRequest(root, round, reviewers, requestedAt)` | function | `tests/review-queue/n-reviewer-framework.test.ts:34` | Writes a `request.md` with an arbitrary `requested_reviewers` roster and `requested_at` timestamp. |
| `writeReviewer(roundDir, reviewer, round, verdict, findings)` | function | `tests/review-queue/n-reviewer-framework.test.ts:58` | Writes a reviewer response file for an arbitrary reviewer name/verdict/findings list. |
| `readCombinedFm(roundDir)` | function | `tests/review-queue/n-reviewer-framework.test.ts:88` | Parses `combined.md`'s YAML-ish frontmatter into a plain object (bool/null/number coercion) for assertion. |
| `runCombine(root, extra)` | function | `tests/review-queue/n-reviewer-framework.test.ts:107` | Runs `combine.py --repo-root=<root> --no-git --all` with extra args (e.g. `--now=`). |
| `describe: "043 AC1 — per-round roster (codex-only round)"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:113` | Covers codex-only round eligibility + `cursor_response: null` schema validity (AC1b), not-yet-eligible when a required reviewer is missing before timeout (AC1c), auto-disposition when required cursor misses past timeout with codex proceeding (AC1d/044 AC4), and multi-missing escalation cases (044 AC4d, AC4e). |
| `describe: "043 AC1f — dispatch-next-round.py propagates roster"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:224` | Verifies that `dispatch-next-round.py` (`dispatchScript`) propagates the exact `requested_reviewers` roster (e.g. cursor-only) from round N to round N+1's `request.md` without silently reinjecting default reviewers like codex. |
| `describe: "043 AC2 — _reviewers.py validation + cache"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:297` | Loads `_reviewers.py`'s `load_reviewers` against hand-crafted `reviewers.json` fixtures, asserting rejection of invalid `mode`, duplicate reviewer slugs, `mode=headless` with non-null `timeout_hours`, and `mode=ide` with null `timeout_hours`. |
| `loadWithConfig(path)` | function | `tests/review-queue/n-reviewer-framework.test.ts:306` | Runs an inline Python snippet importing `_reviewers` and calling `load_reviewers(config_path=...)`, printing reviewer names or a `ValueError` message. |
| `describe: "043 AC3 — _run_reviewer.sh gating"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:391` | Asserts `_run_reviewer.sh` is executable in the git index, and that it fails fast with clear stderr when `REVIEWER_NAME` is unset, unknown, or names a reviewer whose `mode` doesn't match the wrapper's expected mode (e.g. cursor is `mode=ide` not `headless`). |
| `runWrapper(env)` | function | `tests/review-queue/n-reviewer-framework.test.ts:394` | Spawns `_run_reviewer.sh` with a merged environment. |
| `describe: "043 AC4 — late-response race guard"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:432` | Exercises (via an inline Python snippet mirroring the real reviewer-prompt logic) the guard that a reviewer must skip writing its response if `combined.md` already exists, must write cleanly if not, and must exit 0 without clobbering if another reviewer's response file already exists (hardlink `FileExistsError`). |
| `runGuard(roundDir, codexExists, combinedExists)` | function | `tests/review-queue/n-reviewer-framework.test.ts:441` | Sets up pre-existing `codex.md`/`combined.md` per flags, then runs the race-guard Python snippet and returns its result. |
| `describe: "043 AC6 — N-way verdict roll-up"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:497` | Asserts combined-verdict roll-up rules: two `proceed` → `proceed`; `proceed`+`proceed_after_patches` → `proceed_after_patches`; `proceed`+`pushback` → `divergent` + escalated. |
| `describe: "fix ③ — O1: optional-only roster eligibility gate"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:550` | Verifies an optional-only roster (e.g. `claude` alone, `required:false`) does not become eligible seconds after dispatch with zero responses, only becomes a `no_responses` escalation past the fallback timeout, and combines normally the instant the optional reviewer's response is present. |
| `describe: "fix ③ — O2: auto-disposition requires a present REQUIRED reviewer"` | test suite | `tests/review-queue/n-reviewer-framework.test.ts:595` | Verifies that if only an optional reviewer responded while the sole required reviewer is missing, the round escalates (not auto-dispositioned); and that auto-disposition still fires when at least one required reviewer is present alongside a missing one. |

### `tests/review-queue/promote.test.ts` — tests `tools/review-queue/promote.py`

**Purpose:** Verifies the proposed→ready promotion pipeline (088): stage-only promotion stamps `ready_content_sha` and moves the item without a git commit; a combined.md still carrying a placeholder disposition line refuses promotion; content drift between the reviewed SHA and the current proposed file is caught and logged; stale `ready/` items get bounced back to `proposed/`; and `commit-push` mode publishes the ready boundary to `origin/main`.

**Depends on:** `tests/review-queue/_helpers.js` (`runPython`), `tools/review-queue/promote.py`, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(root, args)` | function | `tests/review-queue/promote.test.ts:19` | Runs a git command in `root`, returning trimmed stdout. |
| `setupRepo(withOrigin)` | function | `tests/review-queue/promote.test.ts:23` | Initializes a git repo with `backlog/proposed`, `backlog/ready`, `backlog/reviews/<ITEM_ID>/r1`, seeds a proposed spec, commits, and optionally creates+pushes to a bare origin. |
| `writeProposed(root, bodyLine)` | function | `tests/review-queue/promote.test.ts:44` | Writes `backlog/proposed/<ITEM_ID>.md` with frontmatter (priority, blocked_by, requested_reviewers) and a variable body line. |
| `writeRequest(root, sha)` | function | `tests/review-queue/promote.test.ts:65` | Writes `r1/request.md` referencing the given spec SHA. |
| `writeCombined(root, body)` | function | `tests/review-queue/promote.test.ts:86` | Writes `r1/combined.md` with a `proceed` verdict and the given convergence-call body text. |
| `runPromote(root, args)` | function | `tests/review-queue/promote.test.ts:108` | Runs `promote.py` with args plus `--repo-root=<root>`. |
| `describe: "promote.py"` | test suite | `tests/review-queue/promote.test.ts:112` | Covers: stage-only promotion stamping `ready_content_sha` (SHA-256, idempotent "already ready" on rerun); refusal when `combined.md` still has a placeholder disposition (`not terminal-promotable`); refusal + `PROMOTE_CONTENT_IDENTITY_MISMATCH` logged when the proposed content diverges from the reviewed SHA; bouncing a stale `ready/` item back to `proposed/` with `STALE_READY_BOUNCED` logged and `ready_content_sha` stripped; and `commit-push` mode publishing the ready file to `origin/main`. |

### `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts` — tests `push-with-retry.sh`'s no-silent-misconfiguration guardrail (102 B2)

**Purpose:** Verifies push-with-retry.sh's AC5/AC8 guardrail: when `ECHO_REVIEW_QUEUE_COORD_REF` is unset but `.echo/project.json` declares a non-default `coord_ref`, the helper must fail loudly (exit 2, descriptive stderr) before any push rather than silently writing to `main`; and that the guardrail does not false-positive when the env var is set, when config's `coord_ref` equals the default, or when no config exists at all.

**Depends on:** `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`, `.echo/project.json` schema, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, ...args)` | function | `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts:31` | Runs a git command via `execSync`, returns trimmed stdout. |
| `setupFixture()` | function | `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts:35` | Builds a bare origin + working repo with the real `push-with-retry.sh` and `_effect-runner.sh` copied in, plus a baseline commit pushed to `origin/main`. |
| `writeProjectConfig(repo, coordRef)` | function | `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts:69` | Writes `.echo/project.json` with a given `coord_ref` and fixed reviewers/spec_dir. |
| `runHelper(repo, helperAbs, env)` | function | `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts:87` | Spawns the helper with a scrubbed env (strips `ECHO_REVIEW_QUEUE_COORD_REF` from the parent unless explicitly re-added) so tests control propagation precisely. |
| `describe: "102 B2 — push-with-retry.sh no-silent-misconfiguration guardrail"` | test suite | `tests/review-queue/push-with-retry-coord-ref-guardrail.test.ts:105` | Asserts the guardrail fires (exit 2, `no-silent-misconfiguration guardrail` + `coord_ref='echo/coord'` in stderr, origin/main untouched) when config declares a non-default ref but env is unset; and does not fire when env is set, when config's ref equals `main`, or when no config file exists. |

### `tests/review-queue/push-with-retry-cwd-agnostic.test.ts` — tests `push-with-retry.sh` CWD-agnostic behavior + `HEAD:main` refspec contract (050 AC5)

**Purpose:** Proves push-with-retry.sh behaves identically whether invoked from the live main checkout or from a detached-HEAD worktree, and specifically that it pushes via the `HEAD:main` refspec (not branch-name `main`), including under simulated concurrent-push retry/rebase and queue-error logging under the correct toplevel.

**Depends on:** `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, ...args)` | function | `tests/review-queue/push-with-retry-cwd-agnostic.test.ts:42` | Runs a git command via `execSync`, returns trimmed stdout. |
| `setupFixture()` | function | `tests/review-queue/push-with-retry-cwd-agnostic.test.ts:46` | Builds a bare origin + working repo with the helper and `_effect-runner.sh` copied in, plus a baseline commit pushed. |
| `teardown(fx)` | function | `tests/review-queue/push-with-retry-cwd-agnostic.test.ts:81` | Recursively removes the fixture's base temp dir. |
| `bashHelper(cwd, helperAbs, context, extraEnv)` | function | `tests/review-queue/push-with-retry-cwd-agnostic.test.ts:85` | Spawns `bash <helperAbs> <context>` with merged env from the given cwd. |
| `describe: "050 AC5 — push-with-retry.sh CWD-agnostic + HEAD:main refspec"` | test suite | `tests/review-queue/push-with-retry-cwd-agnostic.test.ts:98` | Covers: (a) live-checkout push lands on origin/main as fast-forward; coord-ref push honors `ECHO_REVIEW_QUEUE_COORD_REF` and leaves origin/main untouched; (d) detached-HEAD worktree push lands on origin/main matching worktree HEAD (proves `HEAD:main` refspec); (b)+(c) simulated concurrent push forces rebase-and-retry from both live-checkout and worktree CWDs, both exit 0; and queue-errors.md on push exhaustion is written under the invoking CWD's toplevel. |

### `tests/review-queue/push-with-retry-rebase-merges.test.ts` — tests `push-with-retry.sh`'s `--rebase=merges` fix (051 AC1)

**Purpose:** Falsifies the 2026-05-14 collision where a plain `git pull --rebase` flattened in-flight merge commits during push-with-retry.sh's rebase-and-retry path; verifies the fix (`--rebase=merges`) preserves the merge commit's two-parent shape after a forced non-fast-forward rebase.

**Depends on:** `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`, external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, ...args)` | function | `tests/review-queue/push-with-retry-rebase-merges.test.ts:42` | Runs a git command via `execFileSync`, returns raw stdout. |
| `setupFixture()` | function | `tests/review-queue/push-with-retry-rebase-merges.test.ts:46` | Builds a bare origin, a local clone (with the helper + `_effect-runner.sh` copied in and a baseline commit pushed), and a sibling clone used to force a non-fast-forward state. |
| `describe: "051 AC1 — push-with-retry.sh preserves merge commits via --rebase=merges"` | test suite | `tests/review-queue/push-with-retry-rebase-merges.test.ts:88` | Builds a real `--no-ff` merge commit locally, has the sibling clone push a non-conflicting commit to force local's push into non-fast-forward, invokes `push-with-retry.sh`, and asserts `origin/main^2` resolves (merge shape survived the rebase) with no `PUSH-RACE-FALLBACK` rows logged. |

### `tests/review-queue/request.test.ts` — tests `tools/review-queue/request.py`

**Purpose:** Verifies `request.py`'s round-request generation: default reviewer roster and `class` field in frontmatter, custom `--reviews-root`, reading defaults (`reviews_root`, `reviewers`, `spec_dir`) from `.echo/project.json`, `find_artifact` preferring `proposed/` over `ready/`, error handling for missing items, same-SHA idempotency vs. different-SHA conflict, out-of-enum reviewer rejection, and schema validation of the produced `request.md`.

**Depends on:** `tests/review-queue/_helpers.js` (`runPython`, `requestScript`), `tools/review-queue/request.py`, `tools/review-queue/validate.py`, `.echo/project.json` schema, external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `setupFakeRepo()` | function | `tests/review-queue/request.test.ts:9` | Creates a temp root with a seeded `backlog/ready/<ITEM_ID>.md`. |
| `runRequest(repoRoot, extra, sha)` | function | `tests/review-queue/request.test.ts:19` | Invokes `request.py` for round 1 against `repoRoot` at a given spec SHA plus extra CLI args. |
| `describe: "request.py"` | test suite | `tests/review-queue/request.test.ts:34` | Covers happy-path `request.md` generation (default reviewers codex+cursor, `class: narrow`), `--class=structural-reform` reflected in frontmatter, custom `--reviews-root`, `.echo/project.json`-driven defaults (custom reviews_root/reviewers/spec_dir), `find_artifact` preferring `proposed/` over `ready/`, clear error for a missing item, same-SHA idempotent reinvocation, different-SHA conflict error, rejection of an out-of-enum `--reviewers` value, and schema validation of the produced request.md against `request.schema.json`. |

### `tests/review-queue/reviewer-bindings.test.ts` — reviewer-bindings.json contract + gate CLI tests

**Purpose:** Exercises `tools/review-queue/reviewer-bindings.json`, its JSON Schema, `tools/review-queue/_reviewer_gate.py`, and the runtime scripts (`_run_reviewer.sh`, `_install_reviewer_launchd.sh`) that consume it. Verifies read-only sandboxing/argv canonicalization for the `codex` and `codex-ops` protected reviewers cannot be bypassed via poisoned bindings config, legacy `reviewers.json`, or non-canonical argv shapes.

**Depends on:** `tests/review-queue/_helpers.js` (REPO constant), `tools/review-queue/reviewer-bindings.json`, `tools/review-queue/schemas/reviewer-bindings.schema.json`, `tools/review-queue/reviewers.json`, `tools/review-queue/_reviewer_gate.py`, `tools/review-queue/_run_reviewer.sh`, `tools/review-queue/_install_reviewer_launchd.sh`, `package.json`; external: `ajv`, `vitest`, `node:child_process`, `node:fs`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ReviewerBinding` | interface | `tests/review-queue/reviewer-bindings.test.ts:9` | Shape of one entry in `reviewer-bindings.json` (mode, argv, sandbox, commit policy, capture config). |
| `ReviewerBindingsConfig` | interface | `tests/review-queue/reviewer-bindings.test.ts:25` | Top-level `{kind, bindings[]}` shape of the bindings file. |
| `LegacyReviewer` | interface | `tests/review-queue/reviewer-bindings.test.ts:30` | Shape of a legacy `reviewers.json` entry (name, mode, slash_command, invoke_command). |
| `LegacyReviewersConfig` | interface | `tests/review-queue/reviewer-bindings.test.ts:37` | Top-level `{reviewers[]}` shape of the legacy config. |
| `canonicalProtectedArgv` | const | `tests/review-queue/reviewer-bindings.test.ts:47` | The single gate-owned read-only argv template (`codex exec -C {{WT}} --sandbox read-only --json -`). |
| `nonCanonicalProtectedArgvCases` | const | `tests/review-queue/reviewer-bindings.test.ts:57` | Table of 12 argv mutation attempts (path-qualified binary, shim rename, bypass flags, `-c`/`--config`/`--profile` overrides, duplicate/reordered flags) each expected to be rejected. |
| `poisonedDefaultProtectedArgvCases` | const | `tests/review-queue/reviewer-bindings.test.ts:187` | Subset of the non-canonical cases (bypass flag, `-c`, `--config`, `--profile`) reused to test mutation of the *default* checked-in bindings file. |
| `readJson(path)` | function | `tests/review-queue/reviewer-bindings.test.ts:196` | Reads and JSON-parses a file. |
| `config()` | function | `tests/review-queue/reviewer-bindings.test.ts:200` | Loads the real `reviewer-bindings.json`. |
| `binding(slug)` | function | `tests/review-queue/reviewer-bindings.test.ts:204` | Finds a binding entry by reviewer slug, throws if absent. |
| `legacyReviewer(slug)` | function | `tests/review-queue/reviewer-bindings.test.ts:210` | Finds a legacy `reviewers.json` entry by name, throws if absent. |
| `gateBuffer(args, env)` | function | `tests/review-queue/reviewer-bindings.test.ts:217` | Spawns `_reviewer_gate.py` with given argv/env, returns raw Buffer result. |
| `gateText(args, env)` | function | `tests/review-queue/reviewer-bindings.test.ts:224` | Same as `gateBuffer` but with utf-8 encoding for text output. |
| `parseNulDelimited(stdout)` | function | `tests/review-queue/reviewer-bindings.test.ts:232` | Splits a NUL-delimited argv buffer into a string array. |
| `protectedReviewerBindingConfig(reviewer, argv)` | function | `tests/review-queue/reviewer-bindings.test.ts:236` | Builds a synthetic single-binding config object for a protected reviewer with a given argv override. |
| `gateWithProtectedBinding(reviewer, argv)` | function | `tests/review-queue/reviewer-bindings.test.ts:265` | Writes a temp bindings file with custom argv, runs the gate via `ECHO_REVIEWER_BINDINGS_CONFIG`, returns the result and cleans up. |
| `gateWithMutatedDefaultProtectedBinding(reviewer, argv)` | function | `tests/review-queue/reviewer-bindings.test.ts:278` | Copies the real `tools/review-queue` dir, mutates the checked-in bindings file's argv for one reviewer, and runs the gate against the mutated default (no env override) to prove the gate itself enforces the canonical template. |
| `describe: "087 reviewer-bindings.json contract"` | test suite | `tests/review-queue/reviewer-bindings.test.ts:302` | Validates schema conformance, read-only+wrapper policy for codex/codex-ops, stdin-not-in-argv, legacy `reviewers.json` resolution to read-only argv, custom `stdin_from` resolution, invalid-config failure, canonical-argv acceptance, rejection of all non-canonical/poisoned argv cases, runtime-script argv_nul usage (no shell-string dispatch), and npm package file whitelist inclusion. |

### `tests/review-queue/reviewer-readonly.test.ts` — end-to-end read-only reviewer wrapper tests

**Purpose:** Full black-box tests of `tools/review-queue/run-codex-reviewer.sh` / `run-codex-ops-reviewer.sh` against a mocked `codex` binary, verifying the wrapper parses only the final assistant JSON message (not raw stdout noise), commits/pushes the parsed reviewer response, and durably records capture failures (crash, empty stdout, write-denied, invalid frontmatter, wrong-request binding) as `.capture-failed` markers plus queue-error log entries, without ever touching `main` when a `coord_ref` is configured.

**Depends on:** `tests/review-queue/_helpers.js` (REPO), `tools/review-queue/*` (`_run_reviewer.sh`, `run-codex-reviewer.sh`, `run-codex-ops-reviewer.sh`, `commit-reviewer-response.sh`, `push-with-retry.sh`, `coord-emit.sh`), `.claude/commands/review-queue-codex.md`, `.claude/commands/review-queue-codex-ops.md`, `.echo/project.json` schema; external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`, `python3` (via mock codex script).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Fixture` | interface | `tests/review-queue/reviewer-readonly.test.ts:31` | Holds temp dirs (base, bare remote, repo clone, tmp, mock-bin, record dir) plus reviewer slug and spec SHA for one test run. |
| `git(args, cwd)` | function | `tests/review-queue/reviewer-readonly.test.ts:43` | Runs a git command synchronously in a given cwd, returns trimmed stdout. |
| `writeExecutable(path, body)` | function | `tests/review-queue/reviewer-readonly.test.ts:47` | Writes a file and chmods it 0o755. |
| `writeMockCodex(path)` | function | `tests/review-queue/reviewer-readonly.test.ts:52` | Writes a bash+python mock `codex` binary that records its invocation/stdin and, based on `MOCK_CODEX_MODE`, emits crash/write-denied/empty/valid/invalid/wrong-binding JSONL final-message events simulating real codex exec output including deliberately noisy prefix text. |
| `writeRequest(repo, reviewer, specSha, state)` | function | `tests/review-queue/reviewer-readonly.test.ts:127` | Writes a `backlog/reviews/<item>/r1/request.md` fixture in one of several states (`selected`, `selected_fm_dashes` with an embedded `---` token, `none`, `stale_combined`, `bind_failed` requesting the other reviewer). |
| `otherReviewer(reviewer)` | function | `tests/review-queue/reviewer-readonly.test.ts:161` | Returns the counterpart reviewer slug (codex ↔ codex-ops). |
| `setupFixture(opts)` | function | `tests/review-queue/reviewer-readonly.test.ts:165` | Builds a bare+working git repo fixture, copies `tools/review-queue` and reviewer command files, installs a mock `codex`/`coord-emit.sh`, wraps `push-with-retry.sh` with a real/mock switch, commits+pushes bootstrap and request fixtures. |
| `teardown(fx)` | function | `tests/review-queue/reviewer-readonly.test.ts:263` | Recursively removes the fixture's base temp dir. |
| `runWrapper(fx, mode, extraEnv)` | function | `tests/review-queue/reviewer-readonly.test.ts:267` | Spawns `run-<reviewer>-reviewer.sh` in the fixture repo with mock-codex env vars and coord/record-dir wiring, 60s timeout. |
| `showOrigin(fx, path)` | function | `tests/review-queue/reviewer-readonly.test.ts:291` | Fetches `origin/main` and returns the content of a file at that ref. |
| `originHas(fx, path)` | function | `tests/review-queue/reviewer-readonly.test.ts:296` | Fetches `origin/main` and checks whether a path exists there via `git cat-file -e`. |
| `fetchOriginRef(fx, ref)` | function | `tests/review-queue/reviewer-readonly.test.ts:305` | Fetches an arbitrary named ref from origin into `refs/remotes/origin/<ref>`. |
| `showOriginRef(fx, ref, path)` | function | `tests/review-queue/reviewer-readonly.test.ts:311` | Reads a file's content at an arbitrary fetched origin ref (used for `echo/coord`). |
| `originRefHas(fx, ref, path)` | function | `tests/review-queue/reviewer-readonly.test.ts:319` | Checks path existence at an arbitrary fetched origin ref. |
| `readRecord(fx, name)` | function | `tests/review-queue/reviewer-readonly.test.ts:328` | Reads a file from the fixture's mock-codex record dir, or `''` if absent. |
| `expectNoChildSpawn(fx)` | function | `tests/review-queue/reviewer-readonly.test.ts:333` | Asserts the mock codex `invocations` record is empty (wrapper never spawned the child). |
| `parseNulDelimited(stdout)` | function | `tests/review-queue/reviewer-readonly.test.ts:337` | Splits a NUL-delimited buffer into a string array. |
| `describe: "087b reviewer read-only wrapper publisher"` | test suite | `tests/review-queue/reviewer-readonly.test.ts:341` | Covers: publishing parsed final-JSON review content (not raw noise) with read-only argv and `outcome:completed` coord event; converting rc_nonzero/empty_stdout/write_denied/invalid_final captures into durable `.capture-failed` markers + `queue-errors.md` diagnostics + `terminal_capture_failure` coord event; skipping an already-capture-failed round on next scan without respawning; not reselecting after a capture-failure marker push itself fails; rejecting a schema-valid response bound to the wrong request (`request_binding_mismatch`); correctly selecting a request whose frontmatter value contains a literal `---` token (line-anchored parser, not naive split); classifying no-candidate/stale_combined/bind_failed pre-flight states before spawning any child, each closing the coord lifecycle correctly; publishing to a configured `echo/coord` ref instead of `main` when `.echo/project.json` sets `coord_ref`; and proving legacy `ECHO_REVIEWERS_CONFIG` (with a `danger-full-access` invoke_command) cannot synthesize a full-access binding — the gate still resolves read-only argv + wrapper commit_policy. |

### `tests/review-queue/schemas.test.ts` — request/reviewer/combined frontmatter schema validation tests

**Purpose:** Exercises `tools/review-queue/validate.py` (via `runPython`/`validatorPath` helpers) against the three review-queue artifact schemas (`request`, `reviewer`, `combined`), covering required-field enforcement, enum constraints, and the `malformed_reviewer_response` combined-verdict's `offending_response`/`parse_error` array/string/path-pattern rules.

**Depends on:** `tests/review-queue/_helpers.js` (runPython, validatorPath), `tools/review-queue/validate.py`, `tools/review-queue/schemas/*.schema.json` (implicitly, through validate.py); external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fm(obj)` | function | `tests/review-queue/schemas.test.ts:7` | Serializes a plain object into YAML-ish frontmatter text (handles arrays, null, strings, scalars) followed by a body. |
| `validate(schema, path)` | function | `tests/review-queue/schemas.test.ts:29` | Runs `validate.py <schema> <path>` and returns `{code, stderr}`. |
| `validRequest(overrides)` | function | `tests/review-queue/schemas.test.ts:40` | Builds a minimal valid `request` frontmatter object (item_id, round, spec_commit_sha, artifact_path, class, requested_at, requested_reviewers, correlation_id) with overridable fields. |
| `validReviewer(overrides)` | function | `tests/review-queue/schemas.test.ts:55` | Builds a minimal valid `reviewer` frontmatter object (item_id, round, reviewer, artifact_sha, completed_at, verdict, findings). |
| `validCombined(overrides)` | function | `tests/review-queue/schemas.test.ts:68` | Builds a minimal valid `combined` frontmatter object (item_id, round, combined_at, codex_response, cursor_response, combined_verdict, escalated_to_founder). |
| `describe: "review-queue schemas"` | test suite | `tests/review-queue/schemas.test.ts:81` | Verifies each valid fixture parses cleanly; missing required fields fail with the field name in stderr; `reviewer` enum rejects unknown reviewers and excludes combined-only verdicts (`divergent`, `single_reviewer_timeout`, `no_responses`) while accepting the three per-reviewer verdicts; `combined` accepts all six verdict values and allows null `codex_response` for `single_reviewer_timeout`; `request.class` enum is `{narrow, structural-reform}`; `malformed_reviewer_response` combined docs accept string or length-2-array `offending_response`/`parse_error` pairs but reject length-1 arrays (minItems:2) and item-relative paths (path-pattern gate), accept hyphenated reviewer slugs (AC5 regex widening); and `requested_reviewers` must be a non-empty subset of the reviewer enum. |

### `tests/review-queue/watcher-state.test.ts` — dispatch-next-round.py post-combine state-machine tests

**Purpose:** Exercises `tools/review-queue/dispatch-next-round.py` (via `combineScript`/`dispatchScript`/`runPython` helpers), the AC3.5 watcher logic that decides, after `combine.py` produces `combined.md`, whether to open a next review round, record a waiver, or stop — covering load-bearing-finding escalation, no-patch termination, idempotent/race-loser SHA handling, explicit-waiver rationale recording, and proposed-stage artifact-path routing.

**Depends on:** `tests/review-queue/_helpers.js` (combineScript, dispatchScript, runPython), `tools/review-queue/combine.py`, `tools/review-queue/dispatch-next-round.py`, `tools/review-queue/request.py` (transitively, via `find_artifact()`); external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Finding` | interface | `tests/review-queue/watcher-state.test.ts:25` | Shape of one reviewer finding (`severity`, `where`, `finding`). |
| `setupRepo()` | function | `tests/review-queue/watcher-state.test.ts:31` | Creates a temp repo root with a stub `backlog/ready/<item>.md` file. |
| `writeRequest(root, round, sha, stage)` | function | `tests/review-queue/watcher-state.test.ts:41` | Writes a `backlog/reviews/<item>/r<round>/request.md` fixture at a given spec SHA and backlog stage (ready/proposed), returns the round dir path. |
| `writeReviewer(roundDir, reviewer, round, verdict, findings, sha)` | function | `tests/review-queue/watcher-state.test.ts:66` | Writes a `<reviewer>.md` response file with given verdict and findings list into a round directory. |
| `runCombine(root)` | function | `tests/review-queue/watcher-state.test.ts:97` | Runs `combine.py --repo-root=<root> --no-git --all`. |
| `runDispatch(root, args)` | function | `tests/review-queue/watcher-state.test.ts:101` | Runs `dispatch-next-round.py --repo-root=<root> <ITEM_ID> <args...>`. |
| `readFrontmatter(path)` | function | `tests/review-queue/watcher-state.test.ts:105` | Regex-based frontmatter parser converting `key: value` lines to a typed object (null/bool/int/quoted-string coercion). |
| `readBody(path)` | function | `tests/review-queue/watcher-state.test.ts:124` | Returns the markdown body after the frontmatter block. |
| `describe: "dispatch-next-round.py (AC3.5 watcher post-combine state machine)"` | test suite | `tests/review-queue/watcher-state.test.ts:130` | Covers: (b) a convergent load-bearing `proceed_after_patches` finding from both reviewers writes `r2/request.md` at the passed spec SHA and sets `combined.md.next_round=2` without altering its body; (a) `proceed` + no patches leaves `next_round` null and creates no r2 request; (b) race-loser semantics — re-dispatch at the same SHA is a byte-identical idempotent no-op (no `.tmp` leak), re-dispatch at a different SHA exits 2 with a "different SHA" stderr message; (c) an explicit waiver (no patches applied, non-load-bearing finding) appends a "verification waived; rationale: …" line to `combined.md`'s body exactly once even across repeated invocations; and a `proposed`-stage item with `proceed_after_patches`+`patches_applied=false` routes to a verification round whose `r2/request.md` references `backlog/proposed/<item>.md`. |

### `tests/review-queue/worktree-isolation.test.ts` — per-tick worktree collision-simulation tests (050 AC6)

**Purpose:** Simulates the multi-writer race the 050 architecture fixes — parallel role ticks (reviewer, watcher, merger) each committing inside their own per-tick `$TMPDIR/echo-<role>-<uuid>` git worktree so unrelated processes never share a `.git/index` and cannot sweep each other's staged changes into one commit. Exercises the git-worktree primitives, `push-with-retry.sh` rebase-on-push behavior, the pre-flight GC sweep (registered worktrees survive regardless of mtime; unregistered orphans >60min are pruned), and the AC3 "no merge-in-progress sentinel file" invariant.

**Depends on:** `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`; external: `node:child_process` (execSync, spawnSync), `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Fixture` | interface | `tests/review-queue/worktree-isolation.test.ts:42` | Holds base/bare/repo/tmpdir paths and the relative helper-script path for one test run. |
| `setupFixture()` | function | `tests/review-queue/worktree-isolation.test.ts:50` | Creates a bare remote + working repo, copies `push-with-retry.sh` and `_effect-runner.sh` into it, commits+pushes a bootstrap README. |
| `teardown(fx)` | function | `tests/review-queue/worktree-isolation.test.ts:81` | Prunes worktree admin entries then removes the fixture's base temp dir. |
| `addRoleWorktree(fx, role, uuid)` | function | `tests/review-queue/worktree-isolation.test.ts:97` | Creates a detached-HEAD worktree at `$TMPDIR/echo-<role>-<uuid>` pinned to `origin/main`, mimicking `_run_reviewer.sh`'s per-tick isolation setup, materializing the helper scripts inside it if missing. |
| `commitAndPush(wt, helperRel, file, body, ctx)` | function | `tests/review-queue/worktree-isolation.test.ts:119` | Writes a file inside a worktree, commits it, and pushes via `push-with-retry.sh`, returning the spawn result. |
| `describe: "050 AC6 — worktree-isolation collision-simulation"` | test suite | `tests/review-queue/worktree-isolation.test.ts:127` | AC6.1: two simultaneous reviewer worktrees (codex, codex-ops) each push their own response file to the same round dir with no cross-commit contamination and clean rebasing. AC6.2: a reviewer tick lands while a merger tick has staged multi-file work in a separate worktree — both push cleanly, neither commit includes the other's files (the shape of the real 2026-05-14 14:02 collision incident). AC6.3: a watcher tick doing multi-step commits (combined.md + next-round request) races a reviewer tick — all artifacts land on origin/main correctly via one push-with-retry rebase. AC6.4: registered worktrees are never GC'd by mtime-based sweep regardless of age; only unregistered `$TMPDIR/echo-*` orphans older than 60min are removed by the pre-flight GC logic. AC6.5: running reviewer+watcher+merger flows in their own worktrees never creates the deleted `.git/echo-merge-in-progress` sentinel file in any of the trees. |

### `tests/review-queue/yaml-error-handling.test.ts` — validate.py malformed-YAML rejection tests (AC1)

**Purpose:** Regression tests for `tools/review-queue/validate.py`'s YAML frontmatter parsing, replicating two real-world malformed-YAML incidents (an embedded `""` literal breaking scalar parsing, and a stray tab inside a flow mapping) and asserting both are rejected cleanly with a line-numbered "malformed YAML" stderr message and empty stdout rather than crashing or silently passing.

**Depends on:** `tests/review-queue/_helpers.js` (runPython, validatorPath), `tools/review-queue/validate.py`; external: `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "validate.py — malformed YAML rejection (AC1)"` | test suite | `tests/review-queue/yaml-error-handling.test.ts:7` | AC1a: a `reviewer.md` finding value starting with an embedded `""` (the canonical 2026-05-12 02:33 PDT 040 R1 incident) triggers a YAML ParserError, caught and reported as "malformed YAML" with a line number, exit code 1, empty stdout. AC1b: a stray tab character inside a flow-style YAML mapping triggers a ScannerError, proving the line-numbered rejection handles more than one parse-error class, also exit code 1 with empty stdout. |
