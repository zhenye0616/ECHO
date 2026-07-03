# tools (root files) — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 16 files.

### `tools/_trace_render.ts` — shared HTML/row rendering for trace viewers

**Purpose:** Provides shared rendering logic used by both `tools/render-trace.ts` (snapshot) and `tools/serve-trace.ts` (live HTTP+SSE) — converts captured events into display rows and builds the shared two-column HTML+JS viewer with client-side filtering, session grouping, and live SSE row updates.

**Depends on:** `../src/capture/extractors/_shared.js` (SOURCE_MARKERS), `../src/storage/interface.js` (types CaptureEvent, Storage); external: Node `Buffer`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `RenderRow` | interface | `tools/_trace_render.ts:12` | Shape of a single displayable trace row (lane, timestamps, session id, turn, repo/branch/model/sandbox, files, tool calls, thinking, git state, user/assistant text, metadata, source). |
| `truncateField(s, full)` | function | `tools/_trace_render.ts:35` | Truncates a text field to `MAX_CHARS_PER_FIELD` (32,000 chars) unless `full` is true, appending a truncation notice. |
| `waitForDrain(storage, idleMs)` | function | `tools/_trace_render.ts:44` | Polls `storage.count()` every 200ms until the count is stable for `idleMs` (default 1500ms) or a 60s deadline elapses, used to know when capture ingestion has settled. |
| `eventsToRows(events, full)` | function | `tools/_trace_render.ts:61` | Maps an array of CaptureEvent to RenderRow via `toRow`, dropping any that fail to parse (return null). |
| `formatGeneratedAt()` | function | `tools/_trace_render.ts:71` | Formats the current time as `"YYYY-MM-DD HH:MM:SS"` in host machine local time. |
| `toRow(event, full)` | function | `tools/_trace_render.ts:80` | Parses one CaptureEvent's metadata and content into a RenderRow: determines lane (cc/codex/cursor) via SOURCE_MARKERS, extracts session id/turn, splits content into USER/ASSISTANT text via regex, pulls repo/branch/model/sandbox/tool_calls/thinking/git_state from metadata. |
| `BuildHtmlOpts` | interface | `tools/_trace_render.ts:160` | Options for `buildHtml`: `days`, `generatedAt`, `live` flag (SSE vs snapshot), optional `title`. |
| `buildHtml(rows, opts)` | function | `tools/_trace_render.ts:169` | Base64-encodes a `{meta, rows}` envelope and injects it plus the title into the `TEMPLATE` HTML string, producing the full self-contained trace viewer page. |
| `TEMPLATE` | const | `tools/_trace_render.ts:181` | The full HTML document template (styles + inline `<script>`) rendering three columns (Claude Code / Codex / Cursor), session grouping, per-row expand/collapse, tool-call rendering, search/filter UI, and (when live) an EventSource subscription to `/events` for incremental row updates. |

### `tools/backlog_index.py` — generator for docs/BACKLOG.md from backlog folder state

**Purpose:** Reads all backlog items across pipeline stages (via `blocked.py`) and renders `docs/BACKLOG.md`, a generated markdown index grouped by stage with status/priority/blocked-by columns; also supports a fixture-based drift self-check. Builders ship the generator/tests; the strategist regenerates the live doc after merges.

**Depends on:** `tools/blocked.py` (imported as `blocked`); external: `argparse`, `shutil`, `tempfile`, `pathlib`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `STAGE_ORDER` | const | `tools/backlog_index.py:26` | Ordered tuple of (folder-name, display-title) pairs defining the stage sections rendered in BACKLOG.md: proposed, ready, claimed, pending_review, complete. |
| `GENERATED_PREAMBLE` | const | `tools/backlog_index.py:34` | Header text prepended to the generated markdown noting it's auto-generated and not to edit by hand. |
| `esc(value)` | function | `tools/backlog_index.py:41` | Escapes a value for markdown table cells: stringifies, escapes pipes, strips newlines, defaults to "-" if empty. |
| `item_title(path)` | function | `tools/backlog_index.py:46` | Reads a backlog item file's frontmatter and returns its `title` field (or filename stem on parse failure). |
| `item_estimate(path)` | function | `tools/backlog_index.py:54` | Reads a backlog item's frontmatter and returns its `estimate` field (or "-" on failure). |
| `stage_status(item, ready_by_id)` | function | `tools/backlog_index.py:62` | Computes the display status string for an item: for `ready` stage items, "READY" if unblocked else "BLOCKED: <reasons>"; otherwise the stage name uppercased. |
| `sort_key(item)` | function | `tools/backlog_index.py:72` | Returns a tuple (priority rank, created date, id) used to sort items within a stage section: HIGH/MED/LOW priority order, then oldest-first, then lexicographic id. |
| `render(repo_root)` | function | `tools/backlog_index.py:80` | Loads all backlog items via `blocked.load_items`/`blocked.candidates`, groups by stage, and renders the full BACKLOG.md markdown string with one table per stage. |
| `write_item(repo, stage, item_id, title, extra)` | function | `tools/backlog_index.py:121` | Writes a fixture backlog markdown file with minimal frontmatter (id/title/priority/estimate/created/blocked_by) under `backlog/<stage>/<id>.md`, used only by the self-test fixture. |
| `seal_ready(path)` | function | `tools/backlog_index.py:146` | Computes the normalized content sha for a fixture item and injects a `ready_content_sha` field into its frontmatter, simulating the ready/ seal. |
| `fixture_expected()` | function | `tools/backlog_index.py:155` | Returns the exact expected BACKLOG.md markdown string for the fixture scenario used by `run_fixture_check`. |
| `run_fixture_check()` | function | `tools/backlog_index.py:194` | Builds a temporary fake repo with proposed/ready(sealed)/ready(stale) fixture items, renders BACKLOG.md, and diffs it against `fixture_expected()`, printing a drift report and returning 1 on mismatch, 0 on match. |
| `main(argv)` | function | `tools/backlog_index.py:219` | CLI entrypoint: parses `--repo-root`, `--check`, `--print`; dispatches to `run_fixture_check`, prints rendered markdown, or writes `docs/BACKLOG.md`. |

### `tools/blocked.py` — deterministic backlog candidate selector and validator

**Purpose:** Parses backlog item frontmatter across all pipeline stages, enforces the `blocked_by` dependency mechanism and the `ready_content_sha` integrity seal in code (not agent discretion), and exposes a CLI used by `/process-backlog` and `/process-backlog-batch` to deterministically pick the next claimable item or validate the whole backlog for cycles/dangling refs/malformed frontmatter.

**Depends on:** none (stdlib only: `hashlib`, `json`, `os`, `re`, `sys`, `pathlib`, `typing`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `PRIORITY_ORDER` | const | `tools/blocked.py:58` | Maps HIGH/MED/LOW to sort-rank integers 0/1/2. |
| `STAGES` | const | `tools/blocked.py:59` | Ordered tuple of backlog pipeline stage folder names. |
| `CONTENT_SHA_RE` | const (regex) | `tools/blocked.py:60` | Matches a 64-hex-char sha256 digest string. |
| `CONTENT_MARKER_FIELDS` | const | `tools/blocked.py:61` | Frontmatter fields (`ready_content_sha`, `spec_review`, `spec_review_sha`) excluded from the normalized-content digest so seal metadata doesn't self-invalidate. |
| `AGENT_MANAGED_FIELDS` | const | `tools/blocked.py:62` | Frontmatter fields written by agents during the lifecycle (claimed_by, claimed_at, branch, worktree, head_sha, pr_url, agent_notes, review_notes) also excluded from the content digest. |
| `ID_FILENAME_RE` | const (regex) | `tools/blocked.py:76` | Validates backlog item ids match `YYYY-MM-DD-NNN[a-z]?-kebab-slug`, allowing an optional single-letter suffix for decomposed sibling specs. |
| `ValidationError` | class | `tools/blocked.py:79` | Exception type raised for malformed frontmatter, dangling refs, cycles, or schema violations. |
| `split_frontmatter(text)` | function | `tools/blocked.py:83` | Splits a markdown file's text into (frontmatter, body), requiring the file start with `---\n` and be terminated by `\n---\n`. |
| `parse_inline_list(val)` | function | `tools/blocked.py:93` | Parses a YAML inline list literal (`[a, b]`) into a Python list; returns None if malformed so callers fail closed rather than silently unblocking. |
| `parse_frontmatter(text)` | function | `tools/blocked.py:121` | Minimal hand-rolled YAML-frontmatter parser supporting scalars, quoted scalars, inline lists, and multi-line `- item` lists; deliberately does not support nested objects or anchors. |
| `normalized_content_sha(text)` | function | `tools/blocked.py:180` | Computes a sha256 digest over frontmatter (excluding marker/agent-managed fields) plus body, used as the ready/ integrity seal so promotion metadata can't self-invalidate it. |
| `has_valid_content_sha(value)` | function | `tools/blocked.py:209` | Returns whether a value is a string matching `CONTENT_SHA_RE`. |
| `load_items(repo_root)` | function | `tools/blocked.py:213` | Walks every stage folder under `backlog/`, parses each `.md` file's frontmatter (skipping `.review.md` sidecars), validates id/filename match and naming pattern, checks for duplicate ids, and returns a dict of id → item record including its normalized content sha. |
| `validate(items)` | function | `tools/blocked.py:280` | Cross-item validation: detects `blocked_by` references to unknown ids and cycles in the blocked_by graph (DFS with WHITE/GRAY/BLACK coloring) among non-complete items; returns a list of error strings. |
| `ready_content_satisfied(item)` | function | `tools/blocked.py:321` | Checks whether a ready/ item's `ready_content_sha` is present, well-formed, and matches its computed `normalized_content_sha`; returns (bool, reason-or-None). |
| `candidates(items)` | function | `tools/blocked.py:333` | Filters items to those in the `ready` stage, computes `unblocked` (all blocked_by deps in complete/ AND ready_content_satisfied), sorts by priority/created/id, and returns the annotated list. |
| `format_block_reasons(candidate)` | function | `tools/blocked.py:364` | Builds a human-readable reason string combining unsatisfied blocked_by deps and any ready-content-seal failure reason. |
| `find_repo_root(start)` | function | `tools/blocked.py:373` | Walks up from `start` to find the nearest ancestor directory containing both `backlog/` and `.git`. |
| `main(argv)` | function | `tools/blocked.py:385` | CLI entrypoint: `--ready-content-sha <file>` prints a digest; otherwise validates flags, loads+validates all items, and depending on flags (`--validate`, `--list-all`, `--list-blocked`, or default) prints validation status, all candidates with status, blocked-only candidates, or the path of the single next unblocked candidate (exit 1 if none). |

### `tools/coord-status.sh` — CLI wrapper around the coord_status MCP tool

**Purpose:** Lets an operator inspect ECHO daemon coordination status (open deadlines, missed events, per-role tick slots, uptime) from any terminal by POSTing a `tools/call coord_status` JSON-RPC request to the daemon's `/mcp` endpoint and pretty-printing the result with `jq`. CLI sibling of the `coord_status` MCP tool (057a AC6).

**Depends on:** none internal; external: `curl`, `jq`; talks to the running ECHO daemon over HTTP.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint / `extract()` | function | `tools/coord-status.sh:1` | Reads `$ECHO_DAEMON_PORT` (default 38478) and a filter arg (`all`\|`open`\|`missed`\|`slots`\|`ticks`\|`uptime`, default `all`), POSTs a stateless `tools/call coord_status` JSON-RPC payload to `http://127.0.0.1:$PORT/mcp`, extracts `result.structuredContent` (falling back to parsing `result.content[0].text`), and pipes the selected sub-field through `jq` for pretty output; exits 2 on an unknown filter. `extract()` is defined at line 40. |

### `tools/foreign-install-smoke.sh` — end-to-end sandboxed foreign-install smoke test for echoctl

**Purpose:** Simulates a completely fresh non-founder install of `echoctl` in full isolation (fake `$HOME`, seeded fake Claude/Codex agent configs, isolated launchd label/port/data-dir/db-path/log-dir) to prove the packaged npm tarball can locate its own assets and wire up MCP without ever touching the real founder machine state; also verifies default `customer` profile installs a minimal surface while an explicit `--profile dogfood` install gets the full coordination surface (skills, roles, workflows). Written 2026-06-01 for the n=1 concierge-install pre-flight.

**Depends on:** none internal (drives the built `echoctl` binary via `npm pack`/`npm install -g`); external: `npm`, `curl`, `launchctl`, `node`, shimmed fake `claude` binary.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/foreign-install-smoke.sh:1` | Stages a sandbox under `/tmp/echo-sbox` with fake HOME/agent configs and a `claude` shim that logs argv; builds+installs the echoctl tarball into the sandbox prefix; runs `echoctl doctor` before/after daemon install; installs an isolated daemon (custom label/port/paths) and probes its `/mcp` initialize response; runs `echoctl init` with `repo_root` omitted to prove asset self-location, asserting the fake claude received the exact `mcp add --transport http --scope user echo http://127.0.0.1:<port>/mcp` argv; asserts default profile is `customer` with only `using-echo-mcp.md` installed (no coord-surface files); reruns init with no flags and asserts it stays `customer`; runs init again with `--profile dogfood` and asserts the full coord surface (using-echo-coord skill, builder/reviewer/strategist role tomls, change-review workflow) is installed; tears down the sandboxed launchd job and confirms production `com.echo.daemon` (port 38478) is untouched via `cleanup()` (trap on EXIT, defined at line 44) which also removes the sandbox. |
| `fail(msg)` | function | `tools/foreign-install-smoke.sh:57` | Prints an `[assert] ERROR:` message to stderr and exits 1. |
| `assert_exists(path)` | function | `tools/foreign-install-smoke.sh:62` | Fails unless the given path exists. |
| `assert_absent(path)` | function | `tools/foreign-install-smoke.sh:66` | Fails if the given path exists. |
| `assert_profile(expected)` | function | `tools/foreign-install-smoke.sh:70` | Runs an inline Node script to read `$ECHO_HOME/state/onboarding.json` and assert its `profile` field equals `expected`, failing otherwise. |

### `tools/install-echo-codex-skills.sh` — Codex installer for canonical ECHO skills

**Purpose:** The only supported path for importing ECHO's canonical `skills/*.md` protocol skills into Codex's user-level skill discovery directory (`~/.codex/skills/<namespace>:<skill-name>/SKILL.md`), rendering Claude-style frontmatter (name/description/short-description) from each canonical skill's own frontmatter, recording managed-install sentinels for drift detection, and supporting `--dry-run`/`--check` modes. Complements `tools/sync-skills.sh`, which only maintains Claude command-directory copies.

**Depends on:** `skills/*.md` (canonical skill sources, read not imported as code); external: `python3` (inline script for frontmatter rendering), `shasum`, `git`, `mktemp`, `awk`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `usage()` | function | `tools/install-echo-codex-skills.sh:23` | Prints CLI usage text for `--dry-run`, `--check`, `--namespace`, `--underscore-names`, `-h/--help`. |
| `skill_display_name(canonical)` | function | `tools/install-echo-codex-skills.sh:89` | Builds the installed skill's display name `<NAMESPACE>:<visible>`, converting hyphens to underscores in the visible part when `NAME_STYLE=underscore`. |
| `render_skill(canonical_path, skill_name)` | function | `tools/install-echo-codex-skills.sh:98` | Invokes an inline Python script (lines 101-139) that parses the canonical skill's YAML frontmatter, extracts/derives a `description` and an 80-char `short-description`, and emits a new SKILL.md with Codex-style frontmatter (`name`, `description`, `metadata.short-description`) followed by the original body. |
| `is_managed_target(target)` | function | `tools/install-echo-codex-skills.sh:142` | Returns true if `target` is a directory containing an `.echo-managed` sentinel file. |
| `shell_quote(value)` | function | `tools/install-echo-codex-skills.sh:147` | Single-quotes a string for safe reuse in a printed shell command. |
| `sha256_file(path)` | function | `tools/install-echo-codex-skills.sh:152` | Returns the sha256 hex digest of a file via `shasum -a 256`. |
| `sentinel_value(sentinel, key)` | function | `tools/install-echo-codex-skills.sh:156` | Reads a `key=value` line out of an `.echo-managed` sentinel file via awk, exiting nonzero if the key is absent. |
| `source_basename(source_path, skill_name)` | function | `tools/install-echo-codex-skills.sh:162` | Derives the canonical skill's base filename (without `.md`) from its recorded source path, falling back to deriving it from the skill_name's visible part if the source path is empty/root. |
| `resolve_recorded_source(source_path)` | function | `tools/install-echo-codex-skills.sh:174` | Resolves a sentinel's recorded `source` field to an absolute path, treating relative paths as relative to `$REPO_ROOT`. |
| `remediation_command_for(skill_name, source_path)` | function | `tools/install-echo-codex-skills.sh:182` | Reconstructs the exact `install-echo-codex-skills.sh` invocation (with `--namespace`/`--underscore-names` flags as needed) that would regenerate a given managed skill, for use in drift remediation messages. |
| `check_managed_codex_skills()` | function | `tools/install-echo-codex-skills.sh:204` | `--check` mode: iterates all `.echo-managed` sentinels under `~/.codex/skills/`, verifies each sentinel and installed SKILL.md exist and are readable, re-renders the expected SKILL.md from its recorded canonical source into a temp stage, hashes and compares against the installed file (and the sentinel's `synced_content_sha256`) to classify drift as source-drift / installed-drift / source-missing / true-orphan, printing `DRIFT:` lines with remediation commands; returns 1 if any drift found, 0 otherwise (or "no managed install" message). |
| main install loop | script | `tools/install-echo-codex-skills.sh:317` | After handling `--check` and `--dry-run` branches, iterates every `skills/*.md`, computes its target path under `~/.codex/skills/`, refuses to overwrite any existing non-ECHO-managed target, otherwise renders+stages the skill via `render_skill`, writes an `.echo-managed` sentinel recording source/skill_name/synced_from_commit(git HEAD)/synced_content_sha256/synced_at, and atomically moves the staged directory into place. |

### `tools/install-pre-commit-hook.sh` — installer for ECHO's skills-drift pre-commit hook

**Purpose:** Manually-run (never auto-invoked) installer that writes a git pre-commit hook running `tools/sync-skills.sh --check` to abort commits on canonical/adapter skill drift; resolves the correct hook path across linked worktrees and both absolute/relative `core.hooksPath` configurations, and is idempotent on both content and executable mode.

**Depends on:** `tools/sync-skills.sh` (invoked by the installed hook, not by this script directly); external: `git`, `mktemp`, `cmp`, `chmod`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint | script | `tools/install-pre-commit-hook.sh:1` | Verifies the cwd is inside a git working tree; resolves the target hook path by checking `core.hooksPath` (absolute path used directly, relative path normalized against `git rev-parse --show-toplevel`) or falling back to `git rev-parse --git-path hooks/pre-commit`; builds the hook body (a script that cds to the repo toplevel and execs `tools/sync-skills.sh --check`); writes it to a temp file in the same directory and, via `cmp`, either no-ops if byte-identical and executable, repairs the exec bit if byte-identical but non-executable, or atomically renames the temp file into place (overwriting any prior hook) and chmods it executable, printing a warning if a prior hook existed. |

### `tools/mcp-integration-smoke.sh` — live MCP endpoint smoke test

**Purpose:** Bash script that exercises a running ECHO daemon's HTTP MCP endpoint end-to-end: reachability, `initialize`/`notifications/initialized` handshake, `tools/list` advertisement checks (tool set, readOnlyHint/outputSchema, source_app enum, description defaults), `tools/call` behavior for `search_memories`/`get_recent_work_context`/`get_atom`, an edge-filter redundancy sentinel (item 019), a cross-gap window sentinel (item 021), a timestamp-canonicalization sentinel (item 022), and a stateless stale-session recovery probe (item 027).

**Depends on:** none (external: `curl`, `python3`, `sed`, `awk`, `date`) — probes the live daemon over HTTP at `$ECHO_MCP_PORT` (default 38478).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `log_err()` | function | `tools/mcp-integration-smoke.sh:28` | Prints a prefixed message to stderr. |
| `log_ok()` | function | `tools/mcp-integration-smoke.sh:29` | Prints a prefixed message to stdout. |
| `extract_payload()` | function | `tools/mcp-integration-smoke.sh:33` | Extracts the first SSE `data:` line from a response body, falling back to the raw body for plain-JSON transports. |
| entrypoint (reachability → initialize → tools/list checks → tools/call checks → edge/cross-gap/gitscan sentinels → get_atom round-trip → stale-session probe) | script flow | `tools/mcp-integration-smoke.sh:1` | Sequentially POSTs JSON-RPC requests to `/mcp`, using embedded python3 heredocs to parse JSON envelopes and assert on `matches`, `limit_applied`, `clusters`, `truncation`, edge-count bounds, `window_hours` inference, timestamp canonical form, and `get_atom` schema/verbatim-content invariants; exits 1 with raw response dumped to stderr on any hard failure. |

### `tools/render-trace.ts` — one-shot HTML trace snapshot

**Purpose:** CLI tool that boots the real Claude Code + Codex extractors against an in-memory, time-windowed storage shim, drains the boot scan, and writes a single self-contained two-column HTML file summarizing captured events in the requested day window.

**Depends on:** `src/capture/extractors/claude-code.js`, `src/capture/extractors/codex.js`, `src/storage/interface.js`, `src/storage/memory.js`, `tools/_trace_render.js` (buildHtml, eventsToRows, formatGeneratedAt, waitForDrain); external: `node:fs`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Args` | interface | `tools/render-trace.ts:31` | Shape of parsed CLI args: `days`, `outPath`, `fullContent`. |
| `parseArgs(argv)` | function | `tools/render-trace.ts:37` | Parses `--days`, `--out`, `--full-content` flags into an `Args` object with defaults. |
| `defaultOutPath()` | function | `tools/render-trace.ts:58` | Builds a timestamped default output path under `~/Desktop/echo-trace-<stamp>.html`. |
| `WindowedStorage` | class | `tools/render-trace.ts:63` | `Storage` implementation wrapping `MemoryStorage` that drops any appended event older than `sinceMs`, computed from `--days`. |
| `WindowedStorage.append(event)` | method | `tools/render-trace.ts:67` | Filters out-of-window events (returns sentinel `'_skip'` id), otherwise delegates to inner storage. |
| `WindowedStorage.query(filter)` | method | `tools/render-trace.ts:73` | Delegates to inner `MemoryStorage.query`. |
| `WindowedStorage.count()` | method | `tools/render-trace.ts:77` | Delegates to inner `MemoryStorage.count`. |
| `WindowedStorage.getByIds(ids)` | method | `tools/render-trace.ts:82` | Delegates to inner storage's `getByIds` (V1.6 item 030 requirement). |
| `WindowedStorage.iterateCoordAtomsByAppendOrder(opts)` | method | `tools/render-trace.ts:88` | Delegates to inner storage's coord-seam iterator (057a AC3). |
| `WindowedStorage.getCurrentCoordSequence()` | method | `tools/render-trace.ts:93` | Delegates to inner storage's current coord sequence getter. |
| `main()` | function | `tools/render-trace.ts:98` | Parses args, starts CC + Codex extractors against a `WindowedStorage`, waits for boot-scan drain, stops extractors, queries all events, renders HTML via `buildHtml`, and writes it to disk. |

### `tools/serve-trace.ts` — live HTTP-served trace viewer

**Purpose:** Long-running dev server that boot-scans CC + Codex + Cursor capture history into RAM, serves a live-updating two-column HTML page plus an SSE `/events` stream that pushes newly-captured rows, with a confirm-before-exit Ctrl-C UX.

**Depends on:** `src/capture/extractors/claude-code.js`, `src/capture/extractors/codex.js`, `src/capture/extractors/cursor.js`, `src/storage/interface.js`, `src/storage/memory.js`, `tools/_trace_render.js` (buildHtml, eventsToRows, formatGeneratedAt, toRow, waitForDrain, RenderRow); external: `node:http`, `node:readline`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Args` | interface | `tools/serve-trace.ts:39` | Shape of parsed CLI args: `days`, `port`, `fullContent`. |
| `parseArgs(argv)` | function | `tools/serve-trace.ts:45` | Parses `--days`, `--port`, `--full-content` flags with defaults (7 days, port 38479). |
| `Listener` | type | `tools/serve-trace.ts:62` | Callback type `(row: RenderRow) => void` used for SSE subscriber notification. |
| `LiveStorage` | class | `tools/serve-trace.ts:64` | `Storage` wrapper around `MemoryStorage` that filters by window, tracks a live-mode flag, and fans out newly appended rows to subscribed SSE listeners. |
| `LiveStorage.subscribe(fn)` | method | `tools/serve-trace.ts:74` | Registers a listener and returns an unsubscribe closure. |
| `LiveStorage.enableLiveMode()` | method | `tools/serve-trace.ts:79` | Flips `liveMode` on so subsequent appends notify listeners. |
| `LiveStorage.append(event)` | method | `tools/serve-trace.ts:83` | Drops out-of-window events; otherwise appends to inner storage and, if in live mode, converts the event to a `RenderRow` via `toRow` and notifies listeners. |
| `LiveStorage.query(filter)` | method | `tools/serve-trace.ts:94` | Delegates to inner storage. |
| `LiveStorage.count()` | method | `tools/serve-trace.ts:98` | Delegates to inner storage. |
| `LiveStorage.getByIds(ids)` | method | `tools/serve-trace.ts:103` | Delegates to inner storage (item 030 requirement). |
| `LiveStorage.iterateCoordAtomsByAppendOrder(opts)` | method | `tools/serve-trace.ts:110` | Delegates to inner storage's coord-seam iterator (057a AC3). |
| `LiveStorage.getCurrentCoordSequence()` | method | `tools/serve-trace.ts:115` | Delegates to inner storage's current coord sequence getter. |
| `main()` | function | `tools/serve-trace.ts:120` | Starts CC/Codex/Cursor extractors against a `LiveStorage`, drains boot scan, enables live mode, defines `renderHtml()`, stands up an HTTP server serving `/` (rendered HTML) and `/events` (SSE row stream with heartbeats), and installs SIGINT/SIGTERM handlers with a confirm-before-shutdown prompt. |
| `renderHtml()` (inner) | function | `tools/serve-trace.ts:141` | Queries current events, converts to rows, checks extractor freshness via `probeFreshness()`, logs if gap exceeds `FRESHNESS_LOG_THRESHOLD_BYTES`, and builds the live HTML page. |
| `shutdown()` (inner) | function | `tools/serve-trace.ts:203` | Idempotent graceful shutdown: closes HTTP server (including live SSE connections), stops all three extractors, exits process. |

### `tools/stream-watch.ts` — live terminal stream visualizer

**Purpose:** Pure-observability CLI that pre-seeds an in-memory storage shim with EOF markers for every existing CC/Codex JSONL (so the boot scan emits nothing historical), then starts the real extractors and pretty-prints only newly-arriving turns to the terminal with ANSI coloring. Nothing persists to disk.

**Depends on:** `src/capture/extractors/claude-code.js`, `src/capture/extractors/codex.js`, `src/capture/extractors/_shared.js` (SOURCE_MARKERS), `src/storage/interface.js`, `src/storage/memory.js`; external: `node:fs`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `StreamingStorage` | class | `tools/stream-watch.ts:46` | `Storage` wrapper around `MemoryStorage` with an `onLive` callback invoked on every append once live mode is enabled. |
| `StreamingStorage.setOnLive(fn)` | method | `tools/stream-watch.ts:51` | Registers the single live-event callback. |
| `StreamingStorage.enableLiveMode()` | method | `tools/stream-watch.ts:55` | Flips `liveMode` on. |
| `StreamingStorage.append(event)` | method | `tools/stream-watch.ts:59` | Appends to inner storage; if live mode is on, invokes the registered callback with the stored event (including its assigned id). |
| `StreamingStorage.query(filter)` | method | `tools/stream-watch.ts:67` | Delegates to inner storage. |
| `StreamingStorage.count()` | method | `tools/stream-watch.ts:71` | Delegates to inner storage. |
| `StreamingStorage.getByIds(ids)` | method | `tools/stream-watch.ts:76` | Delegates to inner storage (item 030 requirement). |
| `StreamingStorage.iterateCoordAtomsByAppendOrder(opts)` | method | `tools/stream-watch.ts:82` | Delegates to inner storage's coord-seam iterator (057a AC3). |
| `StreamingStorage.getCurrentCoordSequence()` | method | `tools/stream-watch.ts:87` | Delegates to inner storage's current coord sequence getter. |
| `SeedOpts` | interface | `tools/stream-watch.ts:94` | Options for `walkJsonls`: `root` directory and `recursive` flag. |
| `walkJsonls(opts)` | function | `tools/stream-watch.ts:99` | Recursively (or not) walks a directory collecting `{path, size}` for every `.jsonl` file found. |
| `preSeed(storage)` | function | `tools/stream-watch.ts:128` | Walks `~/.claude/projects/` and `~/.codex/sessions/` for existing JSONLs and appends synthetic `_seed: true` marker events at each file's current byte offset so the extractors' boot scan treats them as already processed. |
| `shortRepo(p)` | function | `tools/stream-watch.ts:153` | Returns the last two path segments of a repo path, or `—` if undefined. |
| `clip(s, n)` | function | `tools/stream-watch.ts:159` | Collapses whitespace and truncates a string to `n` chars with an ellipsis. |
| `parseUserAssistant(content)` | function | `tools/stream-watch.ts:164` | Splits a `"USER: …\n\nASSISTANT: …"` formatted content string into its two parts via regex. |
| `printEvent(event)` | function | `tools/stream-watch.ts:170` | Formats and prints one live capture event to the terminal: colored source lane (CODEX/CC), session id, turn index, tool-use icon, repo@branch, codex model/sandbox hints, file-reference count, and a clipped one-line preview of the user message. |
| `main()` | function | `tools/stream-watch.ts:213` | Pre-seeds storage, starts CC + Codex extractors, enables live mode, logs status, and installs SIGINT/SIGTERM handlers for graceful shutdown. |

### `tools/sync-skills.sh` — canonical-skills-to-Claude-adapter sync

**Purpose:** Copies canonical cross-tool protocol skills from `skills/*.md` into the Claude Code command adapter directories (project `.claude/commands/` and, if present, the global `~/.claude/commands/`), keeping them byte-identical since Claude Code's skill discovery doesn't follow symlinks. Supports a `--check` mode that fails on drift without writing.

**Depends on:** none (external: standard POSIX `cp`/`cmp`/`mkdir`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint (sync/--check loop over `skills/*.md`) | script flow | `tools/sync-skills.sh:1` | Resolves repo root and `skills/`/`.claude/commands/` paths, detects an existing global `~/.claude/commands/` directory, then for each canonical skill file either compares (`--check` mode, setting `drift=1` and printing diagnostics on mismatch/missing) or copies it to the project adapter and, if present, the global adapter; prints a final OK/DRIFT summary and exits 1 on any drift in check mode. |

### `tools/tail-mcp.sh` — live MCP call tailer

**Purpose:** Polls the ECHO daemon's `/mcp/recent-calls` HTTP endpoint in a loop and prints each call's timestamp, tool name, duration, and status to the terminal, tracking the daemon's up/down reachability state across polls.

**Depends on:** none (external: `curl`, `jq`, `python3`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `now_ms()` | function | `tools/tail-mcp.sh:14` | Returns current epoch time in milliseconds via a python3 one-liner. |
| `mark_unreachable()` | function | `tools/tail-mcp.sh:18` | Prints a "daemon unreachable" notice once (idempotent via `daemon_down` flag) when a poll fails. |
| entrypoint (poll loop) | script flow | `tools/tail-mcp.sh:1` | Loops every `POLL_SECONDS`, requesting `since`/`until` windows (with a 2s future-skew buffer) from the daemon; on success validates the JSON shape with `jq`, prints an "daemon back online" notice on recovery, formats and prints each call row via `jq`, and advances `last_ts` to the max seen `ts`. |

### `tools/test_blocked.py` — unit tests for the backlog selector

**Purpose:** Exercises `tools/blocked.py` (not in scope here), the deterministic backlog item selector/validator, covering default selection ordering, `ready_content_sha` sealing rules, dependency (`blocked_by`) satisfaction semantics, priority/date ordering, `--validate` error modes, and listing modes (`--list-all`, `--list-blocked`).

**Depends on:** `tools/blocked.py` (invoked as a subprocess, not read in this pass); external: `subprocess`, `unittest`, `tempfile`, `shutil`, `textwrap`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `compute_content_sha(path)` | function | `tools/test_blocked.py:21` | Shells out to `blocked.py --ready-content-sha <path>` and returns the digest string, raising on nonzero exit. |
| `write_item(repo, stage, item_id, ...)` | function | `tools/test_blocked.py:32` | Writes a minimal valid backlog item markdown file (frontmatter + body) into `repo/backlog/<stage>/`, optionally sealing it with a computed `ready_content_sha` when `stage == "ready"`. |
| `make_repo()` | function | `tools/test_blocked.py:78` | Creates a temp directory with a fake `.git` and all five backlog stage subdirectories. |
| `run_script(repo, *args)` | function | `tools/test_blocked.py:87` | Runs `blocked.py` as a subprocess with `cwd=repo` and returns `(returncode, stdout, stderr)`. |
| `BlockedScriptTests` | class | `tools/test_blocked.py:98` | `unittest.TestCase` covering selection, sealing, dependency, ordering, validation, and listing behavior of `blocked.py`. |
| `BlockedScriptTests.setUp()` | method | `tools/test_blocked.py:99` | Creates a fresh temp repo before each test. |
| `BlockedScriptTests.tearDown()` | method | `tools/test_blocked.py:102` | Removes the temp repo after each test. |
| `BlockedScriptTests.ready_content_sha(path)` | method | `tools/test_blocked.py:105` | Test helper wrapping `run_script(..., "--ready-content-sha", path)` with an rc==0 assertion. |
| `BlockedScriptTests.test_empty_queue_exits_1()` | method | `tools/test_blocked.py:112` | Asserts an empty backlog yields exit code 1 and no output. |
| `BlockedScriptTests.test_single_unblocked_item_is_picked()` | method | `tools/test_blocked.py:117` | Asserts a lone unblocked ready item is selected. |
| `BlockedScriptTests.test_empty_requested_reviewers_does_not_gate()` | method | `tools/test_blocked.py:123` | Asserts an empty `requested_reviewers: []` list does not block claimability. |
| `BlockedScriptTests.test_absent_requested_reviewers_does_not_gate()` | method | `tools/test_blocked.py:134` | Asserts a missing `requested_reviewers` field does not block claimability. |
| `BlockedScriptTests.test_inline_requested_reviewers_does_not_gate_when_ready_sealed()` | method | `tools/test_blocked.py:140` | Asserts a populated `requested_reviewers` list on an otherwise-sealed ready item still allows selection. |
| `BlockedScriptTests.test_malformed_requested_reviewers_does_not_affect_claimability()` | method | `tools/test_blocked.py:151` | Asserts a malformed (string, not list) `requested_reviewers` value doesn't block selection. |
| `BlockedScriptTests.test_missing_ready_content_sha_is_blocked()` | method | `tools/test_blocked.py:162` | Asserts an unsealed ready item is reported blocked with reason `missing-ready-content-sha` and excluded from selection. |
| `BlockedScriptTests.test_ready_content_sha_mismatch_is_blocked()` | method | `tools/test_blocked.py:178` | Asserts a body edit after sealing invalidates the digest, blocking with `ready-content-sha-mismatch`. |
| `BlockedScriptTests.test_spec_review_only_matching_digest_is_blocked_without_ready_seal()` | method | `tools/test_blocked.py:197` | Asserts a legacy `spec_review_sha` match alone (without a `ready_content_sha` seal) still leaves the item blocked as `missing-ready-content-sha`. |
| `BlockedScriptTests.test_legacy_marker_fields_are_excluded_from_ready_seal()` | method | `tools/test_blocked.py:226` | Asserts stray legacy `spec_review`/`spec_review_sha` fields don't interfere with an otherwise-valid `ready_content_sha` seal. |
| `BlockedScriptTests.test_spec_review_any_value_is_inert_without_ready_seal()` | method | `tools/test_blocked.py:248` | Asserts any `spec_review` value alone, without `ready_content_sha`, leaves the item blocked. |
| `BlockedScriptTests.test_body_delta_after_legacy_convergence_is_missing_seal()` | method | `tools/test_blocked.py:273` | Asserts a body change after a legacy `spec_review: converged` + matching `spec_review_sha` still yields `missing-ready-content-sha` (legacy convergence doesn't substitute for the seal). |
| `BlockedScriptTests.test_waived_spec_review_is_blocked_without_ready_seal()` | method | `tools/test_blocked.py:303` | Asserts `spec_review: waived` alone doesn't satisfy the ready seal requirement. |
| `BlockedScriptTests.test_alpha_suffixed_id_is_accepted()` | method | `tools/test_blocked.py:322` | Asserts item ids with an alpha suffix (e.g. `057a`) are accepted and selectable. |
| `BlockedScriptTests.test_proposed_item_is_never_a_candidate()` | method | `tools/test_blocked.py:330` | Asserts items in `backlog/proposed/` are never selection candidates. |
| `BlockedScriptTests.test_blocker_in_pending_review_does_NOT_unblock()` | method | `tools/test_blocked.py:336` | Asserts a blocker sitting in `pending_review/` does not satisfy `blocked_by` (only `complete/` counts). |
| `BlockedScriptTests.test_blocker_in_proposed_is_known_but_does_NOT_unblock()` | method | `tools/test_blocked.py:349` | Asserts a blocker in `proposed/` is recognized as a known id by `--validate` but still does not unblock. |
| `BlockedScriptTests.test_blocker_in_complete_unblocks()` | method | `tools/test_blocked.py:364` | Asserts a blocker present in `complete/` correctly unblocks the dependent item. |
| `BlockedScriptTests.test_partial_dependency_satisfaction_does_NOT_unblock()` | method | `tools/test_blocked.py:376` | Asserts an item with two `blocked_by` deps, only one satisfied, remains blocked while the other unblocked item is picked. |
| `BlockedScriptTests.test_priority_outranks_date()` | method | `tools/test_blocked.py:393` | Asserts HIGH priority is selected over an older LOW-priority item. |
| `BlockedScriptTests.test_date_breaks_priority_tie()` | method | `tools/test_blocked.py:406` | Asserts the older of two equal-priority items is selected. |
| `BlockedScriptTests.test_validate_clean_repo_exits_0()` | method | `tools/test_blocked.py:421` | Asserts `--validate` on a clean repo exits 0 and prints `OK`. |
| `BlockedScriptTests.test_dangling_blocked_by_exits_2()` | method | `tools/test_blocked.py:427` | Asserts a `blocked_by` referencing an unknown id fails validation with exit 2. |
| `BlockedScriptTests.test_cycle_detection_exits_2()` | method | `tools/test_blocked.py:436` | Asserts a two-item circular `blocked_by` dependency is detected and fails validation. |
| `BlockedScriptTests.test_id_filename_mismatch_exits_2()` | method | `tools/test_blocked.py:449` | Asserts a frontmatter `id` that doesn't match the filename fails validation. |
| `BlockedScriptTests.test_duplicate_id_exits_2()` | method | `tools/test_blocked.py:469` | Asserts the same `id` appearing in two backlog stages fails validation. |
| `BlockedScriptTests.test_bad_priority_exits_2()` | method | `tools/test_blocked.py:490` | Asserts an invalid `priority` value (e.g. `URGENT`) fails validation. |
| `BlockedScriptTests.test_bad_spec_review_value_is_ignored_by_validate()` | method | `tools/test_blocked.py:509` | Asserts an arbitrary `spec_review` value doesn't trigger a validation error. |
| `BlockedScriptTests.test_converged_without_digest_is_ignored_by_validate()` | method | `tools/test_blocked.py:520` | Asserts `spec_review: converged` without a `spec_review_sha` doesn't fail validation. |
| `BlockedScriptTests.test_malformed_spec_review_sha_is_ignored_by_validate()` | method | `tools/test_blocked.py:534` | Asserts a malformed `spec_review_sha` value doesn't fail validation. |
| `BlockedScriptTests.test_status_field_is_NOT_validated()` | method | `tools/test_blocked.py:548` | Asserts a stale/incorrect `status` frontmatter field (folder is truth) doesn't fail validation. |
| `BlockedScriptTests.test_list_all_shows_each_ready_item_with_status()` | method | `tools/test_blocked.py:572` | Asserts `--list-all` prints READY/BLOCKED status labels for each ready-stage item. |
| `BlockedScriptTests.test_list_blocked_shows_only_blocked_items()` | method | `tools/test_blocked.py:589` | Asserts `--list-blocked` shows only blocked items, omitting unblocked ones. |
| `BlockedScriptTests.test_unknown_flag_exits_2()` | method | `tools/test_blocked.py:601` | Asserts an unrecognized CLI flag exits 2 with an "unknown flag" error. |
| `BlockedScriptTests.test_ready_content_sha_is_only_advertised_digest_flag()` | method | `tools/test_blocked.py:606` | Asserts `--help` advertises `--ready-content-sha` but not a legacy `--spec-review-sha`, and that the legacy flag is rejected as unknown. |

### `tools/validate-resolution.ts` — item-020 open-loop resolution validation harness

**Purpose:** Calls `getRecentWorkContext` against live SQLite storage over a configurable day window and writes a markdown scoring sheet of every open-loop hint (resolved/unresolved) for the founder to hand-score TP/FP/TN/FN, per the R1 open-loop resolution heuristic validation (item 020). Does not auto-score.

**Depends on:** `src/mcp/tools/recent-work-context.js` (getRecentWorkContext), `src/storage/sqlite.js` (SqliteStorage), `src/trace/types.js` (OpenLoopHintEnriched), `src/normalize/types.js` (NormalizedContextEvent); external: `node:fs`, `node:os`, `node:path`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `Args` | interface | `tools/validate-resolution.ts:25` | Shape of parsed CLI args: `days`, `outPath`. |
| `parseArgs(argv)` | function | `tools/validate-resolution.ts:30` | Parses `--days` and `--out` flags with defaults. |
| `defaultOutPath()` | function | `tools/validate-resolution.ts:48` | Default output path: `raw/internal/dogfooding/020-resolution-validation.md`. |
| `resolveDbPath()` | function | `tools/validate-resolution.ts:59` | Resolves the SQLite db path following the daemon's precedence: `ECHO_DB_PATH` > `ECHO_DATA_DIR/echo.db` > `~/Library/Application Support/ECHO/echo.db`. |
| `escapeCell(s)` | function | `tools/validate-resolution.ts:69` | Escapes markdown table-cell-breaking characters (`|`, newlines) and truncates to 240 chars. |
| `Row` | interface | `tools/validate-resolution.ts:74` | Shape of one scoring-sheet row: hint kind/text/resolved flag, resolver atom id, and atom timestamps/urls. |
| `buildRow(hint, atoms)` | function | `tools/validate-resolution.ts:85` | Builds a `Row` from an `OpenLoopHintEnriched` plus the atom lookup map, pulling the hint atom's `raw_pointer`/`occurred_at` and the resolver atom's `occurred_at` if present. |
| `renderMarkdown(rows, days, until)` | function | `tools/validate-resolution.ts:107` | Renders the full markdown report: header explaining TP/FP/TN/FN scoring, the per-row table, and a per-kind breakdown of resolved/unresolved counts. |
| `main()` | function | `tools/validate-resolution.ts:160` | Opens `SqliteStorage`, computes the `(since, until)` window, calls `getRecentWorkContext`, flattens every cluster's `open_loop_hints` into `Row`s, renders and writes the markdown file, then closes storage. |

### `tools/wiki_index.py` — wiki index generator

**Purpose:** Generates `wiki/index.md` from `wiki/.manifest.json`, replacing a previously hand-edited index that drifted from the manifest; groups entries by folder (per the fixed 8-folder taxonomy) then by topic, tagging `planned`-status pages inline. Supports a `--check` mode for CI staleness detection.

**Depends on:** none (external: `json`, `pathlib`); reads `wiki/.manifest.json`, writes `wiki/index.md`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `FOLDER_ORDER` | const | `tools/wiki_index.py:33` | Fixed ordering of the 8 wiki folders (product, principles, architecture, capture, capture/per-app, surfaces, research, operating-model) used to render sections in order. |
| `FOLDER_TITLES` | const | `tools/wiki_index.py:44` | Maps each folder key to its human-readable section heading text. |
| `load_manifest()` | function | `tools/wiki_index.py:56` | Reads and JSON-parses `wiki/.manifest.json`, exiting 2 with an error on read/parse failure. |
| `render_index(manifest)` | function | `tools/wiki_index.py:65` | Groups manifest entries by folder then topic, sorts topics alphabetically and pages by title, renders the full markdown index string with shipped/planned counts, and returns `(rendered_text, total_entries)`. |
| `main()` | function | `tools/wiki_index.py:134` | Loads the manifest, renders the index; in `--check` mode compares against the on-disk file and returns 1 on staleness, otherwise writes `wiki/index.md` and prints a summary. |
