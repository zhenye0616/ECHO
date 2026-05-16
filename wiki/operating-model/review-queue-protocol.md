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

The file-backed wire protocol that lets the strategist and one-or-more reviewers cycle a spec through review rounds without any direct IPC. Every handoff is a committed file under `backlog/reviews/<id>/r<N>/`. Shipped by item 039 (file-backed queue), extended by 040 (watcher-state test), 041 (reviewer background execution), 043 (per-round reviewer roster), 044 (autostash + AC4 auto-disposition), 045 (queue reliability cluster), and 050 (worktree isolation).

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
                              │       codex-ops, cursor]            │
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
            │     codex.md,  codex-ops.md,  cursor.md                      │
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
- **Worktree isolation (050).** Headless reviewers (codex, codex-ops) run in ephemeral `$TMPDIR/echo-<reviewer>-<uuid>` worktrees pinned to `origin/main`; the founder's live checkout is never written to by an automated reviewer tick. Cursor's IDE-mode reviewer mirrors the same lifecycle in skill prose (`skills/review-queue-cursor.md` "050 AC4 worktree-isolation invariant").
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

`mode=headless` reviewers must have `timeout_hours: null` (no wait); `mode=ide` reviewers must have a positive numeric timeout. Enforced at `tools/review-queue/_reviewers.py:92-106`.

Adding a new reviewer requires four coordinated edits (the reviewers-config schema preamble flags this manual-sync rule per 043 R1 HIGH #5):

1. Append a roster entry to `reviewers.json`.
2. Extend the enum in `schemas/reviewer.schema.json` (`reviewer` field).
3. Extend the enum in `schemas/request.schema.json` (`requested_reviewers` items).
4. Write `skills/review-queue-<slug>.md`; sync via `tools/sync-skills.sh`. Headless reviewers also need a `run-<slug>-reviewer.sh` 5-line driver + launchd plist installer.

## Builder bindings

The reviewer role above has three peers (codex, codex-ops, cursor); the builder role — the role that *claims* an item from `backlog/ready/` and walks it to `pending_review/` via `skills/process-backlog.md` — also has three vendor-agnostic bindings, all running the same vendor-neutral protocol body. See [[builder-bindings]] for the full matrix; the short version:

| Binding | Trigger mode | Wrapper | Documented by |
|---|---|---|---|
| Claude Code in-session | conversational (founder asks Claude Code to claim) | none — implicit default | implicit since project start |
| `codex` | headless (launchd / on-demand `codex exec`) | `tools/run-codex-builder.sh` | item 047 |
| Cursor's Claude (IDE-mode) | founder paste-driven inside Cursor IDE chat | none — paste skill prose | item 055 |

Per-binding notes live at the bottom of `skills/process-backlog.md` under "Binding-specific notes — codex" (047) and "Binding-specific notes — Cursor's Claude (IDE-mode)" (055); the protocol body itself is unchanged for every binding. Operator-facing trigger recipes: `docs/cursor-builder-trigger.md` (Cursor) and `docs/codex-builder-setup.md` (codex).

The atomic-claim git op (single commit moving `ready/<id>.md → claimed/<id>.md` with `claimed_by` populated, push-or-lose) is the sole cross-binding synchronization primitive. Same-machine concurrency under the shared default `~/.echo/agent-id` UUID is operator-serialized (one builder per `ECHO_AGENT_ID` at a time); cross-machine concurrency is naturally serialized by git.

## Key files

- **Skills (canonical, vendor-neutral):** `skills/review-queue-codex.md`, `skills/review-queue-codex-ops.md`, `skills/review-queue-cursor.md`, `skills/review-queue-watch.md`, `skills/process-backlog.md`. Synced into `.claude/commands/` via `tools/sync-skills.sh`.
- **Python helpers:** `tools/review-queue/request.py` (creates `request.md`), `tools/review-queue/combine.py` (writes `combined.md`), `tools/review-queue/dispatch-next-round.py` (creates `r<N+1>/request.md`), `tools/review-queue/validate.py` (schema-validates any reviewer/combined/request artifact).
- **Shell wrappers:** `tools/review-queue/_run_reviewer.sh` (generic headless tick body), `tools/review-queue/commit-reviewer-response.sh` (validate-before-commit gate), `tools/review-queue/push-with-retry.sh` (autostash + rebase=merges), `tools/run-codex-builder.sh` (047 codex-builder driver).
- **Operator docs:** `docs/cursor-builder-trigger.md` (055), `docs/review-queue-setup.md` (reviewer triggers).
- **Schemas:** `tools/review-queue/schemas/{reviewer,combined,request,reviewers-config}.schema.json`.

## Related

- [[cross-tool-spec-review]] — the multi-reviewer pattern this protocol implements
- [[builder-bindings]] — the three vendor-agnostic builder bindings (Claude Code, codex, Cursor's Claude)
- [[journal-is-observation-only]] — invariant separating dogfooding journal from queue artifacts
