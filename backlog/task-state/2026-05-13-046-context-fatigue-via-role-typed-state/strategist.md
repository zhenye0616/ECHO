---
role: strategist
task_id: 2026-05-13-046-context-fatigue-via-role-typed-state
written_at: 2026-05-14T04:55:00Z
written_by: builder-046-recursive-dogfooding
---

## current_thesis

046 ships the role-typed task-state primitive as the LAST friction-removal spec before the vendor-agnostic ECHO pivot. The cure shape — `role = (skill bundle, prompt, task-state pointer); bindings are interchangeable` — is structurally identical to what the planned vendor-agnostic work requires anyway. We collapse the two so 046 is both: the umbrella friction fix AND V1 of the role/binding decomposition.

## locked_decisions

- Filesystem layout: `backlog/task-state/<task-id>/{strategist,builder,round-state}.md`. Five required L2 headings in fixed order. Cap 120 lines body; target 40-60.
- `round-state.md` is rewritten in-place at each round boundary. Old rounds remain canonical in `backlog/reviews/<task>/r<N>/`.
- `round-state.md` write protocol is compare-and-swap with blob-lease (`tools/task-state/push-round-state.sh`). Generic `push-with-retry.sh` is unsafe for round-state — clean line-level rebase silently merges stale rewrites onto newer blobs.
- Reviewer ticks NEVER read `task_state_ref` and NEVER read `backlog/task-state/<id>/*.md`. Fresh-eyes-at-SHA is the invariant. `tools/review-queue/validate.py` enforces with field-aware content detection (three-or-more required-block headings = REVIEWER_FRESH_EYES_VIOLATION).
- `canonical_anchors` parser is TypeScript-only in V1 (`src/mcp/parse-anchors.ts`). Shared fixture file `tests/task-state/anchors-fixtures.json` is the cross-language contract.
- MCP `get_role_state` / `list_task_states` use the always-pin-to-commit-SHA contract: resolve input ref ONCE at call entry via `git rev-parse <ref>^{commit}`, use that SHA for all subsequent reads, echo the resolved SHA in the response `ref` field.
- Repo root resolves at server-start via constructor option > `ECHO_REPO_ROOT` > `cwd()`. Captured once; tool handlers do not re-read `process.cwd()`.
- No working-tree reads in V1. Read contract is committed blobs only.
- `upsert_role_state` (write surface) is V2 follow-up. V1 ships read-only MCP.
- Cold-start primer (`skills/using-superpowers.md` — the ECHO-namespaced one, distinct from the superpowers plugin) tells strategist/builder/watcher/dispatcher to read their pointer FIRST. Reviewer ticks explicitly excluded.

## open_questions

- Whether the 120-line hard cap forces destructive pruning during long multi-round cycles. Empirical observation in the post-merge 1-week measurement.
- Whether MCP-only cold-start (a binding without FS access) actually obviates full-corpus reload, or whether the FS path remains structurally faster for most actors.
- Naming: this skill duplicates the superpowers plugin's `using-superpowers` skill name. If a future cross-binding cold-start primer needs a less ambiguous handle, rename (the slug is forward-only — existing callers reference by filename).

## dont_touch

- The reviewer-tick path. AC3 fresh-eyes enforcement is the structural defense; do not soften it. Reviewers continue to read `request.md` + spec-at-SHA, period.
- The `round-state.md` write protocol. Both writers (watcher post-combine; strategist between rounds) use the SAME blob-lease helper. Do not delegate round-state pushes to the generic `push-with-retry.sh`.
- The MCP write surface. V1 is read-only on purpose; conflict semantics for a write surface deserve their own spec.
- The dogfooding journal. Pointers are working-memory snapshots; they do NOT replace the canonical cross-tool log.
- Pre-046 backlog items. No retroactive backfill of `task_state_ref` or `backlog/task-state/<id>/` directories. The schema is forward-only.

## canonical_anchors

- spec: backlog/claimed/2026-05-13-046-context-fatigue-via-role-typed-state.md
- reviews: backlog/reviews/2026-05-13-046-context-fatigue-via-role-typed-state/
