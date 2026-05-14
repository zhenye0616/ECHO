---
description: Schema + read contract for ECHO's role-typed task-state pointers — the compact, role-typed working-memory snapshots that let cold-start strategist/builder/watcher/dispatcher actors skip full-corpus reload. NOT consumed by reviewer ticks (fresh-eyes-at-SHA is preserved).
---

# Role-typed task-state pointers

**Working memory, not audit trail.** A task-state pointer is the smallest piece of writing that lets a cold-start actor pick up *this task, this role, right now* without re-deriving the whole corpus. The canonical audit trail (specs, transcripts, reviewer artifacts, the dogfooding journal) is unchanged — pointers compress the still-load-bearing parts so the actor's first action is productive work, not reconstruction.

## Filesystem layout

```
backlog/task-state/<task-id>/
├── strategist.md       # written by the strategist role (current binding)
├── builder.md          # written by the builder role (current binding)
└── round-state.md      # written at round boundaries (watcher + strategist edits)
```

`<task-id>` matches the backlog item id verbatim (e.g. `2026-05-13-046-context-fatigue-via-role-typed-state`). Forward-only: pointers exist for items created on-or-after 046 ships; no backfill.

## Required blocks (every pointer)

Every pointer file has YAML frontmatter (optional) followed by **five Markdown level-2 headings**, in this exact order:

```markdown
## current_thesis
<one paragraph: the operative frame right now>

## locked_decisions
- <bullets: things decided, do not re-litigate>

## open_questions
- <bullets: still in flight; what the next action is gated on>

## dont_touch
- <bullets: surface area that adjacent work must leave alone>

## canonical_anchors
- spec: backlog/<stage>/<task-id>.md
- reviews: backlog/reviews/<task-id>/      # optional
```

Bodies under each heading are free Markdown until the next `## ` line. Empty bodies are permitted but the heading must be present (the lint enforces presence, not body length).

### `round-state.md` adds `current_round:`

`round-state.md` files additionally carry `current_round: r<N>` as the **first non-blank line after the optional frontmatter and before the `## current_thesis` heading**:

```markdown
---
... optional frontmatter ...
---
current_round: r3

## current_thesis
...
```

Rewritten in place at each round boundary. Old rounds remain canonical in `backlog/reviews/<task>/r<N>/{request,codex,cursor,codex-ops,combined}.md`; the pointer prunes superseded detail and keeps only still-load-bearing prior decisions.

### `canonical_anchors` body syntax (pinned)

Bulleted list, one anchor per line, in the form `- <key>: <value>`. Allowed V1 keys:

- `spec` — required. Path to the canonical spec file (typically `backlog/<stage>/<task-id>.md`).
- `reviews` — optional. Path to the reviews directory (typically `backlog/reviews/<task-id>/`).

Parser is **TypeScript-only in V1** at `src/mcp/parse-anchors.ts`, called from the MCP server's `list_task_states` handler. The Python lint (`tools/task-state/lint.py`) checks only **block presence and order**, not anchor structure — so there is no Python parser to drift from the TS one.

Shared fixture file: `tests/task-state/anchors-fixtures.json` carries `[ { input: <markdown body>, expected: { spec, reviews? } | { _parse_error: <reason> } } ]` pairs. Anchor tests assert each fixture parses identically. Any future Python consumer that needs anchor parsing MUST be a port that passes the same fixtures.

## Hard line cap

**120 lines hard (target 40-60).** The cap measures the file **body only** — content after the closing `---` of the optional YAML frontmatter, or from line 1 if no frontmatter is present. Lint surfaces:

- ≤ 80 body lines: pass silently.
- 81-120 body lines: pass with a soft warning (target zone breached).
- &gt; 120 body lines: hard fail.

The cap is the structural enforcement of "working memory, not audit trail." Drift-into-prose compresses naturally because the cap forces compression.

## Writer responsibilities

| Pointer | Writer | When |
|---|---|---|
| `strategist.md` | strategist role (current binding) | At session end or before `/clear`; freshness check on rewrite. |
| `builder.md` | builder role (current binding) | On atomic-claim (initial), after milestone commits, on completion (move to `pending_review`). |
| `round-state.md` | watcher (boundary rewrite) + strategist (between-round edits) | After `combine.py` emits `combined.md`; before `request.py` creates next round. |

**Reviewer ticks NEVER write `round-state.md` and MUST NOT read any pointer file under `backlog/task-state/<task-id>/`.** Fresh-eyes-at-SHA is the invariant; reviewers consume only `request.md` (artifact SHA, spec ref, requested lens) and the spec at SHA. Structural enforcement lives in `tools/review-queue/validate.py` (REVIEWER_FRESH_EYES_VIOLATION).

## `round-state.md` write protocol (compare-and-swap, blob-lease form)

Both writers (watcher post-combine; strategist between rounds) use this protocol verbatim. The protocol prevents two concurrent writers from cleanly replaying a stale full-file rewrite onto a newer round-state blob — line-level clean rebase is NOT a semantic CAS success.

1. **Read base.** `base_blob = git rev-parse HEAD:backlog/task-state/<task-id>/round-state.md`. If the path does not resolve (first-write path; file does not yet exist at HEAD), set `base_blob = ABSENT` — a literal sentinel string that compares only to itself or to other resolution failures.
2. **Compute new content** in a tmp file. `mkdir -p backlog/task-state/<task-id>` first; the directory may not yet exist on first write. No git operations in this step.
3. **Refresh upstream.** `git fetch origin main` (no rebase yet; just refresh `origin/main`).
4. **Compare-and-swap (read-to-write race).** `now_remote_blob = git rev-parse origin/main:backlog/task-state/<task-id>/round-state.md` (or `ABSENT` if the path does not resolve at `origin/main`). If `now_remote_blob != base_blob`, abort: another writer landed between step 1 and now. Append `ROUND_STATE_WRITE_CAS_ABORT: <writer> base=<base_blob> remote=<now_remote_blob> ts=<ISO>` to `raw/internal/queue-errors.md`, do NOT replace the file, exit non-zero. The next tick re-reads from the new base. **First-write CAS:** both `ABSENT` succeeds (no concurrent creator); only one `ABSENT` aborts (another writer either appeared or removed the file — both anomalous).
5. **Atomic FS swap.** `os.replace(tmp_path, final_path)`.
6. **Commit + push via the round-state-specific helper** `tools/task-state/push-round-state.sh <task-id> <base_blob>`. The helper implements a **blob-lease around the push** and does NOT delegate to the generic `push-with-retry.sh`:
   - `git add backlog/task-state/<task-id>/round-state.md` + commit.
   - `git push origin main`. On success, exit 0.
   - On rejection: `git fetch origin main`, then re-read `now_remote_blob = git rev-parse origin/main:<path>` (or `ABSENT`). If `now_remote_blob != base_blob`, the lease is broken. **Durable-log abort sequence:**
     1. `git reset --hard origin/main` FIRST — discards the stale local round-state commit. Worktree now matches `origin/main`.
     2. Append `ROUND_STATE_WRITE_CAS_ABORT_PUSH: <writer> base=<base_blob> remote=<now_remote_blob> ts=<ISO>` to `raw/internal/queue-errors.md` (now a clean working-tree edit against `origin/main`).
     3. `git add raw/internal/queue-errors.md` + commit (`queue-errors: round-state CAS push abort`) + push via the generic `tools/review-queue/push-with-retry.sh` — a log-only commit; uncontested.
     4. Exit non-zero so the writer's caller sees the abort.
     **Do NOT rebase the original stale round-state commit.** A clean line-level rebase would silently land the stale rewrite on top of the newer round-state blob — exactly the race the protocol defends against.
   - If the blob is unchanged at the remote (origin/main advanced but did not touch this file), the lease holds — `git pull --rebase origin main` is safe in that narrow case; retry push once. If the rebase introduces ANY conflict on this file specifically, run the durable-log abort sequence above (do NOT auto-resolve).

## Read protocol — two equivalent paths, ref-pinned (AC5)

The pointer's content is **byte-identical** through either path at the same git ref. Future transports (HTTP, gRPC, other) MUST implement the same ref-pinned contract.

- **FS-capable bindings:** `git show <ref>:backlog/task-state/<task-id>/<role>.md`. `<ref>` is any git-resolvable ref (SHA, branch, tag). Use HEAD if you don't need a specific snapshot.
- **MCP-capable bindings:** `get_role_state(task_id, role, ref?)` (single file) or `list_task_states({ ref? })` (discovery). When `ref` is omitted, MCP resolves it to HEAD at call time, pins the resulting commit SHA for the rest of the call, and echoes that SHA back in the response's `ref` field.

**Byte-identity contract.** For the same `(repo_root, ref, task_id+role)`, `git show <ref>:<path>` and `get_role_state(task_id, role, <same-ref>)` return byte-identical `content`. Tests assert this directly: spawn `git show` in a fixture, call MCP at the same ref, compare bytes.

**Working-tree reads are not part of the contract.** V1 reads from committed blobs only; "show me what's currently on disk including uncommitted edits" is out of scope. Acceptable trade for V1 (eliminates partial / dirty-tree / mid-pull-rebase hazards).

**No implicit conversion.** Pointer content is the committed byte stream verbatim; consumers parse the required top blocks themselves and run anchor lines through the shared parser (`src/mcp/parse-anchors.ts`).

## When NOT to write a pointer

- Reviewer ticks (no pointer; fresh-eyes-at-SHA invariant).
- One-shot strategist conversations that close inside the same session (no `/clear`, no cross-tool consult): the journal entry + the spec body already carry the cost-of-resumption to zero.
- Items where `task_state_ref:` is intentionally omitted from frontmatter (backwards-compat for pre-046 items; no retroactive backfill).

## Related

- `backlog/README.md` — pipeline + `task_state_ref:` frontmatter field.
- `tools/task-state/lint.py` — block-presence + cap enforcement.
- `tools/task-state/push-round-state.sh` — blob-lease helper.
- `tools/review-queue/validate.py` — reviewer-side fresh-eyes enforcement.
- `src/mcp/parse-anchors.ts` — canonical anchors parser.
- `CLAUDE.md` "Dogfooding journal discipline — Journal-by-proxy" — read-only consultee protocol.
- `skills/using-superpowers.md` — cold-start primer ("read your role's task-state pointer first").
