# `tools/task-state/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 3 files.

### `tools/task-state/lint.py` — role-typed task-state pointer linter

**Purpose:** Walks `backlog/task-state/**/*.md` and validates each file against the pointer contract: body line-count caps, presence/order of the five required `## ` blocks, and (for `round-state.md`) a `current_round: r<N>` header line. Enforces the schema described in `skills/role-typed-task-state.md`.

**Depends on:** none (stdlib only: `os`, `re`, `sys`, `pathlib`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REQUIRED_BLOCKS` | const | `tools/task-state/lint.py:41` | Tuple of the five mandatory heading names in required order. |
| `HARD_CAP` | const | `tools/task-state/lint.py:49` | Body line-count hard failure threshold (120). |
| `SOFT_WARN_AT` | const | `tools/task-state/lint.py:50` | Body line-count soft-warning threshold (81). |
| `_HEADING_RE` | regex | `tools/task-state/lint.py:55` | Matches an exact `## <name>` level-2 heading line, ignoring deeper heading levels. |
| `split_frontmatter(text)` | function | `tools/task-state/lint.py:58` | Splits optional YAML-delimited frontmatter from body, returning the 1-indexed line where body starts and the body text. |
| `count_body_lines(body_text)` | function | `tools/task-state/lint.py:86` | Counts newline-delimited lines in the body, handling trailing-newline edge cases. |
| `check_blocks(body_text, body_offset)` | function | `tools/task-state/lint.py:98` | Verifies all five required blocks are present and appear in the correct relative order; returns line-tagged diagnostics. |
| `check_round_state(body_text, body_offset)` | function | `tools/task-state/lint.py:136` | For `round-state.md` files, verifies the first non-blank body line matches `current_round: r<N>` before any heading. |
| `lint_file(path)` | function | `tools/task-state/lint.py:161` | Runs all checks (line count, block presence/order, round-state header) on one file and returns `(errors, warnings)`. |
| `find_pointers(root)` | function | `tools/task-state/lint.py:198` | Globs all `*.md` files under `backlog/task-state/` relative to repo root. |
| `main(argv)` | function | `tools/task-state/lint.py:205` | CLI entrypoint: lints explicit file args or all discovered pointers, prints diagnostics to stderr, returns 1 on any hard error. |

### `tools/task-state/patch-builder-state.py` — builder.md handoff patcher

**Purpose:** At `/process-backlog` handoff time, refreshes only the staleness-prone fields of an existing `backlog/task-state/<task-id>/builder.md` pointer (frontmatter handoff metadata, `current_thesis` lifecycle marker, `open_questions`, and `canonical_anchors`) without regenerating or overwriting builder-authored content; refuses (exits non-zero) on a missing or malformed pointer rather than silently rewriting it.

**Depends on:** none (stdlib only: `argparse`, `datetime`, `re`, `sys`, `pathlib`, `os`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `REQUIRED_BLOCKS` | const | `tools/task-state/patch-builder-state.py:45` | Tuple of the five required section names, same contract as lint.py. |
| `MARKER_THESIS_START` / `MARKER_THESIS_END` | const | `tools/task-state/patch-builder-state.py:53-54` | HTML-comment markers delimiting the patcher-owned block inside `current_thesis`. |
| `MARKER_OPENQ_START` / `MARKER_OPENQ_END` | const | `tools/task-state/patch-builder-state.py:55-56` | HTML-comment markers delimiting the patcher-owned block inside `open_questions`. |
| `_FRONTMATTER_LINE_RE` | regex | `tools/task-state/patch-builder-state.py:58` | Matches a flat `key: value` frontmatter line. |
| `_HEADING_RE` | regex | `tools/task-state/patch-builder-state.py:59` | Matches a `## <name>` level-2 heading. |
| `_ANCHOR_LINE_RE` | regex | `tools/task-state/patch-builder-state.py:60` | Matches a `- key: value` bullet line inside the anchors section. |
| `MalformedPointer` | class | `tools/task-state/patch-builder-state.py:63` | Exception raised when an existing `builder.md` fails the structural contract, forcing escalation instead of silent rewrite. |
| `utc_now_iso()` | function | `tools/task-state/patch-builder-state.py:72` | Returns the current UTC time formatted as `%Y-%m-%dT%H:%M:%SZ`. |
| `parse_frontmatter(text)` | function | `tools/task-state/patch-builder-state.py:80` | Parses optional `---`-delimited frontmatter into a list of line-items plus the remaining body; raises `MalformedPointer` on unclosed or non-flat lines. |
| `update_frontmatter(items, updates)` | function | `tools/task-state/patch-builder-state.py:118` | Rewrites existing frontmatter keys in place and appends any missing keys after the last keyed line, preserving order. |
| `emit_frontmatter(items)` | function | `tools/task-state/patch-builder-state.py:144` | Serializes the frontmatter items list back into a `---`-delimited block. |
| `parse_sections(body)` | function | `tools/task-state/patch-builder-state.py:148` | Splits the body into pre-heading lead text and a list of `(name, raw_section_text)` tuples per `## ` heading. |
| `validate_required(sections)` | function | `tools/task-state/patch-builder-state.py:188` | Raises `MalformedPointer` if any required block is missing or the required blocks appear out of order. |
| `_replace_marker_block(section_text, start_marker, end_marker, replacement)` | function | `tools/task-state/patch-builder-state.py:206` | Replaces an existing patcher-owned marker block in place, or returns `None` if markers are absent. |
| `_append_marker_block(section_text, marker_block)` | function | `tools/task-state/patch-builder-state.py:227` | Appends a marker block after existing section content with normalized blank-line spacing. |
| `patch_current_thesis(section_text, outcome, head_sha, run_log)` | function | `tools/task-state/patch-builder-state.py:236` | Writes a lifecycle line (COMPLETE or ESCALATED) into the `current_thesis` marker block, replacing or appending it. |
| `_section_body_is_empty(section_text)` | function | `tools/task-state/patch-builder-state.py:259` | Checks whether a section's body (excluding its heading line) is blank. |
| `patch_open_questions(section_text, outcome)` | function | `tools/task-state/patch-builder-state.py:265` | Updates `open_questions`: fills canonical text if empty, preserves byte-for-byte if non-empty+complete, or patches a marker block if non-empty+escalated. |
| `patch_canonical_anchors(section_text, spec_path)` | function | `tools/task-state/patch-builder-state.py:289` | Rewrites the anchors block to only `spec:` (required) and preserved `reviews:` (optional), dropping legacy keys the shipped anchor parser rejects. |
| `patch_text(text, *, outcome, spec_path, branch, head_sha, run_log)` | function | `tools/task-state/patch-builder-state.py:313` | Orchestrates full-document patching: parses frontmatter/sections, validates required blocks, applies frontmatter updates and per-section patches, reassembles the file text. |
| `main(argv)` | function | `tools/task-state/patch-builder-state.py:360` | CLI entrypoint: parses `--task-id`/`--outcome`/`--spec-path`/`--branch`/`--head-sha`/`--run-log`/`--repo-root`, loads `builder.md`, applies `patch_text`, writes result back; no-ops if pointer absent, exits 2 on unreadable/malformed input. |

### `tools/task-state/push-round-state.sh` — blob-lease push helper for round-state.md

**Purpose:** Shell helper used by both the watcher (post-combine) and strategist (between rounds) to commit and push `backlog/task-state/<task-id>/round-state.md` under an optimistic-concurrency (blob-lease) scheme, refusing to auto-resolve conflicts and instead writing a durable abort log when the lease is broken.

**Depends on:** `tools/review-queue/push-with-retry.sh` (invoked to push abort-log commits); external: `git`, `date`, `awk`.

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| `iso_now()` | function | `tools/task-state/push-round-state.sh:58` | Prints current UTC timestamp as `%Y-%m-%dT%H:%M:%SZ`. |
| `resolve_remote_blob()` | function | `tools/task-state/push-round-state.sh:60` | Prints the git blob SHA of the target round-state path at `origin/main`, or `ABSENT` if it doesn't resolve. |
| `durable_log_abort(reason, remote)` | function | `tools/task-state/push-round-state.sh:71` | Hard-resets to `origin/main`, writes a per-event abort-log file under `raw/internal/queue-errors/`, commits and pushes it via `push-with-retry.sh`, then exits 1. |
| `clean_other_than_target_check()` | function | `tools/task-state/push-round-state.sh:106` | Refuses to proceed (exit 2) if any tracked file other than the target round-state.md is dirty in `git status --porcelain`, protecting against wiping unrelated edits on abort. |
| entrypoint flow | script | `tools/task-state/push-round-state.sh:1` | Validates 2 args (`task-id`, `base-blob`/`ABSENT`); runs the clean-tree gate; stages, commits, and pushes round-state.md; on push rejection, checks whether the remote blob still matches `base-blob` (lease holds → pull-rebase + retry) or has changed (lease broken → durable abort); also aborts if a post-rebase blob check shows the local commit was dropped or replaced, or if a second push attempt is rejected. |
