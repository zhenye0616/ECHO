# `tools/dogfooding/` — architecture map

> Part of the [ECHO architecture map](index.md). Generated 2026-07-03 from code at commit `0f77efa1`; every symbol row cites its declaration as `path:line`.
> Covers 1 files.

### `tools/dogfooding/journal-cat.sh` — merges per-actor dogfooding journal shards into one chronological stream

**Purpose:** Bash entrypoint that validates a `YYYY-MM` month argument, cd's to the repo toplevel, then runs an embedded Python heredoc that discovers all `raw/internal/dogfooding/mcp-interactions-journal-<month>*.md` shard files, parses each file's `## Interactions` entries (headers of form `### YYYY-MM-DD HH:MM TZ — ...`), converts each entry's local timestamp to UTC for sorting, merges all entries across shards/actors in chronological order, and prints a single combined markdown document (with a generated preamble, quick-fill template, and `## Interactions` section) to stdout. This is the canonical read target for the cross-tool/cross-actor MCP interactions journal described in CLAUDE.md.

**Depends on:** none (internal); external: `git` CLI (`git rev-parse --show-toplevel`), `python3` standard library (`dataclasses`, `datetime`, `pathlib`, `re`, `sys`).

**Symbols:**

| Symbol | Kind | Location | Description |
|---|---|---|---|
| entrypoint (bash flow) | script | `tools/dogfooding/journal-cat.sh:1` | Validates argc==1 and `MONTH` matches `^[0-9]{4}-[0-9]{2}$`, cd's to git toplevel if inside a repo, then pipes `MONTH` into an embedded `python3 -` heredoc that does the actual merge/print work. |
| `Entry` | class (dataclass) | `tools/dogfooding/journal-cat.sh:52` | Frozen dataclass holding one parsed journal entry: `sort_dt` (UTC datetime), `actor`, `source` (file path), `line` (1-based line number), and `text` (raw entry markdown block). |
| `fail(path, line, message)` | function | `tools/dogfooding/journal-cat.sh:60` | Prints a `journal-cat: <path>:<line>: <message>` error to stderr and raises `SystemExit(1)`, used for malformed-shard validation failures. |
| `actor_for(path)` | function | `tools/dogfooding/journal-cat.sh:65` | Derives the actor slug from a shard filename stem: returns `"shared"` for the bare `mcp-interactions-journal-<month>` file, else the suffix after the month prefix, else falls back to the raw stem. |
| `parse_header(path, line, text)` | function | `tools/dogfooding/journal-cat.sh:76` | Regex-matches an entry header against `header_re`, looks up the timezone abbreviation in `tz_offsets` (PDT/PST/UTC), parses the local `YYYY-MM-DD HH:MM` stamp with that offset, and returns the UTC-converted `datetime`; calls `fail()` on unmatched header or unsupported timezone. |
| `parse_file(path)` | function | `tools/dogfooding/journal-cat.sh:88` | Reads a shard file, locates the `## Interactions` marker line (failing if absent), then scans forward splitting the remaining content into `Entry` records at each `### ` header line, attaching `actor_for(path)` and validating that all post-marker content begins with an entry header. |
| `header_re` | regex | `tools/dogfooding/journal-cat.sh:38` | Compiled pattern matching `### YYYY-MM-DD HH:MM TZ` followed by a dash/em-dash separator or end of line; captures `stamp` and `tz` groups used by `parse_header`. |
| `tz_offsets` | dict (config table) | `tools/dogfooding/journal-cat.sh:44` | Maps supported timezone abbreviations (`PDT`, `PST`, `UTC`) to fixed `timezone` offset objects used to localize entry timestamps before UTC conversion. |
