# `tools/review-queue/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 38 files.

### `tools/review-queue/_clean-snapshot.sh` — shared ephemeral-worktree entry point for reviewer ticks

**Purpose:** Sourced by reviewer wrapper scripts to create a detached-HEAD git worktree pinned to `origin/main`, so automated reviewer ticks never touch the founder's live checkout. Handles pre-flight worktree hygiene (pruning, orphan cleanup of stale `$TMPDIR/echo-*` dirs), fetches `origin main`, creates the worktree, and installs an EXIT/ERR/INT/TERM cleanup trap.

**Depends on:** none (pure bash + git/uuidgen CLI calls).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `echo_enter_clean_snapshot(role_slug)` | function | `tools/review-queue/_clean-snapshot.sh:12` | Validates `role_slug` against `[A-Za-z0-9._-]`, prunes/cleans stale worktrees under `$TMPDIR`, fetches `origin main`, creates a detached worktree at `$TMPDIR/echo-<role>-<uuid>`, exports `WT`/`ECHO_REVIEW_QUEUE_REPO_ROOT`, cds into it, and installs the cleanup trap. |
| `echo_clean_snapshot_cleanup()` | function | `tools/review-queue/_clean-snapshot.sh:63` | Trap handler: returns to the anchoring repo root, force-removes the worktree, prunes worktree metadata, and preserves the original exit code. |

### `tools/review-queue/_coord_roles.py` — Python mirror of the TS coord-roles config validator

**Purpose:** CI/static-check sibling of `src/coord/roles.ts`; validates `coord-roles.json` shape (roles array, per-role `headless`/`invoke_command`/`events` fields, deadline ordering) so pre-commit-style checks and ad-hoc operator scripts can catch config errors without invoking the TS daemon loader, which remains authoritative at runtime.

**Depends on:** `tools/review-queue/_lib.py` (for `os` access and path conventions), stdlib `json`/`re`/`pathlib`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `CoordEvent` | class (NamedTuple) | `tools/review-queue/_coord_roles.py:34` | Holds `default_deadline_sec`, `max_deadline_sec`, `expects` for one coord event type. |
| `CoordRole` | class (NamedTuple) | `tools/review-queue/_coord_roles.py:40` | Holds `name`, `headless`, `invoke_command`, and the `events` dict for one role. |
| `_resolve_path(config_path)` | function | `tools/review-queue/_coord_roles.py:51` | Resolves the config file path from explicit arg, `ECHO_COORD_ROLES_PATH` env var, or the default `coord-roles.json` next to this script. |
| `load_coord_roles(config_path=None)` | function | `tools/review-queue/_coord_roles.py:62` | Reads and validates `coord-roles.json`: non-empty `roles` array, slug format/uniqueness, `headless`⇒non-empty string `invoke_command`, non-empty `events` dict per role with positive `default_deadline_sec`/`max_deadline_sec` (max > default) and non-empty `expects`; raises `ValueError` with a specific message on first violation. |
| `__main__` CLI | script entrypoint | `tools/review-queue/_coord_roles.py:183` | Runs `load_coord_roles()`, printing an OK summary or an `INVALID:` diagnostic to stderr and exiting 1 on failure. |

### `tools/review-queue/_effect-runner.sh` — shared live/dry-run/test effect boundary

**Purpose:** Provides `echo_effect`, a single indirection point that all review-queue scripts route side-effecting operations (spawning agents, codex-exec, git push, launchd, review-tick) through, so tests can run with `ECHO_EFFECT_MODE=test` or `dry-run` without executing real commands, while `push` always signals non-live mode via a reserved return code.

**Depends on:** none (pure bash).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `echo_effect(kind, -- argv...)` | function | `tools/review-queue/_effect-runner.sh:19` | Validates `kind` is one of `spawn-agent`/`codex-exec`/`push`/`launchd`/`review-tick`, then per `ECHO_EFFECT_MODE` either execs argv (`live`), prints the would-be command and returns `ECHO_EFFECT_NONLIVE_RC` for `push`/0 otherwise (`dry-run`), or no-ops with the same push/non-push split (`test`). |

### `tools/review-queue/_install_reviewer_launchd.sh` — launchd job installer/drift-checker for headless reviewers

**Purpose:** Installs (or checks) the `com.echo.review-queue-<slug>` launchd plist that fires a headless reviewer's 10-minute tick wrapper; fail-closed preflights that the reviewer's CLI executable is resolvable on `PATH` (via `reviewer-bindings.json` argv) before writing anything, and supports `--check` to detect drift between an already-installed plist and the current render (101-retro stale-plist tripwire) and `--smoke` to kickstart one verified tick post-install.

**Depends on:** `tools/review-queue/_reviewer_gate.py` (slug/mode validation and argv resolution), `tools/review-queue/reviewer-bindings.json` (read indirectly via the gate), launchctl/sw_vers/getconf CLIs.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint / arg parsing | script flow | `tools/review-queue/_install_reviewer_launchd.sh:33` | Parses `<slug> [--smoke] [--install-context] [--check]`, sets `SMOKE_REQUESTED`/`INSTALL_CONTEXT_FLAG`/`CHECK_MODE` flags. |
| `render_plist()` | function | `tools/review-queue/_install_reviewer_launchd.sh:85` | Single source of truth for the plist XML content (Label, ProgramArguments pointing at the wrapper, `StartInterval=600`, log paths, `TMPDIR` env var pin); used both for the real install write and the `--check` drift diff. |
| `--check` mode | script flow | `tools/review-queue/_install_reviewer_launchd.sh:130` | Byte-diffs the installed plist against `render_plist()` output without touching the filesystem/launchd; exit 0=match, 1=stale drift (with diff printed), 3=not installed. |
| CLI-on-PATH preflight | script flow | `tools/review-queue/_install_reviewer_launchd.sh:153` | Resolves reviewer argv via `_reviewer_gate.py --print argv_nul` against a placeholder `WT=/preflight/wt`, extracts argv[0], and runs `command -v` on it, aborting before any plist write if the executable is missing. |
| smoke gate + install + kickstart | script flow | `tools/review-queue/_install_reviewer_launchd.sh:194` | Fails closed if `--smoke` requested but no executable `smoke-test-<slug>-runner.sh` exists; otherwise writes the plist, `launchctl bootstrap`/`bootout` (macOS 14+) or `load`/`unload` (older), and optionally kickstarts one tick then runs the smoke script with `--install-context`. |

### `tools/review-queue/_lib.py` — shared frontmatter/schema/git helpers for review-queue scripts

**Purpose:** Small shared library used by `request.py`, `combine.py`, and validator entry points: parses/serializes YAML frontmatter, loads/validates JSON schemas, performs atomic hardlink-based file writes (race-safe publish), and reads `HEAD` SHA / appends to the queue error log. Resolves `REPO_ROOT`/`SCHEMA_DIR`/`REVIEWERS_CONFIG` from env vars so tests can fixture the whole pipeline.

**Depends on:** `jsonschema`, `yaml` (PyYAML) — with a Homebrew-arm64 re-exec fallback (`arch -arm64`) if either import fails on darwin; stdlib `json`/`os`/`re`/`subprocess`/`uuid`/`pathlib`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| import-fallback block | module code | `tools/review-queue/_lib.py:17` | If `jsonschema`/`yaml` import fails on darwin and `ECHO_RQ_ARCH_RETRIED` is unset, re-execs the process under `arch -arm64` once, then re-raises on failure. |
| `REPO_ROOT`, `SCHEMA_DIR`, `REVIEWERS_CONFIG`, `REVIEWS_DIR`, `ERROR_LOG` | module constants | `tools/review-queue/_lib.py:33` | Path constants resolved from `ECHO_REVIEW_QUEUE_REPO_ROOT`/`ECHO_SCHEMA_DIR`/`ECHO_REVIEWERS_CONFIG` env vars (falling back to repo-relative defaults) so the whole pipeline can be redirected onto a fixture tree. |
| `FRONTMATTER_RE` | regex constant | `tools/review-queue/_lib.py:39` | Line-anchored `^---\n(.*?)\n---\n(.*)$` (DOTALL) pattern used to split YAML frontmatter from body without truncating on embedded `---` tokens in string values. |
| `parse_frontmatter(path)` | function | `tools/review-queue/_lib.py:42` | Reads a file, matches `FRONTMATTER_RE`, YAML-parses the frontmatter block with a clear line/column diagnostic on malformed YAML, and returns `(fm_dict, body)`. |
| `serialize_frontmatter(fm, body)` | function | `tools/review-queue/_lib.py:65` | Dumps `fm` back to YAML (`sort_keys=False`) and reassembles the `---\n...\n---\n<body>` document. |
| `load_schema(name)` | function | `tools/review-queue/_lib.py:70` | Reads `<SCHEMA_DIR>/<name>.schema.json` (name ∈ request/reviewer/combined/review-sidecar) and returns the parsed JSON schema. |
| `validate_frontmatter(fm, schema_name)` | function | `tools/review-queue/_lib.py:76` | Runs `jsonschema.validate` of `fm` against the named schema, raising `jsonschema.ValidationError` on violation. |
| `atomic_link_write(final, content)` | function | `tools/review-queue/_lib.py:81` | Writes `content` to a unique temp file then `os.link`s it into `final` (hardlink-based publish that fails atomically if `final` already exists); returns `"ok"` or `"race_lost"` for the caller to handle the loser path. |
| `head_sha(repo_root=None)` | function | `tools/review-queue/_lib.py:102` | Runs `git rev-parse HEAD` in `repo_root` (default `REPO_ROOT`) and returns the trimmed SHA. |
| `iso_utc_now()` | function | `tools/review-queue/_lib.py:114` | Returns the current UTC time formatted as `YYYY-MM-DDTHH:MM:SSZ`. |
| `append_error(context, detail="")` | function | `tools/review-queue/_lib.py:120` | Appends a one-line timestamped entry to `raw/internal/queue-errors.md`, creating parent dirs as needed. |

### `tools/review-queue/_reviewer_gate.py` — REVIEWER_NAME validation + argv/stdin/policy resolution for headless reviewers

**Purpose:** The single gate that all reviewer-tick scripts call to validate `REVIEWER_NAME` against `reviewers.json` and resolve its runtime invocation from `reviewer-bindings.json` (argv, stdin source, sandbox mode, commit policy). Enforces that `codex`/`codex-ops` ("protected wrapper" reviewers) use an exact, gate-owned read-only `codex exec -C <WT> --sandbox read-only --json -` argv template and `commit_policy=wrapper`/`agent_sandbox=read-only`, closing the read-only-child migration invariant.

**Depends on:** `tools/review-queue/_reviewers.py` (`Reviewer`, `load_reviewers`), stdlib `argparse`/`json`/`os`/`shlex`/`sys`/`pathlib`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `GateError` | class | `tools/review-queue/_reviewer_gate.py:48` | `ValueError` subclass used for all gate-side validation failures. |
| `_binding_config_path()` | function | `tools/review-queue/_reviewer_gate.py:52` | Resolves the bindings config path from `ECHO_REVIEWER_BINDINGS_CONFIG` env var or the default `reviewer-bindings.json`. |
| `_load_json(path)` | function | `tools/review-queue/_reviewer_gate.py:57` | Loads and JSON-parses a config file, raising `GateError` on missing file or invalid JSON, and requiring a top-level object. |
| `_argv_sandbox_values(argv, reviewer)` | function | `tools/review-queue/_reviewer_gate.py:69` | Scans an argv list for `--sandbox <val>` or `--sandbox=<val>` occurrences and returns all matched values (last one wins as "effective"). |
| `_enforce_protected_metadata(binding, reviewer, source)` | function | `tools/review-queue/_reviewer_gate.py:89` | Raises `GateError` unless `agent_sandbox=='read-only'` and `commit_policy=='wrapper'`. |
| `_enforce_runtime_contract(binding, reviewer)` | function | `tools/review-queue/_reviewer_gate.py:99` | For protected reviewers, delegates to `_enforce_protected_metadata`; otherwise checks that any explicit `--sandbox` value in argv agrees with `agent_sandbox`. |
| `_validate_binding(raw, reviewer, enforce_runtime=True)` | function | `tools/review-queue/_reviewer_gate.py:117` | Validates the top-level `reviewer-bindings.json` shape (`kind=='reviewer'`, `bindings` array), finds the entry for `reviewer`, checks `mode`/`agent_sandbox`/`commit_policy` presence and (for headless modes) non-empty `argv`/`stdin_from`/`cwd`, and for `ide-manual` that those keys are absent. |
| `_canonical_binding(reviewer)` | function | `tools/review-queue/_reviewer_gate.py:177` | Loads and validates the entry from the DEFAULT (non-env-overridden) bindings file, additionally enforcing protected metadata for `codex`/`codex-ops` — used as the ground truth for the protected-argv allowlist check even when tests override the config path. |
| `_legacy_binding_from_reviewer(reviewer)` | function | `tools/review-queue/_reviewer_gate.py:192` | Bridges old `reviewers.json`-only fixture overrides into a binding-shaped dict by shlex-splitting the legacy `invoke_command` template (stripping any `<` stdin redirect) for non-protected reviewers. |
| `_load_binding(reviewer)` | function | `tools/review-queue/_reviewer_gate.py:232` | Chooses between the legacy bridge (only when `ECHO_REVIEWERS_CONFIG` is set without `ECHO_REVIEWER_BINDINGS_CONFIG` and reviewer isn't protected) and the real `reviewer-bindings.json` validation path. |
| `_substitute(value, reviewer, wt)` | function | `tools/review-queue/_reviewer_gate.py:242` | Replaces `{{REVIEWER}}` and `{{WT}}` placeholders in a binding string, raising `GateError` if `{{WT}}` is referenced but no `wt` was supplied. |
| `_resolve_stdin_from(binding, reviewer, wt)` | function | `tools/review-queue/_reviewer_gate.py:251` | Substitutes placeholders into `stdin_from`, resolving a relative path against `wt`. |
| `_format_argv(argv)` | function | `tools/review-queue/_reviewer_gate.py:263` | Shell-quotes and joins an argv list via `shlex.join`. |
| `_is_codex_executable_token(value)` | function | `tools/review-queue/_reviewer_gate.py:267` | Returns whether a token is exactly the string `"codex"`. |
| `_assert_protected_codex_argv_template(argv, reviewer, source, wt)` | function | `tools/review-queue/_reviewer_gate.py:271` | Verifies an argv vector exactly matches the 8-token `PROTECTED_CODEX_ARGV_TEMPLATE` positionally (argv[0]=`codex`, `-C <wt>`, `--sandbox read-only`, `--json -`), raising `GateError` with the expected vs. actual on any mismatch. |
| `_enforce_protected_argv_allowlist(reviewer, wt, resolved_argv)` | function | `tools/review-queue/_reviewer_gate.py:308` | For protected reviewers, loads the canonical binding's argv, substitutes placeholders, and asserts BOTH the canonical and the resolved argv match the protected template — prevents an env-overridden bindings file from smuggling a different argv shape past the gate. |
| `_resolve_argv(binding, reviewer, wt)` | function | `tools/review-queue/_reviewer_gate.py:338` | Substitutes placeholders into the binding's `argv` list, checks argv[0] is non-empty, and runs the protected allowlist check. |
| `_shell_compat_command(binding, reviewer, wt)` | function | `tools/review-queue/_reviewer_gate.py:353` | Builds a legacy-compatible `"cmd args < stdin"` shell string for the `invoke_command` print field (diagnostic-only; not used for real dispatch). |
| `_require_mode_matches(reviewer, required)` | function | `tools/review-queue/_reviewer_gate.py:362` | Raises `GateError` if `reviewer.mode != required`. |
| `main(argv)` | function | `tools/review-queue/_reviewer_gate.py:367` | CLI entrypoint: reads `REVIEWER_NAME` env var, loads/validates the reviewer from `reviewers.json`, then per `--print <field>` (slash_command/invoke_command/stdin_from/argv_nul/agent_sandbox/commit_policy) resolves and prints the requested field, writing NUL-delimited argv to stdout for `argv_nul`. |

### `tools/review-queue/_reviewers.py` — load + validate `reviewers.json` roster

**Purpose:** Single import point for reading and schema-validating `reviewers.json` (name/mode/required/timeout_hours/slash_command/invoke_command), enforcing mode↔timeout_hours and mode↔invoke_command contracts (headless reviewers need `timeout_hours=null` and a non-empty `invoke_command` containing `{{PROMPT}}`; ide reviewers need a positive `timeout_hours`). Consumed by `request.py`, `combine.py`, and `_reviewer_gate.py`.

**Depends on:** `tools/review-queue/_lib.py` (for `REVIEWERS_CONFIG` path), stdlib `json`/`re`/`sys`/`pathlib`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Reviewer` | class (NamedTuple) | `tools/review-queue/_reviewers.py:36` | Holds `name`, `mode`, `required`, `timeout_hours`, `slash_command`, `invoke_command` for one roster entry. |
| `load_reviewers(config_path=None)` | function | `tools/review-queue/_reviewers.py:48` | Reads `reviewers.json`, constructs `Reviewer` tuples (raising `ValueError` with missing/extra-field diagnostics), validates slug format/uniqueness, mode ∈ {headless, ide}, `required` is bool, mode↔`timeout_hours` contract, and mode↔`invoke_command` contract (headless must have `{{PROMPT}}` token); caches the result process-locally when `config_path is None`. |
| `reset_cache()` | function | `tools/review-queue/_reviewers.py:145` | Test hook clearing the module-level `_CACHED` reviewer tuple. |

### `tools/review-queue/_run_reviewer.sh` — generic headless reviewer tick wrapper (the review-queue runtime core)

**Purpose:** The single wrapper body invoked (via 5-line per-vendor drivers) by launchd every 10 minutes or manually, for each headless reviewer (codex, codex-ops, etc.). Validates `REVIEWER_NAME`, enters an ephemeral detached-HEAD worktree (via `_clean-snapshot.sh`), resolves the reviewer's argv/stdin/commit-policy from `_reviewer_gate.py`, emits coord scheduler-health/tick-start/tick-end events, dispatches the read-only child CLI capturing stdout/stderr/rc, parses the child's final JSON assistant message, validates it against the reviewer schema and against the selected request's binding (item_id/round/spec_commit_sha), then atomically hardlink-publishes the response file, commits+pushes it (with race-loss/duplicate/stale-combined handling), and appends a dogfooding journal entry — all logged to `~/Library/Logs/echo-review-queue-<reviewer>.log` with 10MB rotation.

**Depends on:** `tools/review-queue/_effect-runner.sh` (`echo_effect`), `tools/review-queue/_clean-snapshot.sh` (`echo_enter_clean_snapshot`), `tools/review-queue/_reviewer_gate.py`, `tools/review-queue/_install_reviewer_launchd.sh` (`--check` stale-plist tripwire), `tools/review-queue/coord-emit.sh`, `tools/review-queue/queue_error.sh`, `tools/review-queue/push-with-retry.sh`, `tools/review-queue/commit-reviewer-response.sh`, `tools/review-queue/validate_response_yaml.py`, `tools/review-queue/reviewer-bindings.json`, `.echo/project.json` (coord_ref/reviews_root config), python3/yaml/uuidgen/git CLIs.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| REVIEWER_NAME validation + repo-root cd | script flow | `tools/review-queue/_run_reviewer.sh:29` | Validates `REVIEWER_NAME` matches `^[a-z][a-z0-9-]*$`, resolves `REPO_ROOT` from `ECHO_REVIEW_QUEUE_REPO_ROOT` (default founder's Desktop checkout), and verifies it is a git repo. |
| `project_config_value(key, default_value)` | function | `tools/review-queue/_run_reviewer.sh:46` | Runs an inline Python snippet to read `<repo>/.echo/project.json`, returning `default_value` if the file is absent or the key unset, joining list values with commas. |
| `COORD_REF`/`REVIEWS_ROOT` resolution | script flow | `tools/review-queue/_run_reviewer.sh:72` | Resolves coord ref and reviews-root from env vars or `project_config_value`, rejects unsafe (absolute/traversal) `reviews_root` values, and exports both. |
| PATH augmentation | script flow | `tools/review-queue/_run_reviewer.sh:99` | Prepends Homebrew/local/nodenv/asdf/cargo bin dirs to `PATH` because launchd's stripped-down environment otherwise resolves `python3` to the system interpreter lacking `jsonschema`. |
| reviewer-gate pre-check + log rotation | script flow | `tools/review-queue/_run_reviewer.sh:104` | Runs `_reviewer_gate.py` to validate `REVIEWER_NAME`/mode=headless, then rotates the per-reviewer log file at >10MB into a single `.1` sidecar. |
| stale-plist tripwire | script flow | `tools/review-queue/_run_reviewer.sh:132` | Runs `_install_reviewer_launchd.sh --check` best-effort and logs a loud `STALE_PLIST` or `STALE_PLIST_CHECK_FAILED` warning without ever failing the tick. |
| scheduler-health bootstrap window | script flow | `tools/review-queue/_run_reviewer.sh:152` | Generates a `TICK_RUN_ID`, emits `coord:scheduler_health` at log-redirect-open to open a short bootstrap-scoped deadline distinct from round-tier tick_start/tick_end. |
| worktree entry + argv/stdin/policy resolution | script flow | `tools/review-queue/_run_reviewer.sh:160` | Sources `_clean-snapshot.sh`, checks out `COORD_REF` if non-`main`, then resolves `stdin_from`, NUL-delimited `argv` (via a temp file to observe the Python gate's exit code safely under `set -e`), verifies the executable is on `PATH`, and resolves `commit_policy`, aborting and recording a `queue_error.sh` row on any resolution failure. |
| `emit_scheduler_done()` | function | `tools/review-queue/_run_reviewer.sh:259` | Emits `coord:scheduler_health_done` exactly once (idempotent via `SCHEDULER_DONE_EMITTED`). |
| `emit_tick_start(corr)` | function | `tools/review-queue/_run_reviewer.sh:268` | Emits `coord:tick_start` with the given correlation id via `coord-emit.sh`, best-effort. |
| `emit_tick_end(corr, outcome)` | function | `tools/review-queue/_run_reviewer.sh:276` | Emits `coord:tick_end` with `{"outcome": outcome}` payload, best-effort. |
| `state_get(field)` | function | `tools/review-queue/_run_reviewer.sh:286` | Reads a field out of the JSON `$WRAPPER_STATE_FILE` written by the selection script, printing empty string for null. |
| `binding_capture_get(field)` | function | `tools/review-queue/_run_reviewer.sh:299` | Reads `capture.<field>` for the current reviewer out of `reviewer-bindings.json`. |
| `resolve_capture_path(template)` | function | `tools/review-queue/_run_reviewer.sh:316` | Substitutes `{{REVIEWER}}`/`{{RUN_ID}}`/`{{ITEM}}`/`{{ROUND}}`/`{{REVIEWS_ROOT}}` tokens into a capture path template and makes it absolute relative to `$WT`. |
| `bounded_snippet(file)` | function | `tools/review-queue/_run_reviewer.sh:338` | Reads a file, collapses whitespace, and returns the first 500 chars — used to keep diagnostics bounded. |
| `first_line(text)` | function | `tools/review-queue/_run_reviewer.sh:352` | Returns the first line of a string argument (or empty string). |
| `one_line_snippet(text)` | function | `tools/review-queue/_run_reviewer.sh:361` | Collapses a string's whitespace to single spaces and truncates to 500 chars. |
| `capture_failure_state_file()` | function | `tools/review-queue/_run_reviewer.sh:373` | Resolves the durable local capture-failure ledger path: `ECHO_CAPTURE_FAILURE_STATE_FILE` override, else `<git-common-dir>/echo-review-queue/capture-failures.jsonl` anchored at the ORIGINAL repo (survives worktree deletion), else `~/.echo/review-queue/capture-failures.jsonl`. |
| `record_local_capture_failure(failure_class, diagnostic, iso_ts)` | function | `tools/review-queue/_run_reviewer.sh:397` | Appends a dedup'd JSON line (keyed on reviewer/item_id/round/spec_commit_sha/artifact_path) to the local capture-failure ledger via inline Python, idempotent on the same key. |
| `record_capture_failure(failure_class, diagnostic)` | function | `tools/review-queue/_run_reviewer.sh:452` | Writes a `<reviewer>.capture-failed` marker file with frontmatter in the round dir, appends a line to `raw/internal/queue-errors.md`, records the local ledger entry, and commits+pushes both files via `push-with-retry.sh`. |
| `finish_capture_failure(exit_rc, failure_class, diagnostic)` | function | `tools/review-queue/_run_reviewer.sh:485` | Calls `record_capture_failure`, emits `tick_end(terminal_capture_failure)` regardless of record success, and exits with the record failure's rc (if any) or the original `exit_rc`. |
| `validate_request_binding(response_path)` | function | `tools/review-queue/_run_reviewer.sh:504` | Inline Python: parses the captured response's frontmatter (inlined frontmatter regex, not `_lib` import, to avoid the darwin arch-retry silent-exit-0 failure mode) and checks `reviewer`/`item_id`/`round`/`artifact_sha` match the selected request, exiting 1 with a mismatch diagnostic otherwise. |
| `append_wrapper_journal(response_path, head_sha)` | function | `tools/review-queue/_run_reviewer.sh:562` | Appends a dogfooding journal entry (creating the per-actor month shard with template preamble if absent) to `raw/internal/dogfooding/mcp-interactions-journal-<month>-<reviewer>.md`, then commits+pushes it. |
| wrapper-owned request selection | script flow (inline Python) | `tools/review-queue/_run_reviewer.sh:642` | Reads either the pinned `ECHO_COORD_REQUEST_PATH` or scans `backlog/reviews/*/r*/request.md` glob order for a round where this reviewer is requested, has no existing response/`combined.md`/capture-failure marker (local or committed), and writes a `WRAPPER_STATE_FILE` JSON status (`selected`/`bind_failed`/`stale_combined`/`duplicate_response`/`capture_failed`/`no_candidate`). |
| `read_fm(path)` (inline) | function | `tools/review-queue/_run_reviewer.sh:666` | Inline-Python frontmatter parser mirroring `_lib.FRONTMATTER_RE`, deliberately not importing `_lib` to avoid its jsonschema-import arch-retry re-exec consuming stdin. |
| `write(status, **kwargs)` (inline) | function | `tools/review-queue/_run_reviewer.sh:686` | Inline-Python helper writing the selection status JSON payload to `out_path`. |
| `selected(req, fm)` (inline) | function | `tools/review-queue/_run_reviewer.sh:691` | Inline-Python: writes the `"selected"` status payload with request/round/response/marker paths and request metadata. |
| `local_capture_failure_recorded(fm)` (inline) | function | `tools/review-queue/_run_reviewer.sh:710` | Inline-Python: checks the local capture-failure ledger for a matching key so a prior local-only failure blocks re-selection even before the commit lands. |
| `validate_req(req, pinned_mode)` (inline) | function | `tools/review-queue/_run_reviewer.sh:737` | Inline-Python: validates a pinned request (correlation_id match, reviewer in roster, no combined/duplicate/capture-failed) and calls `selected()` or `write("bind_failed"/...)`. |
| selection-status dispatch | script flow | `tools/review-queue/_run_reviewer.sh:797` | Reads `SELECTION_STATUS`/`CORRELATION_ID` from state and branches on `no_candidate`/`bind_failed`/`stale_combined`/`duplicate_response`/`capture_failed`/`selected`, emitting appropriate tick_start/tick_end events and exit codes for each. |
| request metadata + capture-kind validation | script flow | `tools/review-queue/_run_reviewer.sh:844` | Reads `ITEM_ID`/`ROUND_NUM`/`SPEC_COMMIT_SHA`/`ARTIFACT_PATH` from state (failing closed if any missing), and requires `binding_capture_get kind == stdout_json`. |
| review-packet assembly + child dispatch | script flow | `tools/review-queue/_run_reviewer.sh:863` | Resolves capture stdout/stderr/rc/final-message paths, snapshots the artifact at `SPEC_COMMIT_SHA` via `git show`, builds a `review-packet.md` (request + artifact snapshot), then dispatches the read-only child via `echo_effect codex-exec` with stdin/stdout/stderr redirected to the capture files. |
| final-message extraction (inline Python) | script flow | `tools/review-queue/_run_reviewer.sh:935` | `assistant_text`/`text_from_content` walk each JSON line of captured stdout looking for an assistant/agent message, taking the LAST matching candidate as the final response text, written to `CAPTURE_FINAL`; raises with a `json_errors` count if none found. |
| response validation + publish + journal | script flow | `tools/review-queue/_run_reviewer.sh:1009` | Runs `validate_response_yaml.py` and `validate_request_binding` against `CAPTURE_FINAL` (each failure routed through `finish_capture_failure`), re-checks for a stale `combined.md`, atomically hardlinks the response into place (race-safe, exits 0 on `duplicate_response`), fetches `COORD_REF` and checks upstream duplication, then commits+pushes via `commit-reviewer-response.sh`, emits `tick_end(completed)`, and appends the wrapper journal entry. |

### `tools/review-queue/_sidecar_validate.py` — shared review-sidecar schema + heading validator

**Purpose:** Pure validation contract for committed `*.review.md` sidecars (produced by `review-pending`), shared by both the hyphenated `validate-sidecar.py` CLI (not importable as a module) and other callers, checking JSON-schema conformance plus required markdown headings.

**Depends on:** `tools/review-queue/_lib.py` (`jsonschema`, `load_schema`), stdlib `datetime`/`re`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REQUIRED_HEADINGS` | constant | `tools/review-queue/_sidecar_validate.py:15` | Tuple of markdown `##` headings every sidecar body must contain: Verdict, Pre-merge fixups, Expected merge conflicts, Follow-up items. |
| `BLOCK_ONLY_HEADING` | constant | `tools/review-queue/_sidecar_validate.py:21` | `"Open questions for founder"` heading required only when `verdict == "block"`. |
| `PRODUCER` | constant | `tools/review-queue/_sidecar_validate.py:22` | `"review-pending-orchestrator"` — the expected sidecar producer identity. |
| `_coerce_reviewed_at(value)` | function | `tools/review-queue/_sidecar_validate.py:25` | Normalizes a `datetime` (converting tz-aware to UTC) into the `%Y-%m-%dT%H:%M:%SZ` string format expected by the schema. |
| `_headings(body)` | function | `tools/review-queue/_sidecar_validate.py:31` | Regex-extracts the set of `## <heading>` lines present in the markdown body. |
| `validate(fm, body)` | function | `tools/review-queue/_sidecar_validate.py:35` | Coerces `reviewed_at`, validates `fm` against the `review-sidecar` JSON schema (with format checking), then checks all `REQUIRED_HEADINGS` are present and `BLOCK_ONLY_HEADING` is present when `verdict=='block'`; returns an error string or `None`. |

### `tools/review-queue/check-coupled-invariants.sh` — mechanical pre-merge drift checks for coupled file pairs

**Purpose:** Runs a battery of mechanical consistency checks across files that must stay in sync but have no compiler/type system to enforce it: `package.json` vs `package-lock.json`, `skills/` vs `.claude/commands/` adapters, `src/mcp/server.ts` tool registrations vs tool files/tests, and pending-review sidecar schema validity. Intended as a pre-merge gate.

**Depends on:** `tools/sync-skills.sh --check`, `tools/review-queue/validate-sidecar.py`, node CLI (inline JS), python3 (inline).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/check-coupled-invariants.sh:11` | Prints an `INVARIANT FAIL:` message to stderr and increments the `failures` counter. |
| `check_package_lock()` | function | `tools/review-queue/check-coupled-invariants.sh:16` | Inline Node script comparing `package.json` and `package-lock.json`'s root `packages[""]` entry across dependency fields plus name/version, failing on any mismatch. |
| `check_skill_adapters()` | function | `tools/review-queue/check-coupled-invariants.sh:57` | Runs `tools/sync-skills.sh --check` if present, surfacing its output and failing on drift between `skills/` and `.claude/commands/`. |
| `check_mcp_registration()` | function | `tools/review-queue/check-coupled-invariants.sh:69` | Inline Python: regex-scans `src/mcp/server.ts` for `import { registerX } from './tools/Y.js'` pairs, verifies each has a corresponding tool file that is actually called and contains a `server.registerTool('<name>')` literal recognized by `tests/mcp/tools/recent-work-context.test.ts`. |
| `check_pending_review_sidecars()` | function | `tools/review-queue/check-coupled-invariants.sh:115` | Iterates all git-tracked `backlog/pending_review/*.review.md` files and runs `validate-sidecar.py` on each, failing loudly on the first invalid sidecar. |
| top-level check sequence | script flow | `tools/review-queue/check-coupled-invariants.sh:130` | Runs all four checks in order and exits non-zero if any recorded a failure, else prints `OK: coupled invariants hold`. |

### `tools/review-queue/combine.py` — strategist watcher's round-combine helper

**Purpose:** Polls `backlog/reviews/<item_id>/r<N>/` round directories for rounds eligible to combine (all required reviewers responded, or timed out per-reviewer), computes a verdict roll-up across an N-reviewer roster, matches convergent/divergent findings via union-find + cross-refs, and writes `combined.md`. Also guards against mutating the founder's live checkout and commits/pushes the result.

**Depends on:** `tools/review-queue/_lib.py`, `tools/review-queue/_reviewers.py`, `tools/review-queue/push-with-retry.sh`, `.echo/project.json`, `combined.schema.json` (via `_lib.load_schema`); external: none beyond stdlib + subprocess/git.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `DEFAULT_PROJECT_CONFIG` | const | `tools/review-queue/combine.py:48` | Fallback project config (coord_ref, reviews_root, reviewers, spec_dir) when `.echo/project.json` absent. |
| `SECTION_RE` | const (regex) | `tools/review-queue/combine.py:55` | Matches `§...` section-citation tokens in a finding's `where` field. |
| `parse_iso_utc(s)` | function | `tools/review-queue/combine.py:61` | Parses an ISO-8601 UTC timestamp string into a `datetime`. |
| `load_project_config(repo_root)` | function | `tools/review-queue/combine.py:65` | Reads and validates `.echo/project.json`, merging over defaults. |
| `safe_rel(value, label)` | function | `tools/review-queue/combine.py:90` | Rejects absolute paths / `..` traversal, returning a safe relative `Path`. |
| `normalize_where(where)` | function | `tools/review-queue/combine.py:97` | Splits a finding's `where` string into (primary `§section`, related sections). |
| `cross_refs_match(a, a_round, a_reviewer, a_index, b, b_round, b_reviewer, b_index)` | function | `tools/review-queue/combine.py:115` | Determines whether two findings' `cross_ref` fields mutually point at each other (round+reviewer+index match). |
| `compute_combined_verdict(verdicts, requested, required_set)` | function | `tools/review-queue/combine.py:147` | Applies the §AC4 verdict roll-up table generalized to N reviewers, returning `(combined_verdict, escalated_to_founder)`. |
| `cleanup_orphans(round_dir, now_ts, reviewer_slugs)` | function | `tools/review-queue/combine.py:227` | Deletes `.tmp.*` orphan files older than 30 minutes, matching the active reviewer-slug + infra-name alternation. |
| `_read_requested_reviewers(request_path)` | function | `tools/review-queue/combine.py:263` | Parses a round's `request.md` and returns its `requested_reviewers` list (empty on missing/malformed). |
| `find_eligible_rounds(repo_root, reviews_root, timeout_hours_override, now)` | function | `tools/review-queue/combine.py:279` | Scans all round dirs and returns those eligible to combine per the required/optional-roster timeout-gate rules. |
| `read_response(path)` | function | `tools/review-queue/combine.py:397` | Parses a reviewer response file's frontmatter + `findings` list. |
| `_one_line(s)` | function | `tools/review-queue/combine.py:403` | Collapses whitespace/newlines in a string to a single line. |
| `_NON_REVIEWER_RESPONSE_FIELDS` | const | `tools/review-queue/combine.py:407` | Set of schema `_response`-suffixed fields that are NOT per-reviewer pointers (e.g. `offending_response`). |
| `_schema_response_fields()` | function | `tools/review-queue/combine.py:410` | Reads `combined.schema.json` and returns the schema-declared `<slug>_response` field names. |
| `build_malformed_combined(round_dir, repo_root, now, requested, malformed)` | function | `tools/review-queue/combine.py:429` | Builds the escalation `combined.md` payload when one or more reviewer responses fail YAML parse. |
| `_UnionFind` | class | `tools/review-queue/combine.py:508` | Union-find with path compression for transitive cross-ref-bridged convergence of finding anchors. |
| `_UnionFind.__init__(self, keys)` | method | `tools/review-queue/combine.py:517` | Initializes each key as its own parent. |
| `_UnionFind.find(self, k)` | method | `tools/review-queue/combine.py:520` | Finds root with path compression. |
| `_UnionFind.union(self, a, b)` | method | `tools/review-queue/combine.py:526` | Merges the sets containing `a` and `b`. |
| `build_combined(round_dir, now, repo_root=None)` | function | `tools/review-queue/combine.py:532` | Core combine logic: parses all requested reviewer responses, computes verdict roll-up, unions convergent/divergent findings, and renders `combined.md` frontmatter+body. |
| `write_combined(round_dir, fm, body)` | function | `tools/review-queue/combine.py:819` | Atomically create-writes `combined.md` via `_lib.atomic_link_write`. |
| `_git_toplevel(path)` | function | `tools/review-queue/combine.py:825` | Runs `git rev-parse --show-toplevel` and returns the resolved `Path`. |
| `_registered_worktrees(repo_root)` | function | `tools/review-queue/combine.py:837` | Parses `git worktree list --porcelain` into a set of registered worktree paths. |
| `_is_valid_clean_snapshot(repo_root)` | function | `tools/review-queue/combine.py:853` | Validates that the repo root is a registered `$TMPDIR/echo-<role>-<uuid>` clean-snapshot worktree, not an ad-hoc clone. |
| `_founder_live_checkout()` | function | `tools/review-queue/combine.py:874` | Returns the resolved path of the founder's live `~/Desktop/Project_echo` checkout. |
| `assert_git_mutation_target_safe(repo_root, allow_live)` | function | `tools/review-queue/combine.py:878` | Refuses to git-mutate the founder's live checkout unless it's a validated clean snapshot or `--allow-live` is passed. |
| `main(argv)` | function | `tools/review-queue/combine.py:903` | CLI entry: resolves config, finds eligible rounds (one per tick unless `--all`), pulls, builds+writes `combined.md` per round, logs malformed responses to `queue-errors.md`, commits and pushes. |

### `tools/review-queue/commit-reviewer-response.sh` — reviewer-response validate/commit/push helper

**Purpose:** Shared helper invoked by each reviewer's canonical loop to validate a `<reviewer>.md` response against `reviewer.schema.json`, then commit and push it; on validation failure it quarantines the file (renames with `.invalid.<ts>` suffix) and logs to `raw/internal/queue-errors.md` so the polling step regenerates on next tick.

**Depends on:** `tools/review-queue/validate.py`, `tools/review-queue/push-with-retry.sh`, `tools/review-queue/_effect-runner.sh`; external: `python3` (jsonschema, yaml), git.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/commit-reviewer-response.sh:1` | Validates `$REVIEWER_PATH` via `validate.py reviewer`; on failure quarantines the file and appends a `VALIDATION-FAIL` row to `queue-errors.md` then exits 1; on success (and only in live effect mode) `git add`, `git commit -m "review-r<N>: <reviewer> on <item_id>"`, and calls `push-with-retry.sh`. In non-live `ECHO_EFFECT_MODE`, refuses to commit and returns the effect-runner's sentinel/non-live status. |

### `tools/review-queue/coord-emit.sh` — MCP coord_emit event wrapper

**Purpose:** Standalone executable that POSTs a JSON-RPC `coord_emit` call to the ECHO MCP daemon, used identically from `_run_reviewer.sh`, reviewer skill steps run under `codex exec`/`claude -p`, and post-push hooks. Always exits 0 (daemon-down must never abort a queue tick) while emitting distinct stderr diagnostics for daemon-rejection, HTTP non-2xx, and (silently) daemon-unreachable cases.

**Depends on:** `curl`; env vars `REVIEWER_NAME`, `ECHO_MCP_URL`/`ECHO_MCP_PORT`; the ECHO MCP daemon's `coord_emit` tool.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/coord-emit.sh:1` | Parses `<event_type> --correlation-id=|--tick-run-id= [--payload=]`, validates exactly one tier key and `REVIEWER_NAME` set, builds an ISO-8601-seconds `emitted_at`, POSTs the `coord_emit` JSON-RPC call with an `X-Echo-Role` header, and branches on HTTP status/`isError` to print (or suppress) a single diagnostic stderr line, always exiting 0. |

### `tools/review-queue/dispatch-next-round.py` — strategist watcher post-disposition state machine

**Purpose:** Implements the three AC3.5 dispatch branches after a strategist dispositions a combined round: (a) terminal no-op, (b) invoke `request.py` for the next round and set `next_round`, (c) append an explicit verification-waiver line. Performs file mutations only; the caller owns git add/commit/push.

**Depends on:** `tools/review-queue/_lib.py`, `tools/review-queue/request.py` (invoked as subprocess).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VALID_VERDICTS` | const | `tools/review-queue/dispatch-next-round.py:50` | Allowed verdict values: proceed, proceed_after_patches, pushback. |
| `VALID_CLASSES` | const | `tools/review-queue/dispatch-next-round.py:51` | Allowed spec classes: narrow, structural-reform. |
| `WAIVER_PREFIX` | const | `tools/review-queue/dispatch-next-round.py:52` | Literal prefix `"verification waived; rationale:"` appended in branch (c). |
| `_bool_arg(s)` | function | `tools/review-queue/dispatch-next-round.py:55` | argparse type-converter for `"true"`/`"false"` strings to bool. |
| `_atomic_replace(final, content)` | function | `tools/review-queue/dispatch-next-round.py:65` | Overwrite-allowed atomic write via temp file + `os.replace` (distinct from create-only `_lib.atomic_link_write`). |
| `_update_combined_next_round(combined_path, next_round)` | function | `tools/review-queue/dispatch-next-round.py:78` | Sets `combined.md`'s `next_round` frontmatter field idempotently, validating against the combined schema. |
| `_append_waiver_line(combined_path, rationale)` | function | `tools/review-queue/dispatch-next-round.py:89` | Appends the waiver line to `combined.md`'s body idempotently. |
| `_resolve_request_py()` | function | `tools/review-queue/dispatch-next-round.py:103` | Returns the argv prefix `[sys.executable, request.py]` for subprocess invocation. |
| `_current_artifact_is_proposed(combined_path)` | function | `tools/review-queue/dispatch-next-round.py:109` | Checks whether the round's `request.md` artifact_path lives under `backlog/proposed/`. |
| `main(argv)` | function | `tools/review-queue/dispatch-next-round.py:123` | Parses CLI args, loads `combined.md` for `<item_id>/r<N>`, and dispatches to branch (a)/(b)/(c) per verdict + patches_applied + proposed-stage exception. |
| `_branch_a(combined_path)` | function | `tools/review-queue/dispatch-next-round.py:162` | Terminal no-op branch; asserts `next_round` is still null. |
| `_branch_b(args, repo_root, combined_path, n)` | function | `tools/review-queue/dispatch-next-round.py:176` | Invokes `request.py` for round N+1 (inheriting the current round's `requested_reviewers` roster), then sets `next_round=N+1`. |
| `_branch_c(args, combined_path)` | function | `tools/review-queue/dispatch-next-round.py:221` | Appends the explicit-waiver rationale line; leaves `next_round` null. |

### `tools/review-queue/emit-sidecar.py` — review-pending sidecar emitter

**Purpose:** Validates a JSON descriptor (item_id, verdict, test_counts, body sections) and renders it into a schema-valid `backlog/pending_review/<item_id>.review.md` sidecar, atomically creating or replacing the file.

**Depends on:** `tools/review-queue/_lib.py`, `tools/review-queue/_sidecar_validate.py`; external: git (for repo-root resolution).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `ITEM_ID_RE` | const (regex) | `tools/review-queue/emit-sidecar.py:20` | Validates review-sidecar item_id pattern `YYYY-MM-DD-###[a]-slug`. |
| `ALLOWED_DESCRIPTOR_KEYS` | const | `tools/review-queue/emit-sidecar.py:21` | Whitelist of top-level descriptor JSON keys. |
| `REQUIRED_BODY_KEYS` | const | `tools/review-queue/emit-sidecar.py:22` | Required `body` object keys: verdict, pre_merge_fixups, expected_merge_conflicts, followups. |
| `_die(message)` | function | `tools/review-queue/emit-sidecar.py:25` | Prints to stderr and raises `SystemExit(1)`. |
| `_load_descriptor(path)` | function | `tools/review-queue/emit-sidecar.py:30` | Reads the descriptor JSON from a file path or stdin (`-`/None). |
| `_repo_root()` | function | `tools/review-queue/emit-sidecar.py:46` | Resolves the git repo toplevel via subprocess. |
| `_require_string(mapping, key, where)` | function | `tools/review-queue/emit-sidecar.py:60` | Asserts a mapping key is a string, else dies with a labeled error. |
| `_validate_descriptor(data)` | function | `tools/review-queue/emit-sidecar.py:67` | Validates descriptor shape (unknown keys, item_id pattern, producer/reviewed_at not user-supplied, body keys, block-verdict open_questions requirement) and builds the frontmatter dict. |
| `_section(heading, content)` | function | `tools/review-queue/emit-sidecar.py:114` | Renders a `## heading` markdown section. |
| `_render_body(body_data, verdict)` | function | `tools/review-queue/emit-sidecar.py:118` | Assembles the sidecar body from Verdict/Pre-merge fixups/Expected merge conflicts/Follow-ups (+Open questions if block). |
| `_finalize(target, content, replace)` | function | `tools/review-queue/emit-sidecar.py:141` | Writes to a temp file, re-parses + re-validates it, then atomically links (create) or replaces (`--replace`) the target; cleans up temp file on any failure. |
| `main(argv)` | function | `tools/review-queue/emit-sidecar.py:170` | CLI entry: loads descriptor (`--input` or stdin), validates, finalizes to `backlog/pending_review/<item_id>.review.md`, prints the target path. |

### `tools/review-queue/install-codex-reviewer-launchd.sh` — codex reviewer launchd installer driver

**Purpose:** 4-line driver that delegates to the shared `_install_reviewer_launchd.sh` helper with the reviewer slug `codex`, forwarding any `--smoke` flag.

**Depends on:** `tools/review-queue/_install_reviewer_launchd.sh`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/install-codex-reviewer-launchd.sh:1` | `exec`s `_install_reviewer_launchd.sh codex "$@"`. |

### `tools/review-queue/promote.py` — proposed→ready promotion and stale-ready bounce helper

**Purpose:** Promotes a `backlog/proposed/<id>.md` item to `backlog/ready/<id>.md` once its review round is terminal-promotable (no escalation, no unresolved placeholders, claim-ready convergence marker present, content-identity matches the reviewed SHA), stamping a `ready_content_sha` seal; also bounces stale/tampered `ready/` items back to `proposed/` when the seal doesn't match. Supports `stage-only` (mutate worktree, caller commits) and `commit-push` (mutate+commit+push+remote-verify) effect modes.

**Depends on:** `tools/review-queue/_lib.py`, `tools/blocked.py`, `tools/review-queue/push-with-retry.sh`; external: git.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VALID_MODES` | const | `tools/review-queue/promote.py:30` | `("stage-only", "commit-push")` effect-boundary modes. |
| `SHA_RE` | const (regex) | `tools/review-queue/promote.py:31` | Matches a 64-hex-char sha256 content hash. |
| `Refusal` | class | `tools/review-queue/promote.py:34` | Exception type for all user-facing promotion/bounce refusals. |
| `repo_root_from_args(value)` | function | `tools/review-queue/promote.py:38` | Resolves repo root from `--repo-root` or `git rev-parse --show-toplevel`. |
| `run_git(repo_root, args, check=True)` | function | `tools/review-queue/promote.py:50` | Runs a git subprocess in `repo_root`, capturing output. |
| `split_frontmatter_text(text)` | function | `tools/review-queue/promote.py:60` | Splits a `---\n...\n---\n` document into (frontmatter-head, body) text, raising `Refusal` if malformed. |
| `set_frontmatter_scalar(text, key, value)` | function | `tools/review-queue/promote.py:69` | Sets or inserts a scalar frontmatter key (used for `ready_content_sha`), preserving surrounding text. |
| `remove_frontmatter_key(text, key)` | function | `tools/review-queue/promote.py:86` | Removes a frontmatter key line (used to strip `ready_content_sha` on bounce). |
| `rel(path, repo_root)` | function | `tools/review-queue/promote.py:92` | Returns `path` as a string relative to `repo_root`. |
| `append_queue_error(repo_root, context, detail="")` | function | `tools/review-queue/promote.py:96` | Appends a timestamped diagnostic row to `raw/internal/queue-errors.md`. |
| `git_show(repo_root, ref, artifact_path)` | function | `tools/review-queue/promote.py:105` | Reads a file's content at a given git ref via `git show`. |
| `request_for_round(repo_root, item_id, round_n)` | function | `tools/review-queue/promote.py:112` | Loads a round's `request.md` frontmatter and returns `(fm, artifact_path)`, requiring artifact_path + spec_commit_sha. |
| `terminal_promotable(repo_root, item_id, round_n)` | function | `tools/review-queue/promote.py:126` | Checks `combined.md` for round N is terminal: not escalated, `next_round` null, no unresolved placeholders, has `claim-ready after R<N>` marker, and no r<N+1> request exists. |
| `ready_seal_status(path)` | function | `tools/review-queue/promote.py:145` | Verifies a `ready/` item's `ready_content_sha` frontmatter field matches its actual normalized content hash. |
| `remote_has(repo_root, path_rel)` | function | `tools/review-queue/promote.py:159` | Fetches origin/main and checks whether a path exists at that ref via `git cat-file -e`. |
| `commit_push(repo_root, message, boundary_rel)` | function | `tools/review-queue/promote.py:165` | Commits staged changes, pushes via `push-with-retry.sh`, then verifies the boundary path is visible on `origin/main`. |
| `promote_item(repo_root, item_id, round_n, mode)` | function | `tools/review-queue/promote.py:187` | Full promotion flow: validates terminal-promotability, verifies the current `proposed/` content matches the reviewed SHA, stamps `ready_content_sha`, `git mv`s to `ready/`, and optionally commits+pushes. |
| `bounce_item(repo_root, item_id, mode)` | function | `tools/review-queue/promote.py:232` | Bounces a `ready/` item back to `proposed/` when its seal is invalid, stripping the stale sha and logging a `STALE_READY_BOUNCED` queue error. |
| `recover_promotions(repo_root, mode)` | function | `tools/review-queue/promote.py:257` | Scans all `combined.md` files for any terminal-promotable proposed item not yet promoted, and promotes the first found. |
| `bounce_stale_ready(repo_root, mode)` | function | `tools/review-queue/promote.py:276` | Scans `backlog/ready/*.md` for the first item with an invalid seal and bounces it. |
| `main(argv)` | function | `tools/review-queue/promote.py:287` | CLI entry with subcommands `promote`, `recover`, `bounce`, `bounce-stale-ready`; catches `Refusal`/OSError/etc. and prints `PROMOTE REFUSED: ...` on exit 1. |

### `tools/review-queue/push-with-retry.sh` — shared push-with-retry helper

**Purpose:** Common push helper used by reviewer-response pushes, `combine.py`'s combined.md push, and the strategist's patch+next-request push. Retries `pull --rebase=merges` + `push origin HEAD:<coord_ref>` up to twice; on both failures, logs a `PUSH-RACE-FALLBACK` row to `queue-errors.md` and exits 1, leaving the local commit unpushed for the watcher to surface.

**Depends on:** `tools/review-queue/_effect-runner.sh`, `.echo/project.json` (via inline `python3` snippet); external: git, python3.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/push-with-retry.sh:1` | Resolves `COORD_REF` from `$ECHO_REVIEW_QUEUE_COORD_REF` or `.echo/project.json` (refusing silently to fall back to `main` if config declares a non-default ref and the env var is unset), then attempts up to two `pull --rebase=merges && push origin HEAD:$COORD_REF` cycles via the effect-runner; on exhaustion, appends a `PUSH-RACE-FALLBACK` line to `raw/internal/queue-errors.md` and exits 1. |

### `tools/review-queue/queue_error.sh` — durable queue-error commit+push helper

**Purpose:** Appends a single diagnostic row (pre-spawn or per-round shape) to `raw/internal/queue-errors.md` and pushes it to origin/main immediately, before a caller's cleanup trap can discard an ephemeral worktree.

**Depends on:** `tools/review-queue/push-with-retry.sh`; env vars `REVIEWER_NAME`, `ECHO_QUEUE_ERROR_DIAGNOSTIC_TAG`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/queue_error.sh:1` | Validates arg count (2 or 4) and `REVIEWER_NAME`, writes either the pre-spawn (`reviewer=... failure=... diagnostic=...`) or per-round (`reviewer=... failure=... spec=...@...`) row to `queue-errors.md`, then `git add`+commit+push (via `push-with-retry.sh`) if the diff is non-empty. |

### `tools/review-queue/request.py` — round request.md writer

**Purpose:** Writes a new `backlog/reviews/<item_id>/r<N>/request.md` naming the artifact, spec commit SHA, requested reviewer roster, and a fresh `correlation_id`; implements race-loser semantics so concurrent same-round writes are idempotent at identical SHA and fail loudly at differing SHA.

**Depends on:** `tools/review-queue/_lib.py`, `tools/review-queue/_reviewers.py`, `.echo/project.json`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `VALID_CLASSES` | const | `tools/review-queue/request.py:29` | Allowed `--class` values: narrow, structural-reform. |
| `DEFAULT_PROJECT_CONFIG` | const | `tools/review-queue/request.py:30` | Fallback project config mirroring `combine.py`'s default. |
| `_valid_reviewers()` | function | `tools/review-queue/request.py:38` | Returns the current reviewer-name enum sourced from `reviewers.json` via `_reviewers.load_reviewers()`. |
| `load_project_config(repo_root)` | function | `tools/review-queue/request.py:45` | Reads and validates `.echo/project.json`, raising `ValueError` on malformed config. |
| `_safe_rel(value, label)` | function | `tools/review-queue/request.py:70` | Rejects absolute/traversal paths, mirroring `combine.py`'s `safe_rel`. |
| `find_artifact(item_id, repo_root, spec_dir="backlog")` | function | `tools/review-queue/request.py:77` | Locates the backlog item file across proposed/ready/claimed/pending_review/complete stages (or a direct path), raising `FileNotFoundError` if absent. |
| `main(argv)` | function | `tools/review-queue/request.py:89` | CLI entry: resolves config/reviewers/artifact, computes HEAD SHA (or `--spec-sha` override), builds and atomically create-writes `request.md` frontmatter+body, handling the race-loser same/different-SHA comparison. |

### `tools/review-queue/run-claude-reviewer.sh` — Claude reviewer launcher

**Purpose:** 5-line driver setting `REVIEWER_NAME=claude` and delegating to the shared `_run_reviewer.sh` wrapper body used by every headless reviewer.

**Depends on:** `tools/review-queue/_run_reviewer.sh`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/run-claude-reviewer.sh:1` | `exec env REVIEWER_NAME=claude _run_reviewer.sh`. |

### `tools/review-queue/run-codex-ops-reviewer.sh` — codex-ops reviewer launcher

**Purpose:** 5-line driver setting `REVIEWER_NAME=codex-ops` and delegating to `_run_reviewer.sh`.

**Depends on:** `tools/review-queue/_run_reviewer.sh`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/run-codex-ops-reviewer.sh:1` | `exec env REVIEWER_NAME=codex-ops _run_reviewer.sh`. |

### `tools/review-queue/run-codex-reviewer.sh` — codex reviewer launcher

**Purpose:** 5-line driver setting `REVIEWER_NAME=codex` and delegating to `_run_reviewer.sh`.

**Depends on:** `tools/review-queue/_run_reviewer.sh`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/run-codex-reviewer.sh:1` | `exec env REVIEWER_NAME=codex _run_reviewer.sh`. |

### `tools/review-queue/smoke-test-claude-runner.sh` — end-to-end smoke test for the Claude reviewer wrapper

**Purpose:** Builds an isolated tmpdir repo with a local bare "origin" and a synthetic ready-item + r1 request, invokes `run-claude-reviewer.sh` against it, and asserts hard isolation (no production-origin leakage) plus functional correctness (valid `claude.md` schema + expected commit message) when a response is produced. Fails open (exit 0, skip) when the `claude` CLI isn't installed unless `--install-context` is passed, in which case it fails closed.

**Depends on:** `tools/review-queue/run-claude-reviewer.sh`, `.claude/commands/review-queue-claude.md`, `tools/review-queue/validate.py`; external: git, `claude` CLI.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `cleanup()` | function | `tools/review-queue/smoke-test-claude-runner.sh:50` | Removes the smoke work and origin tmpdirs on trap EXIT. |
| `fail(msg)` | function | `tools/review-queue/smoke-test-claude-runner.sh:151` | Prints a `smoke FAIL:` message (dumping the last 50 lines of the wrapper log if present) and exits 1. |
| entrypoint flow | script | `tools/review-queue/smoke-test-claude-runner.sh:1` | Preflights the `claude` CLI (fail-open/closed per `--install-context`); creates bare origin + work repo with copied `.claude/commands/` + `tools/review-queue/`; commits a synthetic ready item and pushes; writes and pushes a synthetic r1 `request.md`; invokes the wrapper with `ECHO_REVIEW_QUEUE_REPO_ROOT` pointed at the smoke repo; asserts remote-URL/production-origin isolation; if `claude.md` was produced, validates it against `reviewer.schema.json` and checks the HEAD commit message. |

### `tools/review-queue/smoke-test-codex-runner.sh` — end-to-end isolated smoke test for the Codex reviewer wrapper

**Purpose:** AC5 smoke test for item 041. Builds an isolated tmpdir working repo + bare origin fixture (synthetic item `2026-05-12-999-smoke-test-synthetic`), copies the reviewer prompt/tooling into it, seeds a request.md, then invokes `run-codex-reviewer.sh` against the fixture via `ECHO_REVIEW_QUEUE_REPO_ROOT` override, asserting hard isolation from the production GitHub origin and functional success (codex.md produced, schema-valid, correct commit message).

**Depends on:** tools/review-queue/run-codex-reviewer.sh, tools/review-queue/validate.py, .claude/commands/review-queue-codex.md, .claude/commands/review-queue-cursor.md, external: git, python3

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `cleanup()` | function | `tools/review-queue/smoke-test-codex-runner.sh:25` | Removes both tmpdirs (`SMOKE_WORK`, `SMOKE_ORIGIN`) on exit via trap. |
| `fail(msg)` | function | `tools/review-queue/smoke-test-codex-runner.sh:155` | Prints a FAIL diagnostic plus last 50 lines of the wrapper log, then exits 1. |

### `tools/review-queue/status-codex-reviewer-launchd.sh` — launchd status reporter for the Codex reviewer job

**Purpose:** AC2 of item 041. Prints the `launchctl list` entry for `com.echo.review-queue-codex` and the last 10 lines of its log file for at-a-glance operational status.

**Depends on:** none (shells out to `launchctl`, reads `~/Library/Logs/echo-review-queue-codex.log`)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/review-queue/status-codex-reviewer-launchd.sh:1` | Sequential flow: query launchctl for the label, print "not loaded" if absent, then tail the log file (or note it doesn't exist). |

### `tools/review-queue/test-check-coupled-invariants.sh` — test for the pre-merge coupled-file invariant checker

**Purpose:** AC4 test asserting `check-coupled-invariants.sh` catches (i) package.json bumped with stale package-lock.json, (ii) `skills/` edited without `.claude/commands/` resync, (iii) a newly registered MCP tool with no matching tool file/test entry, and that a fully coherent tree passes all three.

**Depends on:** tools/review-queue/check-coupled-invariants.sh, external: git, sed

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/test-check-coupled-invariants.sh:20` | Prints FAIL diagnostic and exits 1. |
| `make_fixture()` | function | `tools/review-queue/test-check-coupled-invariants.sh:23` | Builds a throwaway git repo with a coherent package.json/package-lock.json pair, an in-sync skills/.claude/commands pair (with a stubbed `sync-skills.sh --check`), and a registered MCP tool trio (server.ts + tool file + recognizing test), commits baseline, and echoes the fixture path. |
| `run_checker(dir)` | function | `tools/review-queue/test-check-coupled-invariants.sh:103` | Runs the copied `check-coupled-invariants.sh` inside the fixture dir and returns its exit code. |

### `tools/review-queue/test-clean-snapshot.sh` — AC1 test for the shared clean-snapshot substrate and combine.py's live-checkout guard

**Purpose:** Verifies `echo_enter_clean_snapshot` creates a detached worktree at `$TMPDIR/echo-<role>-<uuid>` pinned to `origin/main`, exports `$WT`/`ECHO_REVIEW_QUEUE_REPO_ROOT`, and discards on trap exit; then, via a Python harness that imports `combine.py` directly, verifies `assert_git_mutation_target_safe` refuses the founder's live checkout unless `--allow-live`, accepts valid snapshots, refuses a stale-env bypass, and accepts a 044-style temp clone.

**Depends on:** tools/review-queue/_clean-snapshot.sh, tools/review-queue/combine.py, external: git, python3

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/test-clean-snapshot.sh:25` | Prints FAIL diagnostic and exits 1. |
| `git(cwd, *args)` (embedded Python) | function | `tools/review-queue/test-clean-snapshot.sh:96` | Runs a git subprocess in the given cwd, raising on failure. |
| `expect(cond, msg)` (embedded Python) | function | `tools/review-queue/test-clean-snapshot.sh:102` | Appends `msg` to the `failures` list if `cond` is false, used to accumulate multiple guard-check assertions before exiting. |

### `tools/review-queue/test-dispatch-next-round.sh` — smoke test for the AC3.5 watcher post-combine state-machine helper

**Purpose:** Drives `dispatch-next-round.py` end-to-end against a tmpdir fixture: builds a stub backlog item + r1 request/codex/cursor responses landing `proceed_after_patches` on a HIGH finding, runs `combine.py`, then `dispatch-next-round.py` in the "(b)" branch expecting it to write `r2/request.md` and set `next_round: 2` in `r1/combined.md`; re-invokes at the same SHA to assert idempotent no-op (byte-identical output). Not run from vitest; ad-hoc shell debugging aid.

**Depends on:** tools/review-queue/combine.py, tools/review-queue/dispatch-next-round.py, external: python3, shasum

**Symbols:**

(no functions defined; sequential fixture-build-and-assert script, entrypoint at `tools/review-queue/test-dispatch-next-round.sh:1`)

### `tools/review-queue/test-effect-runner.sh` — AC2 test for the shared effect boundary (`_effect-runner.sh`)

**Purpose:** Asserts the mode-symmetric non-live status contract: every non-push effect kind returns exactly 0 under both `dry-run` and `test` modes without executing argv; `push` returns exactly `ECHO_EFFECT_NONLIVE_RC=97` under both non-live modes; live mode execs argv unchanged. Also exercises `push-with-retry.sh` (no real git mutation, propagates 97) and `commit-reviewer-response.sh` (refuses without leaving an orphaned local commit) under both non-live modes.

**Depends on:** tools/review-queue/_effect-runner.sh, tools/review-queue/push-with-retry.sh, tools/review-queue/commit-reviewer-response.sh, external: git, bash

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/test-effect-runner.sh:21` | Prints FAIL diagnostic and exits 1. |

### `tools/review-queue/test-emit-sidecar.sh` — AC7 test for the code-owned sidecar writer (`emit-sidecar.py`)

**Purpose:** Verifies `emit-sidecar.py` writes a canonical, schema-valid sidecar from a valid JSON descriptor; rejects a descriptor naming a conflicting `producer`, a caller-supplied `target_path`, or a missing required field (each writing no sidecar); rejects overwriting an existing target unless `--replace` is passed; and confirms the coupled-invariant gate (`check-coupled-invariants.sh`) passes an empty `pending_review/` and fails/names an invalid committed sidecar. Also asserts the caller repo's own `backlog/pending_review` stays untouched throughout.

**Depends on:** tools/review-queue/emit-sidecar.py, tools/review-queue/validate-sidecar.py, tools/review-queue/check-coupled-invariants.sh, tools/review-queue/_sidecar_validate.py, tools/review-queue/_lib.py, tools/review-queue/schemas/review-sidecar.schema.json, external: git, python3

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/test-emit-sidecar.sh:12` | Prints FAIL diagnostic and exits 1. |
| `new_repo(name)` | function | `tools/review-queue/test-emit-sidecar.sh:19` | Creates and git-inits a fresh tmp repo with a `backlog/pending_review` dir; echoes its path. |
| `descriptor(path, verdict_text)` | function | `tools/review-queue/test-emit-sidecar.sh:30` | Writes a valid JSON sidecar descriptor fixture (item_id, verdict, test_counts, body) to `path`. |
| `run_writer(repo, desc, ...)` | function | `tools/review-queue/test-emit-sidecar.sh:47` | Invokes `emit-sidecar.py --input <desc>` with extra args from within `repo`. |
| `assert_no_caller_pending_dirty()` | function | `tools/review-queue/test-emit-sidecar.sh:53` | Diffs the caller repo's `backlog/pending_review` porcelain status against the pre-test snapshot to confirm the test made no side effects there. |
| `install_checker_fixture(repo)` | function | `tools/review-queue/test-emit-sidecar.sh:59` | Copies the coupled-invariant checker, sidecar validator, `_sidecar_validate.py`, `_lib.py`, and the sidecar JSON schema into a fixture repo so its gate can run standalone. |

### `tools/review-queue/test-reviewer-prompt.sh` — smoke test for the AC3 reviewer-loop polling logic

**Purpose:** Creates a synthetic request round (`r1/request.md` for a stub backlog item), and replicates the file-scan/state-check portion of the reviewer slash-command's polling logic (NOT the actual AI review) — for each of `codex`/`cursor`, finds the first request whose `<reviewer>.md`/`combined.md` doesn't yet exist, parses `artifact_path`/`spec_commit_sha` from frontmatter via awk, and asserts the derived next-step string and parsed values match expectations.

**Depends on:** none (pure fixture + awk-based frontmatter parsing, mirrors logic in .claude/commands/review-queue-*.md)

**Symbols:**

(no functions defined; sequential fixture-build-and-assert script, entrypoint at `tools/review-queue/test-reviewer-prompt.sh:1`)

### `tools/review-queue/test-validate-sidecar.sh` — AC3 test for the committed-sidecar validator

**Purpose:** Asserts `validate-sidecar.py` accepts a well-formed sidecar from the `review-pending-orchestrator` producer (including unquoted-datetime YAML coercion and the exact live "Open questions for founder" heading shape), rejects retired producer values (`claude-code-subagent`, `codex-child`), requires the "Open questions for founder" heading when verdict is `block`, fails on a missing required heading or bad verdict enum (naming the offender), and round-trips through the merge-and-cleanup Step-A consume path (validate then read `verdict`/`reviewed_at`).

**Depends on:** tools/review-queue/validate-sidecar.py, external: python3, yaml, sed, grep

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `fail(msg)` | function | `tools/review-queue/test-validate-sidecar.sh:24` | Prints FAIL diagnostic and exits 1. |
| `write_sidecar(path, verdict, producer, extra)` | function | `tools/review-queue/test-validate-sidecar.sh:29` | Writes a sidecar fixture file with the given frontmatter verdict/producer and optional extra body content appended after the standard headings. |

### `tools/review-queue/test-watcher-prompt.sh` — smoke test for the AC3.5 watcher tick logic

**Purpose:** Synthesizes two `combined.md` fixtures (one with `escalated_to_founder: true`, one `false`) and replicates the watcher-tick's file-scan/state-check branching (NOT the AI judgment) via awk-parsed frontmatter, asserting the escalate vs. disposition-and-continue next-step is chosen correctly per case.

**Depends on:** none (pure fixture + awk-based frontmatter parsing)

**Symbols:**

(no functions defined; sequential fixture-build-and-assert script, entrypoint at `tools/review-queue/test-watcher-prompt.sh:1`)

### `tools/review-queue/uninstall-codex-reviewer-launchd.sh` — idempotent launchd uninstaller for the Codex reviewer job

**Purpose:** AC2 of item 041. Removes the `com.echo.review-queue-codex` launchd job (using `bootout` on macOS ≥14, `unload` otherwise) and deletes its plist file; no-ops cleanly if already absent.

**Depends on:** none (shells out to `launchctl`, `sw_vers`)

**Symbols:**

(no functions defined; entrypoint at `tools/review-queue/uninstall-codex-reviewer-launchd.sh:1` — detects macOS major version, unloads/boots-out the launchd job, removes the plist)

### `tools/review-queue/validate-sidecar.py` — CLI validator for committed `/review-pending` sidecar artifacts

**Purpose:** Validates a committed sidecar file's frontmatter against `schemas/review-sidecar.schema.json` plus its body headings, reusing `_lib.parse_frontmatter` and `_sidecar_validate.validate` as the single source of truth for the sidecar contract.

**Depends on:** tools/review-queue/_lib.py, tools/review-queue/_sidecar_validate.py

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `main(argv)` | function | `tools/review-queue/validate-sidecar.py:21` | Parses argv for a single path, loads frontmatter+body via `_lib.parse_frontmatter`, runs `_sidecar_validate.validate`, and prints/returns 0 on success or 1 with the error on stderr. |

### `tools/review-queue/validate.py` — schema validator for review-queue frontmatter files, with reviewer fresh-eyes enforcement

**Purpose:** CLI that validates a `request`/`reviewer`/`combined` frontmatter file against its JSON schema via `_lib`, coercing YAML-parsed datetimes to canonical ISO-8601 strings for `reviewer` schema. For `reviewer` schema specifically, additionally enforces the 046 AC3 fresh-eyes invariant: rejects `consumed_task_state: true` and rejects response bodies matching 3+ of a set of role-typed task-state heading patterns (statistical evidence of quoting a task-state pointer), printing `REVIEWER_FRESH_EYES_VIOLATION` and exiting 1 so `commit-reviewer-response.sh` can quarantine the file.

**Depends on:** tools/review-queue/_lib.py, external: jsonschema, python3 stdlib (datetime, re)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `_TASK_STATE_HEADING_PATTERNS` | const | `tools/review-queue/validate.py:41` | Tuple of 6 compiled regexes matching role-typed task-state required-block headings (`## current_thesis`, `## locked_decisions`, `## open_questions`, `## dont_touch`, `## canonical_anchors`, `current_round:`). |
| `_FRESH_EYES_THRESHOLD` | const | `tools/review-queue/validate.py:50` | Integer 3 — minimum number of distinct matched patterns that constitutes a fresh-eyes violation. |
| `_coerce_completed_at(value)` | function | `tools/review-queue/validate.py:53` | Converts a YAML-parsed `datetime.datetime` (optionally tz-aware) into the canonical `%Y-%m-%dT%H:%M:%SZ` UTC string the reviewer schema expects. |
| `_detect_task_state_quotation(body)` | function | `tools/review-queue/validate.py:60` | Scans `body` against `_TASK_STATE_HEADING_PATTERNS`, returning `(violation, matched_patterns)` where violation is true iff matched count ≥ `_FRESH_EYES_THRESHOLD`. |
| `main(argv)` | function | `tools/review-queue/validate.py:70` | Parses `<schema-name> <path>`, validates frontmatter against the named schema via `_lib.validate_frontmatter`, reports `required`/enum violations naming the offending field, and for `reviewer` schema additionally runs the `consumed_task_state` and task-state-quotation fresh-eyes checks before returning 0. |

### `tools/review-queue/validate_response_yaml.py` — pre-link reviewer-response YAML gate

**Purpose:** 045 AC1 helper invoked by reviewer slash commands (`review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`) before `os.link`-ing a freshly written `<reviewer>.md` into its canonical path, so parse/schema failures can be caught and retried in-session rather than only via the post-link quarantine path. Wraps `validate.py reviewer <path>` as the single source of schema truth, forwarding its stderr diagnostics verbatim; does not itself write to `raw/internal/queue-errors.md` (that's the calling prompt's terminal-failure responsibility).

**Depends on:** tools/review-queue/validate.py, external: subprocess, shutil (arch -arm64 fallback for Apple Silicon python3)

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `main(argv)` | function | `tools/review-queue/validate_response_yaml.py:42` | Validates argv, resolves a working `python3` (probing for `jsonschema`+`yaml`, falling back to `arch -arm64 python3` on Apple Silicon), runs `validate.py reviewer <path>` as a subprocess with `PYTHONDONTWRITEBYTECODE=1`, and forwards its stderr diagnostic on failure; returns 0/1/2 per the documented exit-code contract. |
