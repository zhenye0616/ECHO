# Review-queue setup

One recipe per reviewer client. Founder runs each recipe once at session-bootstrap time (or once per machine for the Codex launchd job); per the 039 AC6b property, session bootstrap is **out of scope for the dispatch-message count** — it's setup, not per-round dispatch.

The polling primitive in each client wakes the canonical reviewer-loop or watcher prompt every 10 minutes; the loop ticks are 1-review-per-tick by construction (see `.claude/commands/review-queue-codex.md` / `-cursor.md` / `-watch.md`).

Reviewer responses are commit-gated through the canonical validation helper `tools/review-queue/commit-reviewer-response.sh`, which runs `tools/review-queue/validate.py reviewer` against the response file before any `git add`. Malformed responses are quarantined to `<path>.invalid.<ISO-ts>` and a one-line `VALIDATION-FAIL:` entry is appended to `raw/internal/queue-errors.md`; the canonical poll then regenerates the response on the next tick. The validation gate is mechanically unbypassable for any reviewer that uses the canonical commit path — this is the AC4 contract from item 041 and the reason a new reviewer voice (a third Claude API persona, a fresh Codex instance, etc.) just plugs into the same helper and inherits the contract.

## Claude Code (strategist watcher)

`/loop` is a Claude Code CLI built-in. Verified absent as a plugin skill at `.claude/skills/loop` — invoke it via the `Skill` tool inside a Claude Code session.

```text
/loop 10m /review-queue-watch
```

The strategist watcher loop **must** be running in the strategist's own Claude Code session for the queue to be dispatch-message-free. The Codex / Cursor reviewer loops normally run in their own clients (below), not in CC.

## Codex CLI — launchd (primary; macOS)

Codex CLI has no `--watch` mode. The supported activation pattern is a launchd-driven `codex exec` invocation that ticks every 10 minutes via a system-level scheduler — once installed, the founder never types another `codex exec` command for review work.

```bash
# One-time install (creates ~/Library/LaunchAgents/com.echo.review-queue-codex.plist):
tools/review-queue/install-codex-reviewer-launchd.sh

# Install + run a synthetic-request smoke test against an isolated tmpdir
# repo to verify the wrapper end-to-end before relying on it:
tools/review-queue/install-codex-reviewer-launchd.sh --smoke

# Status (launchctl entry + last 10 lines of the log):
tools/review-queue/status-codex-reviewer-launchd.sh

# Uninstall:
tools/review-queue/uninstall-codex-reviewer-launchd.sh
```

The install script writes the plist with `StartInterval=600` (10 minutes), `RunAtLoad=false`, and `KeepAlive=false` (one-shot per tick), uses `launchctl bootstrap gui/<uid>` on macOS Sonoma+ and falls back to `launchctl load -w` on older macOS, and routes the launchd stream captures to `/dev/null` (the wrapper writes a unified log to `~/Library/Logs/echo-review-queue-codex.log` with its own timestamped preamble per tick).

The wrapper itself (`tools/review-queue/run-codex-reviewer.sh`) reads `${ECHO_REVIEW_QUEUE_REPO_ROOT}` (default `~/Desktop/Project_echo`) so launchd-driven ticks operate against the production repo while the smoke test isolates by setting the env var to a tmpdir. The canonical Codex invocation pinned by the wrapper is:

```bash
codex exec -C "$ECHO_REVIEW_QUEUE_REPO_ROOT" --sandbox danger-full-access - < "$ECHO_REVIEW_QUEUE_REPO_ROOT/.claude/commands/review-queue-codex.md"
```

Why these flags:
- `--sandbox danger-full-access` — the prior `workspace-write` setting denied `.git/FETCH_HEAD` writes on macOS and broke every tick. `danger-full-access` is correct for this background reviewer process; the wrapper runs the prompt as a single non-interactive tick under launchd.
- `--ask-for-approval` is **not** passed — the flag does not exist on Codex CLI v0.130.0, and the runtime preamble already defaults headless `codex exec` to `never`.
- `<` redirection rather than `cat | codex exec` — survives shell-paste edge cases the pipe variant does not. See memory note `reference_codex_review_queue_invocation.md`.

`cron` is not the primary recipe on macOS; it is documented here as a fallback for non-macOS founders (untested):

```cron
*/10 * * * *  ECHO_REVIEW_QUEUE_REPO_ROOT=$HOME/Desktop/Project_echo \
              $HOME/Desktop/Project_echo/tools/review-queue/run-codex-reviewer.sh
```

## Cursor IDE — paste-once-self-loop, accept degradation

Cursor has no native `--watch` mode comparable to `codex exec`. **The supported pattern is paste-once-self-loop**: the founder pastes a long-running prompt at session start; the prompt instructs Cursor to self-loop on a 10-min timer using its own Tool/Agent capabilities.

```text
You are running the Cursor-side review queue loop. Every 10 minutes, execute the body of .claude/commands/review-queue-cursor.md. One review per tick. Stay running.
```

### Steady-state property: Cursor ticks only when Cursor is open

Cursor reviewer ticks **only when the founder has Cursor IDE open** with an active Claude chat running the paste-once-self-loop prompt. This is by design — Cursor has no headless mode comparable to `codex exec`; explicit keyboard automation (`cron`/`launchd` daemons that simulate keystrokes) was rejected by the 039 AC0 as a violation of §"Out of Scope" #1 (push-based GUI pinging).

### `single_reviewer_timeout` on a Cursor-absent round is expected, not a defect

When the founder is not actively in Cursor for a round, the watcher's `MISSING_REVIEWER_TIMEOUT_HOURS` (default 2h) escalates the round as `single_reviewer_timeout`. **This is the documented steady-state behavior**, not a system bug. The strategist's call per round:

- (a) continue with Codex-only review for that round, or
- (b) wait for Cursor's next IDE session.

Both are valid. The 039 cross-tool review property **degrades gracefully** to single-reviewer rounds when Cursor is absent; the queue does not stall. Multi-reviewer convergence is **signal** (high confidence when present), not **requirement** (the queue still produces correct results without it).

### Manual paste-per-round is the accepted fallback

If Cursor's self-loop is unreliable in a given session, the founder may paste the canonical reviewer prompt manually once per round — degrading that one reviewer to pre-queue manual flow. This is the same fallback 039 §AC0 already tolerates. No new keyboard automation. No new GUI pinging.

## Verification

After install, verify each recipe by running it once before relying on the queue:

- **Claude Code** `/loop 10m /review-queue-watch` — observe one tick fires within 10 min on an empty `backlog/reviews/` tree (it should print `[combine] no rounds to combine`).
- **Codex launchd** — `install-codex-reviewer-launchd.sh --smoke` runs an isolated synthetic-request smoke test that asserts the wrapper produced a valid `codex.md`, the helper committed it through `commit-reviewer-response.sh`, and the smoke repo never touched the production GitHub origin. Hard isolation assertions (remote URL equality, single-remote, no production URL in `.git/config`) make the isolation deterministic, not best-effort. Pinned synthetic item_id: `2026-05-12-999-smoke-test-synthetic`.
- **Cursor paste-once-self-loop** — paste the prompt, observe it ticks once within 10 min on an empty queue.

If any recipe fails verification, raise as a follow-up; the verified recipes are blocking for any post-merge dogfooding cycle that relies on the queue.

## Reviewer-prompt contract — `get_atom` parameter name

The MCP `get_atom` tool's parameter is `id`, not `atom_id`. Reviewer prompts and any forward-looking guidance should call it as:

```text
get_atom({id: <atom-id-value>})
```

Older docs and examples occasionally used `get_atom({atom_id: ...})`; that shape returns an MCP `-32602` argument-validation error and must not be propagated. (`get_atoms` — plural — does take `atom_ids` — plural — and is unaffected.)
