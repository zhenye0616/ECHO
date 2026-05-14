---
description: ECHO cold-start primer — distinct from the superpowers plugin skill of the same name. Tells strategist / builder / watcher / dispatcher role bindings to read their role's task-state pointer FIRST on cold-start. Reviewer ticks are explicitly excluded — fresh-eyes-at-SHA is preserved by AC3 validate.py.
---

# Cold-start primer — read your role's task-state pointer first

This ECHO-namespaced skill teaches cold-start actors to skip the full-corpus reload tax by reading the compact role-typed task-state pointer for their role before doing anything else. It is the cross-tool counterpart to (and does NOT override) the superpowers plugin's `using-superpowers` skill; both apply.

## The rule

**If you are a strategist, builder, watcher, or dispatcher role binding AND a `task_state_ref:` is in scope for your action — current backlog item, current strategist session resume, current dispatcher pass — read the pointer FIRST via `get_role_state` or `git show <ref>:<path>` BEFORE any broad-corpus reconstruction (no `find_clusters`, no recursive grep, no spec-status inventory).**

The pointer is the operative working-memory snapshot for that role. It tells you which context matters right now, what mode you're in, what's already decided, what's open, and what must not be touched. Reading the canonical anchor (the spec at SHA) for any decision that depends on it is then a single targeted read, not a corpus walk.

## What's in scope

- `task_state_ref:` set in a `backlog/ready/<id>.md` / `claimed/<id>.md` / `pending_review/<id>.md` frontmatter → resolves to `backlog/task-state/<task-id>/`.
- `task_state_ref:` set in a per-round `backlog/reviews/<task-id>/r<N>/request.md` frontmatter → same resolution; watchers and dispatchers consume it.
- A strategist resuming after `/clear` → if the strategist knows the task id they were working on, they read `strategist.md` for that task.

## Explicit exclusion — reviewer ticks (codex / cursor / codex-ops)

**Reviewer-tick role bindings (`codex`, `codex-ops`, `cursor` in reviewer mode) do NOT read `task_state_ref` and MUST NOT read `backlog/task-state/<id>/*.md`.** Fresh-eyes-at-SHA is the invariant: reviewers consume only `request.md` (artifact SHA, spec ref, requested lens) and the spec at SHA. AC3's `tools/review-queue/validate.py` hard-fails any reviewer response that quotes three or more role-typed task-state required-block headings (statistical evidence of verbatim quotation) — the response is quarantined per 041 AC4 `.invalid.<ISO-ts>` rename, and `queue-errors.md` records the trace.

A codex reviewer-tick that finds `task_state_ref:` in a `request.md` MUST ignore it and proceed with the standard reviewer protocol: read the artifact at `spec_commit_sha`, evaluate against the requested lens, write `<reviewer>.md` with `consumed_task_state: false` (omit, since the default is false) and a body that does not quote task-state required-block headings.

## Worked example — strategist resume after `/clear`

Before 046: a strategist resuming after `/clear` would run `find_clusters` + `get_atoms` to reconstruct what they were last working on, read CLAUDE.md, read BACKLOG.md, read recent journal entries — typically 3+ MCP calls and ~100 atoms before any productive work began.

After 046: the same strategist reads `backlog/task-state/<task-id>/strategist.md` (≤120 lines) via `get_role_state` or `git show HEAD:<path>`. The five required blocks (`current_thesis`, `locked_decisions`, `open_questions`, `dont_touch`, `canonical_anchors`) carry forward the operative frame compactly. If a specific decision needs verification, the strategist reads the canonical anchor (`spec`) — a single targeted read. The dogfooding journal entry for this read still applies (see CLAUDE.md "Dogfooding journal discipline").

## Counter-example — reviewer tick that ignores task_state_ref

A codex reviewer tick fires. It reads `request.md` and sees `task_state_ref: 2026-05-13-046-context-fatigue-via-role-typed-state`. The reviewer **does not** call `get_role_state` and **does not** `git show` the pointer. It proceeds straight to `git show <spec_commit_sha>:backlog/<stage>/<task-id>.md` and reviews the spec at that SHA. Its `codex.md` body discusses the spec on its own terms. AC3 validate.py runs against the committed response; no required-block headings are present (none of `## current_thesis`, `## locked_decisions`, etc. appear), `consumed_task_state` is unset (defaulting to false). Validation passes.

## Journal-by-proxy carries through

The journal-by-proxy rule (CLAUDE.md "Dogfooding journal discipline — Journal-by-proxy for read-only consultees") applies to pointer reads the same way it applies to any other ECHO MCP call. A read-only consultee that calls `get_role_state` or `list_task_states` reports the call to its orchestrator in the same turn; the orchestrator journals it.

## Related

- `skills/role-typed-task-state.md` — pointer schema + read protocol + CAS write protocol.
- `CLAUDE.md` "Dogfooding journal discipline" — journal-by-proxy rule.
- `tools/review-queue/validate.py` — reviewer-side fresh-eyes enforcement (`REVIEWER_FRESH_EYES_VIOLATION`).
