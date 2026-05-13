---
description: Merge one or more reviewed items from backlog/pending_review/ into main, with founder-in-the-loop checkpoints at conflicts, fixups, and final commit. Per item sequentially: pre-flight, merge --no-ff, pause for human conflict resolution, apply pre-merge fixups, verify (test/lint/typecheck), populate review_notes, move item to complete/, commit, delete worktree + branches (local + remote), push. Idempotent failure modes: refuses to start on dirty tree, refuses to skip checkpoints, never auto-resolves conflicts.
---

You are executing the founder's morning merge after `/review-pending` has produced verdicts the founder accepts. Your job is to do the **mechanical** parts of merge + cleanup correctly, while pausing at every **judgment** point so the founder stays in the loop.

This command is destructive in the sense that it pushes to origin and deletes branches. Match the scope of what was approved — do not merge items the human did not name.

## Inputs

- One or more positional arguments: item ids in **merge order**, e.g., `/merge-and-cleanup 012 013`. Order matters: items whose branches were claimed earlier should generally merge first, because later branches typically forked from earlier claim points and will conflict with them.
- Optional flag `--skip-fixups`: merge raw without applying pre-merge fixups. The fixups still get listed in `review_notes` as TODOs, and follow-up items are filed. Use sparingly — usually fixups are pre-merge gates for a reason.

For each id, locate the matching `.md` file in `backlog/pending_review/` and its sidecar `.review.md` (written by `/review-pending`). If the sidecar is missing, abort with a clear error — the human must run `/review-pending` first.

## Step A — Pre-flight (once, before any item)

```bash
cd ~/Desktop/Project_echo

# 1. Working tree must be clean — do not auto-stash, easy to lose work
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: working tree dirty. Commit or stash first."; exit 1
fi

# 2. Pull latest main
git pull --rebase origin main

# 3. Verify each item exists in pending_review/ AND has a review sidecar
for ID in "$@"; do
  ITEM=$(ls backlog/pending_review/*"$ID"*.md 2>/dev/null | grep -v '\.review\.md$' | head -1)
  SIDECAR="${ITEM%.md}.review.md"
  [ -z "$ITEM" ]    && { echo "ERROR: $ID not in pending_review/"; exit 1; }
  [ ! -f "$SIDECAR" ] && { echo "ERROR: no $SIDECAR — run /review-pending $ID first"; exit 1; }
  # also reject items whose verdict is not mergeable
  VERDICT=$(awk '/^verdict:/ { sub(/verdict:[ ]*/,""); print; exit }' "$SIDECAR")
  case "$VERDICT" in
    "merge as-is"|"merge with founder fixups") ;;
    *) echo "ERROR: $ID verdict is '$VERDICT' — not mergeable"; exit 1 ;;
  esac

  # 4. Warn if main moved significantly since the sidecar was written
  REVIEWED_AT=$(awk '/^reviewed_at:/ { sub(/reviewed_at:[ ]*/,""); print; exit }' "$SIDECAR")
  if [ -n "$REVIEWED_AT" ]; then
    AGE_HOURS=$(( ( $(date -u +%s) - $(date -u -d "$REVIEWED_AT" +%s 2>/dev/null || gdate -u -d "$REVIEWED_AT" +%s) ) / 3600 ))
    if [ "$AGE_HOURS" -gt 6 ]; then
      echo "WARN: $ID sidecar is ${AGE_HOURS}h old. Expected-conflicts list may be stale."
      echo "      Consider re-running /review-pending $ID before continuing. Reply 'continue' to proceed anyway."
      read -r ack
      [ "$ack" != "continue" ] && exit 1
    fi
  fi
done
```

## Step B — Acquire cross-session merge lock

A merge in progress is process-global state in git. If a parallel agent commits during your conflict-resolution pause, their staged changes get folded into your merge commit (this happened on the 013 merge — a parallel agent's 010-rework got committed under our merge title). Defend against this:

```bash
LOCK=".git/echo-merge-in-progress"
if [ -f "$LOCK" ]; then
  EXISTING=$(cat "$LOCK")
  echo "ERROR: another merge is in progress: $EXISTING"
  echo "  — if older than ~15 minutes and no merge is actively running,"
  echo "    remove with: rm $LOCK"
  exit 1
fi
echo "$ID @ $(date -u +%Y-%m-%dT%H:%M:%SZ) by $$" > "$LOCK"
trap 'rm -f "$LOCK"' EXIT INT TERM
```

**The lock auto-releases on script exit, ctrl-C, or termination.** If the parent process is killed ungracefully (`kill -9`, OS forced quit), the trap doesn't fire and the lock survives — that's why the error message includes the timestamp and a clear manual-recovery command. The founder reads `$EXISTING`, decides if the merge actually died, and removes the lock by hand.

**Scope of this lock.** It guards against *parallel sessions on this machine* racing into your merge state — the bug class that caused the 013 + 010-rework collision. It does NOT prevent inbound pushes from another machine. The C11 push step's "rejected → rebase" path handles cross-machine cases.

## Step C — Per-item sequential loop

For each id in argument order, run **C1 through C11** before moving to the next id. If any step fails or aborts, stop the whole loop — do not proceed to the next id.

### C1. Locate and announce

```bash
ITEM=$(ls backlog/pending_review/*"$ID"*.md | grep -v '\.review\.md$' | head -1)
SIDECAR="${ITEM%.md}.review.md"
SLUG=$(basename "$ITEM" .md | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+-//')
BRANCH="agent/$SLUG"
WORKTREE="$HOME/Desktop/Project_echo--$SLUG"
echo "=== Merging $ID ($SLUG) ==="
```

Echo the sidecar's Verdict + fixup list so the founder sees the plan one more time before action.

### C2. Merge

```bash
git merge --no-ff "$BRANCH" -m "merge: $ID-$SLUG (with founder reconciliation)"
```

If the merge has no conflicts, jump to **C5** (verify). If there are conflicts:

### C3. Surface conflicts and pause

For each conflicted file, output to the conversation:

1. The full conflict markers (the `<<<<<<<` … `=======` … `>>>>>>>` blocks).
2. The relevant excerpt from the sidecar's "Expected merge conflicts" section (the recommended resolution strategy).
3. The relevant excerpt from the item's `agent_notes` (any design-choice context the agent flagged).
4. A summary of which side does what (e.g., "main has fs-watcher; branch has git-watcher; both belong").

**Pause.** Do not edit any conflicted file yourself. Tell the human: *"Resolve conflicts in your editor, then reply `continue`."*

When the human replies `continue`, verify:

```bash
git diff --check               # any remaining conflict markers?
git status --porcelain | grep -E '^(UU|AA|DD)' && { echo "still unmerged"; exit 1; }
```

### C4. Apply pre-merge fixups (unless `--skip-fixups`)

For each unchecked item in the sidecar's "Pre-merge fixups" list:

1. Show the proposed change as a unified diff. **Do not write to disk yet.** This is plan, not apply.
2. Pause for human approval per fixup: *"Apply this fixup? (yes / skip / defer-as-followup)"*
3. On `yes`: write the change to disk, stage with `git add`, continue to the next fixup.
4. On `skip`: drop the fixup entirely. Nothing is written. Nothing is queued. Continue.
5. On `defer-as-followup`: nothing is written. Append the fixup to the follow-up queue (used in C10). Continue.

The working tree is mutated only by `yes`. `skip` and `defer` are no-ops on the tree — they differ only in whether the fixup gets remembered for later.

After all fixups, re-run `git diff --check` to make sure no conflict markers were introduced. Re-run `git status --porcelain` to confirm only the expected files are staged.

### C5. Verify

```bash
# from the project root, with the merge half-staged but not yet committed
npm install                 # in case dependencies changed (especially MCP SDK, chokidar, etc.)
npm test
npm run lint
npm run typecheck
```

If `package.json` was a conflict, `package-lock.json` should be regenerated rather than hand-merged — too noisy:

```bash
rm -f package-lock.json
npm install
git add package-lock.json
```

If any verify step fails: **pause and surface the failure.** Do not auto-fix. Test failures after merge often indicate ordering issues that need a structural fix (e.g., the PID-lock-vs-MCP ordering in 013). Tell the human: *"Verification failed. Fix the underlying issue, then reply `continue` to re-verify."*

Loop until verify passes or the human aborts.

### C6. Populate review_notes from template

Edit the item's frontmatter `review_notes` field with a structured template:

```yaml
review_notes: |
  Merged on <ISO-date> via founder reconciliation.

  Conflicts resolved:
  - <file>: <one-sentence resolution>
  - ...

  Fixups applied:
  - <fixup 1>
  - ...

  Fixups deferred to follow-up items:
  - <fixup>
  - ...

  Verify: <N>/<N> tests pass; lint and typecheck clean post-merge.

  Follow-up items (non-blocking):
  - <description>
  - ...
```

Open the file for human edits before commit: *"Review the notes, then reply `commit`."* The human may add context the command doesn't know about (e.g., why a fixup was deferred).

### C7. Move item to complete/, delete sidecar

Stage the `review_notes` edit BEFORE the `git mv` so the new path's blob includes C6's content. Without the explicit stage-before-mv, `git mv` records a similarity-100% rename of HEAD's old blob and the freshly-edited `review_notes` content sits unstaged against the new path; in some git versions `git add -A` at C8 still picks it up via the path-on-disk, but the post-044 merge surfaced a case (commit `ca51bb2`) where the populated 70-line `review_notes` block was lost from the merge commit and had to be re-committed separately at `011b539`. Staging first is the unambiguous fix (045 AC5b).

```bash
# 045 AC5b — stage review_notes content BEFORE rename so the new path's
# blob captures C6's edit. Either form below works; the spec prefers the
# stage-before-mv shape because intent is clearer than re-stage-after.
git add backlog/pending_review/$(basename "$ITEM")    # stage C6's review_notes edit FIRST
git mv backlog/pending_review/$(basename "$ITEM") backlog/complete/$(basename "$ITEM")
git rm "$SIDECAR"               # sidecar is consumed; do not let it follow the item
```

### C8. Commit

```bash
git add -A
git commit -m "$(cat <<EOM
merge: $ID-$SLUG (with founder reconciliation)

<one paragraph from sidecar's Verdict>

Conflicts: <file list>
Fixups applied: <count>; deferred: <count>
Tests: <N>/<N> pass; lint and typecheck clean.

Reviewed-by: ECHO code-reviewer subagent (see /review-pending sidecar for full review)
EOM
)"
```

### C9. Cleanup worktree and branches

Before `git worktree remove`, surgically delete `$WORKTREE/node_modules` (regenerable, not work — `npm install` from C5 or the code-reviewer subagent's in-worktree verify left it). The strict "do not --force" invariant on `git worktree remove` is preserved; this rm is narrowly scoped to a known-regenerable directory AND gated behind an identity check that aborts the operation if `$WORKTREE` doesn't point at the expected agent worktree on the expected branch.

```bash
# 045 AC5a — identity guard. ALL four checks must pass or the rm does NOT
# execute; the operator surfaces the new blocker to the founder.
[ -n "$WORKTREE" ] || { echo "ERROR: WORKTREE empty"; exit 1; }
[ -d "$WORKTREE/.git" ] || [ -f "$WORKTREE/.git" ] || { echo "ERROR: $WORKTREE not a git worktree"; exit 1; }
EXPECTED_WT_TOPLEVEL="$WORKTREE"
ACTUAL_WT_TOPLEVEL="$(git -C "$WORKTREE" rev-parse --show-toplevel 2>/dev/null)"
[ "$ACTUAL_WT_TOPLEVEL" = "$EXPECTED_WT_TOPLEVEL" ] || { echo "ERROR: worktree toplevel mismatch (expected $EXPECTED_WT_TOPLEVEL, got $ACTUAL_WT_TOPLEVEL)"; exit 1; }
ACTUAL_BRANCH="$(git -C "$WORKTREE" branch --show-current 2>/dev/null)"
[ "$ACTUAL_BRANCH" = "$BRANCH" ] || { echo "ERROR: branch mismatch (expected $BRANCH on $WORKTREE, got $ACTUAL_BRANCH)"; exit 1; }
rm -rf "$WORKTREE/node_modules"

git worktree remove "$WORKTREE"
git branch -d "$BRANCH"
git push origin --delete "$BRANCH"
```

Use `-d` (not `-D`) for the local delete — this fails loud if the branch isn't fully merged, which would mean the merge commit doesn't actually contain the branch's tip and something is wrong.

If `git worktree remove` still fails (chokidar handles, stray pyc, etc.) AFTER the node_modules cleanup, surface the new blocker per the existing "do not --force" rule below. Do NOT broaden the rm beyond `node_modules` (no dist/, .vite/, etc. — those would be a separate scoped decision).

If the remote delete fails because the branch was already pushed for someone else's reference (rare): surface the error and ask the human; do not force.

### C9b. Restart the ECHO daemon

`vite-node` only loads source at process start. If the daemon is running from before this merge, the next dogfooding call will silently run on stale code — looks like the patch didn't ship. Observed twice (post-018, post-019) before this step was codified.

```bash
launchctl kickstart -k "gui/$(id -u)/com.echo.daemon"
```

If the daemon isn't managed by launchd in this environment (e.g., during a manual `npm run daemon` session), surface that to the founder rather than skipping silently — they should restart by hand before the next call.

### C10. File follow-up items

For each fixup deferred in C4 and each item in the sidecar's "Follow-up items" section: append a one-line entry to a queue file `backlog/_followups.md` (create if missing). Founder turns these into proper backlog items in their next strategist conversation.

### C11. Push

```bash
git push origin main
```

If push is rejected (someone else pushed during the merge):

1. `git pull --rebase origin main`. The merge commit may need to be replayed.
2. If rebase produces conflicts: stop, surface, ask the human.
3. Re-push.

If still rejected after one rebase attempt: stop. Surface to the human; do not loop.

## Step D — Final summary

After the loop completes, output:

- One line per merged item: id, slug, conflicts hit, fixups applied, fixups deferred, test counts.
- The follow-up queue contents (`backlog/_followups.md`).
- A reminder: *"Strategist conversation: <ids> are now in `complete/`. Their After-Completion sections need to be promoted to `wiki/` next."*

## Failure Modes (and what the command does)

| Situation | What to do |
|---|---|
| Dirty working tree at pre-flight | Refuse; exit 1. Do not auto-stash. |
| Sidecar missing for an id | Refuse; tell the human to run `/review-pending <id>` first. |
| Sidecar verdict is `redo` or `block` | Refuse for that id; suggest the right next action. |
| Lock file already exists | Refuse; show the lock contents and ask the human. |
| Conflict in a file *not* mentioned in the sidecar's expected-conflicts list | Pause hard — this is a signal the spec or the agent did something unexpected. Surface and wait. |
| Verify step fails | Pause; do not auto-fix. The human's structural fix becomes part of the merge commit. |
| Pre-merge fixup makes a test go red | Same — don't auto-revert. The human decides whether to keep the fixup with a deeper fix, or drop it to a follow-up. |
| Push rejected | One rebase attempt; if still rejected, surface and stop. |
| Worktree remove fails (chokidar still has handles, etc.) | Retry once after 1s; if still failing, surface — do not `--force`. |
| Branch -d fails (not fully merged) | This is a real signal; do not force-delete. Surface and stop. |

## What You Must NOT Do

- Do not auto-resolve conflicts.
- Do not skip the verify step.
- Do not commit during a verify pause.
- Do not edit `wiki/`, `docs/BACKLOG.md`, or items not in the argument list.
- Do not amend the merge commit after pushing (history is shared).
- Do not force-push to main.
- Do not `--force` worktree removal or branch deletion.
- Do not pick up items the founder did not name.
- Do not run `/review-pending` recursively to "regenerate" a missing sidecar — fail loud and ask the founder to run it explicitly.

## What Success Looks Like

For each id in the argument list, by the end of the run:

- Item file moved from `backlog/pending_review/` to `backlog/complete/` with `review_notes` populated AND committed (the merge commit's diff includes the `review_notes` content, not just the rename — 045 AC5b).
- Sidecar `.review.md` removed.
- Merge commit on `main` with descriptive message; pushed to origin.
- Worktree `~/Desktop/Project_echo--<slug>/` removed.
- Branch `agent/<slug>` deleted locally and on origin.
- ECHO daemon kickstarted so the next call runs on merged code.
- Tests pass, lint clean, typecheck clean post-merge.
- `backlog/_followups.md` updated with deferred fixups and follow-up items.
- The founder is unblocked to invoke a strategist conversation for wiki promotion.

Now begin. Read the argument list, run pre-flight, acquire the lock, and loop the items in order.
