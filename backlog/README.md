# Backlog System

Kanban-style work coordination across strategic conversations, one or more autonomous build agents, and founder review.

> **Current operating gate (2026-07-12):** G2 is lifted. Product work resumes through `proposed -> ready -> claimed`; `proposed/` remains review-only and is never selectable by `tools/blocked.py`. A merge does not advance product maturity or authorize an artifact release. See `CLAUDE.md` "Current Commercial Focus" and `AGENTS.md` "Current operating gate" for the full rule.

## The Three Roles

1. **Strategist (chat conversations)** — produces design decisions, captures specs as `backlog/proposed/` items. Does **not** write to `wiki/` until an item is shipped. **May also review and prep merges** for items in `pending_review/` — see the Reviewer Independence Rule below.
2. **Builder agent (autonomous, parallelizable)** — claims items from `backlog/ready/`, works in an isolated git worktree, moves items through the pipeline. Multiple agents may run in parallel. **Never reviews or merges its own work** (and never merges any work — see `docs/AGENT_INSTRUCTIONS.md`).
3. **Founder** — by default, gives final approval at the two irreversible repository-merge moments: (a) substantive conflict-resolution sign-off, (b) `git push origin main`. A Team-product artifact release has a separate checksum-bound approval under `raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md`; main-push approval never counts as release approval. The founder also handles end-to-end review + merge directly when no strategist or independent reviewer is available, and asks the strategist to update the wiki post-shipment. A locked program-specific decision may substitute a named approval holder without weakening any gate.

### Reviewer Independence Rule

The reviewer-and-merger of any item must be **a different role/agent than the builder**. Acceptable reviewers, in preference order:

1. **Strategist** — full design context; usually the right reviewer for items they specced.
2. **A second builder agent** (not the builder of this item) — independent eyes, no design conflict-of-interest.
3. **Founder** — fallback, or whenever founder wants direct review.

Whoever reviews handles the cognitive work end-to-end (read diff against acceptance, prep `review_notes`, draft any reconciliation diff for conflicts), but **never skips the two authority checkpoints**: substantive conflict resolution and the actual `git push origin main`. The founder supplies them by default; a locked scoped delegation may supply a canonical authorization instead. Self-review is structurally weaker than independent review — the agent that drifted into wrong scope can't see its own drift.

### Echo-context persistent-coordinator delegation

Only the program named in `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md`, as reconciled by `raw/internal/decisions/2026-07-17-echo-context-137-two-pass-scope-reset.md`, may substitute the persistent Codex coordinator for a new human-founder response. It covers items 136, 137a, 137b, 138 and exactly two successors replacing 139; the suffixed siblings jointly replace the original 137 step without consuming successor slots. It keeps one covered item active, requires a fresh implementation builder and a different reviewer for each item, and requires committed/read-back exact-operation authorization before irreversible action. Builders still stop and hand off after one item or any uncertainty. Failed evidence is repaired and rerun, never waived. Every ordinary item retains the default founder checkpoints.

## Wiki Update Discipline

The product wiki (`wiki/`) reflects only **shipped reality**. The flow is:

```
[strategic conversation]
        │
        ▼
spec lives inside backlog item   ← single source of truth while in flight
        │
        ▼
agent ships item, item lands in backlog/complete/
        │
        ▼
strategist promotes the now-true decision to wiki/
        │  (sources/, concepts/, entities/, analyses/ as appropriate)
        ▼
backlog item links to its wiki page; wiki page links back to the item
```

This makes spec/build divergence structurally impossible — the wiki cannot claim something that hasn't shipped, because no one writes to the wiki until after merge.

**Exception:** *operating-model* changes (this file, `CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, the slash command) are not product decisions and do not pass through the backlog. They are updated immediately when the operating model changes.

## Folder Structure

```
backlog/
├── README.md            (this file)
├── _followups.md        # flat post-merge followup queue (see "Followup Queue")
├── proposed/            # spec draft in spec-review; reviewable, never claimable
├── ready/               # claimable; sealed by ready_content_sha
├── claimed/             # agent has atomically claimed; in-progress
├── pending_review/      # agent done; awaits independent review + authorized merge
├── complete/            # independently reviewed + authorized + merged; wiki update pending
├── inbox/               # PARKED, non-kanban (see "Non-Kanban State" below)
├── reviews/             # cross-vendor review-queue rounds (non-kanban)
├── task-state/          # role-typed working-memory pointers (non-kanban)
└── archive/             # archived full spec bodies + stubs (see archive/README.md)
```

The **five stage directories** (`proposed/`, `ready/`, `claimed/`,
`pending_review/`, `complete/`) are the kanban pipeline; `tools/blocked.py`
and the claim flow see only those. `README.md` and `_followups.md` are
documentation and the followup queue. The last four directories are
supporting state documented in "Non-Kanban State" below — real, load-bearing
directories that were previously undocumented here.

## Item Lifecycle

```
raw idea     ← ECHO session context only; no backlog artifact
     │
     ▼
proposed/    ← written spec draft; review queue can open rounds here
     │          watcher promotes on convergence by stamping ready_content_sha
     ▼
ready/       ← claimable only; agents poll this folder
     │
     ▼ (atomic claim: see below)
claimed/     ← agent owns it; works in its own worktree on agent/<slug> branch
     │
     ▼
pending_review/  ← agent done; independent reviewer checks diff/tests/notes
     │
     ├── authorized merge → complete/  ← strategist promotes decisions to wiki/ next
     └── rejected → proposed/ if the spec needs review again, or ready/ only with a fresh ready_content_sha
```

## Non-Kanban State

Four directories live alongside the pipeline but are **not** stages. Nothing in
them is claimable, and `tools/blocked.py` ignores them by design.

### `inbox/` — parked specs (manual promotion gate)

A spec gated on a **non-item condition** (something `blocked_by:` cannot
express — e.g. "AC8 fired", "post-demo window opens") is parked here instead of
`ready/`. Properties:

- **Invisible to selection.** `blocked.py` and the claim flow never look here;
  parking is not a way around spec review or the current operating gate.
- **Manual promotion.** When the gate fires, a human `git mv`s the file to
  `ready/` (via normal review if content is stale) — there is no automation.
- **Indexed.** `docs/BACKLOG.md` renders an "Inbox (parked)" section so parked
  specs cannot rot unseen. The directory may be absent from disk when empty
  (git does not track empty dirs); that is normal.

### `reviews/` — cross-vendor review-queue rounds

`reviews/<item-id>/rN/` holds one review round: `request.md` (written by
`tools/review-queue/request.py`) plus one response file per reviewer
(`claude.md`, `codex.md`, `codex-ops.md`, `cursor.md`). This is the on-disk
substrate of the review-queue skills (`review-queue-*`, `review-queue-watch`);
see those skills for the protocol. Rounds are append-only history — closed
rounds are never edited, and reviewers always review at the round's pinned
`spec_commit_sha`, not at HEAD.

### `task-state/` — role-typed working-memory pointers

`task-state/<task-id>/<role>.md` holds the compact cold-start snapshots defined
in `skills/role-typed-task-state.md` (strategist/builder/watcher/dispatcher).
**Reviewer ticks must not read or write these** — fresh-eyes-at-SHA is
preserved deliberately. Lint with `python3 tools/task-state/lint.py <path>`.
Pointers for long-completed items are archive candidates (see the clarity
sprint's reorg inventory); until archived, prefer the item's `complete/` spec
over a stale pointer.

### `archive/` — compacted shipped history

Wiki-promoted `complete/` items are reduced to stubs in place; the full spec
body moves to `archive/shipped/<YYYY-MM>/<item-id>.md`. Schema and rules:
[`archive/README.md`](./archive/README.md). Today `archive/` holds only
`shipped/`; archiving closed review rounds or dead task-state pointers here is
inventoried reorg work (WS7), not yet practice.

## Atomic Claim (Multi-Agent Safe)

Two agents must never end up working the same item. The claim is **a single commit on `main`** that simultaneously:

1. Moves the file: `git mv backlog/ready/<item>.md backlog/claimed/<item>.md`
2. Sets frontmatter: `claimed_by: <agent-id>`, `claimed_at: <iso-timestamp>`, `branch: agent/<slug>`
3. Commits with message `claim: <item-id>`
4. Pushes to `origin/main`

If two agents race, one push is rejected. Loser pulls, picks the next ready item, retries. Window is small enough for solo founder + 2–3 agents that no extra locking is needed.

## Worktree Pattern

Each claimed item gets its own git worktree on its own feature branch. This keeps multiple agents from stepping on each other's working directories.

```
~/Desktop/Project_echo/                            ← main repo, on main, owned by founder
~/Desktop/Project_echo--<item-slug>/               ← agent worktree, on agent/<slug>
```

**Conventions:**

- **Worktree path:** `~/Desktop/Project_echo--<item-slug>/` (sibling of main repo; double-dash disambiguates)
- **Branch name:** `agent/<item-slug>` (e.g., `agent/2026-04-30-001-capture-gate`)
- **Lifecycle commands** (agent runs these; the slash command wraps them):

```bash
# 1. Atomic claim (in main repo on main)
cd ~/Desktop/Project_echo
git pull --rebase
git mv backlog/ready/<item>.md backlog/claimed/<item>.md
# (edit frontmatter: claimed_by, claimed_at, branch)
git add backlog/claimed/<item>.md
git commit -m "claim: <item-id>"
git push origin main

# 2. Create worktree on a fresh feature branch
git worktree add ~/Desktop/Project_echo--<slug> -b agent/<slug>

# 3. Implement (in worktree, on feature branch)
cd ~/Desktop/Project_echo--<slug>
# ... implementation, tests, commits ...
git push -u origin agent/<slug>

# 4. Move item to pending_review (back in main repo on main)
cd ~/Desktop/Project_echo
git pull --rebase
git mv backlog/claimed/<item>.md backlog/pending_review/<item>.md
# (edit frontmatter: agent_notes summary, head_sha, pr_url if any)
git add backlog/pending_review/<item>.md
git commit -m "review: <item-id>"
git push origin main
```

**Two-directory pattern:** the agent does *backlog state changes* in the main repo on `main` (so all agents share consistent backlog state) and *code work* inside the worktree on the feature branch (so working directories never collide). The slash command handles this directory switching.

## Idempotency Guarantees (At-Least-Once + Safe Retry)

The system is designed so a crashed run, a re-run, or a network glitch mid-push converges to one coherent state — not corruption. The goal is **at-least-once execution with safe retries**, not exactly-once (which is impossible when an agent can crash between push and acknowledgement).

### What we guarantee strongly

- **At-most-one claim per item.** The atomic claim commit + push-rejection-on-race makes it impossible for two agents to both end up owning the same item.
- **Single source of truth for an item's stage.** Git enforces that the file lives in exactly one of `proposed/`, `ready/`, `claimed/`, `pending_review/`, `complete/` at any time.

### What the agent loop must do to make the rest safe

Every agent run starts with **reconciliation**, not a fresh claim:

```bash
# Persona-based agent identity — stable across crashes, unique per machine/user
AGENT_ID_FILE="$HOME/.echo/agent-id"
if [ -z "${ECHO_AGENT_ID:-}" ] && [ ! -f "$AGENT_ID_FILE" ]; then
  mkdir -p "$(dirname "$AGENT_ID_FILE")"
  uuidgen > "$AGENT_ID_FILE"
fi
AGENT_ID="${ECHO_AGENT_ID:-$(cat "$AGENT_ID_FILE")}"

cd ~/Desktop/Project_echo
git pull --rebase origin main

# Look for any unfinished claim by this agent
EXISTING=$(grep -l "^claimed_by: \"$AGENT_ID\"" backlog/claimed/*.md 2>/dev/null | head -1)

if [ -n "$EXISTING" ]; then
  echo "Resuming previous claim: $EXISTING"
  # skip the claim step; jump to worktree-reuse
else
  # normal claim flow
fi
```

This turns a crashed run from "permanent orphan in `claimed/`" into "resumed automatically on next invocation."

**Worktree creation must be detect-and-reuse**, not unconditional:

```bash
if [ -d "$WORKTREE" ]; then
  cd "$WORKTREE" && git checkout "agent/$SLUG"
elif git show-ref --verify --quiet "refs/heads/agent/$SLUG"; then
  git worktree add "$WORKTREE" "agent/$SLUG"
elif git ls-remote --exit-code origin "agent/$SLUG" >/dev/null 2>&1; then
  git fetch origin "agent/$SLUG:agent/$SLUG"
  git worktree add "$WORKTREE" "agent/$SLUG"
else
  git worktree add "$WORKTREE" -b "agent/$SLUG"
fi
```

**Stage moves must be upserts**, not assumed-from-stage moves:

```bash
ensure_stage() {
  local item="$1" target="$2"
  local current
  current=$(ls backlog/*/"$item" 2>/dev/null | head -1)
  [ -z "$current" ] && { echo "ERROR: $item not found"; return 1; }
  [ "$current" = "backlog/$target/$item" ] && return 0   # already there — no-op
  git mv "$current" "backlog/$target/$item"
}
```

This makes "move to `pending_review/`" safe to call when the file is already there from a previous attempt.

**Run logs append on re-run.** If `raw/internal/agent-runs/<spec-date>-<item-id>-<slug>.md` already exists from a prior partial attempt, the agent appends a `## Run N (resumed at <iso-timestamp>)` section rather than overwriting. The log becomes a complete history of every attempt — better forensics, no data loss.

**Run-log filename convention** (locked 2026-05-09): `raw/internal/agent-runs/<spec-date>-<item-id>-<slug>.md`. The `<spec-date>` is the date in the item's filename (e.g., `2026-05-08` for `2026-05-08-022-…`), NOT the date the agent ran. Earlier runs (April–early May) used a doubled prefix `<run-date>-<spec-date>-<item-id>-<slug>.md` because the slash command defaulted to `$(date +%Y-%m-%d)`; those legacy filenames stay as-is — they're referenced from `backlog/complete/` items (immutable shipped history). New runs use the single-date convention.

### Agent persona convention

`claimed_by` identifies a long-lived agent identity (an installation), not a single invocation:

- Default: a UUID at `~/.echo/agent-id`, generated on first run, stable forever (unique per machine)
- Override via `ECHO_AGENT_ID` env var when running multiple agents on the same machine
- Two simultaneous agents must use distinct personas (otherwise reconciliation can mis-resume)

The atomic claim still saves us if two agents accidentally share a persona — the second push is rejected. The persona is just the resumption signal.

### Stale-claim detection (founder, manual for now)

A claim more than ~6 hours old with no progress is probably abandoned (agent crashed and is not coming back). Founder check:

```bash
for f in backlog/claimed/*.md; do
  ts=$(grep '^claimed_at:' "$f" | cut -d'"' -f2)
  age=$(( $(date +%s) - $(date -d "$ts" +%s) ))
  [ "$age" -gt 21600 ] && echo "STALE: $f (claimed $ts, ${age}s ago)"
done
```

To release a stale claim manually:

```bash
git mv backlog/claimed/<item>.md backlog/ready/<item>.md
# clear claimed_by, claimed_at, branch in frontmatter
git worktree remove ~/Desktop/Project_echo--<slug> 2>/dev/null
git branch -D agent/<slug> 2>/dev/null
git push origin --delete agent/<slug> 2>/dev/null
git commit -am "release: <item-id>"
git push origin main
```

A `tools/check-stale-claims.sh` and a `/release-stuck` slash command will land once we've actually run the loop a few times and seen what real failures look like. Lease/heartbeat auto-recovery is V1.5+.

**Cleanup (founder or named delegated coordinator, after merge):**

```bash
cd ~/Desktop/Project_echo
git worktree remove ~/Desktop/Project_echo--<slug>
git branch -d agent/<slug>
git push origin --delete agent/<slug>
git mv backlog/pending_review/<item>.md backlog/complete/<item>.md
git commit -m "complete: <item-id>"
```

A `tools/cleanup-worktrees.sh` script can automate the last block once we have it.

## Item File Format

Each item is one markdown file with frontmatter that's both human-readable and machine-actionable:

```markdown
---
id: 2026-04-30-001-capture-gate
title: Capture gate (sandbox chokepoint)
status: ready                     # informational only; folder location is authoritative
priority: HIGH                    # HIGH | MED | LOW
estimate: 0.5d
created: 2026-04-30
spec_refs:                        # files to read before working (in addition to the four mandatory reads)
  - (other backlog items, raw decision notes, or wiki pages that already exist)
blocked_by: []                    # other item IDs that must be in backlog/complete/ before this can be claimed
task_state_ref: ""                # optional (046+). When set, names the task-state pointer directory
                                  # under backlog/task-state/<task-id>/ — the role-typed working-memory
                                  # snapshot strategist/builder/watcher/dispatcher actors read on cold
                                  # start. Reviewer ticks MUST NOT read this; see skills/role-typed-task-state.md.
requested_reviewers: []           # optional reviewer roster for spec-review rounds
ready_content_sha: <sha256>       # watcher/authorized-coordinator seal required in ready/; proves the
                                  # file still matches the content promoted into claimable state.
                                  # Omit in proposed/; watcher stamps it during promotion.
acceptance:                       # specific, testable criteria
  - All capture data flows through one chokepoint function
  - Non-allowlisted sources rejected; rejections are logged
  - Tests cover accept + reject + malformed input
files_to_modify:                  # exhaustive list of code paths the agent may touch
  - src/capture/sources.ts
  - src/capture/gate.ts
  - tests/capture/*

# --- agent-managed fields (filled in during run) ---
claimed_by: ""                    # agent identifier
claimed_at: ""                    # ISO timestamp
branch: ""                        # agent/<slug>
worktree: ""                      # ~/Desktop/Project_echo--<slug>
head_sha: ""                      # sha of last commit on branch
pr_url: ""                        # if PR opened
agent_notes: ""                   # summary on completion or escalation
review_notes: ""                  # independent reviewer/authorized merger fills
# --- optional external-target fields; agent-managed only under a founder-authorized successor-repository decision ---
target_repo: ""                    # absolute canonical target repository path
target_remote: ""                  # canonical target remote URL
target_branch: ""                  # target feature branch, never target main
target_worktree: ""                # isolated sibling target worktree
target_head_sha: ""                # reviewed full target feature-head SHA
target_pr_url: ""                  # target-repository PR
target_landed_sha: ""              # authorized merger records canonical target-main SHA after readback
project_landed_sha: ""             # authorized merger records Project_echo main SHA after readback
---

# [Title]

## What
[One-paragraph spec — this IS the canonical spec until the item ships.]

## Why
[Reference relevant raw decision notes or already-shipped wiki pages.]

## Acceptance Criteria
- [ ] [specific, testable]
- [ ] [specific, testable]

## Out of Scope (Don't Drift)
[Adjacent things the agent might be tempted to add — explicitly NOT in this item.]

## After Completion (Strategist Notes)
[Which wiki pages should be created or updated once this item is in complete/.
The strategist reads this section when promoting decisions to the wiki.]
```

> **`status:` is historical, not maintained.** Folder location is the single
> source of truth for an item's pipeline stage; nothing in the agent lifecycle
> updates the `status:` field after creation, so archived items routinely carry
> stale values (`ready`, `proposed`, …) — that is expected, not corruption. Do
> not bulk-normalize it and do not build tooling that trusts it
> (`tools/blocked.py` deliberately skips validating it; see the comment there).
> Exception: agent-managed pointer fields ARE load-bearing — `head_sha` must be
> the full 40-char `git rev-parse` output (reviewer ground-truth checks are
> byte-for-byte).

## Agent Operating Rules

### Founder-authorized or scoped-delegated successor repository items

The normal backlog item owns one Project_echo branch/worktree and may not write elsewhere. A narrow exception exists only when a locked `raw/internal/decisions` record names the item and exact external scope, the spec cites that record and lists the paths, and each target-main or external-execute checkpoint receives founder approval or a valid program-specific delegated authorization.

Such an item still has one Project_echo claim. External source work uses an isolated target feature worktree and the optional fields above. Builders fill `target_repo`, `target_remote`, `target_branch`, `target_worktree`, `target_head_sha`, and `target_pr_url`. A different agent reviews both exact repository heads; the founder or named delegated coordinator merges the target repository first and fills `target_landed_sha` only after remote-main readback; the normal Project_echo review/merge then fills `project_landed_sha` after its own readback. Partial landings remain durable and the item stays incomplete; never force-rewrite history to simulate atomicity. Build-once artifacts consume canonical landed SHAs, never feature-worktree bytes. Live user-path mutation belongs only to explicitly named, checkpointed scope; source/rehearsal items may not infer it.

The current scoped protocol is `raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md`. Its persistent-coordinator authority is defined by `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md` and the `2026-07-17` two-pass reconciliation for items 136, 137a, 137b, 138 and exactly two successor items replacing 139. It does not generalize to echo-brain, echo-loop, unrelated future repositories, or any other backlog item.

When an agent runs, it must:

1. **Read mandatory global context** — every run, in order:
   - `docs/AGENT_INSTRUCTIONS.md` — operating manual
   - `docs/NORTH_STAR.md` — daily orient + drift questions
   - `wiki/principles/drift-prevention.md` — canonical drift doctrine
   - `wiki/product/v1-spec.md` — locked V1 spec

   The entire `wiki/` folder is the agent's global context — readable on demand. The item's `spec_refs` is *additional* per-item context, not a substitute.
2. **Pull latest `main`** in the main repo
3. **Reconcile** — check `backlog/claimed/` for an existing claim by this persona; resume it if found
4. **Select** — run `python3 tools/blocked.py` to get the next claimable item path
   - Exit 0: stdout has the path of the next unblocked, highest-priority, oldest item
   - Exit 1: no unblocked work; stop cleanly
   - Exit 2: validation failed (dangling `blocked_by`, cycle, malformed frontmatter, duplicate id, bad priority, id/filename mismatch); stop and surface the error
   - **Do NOT filter manually.** The script is the deterministic enforcement of dependency and ready-stage integrity gates; the agent's job is to call it, not to re-implement the rule. `proposed/` items are reviewable but never claimable. A `ready/` item is claimable only when every `blocked_by` dependency is in `complete/` and `ready_content_sha` is present and fresh. See `tools/blocked.py` for the selection logic and `tools/test_blocked.py` for the regression surface.
4. **Create-or-reuse the worktree** on `agent/<slug>` (idempotent — see Idempotency Guarantees)
5. **Read all `spec_refs`** in the item before writing any code
6. **Implement to acceptance criteria only** — no scope expansion (per drift rules)
7. **Log work** in `raw/internal/agent-runs/<date>-<item-id>.md` (append on resume, do not overwrite)
8. **If uncertainty arises** that requires an authority decision — STOP, move item to `pending_review/` with the question in `agent_notes`. Do not guess. The founder resolves ordinary items; the persistent coordinator resolves covered echo-context items.
9. **When acceptance criteria pass** — push branch, `ensure_stage` to `pending_review/`, fill `agent_notes` with summary
10. **One item per run** when invoked via `/process-backlog`. The `/process-backlog-batch` command wraps the same workflow in a controlled loop and ships multiple items sequentially within one session, halting on max-items, time budget, escalation, no-candidates, or git error. Parallelism across agents is achieved by running multiple sessions with distinct `ECHO_AGENT_ID` — the atomic-claim mechanic prevents collisions.

## Review Process

Per the Reviewer Independence Rule, the reviewer is the strategist, a second builder agent, or the founder — never the builder that wrote the code.

For each item in `pending_review/`:

1. Open `docs/BACKLOG.md` — see all items in `pending_review/`.
2. Read the item file (acceptance + `agent_notes`), the agent run log, the feature-branch diff, and run tests locally.
3. Decide:
   - **Approve** → fill `review_notes`, merge `agent/<slug>` to `main`, move item to `complete/`, remove worktree, delete branch.
   - **Rework** → fill `review_notes` with what's wrong, move back to `proposed/` if spec-review must run again, or to `ready/` only if it remains immediately claimable with a fresh `ready_content_sha` (worktree + branch can stay or be torn down).
   - **Cancel** → move to `complete/` with `review_notes: "cancelled — <reason>"`.
4. **Authority checkpoints (never skipped, regardless of reviewer):**
   - Any **substantive conflict** in step 3's merge must be surfaced for founder resolution, or resolved by the persistent coordinator under the named echo-context delegation and independently reviewed if the resolution changes implementation bytes.
   - The actual **`git push origin main`** is gated on founder green-light per push, or on the covered program's canonical delegated authorization.
5. After items land in `complete/`, **request a wiki update** from the next strategist conversation. The strategist reads each item's "After Completion (Strategist Notes)" section and promotes the now-shipped decisions to `wiki/`.

Time budget: ~30 minutes/morning if 2–3 items came through overnight, less when the strategist or a second agent has already prepped review notes and reconciliation diffs.

## Drift Prevention in This System

The agent is more dangerous than the founder for drift, because it doesn't have the founder's gut. Three safeguards:

1. **Explicit "Out of Scope" section** in every item — names the adjacent things the agent might be tempted to add
2. **Required `spec_refs` reading** before any code is written
3. **Sandbox is enforced in code, not policy** (capture gate pattern; see the first sandbox item)

If the agent finds itself wanting to do something not in acceptance criteria: STOP, log the temptation in `raw/internal/decisions/` as a `drift-event`, leave the item in `claimed/` with a question in `agent_notes` and move it to `pending_review/`.

The `ready_content_sha` frontmatter field is not builder-managed. The watcher stamps it when spec-review promotes `proposed/` to `ready/`; the founder may also explicitly stamp current content when manually promoting. Builders must not self-certify claimability.

## Item Priority Conventions

- **HIGH** — on V1 critical path; week-by-week sequencing depends on it
- **MED** — parallel work that compounds (validation, extension, polish)
- **LOW** — nice-to-have; deferrable past V1

## Naming Convention

Filename: `YYYY-MM-DD-NNN-short-slug.md`

- Date prefix groups items by creation day
- NNN is a sequential ID per day
- Slug is human-readable and is reused for branch + worktree names

## When the Strategist (Chat) Adds Items

After any strategic conversation that lands an actionable decision:

1. **Create a `backlog/proposed/<id>.md` item** — full spec lives here until spec-review promotes it to `ready/`
2. **Do not hand-edit `docs/BACKLOG.md`** — it is generated by `tools/backlog_index.py` after merge
3. **Do NOT touch `wiki/`** — wiki updates happen only after the item lands in `complete/`

The wiki is for *what is shipped*. The backlog is for *what is in flight*. They connect via the item's "After Completion (Strategist Notes)" section once the item completes.

## Spec Authoring Lessons

Things learned the hard way, accumulated as the project runs. Revisit when authoring similar items.

### Bootstrap items must include the runtime's first-party type/util packages

When authoring a bootstrap or scaffolding item for a new language/runtime, include the runtime's official type packages in `acceptance` and `files_to_modify` **even if the smoke test does not exercise them**. Otherwise the bootstrap ships clean (smoke test passes, typecheck passes), the next item that uses real runtime APIs hits a missing-types failure, and the agent escalates per drift rule 3 (no new deps without sign-off) — pure ceremony for a known-required package. For the TS/Node stack specifically: `@types/node` belongs in the bootstrap. Pattern: the smoke test's job is to prove the substrate compiles, but a green smoke test does NOT prove the substrate is ready for downstream consumption. Author bootstrap acceptance with downstream items in mind. *(Source: 2026-04-30 002-logger escalation; gap inherited from 001-repo-bootstrap.)*

### Probe before you spec — for any item that depends on a third-party app's storage layout

When the spec depends on the layout of an external app's data files (Cursor's SQLite tables, Claude Code's JSONL shape, a SaaS API response shape, etc.), run a **privacy-respecting empirical probe** before writing the spec, not during implementation. Schema-only probes (table names, key prefixes, value lengths — no content reads) are cheap, take 10 minutes, and prevent rebuilding a 100-line spec mid-flight when the agent discovers reality doesn't match. The agent that catches the mismatch during work will escalate correctly per drift rule 3, but the strategist that wrote the wrong spec is the one who created that escalation. Ten minutes of probing during the strategic conversation > one round-trip of agent escalation + spec rewrite + re-claim. *(Source: 2026-04-30 010-cursor-extractor escalation; spec assumed Cursor stored chat in per-workspace `state.vscdb`, actual location is `globalStorage/state.vscdb` under `cursorDiskKV`. Drift note: `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md`.)*

## Followup Queue

`backlog/_followups.md` is a flat-file queue populated by `/merge-and-cleanup`'s C10 step. It accumulates two kinds of entries:

- **Pre-merge fixups deferred during merge** — when the authorized merger reviews a fixup and chooses `defer-as-followup` rather than applying it inline. The fixup's description goes here so it's not forgotten.
- **Non-blocking follow-up items from the review sidecar** — things the code-reviewer subagent flagged but didn't consider merge-blocking (e.g., "consider adding a comment explaining the chokidar polling fallback rationale").

The queue is consumed during the next strategist conversation: each entry is either turned into a proper `backlog/proposed/` item (with full spec, blocked_by, etc.), rolled into an existing item's scope, or dropped with a one-line rationale.

The underscore prefix (`_followups.md`) sorts it first alphabetically inside `backlog/` so the founder sees it on every `ls`. It is not a backlog item — it does not have an id, does not pass through the kanban stages, and is not validated by `tools/blocked.py`. It's a working-memory queue, processed and emptied by the strategist as items are promoted.
