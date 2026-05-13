---
description: Review every item in backlog/pending_review/ in parallel. Spawns one code-reviewer subagent per item; synthesizes a per-item verdict + fixup list + merge-conflict preview; writes a sidecar review plan next to each item; stops for human validation. Read-only — never touches the working tree, never moves files, never runs git operations beyond read-only diffs.
---

You are reviewing the agent's pending work for the founder. The founder runs this command in the morning (or whenever pending_review has items) to get a structured verdict before deciding what to merge.

This command is **read-only**. It does not move files, modify the working tree, or run any state-changing git operations. Its only output is human-readable summaries plus a sidecar review plan per item.

## Inputs

- Optional positional argument: a specific item id (e.g., `012`, `2026-04-30-012`, or full filename `2026-04-30-012-git-capture.md`).
- If omitted: reviews **every** item in `backlog/pending_review/`.

Resolve the input to a list of full paths under `backlog/pending_review/`.

## Step A — Pre-flight

```bash
cd ~/Desktop/Project_echo
git fetch origin main --quiet

ITEMS=()
if [ -n "${1:-}" ]; then
  # match by suffix — accepts "012", "2026-04-30-012", or full filename
  match=$(ls backlog/pending_review/*"$1"*.md 2>/dev/null | head -1)
  [ -z "$match" ] && { echo "no match in pending_review/ for: $1"; exit 1; }
  ITEMS+=("$match")
else
  for f in backlog/pending_review/*.md; do
    [ -e "$f" ] && ITEMS+=("$f")
  done
fi

[ ${#ITEMS[@]} -eq 0 ] && { echo "nothing to review — pending_review/ is empty"; exit 0; }
echo "Reviewing ${#ITEMS[@]} item(s): ${ITEMS[*]##*/}"
```

## Step B — Spawn one code-reviewer subagent per item, in parallel

For each item, dispatch a `superpowers:code-reviewer` subagent **in the same message** so they run concurrently. Each subagent gets a self-contained prompt that does not depend on conversation context.

### Per-item prompt template

The prompt must include all of:

- **Where things are.** Absolute path to the item file, absolute path to the worktree, the branch name + head_sha (read these from frontmatter), the spec_refs list, and the project's CLAUDE.md location.
- **Ground-truth check (FIRST, before anything else).** The worktree's HEAD must match the item's recorded `head_sha`. If it doesn't, the verification below would be meaningless — tests against drifted state are false-green by construction. Run:
  ```bash
  cd "$WORKTREE"
  ACTUAL=$(git rev-parse HEAD)
  if [ "$ACTUAL" != "$EXPECTED_HEAD_SHA" ]; then
    echo "WORKTREE DRIFTED: expected $EXPECTED_HEAD_SHA, found $ACTUAL"
    exit 1
  fi
  ```
  If HEADs disagree, abort this item's review with verdict `block` and a single open question for the founder: *"Worktree HEAD ($ACTUAL) does not match recorded head_sha ($EXPECTED). Founder must reconcile (re-push agent's work, force the worktree to the recorded SHA, or update the recorded head_sha) before review can proceed."* Do NOT run tests. Do NOT speculate about the diff. Drift detection is a load-bearing failure mode.
- **What to check** (only after ground-truth check passes). A structured rubric:
  1. Acceptance-criteria coverage — every bullet in `acceptance:` and the body checklist, table format, Met/Partial/Not Met + one-line evidence.
  2. Drift — `git diff main...agent/<slug>` from the project root vs. the body's "Out of Scope (Don't Drift)".
  3. Design-choice judgments — every choice the agent flagged in `agent_notes`, judged stand/redo with reasoning.
  4. Code quality — concurrency, error handling, security where applicable.
  5. Cross-cut conflicts — what this branch will collide with on merge to current main (read main's versions of files in `files_to_modify` to predict).
  6. Bugs/risks with `file:line` refs.
- **Verification.** Run `npm test`, `npm run lint`, `npm run typecheck` inside the worktree (which we just confirmed is at the recorded head_sha). Don't trust agent_notes' test counts at face value — re-run, report observed.
- **What to return.** A structured review with sections: Verdict (one of `merge as-is` | `merge with founder fixups` | `redo before merge` | `block`), Acceptance status table, Drift findings, Design-choice judgments, Bugs/risks, Merge-conflict preview, Suggested fixups (split into pre-merge punch list + non-blocking follow-ups). Aim for under 1000 words.

Spawn all subagents in a single message with multiple Agent tool calls — do not serialize.

## Step C — Synthesize and write per-item sidecar plans

For each returned review, write a sidecar file at `backlog/pending_review/<id>.review.md` (next to the item file). This is what `/merge-and-cleanup` will consume.

### Sidecar format

```markdown
---
item_id: 2026-04-30-012-git-capture
verdict: merge with founder fixups   # merge as-is | merge with founder fixups | redo before merge | block
reviewed_at: 2026-04-30T22:30:00Z
test_counts: { passed: 132, failed: 0 }
---

## Verdict
<one paragraph>

## Pre-merge fixups
- [ ] <fixup 1 — file:line — one-sentence rationale>
- [ ] <fixup 2 — ...>

## Expected merge conflicts
- `<file>` — <recommended resolution strategy in one sentence>
- `<file>` — ...

## Follow-up items (defer, do not block merge)
- <item description>
- ...

## Open questions for founder
<only if verdict is "block" — list the specific decisions blocking merge>
```

The human will read this, optionally edit it (uncheck fixups they want to defer, edit resolution strategy, add notes), then invoke `/merge-and-cleanup`.

## Step D — Surface a founder-facing summary

After all sidecars are written, output to the conversation:

- A one-line verdict per item (id, verdict, fixup count, conflict count).
- The full text of each review's "Verdict" section, "Suggested fixups", and "Merge-conflict preview" inline (this is what the human reads to decide).
- Path to each sidecar file.
- The exact next command to run, e.g., `/merge-and-cleanup 012 013` — list items in dependency order (earlier-claimed items first, since later branches likely forked from main *before* earlier ones merged and will conflict with them).

End with a clear pause prompt: *"Reply with `/merge-and-cleanup <ids>` to proceed, or edit the sidecar files first, or push back on specific findings."*

## Step E — STOP

Do not move files. Do not run git operations beyond `git diff` and `git fetch`. Do not modify the item frontmatter. Do not touch `wiki/`, `docs/BACKLOG.md`, or any complete/ items.

## Failure Modes

- **`pending_review/` is empty** → exit 0 with "nothing to review."
- **Item's worktree directory is missing** → flag in the summary as "worktree gone — already merged?" and skip that item. Don't spawn a subagent for it.
- **Subagent returns verdict `redo before merge`** → write the sidecar, but the summary should highlight that this item is *not* a candidate for `/merge-and-cleanup`. The founder should escalate back to the agent who wrote the work (typically: `git mv` the item back to `claimed/`, message the agent's run log).
- **Subagent returns verdict `block`** → surface the open questions prominently. The founder needs to make a decision before merge can proceed.
- **A subagent fails internally (timeout, error)** → report which item failed, don't attempt to merge it. Founder can re-run `/review-pending <id>` for just that one.
- **Multiple worktrees + parallel sessions** → harmless; each subagent reads its own worktree, no shared state.

## What You Must NOT Do

- Do not move any items between stages.
- Do not modify any item file's frontmatter or body.
- Do not run `npm test` / `npm install` from the main repo root (only the subagents do, inside their respective worktrees).
- Do not commit anything.
- Do not delete worktrees or branches (that's `/merge-and-cleanup`'s job, post-merge).
- Do not "be helpful" by speculating beyond what the code shows — the verdict must be evidence-based.

## What Success Looks Like

- Every item in `pending_review/` has a sidecar `.review.md` file with a verdict.
- The founder has a single conversation-facing summary they can act on without re-reading individual reviews.
- The exact follow-up command is named.
- No files moved, no commits made, no branches touched.

Now begin. Resolve the item list, dispatch the subagents in parallel, and synthesize.
