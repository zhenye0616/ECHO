---
id: 2026-05-11-039-cross-tool-review-dispatch-queue
title: Cross-tool review dispatch queue — file-backed protocol; founder out of dispatch loop (RC5 / R4-patched — CONVERGED, claim-ready)
status: claimed
priority: HIGH
estimate: 1.5-2d
created: 2026-05-11
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-12T08:20:00Z"
branch: "agent/cross-tool-review-dispatch-queue"
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
requested_reviewers: [codex, cursor]   # MUST be a non-empty subset of the current `reviewer` enum (R2 patch — Cursor L4 validation rule)
focus_hints: |
  (optional) Specific aspects the strategist wants reviewer attention on.
  E.g., "Confirm the race-condition handling in §AC5 is sufficient" or
  "Cursor: scope-coherence on the queue's file-shape; Codex: implementability of the watcher."
---

# What to review

(One short paragraph linking to the artifact and any relevant prior-round context.
The reviewer's job is to read the artifact, not to chase the strategist's reasoning.

If prior-round context matters, the strategist embeds it directly in this body
section — paste the verbatim atom text or prior `combined.md` excerpt inline.
**No frontmatter field for atom embeds** (R2 patch — Cursor L1): the §Review History
block in the spec body is the canonical pattern for prior-round context, and the
request body itself is where any additional inline embed goes. Reviewers stay
ECHO-optional this way without a frontmatter field that can't actually fulfill
its purpose.)
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
                                         # If SHA drift is genuine (strategist patched mid-round), reviewer appends a
                                         # one-line "sha-drift, retrying at <sha>" entry to raw/internal/queue-errors.md
                                         # (NOT the journal — R2 patch Cursor M3 option b) and waits for next loop tick.
completed_at: 2026-05-12T07:15:00Z       # ISO-8601 UTC
verdict: proceed                         # in <reviewer>.md: one of {proceed, proceed_after_patches, pushback}
                                         # (combined.md has the wider enum — see §AC4)
                                         # R2 patch — Cursor M7: schema is per-file (three separate schemas under
                                         # tools/review-queue/schemas/); reviewers cannot write divergent /
                                         # single_reviewer_timeout / no_responses — those are combined-only.
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
                                         # OR if combined_verdict = no_responses (R3 patch — Cursor R3 L1:
                                         # all three escalation triggers listed for canonical-template clarity)
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

**Push-race semantics (R1 patch — Cursor H4 + Codex M4; R2 patch — Cursor M2 uniformity across all operational pushes):**

The queue has **three operational push types**, all subject to the same race-handling pattern:

1. **Reviewer response push** — `<reviewer>.md` from AC3 step 5.
2. **Strategist combined.md push** — `combined.md` from AC4 step 3.
3. **Strategist patch + next-request push** — spec patch + `r{N+1}/request.md` from AC3.5 step 3.

All three use the same shared helper at `tools/review-queue/push-with-retry.sh`:

```bash
#!/usr/bin/env bash
# tools/review-queue/push-with-retry.sh
# Usage: push-with-retry.sh <error-context-tag>
#   e.g., push-with-retry.sh "review-r2: codex on 2026-05-11-039-..."
set -e
CONTEXT="${1:-unknown}"
for attempt in 1 2; do
  if git pull --rebase origin main && git push origin main; then
    exit 0
  fi
done

# Second push attempt failed — leave the local commit unpushed; log to queue-errors so founder sees it.
# Per §Implementation Notes JOURNAL-AS-QUEUE PROHIBITION (R2 patch — Cursor M3 option b):
# queue error logs land in raw/internal/queue-errors.md, NOT in the dogfooding journal.
sha=$(git rev-parse HEAD)
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "${ts} PUSH-RACE-FALLBACK: ${CONTEXT} sha=${sha}" \
  >> raw/internal/queue-errors.md
exit 1
```

The strategist watcher (AC3.5 step 1) detects unpushed commits during its `git pull` step and surfaces them to founder via the `queue-errors.md` tail. Founder periodically scans `raw/internal/queue-errors.md` (or the watcher can append a one-line journal entry "see queue-errors.md for push-race fallbacks since <timestamp>" on a daily schedule — **not a queue artifact; observation-only pointer outside the handshake — R3 patch Cursor R3 L5**).

**Round monotonicity:** Round numbers are monotonically increasing; `r{N+1}/` is only created after `r{N}/combined.md` exists.

# Acceptance Criteria

## AC0 — Polling primitive parity in both reviewer clients (R1 patch — Codex H1 + Cursor H5, convergent HIGH; R2 patches — Codex M1 concrete Codex command + Cursor H2 keyboard-automation drift removal)

The `/loop` skill is a Claude Code CLI built-in (verified: not a `.claude/skills/loop` plugin file; available via `Skill` tool invocation in CC sessions). Codex CLI does **not** have a `codex --watch` mode (verified at R2: local Codex CLI `/usr/local/bin/codex` has no such flag). Cursor IDE polling parity is also unverified. AC3 + AC3.5 + AC6 all depend on a polling primitive in each reviewer client.

Builder MUST:

1. **Verify Claude Code `/loop` works** as a `/loop 10m /review-queue-codex` (or `/review-queue-cursor` or `/review-queue-watch`) invocation that wakes every 10 min and re-runs the prompt. Used by:
   - Reviewer loops if running Codex/Cursor reviews from inside a Claude Code session (e.g., a subagent).
   - The **strategist watcher** (`/loop 10m /review-queue-watch`) — see AC3.5 — which runs in the strategist's own Claude Code session.
2. **Codex CLI: use `codex exec` under `cron` or `launchd`** (R2 patch — Codex M1). The canonical recipe (documented in `docs/review-queue-setup.md`):
   ```bash
   # Either cron (~/.crontab — every 10 min):
   */10 * * * *  cat ~/code/Project_echo/.claude/commands/review-queue-codex.md \
                   | codex exec -C /Users/zhenye/Desktop/Project_echo \
                                --sandbox workspace-write \
                                --ask-for-approval never -
   ```
   The `codex exec` command exits after one queue tick; the scheduler sleeps between invocations. **Do not chase `codex --watch` — it does not exist.**
3. **Cursor IDE — paste-once-self-loop is the ONLY supported pattern.** The founder pastes a long-running prompt at session start; the prompt instructs Cursor to self-loop on a 10-min timer using its own Tool/Agent capabilities (NOT external automation). If Cursor cannot self-loop reliably under its own harness, **document the manual-paste degradation explicitly**: founder pastes the canonical reviewer prompt once per round, degrading that one reviewer to pre-queue manual flow.
4. **(R2 patch — Cursor H2):** The following candidates are **EXPLICITLY REJECTED** as violations of §"Out of Scope" #1 (push-based GUI pinging):
   - ❌ `cron`/`launchd` daemon that injects prompts via OS-level keyboard automation (brittle UI integration; reintroduces the push-based pattern through the back door).
   - ❌ `cron`-launched detached Cursor process that auto-pastes (same brittleness class).
   If Cursor lacks both native polling AND a viable self-loop pattern, the manual-paste degradation IS the accepted fallback. The queue tolerates one reviewer running manually; it does not tolerate a brittle automation layer pretending to be polling.

**AC0 success criteria:**

- `docs/review-queue-setup.md` exists with a one-section recipe per reviewer client (Claude Code `/loop`, Codex `codex exec` + cron, Cursor paste-once-self-loop OR manual-paste). Each recipe is verified by the founder running it once before AC6 starts.
- The Codex recipe specifies the exact command including `--sandbox workspace-write --ask-for-approval never` flags (R2 patch — Codex M1).
- The Cursor recipe explicitly states "no keyboard-automation fallback" with a one-line citation back to §"Out of Scope" #1 (R2 patch — Cursor H2).

## AC1 — Directory + file schema specced and tested

The directory layout under `backlog/reviews/` is created (with a `.gitkeep` in an empty subdirectory or an example), and the three file shapes (`request.md`, `<reviewer>.md`, `combined.md`) have **three separate JSON Schemas** at `tools/review-queue/schemas/{request,reviewer,combined}.schema.json` (R2 patch — Cursor M7: three-schema architecture chosen over one-with-conditional-enums; matches the three-file-shape mental model used throughout the spec). Tests at `tests/review-queue/schemas.test.ts` cover:

- Valid request / response / combined files parse cleanly against their respective schemas.
- Missing required frontmatter fields fail with a clear error citing the field name.
- `reviewer` enum is `{codex, cursor}` for V1 (schema note: extensible per After Completion §5.3); other values fail.
- **`<reviewer>.md` verdict enum:** `{proceed, proceed_after_patches, pushback}` (R2 patch — Cursor M7: the per-reviewer schema excludes `divergent` / `single_reviewer_timeout` / `no_responses`; those are combined-only).
- **`combined.md` verdict enum:** `{proceed, proceed_after_patches, pushback, divergent, single_reviewer_timeout, no_responses}` (R2 patch — `no_responses` added per Cursor L3 to cover `(missing) | (missing)` case).
- `class` enum on `request.md` is `{narrow, structural-reform}` (R1 patch — Cursor M4); other values fail.
- `requested_reviewers` MUST be a non-empty subset of the current `reviewer` enum (R2 patch — Cursor L4: prevents "strategist requests gemini, no schema supports it" silent failure).
- `artifact_sha != request.spec_commit_sha` produces a warning at validator level **and** the canonical reviewer prompt (AC3) MUST handle it by aborting the run and retrying at the request SHA (R1 patch — Cursor M3).

## AC2 — Strategist write helper

A script at `tools/review-queue/request.py` (`.py` chosen to match existing `tools/blocked.py`, `tools/wiki_index.py` — flat-tools convention noted as a one-directory shift in §Implementation Notes, Cursor L5) that takes `<item_id> <round>` as args, reads the corresponding `backlog/ready/<item_id>.md` (or `claimed/` / `pending_review/`), captures the current `HEAD` SHA, and writes a `backlog/reviews/<item_id>/r<round>/request.md` with the canonical frontmatter and a default "what to review" body via the no-overwrite `os.link(tmp_uuid, final)` pattern (see §Architecture atomicity).

**Race-loser path (R2 patch — Codex L5):** if `os.link` raises `FileExistsError`, `request.py` reads the existing `request.md` and compares `spec_commit_sha`:
- Same SHA → same-SHA idempotency, exit 0 successfully (genuine no-op).
- Different SHA → exit non-zero with clear "round <N> already exists at different SHA — bump round number or fix history" error.

This prevents implementers from treating every `FileExistsError` as success.

The `class` field on `request.md` is supplied via `--class={narrow,structural-reform}` flag (defaults to `narrow` if omitted; strategist convention is to set explicitly at r1 time per Cursor M4).

**(R2 patch — Cursor L1):** The `prior_round_atoms` field is **dropped** from RC3. Pointers in frontmatter cannot fulfill an "inline embed" claim — reading the atom from a pointer still requires `get_atom(<uuid>)`. The §Review History section in the spec body IS the canonical inline-embed pattern (verbatim findings tables; reviewers read them without any ECHO call — verified by both R1 and R2 reviewers reporting zero-ECHO-call behavior). If a strategist wants to embed a prior atom inline, paste the atom body directly into the `# What to review` body section of `request.md`, not the frontmatter.

Tests at `tests/review-queue/request.test.ts`:

- Happy path: item in `ready/` produces a valid request.md with correct frontmatter.
- Item not found: clear error.
- Race-loser, same SHA: read existing file, confirm same-SHA, exit 0 (R2 patch — Codex L5).
- Race-loser, different SHA: read existing file, surface SHA mismatch, exit non-zero (R2 patch — Codex L5).
- `--class` flag accepted and reflected in frontmatter.
- `requested_reviewers` validation: passing a value outside the current `reviewer` enum (e.g., `--reviewer=gemini`) errors with a clear "reviewer `gemini` not in current enum {codex, cursor}; extend the schema first" message (R2 patch — Cursor L4).

## AC3 — Canonical reviewer-loop prompts

Two slash-command files at `.claude/commands/review-queue-codex.md` and `.claude/commands/review-queue-cursor.md` (one per reviewer client; same canonical body except for the `reviewer:` field they write). Each prompt instructs the reviewer to:

1. **Pull origin/main first** (`git pull --rebase origin main`). Catches new request directories AND ensures the reviewer is reviewing against the up-to-date spec.
2. **Scan `backlog/reviews/**/r*/request.md`** for any request directory whose `request.md` exists but the reviewer's own response file does not.
3. **For each missing response**, read the `request.md` frontmatter to get `artifact_path` + `spec_commit_sha`; run `git show <sha>:<path>` to read the artifact at the requested SHA (NOT working-tree HEAD — drift recovery). If the working-tree spec file SHA disagrees with `request.spec_commit_sha`, that's fine — `git show` returns the historical snapshot.
4. **Perform the review.** Write the response to `<reviewer>.md.<uuid>.tmp`, then `os.link(tmp, <reviewer>.md)` + `unlink(tmp)`. On `FileExistsError` (someone else wrote first), drop the temp and skip this request.
5. **Stage and commit** the response file with the fixed-format commit message `review-r<N>: <reviewer> on <item_id>`; push to `origin/main` via the shared `tools/review-queue/push-with-retry.sh` helper (see §Architecture push-race semantics — R2 patch Cursor M2). **This is an operational commit, not a ship push — per §"Out of Scope" #4 it does not need founder approval.**
6. **Log the response** in the dogfooding journal per CLAUDE.md — **AFTER** the response file is committed, NOT as part of the queue handshake. The journal entry references the queue files; it does not coordinate them.
7. **Exit.** One review per loop tick; next tick picks up the next missing response.

The prompt is designed to be the body of the polling primitive verified in AC0 (Claude Code `/loop 10m /review-queue-codex`; Codex CLI / Cursor equivalents per AC0).

**Tests:** a smoke script at `tools/review-queue/test-reviewer-prompt.sh` that creates a synthetic request, runs the reviewer prompt's polling logic (the file-scan + state-check + git-pull parts, not the actual AI call), and asserts the next-step is "perform review on <artifact> at <sha>".

## AC3.5 — Strategist watcher slash-command body (R2 patch — Cursor H1, load-bearing)

A slash-command file at `.claude/commands/review-queue-watch.md` that defines the strategist `/loop 10m /review-queue-watch` tick body. Mirrors AC3's structure for reviewers. Each tick:

1. **Pull origin/main first** (`git pull --rebase origin main`). Catches new reviewer responses + ensures the strategist is operating on up-to-date state.
2. **Run `tools/review-queue/combine.py`** for any rounds where (a) both reviewer responses exist AND `combined.md` does not, OR (b) timeout fired (per AC4). `combine.py` writes the draft `combined.md` for each eligible round.
3. **For each fresh `combined.md` produced this tick:**
   - **If `escalated_to_founder: true`** (divergent verdicts crossing the {proceed*, pushback} boundary, or `single_reviewer_timeout`, or `no_responses`): append a journal entry citing the queue path; exit. **Founder will see and act on next session.** The strategist does NOT attempt to adjudicate divergence — that's the §"Out of Scope" #7 boundary.
   - **Else (combined_verdict within {proceed*, pushback}):** the strategist autonomously dispositions findings. For each row in the convergent + divergent tables, fill the `Disposition` column based on the strategist's judgment of the spec direction. Commit the disposition update to `combined.md` via push-with-retry. Then **(R3 patch — Codex R3 M1, load-bearing structural fix):**
     - **(a) Zero patches applied** (verdict was `proceed` with no actionable findings, OR a `pushback` where all findings deferred to follow-ups outside the round): set `next_round: null` in `combined.md`; commit + push the final update via push-with-retry. **Convergence declared without verification** because no spec changes need verifying.
     - **(b) Patches applied — verification round needed (DEFAULT for any spec change):** apply patches to the spec file inline. Commit the spec patch via push-with-retry. Run `tools/review-queue/request.py <item_id> <N+1>` with `focus_hints` citing what was patched (the strategist must list at minimum: each load-bearing finding's section, the disposition's chosen prescription, and any falsifiable claim worth re-checking). Commit + push `r{N+1}/request.md` via push-with-retry. Set `next_round: <N+1>` in this round's `combined.md`; commit + push that update. **This is the default branch.** RC3's own R2→R3 transition is the canonical example: all R2 findings accepted inline with zero deferred follow-ups, but R3 was correctly needed to verify the patches landed cleanly (and R3 then caught this very bug in AC3.5 — the structural review-history value working as designed).
     - **(c) Patches applied — verification explicitly waived (rare):** strategist's-call when patches are mechanical (typo fixes, comment-only changes, link updates) AND no reviewer requested a verification round AND no finding was load-bearing. Strategist writes a one-line "verification waived; rationale: <…>" into combined.md and sets `next_round: null`. **Use sparingly — when in doubt, run a verification round.** This branch is for the edge case where another round would be pure overhead; the default is (b).

The "accepted-without-follow-ups" condition does NOT imply convergence. **Accepted-without-follow-ups is orthogonal to whether the patches need verification.** R2 accepted all 14 findings inline with zero follow-ups; the patches were substantive enough that R3 verification was required (and necessary — R3 caught Codex M1 = this very fix). Builder MUST implement the (a)/(b)/(c) split correctly; AC4 tests cover all three branches.
4. **Exit.** **One round per tick** when driven from `/review-queue-watch` (R3 patch — Cursor R3 L3): `combine.py` processes at most one newly-eligible round per invocation, then this tick handles disposition + patch + next-request (or convergence-declare) for that single round. Next tick picks up the next eligible round. This makes the tick body deterministic in scope; long ticks are avoided by serializing rounds across ticks rather than batching them. (Builder note: `combine.py` MAY be invoked with `--all` or similar outside the `/loop` body for one-shot batch processing, but the watcher-driven path is one-round-per-tick.)

**The key word from RC2 that R2 H1 caught — "manually" in AC4 step 3 — is now bound to "the strategist agent autonomously dispositions"** (R2 patch — Cursor H1). The disposition step is judgment work, but the strategist agent does it inside the `/loop` tick without founder input. Founder input is only required when `escalated_to_founder: true`, per the verdict roll-up table in AC4.

**Tests:** a smoke script at `tools/review-queue/test-watcher-prompt.sh` that synthesizes a `combined.md` (both `escalated_to_founder: true` and `escalated_to_founder: false` cases), runs the watcher prompt's logic (the file-scan + state-check parts, not the AI judgment call), and asserts the next-step is either "escalate" or "disposition + patch + next-request".

## AC4 — Strategist combine helper (with watcher behavior folded in — R1 patch, Codex H2)

A script at `tools/review-queue/combine.py` that:

1. **Polls** `backlog/reviews/**/r*/` for round directories where (a) both `codex.md` and `cursor.md` exist AND `combined.md` does not, OR (b) only one reviewer responded but `(now - request.requested_at) > MISSING_REVIEWER_TIMEOUT_HOURS` (default 2). This is the **watcher loop** — invoked via Claude-Code `/loop 10m /review-queue-watch` (or the equivalent per AC0) by the strategist.
2. **For each round needing combine:**
   - Run `git pull --rebase origin main` first (R1 patch — Cursor H3).
   - Clean up any orphan `<reviewer>.md.*.tmp` files older than 30 min (left by crashed reviewer processes).
   - If both responses present: read both, produce a draft `combined.md` with the convergent/divergent tables and verdict roll-up (logic below).
   - If timeout fired with only one response: produce a `combined.md` with `combined_verdict: single_reviewer_timeout`, `escalated_to_founder: true`, citing the missing reviewer.
   - If timeout fired with NO responses (both reviewers silent past `MISSING_REVIEWER_TIMEOUT_HOURS`): produce a `combined.md` with `combined_verdict: no_responses`, `escalated_to_founder: true` (R2 patch — Cursor L3).
3. **Commit and push** the `combined.md` via `tools/review-queue/push-with-retry.sh` (operational commit, not founder-gated; R2 patch — Cursor M2 push-race uniformity).
4. **No rounds to combine — explicit success path (R2 patch — Codex M2):** If the poll in step 1 finds no eligible rounds, `combine.py` exits 0 with no output and no commits. Emits a short `[combine] no rounds to combine` status line to stdout for `/loop`-driven scheduler visibility. **This is the canonical scheduler-tick no-op path** — `combine.py` MUST exit cleanly so `/loop`/`cron`/`launchd` ticks can poll again on the next interval.

**Combine logic — match key for "convergent" (R2 patch — Codex M3 normalized shape):**

Each finding's `where` field is parsed into:
- `primary_where_section`: the first `§<Section>` (or `§<Section><sub-section>`) reference in the `where` string. Required.
- `related_where_sections`: a list of any additional `§<Section>` references. Optional.

Two findings are **convergent on (where)** if their `primary_where_section` matches **EXACTLY at full sub-anchor specificity** (R3 patch — Codex R3 M2: `§AC4 combine logic` matches `§AC4 combine logic` but NOT bare `§AC4` alone — sub-anchor specificity must agree). `related_where_sections` is **observational only** — it helps the strategist read the finding's full context but does NOT trigger convergence. The explicit `cross_ref` field (R1 patch, M5) IS the canonical override: when a reviewer marks `cross_ref: { round, reviewer, finding_index }`, the pair is convergent regardless of `where` overlap.

This normalization closes Codex's R2 M3 + R3 M2: raw free-form `where` strings under-collapse (different wording for the same section); section-token-overlap matching over-collapses (broad findings collide); the "primary appears in related" rule from RC3 still over-collapses against multi-section findings whose primary anchor is a structural section (e.g., a 3-section `where` like Cursor R2 H1's `§Implementation Notes "Strategist watcher" + §AC3 + §AC4` should NOT converge with single-section `§AC4 combine logic` findings just because they share a section token). The full-sub-anchor exact-match rule + cross_ref override is the falsifiable shape.

**Fixture test against R2's actual findings (R3 patch — Codex R3 M2):** `tests/review-queue/combine.test.ts` includes a fixture pulled from R2's real combined.md. Cursor R2 H1 (`primary_where_section: §Implementation Notes "Strategist watcher"`, `related_where_sections: [§AC3, §AC4]`) MUST NOT converge with Codex R2 M2 (`primary_where_section: §AC4 combine.py polling semantics`) or Codex R2 M3 (`primary_where_section: §AC4 combine logic`). The match-key fix is verified against live distribution; builder must implement parse+match such that this fixture passes.

Severity disagreement (HIGH vs MED on the same `where`) is recorded but not treated as divergent at the queue layer — the strategist dispositions both findings in `combined.md`.

**Verdict roll-up table (commutative on codex/cursor column order — R2 patch Cursor L2):**

| codex.verdict | cursor.verdict | combined_verdict | escalated_to_founder |
|---|---|---|---|
| proceed | proceed | proceed | false |
| proceed | proceed_after_patches | proceed_after_patches | false |
| proceed_after_patches | proceed_after_patches | proceed_after_patches | false |
| proceed* | pushback | divergent | **true** |
| pushback | pushback | pushback | false |
| (missing) | * | single_reviewer_timeout | **true** |
| (missing) | (missing) | no_responses | **true** |

The table is commutative on `(codex.verdict, cursor.verdict)` — `(proceed_after_patches, pushback)` rolls up identically to `(pushback, proceed_after_patches)` as `divergent`. Implementer renders both orderings produce the same result.

Tests at `tests/review-queue/combine.test.ts`:

- Both responses present, no `where`-convergent findings: divergent table populated, convergent table empty.
- Both responses present, all findings exact-primary-convergent OR explicitly cross-referenced (R4 patch — Codex R4 L2: stale "primary or related section overlap" wording corrected to match the RC4 exact-sub-anchor rule): convergent table populated correctly. R2 fixture (Cursor R2 H1's 3-section `where` vs Codex R2 M2's single-section `§AC4 combine.py polling semantics`) is the canonical non-convergence assertion.
- Both responses present, verdicts cross `{proceed*, pushback}` boundary: `combined_verdict: divergent`, `escalated_to_founder: true`.
- One response missing, within timeout: combine.py exits 0 without writing combined.md (waiter state).
- One response missing, past timeout: `combined_verdict: single_reviewer_timeout`, `escalated_to_founder: true`.
- Both responses missing, past timeout: `combined_verdict: no_responses`, `escalated_to_founder: true` (R2 patch — Cursor L3).
- **No eligible rounds at all: combine.py exits 0, no output (except status line), no commits** (R2 patch — Codex M2).
- `combined.md` exists, no `--force`: error.
- Orphan `.tmp.*` files older than 30 min are cleaned up; younger ones left alone.
- `cross_ref` override: convergent table groups findings explicitly cross-referenced even if `where` sections don't overlap.
- **AC3.5 state-machine fixtures (R4 patch — Codex R4 L1):** three explicit fixtures covering each branch:
  - **(a) Zero patches → convergence:** combined.md with all findings deferred / verdict = proceed; assert `next_round: null` and NO new `r{N+1}/request.md` created.
  - **(b) Patches applied → verification round DEFAULT:** combined.md with all findings accepted inline + zero deferred follow-ups (the load-bearing case Codex R3 M1 caught); assert `request.py` ran for `r{N+1}/`, `r{N+1}/request.md` exists, AND `next_round: <N+1>` in this round's combined.md. **This fixture closes Codex R3 M1 with a falsifiable test** — the state machine MUST set `next_round: <N+1>`, NOT `null`, in this case.
  - **(c) Explicit waiver → convergence with rationale:** combined.md with patches applied + explicit "verification waived; rationale: <...>" line; assert `next_round: null` AND NO new request.md created.

## AC5 — Race + timeout behavior (covered as integration tests against AC1-AC4)

Tests at `tests/review-queue/concurrency.test.ts` covering:

- Two strategist invocations writing the same `request.md` concurrently: second writer sees `FileExistsError` on `os.link`, exits cleanly. (Same-SHA = idempotent; different-SHA = error per AC2.)
- Two reviewer invocations writing the same `codex.md` concurrently: `os.link` is atomic; first writer wins via successful link, second writer sees `FileExistsError`, drops its temp, exits.
- A reviewer crashes after writing `codex.md.<uuid>.tmp` but before `os.link`: the orphan `.tmp.<uuid>` file is cleaned up by combine.py on its next poll (≥ 30 min old).
- Two reviewers push to `origin/main` concurrently: `push-with-retry.sh` (`git pull --rebase + retry once`) resolves the race; if both attempts fail, the helper writes a `PUSH-RACE-FALLBACK` line to `raw/internal/queue-errors.md` (NOT the journal — per R2 patch Cursor M3 option b) and the unpushed commit waits for the next loop tick.
- Strategist `combined.md` push and `patch + next-request` push use the same `push-with-retry.sh` helper (R2 patch — Cursor M2 uniformity).
- **Same-SHA idempotency assertion (R2 patch — Codex L5):** `request.py` race-loser test asserts the `FileExistsError` path reads the existing `request.md` and EXPLICITLY confirms same-SHA before exit 0 (NOT just `FileExistsError → exit 0` blindly).
- Watcher polling: combine.py running on a `/loop 10m` cadence detects "round complete" within one poll interval (deterministically — both response files exist on `origin/main`).
- Missing-reviewer timeout: if only one response exists after `MISSING_REVIEWER_TIMEOUT_HOURS` (default 2), combine.py writes `combined.md` with `combined_verdict: single_reviewer_timeout` and `escalated_to_founder: true`.

## AC6 — Two-part dogfooding (R1 patch — Codex M5 split into builder-completable + post-merge)

**AC6a — Synthetic end-to-end test (builder-completable as part of this item).**

`tests/review-queue/e2e.test.ts` runs a scripted simulation of a full R1→R2 cycle, including **one failure-mode integration test inline** (R2 patch — Cursor M4 option a; orphan-tmp-cleanup interaction with combine.py is an integration concern, not purely unit-testable):

1. Test harness creates a fake spec file in `backlog/ready/` with a known SHA.
2. Test harness runs `request.py` to create `r1/request.md`.
3. Test harness writes synthetic `codex.md` and `cursor.md` response files via the AC3 atomic-link path (NOT via real AI — fixture content).
4. **(R2 patch — failure-mode injection):** Test harness drops a stale `codex.md.<uuid>.tmp` with mtime set 31 min in the past, AND a fresh `cursor.md.<uuid>.tmp` with mtime 1 min in the past, into the same `r1/` directory. These simulate a crashed reviewer (stale temp left orphaned) and a reviewer that's still writing (fresh temp in-flight).
5. Test harness runs `combine.py`; asserts:
   - The stale `codex.md.<uuid>.tmp` is cleaned up.
   - The fresh `cursor.md.<uuid>.tmp` is left alone.
   - `combined.md` is produced correctly with the expected convergent/divergent split and verdict roll-up.
6. Test harness updates the fake spec (new SHA), runs `request.py` for `r2/`, writes two more synthetic reviews with `proceed` verdicts.
7. Test harness runs `combine.py` again; asserts `combined.md` shows `combined_verdict: proceed` and `next_round: null`.
8. Assert: directory has no orphan `.tmp.*` files (the stale one was cleaned in step 5; fresh one was cleaned by ITS reviewer's later success); round numbering is monotonic; no founder messages were synthesized in the harness (proves the queue is dispatch-message-free under the synthetic case).
9. **(R2 patch — Codex L5):** Run `request.py r1` a second time with the SAME spec SHA; assert exit 0 (same-SHA idempotency confirmed by reading the existing file, NOT by treating `FileExistsError` as success blindly). Then update the spec SHA, run `request.py r1` a third time; assert exit non-zero with the "different SHA — bump round number" error.

Other failure modes (push race, SHA drift, missing reviewer) are covered at unit level by AC5's `concurrency.test.ts`. AC6a's e2e test covers the orphan-tmp-cleanup × combine.py interaction inline (per the integration boundary R2 patch closed); the boundary is explicit per R2 patch Cursor M4.

**AC6b — Post-merge real-use validation (follow-up; NOT a 039 blocker).**

Filed as a separate post-merge item after 039 lands: the strategist authors the **next item that would have gone through ≥1 cross-tool spec-review round** (Cursor L2 — not just "next item"; many backlog items are bugfix/doc that skip review). Runs `request.py` to create r1/request.md. Founder has pre-configured all three polling primitives per AC0 (Claude Code `/loop 10m /review-queue-watch` for the strategist watcher per AC3.5; reviewer-client loops for Codex + Cursor). Reviewers poll, read at request SHA, respond. **Strategist `/loop /review-queue-watch` tick** runs `combine.py`, autonomously dispositions findings (AC3.5 step 3 case b/c — see AC3.5 for the full tick body), patches spec, commits patch, runs `request.py` for r2/. Repeats until AC3.5 step 3 case (a) or (c) fires (convergence declared with `next_round: null`). Item is then claimable by an agent. (R3 patch — Cursor R3 L2: narrative now cites `/review-queue-watch` + AC3.5 explicitly so post-merge dogfooding instructions match the shipped protocol, not the older "combine.py + manual disposition" reading.)

**AC6b success criteria (measured post-merge):**

- **Session bootstrap is out of scope for the counted interval (R3 patch — Cursor R3 L4):** the one-time founder action of pasting the Cursor self-loop prompt at session start, running `/loop 10m ...` once in each Claude Code session, and configuring the `cron`/`launchd` Codex schedule is **not counted as a dispatch message** — it's session setup, analogous to opening the IDE. The counted interval starts at `r1/request.md` land (the strategist writing the first request) and ends at `combined.md` declaring `next_round: null`. **Pasting a self-loop prompt once per Cursor session is one-time setup, not a per-round dispatch.**
- Founder messages during the counted interval: **0 dispatch messages**, ≤ 2 judgment messages (for substantive divergence per §"Out of Scope" #7).
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

- **Reviewer prompt size discipline:** The reviewer loop runs every 10 min, so the prompt must not consume the reviewer's context budget. Keep each tick's prompt scoped to one review and one artifact; no chained reasoning across ticks. If a reviewer needs more context, they pull it via ECHO at review time, OR the strategist pastes the prior atom verbatim into `request.md`'s `# What to review` body section.

- **`focus_hints` discipline:** Strategist can use the optional `focus_hints` field in `request.md` to direct reviewer attention, but this is a courtesy, not a constraint. Reviewers must still read the full artifact — `focus_hints` is for "after you've read the whole thing, pay extra attention to X."

- **Inline-embed discipline (R2 patch — Cursor L1; replaces RC2's `prior_round_atoms` field):** When the strategist needs reviewers to see a prior-round atom verbatim (e.g., a key strategist synthesis turn), paste the atom body directly into `request.md`'s `# What to review` body section. The §Review History block in the spec body itself serves the same purpose for findings tables across rounds — both R1 and R2 reviewers verified zero-ECHO-call behavior using §Review History as the canonical embed pattern. Keep individual embeds small (<2 KB) — large atoms still belong as ECHO references with the journal source pointer.

- **JOURNAL-AS-QUEUE PROHIBITION (R1 patch — promoted from §"Out of Scope" #2 to an Implementation Notes invariant; Cursor reviewer-note + Codex live-fire; R2 patch — Cursor M3 option b carve-out):** Reviewer prompts MUST NOT write to the dogfooding journal as part of the queue handshake. Journal entries reference the response file AFTER the response file is committed. The journal is the observation log; the queue is the message bus. Conflating them produces cross-reviewer journal-edit races (observed live during 039 R1: Codex's R1 reviewer turn was unable to commit its journal entry because Cursor had uncommitted journal edits on the same file at the same time — Codex correctly refused to resolve the race).

  **R2 patch — queue error logs go to `raw/internal/queue-errors.md`, NOT the journal.** The push-race-fallback log line (`tools/review-queue/push-with-retry.sh`), sha-drift retries (AC3 step 3), and orphan-tmp-cleanup warnings (AC4) all land in `raw/internal/queue-errors.md`. This file is structurally distinct from the journal:
    - **Purpose:** queue's emergency-failure-path observability. One purpose per file (matches the "no shared write surface" principle that the journal invariant exists to protect).
    - **Format (R3 patch — Codex R3 L3):** one-line append-only `${ts} ${CONTEXT}: ${detail}` entries. **`.md` extension (NOT `.log`)** — the project's `.gitignore` ignores `*.log`, which would leave the file local-only and break the "founder periodically scans" + "multiple writers append independently" claims. The `.md` extension matches the existing `raw/internal/` MD/HTML pairing convention and ensures the file is repo-visible by default. No markdown sections / frontmatter required; the file body is plain-text append-only lines.
    - **Read protocol:** strategist watcher (AC3.5 step 1) tails this on startup and surfaces unpushed work to founder; founder reviews periodically.
    - **Conflict-free:** since reviewer pushes and strategist pushes log independently with timestamps, multiple writers never need to coordinate.
    - **Repo-tracked from day one:** builder commits `raw/internal/queue-errors.md` with a single seed line documenting the file's purpose (e.g., `2026-05-12T00:00:00Z SEED: queue-errors.md — queue emergency-failure-path append-only log (R3 patch — Codex R3 L3)`). All subsequent appends go below the seed line.

- **Bootstrap moment (now complete):** This very spec (039) went through R1 cross-tool review using the *pre-queue* manual dispatch on 2026-05-11 23:35–23:50 PDT (Codex + Cursor R1 reviews journaled). Item 040+ uses the queue. The R1 cycle itself produced the convergent + load-bearing-singleton findings folded into this RC2 patch.

- **Reviewer-harness-agnostic property (R1 patch — Cursor reviewer note; positive):** The canonical `<reviewer>.md` shape means a future third reviewer (Gemini, a code-review specialist subagent, a second Claude Code worktree) can join the queue without protocol changes. Only the `reviewer:` enum in AC1 schema validation needs an extension. Real V2-readiness without paying V2 costs now.

- **Strategist-vs-strategist independence is NOT a queue concern (R1 patch — Cursor reviewer note):** The strategist who authors a spec, writes `request.md`, and runs `combine.py` is producer-side throughout. CLAUDE.md's reviewer-independence rule scopes independence to *builder-vs-reviewer*, not *strategist-vs-strategist*. The independence the queue preserves is Codex-vs-Cursor — keeping the two reviewer voices' findings independent.

- **No queue dependency on ECHO:** ECHO is used for *context recovery during review* (reading prior strategist turns when `focus_hints` references atoms not pasted into the request body), not for queue state. If ECHO is down, the queue still works — reviewers read the artifact directly via `git show`. **039 R1 fired this case live**: ECHO substring index lagged Cursor's R1 reviewer turn by ~5 min; the queue's filesystem source-of-truth was unaffected.

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

## R2 — 2026-05-12 00:05–00:32 PDT (cross-tool spec review on RC2 @ commit `556b978`)

**Reviewers:** Codex (response file `backlog/reviews/.../r2/codex.md` at commit `29794f4`; bootstrap-wrote at canonical queue path) + Cursor (response file `backlog/reviews/.../r2/cursor.md` at commit `2f27a27`; same).
**Verdicts:** Codex `proceed_after_patches` + Cursor `proceed_after_patches` → **combined_verdict: `proceed_after_patches`** (within `{proceed*}` boundary per AC4 roll-up table; no founder escalation).
**Round dispatched manually** (last manual dispatch — RC3 ships AC0 + AC3.5 making the queue self-operating from R3+).
**Live integration test of R1 M5 fix:** Cursor R2 H1 cited `§Implementation Notes "Strategist watcher" + §AC3 + §AC4` (three sections); Codex R2 findings concentrated on §AC0 + §AC4. Section-granularity match key (R1 M5 fix) correctly collapsed both reviewers' AC4 findings as convergent on AC4 + Codex's M3 itself flagged the need for the **normalized primary/related-section shape** that R2 patch then accepted. The match-key fix passed its live test while also producing the next iteration's improvement (R2 patch — Codex M3).

### Findings dispositioned (14 total: 2 HIGH / 7 MED / 5 LOW)

| # | Severity | Source | Where | Disposition | Section patched |
|---|---|---|---|---|---|
| 1 | HIGH | Cursor R2 H1 (load-bearing) | §Implementation Notes "Strategist watcher" + §AC3 + §AC4 — strategist /loop body not specced as an AC | accepted — added §AC3.5 mirroring AC3's structure for reviewers; `combine.py` "manually" rewritten to "strategist agent autonomously dispositions inside /loop tick" | NEW §AC3.5 |
| 2 | HIGH | Cursor R2 H2 (drift catch) | §AC0 step 4 — Cursor fallback keyboard-automation violates §Out of Scope #1 | accepted — DELETED keyboard-automation + detached-Cursor-process options; only paste-once-self-loop + explicit manual-paste degradation remain | §AC0 step 3-4 |
| 3 | MED | Codex R2 M1 | §AC0 step 2 — Codex CLI command shape not concrete (`codex --watch` doesn't exist) | accepted — concrete `codex exec -C ... --sandbox workspace-write --ask-for-approval never -` recipe via cron/launchd | §AC0 step 2 |
| 4 | MED | Cursor R2 M2 | §Architecture push-race + §AC3-5 + §AC4-3 — retry pattern asymmetric across 3 push types | accepted — shared `tools/review-queue/push-with-retry.sh` helper applied to reviewer responses, strategist combined.md, and strategist patch+next-request | §Architecture push-race, §AC3 step 5, §AC3.5 step 3, §AC4 step 3 |
| 5 | MED | Cursor R2 M3 | §Architecture push-race FALLBACK vs §Impl Notes JOURNAL-AS-QUEUE PROHIBITION tension | accepted — option (b): queue error logs go to `raw/internal/queue-errors.md` (NOT the journal); invariant preserved absolutely | §Architecture push-race, §Impl Notes JOURNAL-AS-QUEUE PROHIBITION carve-out |
| 6 | MED | Codex R2 M2 | §AC4 combine.py — "no rounds to combine" success path undefined | accepted — explicit "exit 0, no commit, status line for scheduler" step added | §AC4 step 4 |
| 7 | MED | Codex R2 M3 | §AC4 combine logic — section-granularity `where` matching under/over-collapse risk | accepted — normalized `primary_where_section` + `related_where_sections` shape; `cross_ref` is canonical override | §AC4 combine logic |
| 8 | MED | Cursor R2 M4 | §AC6a happy-path only — missing failure-mode integration test | accepted (option a) — added orphan-tmp-cleanup × combine.py interaction test inline as step 4-5 | §AC6a |
| 9 | MED | Cursor R2 M6 | §AC1 verdict-enum context-awareness — schema architecture undefined | accepted (option a) — three separate JSON Schemas (request/reviewer/combined); per-file enum scoping | §AC1 |
| 10 | LOW | Codex R2 L4 (cross-ref R1 H3) | §AC2 — request.py race-loser must read existing file + compare SHA before exit 0 | accepted — explicit same-SHA idempotency check after `FileExistsError` | §AC2 race-loser path |
| 11 | LOW | Cursor R2 L1 | §request.md `prior_round_atoms` — pointers don't fulfill inline-embed claim | accepted (option c) — DROPPED the field entirely; `# What to review` body section + §Review History are the canonical embed pattern | §request.md frontmatter, §Implementation Notes |
| 12 | LOW | Cursor R2 L2 | §AC4 verdict roll-up — asymmetric on codex/cursor column order | accepted — commutative note added | §AC4 verdict roll-up |
| 13 | LOW | Cursor R2 L3 | §AC4 verdict roll-up — `(missing) | (missing)` case unspecced | accepted — `no_responses` row + `escalated_to_founder: true` | §AC4 verdict roll-up, §AC1 combined.md enum |
| 14 | LOW | Cursor R2 L4 | §request.md `requested_reviewers` ⊆ `reviewer` enum validation | accepted — schema rule + request.py test | §AC1, §AC2 tests |

### Convergence call

**Convergence near; R3 should be polish-only.** Both R2 verdicts were `proceed_after_patches` and within the `{proceed*}` boundary. RC3 patch closed:
- The two HIGHs (strategist /loop body AC; keyboard-automation drift removal) — both load-bearing for AC6b measurability.
- All 7 MEDs, including the JOURNAL-AS-QUEUE PROHIBITION carve-out which preserves the R1 invariant absolutely (queue errors → `queue-errors.md`, not journal).
- All 5 LOWs, including the dropped `prior_round_atoms` field and the explicit same-SHA idempotency assertion in `request.py`.

**Suggested R3 focus_hints:**
1. Verify §AC3.5 watcher slash-command body is implementable end-to-end (strategist `/loop` tick: pull → combine.py → disposition → patch → next-request → exit). Especially: the "strategist agent autonomously dispositions findings" step — does it work as a `/loop` body in CC's harness?
2. Verify the §AC4 normalized `primary_where_section` + `related_where_sections` match key against R2's own findings (live integration test continues — R2 produced multi-section `where` values; R3 dispositions should land cleanly under the normalized shape).
3. Verify `raw/internal/queue-errors.md` is a real, non-journal file with no existing collision (and that the §Implementation Notes carve-out is unambiguous).
4. Drift watch: did RC3 reintroduce any of the surface area R1+R2 cut? (Cursor R2's drift watch found one item — keyboard automation — fixed in RC3; R3 should run the same check.)

If R3 verdicts are both `proceed` or `proceed_after_patches` with only LOW findings, **declare convergence and the spec is claim-ready**.

## R3 — 2026-05-12 00:43–01:03 PDT (cross-tool spec review on RC3 @ commit `e45a97b`)

**Reviewers:** Codex (response at `backlog/reviews/.../r3/codex.md`, commit `0a501ad`) + Cursor (response at `backlog/reviews/.../r3/cursor.md`, commit `2908f42`).
**Verdicts:** Codex `proceed_after_patches` (3 findings: 2 MED + 1 LOW) + Cursor `proceed_after_patches` (5 LOW only) → **combined_verdict: `proceed_after_patches`** (within `{proceed*}` boundary; no founder escalation).
**Round dispatched manually** — last manual dispatch before AC3.5 ships. Both reviewers pushed their response + journal commits to origin/main directly this round (R2's conservative "no-push-without-explicit-ask" stance relaxed once the canonical commit pattern was empirically established; per §"Out of Scope" #4 reviewer queue commits are operational, not founder-gated).

**Live integration test of R2 normalized-where-match-key fix:** R3 reviewers' findings exercise the new shape. Cursor R3 L1 + L2 + L4 + L5 are single-section `primary_where_section` findings; Codex R3 M1 + M2 + L3 also single-section. **None of R3's findings exercise the multi-section `related_where_sections` path**, so R3 cannot fully validate the parser's behavior on multi-section `where` strings. The R2 fixture (Cursor R2 H1's 3-section `where`) remains the canonical test case — Codex R3 M2 demands that fixture become a non-collapse-assertion in the AC4 test suite. Promoted into AC4 fixture-level guard.

**Live observation — Codex R3 M1 caught a bug in AC3.5 by reflecting on the process executing live:** RC3's R2→R3 transition is itself the counterexample for AC3.5's "all dispositions accepted → convergence declared" branch. Codex correctly identified that the watcher state machine missing the "patches applied → verification round needed (DEFAULT)" branch would have skipped R3 entirely, missing this very catch. The review-history-as-evolutionary-record property is now firing recursively: a finding caught by reading prior rounds proves that prior rounds were necessary. Promoted to load-bearing structural fix in RC4 AC3.5 step 3 (a)/(b)/(c) branches.

### Findings dispositioned (8 total: 2 MED / 6 LOW)

| # | Severity | Source | Where | Disposition | Section patched |
|---|---|---|---|---|---|
| 1 | MED | Codex R3 M1 (load-bearing — caught AC3.5 state-machine bug live) | §AC3.5 step 3 — convergence branch / `next_round` | accepted — split into (a) zero-patches → convergence, (b) patches applied → verification round (DEFAULT), (c) verification explicitly waived (rare); explicit note that accepted-without-follow-ups is orthogonal to needing verification | §AC3.5 step 3 |
| 2 | MED | Codex R3 M2 (cross-ref Codex R2 M3) | §AC4 combine logic `primary_where_section` / `related_where_sections` over-collapse risk | accepted — exact full-sub-anchor match only; `related_where_sections` observational-only (no convergence trigger); `cross_ref` is canonical override; R2 fixture (Cursor R2 H1 3-section vs Codex R2 M2/M3 single-section AC4) becomes a non-collapse-assertion in `combine.test.ts` | §AC4 combine logic |
| 3 | LOW | Codex R3 L3 | §Architecture push-race / §Impl Notes `raw/internal/queue-errors.log` | accepted — renamed `.log` → `.md` throughout spec (matches raw/internal/ MD/HTML pattern; avoids `*.log` gitignore); builder commits a seed line so the file is tracked from day one | §Architecture push-race, §Impl Notes, §reviewer.md frontmatter SHA-drift note |
| 4 | LOW | Cursor R3 L1 | §combined.md frontmatter comment | accepted — `escalated_to_founder: true` triggers list now includes `no_responses` alongside `{proceed*, pushback}` boundary and `single_reviewer_timeout` | §combined.md frontmatter |
| 5 | LOW | Cursor R3 L2 | §AC6b narrative cite `/review-queue-watch` + AC3.5 | accepted — AC6b body rewritten to cite `/review-queue-watch` and AC3.5 step 3 b/c branches (matches the shipped protocol, not the older "combine.py + manual disposition" reading) | §AC6b |
| 6 | LOW | Cursor R3 L3 | §AC3.5 step 4 "one round per tick" vs step 3 "for each fresh combined.md" | accepted (option a) — step 4 explicitly specifies `combine.py` processes at most one newly-eligible round per tick when driven from `/review-queue-watch`; `--all` flag noted as out-of-band batch option | §AC3.5 step 4 |
| 7 | LOW | Cursor R3 L4 | §AC6b — session bootstrap (AC0 setup) implicit in dispatch-message count | accepted — explicit AC6b clause: "session bootstrap is out of scope for the counted interval; counted interval starts at r1/request.md land" | §AC6b success criteria |
| 8 | LOW | Cursor R3 L5 | §Architecture push-race — journal pointer parenthetical | accepted — parenthetical "not a queue artifact; observation-only pointer outside the handshake" added next to journal pointer | §Architecture push-race |

### Convergence call

**Needs R4 — verification round per AC3.5 step 3 case (b) (the new default branch).** Both R3 verdicts were `proceed_after_patches`; both within `{proceed*}` boundary; no founder escalation. RC4 patch closed all 8 R3 findings inline (no deferred-to-followup items). Per Codex R3 M1's own fix: **accepted-inline ≠ convergence**; R4 verifies that RC4's structural changes (AC3.5 state-machine split + AC4 exact sub-anchor + queue-errors.md rename) land correctly.

**Suggested R4 focus_hints:**
1. **Verify AC3.5 step 3 (a)/(b)/(c) branch split** is mechanically correct and unambiguous. The (b) "DEFAULT for any spec change" wording must be plain enough that builders implementing the state machine don't accidentally collapse it back to "patches applied + no follow-ups → convergence" (the bug Codex R3 M1 caught).
2. **Verify AC4 exact-sub-anchor match + R2 fixture test is implementable.** Walk through the fixture: parser splits Cursor R2 H1's `where` into `primary: §Implementation Notes "Strategist watcher"` + `related: [§AC3, §AC4]`; Codex R2 M2's into `primary: §AC4 combine.py polling semantics` + `related: []`. These DO NOT match on exact sub-anchor; convergence requires `cross_ref` override.
3. **Verify `raw/internal/queue-errors.md` placeholder commit** is reasonable (a single seed line) AND doesn't accidentally trigger any other repo machinery (manifest, wiki index, blocked.py, etc.).
4. **Drift watch (RC4):** did RC4 reintroduce any prior-round cuts? Particularly: did the AC3.5 step 3 (b)-default reintroduce any path where "convergence declared without verification" can happen unintentionally?

**Convergence prediction:** R4 should be `proceed` or `proceed_after_patches` with only LOW findings on both sides. Per 038 decay curve (10→14→5), R3 already at 8 findings; R4 should drop further (target: ≤ 3 findings). **If both R4 verdicts are `proceed` OR both `proceed_after_patches` with only LOWs → declare convergence; 039 is claim-ready.**

## R4 — 2026-05-12 01:11–01:14 PDT (cross-tool spec review on RC4 @ commit `c364ac2`) — **CONVERGED**

**Reviewers:** Codex (response at `backlog/reviews/.../r4/codex.md`) + Cursor (response at `backlog/reviews/.../r4/cursor.md`).
**Verdicts:** Codex `proceed_after_patches` (2 findings: 2 LOW only) + **Cursor `proceed` (ZERO findings)** → **combined_verdict: `proceed_after_patches`** (within `{proceed*}` boundary; no founder escalation).
**Round dispatched manually** — last manual dispatch in the cycle.
**Termination path: AC3.5 step 3 (c) — explicit waiver.** Codex R4 reviewer notes explicitly waived the next verification round: *"If the strategist patches the two stale test-wording spots above, I would expect a final converge/claim call rather than another substantive review round."* Both patches are mechanical test-wording (one AC4 test bullet reworded; one AC4 fixture added for the AC3.5 (b) branch). Cursor R4 zero findings + Codex R4 explicit waiver + both verdicts within `{proceed*}` = convergence triggered. `next_round: null`.

### Findings dispositioned (2 total: 0 HIGH / 0 MED / 2 LOW)

| # | Severity | Source | Where | Disposition | Section patched |
|---|---|---|---|---|---|
| 1 | LOW | Codex R4 L1 | §AC4 test list — missing fixture for AC3.5 (b) state-machine branch | accepted — added three explicit AC3.5 state-machine fixtures (a)/(b)/(c) to AC4 test list; (b) is the falsifiable load-bearing case from Codex R3 M1 | §AC4 test list |
| 2 | LOW | Codex R4 L2 (cross-ref Codex R3 M2) | §AC4 test bullet "all findings `where`-convergent (primary or related section overlap)" — stale wording from RC3 | accepted — reworded to "exact-primary-convergent OR explicitly cross-referenced"; cites R2 fixture as canonical non-convergence assertion | §AC4 test list |

### Convergence call

**CONVERGED. 039 is claim-ready.**

- Both R4 verdicts within `{proceed*}` boundary (Cursor `proceed`, Codex `proceed_after_patches`).
- Codex's 2 LOWs are mechanical test-wording polish — applied inline in RC5.
- Codex R4 explicitly waived the next verification round.
- Cursor R4's zero findings + drift-watch-clean signals structural stability.
- AC3.5 step 3 (c) "explicit waiver" path correctly fires here: patches are mechanical, both reviewers signal claim-ready.

**4-round decay curve:** R1 (18 findings: 5 HIGH-conv + 3 HIGH-singleton + 7 MED + 3 LOW) → R2 (14: 2 HIGH + 7 MED + 5 LOW) → R3 (8: 2 MED + 6 LOW) → R4 (2 LOW). Total 42 findings dispositioned across 4 rounds; zero residual HIGH/MED at convergence; only 2 LOW polish patches at the final round.

**Builder claim instructions:** any agent may now atomically claim this item from `backlog/ready/` → `backlog/claimed/`. Suggested builder: any agent (pure protocol + helper scripts + slash-command prompts; no app-specific knowledge needed). The strategist (Claude Code) is acceptable since the queue's producer-side work is what they do, but reviewer-independence preservation is preserved structurally regardless (Codex + Cursor remain separate reviewer voices at runtime).

**Bootstrap completed:** This very spec went through R1→R4 cross-tool review using the *pre-queue* manual dispatch (last manual cycle per "Bootstrap moment" §Implementation Notes). Item 040+ uses the queue once built. The R1→R4 cycle itself produced the empirical evidence base in §Context bullets 1-3.
