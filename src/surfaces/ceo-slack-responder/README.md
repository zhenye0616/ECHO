# CEO Slack Responder

Validation-only Slack Socket Mode responder for the eng-to-CEO context loop.

## Configuration

- `ECHO_SLACK_APP_TOKEN` or `SLACK_APP_TOKEN`: Slack Socket Mode app token.
- `ECHO_SLACK_BOT_TOKEN` or `SLACK_BOT_TOKEN`: Slack bot token for threaded replies.
- `ECHO_CEO_CONTEXT_REPO_PATH`: absolute path to the scoped context repo. Brain invocations run with this as cwd and the prompt pins ECHO MCP calls to this path.
- `ECHO_CEO_SLACK_CHANNEL_IDS`: optional comma-separated channel allowlist. Direct messages are accepted without this list.
- `ECHO_CEO_EVENT_LOG_PATH`: optional usage log path. Defaults to `raw/internal/ceo-loop-events.md`.
- `ECHO_CEO_BRAIN`: `codex` or `claude`. Defaults to `codex`.
- `ECHO_CEO_BRAIN_TIMEOUT_MS`: hard brain timeout in milliseconds. Defaults to `180000`.

## Brain Preflight

On startup the responder probes the selected brain executable with its version command. If the executable is missing, errors, or times out, startup fails before opening Slack Socket Mode. This keeps the first CEO question from silently sitting at the ack state.

## Reply Shape

For each question, the responder posts an immediate threaded `Looking...` acknowledgement, runs the selected headless brain, appends one usage line, then posts a second threaded message with either the synthesized answer or a bounded failure reason.
