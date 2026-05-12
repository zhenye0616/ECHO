# Review-queue setup (AC0)

One recipe per reviewer client. Founder runs each recipe once at session-bootstrap time; per AC6b, that bootstrap is **out of scope for the dispatch-message count** (it's session setup, not per-round dispatch).

The polling primitive in each client wakes the canonical reviewer-loop or watcher prompt every 10 minutes; the loop ticks are 1-review-per-tick by construction (see `.claude/commands/review-queue-codex.md` / `-cursor.md` / `-watch.md`).

## Claude Code (strategist watcher + Codex-from-CC + Cursor-from-CC)

`/loop` is a Claude Code CLI built-in. Verified absent as a plugin skill at `.claude/skills/loop` — invoke it via the `Skill` tool inside a Claude Code session.

```text
/loop 10m /review-queue-watch     # strategist's own session
/loop 10m /review-queue-codex     # if running Codex reviews from a CC subagent
/loop 10m /review-queue-cursor    # if running Cursor reviews from a CC subagent
```

The strategist watcher loop **must** be running in the strategist's own Claude Code session for the queue to be dispatch-message-free. The Codex / Cursor reviewer loops normally run in their own clients (below), not in CC.

## Codex CLI

Codex CLI does **not** have a `codex --watch` mode. Use `codex exec` under cron or launchd:

```cron
# crontab -e — every 10 min:
*/10 * * * *  cat ~/Desktop/Project_echo/.claude/commands/review-queue-codex.md \
                | codex exec -C /Users/zhenye/Desktop/Project_echo \
                             --sandbox workspace-write \
                             --ask-for-approval never -
```

The `codex exec` command exits after one queue tick; the scheduler sleeps between invocations. **Do not chase `codex --watch` — it does not exist.**

The `--sandbox workspace-write` flag scopes filesystem writes to the workspace; `--ask-for-approval never` is required so the headless tick does not block waiting for input.

## Cursor IDE — paste-once-self-loop ONLY

Cursor has no native `--watch` mode comparable to `codex exec`. The supported pattern is **paste-once-self-loop**: the founder pastes a long-running prompt at session start; the prompt instructs Cursor to self-loop on a 10-min timer using its own Tool/Agent capabilities.

```text
You are running the Cursor-side review queue loop. Every 10 minutes, execute the body of .claude/commands/review-queue-cursor.md. One review per tick. Stay running.
```

If Cursor cannot self-loop reliably under its own harness, **the manual-paste degradation is the accepted fallback** — founder pastes the canonical reviewer prompt once per round, degrading that one reviewer to pre-queue manual flow. **No automated workaround is supported:** explicit keyboard-automation injection (`cron` or `launchd` daemons that simulate keystrokes) is **explicitly rejected** as a violation of §"Out of Scope" #1 (push-based GUI pinging) in the 039 spec. The queue tolerates one reviewer running manually; it does not tolerate a brittle automation layer pretending to be polling.

## Verification

Each recipe is verified by running it once before any AC6b post-merge dogfooding starts:

- Claude Code `/loop 10m /review-queue-watch` — observe one tick fires within 10 min on an empty backlog/reviews/ tree (it should print `[combine] no rounds to combine`).
- Codex CLI `codex exec` under cron — observe the cron log shows one invocation within 10 min; the invocation's stdout reaches the canonical reviewer prompt body.
- Cursor paste-once-self-loop — paste the prompt, observe it ticks once within 10 min on an empty queue.

If any recipe fails verification, raise as a follow-up item; AC0 success criteria are blocking for AC6b.
