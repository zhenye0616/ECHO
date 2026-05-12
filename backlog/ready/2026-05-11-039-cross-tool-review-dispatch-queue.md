---
id: 2026-05-11-039-cross-tool-review-dispatch-queue
title: Cross-tool review dispatch queue — file-backed protocol; founder out of dispatch loop (RC2 / R1-patched)
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-11
spec_refs:
  - CLAUDE.md                                                  # "Reviewer independence rule" + founder gate at substantive-conflict + push-to-main only
  - backlog/README.md                                          # Pipeline definition; atomic claim mechanic; founder gate semantics
  - raw/internal/dogfooding/mcp-interactions-journal.md        # 7+ cross-tool review cycles (032 / 033 / 034 / 035 / 036 / 037 / 038); convergent-on-direction divergent-on-prescription pattern is now reliable
  - backlog/complete/2026-05-11-038-mcp-toolkit-atomicity-refactor.md  # 4-round (R1→R4) cross-tool review case study; 0-ECHO-call R2/R3/R4 reviewer property demonstrated
  - backlog/complete/2026-05-11-037-work-artifact-repo-scoping.md  # 3-round cross-tool review; `repo_path` plumbed through retrieval — cross-project bleed structurally impossible (precondition for 039 to be safe)
  - .claude/commands/                                          # Existing slash-command shape (`process-backlog.md`, `review-pending.md`, `merge-and-cleanup.md`) — reviewer-loop prompts follow the same convention
  # R1 correction (Codex H1 + Cursor H5, convergent): `/loop` is a Claude-Code CLI built-in (not a plugin skill at `.claude/skills/loop` — verified absent). Codex CLI / Cursor IDE parity is unverified; AC0 closes this.
blocked_by: []
suggested_builder: any  # Pure protocol + helper scripts + slash-command prompts; no app-specific knowledge needed. Strategist (Claude Code) is acceptable since the strategist is the producer side of the queue; an independent builder is fine since the protocol is fully specced below.
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

The 7+ cross-tool review cycles to date (items 032 / 033 / 034 / 035 / 036 / 037 / 038) have proven three properties stable enough to design around:

1. **Reviewer differentiation is real.** Codex catches implementability + code-grounded gaps; Cursor catches scope-coherence + role-split + correctness gaps. Item 034 R1: Cursor caught the load-bearing repoll-vs-debounce HIGH bug Codex missed. Item 038 R1: Codex caught a falsifiable structural claim in the strategist's own R4 atomicity framing that Cursor missed. Item **039 R1 (this spec) demonstrated the same shape under live observation**: Codex + Cursor both caught the `/loop` and atomicity issues (convergent HIGHs), Cursor alone caught the AC6-Goal coherence issue (option-(b) "opportunistic check" IS a dispatch message), Codex alone caught the AC5-watcher-unspecified issue. Convergent-on-severity / divergent-on-prescription is the named high-value shape (034 R2, 038 R2, **039 R1**).
2. **Context recovery is solved.** Post-037 (`repo_path` plumbed end-to-end) + post-038 (`echo_resolve_mru` returns search-ready descriptors), cross-project bleed is structurally impossible and reviewers can rehydrate any strategist turn in 1–2 ECHO calls. Items 038 R2/R3/R4 reviewers used **zero ECHO calls** — the spec file or diff was sufficient context. **039 R1 confirmed for both reviewers** (Codex: 0 ECHO calls beyond an initial `echo_resolve_mru` framing lookup it chose not to chase; Cursor: 0 ECHO calls per its own report). The spec file IS the canonical artifact.
3. **Founder review is rubber-stamping the common case.** Items 035 / 036 / 037 merged with reviewer verdict "merge as-is", zero conflicts, zero fixups. Item 038 was the only recent merge with substantive pre-merge fixups, and those were caught by Codex R4 / Cursor R4 — not by founder fresh-eyes.

**The remaining waste is operating-model, not substrate.** The founder is acting as the dispatch layer between Claude (strategist), Codex, and Cursor: typing "review spec X using ECHO" into each reviewer window for every R1→R4 round, then reporting back to the strategist that both reviews landed. At ~3–4 dispatches × ~3–4 rounds × ~1–2 specs/week, this is the dominant friction. Per Codex's 039 RC1 recommendation (atom `2a7f7f9b`, 2026-05-11 23:25 PDT): *"The real waste is that you are acting as the dispatch layer between Claude, Codex, and Cursor. That is not founder work."*

**Two additional pieces of evidence from this spec's own R1 cycle (2026-05-11 23:35–23:50 PDT, journaled live):**

- **M1-1 sub-gap A fired live on Cursor's R1 review.** Cursor's 15441-char R1 review existed in `state.vscdb` bubble `aae455fc` for ~5 minutes before ECHO's substring index reflected it. The strategist had to drop to a direct SQLite probe (`SELECT json_extract(value, '$.text') FROM cursorDiskKV WHERE key = 'bubbleId:1c0493dd-…'`) to retrieve it. **This is the very capture cadence gap 034 was supposed to close, firing on the spec that aims to make the dispatch self-service.** It does not block 039 (the queue's source of truth is the filesystem, not ECHO), but it reinforces §"Out of Scope" #8: **ECHO is context-recovery-only; the queue MUST NOT depend on ECHO for state.**
- **Cross-reviewer journal-edit race observed live.** Codex's R1 reviewer turn reports: *"Dogfooding journal entry was appended and HTML regenerated. I did not commit it because there were already uncommitted journal edits from the Cursor/strategist side in the same files."* Two reviewers writing to the same journal file produced a race that Codex correctly refused to resolve. **This is independent confirmation of Cursor R1 reviewer-note #1** (*"Reviewer prompts MUST NOT write to the dogfooding journal as part of queue handshake — journal entries are observation-only, written AFTER the review file is committed"*) and is promoted to an Implementation Notes invariant below.

This item builds a **file-backed durable queue** in the repo so reviewers poll for assigned work, write structured reviews back, and the strategist watches for both reviews to land before combining. The journal stays observation-only; ECHO stays context-recovery-only. The protocol's canonical artifact is a directory of request/response files under `backlog/reviews/`, not a runtime signal.

# Goal

**Founder types zero coordination messages during a full R1→Rₙ cross-tool spec-review cycle.** Founder stays at: (a) judgment boundary when reviewers diverge across the `{proceed*, pushback}` boundary in a way the strategist can't resolve, and (b) `git push origin main` for any **post-merge ship** (operational queue commits — request.md / codex.md / cursor.md / combined.md / spec-patch — are NOT founder-gated; see §"Out of Scope" #4 for the boundary). Reviewer independence rule (CLAUDE.md) is preserved structurally — the strategist that authored a spec is never the reviewer of that spec's reviews; Codex and Cursor remain separate reviewer voices. **The independence we're preserving is Codex-vs-Cursor, not strategist-vs-strategist** (the strategist that writes `request.md` is the same agent that runs `combine.py` — that's producer-side work, not a self-review violation).

# Out of Scope (Don't Drift)

1. **Push-based GUI pinging.** Per Codex's recommendation: *"Cron/loop polling is boring but reliable. 'Ping the reviewer windows' sounds attractive, but it is more brittle and more UI-integration-shaped than this needs."* Polling only.
2. **Journal-as-queue.** The dogfooding journal stays the observation log. Never the message bus. Race/conflict friction on the journal would corrupt the cross-tool observability layer itself. **Promoted to an Implementation Notes invariant per 039 R1 (Cursor reviewer note + Codex's live cross-reviewer journal-edit race).**
3. **Code review (R4 / post-build).** This item covers **spec review only** (R1 through R_final, where R_final is the last spec-polish round before claim). Post-build code review on a `pending_review/` item stays today's manual flow — separate item if needed.
4. **Auto-claim or auto-merge.** Reviewers do not claim items. The strategist does not merge. **R1 patch (Codex L6):** the `push origin main` founder gate scopes to *merge/ship pushes* only. Reviewer queue commits (`review-r<N>: <reviewer> on <item_id>`) + strategist patch commits + strategist combined.md commits are *operational pushes* — they do not need founder approval per push. The founder gate fires when an item moves from `pending_review/` → `complete/` (the merge).
5. **Replacing the strategist.** The strategist still writes the spec, combines findings into a patch, and decides convergence. The queue automates *dispatch and collection*, not *judgment*. **Reviewer-harness-agnostic property (positive)**: the canonical `<reviewer>.md` file shape means a future third reviewer (Gemini, a code-review subagent, a second Claude Code worktree) can join without protocol changes. Real V2-readiness without paying V2 costs now.
6. **Cross-repo / multi-project queue.** Single-repo, single-founder. Multi-repo or shared-team queueing is V2+.
7. **Auto-resolving divergent verdicts.** **R1 patch (Cursor M2 — boundary rule explicit):** any reviewer disagreement *crossing the {proceed, proceed_after_patches} ↔ {pushback} boundary* escalates to founder; intra-proceed disagreements (e.g., Codex `proceed_after_patches` vs Cursor `proceed`) are strategist's-call via the `combined.md` disposition column. The queue records the divergence; it does not adjudicate.
8. **Replacing `wait_for_new_turns`.** Strategist watcher MAY use ECHO `wait_for_new_turns` on reviewer JSONL sources for low-latency wake; but the queue's source-of-truth is the filesystem (response files), not ECHO atoms. If `wait_for_new_turns` lags, polling the filesystem closes the gap. **039 R1 fired this case live**: ECHO substring index lagged Cursor's reviewer turn by ~5 min; filesystem SQLite probe recovered. The queue is ECHO-independent for state.

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
class: structural-reform              # one of: narrow | structural-reform — locks wall-clock budget at r1 time (Cursor M4)
requested_at: 2026-05-12T06:30:00Z    # ISO-8601 UTC (machine layer); journal entries use PDT (founder-local). Cursor L4.
requested_reviewers: [codex, cursor]   # both must respond before strategist combines
prior_round_atoms:                     # optional — embed verbatim atom IDs strategist wants reviewer to read (keeps reviewers ECHO-optional)
  - source: fs:.../session.jsonl
    atom_id: <uuid>
    note: "Prior-round combined.md or strategist synthesis turn worth reading inline."
focus_hints: |
  (optional) Specific aspects the strategist wants reviewer attention on.
  E.g., "Confirm the race-condition handling in §AC5 is sufficient" or
  "Cursor: scope-coherence on the queue's file-shape; Codex: implementability of the watcher."
---

# What to review

(One short paragraph linking to the artifact and any relevant prior-round context.
The reviewer's job is to read the artifact, not to chase the strategist's reasoning.
If prior-round context matters, `prior_round_atoms` lets the strategist embed the relevant atoms
inline — reviewers read them via the request.md body itself, no ECHO call required.)
```

**File shape — `<reviewer>.md` (reviewer → strategist):**

```markdown
---
item_id: 2026-05-11-039-cross-tool-review-dispatch-queue
round: 1
reviewer: codex                          # one of {codex, cursor} for V1; extensible per After Completion §5.3 (Cursor L1)
artifact_sha: <SHA the reviewer actually read>
                                         # MUST equal request.spec_commit_sha; on mismatch, reviewer ABORTS this run
                                         # and re-fetches the spec at request.spec_commit_sha (R1 patch — Cursor M3).
                                         # If SHA drift is genuine (strategist patched mid-round), reviewer files a
                                         # one-line journal entry "sha-drift, retrying at <sha>" and waits for next loop tick.
completed_at: 2026-05-12T07:15:00Z       # ISO-8601 UTC
verdict: proceed                         # one of:
                                         #   proceed                — claim-ready as-is
                                         #   proceed_after_patches  — claim-ready after the listed findings are patched
                                         #   pushback               — needs R<N+1> after structural rework
                                         #   divergent              — used in combined.md when the two reviewers disagree
                                         #                            across the {proceed*, pushback} boundary
                                         #   single_reviewer_timeout — used in combined.md ONLY when one reviewer didn't
                                         #                            respond before MISSING_REVIEWER_TIMEOUT_HOURS
                                         #                            (Cursor M1: split semantics — strategist's next action
                                         #                             differs between disagreement and missing reviewer)
findings:
  - severity: high                       # high | medium | low | nit
    where: §AC3, l.123-127               # spec section or file:line citation (also the match key for combine.py — see AC4)
    cross_ref:                           # optional — reviewer explicitly cross-references another reviewer's prior-round
                                         # finding (works in R2+ where prior combined.md exists)
      round: 1
      reviewer: cursor
      finding_index: 2
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
codex_response: codex.md                 # relative path; null if single_reviewer_timeout
cursor_response: cursor.md               # relative path; null if single_reviewer_timeout
patch_commit_sha: <SHA of the strategist's R<N>-patch commit>  # null if no patch (e.g., proceed verdicts both)
next_round: 2                            # null if strategist declared convergence
combined_verdict: proceed_after_patches  # strategist's roll-up of the two reviewer verdicts
                                         # (e.g., proceed + pushback → pushback; proceed + proceed → proceed; etc.)
escalated_to_founder: false              # true if combined_verdict crosses the {proceed*, pushback} boundary
                                         # OR if combined_verdict = single_reviewer_timeout
---

# Combined findings table

| # | Severity | Source | Where (match key) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | both (convergent on §AC3 race) | §AC3 atomicity | accepted (Option B — os.link semantics) | `<sha>` |
| 2 | MED | codex | §AC5 test #3 | accepted | `<sha>` |
| 3 | MED | cursor | §Goal wording | deferred (follow-up #N) | n/a |
| ... | ... | ... | ... | ... | ... |

# Convergence call

(Either: "claim-ready after R<N>" with rationale, OR "needs R<N+1> — focus_hints for next round are …".)
```

**Atomicity / race semantics (R1 patch — Codex H3 + Cursor H2 convergent; Cursor H4 + Codex M4 push-race):**

Reviewers and the strategist write response/combined/patch files via a no-overwrite atomic-create pattern. The earlier RC1 claim that *"`git add` is sufficient — second writer loses on add"* was mechanically wrong (R1 patch — both reviewers caught this independently). POSIX `rename(2)` and Node `fs.rename()` overwrite silently; `git add` stages whatever is on disk at stage time. The correct sequence is:

```python
# Write to a UNIQUE temp name (prevents same-reviewer-process collisions on the .tmp file).
tmp = f"{final}.{uuid.uuid4().hex}.tmp"
with open(tmp, "w") as f:
    f.write(content)

# Atomically create the final file ONLY if it does not exist.
# os.link fails with FileExistsError if `final` exists — exactly the "second writer loses" semantic.
try:
    os.link(tmp, final)
    os.unlink(tmp)            # clean up the temp; the link is the canonical name now
except FileExistsError:
    os.unlink(tmp)            # someone else wrote the file first; we lose, drop our temp
    return "race_lost"        # caller decides whether to retry or skip
```

Equivalently in Node: use `fs.linkSync(tmp, final)` and catch `EEXIST`. (`fs.writeFile` with `{flag: 'wx'}` is also acceptable — `wx` means "exclusive create"; same semantic, one fewer fs call.) The strategist watcher (see AC5) cleans up orphan `.tmp.*` files left by crashed reviewer processes.

**Push-race semantics (R1 patch — Cursor H4 + Codex M4):**

Reviewers writing `codex.md` and `cursor.md` independently push to `origin/main` for the same `r<N>/` directory. The pushes can race; one wins, one is rejected non-fast-forward. The reviewer prompt MUST handle this:

```bash
# Per AC3, after writing the response file and committing locally:
for attempt in 1 2; do
  git pull --rebase origin main \
    && git push origin main \
    && break
done

if [ $? -ne 0 ]; then
  # Second push attempt failed — leave the local commit unpushed; log to journal so founder sees it.
  echo "PUSH-RACE-FALLBACK: review-r<N>: <reviewer> on <item_id> sha=<commit>" \
    >> raw/internal/dogfooding/mcp-interactions-journal.md
fi
```

The strategist watcher detects unpushed reviewer commits during its `git pull` step (see AC5) and surfaces them to founder.

**Round monotonicity:** Round numbers are monotonically increasing; `r{N+1}/` is only created after `r{N}/combined.md` exists.

# Acceptance Criteria

## AC0 — Polling primitive parity in both reviewer clients (R1 patch — Codex H1 + Cursor H5, convergent HIGH)

The `/loop` skill is a Claude Code CLI built-in (verified: not a `.claude/skills/loop` plugin file; available via `Skill` tool invocation in CC sessions). Whether Codex CLI and Cursor IDE-embedded clients have equivalent recurring-poll primitives is **unverified**. AC3 + AC6 both depend on a polling primitive in each reviewer client.

Builder MUST:

1. **Verify Claude Code `/loop` works** as a `/loop 10m /review-queue-codex` (or analog) invocation that wakes every 10 min and re-runs the prompt.
2. **Verify Codex CLI** has an equivalent. Candidates: `codex --watch` mode, a `launchctl`-driven scheduled run, or a `cron` job that pipes a prompt into `codex exec`. Pick the simplest that works for the founder's machine; document in `docs/review-queue-setup.md`.
3. **Verify Cursor IDE** has an equivalent. Candidates: Cursor's own scheduled-agent feature (if any), or a paste-once long-running prompt that the founder pastes once per session and Cursor self-loops, or a `cron`-launched detached Cursor process. Pick the simplest; document.
4. **Provide a Cursor-shaped fallback** in case Cursor has no native polling: a `cron`/`launchd` daemon that injects the canonical prompt into the Cursor session every 10 min via OS-level keyboard automation, OR (preferred) a paste-once prompt with explicit "loop yourself every 10 min" semantics that the founder pastes at session start.

**AC0 success criteria:**

- `docs/review-queue-setup.md` exists with a one-section recipe per reviewer client (Claude Code, Codex CLI, Cursor). Each recipe is verified by the founder running it once before AC6 starts.
- If any reviewer client cannot achieve 10-min polling, the spec explicitly documents the fallback (founder pastes the prompt manually every 10 min — degrades cleanly to the pre-queue manual flow for that one reviewer).

## AC1 — Directory + file schema specced and tested

The directory layout under `backlog/reviews/` is created (with a `.gitkeep` in an empty subdirectory or an example), and the three file shapes (`request.md`, `<reviewer>.md`, `combined.md`) have JSON Schema validators in `tools/review-queue/schemas/`. Tests at `tests/review-queue/schemas.test.ts` cover:

- Valid request / response / combined files parse cleanly.
- Missing required frontmatter fields fail with a clear error citing the field name.
- `reviewer` enum is `{codex, cursor}` for V1 (schema note: extensible per After Completion §5.3); other values fail.
- `verdict` enum is `{proceed, proceed_after_patches, pushback, divergent, single_reviewer_timeout}` (R1 patch — Cursor M1 split). `divergent` and `single_reviewer_timeout` are valid ONLY in `combined.md`, not in `<reviewer>.md`.
- `class` enum on `request.md` is `{narrow, structural-reform}` (R1 patch — Cursor M4); other values fail.
- `artifact_sha != request.spec_commit_sha` produces a warning at validator level **and** the canonical reviewer prompt (AC3) MUST handle it by aborting the run and retrying at the request SHA (R1 patch — Cursor M3).

## AC2 — Strategist write helper

A script at `tools/review-queue/request.py` (`.py` chosen to match existing `tools/blocked.py`, `tools/wiki_index.py` — flat-tools convention noted as a one-directory shift in §Implementation Notes, Cursor L5) that takes `<item_id> <round>` as args, reads the corresponding `backlog/ready/<item_id>.md` (or `claimed/` / `pending_review/`), captures the current `HEAD` SHA, and writes a `backlog/reviews/<item_id>/r<round>/request.md` with the canonical frontmatter and a default "what to review" body. Idempotent — if the request file already exists with the same SHA, exits cleanly; if the SHA differs, errors with a clear "round already exists at different SHA — bump round number or fix history" message.

The `class` field on `request.md` is supplied via `--class={narrow,structural-reform}` flag (defaults to `narrow` if omitted; strategist convention is to set explicitly at r1 time per Cursor M4).

The `prior_round_atoms` field on `request.md` is optional and supplied via `--embed-atom=<source>::<atom_id>` flags (repeatable). The strategist embeds verbatim prior-round content here when it wants reviewers to stay ECHO-optional (per Cursor reviewer-note property: R1 itself was zero-ECHO-call for Cursor).

Tests at `tests/review-queue/request.test.ts`:

- Happy path: item in `ready/` produces a valid request.md with correct frontmatter.
- Item not found: clear error.
- Round already exists at same SHA: no-op exit 0.
- Round already exists at different SHA: error.
- `--class` flag accepted and reflected in frontmatter.
- `--embed-atom` flag accepted and reflected in `prior_round_atoms` frontmatter list.

## AC3 — Canonical reviewer-loop prompts

Two slash-command files at `.claude/commands/review-queue-codex.md` and `.claude/commands/review-queue-cursor.md` (one per reviewer client; same canonical body except for the `reviewer:` field they write). Each prompt instructs the reviewer to:

1. **Pull origin/main first** (`git pull --rebase origin main`). Catches new request directories AND ensures the reviewer is reviewing against the up-to-date spec.
2. **Scan `backlog/reviews/**/r*/request.md`** for any request directory whose `request.md` exists but the reviewer's own response file does not.
3. **For each missing response**, read the `request.md` frontmatter to get `artifact_path` + `spec_commit_sha`; run `git show <sha>:<path>` to read the artifact at the requested SHA (NOT working-tree HEAD — drift recovery). If the working-tree spec file SHA disagrees with `request.spec_commit_sha`, that's fine — `git show` returns the historical snapshot.
4. **Perform the review.** Write the response to `<reviewer>.md.<uuid>.tmp`, then `os.link(tmp, <reviewer>.md)` + `unlink(tmp)`. On `FileExistsError` (someone else wrote first), drop the temp and skip this request.
5. **Stage and commit** the response file with the fixed-format commit message `review-r<N>: <reviewer> on <item_id>`; push to `origin/main` with the pull-rebase + retry-once + journal-fallback pattern (see §Architecture push-race semantics). **This is an operational commit, not a ship push — per §"Out of Scope" #4 it does not need founder approval.**
6. **Log the response** in the dogfooding journal per CLAUDE.md — **AFTER** the response file is committed, NOT as part of the queue handshake. The journal entry references the queue files; it does not coordinate them.
7. **Exit.** One review per loop tick; next tick picks up the next missing response.

The prompt is designed to be the body of the polling primitive verified in AC0 (Claude Code `/loop 10m /review-queue-codex`; Codex CLI / Cursor equivalents per AC0).

**Tests:** a smoke script at `tools/review-queue/test-reviewer-prompt.sh` that creates a synthetic request, runs the reviewer prompt's polling logic (the file-scan + state-check + git-pull parts, not the actual AI call), and asserts the next-step is "perform review on <artifact> at <sha>".

## AC4 — Strategist combine helper (with watcher behavior folded in — R1 patch, Codex H2)

A script at `tools/review-queue/combine.py` that:

1. **Polls** `backlog/reviews/**/r*/` for round directories where (a) both `codex.md` and `cursor.md` exist AND `combined.md` does not, OR (b) only one reviewer responded but `(now - request.requested_at) > MISSING_REVIEWER_TIMEOUT_HOURS` (default 2). This is the **watcher loop** — invoked via Claude-Code `/loop 10m /review-queue-watch` (or the equivalent per AC0) by the strategist.
2. **For each round needing combine:**
   - Run `git pull --rebase origin main` first (R1 patch — Cursor H3).
   - Clean up any orphan `<reviewer>.md.*.tmp` files older than 30 min (left by crashed reviewer processes).
   - If both responses present: read both, produce a draft `combined.md` with the convergent/divergent tables and verdict roll-up (logic below).
   - If timeout fired with only one response: produce a `combined.md` with `combined_verdict: single_reviewer_timeout`, `escalated_to_founder: true`, citing the missing reviewer. Strategist (human + AI) decides whether to proceed with single-reviewer review or wait longer.
3. **Commit and push** the `combined.md` (operational commit, not founder-gated). Strategist then fills the disposition column and the convergence call manually — the script does mechanical aggregation, not judgment.

**Combine logic — match key for "convergent":**

The match key for whether two findings are convergent is **`where` at section granularity** (R1 patch — Cursor M5). E.g., both reviewers flagging `§AC3` are convergent on that section even if their findings differ on prescription; severity disagreement (HIGH vs MED on the same `where`) is recorded but not treated as divergent at the queue layer. Optional finer-grained convergence via the explicit `cross_ref` field on a finding (R2+ pattern). Strategist's-call: collapse on `(where)` for V1; future iterations can refine if it produces noise.

**Verdict roll-up table:**

| codex.verdict | cursor.verdict | combined_verdict | escalated_to_founder |
|---|---|---|---|
| proceed | proceed | proceed | false |
| proceed | proceed_after_patches | proceed_after_patches | false |
| proceed_after_patches | proceed_after_patches | proceed_after_patches | false |
| proceed* | pushback | divergent | **true** |
| pushback | pushback | pushback | false |
| (missing) | * | single_reviewer_timeout | **true** |
| * | (missing) | single_reviewer_timeout | **true** |

Tests at `tests/review-queue/combine.test.ts`:

- Both responses present, no `where`-convergent findings: divergent table populated, convergent table empty.
- Both responses present, all findings `where`-convergent: convergent table populated correctly.
- Both responses present, verdicts cross `{proceed*, pushback}` boundary: `combined_verdict: divergent`, `escalated_to_founder: true`.
- One response missing, within timeout: combine.py exits 0 without writing combined.md (waiter state).
- One response missing, past timeout: `combined_verdict: single_reviewer_timeout`, `escalated_to_founder: true`.
- `combined.md` exists, no `--force`: error.
- Orphan `.tmp.*` files older than 30 min are cleaned up; younger ones left alone.

## AC5 — Race + timeout behavior (covered as integration tests against AC1-AC4)

Tests at `tests/review-queue/concurrency.test.ts` covering:

- Two strategist invocations writing the same `request.md` concurrently: second writer sees `FileExistsError` on `os.link`, exits cleanly. (Same-SHA = idempotent; different-SHA = error per AC2.)
- Two reviewer invocations writing the same `codex.md` concurrently: `os.link` is atomic; first writer wins via successful link, second writer sees `FileExistsError`, drops its temp, exits.
- A reviewer crashes after writing `codex.md.<uuid>.tmp` but before `os.link`: the orphan `.tmp.<uuid>` file is cleaned up by combine.py on its next poll (≥ 30 min old).
- Two reviewers push to `origin/main` concurrently: `git pull --rebase + retry once` resolves the race; if both attempts fail, the second-loser writes a `PUSH-RACE-FALLBACK` line to the journal and the unpushed commit waits for the next loop tick.
- Watcher polling: combine.py running on a `/loop 10m` cadence detects "round complete" within one poll interval (deterministically — both response files exist on `origin/main`).
- Missing-reviewer timeout: if only one response exists after `MISSING_REVIEWER_TIMEOUT_HOURS` (default 2), combine.py writes `combined.md` with `combined_verdict: single_reviewer_timeout` and `escalated_to_founder: true`.

## AC6 — Two-part dogfooding (R1 patch — Codex M5 split into builder-completable + post-merge)

**AC6a — Synthetic end-to-end test (builder-completable as part of this item).**

`tests/review-queue/e2e.test.ts` runs a scripted simulation of a full R1→R2 cycle:

1. Test harness creates a fake spec file in `backlog/ready/` with a known SHA.
2. Test harness runs `request.py` to create `r1/request.md`.
3. Test harness writes synthetic `codex.md` and `cursor.md` response files via the AC3 atomic-link path (NOT via real AI — fixture content).
4. Test harness runs `combine.py`; asserts `combined.md` is produced with the expected convergent/divergent split and verdict roll-up.
5. Test harness updates the fake spec (new SHA), runs `request.py` for `r2/`, writes two more synthetic reviews with `proceed` verdicts.
6. Test harness runs `combine.py` again; asserts `combined.md` shows `combined_verdict: proceed` and `next_round: null`.
7. Assert: directory has no orphan `.tmp.*` files; round numbering is monotonic; no founder messages were synthesized in the harness (proves the queue is dispatch-message-free under the synthetic case).

**AC6b — Post-merge real-use validation (follow-up; NOT a 039 blocker).**

Filed as a separate post-merge item after 039 lands: the strategist authors the **next item that would have gone through ≥1 cross-tool spec-review round** (Cursor L2 — not just "next item"; many backlog items are bugfix/doc that skip review). Runs `request.py` to create r1/request.md. Founder has pre-configured all three polling primitives per AC0 (Claude Code `/loop` for strategist watcher; reviewer-client loops for Codex + Cursor). Reviewers poll, read at request SHA, respond. Strategist `/loop` invokes `combine.py`, dispositions findings, patches spec, commits patch, runs `request.py` for r2/. Repeats until convergence. Item is claimable.

**AC6b success criteria (measured post-merge):**

- Founder messages during the full R1→R_final cycle: **0 dispatch messages**, ≤ 2 judgment messages (for substantive divergence per §"Out of Scope" #7).
- Total wall-clock time for one full round, gated by `request.class`:
  - `class: narrow` → ≤ 30 min per round (R1 patch — Cursor M4: budget locked at r1 time, not retroactively).
  - `class: structural-reform` → ≤ 2 hours per round.
- Zero corruption of the queue directory (no orphan `.tmp.*`, no missing round numbers, no race-lost responses).

Dogfooding entry in the journal at the end of AC6b with the actual measured numbers.

# Implementation Notes

- **Why files, not a database:** The repo is already the source of truth for items, commits, and review history. A SQLite or service-backed queue would split state across two systems and break `git log` visibility into review activity. Files in `backlog/reviews/` show up in `git log --stat`, are diffable, and survive any tool failure.

- **Why polling, not push:** Per Codex's RC1: GUI integration is brittle. Polling is observable, debuggable, and self-recovering after any crash. The 10-minute loop tick is well below the 30-min-per-round target for narrow specs.

- **Strategist watcher (R1 patch — Cursor H1, mandatory):** The strategist watcher runs as `tools/review-queue/combine.py` invoked via `/loop 10m /review-queue-watch` (or AC0 equivalent) in the strategist's own client session. **NOT an "opportunistic check whenever invoked"** — that defaulted-to mode in RC1 was itself a dispatch message in disguise (Cursor H1) and is removed. The strategist `/loop` is part of the founder's one-time session setup, same as the reviewer loops.

- **Polling primitive parity (R1 patch — AC0; Cursor L3):** `/loop` is a Claude-Code CLI built-in (verified absent as a plugin skill at `.claude/skills/loop`). Codex CLI and Cursor parity is verified in AC0; fallbacks documented in `docs/review-queue-setup.md`.

- **Reviewer prompt size discipline:** The reviewer loop runs every 10 min, so the prompt must not consume the reviewer's context budget. Keep each tick's prompt scoped to one review and one artifact; no chained reasoning across ticks. If a reviewer needs more context, they pull it via ECHO at review time, or the strategist pre-embeds via `request.prior_round_atoms`.

- **`focus_hints` discipline:** Strategist can use the optional `focus_hints` field in `request.md` to direct reviewer attention, but this is a courtesy, not a constraint. Reviewers must still read the full artifact — `focus_hints` is for "after you've read the whole thing, pay extra attention to X."

- **`prior_round_atoms` discipline (R1 patch — Cursor reviewer note):** The strategist MAY embed verbatim prior-round atoms in `request.md` to keep reviewers ECHO-optional. This is the property that allowed 039 R1 itself to be zero-ECHO-call for Cursor (per Cursor's own R1 report). Use sparingly — the request file should stay scannable. Long atoms (>2 KB) belong as ECHO references with the journal source pointer, not as inline embeds.

- **JOURNAL-AS-QUEUE PROHIBITION (R1 patch — promoted from §"Out of Scope" #2 to an Implementation Notes invariant; Cursor reviewer-note + Codex live-fire):** Reviewer prompts MUST NOT write to the dogfooding journal as part of the queue handshake. Journal entries reference the response file AFTER the response file is committed. The journal is the observation log; the queue is the message bus. Conflating them produces cross-reviewer journal-edit races (observed live during 039 R1: Codex's R1 reviewer turn was unable to commit its journal entry because Cursor had uncommitted journal edits on the same file at the same time — Codex correctly refused to resolve the race).

- **Bootstrap moment (now complete):** This very spec (039) went through R1 cross-tool review using the *pre-queue* manual dispatch on 2026-05-11 23:35–23:50 PDT (Codex + Cursor R1 reviews journaled). Item 040+ uses the queue. The R1 cycle itself produced the convergent + load-bearing-singleton findings folded into this RC2 patch.

- **Reviewer-harness-agnostic property (R1 patch — Cursor reviewer note; positive):** The canonical `<reviewer>.md` shape means a future third reviewer (Gemini, a code-review specialist subagent, a second Claude Code worktree) can join the queue without protocol changes. Only the `reviewer:` enum in AC1 schema validation needs an extension. Real V2-readiness without paying V2 costs now.

- **Strategist-vs-strategist independence is NOT a queue concern (R1 patch — Cursor reviewer note):** The strategist who authors a spec, writes `request.md`, and runs `combine.py` is producer-side throughout. CLAUDE.md's reviewer-independence rule scopes independence to *builder-vs-reviewer*, not *strategist-vs-strategist*. The independence the queue preserves is Codex-vs-Cursor — keeping the two reviewer voices' findings independent.

- **No queue dependency on ECHO:** ECHO is used for *context recovery during review* (reading prior strategist turns when `focus_hints` references atoms not embedded in `prior_round_atoms`), not for queue state. If ECHO is down, the queue still works — reviewers read the artifact directly via `git show`. **039 R1 fired this case live**: ECHO substring index lagged Cursor's R1 reviewer turn by ~5 min; the queue's filesystem source-of-truth was unaffected.

- **Timezone discipline (R1 patch — Cursor L4):** Queue files (`request.md`, `<reviewer>.md`, `combined.md`) use ISO-8601 UTC timestamps in frontmatter (machine layer). The dogfooding journal uses PDT (founder-local) in entry headers. The convention is documented once in `tools/review-queue/schemas/README.md` and enforced by schema validation on the queue files.

- **`tools/review-queue/` subdirectory convention (R1 patch — Cursor L5):** Existing `tools/` is flat (`blocked.py`, `wiki_index.py`). A new subdirectory is justified by the file count (3 scripts + a `schemas/` dir = 4+ files), and isolates the queue's helpers from the rest of `tools/`. Non-blocking convention shift; documented in the spec for builder awareness.

# After Completion (Strategist Notes)

After this item ships and ≥3 specs have gone through the queue end-to-end via AC6b:

1. **Promote to wiki**: `wiki/operating-model/cross-tool-review-dispatch-queue.md`. Cover: the file shape, the reviewer-loop prompt, the strategist combine flow, the divergence-escalation rule, the journal-not-queue invariant, the reviewer-harness-agnostic property.
2. **Update `CLAUDE.md`**: §"Reviewer independence rule" gains a bullet pointing to the queue. The founder-gate list shrinks: dispatch is no longer a founder responsibility; only judgment + merge/ship `push origin main` remain.
3. **Update `backlog/README.md`**: add `reviews/` to the pipeline diagram; document the request/response/combined flow.
4. **Operating-model retro**: at the V1 milestone retro, measure dispatch-message reduction (target: 0 per spec) and round-time reduction (target: ≤ 30 min per narrow round; ≤ 2 hours per structural-reform round).
5. **V1.6+ candidate follow-ups** (file as separate items, not as 039 fixups):
   - **AC6b post-merge real-use validation** on the next qualifying spec (R1 patch — Cursor L2 + Codex M5).
   - Reviewer divergence-arbitration heuristics (today: escalate to founder; future: strategist proposes resolution + founder ratifies).
   - Multi-reviewer-per-round support (today: codex + cursor only; future: optional third voice for high-stakes specs — schema enum extension per Cursor L1).
   - Cross-repo queue (V2 territory; presupposes a shared review substrate).
   - **M1-1 sub-gap A retroactive**: 039 R1 fired sub-gap A again on Cursor (ECHO substring index lagged the SQLite bubble write by ~5 min). 034 was supposed to close this. Worth a follow-up to instrument the lag and decide whether 034's capture-rate metric needs a "substring-index freshness" axis.

# Review History

## R1 — 2026-05-11 23:35–23:50 PDT (cross-tool spec review on RC1 @ commit `87f70fa`)

**Reviewers:** Codex (atom `3711eeae`, 8118 bytes) + Cursor (bubble `aae455fc`, 15441 chars).
**Verdicts:** Codex `pushback` + Cursor `proceed_after_patches` → **strategist roll-up: `pushback`** (per AC4 verdict roll-up table: `pushback` + `proceed_after_patches` does not cross the boundary, but Codex's pushback was on AC3/AC5 underspecification which is load-bearing — accept Codex's pushback verdict; both reviewers' HIGHs converge on what to patch).
**Round dispatched manually** (last manual dispatch before queue exists per "Bootstrap moment" §Implementation Notes).

### Findings dispositioned (18 total: 5 HIGH-convergent / 3 HIGH-singleton / 7 MED / 3 LOW)

| # | Severity | Source | Where | Disposition | Section patched |
|---|---|---|---|---|---|
| 1 | HIGH | **convergent** (Codex H1 + Cursor H5) | `/loop` skill path + reviewer-client parity | accepted — AC0 added | frontmatter, AC0, §Implementation Notes |
| 2 | HIGH | **convergent** (Codex H3 + Cursor H2) | §Architecture atomicity (`os.rename`/`git add` wrong) | accepted — `os.link` + `O_EXCL` semantics | §Architecture atomicity block |
| 3 | HIGH | **near-convergent** severity-split (Cursor H4 HIGH + Codex M4 MED) | reviewer push-race to `origin/main` | accepted — pull-rebase + retry-once + journal-fallback | §Architecture push-race + AC3 step 5 |
| 4 | HIGH | Cursor H1 (singleton, load-bearing) | AC6 → Goal coherence: option-(b) "opportunistic check" IS a dispatch message | accepted — strategist `/loop` watcher MANDATORY (option-a only) | §Implementation Notes "Strategist watcher" + AC6 |
| 5 | HIGH | Codex H2 (singleton, load-bearing) | watcher behavior unspecified (AC5 needs tmp cleanup / poll / timeout but no script named) | accepted — folded into `combine.py` (AC4) | §AC4 (rewrote with watcher logic folded in) |
| 6 | HIGH | Cursor H3 (singleton, load-bearing) | strategist watcher silent on `git pull` before polling | accepted — explicit pull step in AC4 + AC3 step 1 | §AC3 step 1, §AC4 step 2 |
| 7 | MED | Cursor M1 | `verdict: divergent` overloaded | accepted — split into `divergent` + `single_reviewer_timeout` | §AC1 verdict enum, §AC4 verdict roll-up |
| 8 | MED | Cursor M2 | divergence-escalation rule incomplete (only PROCEED vs PUSHBACK) | accepted — `{proceed*, pushback}` boundary rule | §"Out of Scope" #7, §AC4 verdict roll-up |
| 9 | MED | Cursor M3 | `artifact_sha` drift behavior undefined | accepted — reviewer aborts + re-fetches at request SHA | §reviewer file shape, §AC3 step 3 |
| 10 | MED | Cursor M4 | AC6 wall-clock budget unfalsifiable | accepted — `class: narrow|structural-reform` in request.md frontmatter | §request file shape, §AC2 `--class` flag, §AC6b |
| 11 | MED | Cursor M5 | AC4 "severity-matched" match key undefined | accepted — match on `where` at section granularity | §AC4 combine logic |
| 12 | MED | Codex M5 | AC6 not builder-completable in isolation | accepted — split AC6a (synthetic e2e) + AC6b (post-merge real-use follow-up) | §AC6 |
| 13 | LOW | Codex L6 | main-push rule exception | accepted — §"Out of Scope" #4 clarified (queue commits ≠ ship pushes) | §"Out of Scope" #4 |
| 14 | LOW | Cursor L1 | `reviewer` enum hardcodes `{codex, cursor}` | accepted — schema note: extensible per After Completion §5.3 | §AC1, §reviewer file shape |
| 15 | LOW | Cursor L2 | AC6 should target next *qualifying* spec | accepted — AC6b reworded | §AC6b |
| 16 | LOW | Cursor L3 | `/loop` parity between clients | absorbed into AC0 | §AC0, §Implementation Notes |
| 17 | LOW | Cursor L4 | timezone consistency (UTC machine / PDT human) | accepted — one-sentence note | §Implementation Notes |
| 18 | LOW | Cursor L5 | `tools/review-queue/` subdir convention shift | accepted — one-sentence note | §Implementation Notes, §AC2 |

### Convergence call

**Needs R2** — focus_hints for R2:
1. Confirm the `os.link` atomicity story is mechanically sound for both `request.py` (strategist same-SHA idempotency) and `<reviewer>.md` (reviewer race-lose path). Codex's H3 was the load-bearing catch in R1; R2 should verify the patch closes it.
2. Confirm AC0's polling-primitive verification is concrete enough to build against — name actual commands per client (Claude Code `/loop`; Codex CLI `???`; Cursor `???`). Cursor's H5 framed this as "what is the actual command for each client"; R2 should land the concrete answers.
3. Confirm the strategist `/loop` mandate (Cursor H1 fix) is implementable — `combine.py` as a /loop body needs to handle "no rounds to combine" cleanly (exit 0, sleep until next tick).
4. Confirm the convergence match-key choice (Cursor M5 fix: section-granularity `where`) doesn't over-collapse — R2 reviewers test against R1's actual findings (which span multiple ACs).
