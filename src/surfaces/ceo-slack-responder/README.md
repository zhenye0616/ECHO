# CEO Slack Responder

Validation-only Slack Socket Mode responder for the eng-to-CEO context loop.

## Configuration

- `ECHO_SLACK_APP_TOKEN` or `SLACK_APP_TOKEN`: Slack Socket Mode app token.
- `ECHO_SLACK_BOT_TOKEN` or `SLACK_BOT_TOKEN`: Slack bot token for threaded replies.
- `ECHO_CEO_CONTEXT_REPO_PATH`: absolute path to the scoped context repo. Brain invocations run with this as cwd and the prompt pins ECHO MCP calls to this path.
- `ECHO_CEO_SLACK_CHANNEL_IDS`: comma-separated channel allowlist. When the list is empty, DMs and app mentions are accepted from any channel. When the list is non-empty, every event — including DMs — is dropped unless its channel ID is in the list, so a DM only works if the DM channel ID (`D...`) is itself allowlisted. Required in intake-only mode (startup fails without it).
- `ECHO_CEO_EVENT_LOG_PATH`: optional usage log path. Defaults to `raw/internal/ceo-loop-events.md`.
- `ECHO_LOG_LEVEL`: structured stdout log threshold: `debug`, `info`, `warn`, or `error`. Defaults to `info`.
- `ECHO_CEO_BRAIN`: `codex` or `claude`. Defaults to `codex`.
- `ECHO_CEO_BRAIN_TIMEOUT_MS`: hard brain timeout in milliseconds. Defaults to `180000`.
- `ECHO_SLACK_RESPONDER_INTAKE_ONLY`: when true, disables general brain answers and only handles Slack-to-Linear intake. This is the Fly.io teammate-facing mode.
- `ECHO_INTAKE_AGENT_PROVIDER`: `deterministic`, `claude`, or `codex`. Defaults to `deterministic`; Fly sets `claude`. `codex` is reserved until Codex API credentials are wired.
- `ECHO_INTAKE_AGENT_MODEL`: optional Claude Agent SDK model override.
- `ECHO_INTAKE_AGENT_MAX_TURNS`: maximum Claude Agent SDK turns for issue drafting. Defaults to `4`.
- `ANTHROPIC_API_KEY`: required when `ECHO_INTAKE_AGENT_PROVIDER=claude`.
- `ECHO_LINEAR_INTAKE_ENABLED`: when `true`, loads the Linear intake create path.
- `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_INBOX_STATE_ID`, `LINEAR_DEFAULT_ASSIGNEE_ID`, `LINEAR_DEFAULT_PROJECT_ID`, `LINEAR_PROJECT_MAP`: required for Linear issue creation.
- `ECHO_LINEAR_INTAKE_DRAFT_STORE`: durable JSON draft/idempotency store path. Fly uses `/data/linear-intake-drafts.json`.

In intake-only mode, `ECHO_CEO_SLACK_CHANNEL_IDS` is required: `loadResponderConfig` throws and the process fails at startup, before opening Slack Socket Mode, if the list is empty. The list is what lets plain (unmentioned) thread replies in the intake channel through; it also means DMs are dropped in intake-only deployments unless the DM channel ID is added to the same list.

## Brain Preflight

On startup the responder probes the selected brain executable with its version command. If the executable is missing, errors, or times out, startup fails before opening Slack Socket Mode. This keeps the first CEO question from silently sitting at the ack state.

When `ECHO_SLACK_RESPONDER_INTAKE_ONLY=true`, brain preflight is skipped because the Fly worker is not expected to have local `codex` or `claude -p` CLI credentials. Intake confirmations still run through the server-owned Linear idempotency path.

## Headless Intake Agent

The Claude intake provider uses `@anthropic-ai/claude-agent-sdk` with built-in tools disabled, `permissionMode: "dontAsk"`, and an allowlisted in-process MCP server. The MCP tools expose only the issue-creation contract and known Linear projects. The agent drafts a detailed title/body; the responder performs the actual Linear create after `runCreateOnce` acquires the draft lock.

If the agent fails before Linear create, the responder falls back to the deterministic issue renderer and records the fallback in the issue status note. This avoids marking a draft as uncertain when no Linear mutation happened.

## Fly.io

The Fly worker is a Slack Socket Mode process, not an HTTP service. It uses the repo-level `Dockerfile` and `fly.toml`.

One-time setup:

```bash
fly volumes create echo_slack_data --app project-ech0 --region sjc --size 1
fly secrets set --app project-ech0 \
  ECHO_SLACK_APP_TOKEN=xapp-... \
  ECHO_SLACK_BOT_TOKEN=xoxb-... \
  ECHO_CEO_SLACK_CHANNEL_IDS=C... \
  ANTHROPIC_API_KEY=sk-ant-... \
  LINEAR_API_KEY=lin_api_... \
  LINEAR_TEAM_ID=... \
  LINEAR_INBOX_STATE_ID=... \
  LINEAR_DEFAULT_ASSIGNEE_ID=... \
  LINEAR_DEFAULT_PROJECT_ID=... \
  LINEAR_PROJECT_MAP='{"claudia":"..."}'
```

Deploy:

```bash
fly deploy --app project-ech0
```

Debug live behavior with:

```bash
fly logs --app project-ech0
fly secrets set --app project-ech0 ECHO_LOG_LEVEL=debug
```

Logs are JSON lines on stdout. Useful message names, with their levels:

- `slack_responder_starting` — info
- `slack_socket_open` — info
- `slack_socket_disconnected` — error
- `slack_socket_message_failed` — error
- `slack_envelope_received` — debug
- `slack_event_ignored` — debug
- `slack_question_received` — debug
- `linear_intake_message_parsed` — debug

`fly.toml` ships `ECHO_LOG_LEVEL=info`, so the debug-level messages (`slack_envelope_received`, `slack_event_ignored`, `slack_question_received`, `linear_intake_message_parsed`) are invisible by default; set `ECHO_LOG_LEVEL=debug` to see them. Slack message text and token values are not logged.

## Reply Shape

For each question, the responder posts an immediate threaded `Looking...` acknowledgement, runs the selected headless brain, appends one usage line, then posts a second threaded message with either the synthesized answer or a bounded failure reason.
