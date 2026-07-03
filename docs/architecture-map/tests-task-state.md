# `tests/task-state/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 4 files.

### `tests/task-state/anchors.test.ts` — fixture-driven parser test for `src/mcp/parse-anchors.ts`

**Purpose:** Loads a fixtures JSON file and asserts `parseAnchors()` produces the expected structured output for each fixture case.

**Depends on:** `src/mcp/parse-anchors.ts` (parseAnchors), `tests/task-state/anchors-fixtures.json` (data fixture); external: `node:fs`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `describe: "src/mcp/parse-anchors.ts — fixture-driven"` | describe block | `tests/task-state/anchors.test.ts:15` | For each fixture in the JSON file, runs `parseAnchors(fx.input)` and asserts deep equality with `fx.expected`, exercising canonical_anchors block parsing. |

### `tests/task-state/lint.test.ts` — CLI behavior test for `tools/task-state/lint.py`

**Purpose:** Spawns the Python lint script against generated task-state pointer fixtures written to a temp dir, verifying required-block presence/order, line-count hard cap/soft warn thresholds, `current_round` header requirement for round-state.md, and directory auto-discovery via `ECHO_TASK_STATE_REPO_ROOT`.

**Depends on:** `tools/task-state/lint.py` (external process, invoked via python3 or `arch -arm64 python3` on darwin); external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tryPython(cmd, args)` | function | `tests/task-state/lint.test.ts:12` | Probes whether a given python invocation works by running `-c "import sys"` and checking exit status 0. |
| `pythonInvocation()` | function | `tests/task-state/lint.test.ts:17` | Resolves and caches the working python3 invocation, falling back to `arch -arm64 python3` on darwin. |
| `runLint(targetFiles)` | function | `tests/task-state/lint.test.ts:29` | Spawns `tools/task-state/lint.py` against the given file paths and returns exit code + stderr. |
| `buildPointer(opts)` | function | `tests/task-state/lint.test.ts:41` | Constructs a synthetic task-state pointer markdown string with configurable frontmatter, current_round header, required block order/subset, and body padding line count. |
| `describe: "tools/task-state/lint.py"` | describe block | `tests/task-state/lint.test.ts:66` | Covers: under-cap pointer passes; over-120-line pointer fails with count surfaced; missing required block fails naming the field; wrong block order fails; frontmatter-only file fails on missing current_thesis; round-state.md missing/with current_round header pass/fail; 81-120 line soft-warn prints warning without failing; auto-discovery of pointer files under `backlog/task-state/` via `ECHO_TASK_STATE_REPO_ROOT` env var when no args passed. |

### `tests/task-state/patch-builder-state.test.ts` — behavior contract test for `tools/task-state/patch-builder-state.py` (048 AC5)

**Purpose:** Verifies the builder-state patcher rewrites the spec anchor, writes `handoff_head_sha`/`handoff_branch`/`handoff_run_log` frontmatter, keeps the canonical_anchors block schema-compliant (no legacy branch/worktree/run_log/head_sha keys), inserts/replaces an idempotent patcher-owned marker block in `current_thesis` (and, for escalated outcomes, in `open_questions`), preserves `locked_decisions`/`dont_touch` byte-for-byte, no-ops when the pointer file is missing, and fails closed (non-zero exit, file unchanged) on malformed pointers or invalid `--outcome`.

**Depends on:** `tools/task-state/patch-builder-state.py` (external process), `tools/task-state/lint.py` (external process, used to validate patched output); external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `tryPython(cmd, args)` | function | `tests/task-state/patch-builder-state.test.ts:28` | Probes whether a given python invocation works by running `-c "import sys"` and checking exit status 0. |
| `pythonInvocation()` | function | `tests/task-state/patch-builder-state.test.ts:33` | Resolves and caches the working python3 invocation, falling back to `arch -arm64 python3` on darwin. |
| `runPatcher(opts)` | function | `tests/task-state/patch-builder-state.test.ts:51` | Spawns `tools/task-state/patch-builder-state.py` with `--task-id`, `--outcome`, `--spec-path`, `--repo-root`, and optional `--branch`/`--head-sha`/`--run-log`, returning exit code, stdout, stderr. |
| `runLint(pointerPath)` | function | `tests/task-state/patch-builder-state.test.ts:84` | Spawns `tools/task-state/lint.py` against a single pointer file path and returns exit code/stdout/stderr. |
| `setupPointer(root, content)` | function | `tests/task-state/patch-builder-state.test.ts:137` | Writes a `builder.md` pointer file under `backlog/task-state/<TASK_ID>/` inside the given temp root and returns its path. |
| `HEALTHY_POINTER` | const (fixture) | `tests/task-state/patch-builder-state.test.ts:97` | A schema-compliant sample builder pointer with frontmatter and all five required blocks populated, used as the baseline fixture across most test cases. |
| `describe: "tools/task-state/patch-builder-state.py"` | describe block | `tests/task-state/patch-builder-state.test.ts:145` | Covers: complete-handoff rewrites spec anchor + handoff frontmatter + refreshed last_updated + schema-compliant anchors + patcher marker in current_thesis, passing lint; marker appended once then replaced exactly once on rerun with updated head_sha; empty head_sha falls back to literal "none"; open_questions preserved byte-for-byte on complete outcome; locked_decisions/dont_touch preserved byte-for-byte; escalated outcome appends idempotent open-questions marker block referencing run_log, preserving original bullets and locked_decisions, idempotent on rerun and lint-clean; escalated outcome on empty open_questions inserts a non-marker fallback line instead; missing builder.md is a no-op (exit 0, no file created); malformed pointer missing canonical_anchors exits non-zero leaving file unchanged; blocks-out-of-order malformed pointer exits non-zero unchanged; YAML-invalid frontmatter exits non-zero unchanged; invalid `--outcome` value exits non-zero without modifying the file. |

### `tests/task-state/push-round-state.test.ts` — blob-lease CAS test for `tools/task-state/push-round-state.sh` (046 AC4)

**Purpose:** Builds a bare git origin plus multiple clones to simulate concurrent writers racing to update a shared `round-state.md` pointer, and asserts the CAS (compare-and-swap) push helper's conflict, precondition, and concurrent-abort-logging behavior.

**Depends on:** `tools/task-state/push-round-state.sh`, `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh` (all copied into cloned repo roots and invoked via bash); external: `node:child_process`, `node:fs`, `node:os`, `node:path`, `vitest`, `git` CLI.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `git(cwd, args)` | function | `tests/task-state/push-round-state.test.ts:23` | Runs a git command synchronously in the given working directory and returns stdout text. |
| `runPushScript(cwd, taskId, baseBlob)` | function | `tests/task-state/push-round-state.test.ts:27` | Invokes `push-round-state.sh <taskId> <baseBlob>` via bash in the given repo clone and returns exit code/stdout/stderr. |
| `writePointerFile(repoRoot, body)` | function | `tests/task-state/push-round-state.test.ts:44` | Writes `backlog/task-state/<TASK>/round-state.md` with the given body inside a repo root, creating the directory if needed. |
| `copyHelperScripts(targetRoot)` | function | `tests/task-state/push-round-state.test.ts:50` | Copies the production push-round-state.sh, push-with-retry.sh, and _effect-runner.sh scripts from the real REPO into a cloned test repo root at matching relative paths with executable mode. |
| `initRepo(repoRoot)` | function | `tests/task-state/push-round-state.test.ts:61` | Initializes a git repo with `main` branch and sets test user.email/user.name/commit.gpgsign=false config. |
| `sampleRoundStateBase` | const (fixture) | `tests/task-state/push-round-state.test.ts:68` | Sample round-state.md content with `current_round: r1` header and all five required blocks, used as the seeded baseline blob across test cases. |
| `describe: "046 AC4 — push-round-state.sh blob-lease"` | describe block | `tests/task-state/push-round-state.test.ts:87` | Covers three race scenarios: (1) writer A pushes its round-state rewrite first via the CAS helper and succeeds; writer B, holding the same stale base blob, aborts non-zero, produces a `raw/internal/queue-errors/<ts>-<writer>-<task>.md` file containing `ROUND_STATE_WRITE_CAS_ABORT_PUSH` and the task id, and that abort-row commit lands on both B's local main and origin/main, while A's rewrite (not B's) is what's on origin; (2) the helper refuses to start (exits non-zero with `ROUND_STATE_HELPER_DIRTY_TREE`) when an unrelated tracked file is dirty in the working tree, leaving that unrelated file's mid-flight edit un-wiped and origin untouched; (3) two simultaneous stale writers B and C (distinguished via `MY_REVIEWER` env var) each abort and each produce a uniquely-named per-event abort-log file under `raw/internal/queue-errors/`, both of which land on origin/main with no rebase conflict, verifying per-event filename uniqueness by construction. |
