---
description: Merge one or more reviewed items from backlog/pending_review/ into main, with founder-in-the-loop checkpoints at conflicts, fixups, and final commit. Per item sequentially: pre-flight, merge --no-ff, pause for human conflict resolution, apply pre-merge fixups, verify (test/lint/typecheck), populate review_notes, move item to complete/, commit, push, then delete worktree + branches (local + remote). Idempotent failure modes: refuses to start on dirty tree, refuses to skip checkpoints, never auto-resolves conflicts.
---

You are executing the founder's morning merge after `/review-pending` has produced verdicts the founder accepts. Your job is to do the **mechanical** parts of merge + cleanup correctly, while pausing at every **judgment** point so the founder stays in the loop.

This command is destructive in the sense that it pushes to origin and deletes branches. Match the scope of what was approved — do not merge items the human did not name.

### Scoped persistent-coordinator override

For items 136-138 and exactly two successor items replacing 139, the locked decision at `raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md` has higher precedence than later human-founder pause language in this skill. The persistent Codex coordinator may make the conflict, fixup, commit, push, cleanup, and live-bringup decisions without requesting another founder response, but it must record the applicable canonical delegated authorization, preserve every verification and readback gate, and obtain independent review for any implementation or merge-resolution bytes it authors. The implementation builder never invokes this override or merges its own work. A failed gate is repaired and rerun; it is not waived. This override does not apply to any other item.

Under that override, each later `read` or "reply" pause becomes a coordinator decision point recorded in `review_notes` and, when the operation is exact-artifact or otherwise irreversible, in the committed delegated-operation authorization. "Do not auto-resolve" still means no unexamined mechanical resolution: the coordinator must inspect and justify the resolution, then obtain the required independent review.

## Inputs

- One or more positional arguments: item ids in **merge order**, e.g., `/merge-and-cleanup 012 013`. Order matters: items whose branches were claimed earlier should generally merge first, because later branches typically forked from earlier claim points and will conflict with them.
- Optional flag `--skip-fixups`: merge raw without applying pre-merge fixups. The fixups still get listed in `review_notes` as TODOs, and follow-up items are filed. Use sparingly — usually fixups are pre-merge gates for a reason.

Backlog lifecycle is `proposed/ → ready/ → claimed/ → pending_review/ → complete/`. This skill starts only after a builder has moved an item into `pending_review/`; it never assumes the spec was authored directly in `ready/`, and it never performs the watcher-owned `proposed/ → ready/` promotion.

For each id, locate the matching `.md` file in `backlog/pending_review/` and its sidecar `.review.md` (written by `/review-pending`). If the sidecar is missing, abort with a clear error — the human must run `/review-pending` first.

## Step A — Pre-flight (once, before any item)

```bash
cd ~/Desktop/Project_echo

# 1. Working tree of the live main checkout must be clean — do not auto-stash,
#    easy to lose work. (The actual merge runs inside an ephemeral worktree
#    per Step B below, but the live checkout still needs to be coherent so
#    the founder can read post-merge state.)
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
  tools/review-queue/validate-sidecar.py "$SIDECAR" || exit 1
  # also reject items whose validated verdict is not mergeable
  VERDICT=$(python3 - "$SIDECAR" <<'PY'
import sys, yaml
with open(sys.argv[1], encoding="utf-8") as f:
    print(yaml.safe_load(f.read().split("---")[1])["verdict"])
PY
  )
  case "$VERDICT" in
    "merge as-is"|"merge with founder fixups") ;;
    *) echo "ERROR: $ID verdict is '$VERDICT' — not mergeable"; exit 1 ;;
  esac

  # 4. Warn if main moved significantly since the sidecar was written
  REVIEWED_AT=$(python3 - "$SIDECAR" <<'PY'
import datetime as dt, sys, yaml
with open(sys.argv[1], encoding="utf-8") as f:
    value = yaml.safe_load(f.read().split("---")[1])["reviewed_at"]
if isinstance(value, dt.datetime):
    if value.tzinfo is not None:
        value = value.astimezone(dt.timezone.utc).replace(tzinfo=None)
    print(value.strftime("%Y-%m-%dT%H:%M:%SZ"))
else:
    print(value)
PY
  )
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

## Step B — Create ephemeral merger worktree (050 AC3)

A merge in progress is process-global state in git. The 2026-05-14 14:02 PDT collision (047 retro) showed why prose-as-protocol sentinel-file locks are insufficient — no other binding reads the lock, so a parallel codex reviewer launchd-tick committed into the same `.git/index` while a Claude merger session had unpushed staging in flight. The 050 architectural answer is to **remove the shared `.git/index` race surface entirely**: the merge runs inside a per-tick ephemeral worktree at `$TMPDIR/echo-merger-<uuid>`. Two unrelated processes cannot collide if they do not share an index.

```bash
# Pre-flight worktree hygiene (order matters)
git worktree prune || true
REGISTERED_WT=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
if [ -n "${TMPDIR:-}" ] && [ -d "$TMPDIR" ]; then
  while IFS= read -r -d '' orphan; do
    if printf '%s\n' "$REGISTERED_WT" | grep -Fxq "$orphan"; then continue; fi
    rm -rf -- "$orphan" || true
  done < <(find "$TMPDIR" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0 2>/dev/null)
fi

# Create the ephemeral, detached-HEAD worktree pinned to origin/main.
git fetch origin main
[ -n "${TMPDIR:-}" ] || { echo "TMPDIR unset; cannot place ephemeral merger worktree"; exit 1; }
MERGER_WT="$TMPDIR/echo-merger-$(uuidgen)"
git worktree add --detach "$MERGER_WT" origin/main

# Unified cleanup trap. Note: founder-in-loop conflict-resolution pauses
# (C3) and verify-step pauses (C5) keep this worktree registered while the
# session is paused — pre-flight in OTHER role wrappers (reviewer / watcher)
# skips registered worktrees regardless of mtime, so a paused merger
# session is never GC'd out from under the founder.
cleanup_merger() {
  local rc=$?
  cd "$HOME/Desktop/Project_echo" 2>/dev/null || true
  if [ -n "${MERGER_WT:-}" ] && [ -d "$MERGER_WT" ]; then
    git worktree remove --force "$MERGER_WT" 2>/dev/null || true
  fi
  git worktree prune 2>/dev/null || true
  return $rc
}
trap cleanup_merger EXIT
trap 'cleanup_merger; exit 1' ERR INT TERM

cd "$MERGER_WT"
```

**Scope of this isolation.** It removes the parallel-sessions-on-this-machine race surface (the bug class that caused the 013 + 010-rework collision AND the 2026-05-14 14:02 PDT 048/049 collision) by giving each role its own `.git/index`. It does NOT prevent inbound pushes from another machine — the C9 push step's "rejected → rebase" path handles cross-machine cases. The previous prose-as-protocol merge sentinel-file lock is DELETED in this spec; no defense-in-depth file lock is retained because retaining one would preserve the one-sided-convention failure mode for whichever future binding next ignored it.

**Migration note.** If a stale sentinel file from a pre-050 manually-aborted merge happens to exist on the live checkout under `.git/`, the worktree-mode merger does not read or care about it. It is simply orphaned — clean up by hand with a one-shot `rm` of the stale file.

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

**Pause.** Do not edit any conflicted file yourself. Surface the proposed resolution to the human with a three-branch prompt: *"Reply `c3.5` to invoke a cross-vendor consult on this resolution (see §C3.5 below — recommended when the resolution involves test deletion, wholesale-side-take on a restructured file, reconciliation across ≥3 files where the sidecar playbook is silent, or new code outside the conflict markers). OR resolve in your editor and reply `continue` to apply. OR reply `abort` to back out of the merge."*

If the human replies `c3.5`, proceed to §C3.5; the consult returns control to this same pause point (with codex's verdict + any modifications surfaced), and the human still replies `continue` (or `abort`) to advance. **`continue` remains the single gate that verifies + applies the resolved tree.**

When the human replies `continue`, verify:

```bash
git diff --check               # any remaining conflict markers?
git status --porcelain | grep -E '^(UU|AA|DD)' && { echo "still unmerged"; exit 1; }
```

### C3.5. Optional cross-vendor consult on the proposed resolution

C3.5 is **OPTIONAL** and trigger-driven; the vast majority of merge conflicts are mechanical and resolved cleanly via §C3 alone. C3.5 is the escape hatch for the minority of conflicts where the proposed resolution involves judgment beyond the sidecar's prescriptive playbook. The trigger is **either**:

- **Founder-explicit:** founder says `c3.5` (or "review with codex" or similar) at the §C3 pause. This is the empirically-validated trigger (2026-05-15 050 merge — see Worked example below).
- **Strategist-recommended:** strategist proactively recommends C3.5 in its §C3 surface when the proposed resolution touches any of: (a) deletion of test files, (b) wholesale-side-take on a restructured file (not a single-line side-take), (c) reconciliation across ≥3 files where the sidecar playbook is silent or absent, (d) introduction of new code outside the conflict markers. The recommendation is a one-line addendum to the §C3 output: "This resolution touches [a/b/c/d] — recommend §C3.5 cross-vendor review before applying." The founder remains the decider.

#### Invocation recipe

Write the consult prompt to a temp file under `$MERGER_WT`, then invoke (continuation backslashes allowed for line-wrap):

```bash
codex exec -C "$MERGER_WT" --sandbox read-only - < "$MERGER_WT/.c3.5-prompt.md" \
    > "$MERGER_WT/.c3.5-stdout" 2> "$MERGER_WT/.c3.5-stderr"
```

The named-file capture is load-bearing for the **Consult-failure recovery** subsection below: terminal scrollback is not durable after a `/clear` or session restart; the `.c3.5-stdout` and `.c3.5-stderr` files under `$MERGER_WT` survive at least until the merger worktree is cleaned up, giving the strategist a fixed handle for both happy-path stdout parsing and unhappy-path stderr surfacing.

#### Prompt template

The prompt body MUST include the SIX load-bearing elements:

1. **Working-tree state** captured *inside `$MERGER_WT`* via `git status --porcelain` + relevant `git diff` output. NOT relative to the live checkout (`$REPO_ROOT`) — the live checkout is on a separate branch tip with a clean tree and contains none of the unresolved conflict state.
2. **Batch context:** other recent merges in this session + the sidecar prescriptions that already shaped the strategist's proposed resolution. Reviewers should see what's already been decided.
3. **Conflict markers:** either direct the reviewer to read files inside `$MERGER_WT` via `git diff <file>` (the invocation cwd is `$MERGER_WT`, so relative-path directives interpret correctly), OR embed the full conflict-marker blocks verbatim. Both are acceptable.
4. **Specs and sidecars** the reviewer should consult — current spec at SHA, adjacent items' sidecars, prior `review_notes` excerpts.
5. **The proposed resolution** verbatim — paths to take, lines to add, tests to delete, etc. This is the artifact being reviewed.
6. **Output format** — the reviewer MUST emit a YAML-like header containing `verdict:`, `reviewer:`, AND `consult_cwd: $(pwd -P)`. The `consult_cwd` value is the **physical/canonical** path returned by `pwd -P` (POSIX), NOT the logical `$PWD`. The strategist canonicalizes its `$MERGER_WT` via `(cd "$MERGER_WT" && pwd -P)` for the wrong-tree compare; the canonical-vs-canonical form survives macOS's `/var/folders/...` (logical) vs `/private/var/folders/...` (physical) ambiguity.

#### Output format

The reviewer's response file (`$MERGER_WT/.c3.5-stdout`) MUST start with a YAML-like header:

```yaml
---
verdict: proceed-as-proposed | proceed-with-modifications | pushback
reviewer: codex
consult_cwd: /private/var/folders/.../echo-merger-<uuid>   # captured via pwd -P at consult start
---
```

The three verdict strings (`proceed-as-proposed`, `proceed-with-modifications`, `pushback`) are the only allowed values. The `reviewer:` field names the cross-vendor reviewer (`codex` for the empirical case, but any non-strategist binding is permitted). The `consult_cwd:` value is load-bearing for failure-mode (iv) detection in **Consult-failure recovery** below.

#### Post-review handling

Each verdict produces a distinct strategist action; control always returns to the §C3 pause point (the human still types `continue` or `abort` to advance).

- **proceed-as-proposed** — Codex endorsed the resolution as-is. Strategist surfaces the endorsement to the founder: *"Codex consult returned proceed-as-proposed; apply your resolution as planned and reply `continue`."* No modifications to fold; the original resolution is what gets applied.
- **proceed-with-modifications** — Codex agreed with the spirit but identified refinements (typically outside-conflict-marker cleanup, dead-code removal, header comment updates). Strategist surfaces the modifications: *"Codex consult returned proceed-with-modifications. Apply your original resolution + these N modifications: <one-line list>. Reply `continue` when done."* The founder applies both the original resolution and codex's modifications before replying `continue`.
- **pushback** — Codex disagreed with the resolution approach. Strategist surfaces the pushback verbatim: *"Codex pushed back on the resolution because: <reason>. Reconsider before applying — you may rework the resolution, override the pushback and reply `continue` anyway, or reply `abort`."* The strategist does NOT auto-revert; the founder decides whether codex is right.

#### Consult-failure recovery

The four failure modes — strategist MUST handle each gracefully and surface to the founder, then return to §C3 with the three branches (`c3.5` retry-with-different-vendor / `continue` apply-without-consult / `abort`). The strategist does NOT auto-retry.

- **(i) Codex binary not found / exit code 127.** Detected via `$MERGER_WT/.c3.5-stderr` containing `command not found` OR the shell's `$?` being 127. Surface: read `.c3.5-stderr`, paste the relevant lines to the founder. Record in C6: `C3.5 cross-vendor consult: codex @ failed — not-found`.
- **(ii) `codex exec` exits non-zero with no parseable response.** Detected via `$?` non-zero AND `.c3.5-stdout` empty or lacking the required YAML header. Surface: read `.c3.5-stderr`. Record: `C3.5 cross-vendor consult: codex @ failed — non-zero exit`.
- **(iii) Response present but YAML header malformed / `verdict:` missing or not one of the three allowed values.** Detected by strategist's YAML parse of `.c3.5-stdout` failing OR by the parsed `verdict` not being in the allowed set. Surface: read `.c3.5-stdout` excerpt. Record: `C3.5 cross-vendor consult: codex @ failed — malformed response`.
- **(iv) Response YAML-parseable but `consult_cwd:` does not match `$MERGER_WT` canonicalized.** Detected by string compare of the echoed `consult_cwd` value against the strategist's `$(cd "$MERGER_WT" && pwd -P)` — mismatch means the reviewer ran in the wrong tree even though `-C "$MERGER_WT"` was specified (e.g., a misconfigured codex CLI ignored `-C`). Surface: read `.c3.5-stdout` and explain to the founder that the reviewer didn't actually see the merger worktree. Record: `C3.5 cross-vendor consult: codex @ failed — consult_cwd mismatch`.

#### Worked example

2026-05-15 050 merge (commit `5ad67e0`). Two conflicted files (`tools/review-queue/_run_reviewer.sh` UU + `tools/review-queue/push-with-retry.sh` UU) and two auto-merged ones. The proposed resolution was judgment-loaded: take 050's worktree-isolation hunk wholesale, **delete** the obsolete `run-reviewer-honors-merge-lock.test.ts`, and reconcile the `push-with-retry.sh` line by combining 051's `--rebase=merges` flag with 050's `HEAD:main` refspec. Founder said *"use a codex reviewer here"*. Strategist improvised the consult — at the time, the empirical invocation used `-C ~/Desktop/Project_echo` because 050's worktree-isolation hadn't shipped yet. **Post-050, the correct invocation is `-C "$MERGER_WT"` per the recipe above.** Codex returned `proceed-with-modifications` with two non-conflict refinements (orphaned `CODEX_BIN` block + `push-with-retry.sh` header-comment mismatch); both folded into the merge commit. Net effect: a tighter merge than the strategist's solo plan would have produced. Spec 054 codified this pattern.

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
tools/review-queue/check-coupled-invariants.sh
tools/sync-skills.sh --check
```

If `tools/sync-skills.sh --check` exits non-zero: **pause and surface the failure with this exact remediation message:** `sync-skills check failed — adapter drift between skills/ and .claude/commands/. Run \`tools/sync-skills.sh\` to re-derive, then re-stage and reply 'continue'.` Do NOT run `tools/sync-skills.sh` (without `--check`) on the operator's behalf — auto-fix would mask cases where the canonical was edited on a parallel branch and the adapter snapshot the merge produced is the *wrong* derived form. Same posture as the other verify failures: pause, let the operator inspect and re-derive deliberately, re-stage, then reply `continue`.

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

  C3.5 cross-vendor consult: <reviewer> @ <verdict> — <one-sentence summary>
  # <verdict> ∈ {proceed-as-proposed, proceed-with-modifications, pushback, failed}
  # Summary text by verdict:
  #   proceed-as-proposed       → "no modifications"
  #   proceed-with-modifications → "applied N modifications: <one-line list>"
  #   pushback (accepted)       → "founder accepted pushback; redesigning resolution"
  #   pushback (overridden)     → "pushback rejected by founder — applied original anyway"
  #   failed                    → "<one of: not-found / non-zero exit / malformed response / consult_cwd mismatch>"
  # If no C3.5 fired during the merge, the line reads: "C3.5 cross-vendor consult: none invoked"

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
# Include the next line ONLY if §C3.5 fired during this merge; omit entirely otherwise.
# The durable record lives in review_notes (per §C6); this line signposts non-default events.
Cross-vendor consult: <reviewer> @ <verdict>; modifications: <N>
Tests: <N>/<N> pass; lint and typecheck clean.

Reviewed-by: ECHO code-reviewer subagent (see /review-pending sidecar for full review)
EOM
)"
```

### C9. Push

**Push BEFORE cleanup (P6).** The merge commit lives only on the merger worktree's detached HEAD until it lands on `origin/main` — so the worktree removal and branch deletes in C11 must run **only after this push succeeds**. Doing cleanup first risks an unreferenced (GC-able) merge commit and a "branch deleted, commit not on main" loss if the push then fails.

```bash
# 050 AC5 — explicit HEAD:main refspec. The merger runs inside a detached-HEAD
# worktree ($MERGER_WT pinned to origin/main at Step B); `git push origin main`
# would push the COMMON repository's `main` branch ref, leaving the merger
# worktree's new commit unpushed. HEAD:main pushes the worktree's actual HEAD.
git push origin HEAD:main
```

If push is rejected (someone else pushed during the merge):

1. `git pull --rebase=merges origin main`. The merge commit may need to be replayed; `--rebase=merges` **preserves the merge commit and its second-parent** (the backlog-move/sidecar ops carried in the merge) instead of flattening them — a plain `--rebase` silently drops those extras on replay.
2. If rebase produces conflicts: stop, surface, ask the human.
3. Re-push (still `git push origin HEAD:main`).

If still rejected after one rebase attempt: stop. Surface to the human; do not loop.

### C10. File follow-up items

For each fixup deferred in C4 and each item in the sidecar's "Follow-up items" section: append a one-line entry to a queue file `backlog/_followups.md` (create if missing). Founder turns these into proper backlog items in their next strategist conversation.

### C11. Cleanup worktree and branches

Runs **only after the C9 push has landed on `origin/main`** (see the C9 ordering note). Before `git worktree remove`, surgically delete `$WORKTREE/node_modules` (regenerable, not work — `npm install` from C5 or the code-reviewer subagent's in-worktree verify left it). The strict "do not --force" invariant on `git worktree remove` is preserved; this rm is narrowly scoped to a known-regenerable directory AND gated behind an identity check that aborts the operation if `$WORKTREE` doesn't point at the expected agent worktree on the expected branch.

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

### C11b. (deferred — see "Live checkout bringup" at end of Step D)

**REMOVED: auto-kickstart of `com.echo.daemon`.** Earlier versions ran `launchctl kickstart -k` here, on the assumption that merger-worktree-verify implies live-checkout-runnable. That assumption is false whenever the merge bumps `package.json` (and is true for any dep change, not just one): the merger worktree's `npm install` from C5 lives only inside the ephemeral worktree, discarded at C11 cleanup. The live checkout's `node_modules` never gets reconciled. Auto-kickstart against stale `node_modules` crashes the daemon silently — observed 2026-05-16 post-057a merge with the `Ajv is not a constructor` symptom (eslint's transitive ajv@6 hoisted over the ajv@8 the new lockfile required; tests passed in the merger's fresh-install tree).

Daemon bringup is now an explicit founder-in-the-loop step at the end of Step D, after all items in the argument list have been pushed (so the live checkout's `git pull` actually sees the new commits). See the "Live checkout bringup" subsection below.

## Step D — Final summary

After the loop completes, output:

- One line per merged item: id, slug, conflicts hit, fixups applied, fixups deferred, test counts.
- The follow-up queue contents (`backlog/_followups.md`).
- A reminder: *"Strategist conversation: <ids> are now in `complete/`. Their After-Completion sections need to be promoted to `wiki/` next."*

### Wiki promotion (post-merge)

After wiki promotion of an item lands in `wiki/`, convert its `backlog/complete/<id>.md` file to the stub schema and move the full original body to `backlog/archive/shipped/<YYYY-MM>/<id>.md`. The stub schema is documented in `backlog/archive/README.md`.

### Live checkout bringup (authority-in-the-loop, replaces C11b auto-kickstart)

After Step D's summary, ordinary runs surface this exact prompt and wait for founder `continue`. In the scoped echo-context program, the persistent coordinator performs the same commands, records their results, and advances only after the identical health check passes:

> **Live checkout bringup needed.** The merge(s) have landed on origin/main. The live checkout still runs the pre-merge code + dependencies. To make the daemon serve the new code:
>
> ```bash
> cd ~/Desktop/Project_echo
> git pull --ff-only origin main
> # if this merge touched package.json (check `git diff HEAD~ HEAD -- package.json` post-pull):
> npm install
> # if daemon is launchd-managed:
> launchctl kickstart -k "gui/$(id -u)/com.echo.daemon"
> # verify boot (must return 200 with a status payload, NOT 406 / connection-refused):
> bash tools/coord-status.sh uptime
> ```
>
> Reply `continue` when `coord-status.sh uptime` returns a number.

The founder's `continue`, or the scoped coordinator's recorded successful result, is the final gate. The skill does not exit past this gate without it. If `coord-status.sh uptime` fails, surface or record the failure and repair the underlying cause before rerunning. Daemon-boot failures after merge typically indicate a real defect (module-loader interop, lockfile drift, missing dependency) that needs investigation, not blind retry.

If the daemon isn't launchd-managed in this environment (e.g., during a manual `npm run daemon` session), the `launchctl kickstart` line won't apply — founder restarts by hand. The verification check via `coord-status.sh uptime` is the same.

**Why this replaces the old auto-kickstart pattern.** The old C11b was codified post-018/019 to handle "founder forgets to restart daemon". That convenience worked when dep changes were rare. Post-057a (which added ajv) and going forward (coord layer + future deps), silent daemon death on stale `node_modules` is a recurring failure mode. Visible founder-driven bringup is structurally safer than invisible automation that fails when assumptions break. The verification step (`coord-status.sh uptime`) catches not just stale-dep crashes but any daemon-boot regression a merge introduces.

## Failure Modes (and what the command does)

| Situation | What to do |
|---|---|
| Dirty working tree at pre-flight | Refuse; exit 1. Do not auto-stash. |
| Sidecar missing for an id | Refuse; tell the human to run `/review-pending <id>` first. |
| Sidecar verdict is `redo` or `block` | Refuse for that id; suggest the right next action. |
| Conflict in a file *not* mentioned in the sidecar's expected-conflicts list | Pause hard — this is a signal the spec or the agent did something unexpected. Surface and wait. |
| Verify step fails | Pause; do not auto-fix. The human's structural fix becomes part of the merge commit. |
| Pre-merge fixup makes a test go red | Same — don't auto-revert. The human decides whether to keep the fixup with a deeper fix, or drop it to a follow-up. |
| Push rejected | One rebase attempt; if still rejected, surface and stop. |
| Worktree remove fails (chokidar still has handles, etc.) | Retry once after 1s; if still failing, surface — do not `--force`. |
| Branch -d fails (not fully merged) | This is a real signal; do not force-delete. Surface and stop. |
| §C3.5 cross-vendor consult requested by founder or recommended by strategist | OPTIONAL and trigger-driven; never required. Invoke per the §C3.5 recipe; on failure, follow §C3.5 Consult-failure recovery and return to §C3 pause. Record outcome in review_notes (§C6) per the audit-trail contract. |

## What You Must NOT Do

- Do not auto-resolve conflicts.
- Do not skip the verify step.
- Do not commit during a verify pause.
- Do not edit `wiki/`, generated `docs/BACKLOG.md`, or items not in the argument list.
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
- ECHO daemon bringup completed via the post-Step-D founder-in-the-loop pause: founder pulled live to current main, ran `npm install` if package.json was in the diff, restarted the daemon, and confirmed `tools/coord-status.sh uptime` returns a number (not 406 / not connection-refused).
- Tests pass, lint clean, typecheck clean post-merge.
- `backlog/_followups.md` updated with deferred fixups and follow-up items.
- The founder is unblocked to invoke a strategist conversation for wiki promotion.

Now begin. Read the argument list, run pre-flight, acquire the lock, and loop the items in order.
