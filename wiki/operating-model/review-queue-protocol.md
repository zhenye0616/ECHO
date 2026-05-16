---
status: shipped
topic: Process
subtopic: Review Queue Protocol
aliases:
  - Review Queue Protocol
  - Strategist Reviewer Handoff
  - File-Backed Review Queue
---

# Review Queue Protocol

The file-backed wire protocol that lets the strategist and one-or-more reviewers cycle a spec through review rounds without any direct IPC. Every handoff is a committed file under `backlog/reviews/<id>/r<N>/`. Shipped by item 039 (file-backed queue), extended by 040 (watcher-state test), 041 (reviewer background execution), 043 (per-round reviewer roster), 044 (autostash + AC4 auto-disposition), 045 (queue reliability cluster), 050 (worktree isolation), and 056 (claude as fourth reviewer + roster-driven `invoke_command` wrapper).

For the rationale behind multi-reviewer cross-tool review, see [[cross-tool-spec-review]]. This page documents only the mechanical flow.

## End-to-end flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│   STRATEGIST                                                               │
│   (Claude Code, this session)                                              │
│   • picks spec from backlog/pending_review/                                │
│   • runs tools/review-queue/request.py                                     │
│       → freezes spec_commit_sha                                            │
│       → emits requested_reviewers list                                     │
│                                                                            │
└────────────────────────────────────────────┬───────────────────────────────┘
                                             │
                              ─── HANDOFF #1 ─┴─── writes file ───
                              ┌─────────────────────────────────────┐
                              │ backlog/reviews/<id>/r<N>/          │
                              │     request.md                      │
                              │  ─ artifact_path                    │
                              │  ─ spec_commit_sha (frozen)         │
                              │  ─ requested_reviewers: [codex,     │
                              │       codex-ops, cursor, claude]    │
                              │  ─ focus_hints                      │
                              └────────────────┬────────────────────┘
                                               │
            ┌──────────────────────────────────┼──────────────────────────────────┐
            │ polls every 10 min (launchd)     │ polls every 10 min (launchd)     │ paste-triggered (founder)
            ▼                                  ▼                                  ▼
   ┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐
   │ REVIEWER: codex │                │ REVIEWER:       │                │ REVIEWER:       │
   │ (run-codex-     │                │   codex-ops     │                │   cursor        │
   │  reviewer.sh →  │                │ (run-codex-ops- │                │ (skill prose    │
   │  _run_reviewer  │                │  reviewer.sh →  │                │  runs inside    │
   │  .sh)           │                │  _run_reviewer  │                │  Cursor IDE;    │
   │                 │                │  .sh)           │                │  no wrapper)    │
   │ creates ephem-  │                │ creates ephem-  │                │ creates ephem-  │
   │ eral worktree   │                │ eral worktree   │                │ eral worktree   │
   │ $TMPDIR/echo-   │                │ $TMPDIR/echo-   │                │ (per 050 AC4    │
   │ codex-<uuid>    │                │ codex-ops-<…>   │                │  encoded in     │
   │ pinned to       │                │                 │                │  skill prose)   │
   │ origin/main     │                │                 │                │                 │
   └────────┬────────┘                └────────┬────────┘                └────────┬────────┘
            │ git show <sha>:<artifact_path>   │                                  │
            │ → reads SPEC AT FROZEN SHA       │                                  │
            │ → produces findings              │                                  │
            │ → validate_response_yaml.py      │                                  │
            │ → commit-reviewer-response.sh    │                                  │
            │ → push-with-retry.sh             │                                  │
            ▼                                  ▼                                  ▼
            ─── HANDOFF #2 ──── writes file (atomic link, one writer wins) ───
            ┌──────────────────────────────────────────────────────────────┐
            │ backlog/reviews/<id>/r<N>/                                   │
            │     codex.md, codex-ops.md, cursor.md, claude.md             │
            │  ─ artifact_sha (must match request.spec_commit_sha)         │
            │  ─ verdict: {proceed, proceed_after_patches, pushback}       │
            │  ─ findings[] (with cross_ref.finding_index for convergence) │
            └────────────────────────────┬─────────────────────────────────┘
                                         │
                          fired by /loop 10m /review-queue-watch
                          (Claude Code strategist session — NOT launchd)
                                         ▼
                              ┌─────────────────────────┐
                              │ WATCHER tick            │
                              │ /review-queue-watch     │
                              │ → combine.py            │
                              │   ─ computes verdict    │
                              │   ─ union-find on       │
                              │     cross_refs          │
                              │   ─ writes combined.md  │
                              └────────────┬────────────┘
                                           │
                            ─── HANDOFF #3 ─┴─── writes file ───
                            ┌──────────────────────────────────────┐
                            │ backlog/reviews/<id>/r<N>/           │
                            │     combined.md                      │
                            │  ─ combined_verdict                  │
                            │  ─ escalated_to_founder: bool        │
                            │  ─ convergent rows / divergent rows  │
                            └────────────────┬─────────────────────┘
                                             │
                  ┌──────────────────────────┼──────────────────────────┐
                  │ escalated=true           │ verdict=proceed          │ verdict=proceed_after_patches
                  │ (divergent /             │ + zero findings          │  OR partial_responses (auto)
                  │  no_responses /          │                          │
                  │  multi-missing /         │                          │
                  │  any-pushback-missing)   │                          │
                  ▼                          ▼                          ▼
            STOP — append journal      CONVERGENCE                STRATEGIST dispositions
            entry; FOUNDER takes       → strategist runs          • applies patches inline
            over manually              /review-pending then       • commits to origin/main
                                       /merge-and-cleanup         • runs
                                                                  dispatch-next-round.py
                                                                       │
                                                                       ▼
                                                            ┌──────────────────────────┐
                                                            │ backlog/reviews/<id>/    │
                                                            │   r<N+1>/request.md      │
                                                            │ (new spec_commit_sha)    │
                                                            └────────────┬─────────────┘
                                                                         │
                                                                         └─▶ back to HANDOFF #1
```

## Handoff summary

Three handoff artifacts, three role transitions:

| # | File | Writer → Reader | Role transition |
|---|---|---|---|
| 1 | `r<N>/request.md` | strategist → reviewer | strategist hands off; reviewer takes over |
| 2 | `r<N>/<reviewer>.md` (×N) | reviewer → watcher | reviewer hands off; strategist's watcher consumes |
| 3 | `r<N>/combined.md` | watcher (`combine.py`) → strategist | watcher hands off; strategist dispositions or stops |

## Three loop exits

- **Founder-escalation** — `combined.md` has `escalated_to_founder: true` (verdict `divergent` / `no_responses` / multi-missing / any-pushback-with-missing). Strategist stops; founder steps in manually.
- **Convergence** — verdict `proceed` with zero findings. Strategist runs `/review-pending` then `/merge-and-cleanup`; item moves to `backlog/complete/`.
- **Next round** — verdict `proceed_after_patches` or auto-dispositioned `partial_responses` (single required reviewer missing AND every present verdict in `PROCEED_STAR`, per 044 AC4 at `combine.py:122-156`). Strategist applies patches inline on `origin/main`, then `dispatch-next-round.py` writes `r<N+1>/request.md` with a fresh `spec_commit_sha`. Loop continues at HANDOFF #1.

## Disposition discipline — prefer removal over deeper patching

When the strategist dispositions findings on the `proceed_after_patches` path, the default move is to patch the spec deeper. The 057a convergence (r1→r8: 7→6→5→3→2→3→2→0 findings) surfaced a recurring failure mode where r<N>'s findings turned out to be bugs in the mechanism r<N-1>'s patch had introduced — and patching deeper just produced r<N+1>'s findings in the patched mechanism. Before patching, ask whether the finding targets mechanism a prior round's patch added vs. mechanism the original spec had; if the former, prefer **removing** the prior-round mechanism over patching it. See `skills/review-queue-watch.md` "Disposition discipline — prefer removal over deeper patching when findings target a recent-round patch" for the full check + worked examples from 057a r4 (time-bound horizon dropped → r5 zero storage-seam findings) and r6 (runtime warning dropped → r7 zero warning-path findings). This is the strategist-side twin of [[drift-prevention]] for builder agents — both are unnecessary-mechanism failures; they differ in which actor introduces the mechanism (builder: code; strategist: spec text added during review rounds).

## Load-bearing invariants

- **Fresh-eyes-at-SHA.** Every reviewer reads the spec via `git show <spec_commit_sha>:<artifact_path>` — never working-tree HEAD. The frozen sha is the anchor that lets the next round's reviewer see only what the strategist meant for this round even if `main` has advanced. Enforced by `validate.py reviewer`'s `REVIEWER_FRESH_EYES_VIOLATION` check; the `task_state_ref:` field exists for non-reviewer consumers and reviewers MUST NOT read it.
- **Worktree isolation (050).** Headless reviewers (codex, codex-ops, claude) run in ephemeral `$TMPDIR/echo-<reviewer>-<uuid>` worktrees pinned to `origin/main`; the founder's live checkout is never written to by an automated reviewer tick. Cursor's IDE-mode reviewer mirrors the same lifecycle in skill prose (`skills/review-queue-cursor.md` "050 AC4 worktree-isolation invariant").
- **Per-round roster (043).** `requested_reviewers` in `request.md` is the source of truth for which reviewers tick this round; reviewer skills filter on it and silently skip if their slug isn't listed. The roster + `required`/`timeout_hours`/`mode` per-reviewer config lives in `tools/review-queue/reviewers.json`.
- **Journal-as-queue prohibition.** The dogfooding journal is observation-only; the review queue uses dedicated `backlog/reviews/**` files. Reviewers and strategist append journal entries only AFTER queue artifacts are committed.
- **Atomic write semantics.** Reviewer responses use `os.link()` from a `<reviewer>.md.<tmpsuffix>` temp file → final name. Concurrent ticks race the link; only one wins, the loser sees `FileExistsError` and exits cleanly.

## Reviewer roster (current)

Source: `tools/review-queue/reviewers.json`.

| Slug | Mode | Required | Timeout | Wrapper |
|---|---|---|---|---|
| `codex` | headless | yes | n/a | `run-codex-reviewer.sh → _run_reviewer.sh` (launchd) |
| `codex-ops` | headless | yes | n/a | `run-codex-ops-reviewer.sh → _run_reviewer.sh` (launchd) |
| `cursor` | ide | yes | 2 h | none — paste skill prose into Cursor IDE chat |
| `claude` | headless | no [^claude-required] | n/a | `run-claude-reviewer.sh → _run_reviewer.sh` (launchd; install deferred) |

[^claude-required]: `claude` ships with `required: false` per 056 to permit the initial onboarding round (`requested_reviewers: ["codex", "codex-ops"]`) without violating the "all required must respond" invariant. The flip to `required: true` is gated by **followup `056-claude-required-flag-gate`** (`backlog/_followups.md`): production headless execution requires the operator to either (a) configure `~/.claude/settings.json` permission rules so `claude -p` runs without interactive prompts, OR (b) add `--dangerously-skip-permissions` to the `invoke_command`. Until that gate is resolved, the binding is wired end-to-end but not enforced on every round.

`mode=headless` reviewers must have `timeout_hours: null` (no wait); `mode=ide` reviewers must have a positive numeric timeout. Enforced at `tools/review-queue/_reviewers.py:92-106`.

### Roster-driven `invoke_command` (056 substrate change)

Post-056, the headless wrapper (`_run_reviewer.sh`) is vendor-agnostic. Each headless roster entry carries an `invoke_command` template string that the wrapper resolves at tick-time:

```json
{
  "name": "codex",  "mode": "headless", "required": true, "timeout_hours": null,
  "slash_command": "review-queue-codex",
  "invoke_command": "codex exec -C {{WT}} --sandbox danger-full-access - < {{PROMPT}}"
},
{
  "name": "claude", "mode": "headless", "required": false, "timeout_hours": null,
  "slash_command": "review-queue-claude",
  "invoke_command": "claude -p < {{PROMPT}}"
}
```

Token substitution uses `shlex.quote()` per substitution site before assembling the final `bash -c` string (Option A in the 056 spec — Option B argv-style was rejected as unsafe with stdin redirects). The `{{PROMPT}}` token is required for headless reviewers; `{{WT}}` is optional (the wrapper already `cd`s to `$WT` before substitution, so commands like `claude -p` that lack a `-C` analog operate via cwd). Conditionally required via JSON Schema `if/then` in `reviewers-config.schema.json`: only when `mode === "headless"`.

The IDE-mode `cursor` row omits `invoke_command`; `_reviewer_gate.py --print invoke_command` for `cursor` exits non-zero with `IDE-mode reviewer cursor has no invoke_command`.

Adding a new reviewer requires **six** coordinated edits (post-056; the reviewers-config schema preamble flags this manual-sync rule per 043 R1 HIGH #5):

1. Append a roster entry to `reviewers.json` with `invoke_command` if `mode: headless`.
2. Extend the enum in `schemas/reviewer.schema.json` — `reviewer` field AND `findings[].cross_ref.reviewer` (both enum sites; without the second, no reviewer can legally cross-reference the new slug's findings).
3. Extend the enum in `schemas/request.schema.json` (`requested_reviewers` items).
4. Extend `schemas/combined.schema.json` with the explicit `<slug>_response` property — `combine.py:_schema_response_fields()` discovers response fields ONLY from schema properties enumeration, so pattern-based widening would require also editing `combine.py`.
5. Write `skills/review-queue-<slug>.md`; sync via `tools/sync-skills.sh`. Headless reviewers also need a `run-<slug>-reviewer.sh` 5-line driver (`exec env REVIEWER_NAME=<slug> "$(dirname "$0")/_run_reviewer.sh"`) + launchd plist installer.
6. For headless reviewers, the installer (`_install_reviewer_launchd.sh`) preflights the resolved `invoke_command` executable via `command -v <exe>` BEFORE writing the plist — fail-closed if the binary is missing (otherwise the launchd job fires every 10 min with `command-not-found`, silently consuming the schedule).

056 is the canonical worked example: a new headless reviewer (`claude`) added end-to-end with zero edits to `_run_reviewer.sh`'s exec line, zero edits to `combine.py`, and full backwards-compat (codex/codex-ops argv byte-equivalent pre/post — guarded by the 056 AC9 "argv snapshot" regression test).

## Builder bindings

The reviewer role above has three peers (codex, codex-ops, cursor); the builder role — the role that *claims* an item from `backlog/ready/` and walks it to `pending_review/` via `skills/process-backlog.md` — also has three vendor-agnostic bindings, all running the same vendor-neutral protocol body. See [[builder-bindings]] for the full matrix; the short version:

| Binding | Trigger mode | Wrapper | Documented by |
|---|---|---|---|
| Claude Code in-session | conversational (founder asks Claude Code to claim) | none — implicit default | implicit since project start |
| `codex` | headless (launchd / on-demand `codex exec`) | `tools/run-codex-builder.sh` | item 047 |
| Cursor's Claude (IDE-mode) | founder paste-driven inside Cursor IDE chat | none — paste skill prose | item 055 |

Per-binding notes live at the bottom of `skills/process-backlog.md` under "Binding-specific notes — codex" (047) and "Binding-specific notes — Cursor's Claude (IDE-mode)" (055); the protocol body itself is unchanged for every binding. Operator-facing trigger recipes: `docs/cursor-builder-trigger.md` (Cursor) and `docs/codex-builder-setup.md` (codex).

The atomic-claim git op (single commit moving `ready/<id>.md → claimed/<id>.md` with `claimed_by` populated, push-or-lose) is the sole cross-binding synchronization primitive. Same-machine concurrency under the shared default `~/.echo/agent-id` UUID is operator-serialized (one builder per `ECHO_AGENT_ID` at a time); cross-machine concurrency is naturally serialized by git.

## Coord substrate lane (active as of 057b)

The protocol above describes the file-handoff queue. The [[coord-layer|coord layer]] (substrate 057a + producer 057b) is the operator-observability lane that runs alongside it — turning silent launchd failures into in-ledger `coord:deadline_missed` atoms visible via `coord_status()`.

| File handoff (above)                          | Coord-layer atoms (sibling lane)                                                    |
|-----------------------------------------------|--------------------------------------------------------------------------------------|
| Strategist writes `r<N>/request.md`           | Watcher (Step 3 b of `skills/review-queue-watch.md`) calls `coord_invoke(role, request_path, correlation_id)` for each headless reviewer. Daemon appends `coord:reviewer_invoked` synchronously and opens a pre-spawn deadline. |
| Reviewer wrapper boots                        | `_run_reviewer.sh` emits `coord:scheduler_health` at log-redirect-open, then `coord:scheduler_health_done` after bootstrap (worktree + env + prompt routing) and BEFORE review work starts. |
| Reviewer reads spec at frozen SHA             | Skill emits `coord:tick_start(correlation_id)` BEFORE bind-validation. 057a's tracker closes the pre-spawn `reviewer_invoked` deadline. |
| Reviewer writes `r<N>/<reviewer>.md`          | On clean exit, skill emits `coord:tick_end(outcome=completed | stale_combined | duplicate_response | upstream_duplicate | bind_failed, reason=...)`. Tracker closes the open `tick_start` deadline. |
| Wrapper crashes pre-`tick_end` (silent fail)  | NO terminal event → tracker fires `coord:deadline_missed` within budget. `coord_status()` surfaces the role + correlation_id. |

`request.py` generates the canonical uuid4 `correlation_id` at request-write time. Active-spawn (`coord_invoke`) and launchd-fallback (scan-pick) wrapper paths share that same id, so whichever runs first correctly closes the daemon's pre-spawn deadline. All wrapper-side emission uses `tools/review-queue/coord-emit.sh` over HTTP with `--connect-timeout 2 --max-time 5 ... || true` — daemon-down preserves queue durability and only degrades observability.

Builder / merger / watcher lifecycle event types are deferred to a follow-on observability spec (their registry entries are not in 057a's `coord-roles.json`).

## Key files

- **Skills (canonical, vendor-neutral):** `skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md`, `skills/review-queue-cursor.md`, `skills/review-queue-claude.md`, `skills/review-queue-watch.md`, `skills/process-backlog.md`. Synced into `.claude/commands/` via `tools/sync-skills.sh`.
- **Python helpers:** `tools/review-queue/request.py` (creates `request.md`, including the `correlation_id` uuid4 added by 057b), `tools/review-queue/combine.py` (writes `combined.md`), `tools/review-queue/dispatch-next-round.py` (creates `r<N+1>/request.md`), `tools/review-queue/validate.py` (schema-validates any reviewer/combined/request artifact), `tools/review-queue/_reviewers.py` (loader; enforces conditional-required `invoke_command` per 056), `tools/review-queue/_reviewer_gate.py` (per-tick gate; supports `--print invoke_command` post-056).
- **Shell wrappers:** `tools/review-queue/_run_reviewer.sh` (generic headless tick body — vendor-agnostic post-056, hosts two-phase coord emission), `tools/review-queue/run-{codex,codex-ops,claude}-reviewer.sh` (5-line drivers), `tools/review-queue/coord-emit.sh` (057b curl helper callable from wrappers + reviewer skill steps), `tools/review-queue/commit-reviewer-response.sh` (validate-before-commit gate), `tools/review-queue/queue_error.sh` (durable queue-error commit before cleanup, per 056 AC5 part 4), `tools/review-queue/push-with-retry.sh` (autostash + rebase=merges), `tools/run-codex-builder.sh` (047 codex-builder driver).
- **Coord MCP tools:** `src/mcp/tools/coord-emit.ts`, `src/mcp/tools/coord-status.ts`, `src/mcp/tools/coord-invoke.ts`; `src/coord/{paths,roles,deadlines,internal-emitter,identity,validate}.ts`; `tools/review-queue/coord-roles.json`.
- **Installer:** `tools/review-queue/_install_reviewer_launchd.sh` (roster-driven launchd plist installer; preflights `invoke_command` executable via `command -v` post-056).
- **Operator docs:** `docs/cursor-builder-trigger.md` (055), `docs/review-queue-setup.md` (reviewer triggers).
- **Schemas:** `tools/review-queue/schemas/{reviewer,combined,request,reviewers-config}.schema.json`.

## Related

- [[cross-tool-spec-review]] — the multi-reviewer pattern this protocol implements
- [[coord-layer]] — the operator-observability substrate that wraps every reviewer tick
- [[builder-bindings]] — the three vendor-agnostic builder bindings (Claude Code, codex, Cursor's Claude)
- [[journal-is-observation-only]] — invariant separating dogfooding journal from queue artifacts
