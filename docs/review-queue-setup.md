# Review-queue setup

One recipe per reviewer client. Founder runs each recipe once at session-bootstrap time (or once per machine for the Codex launchd job); per the 039 AC6b property, session bootstrap is **out of scope for the dispatch-message count** — it's setup, not per-round dispatch.

The polling primitive in each client wakes the canonical reviewer-loop or watcher prompt every 10 minutes; the loop ticks are 1-review-per-tick by construction (see `.claude/commands/review-queue-codex.md` / `-cursor.md` / `-watch.md`).

Reviewer responses are commit-gated through the canonical validation helper `tools/review-queue/commit-reviewer-response.sh`, which runs `tools/review-queue/validate.py reviewer` against the response file before any `git add`. Malformed responses are quarantined to `<path>.invalid.<ISO-ts>` and a one-line `VALIDATION-FAIL:` entry is appended to `raw/internal/queue-errors.md`; the canonical poll then regenerates the response on the next tick. The validation gate is mechanically unbypassable for any reviewer that uses the canonical commit path — this is the AC4 contract from item 041 and the reason a new reviewer voice (a third Claude API persona, a fresh Codex instance, etc.) just plugs into the same helper and inherits the contract.

For codex and codex-ops, the helper is now invoked by the wrapper, not the AI child. The child runs read-only, reasons over a wrapper-prepared packet, and emits review markdown through structured stdout. `_run_reviewer.sh` validates that captured content, writes the canonical `<reviewer>.md`, calls `commit-reviewer-response.sh`, pushes the response, emits the coord lifecycle, and journals the completed tick. Claude and Cursor remain on their existing publication model until the successor migration.

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

The install script shipped in item 041 writes the plist with `StartInterval=600` (10 minutes), `RunAtLoad=false`, and `KeepAlive=false` (one-shot per tick), uses `launchctl bootstrap gui/<uid>` on macOS Sonoma+ and falls back to `launchctl load -w` on older macOS, and routes the launchd stream captures to `/dev/null` (the wrapper writes a unified log to `~/Library/Logs/echo-review-queue-codex.log` with its own timestamped preamble per tick).

The driver (`tools/review-queue/run-codex-reviewer.sh`) delegates to `tools/review-queue/_run_reviewer.sh`, which reads `${ECHO_REVIEW_QUEUE_REPO_ROOT}` (default `~/Desktop/Project_echo`) so launchd-driven ticks operate against the production repo while the smoke test isolates by setting the env var to a tmpdir. Since item 050, the wrapper does **not** run Codex in the founder's live checkout and does not use any sentinel-file lock. Each tick performs `git fetch origin main`, creates a detached ephemeral worktree at `$TMPDIR/echo-codex-<uuid>` pinned to `origin/main`, resolves the reviewer child argv and prompt stdin path from `tools/review-queue/reviewer-bindings.json`, routes Codex into that worktree via CWD + `ECHO_REVIEW_QUEUE_REPO_ROOT` + stdin prompt path + `codex -C`, and removes the worktree on exit. The live checkout's `.git/index` is not a reviewer write surface.

`tools/review-queue/reviewer-bindings.json` is the canonical invocation source for headless reviewer children. The prompt path is not an argv element; the binding's `stdin_from` path is redirected onto the child's stdin. The canonical raw Codex invocation shape for codex and codex-ops is:

```bash
argv=(codex exec -C "$WT" --sandbox read-only --json -)
stdin_from="$WT/.claude/commands/review-queue-codex.md"
"${argv[@]}" < "$stdin_from" > "$capture_stdout" 2> "$capture_stderr"
```

Inside the launchd wrapper, `$WT` is the ephemeral worktree, not the live checkout.

Why these flags:
- `--sandbox read-only` — the AI child reads and reasons only. It cannot write the canonical review artifact or commit/push even if prompt prose regresses.
- `--json` — stdout is a structured event stream. The wrapper parses the final assistant-message event as the review payload; raw stdout/stderr remain diagnostics only.
- `--ask-for-approval` is **not** passed — the flag does not exist on Codex CLI v0.130.0, and the runtime preamble already defaults headless `codex exec` to `never`.
- `<` redirection rather than `cat | codex exec` — survives shell-paste edge cases the pipe variant does not. See memory note `reference_codex_review_queue_invocation.md`.
- commit/push capability lives in `_run_reviewer.sh` and `commit-reviewer-response.sh`, not in the child. Terminal capture failures write a durable `<reviewer>.capture-failed` marker plus a bounded `queue-errors.md` diagnostic before the ephemeral worktree is cleaned up.

### Manual force-fire — direct-invoke the wrapper driver

The unattended cron pathway above is the steady-state recipe. If the strategist needs to force a reviewer tick *between* the 10-minute `StartInterval` slots (e.g., after pushing a new round's `request.md`), invoke the per-reviewer wrapper driver directly with `nohup` and a log redirect — bypassing launchd entirely for the manual case.

```bash
nohup tools/review-queue/run-codex-reviewer.sh \
  >> /tmp/review-queue-codex-$(date +%s).log 2>&1 &
```

Equivalent recipes for the other headless reviewers (substitute the per-reviewer driver):

```bash
nohup tools/review-queue/run-codex-ops-reviewer.sh \
  >> /tmp/review-queue-codex-ops-$(date +%s).log 2>&1 &
```

Why direct-invoke and not the launchd-side per-job kickstart command: the launchd-kickstart form increments the job's `runs` counter but the wrapper exits before the launchd-captured stream opens for write, so the kickstart appears successful while no actual review tick happens. The direct-invoke pattern bypasses the scheduler entirely for manual fires and writes its log to `/tmp/`; the regular wrapper log at `~/Library/Logs/echo-review-queue-<slug>.log` continues to capture unattended cron-fired ticks. The cron-fired `StartInterval=600` pathway is untouched.

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

## Adding a 3rd reviewer (043 AC2 + AC3 + 087)

The reviewer roster is sourced from `tools/review-queue/reviewers.json`; child invocation argv is sourced from `tools/review-queue/reviewer-bindings.json`; the explicit `reviewer` enums in the JSON schemas remain intentionally enumerated. Adding a new reviewer (e.g., a second Codex variant with an architectural-review prompt called `codex-arch`) is **6 file edits + 1 install invocation** for headless reviewers, **6 file edits** for IDE reviewers:

| # | File | Edit |
|---|---|---|
| 1 | `tools/review-queue/reviewers.json` | Append one row: `{"name": "X", "mode": "headless"\|"ide", "required": true\|false, "timeout_hours": null\|<positive number>, "slash_command": "review-queue-X"}` |
| 2 | `tools/review-queue/reviewer-bindings.json` | Append one invocation binding. Headless reviewers use `mode: "headless-cli"`, an argv array, `stdin_from`, `cwd`, current `agent_sandbox`, current `commit_policy`, and committed-file capture metadata. IDE reviewers use `mode: "ide-manual"` and no argv/stdin/cwd. |
| 3 | `tools/review-queue/schemas/request.schema.json` | Append `"X"` to `requested_reviewers.items.enum` |
| 4 | `tools/review-queue/schemas/reviewer.schema.json` | Append `"X"` to BOTH enums: top-level `reviewer` enum AND `findings[].cross_ref.reviewer` enum |
| 5 | `tools/review-queue/schemas/combined.schema.json` | Add `"X_response": { "type": ["string", "null"] }` under `properties`. Schema's `additionalProperties: false` is preserved. |
| 6 | `.claude/commands/review-queue-X.md` | New file; mirror `review-queue-codex.md`'s structure with the reviewer-perspective-specific prompt body. |

For **`mode: headless`** reviewers, then run:

```bash
# Create the 5-line driver wrapper:
cat > tools/review-queue/run-X-reviewer.sh <<'EOF'
#!/usr/bin/env bash
exec env REVIEWER_NAME=X "$(dirname "$0")/_run_reviewer.sh"
EOF
chmod +x tools/review-queue/run-X-reviewer.sh
git update-index --chmod=+x tools/review-queue/run-X-reviewer.sh

# Install the launchd job (mirrors install-codex-reviewer-launchd.sh):
cat > tools/review-queue/install-X-reviewer-launchd.sh <<'EOF'
#!/usr/bin/env bash
exec "$(dirname "$0")/_install_reviewer_launchd.sh" X "$@"
EOF
chmod +x tools/review-queue/install-X-reviewer-launchd.sh
git update-index --chmod=+x tools/review-queue/install-X-reviewer-launchd.sh

# Run once to install + verify:
tools/review-queue/install-X-reviewer-launchd.sh --smoke
```

For **`mode: ide`** reviewers, no launchd plumbing is needed. The user invokes `/review-queue-X` in the IDE on demand, the same way Cursor is invoked today.

Schemas stay explicit (no `patternProperties`) — adding a reviewer touches one enum line per schema, but the validator contract stays as crisp as the day it was written. See `backlog/complete/2026-05-13-043-per-round-reviewer-roster.md` for the design rationale (Codex pushback R1 HIGH #5).

## Reviewer-prompt contract — `get_atom` parameter name

The MCP `get_atom` tool's parameter is `id`, not `atom_id`. Reviewer prompts and any forward-looking guidance should call it as:

```text
get_atom({id: <atom-id-value>})
```

Older docs and examples occasionally used `get_atom({atom_id: ...})`; that shape returns an MCP `-32602` argument-validation error and must not be propagated. (`get_atoms` — plural — does take `atom_ids` — plural — and is unaffected.)
