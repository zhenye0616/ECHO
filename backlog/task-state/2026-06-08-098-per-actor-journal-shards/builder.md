---
task_id: 2026-06-08-098-per-actor-journal-shards
role: builder
writer: codex-builder
binding: codex
claim_branch: agent/per-actor-journal-shards
last_updated: 2026-06-08T22:48:08Z
---

## current_thesis

Fresh claim by codex builder `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405`. Implement per-actor dogfooding journal shards: the reviewer wrapper writes only its actor shard, `journal-cat.sh` reads the union chronologically and loudly rejects malformed blocks, in-repo discipline points readers/writers at shards, and the frozen June shared journal gets only the cutover note.

## locked_decisions

- AC1: `_run_reviewer.sh` `append_wrapper_journal()` must validate `REVIEWER_NAME` against `^[a-z][a-z0-9-]*$`, then write/stage `mcp-interactions-journal-<month>-<actor>.md` with commit/push flow otherwise unchanged.
- AC2: new actor monthly shards bootstrap with the canonical preamble header, timezone convention, and Quick-Fill Template; repeated appends must not duplicate the preamble.
- AC3: new read-only `tools/dogfooding/journal-cat.sh <month>` merges the legacy shared file plus per-actor shards, strips duplicate preambles, sorts entries chronologically, uses deterministic equal-timestamp ordering, and fails non-zero with source path + line for unparseable blocks.
- AC4: update `CLAUDE.md` and `AGENTS.md` dogfooding-journal discipline to make per-actor shards canonical, define actor slugs, and document reading through `journal-cat.sh`; preserve the existing in-the-moment, skip, proxy, and 6-field-template rules.
- AC5: add focused tests for merge ordering, preamble collapse, equal timestamp determinism, wrapper path shape, wrapper slug validation, malformed block failure, plus the specified lint/typecheck/syntax/real-data smoke commands.
- LD4 cutover: append only a one-line pre-shard/frozen-file note to `raw/internal/dogfooding/mcp-interactions-journal-2026-06.md`; do not split, rewrite, or backfill history.

## open_questions

- None blocking at claim time. Escalate if the implementation needs files outside `files_to_modify`, a new dependency, changes to `push-with-retry.sh`, changes to skills, or a structured/non-markdown journal format.

## dont_touch

- Do not rewrite or split existing shared journal files; include frozen legacy files only in the merge helper.
- Do not solve same-slug concurrent-write safety, introduce per-process slugs, or switch to directory-per-entry/maildir storage.
- Do not change `push-with-retry.sh`, coord lifecycle, commit-message protocol, entry template, 6 required fields, skip-rule, or journal-by-proxy rule.
- Do not add a daemon/MCP-side journal writer, structured journal format, or per-actor shards for other shared files such as `queue-errors.md`.
- Do not edit `wiki/**`, docs/status/backlog founder-owned files, backlog item bodies, or files outside the spec's `files_to_modify` except this builder pointer/run-log handoff path.

## canonical_anchors

- spec: backlog/claimed/2026-06-08-098-per-actor-journal-shards.md
- reviews: backlog/reviews/2026-06-08-098-per-actor-journal-shards/
