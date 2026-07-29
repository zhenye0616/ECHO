---
description: Review every item in backlog/pending_review/ in parallel. Spawns one code-reviewer subagent per item; synthesizes a per-item verdict + fixup list + merge-conflict preview; writes a sidecar review plan next to each item; stops for human validation. Read-only EXCEPT for committing+pushing the per-item review sidecars (the skill's deliverable) — closes the /review-pending → /merge-and-cleanup handoff gap per 045 AC6.
---

You are reviewing the agent's pending work for the founder. The founder runs this command in the morning (or whenever pending_review has items) to get a structured verdict before deciding what to merge.

This command is **read-only** in the sense that matters for merge planning: it does not move items between stages, modify item frontmatter, or run git operations beyond committing+pushing the per-item review sidecars (the skill's deliverable). Sidecars become tracked artifacts on `origin/main` so the downstream `/merge-and-cleanup` skill's pre-flight clean-tree check passes without manual founder intervention. Its primary output is human-readable summaries plus the sidecar review plans themselves.

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

## Step B — Dispatch one code-review process per item, in parallel

For each item, dispatch one independent code-review process **concurrently** using your binding's subagent dispatch primitive. Each process must run with a self-contained prompt that does not depend on conversation context — context-shared dispatch defeats parallelism and pollutes per-item evidence.

Concrete dispatch mechanisms differ by binding (see "Binding-specific notes" sections below). The contract those mechanisms must satisfy:

1. Per-item isolation — each process operates on exactly one pending_review item; its writeable surface is scoped to that item's existing per-item worktree, not the main repo or other items' worktrees.
2. Parallelism — all processes start before any completes.
3. Capture-and-survive — each process emits its review into a discrete, durably-addressable artifact (file or returned content). The orchestrator must be able to inspect the artifact even if the process exited non-zero.
4. Concurrency cap — fan-out is bounded (N ≤ 4 on the founder's machine) to avoid CPU saturation when many items are pending.

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
- **What to return.** A structured review (markdown) with sections — exact headings required so the orchestrator can extract them by regex match: **`Verdict`** (one of `merge as-is` | `merge with founder fixups` | `redo before merge` | `block`), **`Acceptance status`**, **`Drift findings`**, **`Design-choice judgments`**, **`Bugs/risks`**, **`Merge-conflict preview`**, **`Suggested fixups`** (split into pre-merge punch list + non-blocking follow-ups), **`Test counts observed`**. Aim for under 1000 words.

Dispatch all per-item processes concurrently — do not serialize them.

## Binding-specific notes — Claude Code

When this skill executes inside a Claude Code session:

- Dispatch primitive: spawn one `superpowers:code-reviewer` subagent per item via the `Agent` tool, with all calls in a single message so subagents run in parallel.
- Each subagent runs in Claude Code's tool-use sandbox; `npm test`, `npm run lint`, `npm run typecheck` run inside its respective worktree directly.
- Per-item review markdown is returned as the subagent's final message; the orchestrator (the parent Claude Code session) consumes it directly from the tool result — no temp files are needed.
- Synced adapter: `.claude/commands/review-pending.md` (byte-identical to canonical `skills/review-pending.md`).

## Binding-specific notes — codex

When this skill executes inside a codex CLI session, the protocol body above (Step A, the per-item prompt template, Step C–E) is unchanged; codex's dispatch primitive is what differs from Claude Code's. This section is operational guidance specific to that primitive.

### Codex skill install

- `tools/install-echo-codex-skills.sh` renders this canonical skill into `~/.codex/skills/ECHO:review-pending/SKILL.md` with Codex-shaped frontmatter. Re-run that installer after editing canonical `skills/*.md`; there is no repo-side Codex adapter snapshot.

### Sandbox semantics (per-child)

- Each per-item child runs as `codex exec --sandbox workspace-write -C "$WORKTREE" --output-last-message "$RUN_DIR/<item-id>.review.md" - < "$PROMPT"`.
- `-C "$WORKTREE"` scopes the child's CWD AND its workspace-write surface to its own per-item worktree at `$HOME/Desktop/Project_echo--<slug>/`, NOT the main repo. The per-item worktree is the disjoint write surface each child needs in order to run `npm install` / `npm test` / `npm run lint` / `npm run typecheck` without racing other children. Parallel children CANNOT race each other's writes because worktree paths are disjoint.
- The main repo (`~/Desktop/Project_echo/`) is OUTSIDE each child's workspace-write surface; per-item sidecar writes happen in the single-threaded orchestrator path (see below), not from children.

### Run-directory + per-child output isolation

- Orchestrator allocates a per-run isolated directory ONCE at fan-out start: `RUN_DIR=$(mktemp -d -t echo-review-pending-XXXXX)` (uses `${TMPDIR:-/tmp}` when `TMPDIR` is unset). Two concurrent `/review-pending` invocations each get their own `RUN_DIR` so per-child output files cannot collide across orchestrators.
- Each child writes:
  - The final response → `$RUN_DIR/<item-id>.review.md` via `--output-last-message` (NOT parsed from stdout — see below).
  - Stdout → `$RUN_DIR/<item-id>.stdout` (diagnostics only).
  - Stderr → `$RUN_DIR/<item-id>.stderr` (diagnostics only).
  - Exit code → `$RUN_DIR/<item-id>.rc`.
- Cleanup is scoped to `RUN_DIR` only: `trap 'rm -rf "$RUN_DIR"' EXIT`. Never a broad glob; another in-flight orchestrator's `RUN_DIR` must be untouched.

### Subprocess wrapping under `set -euo pipefail`

Each per-item child invocation is wrapped so codex's non-zero exit does not terminate the orchestrator before all outputs are durable:

```bash
(
  set +e
  codex exec --sandbox workspace-write -C "$WORKTREE" \
    --output-last-message "$RUN_DIR/$ITEM_ID.review.md" \
    - < "$PROMPT" > "$RUN_DIR/$ITEM_ID.stdout" 2> "$RUN_DIR/$ITEM_ID.stderr"
  echo $? > "$RUN_DIR/$ITEM_ID.rc"
) &
PIDS+=( $! )
```

Parent drains: `for pid in "${PIDS[@]}"; do wait "$pid" || true; done`. The `|| true` prevents `set -e` in the orchestrator from killing it mid-drain when a child's `wait` returns non-zero.

### Why `--output-last-message`, not stdout parsing

codex CLI v0.130.0's stdout interleaves banner + workdir/model metadata + the echoed user prompt + token summary BEFORE the final answer. The per-item prompt contains the same review-section heading names (`Verdict`, `Drift findings`, etc.) as the desired output, so regex extraction from raw stdout would match prompt text as if it were the child's review and silently produce wrong reviews. `--output-last-message` writes ONLY the final response to the named file. Orchestrator parses `<item-id>.review.md` — never `<item-id>.stdout`. Stdout + stderr are kept only as diagnostics, surfaced when a parse fails or `rc≠0`.

### Concurrency cap

Fan-out is bounded by a counting-semaphore gate (`(( running < N ))`) before each child spawn; N ≤ 4 on the founder's machine. Unbounded `&` would saturate CPU on a 10-item review.

### Sidecar write happens in the orchestrator path

Children never write the sidecar. The orchestrator (single-threaded for that step) parses `<item-id>.review.md`, derives `verdict` + structured sections, then writes `backlog/pending_review/<id>.review.md` in the MAIN repo, commits, and pushes via `tools/review-queue/push-with-retry.sh` (same as the Claude Code path). Main-repo writes never race because exactly one orchestrator process performs them.

### Required section headings

Orchestrator extracts the following section headings (level-2 Markdown, `## <heading>`) from each child's `<item-id>.review.md`:

- `Verdict`
- `Acceptance status`
- `Drift findings`
- `Design-choice judgments`
- `Bugs/risks`
- `Merge-conflict preview`
- `Suggested fixups`
- `Test counts observed`

These match what the Claude Code path's `superpowers:code-reviewer` subagent already produces, so sidecar synthesis (Step C) is binding-agnostic.

### Parse-failure semantics — durable evidence preservation

If the child's review file is missing, OR `rc ≠ 0`, OR any required section heading is absent from the file, the orchestrator MUST:

1. **Preserve evidence first** — copy the child's `<item-id>.{stdout,stderr,review.md}` triple to `raw/internal/queue-errors/<ISO-ts>-review-pending-<item-id>/` BEFORE the `RUN_DIR` cleanup trap fires. This gives the operator a durable pointer to inspect what the child actually produced.
2. **Log a queue-errors row** that names the specific missing section headings + `rc` + the first 2KB of stderr inline. This is durable in `queue-errors.md` and visible at next-run pre-flight.
3. **Do not silently drop or substitute defaults.** A child whose review failed parsing is treated as a missing review; the founder gets a "verdict: block (parse failure)" sidecar with a pointer to the preserved evidence directory.

### Dogfooding journaling

Per `CLAUDE.md` "Dogfooding journal discipline", every ECHO MCP call made during a `/review-pending` run is journaled in-the-moment to `raw/internal/dogfooding/mcp-interactions-journal.md` with the 6-field template. The codex orchestrator journals its own calls directly; the codex children journal theirs in-the-moment if they make any (typically they don't — children operate on the worktree filesystem, not MCP).

## Step C — Synthesize and write per-item sidecar plans

For each returned review, write a sidecar file at `backlog/pending_review/<id>.review.md` (next to the item file). This is what `/merge-and-cleanup` will consume.

### Sidecar descriptor and writer invocation

The orchestrator MUST NOT hand-author the committed sidecar frontmatter. It
constructs a structured JSON descriptor from the parsed child review, then calls
the code-owned writer. The descriptor contains only caller-owned fields:

```json
{
  "item_id": "2026-04-30-012-git-capture",
  "verdict": "merge with founder fixups",
  "test_counts": { "passed": 132, "failed": 0 },
  "body": {
    "verdict": "<one paragraph>",
    "pre_merge_fixups": "- [ ] <fixup 1 - file:line - one-sentence rationale>",
    "expected_merge_conflicts": "- `<file>` - <recommended resolution strategy in one sentence>",
    "followups": "- <item description>",
    "open_questions": "<only when verdict is block>"
  }
}
```

`body.open_questions` is required only when `verdict == "block"` and omitted
otherwise. The writer derives the target path from `item_id`, stamps all
writer-owned fields, emits the committed headings consumed by
`/merge-and-cleanup`, validates before publication, and fails closed if the
target already exists unless `--replace` is explicitly supplied by a future
rerun-policy change.

Invocation shape:

```bash
ROOT="$(git rev-parse --show-toplevel)"
DESC=$(mktemp -t echo-review-sidecar-XXXXXX.json)
trap 'rm -f "$DESC"' RETURN 2>/dev/null || true

# Write the parsed review descriptor to $DESC as JSON. Do not include
# writer-owned fields or any target path.

python3 "$ROOT/tools/review-queue/emit-sidecar.py" --input "$DESC"
SIDECARS+=("$ROOT/backlog/pending_review/$ITEM_ID.review.md")
```

The human will read this, optionally edit it (uncheck fixups they want to defer, edit resolution strategy, add notes), then invoke `/merge-and-cleanup`.

### Sidecar commit + push (045 AC6)

After ALL sidecars are written, commit + push each one atomically. The sidecar IS a complete review artifact and benefits from atomic git history; the founder can amend in place via a follow-up commit if edits are needed.

```bash
# SIDECARS is the list of paths written above (one per item).
for SIDECAR in "${SIDECARS[@]}"; do
  SIDECAR_BASE=$(basename "$SIDECAR" .review.md)
  tools/review-queue/validate-sidecar.py "$SIDECAR"
  git add "$SIDECAR"
  git commit -m "review: $SIDECAR_BASE" "$SIDECAR"
  tools/review-queue/push-with-retry.sh "review: $SIDECAR_BASE"
done
```

`push-with-retry.sh` is used in place of `git push origin main || true`. The bare-push-with-swallow pattern would produce a local-only sidecar commit on auth loss, network outage, or rejected push, leaving the strategist's `/merge-and-cleanup` to pass pre-flight locally while the next operator or machine sees no review artifact on origin. `push-with-retry.sh` performs bounded retries, logs to `queue-errors.md` on terminal failure (existing 039+041 contract), and surfaces the failure non-zero — making any push gap visible at /review-pending exit time, not silently at /merge-and-cleanup time.

The helper is invoked **inside the SIDECARS loop**, once per sidecar, using the per-sidecar base name. This is unambiguous for multi-item /review-pending invocations and produces one push-with-retry per review (matches the per-reviewer-response pattern used by `commit-reviewer-response.sh`).

**057b AC7 post-push hook — active trigger for any sidecar that dispatches a new reviewer round.** /review-pending today produces sidecar reviews for `pending_review/<id>.review.md` (a per-item verdict + fixup list, human-merged). It does NOT itself dispatch reviewer-round `request.md` files. If a future extension of /review-pending escalates a sidecar verdict to a per-round reviewer queue (e.g. when the sidecar's verdict is `pushback` and the orchestrator chooses to seed an `r1/request.md` for headless reviewer rounds), the post-push hook below applies. As of 057b, the loop is a no-op when no `r*/request.md` was written during the workflow — the test in `tests/coord/no-pre-push-spawn.test.ts` asserts this contract for `request.py` independently.

```bash
# Iterate any r*/request.md files written during this /review-pending
# session (PUSHED_REQUESTS array captured from the workflow above; empty
# when the workflow only wrote sidecars). For each, call coord_invoke per
# headless reviewer in the request's requested_reviewers. Same Python
# helper as skills/review-queue-watch.md's post-push hook.
for REQ_PATH in "${PUSHED_REQUESTS[@]+"${PUSHED_REQUESTS[@]}"}"; do
  python3 - "$REQ_PATH" <<'PY'
import json, os, sys, urllib.request, yaml
req_path = sys.argv[1]
with open(req_path) as f:
    fm = yaml.safe_load(f.read().split('---')[1])
corr = fm.get('correlation_id')
reviewers = fm.get('requested_reviewers', [])
if not corr or not reviewers:
    sys.exit(0)
with open('tools/review-queue/coord-roles.json') as f:
    roles_cfg = json.load(f)
headless = {r['name'] for r in roles_cfg['roles'] if r.get('headless')}
# URL resolution: ECHO_MCP_URL → ECHO_MCP_PORT → recorded bound_port
# (~/.echo/state/onboarding.json) → package default 38478.
url = os.environ.get('ECHO_MCP_URL')
if not url:
    port = os.environ.get('ECHO_MCP_PORT')
    if not port:
        try:
            with open(os.path.expanduser('~/.echo/state/onboarding.json')) as f:
                port = json.load(f).get('bound_port')
        except (OSError, ValueError):
            port = None
    url = f"http://127.0.0.1:{port or 38478}/mcp"
for role in reviewers:
    if role not in headless:
        continue
    body = {"jsonrpc":"2.0","method":"tools/call","params":{"name":"coord_invoke","arguments":{"role":role,"request_path":req_path,"correlation_id":corr}},"id":1}
    try:
        req = urllib.request.Request(url, data=json.dumps(body).encode(),
            headers={"Content-Type":"application/json",
                     # StreamableHTTPServerTransport 406-rejects MCP POSTs
                     # missing both media types in Accept (r9 codex F1 HIGH).
                     "Accept":"application/json, text/event-stream",
                     "X-Echo-Role":"claude"}, method="POST")
        urllib.request.urlopen(req, timeout=5).read()
    except Exception as e:
        print(f"coord_invoke({role}) failed (best-effort): {e}", file=sys.stderr)
PY
done
```

NO `coord:review_pending_*` emission in 057b (deferred — those event types are not in 057a's registry; adding them requires a follow-on observability spec).

## Step D — Surface a founder-facing summary

After all sidecars are written, output to the conversation:

- A one-line verdict per item (id, verdict, fixup count, conflict count).
- The full text of each review's "Verdict" section, "Suggested fixups", and "Merge-conflict preview" inline (this is what the human reads to decide).
- Path to each sidecar file.
- The exact next command to run, e.g., `/merge-and-cleanup 012 013` — list items in dependency order (earlier-claimed items first, since later branches likely forked from main *before* earlier ones merged and will conflict with them).

End with a clear pause prompt: *"Reply with `/merge-and-cleanup <ids>` to proceed, or edit the sidecar files first, or push back on specific findings."*

## Step E — STOP

Do not move files. Do not modify the item frontmatter. Do not touch `wiki/`, `docs/BACKLOG.md`, or any complete/ items. The only git state changes this skill makes are the per-sidecar commit + push from Step C (045 AC6); everything else stays read-only (`git diff`, `git fetch`).

## Failure Modes

- **`pending_review/` is empty** → exit 0 with "nothing to review."
- **Item's worktree directory is missing** → flag in the summary as "worktree gone — already merged?" and skip that item. Don't dispatch a code-review process for it.
- **Subagent returns verdict `redo before merge`** → write the sidecar, but the summary should highlight that this item is *not* a candidate for `/merge-and-cleanup`. The founder should escalate back to the agent who wrote the work (typically: `git mv` the item back to `claimed/`, message the agent's run log).
- **Subagent returns verdict `block`** → surface the open questions prominently. The founder needs to make a decision before merge can proceed.
- **A subagent fails internally (timeout, error)** → report which item failed, don't attempt to merge it. Founder can re-run `/review-pending <id>` for just that one. For codex children specifically: parse-failure evidence preservation (above) gives the founder the child's stdout/stderr/review.md triple at `raw/internal/queue-errors/...` even if the orchestrator's `RUN_DIR` is gone.
- **Multiple worktrees + parallel sessions** → harmless; each subagent reads its own worktree, no shared state.

## What You Must NOT Do

- Do not move any items between stages.
- Do not modify any item file's frontmatter or body.
- Do not run `npm test` / `npm install` from the main repo root (only the subagents do, inside their respective worktrees).
- Do not commit anything OTHER than the review sidecars themselves (which are the deliverable of this skill). The sidecar commit + push via `push-with-retry.sh` is in-scope per AC6 of spec 045.
- Do not delete worktrees or branches (that's `/merge-and-cleanup`'s job, post-merge).
- Do not "be helpful" by speculating beyond what the code shows — the verdict must be evidence-based.

## What Success Looks Like

- Every item in `pending_review/` has a sidecar `.review.md` file with a verdict, committed and pushed to `origin/main` (one `review: <id>` commit per sidecar, via `push-with-retry.sh`).
- The founder has a single conversation-facing summary they can act on without re-reading individual reviews.
- The exact follow-up command is named.
- No items moved between stages, no item frontmatter modified, no branches touched. The only state changes are the sidecar commits themselves — which `/merge-and-cleanup`'s pre-flight will see as a clean tree.

Now begin. Resolve the item list, dispatch one code-review process per item in parallel using your binding's primitive, and synthesize.
