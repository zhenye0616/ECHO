---
id: 2026-05-11-039-cross-tool-review-dispatch-queue
title: Cross-tool review dispatch queue — file-backed protocol; founder out of dispatch loop (RC1)
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-05-11
spec_refs:
  - CLAUDE.md                                                  # "Reviewer independence rule" + founder gate at substantive-conflict + push-to-main only
  - backlog/README.md                                          # Pipeline definition; atomic claim mechanic; founder gate semantics
  - raw/internal/dogfooding/mcp-interactions-journal.md        # 7+ cross-tool review cycles (032 / 033 / 034 / 035 / 036 / 037 / 038); convergent-on-direction divergent-on-prescription pattern is now reliable
  - backlog/complete/2026-05-11-038-mcp-toolkit-atomicity-refactor.md  # 4-round (R1→R4) cross-tool review case study; 0-ECHO-call R2/R3/R4 reviewer property demonstrated
  - backlog/complete/2026-05-11-037-work-artifact-repo-scoping.md  # 3-round cross-tool review; `repo_path` plumbed through retrieval — cross-project bleed structurally impossible (precondition for 039 to be safe)
  - .claude/commands/                                          # Existing slash-command shape (`process-backlog.md`, `review-pending.md`, `merge-and-cleanup.md`) — reviewer-loop prompts follow the same convention
  - .claude/skills/loop                                        # `/loop` skill — provides recurring/dynamic-pace execution; reviewer polling layer lands here
blocked_by: []
suggested_builder: any  # Pure protocol + helper scripts + slash-command prompts; no app-specific knowledge needed. Strategist (Claude Code) is acceptable since the strategist is the producer side of the queue; an independent builder is fine since the protocol is fully specced below.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

The 7+ cross-tool review cycles to date (items 032 / 033 / 034 / 035 / 036 / 037 / 038) have proven three properties stable enough to design around:

1. **Reviewer differentiation is real.** Codex catches implementability + code-grounded gaps; Cursor catches scope-coherence + role-split + correctness gaps. Item 034 R1: Cursor caught the load-bearing repoll-vs-debounce HIGH bug Codex missed. Item 038 R1: Codex caught a falsifiable structural claim in the strategist's own R4 atomicity framing that Cursor missed. Convergent-on-severity / divergent-on-prescription is the named high-value shape (034 R2, 038 R2).
2. **Context recovery is solved.** Post-037 (`repo_path` plumbed end-to-end) + post-038 (`echo_resolve_mru` returns search-ready descriptors), cross-project bleed is structurally impossible and reviewers can rehydrate any strategist turn in 1–2 ECHO calls. Items 038 R2/R3/R4 reviewers used **zero ECHO calls** — the spec file or diff was sufficient context.
3. **Founder review is rubber-stamping the common case.** Items 035 / 036 / 037 merged with reviewer verdict "merge as-is", zero conflicts, zero fixups. Item 038 was the only recent merge with substantive pre-merge fixups, and those were caught by Codex R4 / Cursor R4 — not by founder fresh-eyes.

**The remaining waste is operating-model, not substrate.** The founder is acting as the dispatch layer between Claude (strategist), Codex, and Cursor: typing "review spec X using ECHO" into each reviewer window for every R1→R4 round, then reporting back to the strategist that both reviews landed. At ~3–4 dispatches × ~3–4 rounds × ~1–2 specs/week, this is the dominant friction. Per Codex's 039 RC1 recommendation (atom `2a7f7f9b`, 2026-05-11 23:25 PDT): *"The real waste is that you are acting as the dispatch layer between Claude, Codex, and Cursor. That is not founder work."*

This item builds a **file-backed durable queue** in the repo so reviewers poll for assigned work, write structured reviews back, and the strategist watches for both reviews to land before combining. The journal stays observation-only; ECHO stays context-recovery-only. The protocol's canonical artifact is a directory of request/response files under `backlog/reviews/`, not a runtime signal.

# Goal

**Founder types zero coordination messages during a full R1→Rₙ cross-tool spec-review cycle.** Founder stays at: (a) judgment boundary when reviewers diverge on prescription in a way the strategist can't resolve, and (b) `git push origin main` for any post-merge ship. Reviewer independence rule (CLAUDE.md) is preserved structurally — the strategist that authored a spec is never the reviewer of that spec's reviews; Codex and Cursor remain separate reviewer voices.

# Out of Scope (Don't Drift)

1. **Push-based GUI pinging.** Per Codex's recommendation: *"Cron/loop polling is boring but reliable. 'Ping the reviewer windows' sounds attractive, but it is more brittle and more UI-integration-shaped than this needs."* Polling only.
2. **Journal-as-queue.** The dogfooding journal stays the observation log. Never the message bus. Race/conflict friction on the journal would corrupt the cross-tool observability layer itself.
3. **Code review (R4 / post-build).** This item covers **spec review only** (R1 through R_final, where R_final is the last spec-polish round before claim). Post-build code review on a `pending_review/` item stays today's manual flow — separate item if needed.
4. **Auto-claim or auto-merge.** Reviewers do not claim items. The strategist does not merge. Founder still controls the `push origin main` gate. This item is the dispatch layer for *review*, not for *build* or *ship*.
5. **Replacing the strategist.** The strategist still writes the spec, combines findings into a patch, and decides convergence. The queue automates *dispatch and collection*, not *judgment*.
6. **Cross-repo / multi-project queue.** Single-repo, single-founder. Multi-repo or shared-team queueing is V2+.
7. **Auto-resolving divergent verdicts.** When Codex and Cursor disagree on PROCEED vs PUSHBACK at the same round, the strategist surfaces the disagreement to founder. The queue records it; it does not adjudicate.
8. **Replacing `wait_for_new_turns`.** Strategist watcher MAY use ECHO `wait_for_new_turns` on reviewer JSONL sources for low-latency wake; but the queue's source-of-truth is the filesystem (response files), not ECHO atoms. If `wait_for_new_turns` lags, polling the filesystem closes the gap.

# Architecture — the queue shape

A single directory tree under `backlog/reviews/` (new — sibling to `ready/`, `claimed/`, `pending_review/`, `complete/`):

```
backlog/reviews/
├── 2026-05-11-039-cross-tool-review-dispatch-queue/   # per-item review history
│   ├── r1/
│   │   ├── request.md                                  # strategist writes
│   │   ├── codex.md                                    # codex writes (when present)
│   │   ├── cursor.md                                   # cursor writes (when present)
│   │   └── combined.md                                 # strategist writes after both responses land
│   ├── r2/
│   │   └── ...
│   └── r3/
│       └── ...
└── 2026-05-11-040-<next-item>/
    └── ...
```

**File shape — `request.md` (strategist → reviewers):**

```markdown
---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 1
spec_commit_sha: <SHA of the commit that introduced/patched the spec>
artifact_path: backlog/ready/2026-05-11-039-cross-tool-review-dispatch-queue.md
requested_at: 2026-05-12T06:30:00Z      # ISO-8601 UTC
requested_reviewers: [codex, cursor]    # both must respond before strategist combines
focus_hints: |
  (optional) Specific aspects the strategist wants reviewer attention on.
  E.g., "Confirm the race-condition handling in §AC5 is sufficient" or
  "Cursor: scope-coherence on the queue's file-shape; Codex: implementability of the watcher."
---

# What to review

(One short paragraph linking to the artifact and any relevant prior-round context.
The reviewer's job is to read the artifact, not to chase the strategist's reasoning.
If prior-round context matters, link the prior `combined.md`.)
```

**File shape — `<reviewer>.md` (reviewer → strategist):**

```markdown
---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 1
reviewer: codex                          # or "cursor"
artifact_sha: <SHA the reviewer actually read; must equal request.spec_commit_sha or reviewer flags drift>
completed_at: 2026-05-12T07:15:00Z
verdict: proceed                         # one of: proceed | proceed_after_patches | pushback | divergent
findings:
  - severity: high                       # high | medium | low | nit
    where: §AC3, l.123-127               # spec section or file:line citation
    finding: |
      One-paragraph description.
  - ...
---

# Reviewer notes

(Optional free-form section for the reviewer's broader observations,
named patterns, or cross-references to prior items. Strategist reads this
section but does not need to disposition every line.)
```

**File shape — `combined.md` (strategist → record):**

```markdown
---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 1
combined_at: 2026-05-12T07:45:00Z
codex_response: codex.md                 # relative path
cursor_response: cursor.md
patch_commit_sha: <SHA of the strategist's R1-patch commit>
next_round: 2                            # null if strategist declared convergence
---

# Combined findings table

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent) | §AC3 race | accepted (Option B) | `<sha>` |
| 2 | MED | codex | §AC5 test #3 | accepted | `<sha>` |
| 3 | MED | cursor | §Goal wording | deferred (follow-up #N) | n/a |
| ... | ... | ... | ... | ... | ... |

# Convergence call

(Either: "claim-ready after R1" with rationale, OR "needs R2 — focus_hints for next round are …".)
```

**Atomicity / race semantics:**

- Files are atomic-write only — reviewers write to `<reviewer>.md.tmp` then `git mv` (or `os.rename`) to the final name. Strategist polling sees the file appear atomically.
- One reviewer per file. If two Codex sessions race to write `codex.md`, the second loses on `git add` (filesystem locking via the git index is sufficient — the response file is small enough that the race window is < 1s).
- The strategist watcher waits for **both** `codex.md` and `cursor.md` to exist before writing `combined.md`. Missing-reviewer timeout is configurable (default: 2 hours; if a reviewer hasn't responded, strategist either escalates to founder or proceeds with single-reviewer review per founder policy).
- Round numbers are monotonically increasing; `r{N+1}/` is only created after `r{N}/combined.md` exists.

# Acceptance Criteria

## AC1 — Directory + file schema specced and tested

The directory layout under `backlog/reviews/` is created (with a `.gitkeep` in an empty subdirectory or an example), and the three file shapes (`request.md`, `<reviewer>.md`, `combined.md`) have JSON Schema validators in `tools/review-queue/schemas/`. Tests at `tests/review-queue/schemas.test.ts` cover:

- Valid request / response / combined files parse cleanly.
- Missing required frontmatter fields fail with a clear error citing the field name.
- `reviewer` enum is `{codex, cursor}` only; other values fail.
- `verdict` enum is `{proceed, proceed_after_patches, pushback, divergent}`; other values fail.
- `artifact_sha != request.spec_commit_sha` produces a warning (not an error — drift is allowed but logged).

## AC2 — Strategist write helper

A script at `tools/review-queue/request.py` (or `.ts` — match repo convention) that takes `<item_id> <round>` as args, reads the corresponding `backlog/ready/<item_id>.md` (or `claimed/` / `pending_review/`), captures the current `HEAD` SHA, and writes a `backlog/reviews/<item_id>/r<round>/request.md` with the canonical frontmatter and a default "what to review" body. Idempotent — if the request file already exists with the same SHA, exits cleanly; if the SHA differs, errors with a clear "round already exists at different SHA — bump round number or fix history" message.

Tests at `tests/review-queue/request.test.ts`:

- Happy path: item in `ready/` produces a valid request.md.
- Item not found: clear error.
- Round already exists at same SHA: no-op exit 0.
- Round already exists at different SHA: error.

## AC3 — Canonical reviewer-loop prompts

Two slash-command files at `.claude/commands/review-queue-codex.md` and `.claude/commands/review-queue-cursor.md` (one per reviewer client, since each runs in a different IDE/CLI; same canonical body, different `reviewer:` field). Each prompt instructs the reviewer to:

1. Scan `backlog/reviews/**/r*/request.md` for any request directory whose `request.md` exists but the reviewer's own response file does not.
2. For each missing response, read the `request.md` frontmatter to get `artifact_path` + `spec_commit_sha`, `git show <sha>:<path>` to read the artifact at the requested SHA, perform the review, and write `<reviewer>.md.tmp` then atomically rename to `<reviewer>.md`.
3. Stage and commit the response file with a fixed-format commit message (`review-r<N>: <reviewer> on <item_id>`); push to origin/main.
4. Log the response in the dogfooding journal per CLAUDE.md.
5. Exit (one review per loop tick; next tick picks up the next missing response).

The prompt is designed to be the body of a `/loop 10m <prompt>` invocation in each reviewer's client. Founder runs the loop **once per reviewer client per session**; it self-pollutes the queue with responses as requests appear.

Tests: a smoke script at `tools/review-queue/test-reviewer-prompt.sh` that creates a synthetic request, runs the reviewer prompt's polling logic (the file-scan + state-check parts, not the actual AI call), and asserts the next-step is "perform review on <artifact>".

## AC4 — Strategist combine helper

A script at `tools/review-queue/combine.py` that takes `<item_id> <round>` as args, reads both `codex.md` and `cursor.md` in `backlog/reviews/<item_id>/r<round>/`, produces a draft `combined.md` with:

- A "Convergent findings" table (severity-matched across reviewers).
- A "Divergent findings" table (one reviewer only).
- A "Verdicts" line showing both reviewer verdicts side-by-side.
- An empty "Disposition" column for the strategist to fill in.

The strategist (or any subsequent agent) fills in the disposition column and the convergence call manually — the combine helper does mechanical aggregation, not judgment. Idempotent. If `combined.md` already exists, errors unless `--force` is passed.

Tests at `tests/review-queue/combine.test.ts`:

- Both responses present, no convergent findings: divergent table populated, convergent table empty.
- Both responses present, all findings convergent on (severity, where): convergent table populated correctly.
- One response missing: error with clear "waiting on <reviewer>" message.
- `combined.md` exists, no `--force`: error.

## AC5 — Race + timeout behavior

Tests at `tests/review-queue/concurrency.test.ts` covering:

- Two strategist invocations writing the same `request.md` concurrently: second writer sees the file already exists at same SHA, exits cleanly. (Same-SHA = idempotent; different-SHA = error per AC2.)
- Two reviewer invocations writing the same `codex.md` concurrently: filesystem rename is atomic; one wins, the other sees the file already exists on its second pass and skips.
- A reviewer crashes after writing `codex.md.tmp` but before the rename: orphan `.tmp` files are cleaned up by the strategist watcher on its next poll (and logged).
- Strategist watcher polling: after both response files exist, watcher detects "round complete" within one poll interval (configurable, default 30s).
- Missing-reviewer timeout: if only one response exists after `MISSING_REVIEWER_TIMEOUT_HOURS` (default 2), watcher writes `combined.md` with a `divergent` placeholder citing the timeout, and the strategist escalates to founder.

## AC6 — Dogfooding the queue on the next-up spec

**The first real-use validation must happen on a spec that goes through the queue end-to-end with the founder typing zero dispatch messages during R1→R_final.** Strategist authors the next item's RC1 spec; runs `tools/review-queue/request.py` to create r1/request.md; founder has already started `/loop` on both reviewer clients in advance. Reviewers poll, read, respond. Strategist runs `combine.py`, dispositions findings, patches the spec, pushes the patch, runs `request.py` to create r2/. Repeats until convergence. Item is claimable.

**Success criteria for AC6:**

- Founder messages during the full R1→R_final cycle: 0 dispatch messages, ≤ 2 judgment messages (for substantive divergence).
- Total wall-clock time for one full round: ≤ 30 minutes for narrow specs, ≤ 2 hours for structural-reform specs.
- Zero corruption of the queue directory (no orphan `.tmp`, no missing round numbers, no race-lost responses).

Dogfooding entry in the journal at the end of AC6 with the actual measured numbers.

# Implementation Notes

- **Why files, not a database:** The repo is already the source of truth for items, commits, and review history. A SQLite or service-backed queue would split state across two systems and break `git log` visibility into review activity. Files in `backlog/reviews/` show up in `git log --stat`, are diffable, and survive any tool failure.

- **Why polling, not push:** Per Codex's R1: GUI integration is brittle. Polling is observable, debuggable, and self-recovering after any crash. The 10-minute loop tick is well below the 30-min-per-round target.

- **Strategist watcher implementation:** Can be either (a) a `/loop`-driven slash command in the strategist's own session, or (b) an opportunistic check the strategist runs whenever invoked. Default to (b) for V1 since the strategist is the producer side anyway and is naturally invoked when a round is expected to land. If (b) creates latency complaints, add (a) as a follow-up.

- **Reviewer prompt size discipline:** The reviewer loop runs every 10 min, so the prompt must not consume the reviewer's context budget. Keep each tick's prompt scoped to one review and one artifact; no chained reasoning across ticks. If a reviewer needs more context, they pull it via ECHO at review time, not via persistent prompt state.

- **`focus_hints` discipline:** Strategist can use the optional `focus_hints` field in `request.md` to direct reviewer attention, but this is a courtesy, not a constraint. Reviewers must still read the full artifact — `focus_hints` is for "after you've read the whole thing, pay extra attention to X."

- **Bootstrap moment:** This very spec (039) goes through cross-tool review using the *pre-queue* manual dispatch one last time. Founder triggers Codex + Cursor R1 reviews by typing into each window. Once 039 ships, item 040+ uses the queue. Eat one more bite of the dogfood before the queue exists.

- **`/loop` integration:** The `/loop` skill is already available; reviewer slash commands at `.claude/commands/review-queue-{codex,cursor}.md` are invoked as `/loop 10m /review-queue-codex` (or similar). No new infrastructure needed.

- **No skill dependency on ECHO for the queue itself:** ECHO is used for *context recovery during review* (reading prior strategist turns when `focus_hints` references them, etc.), not for queue state. If ECHO is down, the queue still works — reviewers read the artifact directly via `git show`.

# After Completion (Strategist Notes)

After this item ships and ≥3 specs have gone through the queue end-to-end:

1. **Promote to wiki**: `wiki/operating-model/cross-tool-review-dispatch-queue.md` (replaces or supersedes any draft `cross-tool-spec-review.md` that exists today as journal-conjecture; the dispatch-queue version is the shipped reality). Cover: the file shape, the reviewer-loop prompt, the strategist combine flow, the divergence-escalation rule.
2. **Update `CLAUDE.md`**: §"Reviewer independence rule" gains a bullet pointing to the queue. The founder-gate list shrinks: dispatch is no longer a founder responsibility; only judgment + `push origin main` remain.
3. **Update `backlog/README.md`**: add `reviews/` to the pipeline diagram; document the request/response/combined flow.
4. **Operating-model retro**: at the V1 milestone retro, measure dispatch-message reduction (target: 0 per spec) and round-time reduction (target: ≤ 30 min per narrow round).
5. **V1.6+ candidate follow-ups** (file as separate items, not as 039 fixups):
   - Strategist watcher as `/loop` (AC6 follow-up if opportunistic checks create latency).
   - Reviewer divergence-arbitration heuristics (today: escalate to founder; future: strategist proposes resolution + founder ratifies).
   - Multi-reviewer-per-round support (today: codex + cursor only; future: optional third voice for high-stakes specs).
   - Cross-repo queue (V2 territory; presupposes a shared review substrate).
