---
description: Strategist watcher tick. One eligible round per tick. Runs combine.py, escalates to founder if {proceed*, pushback} boundary is crossed (or single_reviewer_timeout / no_responses), otherwise autonomously dispositions findings, applies patches inline, and either declares convergence or runs request.py for the next round.
---

You are running one tick of the **strategist** watcher loop. Invoked from the strategist's own Claude Code session via `/loop 10m /review-queue-watch`. **Do not chain reasoning across ticks.** One eligible round per tick — exit and wait for the next loop fire.

## Step 0 — Pre-flight worktree hygiene + create ephemeral worktree (050 AC2)

The entire post-`combine.py` work (disposition patches, `dispatch-next-round.py` for r<N+1>, journal append, commit + push) is multi-step writes to `main` — three to four distinct commits before the tick exits. Per the 050 architectural invariant, none of those writes touch the founder's live `main` checkout. The tick runs inside `$TMPDIR/echo-watcher-<uuid>`.

```bash
# Anchor on the production repo first for pre-flight hygiene.
cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}"

# Pre-flight (order matters)
git worktree prune || true
REGISTERED_WT=$(git worktree list --porcelain | awk '/^worktree /{print $2}')
# GC unregistered $TMPDIR/echo-* orphans older than 60 min; registered ones
# (active merger conflict-pauses, crashed registered survivors) are skipped
# regardless of mtime — 050-followup-F handles crashed cleanup separately.
if [ -n "${TMPDIR:-}" ] && [ -d "$TMPDIR" ]; then
  while IFS= read -r -d '' orphan; do
    if printf '%s\n' "$REGISTERED_WT" | grep -Fxq "$orphan"; then continue; fi
    rm -rf -- "$orphan" || true
  done < <(find "$TMPDIR" -maxdepth 1 -type d -name 'echo-*' -mmin +60 -print0 2>/dev/null)
fi

# Create the ephemeral, detached-HEAD worktree pinned to origin/main.
git fetch origin main
[ -n "${TMPDIR:-}" ] || { echo "TMPDIR unset; cannot place ephemeral watcher worktree"; exit 1; }
WT="$TMPDIR/echo-watcher-$(uuidgen)"
git worktree add --detach "$WT" origin/main

# Unified ERR/EXIT cleanup trap. No push-failure-specific preservation;
# uniform lost-work-on-failure semantics per the 050 architectural invariant.
cleanup() {
  local rc=$?
  cd "${ECHO_REVIEW_QUEUE_REPO_ROOT:-$HOME/Desktop/Project_echo}" 2>/dev/null || true
  if [ -n "${WT:-}" ] && [ -d "$WT" ]; then
    git worktree remove --force "$WT" 2>/dev/null || true
  fi
  git worktree prune 2>/dev/null || true
  return $rc
}
trap cleanup EXIT
trap 'cleanup; exit 1' ERR INT TERM

# Route the rest of the tick through the worktree.
cd "$WT"
export ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"
```

`dispatch-next-round.py`, `combine.py`, and `push-with-retry.sh` are CWD-agnostic by construction (they use `git rev-parse --show-toplevel` / process-relative paths), so running them from `$WT` works without modification.

## Step 1 — Pull origin/main first

```bash
# Already in $WT from Step 0. Pull to fast-forward the detached HEAD onto any
# commits that landed on origin/main between Step 0's fetch and now.
git -c rebase.autoStash=true pull --rebase origin main
# Surface unpushed work / queue errors (push-with-retry.sh fallback target)
tail -n 5 raw/internal/queue-errors.md 2>/dev/null || true
```

(Steady-state: `ECHO_REVIEW_QUEUE_REPO_ROOT` is unset in the strategist's own Claude Code session → Step 0 anchors on the production repo, then sets `ECHO_REVIEW_QUEUE_REPO_ROOT="$WT"` for the rest of the tick. The 041 reviewer wrapper script + AC5 smoke set it explicitly so the launchd reviewer ticks and tests use the right tree. Strategist watcher ticks always run against production but write inside the ephemeral worktree.)

The tail surfaces any push-race fallbacks since the last tick so you can flag them in this turn's narration if action is needed. The file itself is repo-tracked, append-only, and uses the `.md` extension to avoid `*.log` gitignore.

## Step 1.5 — Recover terminal promotions + stale ready bounces

Before combining a new round, converge any already-terminal proposed-stage state from disk:

```bash
tools/review-queue/promote.py recover --mode=commit-push
tools/review-queue/promote.py bounce-stale-ready --mode=commit-push
```

If either command prints `promoted:` or `bounced:`, exit this tick after confirming the push. The helper owns its commit+push and remote-boundary check in `commit-push` mode, so the next watcher tick resumes from the now-durable `origin/main` state. This pre-step is intentionally stricter than "combined.md exists": `promote.py` promotes only TERMINAL-PROMOTABLE rounds (no unresolved `_strategist fills_`, `escalated_to_founder: false`, `next_round: null`, a `claim-ready after R<N>` convergence call, and no `r<N+1>/request.md`). A merely combined but undispositioned round must not promote.

## Step 2 — Run combine.py for one eligible round

```bash
tools/review-queue/combine.py
```

Default mode is one-round-per-tick — `combine.py` processes at most one newly-eligible round, writes its `combined.md`, commits + pushes via `tools/review-queue/push-with-retry.sh`, then exits.

If output is `[combine] no rounds to combine`, exit cleanly — there is nothing for the watcher to do this tick.

Otherwise the script prints the path to the newly-written `combined.md`. Capture that path.

## Step 3 — Branch on combined_verdict + escalation flag

Read the just-written `combined.md`'s frontmatter:

- **`escalated_to_founder: true`** — verdict is `divergent` (verdicts crossed `{proceed*, pushback}` boundary) OR `partial_responses` with multi-missing OR any-pushback-with-missing (043 AC6 rename; legacy `single_reviewer_timeout` still appears on pre-043 rounds in `complete/`) OR `no_responses`. Append a journal entry citing the queue path; **exit**. The founder will see and act on next session. You do NOT attempt to adjudicate divergence — that is the §"Out of Scope" #7 boundary. For N-reviewer rounds (043 AC6 generalized roll-up), `partial_responses` body enumerates which reviewers landed and which are missing; the founder uses that to decide whether to wait, escalate, or accept the partial set.

- **`escalated_to_founder: false`** — verdict is within `{proceed, proceed_after_patches, pushback}` (no boundary cross) OR `partial_responses` with exactly one required reviewer missing AND every present reviewer in `{proceed, proceed_after_patches}` (044 AC4 single-reviewer auto-disposition). You autonomously disposition findings after the Step 3 reframe gate. For the 044 AC4 auto-disposition sub-case, the missing reviewer appears as a divergent row with `where: "did not respond; per 044 AC4 single-reviewer auto-disposition"` and `finding: "did not respond; per 044 AC4 single-reviewer auto-disposition"` (the prose and the emitter literal at `tools/review-queue/combine.py:684` are kept aligned per 045 AC4); after the reframe gate, fill its `Disposition` column the same way you'd fill any other divergent row (typically `accepted as missing per 044 AC4 — no patch`), then follow the standard path-(a)/(b)/(c) selection on the rest of the table.

### Step 3 — Disposition (only on the not-escalated branch)

Before filling any `Disposition` column, apply the disposition discipline below, starting with the reframe gate. Once the reframe gate is bypassed, completed, or recorded, fill each row in the convergent and divergent tables in the just-written `combined.md` with your judgment of the spec direction. Then commit the disposition update via `push-with-retry.sh`:

```bash
git add backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: disposition on <item_id>"
tools/review-queue/push-with-retry.sh "disposition: r<N> on <item_id>"
```

After the gate-aware disposition pass, decide which branch fires. The file mutations for all three branches are a single helper invocation; the watcher then runs one branch-specific git block.

#### Terminal proposed-stage promotion for claim gating (paths a and c)

For terminal paths, the watcher is the actor that makes a reviewed proposed spec claimable. Immediately before the terminal commit, inspect the current round's `request.md` `artifact_path`:

- If it starts with `backlog/proposed/`, run:

  ```bash
  tools/review-queue/promote.py promote <item_id> --round <N> --mode=stage-only
  TERMINAL_SPEC_PATH="backlog/ready/<item_id>.md"
  ```

  `promote.py` verifies the TERMINAL-PROMOTABLE predicate, compares normalized current proposed content with the file at `request.spec_commit_sha`, stamps `ready_content_sha`, and performs `git mv proposed→ready` without committing. Fold `TERMINAL_SPEC_PATH` into the same terminal commit as `combined.md`; do not create a separate promote-only commit on the convergence path.

- If it does not start with `backlog/proposed/`, set `TERMINAL_SPEC_PATH` to the current artifact path and proceed with the terminal commit. There is no alternate review-marker write path; post-088 claimability is represented by folder location plus a `ready_content_sha` seal.

Proposed-stage path (c) is structurally cut: `dispatch-next-round.py` routes `verdict=proceed_after_patches` + `--patches-applied=false` to branch (b) for proposed artifacts, so a content-patched proposed spec always gets a verification round before promotion. Branch (c) remains available only for non-proposed artifacts.

#### Disposition discipline — prefer removal over deeper patching when findings target any prior-round patch

Reframe gate: after `combine.py` writes `combined.md` and `escalated_to_founder: false` is confirmed, but before any `Disposition` column is filled, classify actionable findings in the convergent and divergent tables using the same "prior-patch-introduced" primitive defined below: a finding targets a prior-round patch when its `where:` lines fall inside any prior-round `spec-r*-patches` commit for this item, or reviewers converge on bugs in a mechanism that did not exist before that round. The lookback window is any patch commit between the spec's first-ready commit and this round's `spec_commit_sha`, excluding this round's commits. This broader rule still does not fire for findings targeting original spec text or original load-bearing mechanisms; only patch-introduced mechanisms count. Exclude missing-reviewer placeholder rows and pure non-actionable deferrals.

If count >= 2, the strategist MUST run a fresh-context investigator before disposition:

```bash
codex exec --sandbox read-only <<'PROMPT'
You are a fresh-context ECHO review-queue root-cause investigator.

Context:
- Item: <item_id>, round r<N>
- Current combined review artifact: backlog/reviews/<item_id>/r<N>/combined.md
- Current request: backlog/reviews/<item_id>/r<N>/request.md
- Current spec path and pinned SHA: <spec_path> @ <spec_sha>
- Prior patch commits under review: <all prior-round spec-r*-patches commits for this item in the broad lookback window>
- Founder context, if any: <paste last 1-2 founder messages relevant to disposition>

Question:
At least two current findings appear to target prior-round patches. Determine whether the next move should be a local text patch, a structural cut/removal, or propagation completion.

Return exactly:
kind: text_patch | structural_cut | propagation_completion
justification: <why this is root-cause, not patch-on-patch drift>
diagnostic_check: <falsifiable check the strategist must apply before patching>
recommended_disposition: <row-level disposition guidance>
patch_shape: <minimal spec change shape, or "none">
risk: <main way this recommendation could be wrong>
PROMPT
```

The strategist consumes this as validate-and-apply, not rubber-stamp: check it against the spec contract, founder instructions, and current file facts. If overriding the recommendation, record why in `combined.md`. In all trigger cases, add a compact `Reframe gate:` note to `combined.md` before row dispositions so the audit trail exists.

Bypass is allowed only when every prior-patch-targeting finding is a purely mechanical typo/lint/format correction with no state, behavior, owner, test, schema, enum, frontmatter, or AC-semantics effect. If findings are mixed, do not bypass. Fewer than two such findings must not trigger this mandatory investigator; the added cost, roughly money plus about 5 minutes wallclock, is founder-approved only when >=2 patch-on-patch findings would otherwise risk 1-3 wasted review rounds.

Composition with Friction A: this reframe gate fires first, before any disposition including removal. If the chosen disposition uses removal language, the removal proof matrix still fires before committing that disposition.

Backward compatibility: future watcher ticks only; do not revalidate historical `combined.md`.

Test/audit: prose-enforced now. Later, a `tools/review-queue/check-reframe-gate.py` could read just-combined `combined.md`, count recent-patch-introduced findings, and refuse disposition unless a `Reframe gate:` artifact exists.

Before committing to a patch, check whether the finding is targeting **mechanism a prior round's patch added** vs. mechanism the original spec had. If it's the former — i.e. this round's findings are bugs in any prior-round patch — strongly prefer **removing the prior-round mechanism** over patching deeper.

The signal: a finding is most likely "prior-patch-introduced" when (a) its `where:` lines all fall inside the diff range of any prior-round `spec-r*-patches` commit, OR (b) multiple reviewers converge on bugs in one mechanism that didn't exist before the prior-round patch that introduced it. 077 r10 is the canonical broad-window case: three findings targeted stale text accumulated across r4-r9 patch commits, so the gate fires under the broad reading even though only one finding targets r9 alone. In that case, ask whether the prior round's reviewer actually required the mechanism, or whether it was your interpretation of a softer ask (e.g. "perf fixture OR runtime warning" → you added both → the warning has bugs).

Concrete win condition: a removal-only `spec-r<N>-patches` commit typically converges in r<N+1>. A patch-deeper commit typically introduces r<N+1>'s findings.

Worked examples (from 057a):

- **r4**: r3 added a time-bound horizon optimization (`getCoordSequenceAtOrAfter(timestamp)`) to bound boot-replay cost. r4 reviewers found the time-bound was unsafe under skewed `emitted_at`. Disposition: drop the time bound entirely; V1 does full-ledger replay (substrate volume is small enough). One method removed from the seam. r5 had zero storage-seam findings.
- **r6**: r5 added a runtime volume-threshold warning that emitted a `coord:scheduler_health` atom. r6 reviewers found 3 bugs in it (wrong metric, wrong atom shape, not visible in status). Disposition: drop the warning mechanism entirely; the AC8 perf fixture alone is the V1 contract (which was the original reviewer's "perf fixture OR warning" alternative). r7 had zero warning-path findings.

The check is a forcing function against [recently-added mechanism becoming the new bug surface]. It does NOT apply when findings target the original AC text or load-bearing mechanism — those need real patches. Distinguish: "this mechanism didn't exist a round ago" (likely-removable) vs. "this mechanism is in the original spec contract" (must-patch).

Removal proof matrix: when the signal above fires and the proposed disposition uses removal language (`remove`, `drop`, `cut`, or `mechanism dropped`), before committing any disposition that claims removal, fill a compact matrix in the `combined.md` disposition text or adjacent rationale:

- `state_removed`: what persisted state/config/schema/enum/frontmatter field is deleted or made unreachable.
- `behavior_removed`: what runtime/user-visible behavior no longer exists.
- `owners_removed`: which source/UI/tooling owners are removed from `files_to_modify` or no longer responsible.
- `tests_removed_or_changed`: which tests are deleted, narrowed, or changed to assert absence instead of replacement behavior.
- `remaining_invariants`: what contract still remains after removal.

Failure-mode check: if `remaining_invariants` contains a new compensating contract, or any of `state_removed`, `behavior_removed`, or `owners_removed` is false/empty, the patch is not removal. It is relabeling/deeper patching and must be dispositioned as such, or replaced with a true structural cut.

Detection logic: this rule fires when a finding targets a recent-round patch per the signal above and the proposed disposition uses removal language. Keep `files_to_modify` cardinality as a smell only: if cardinality grows or stays flat, assume relabeling until the matrix proves otherwise; if it shrinks, still require the matrix because a bad patch can reduce file count while preserving behavior under a new name. The richer catch is: does any replacement behavior/state/owner/test remain? Example: "disable Cmd-R on Recap sessions" fails because behavior remains and shifts ownership to `SessionsList.tsx`/`SessionDetail.tsx`; "drop persistence entirely" passes if state, behavior, owners, and tests disappear or become absence checks.

Backward compatibility: this has no effect on old `combined.md` files or completed runs. This is watcher prose for future disposition commits only; historical review artifacts are immutable evidence, not revalidated.

Test/audit: enforce by prose now. `combine.py` cannot know intended behavioral removal. A later lint could grep new `combined.md` disposition rows containing removal verbs and require the five matrix labels, but that is worth a separate spec only after this misses again.

If you choose removal, the dispatch helper invocation is still `--patches-applied=true` because the spec changed; the change just happens to be a deletion. Removal is only valid after the matrix passes; then the disposition column should say `accepted — mechanism dropped` plus the matrix summary.

#### (a) Zero patches applied → convergence

Verdict was `proceed` with no actionable findings, OR a `pushback` where all findings deferred to follow-ups outside this round. No spec changes need verifying.

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict={proceed,pushback} --patches-applied=false \
  --class=<request.class> --focus-hints=""
git add "$TERMINAL_SPEC_PATH" backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: terminal on <item_id>"
tools/review-queue/push-with-retry.sh "terminal: r<N> on <item_id>"
```

#### (b) Patches applied → verification round (DEFAULT for any spec change)

Apply the patches to the spec file inline FIRST, then commit the spec patch via `push-with-retry.sh` so the patched commit is what r<N+1> pins via `--spec-sha`. Then run the helper followed by the dispatch git block:

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict=proceed_after_patches --patches-applied=true \
  --class=<request.class> \
  --focus-hints="Verify: <list each load-bearing finding's section + the disposition's prescription + any falsifiable claim worth re-checking>"
git add backlog/reviews/<item_id>/r<N>/combined.md \
        backlog/reviews/<item_id>/r<N+1>/request.md
git commit -m "review-r<N+1>: dispatch on <item_id>"
tools/review-queue/push-with-retry.sh "dispatch: r<N+1> on <item_id>"
```

The helper invokes `request.py` to write `r<N+1>/request.md`, then in-place atomic-updates `r<N>/combined.md` to set `next_round: <N+1>`. **This is the default branch.** Accepted-without-follow-ups is **orthogonal** to whether patches need verification.

**057b AC7 post-push hook — active trigger for r<N+1> reviewers.** After `push-with-retry.sh` succeeds (the new request.md is now on `origin/main`), call `coord_invoke` for each headless reviewer in `r<N+1>/request.md`'s `requested_reviewers`. This is the only legitimate `coord_invoke` call site in the watcher tick. `coord_invoke` is best-effort (daemon-down does not abort the queue tick — the launchd-fallback wrapper still runs on its 10-minute cadence as a redundant path). 057b scope is reviewer-role active trigger ONLY; builder/merger/watcher event-type emission is deferred to a follow-on observability spec per r1 codex-ops F4 MED.

```bash
# Read the new round's request.md (just pushed) to discover its
# correlation_id + requested_reviewers + headless flag per role.
REQ_PATH="backlog/reviews/<item_id>/r<N+1>/request.md"
python3 - "$REQ_PATH" <<'PY'
import json, subprocess, sys, urllib.request, yaml, os
req_path = sys.argv[1]
with open(req_path) as f:
    fm = yaml.safe_load(f.read().split('---')[1])
corr = fm.get('correlation_id')
reviewers = fm.get('requested_reviewers', [])
if not corr or not reviewers:
    print('no correlation_id or roster — skipping coord_invoke', file=sys.stderr)
    sys.exit(0)
# Load coord-roles.json to identify headless reviewers (skip cursor's
# IDE-mode entry — it has no wrapper).
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
    body = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "coord_invoke",
            "arguments": {
                "role": role,
                "request_path": req_path,
                "correlation_id": corr,
            },
        },
        "id": 1,
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode(),
            headers={
                "Content-Type": "application/json",
                # StreamableHTTPServerTransport content-negotiates and
                # 406-rejects MCP POSTs missing both media types in
                # Accept. Without this, the active-trigger silently falls
                # back to launchd cadence. (r9 codex F1 HIGH.)
                "Accept": "application/json, text/event-stream",
                # 057b active-trigger calls are strategist-initiated; tag
                # the request with the strategist role so 057a's identity
                # gate accepts the coord_invoke. Future: a dedicated
                # strategist role + per-tool ACL.
                "X-Echo-Role": "claude",
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5).read()
    except Exception as e:
        print(f"coord_invoke({role}) failed (best-effort): {e}", file=sys.stderr)
        # Non-fatal — launchd-fallback still fires on its cadence.
PY
```

NO `coord:round_combined` emission in 057b (deferred per r1 codex-ops F4 MED — that event type is not in 057a's registry and `coord_emit` would silently reject it; rather than mid-flight-amend 057a's registry, defer the watcher observability surface to a follow-on spec).

#### (c) Patches applied — verification explicitly waived (rare)

Strategist's-call when patches are mechanical (typo fixes, comment-only changes, link updates) AND no reviewer requested a verification round AND no finding was load-bearing. **Use sparingly** — when in doubt, run a verification round.

```bash
tools/review-queue/dispatch-next-round.py <item_id> <N> \
  --verdict=proceed_after_patches --patches-applied=false \
  --class=<request.class> --focus-hints="<one-line rationale for waiving verification>"
git add "$TERMINAL_SPEC_PATH" backlog/reviews/<item_id>/r<N>/combined.md
git commit -m "review-r<N>: terminal on <item_id>"
tools/review-queue/push-with-retry.sh "terminal: r<N> on <item_id>"
```

The helper appends a `verification waived; rationale: <focus-hints>` line into the body of `combined.md` and leaves `next_round: null`.

**Helper / watcher boundary.** `dispatch-next-round.py` performs file mutations only — it never runs `git add`, `git commit`, or `git push`. The per-branch git block above stages and commits the artifacts that actually exist. The two block shapes (dispatch vs. terminal) are not collapsible: `git add` against a non-existent path errors with non-zero exit on (a)/(c), and the commit/push messages must align with the branch's actual state so `git log --grep` matches.

## Step 4 — Exit

One round per tick. The watcher does not batch rounds; serializing rounds across ticks keeps the tick body deterministic.

**050 cleanup ordering.** All work in Steps 2–3 executes inside `$WT` (the ephemeral worktree created in Step 0). The commits + pushes happen inline within each branch's git block; by the time this prompt returns, every artifact has been pushed to `origin/main`. The Step 0 ERR/EXIT trap then runs `git worktree remove --force "$WT"` + `git worktree prune` in `${ECHO_REVIEW_QUEUE_REPO_ROOT:-…}`, discarding the worktree. There is no work that should persist locally past tick exit — the founder's live checkout sees the watcher's outputs only via `origin/main`.

(Builder note: `combine.py --all` is available for one-shot batch processing outside the `/loop` body. The watcher-driven path is one-round-per-tick.)
