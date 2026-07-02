# Slack Linear Intake Runbook

White-glove setup for the Slack to Linear intake gate.

## Configure Slack

1. Install the ECHO Slack app in the workspace.
2. Enable Socket Mode and subscribe to app mentions/messages in the intake channel.
3. Enable Interactivity & Shortcuts so Block Kit button actions are delivered over Socket Mode.
4. Set the responder channel allowlist with `ECHO_CEO_SLACK_CHANNEL_IDS`. Intake-only startup fails fast without this (config load throws before Slack Socket Mode opens) because plain thread replies need the channel allowlist. Once the list is non-empty, events from any channel not on it — including DMs — are dropped; add a DM channel ID (`D...`) to the list if DMs should work.
5. Configure:
   - `ECHO_SLACK_APP_TOKEN`
   - `ECHO_SLACK_BOT_TOKEN`
   - `ECHO_CEO_CONTEXT_REPO_PATH`
   - `ECHO_CEO_SLACK_CHANNEL_IDS`
   - optional `ECHO_LOG_LEVEL=debug` while validating live Slack behavior
   - optional `ECHO_LINEAR_INTAKE_DRAFT_STORE` for the durable draft JSON file

## Configure Linear

Set every Linear ID explicitly. The responder does not read Linear to discover IDs.

- `ECHO_LINEAR_INTAKE_ENABLED=true`
- `LINEAR_API_KEY`
- `LINEAR_TEAM_ID`
- `LINEAR_INBOX_STATE_ID`
- `LINEAR_DEFAULT_ASSIGNEE_ID`
- `LINEAR_DEFAULT_PROJECT_ID`
- `LINEAR_PROJECT_MAP`

`LINEAR_PROJECT_MAP` is JSON mapping plain project names to Linear project IDs:

```json
{
  "Claudia": "project-id-for-claudia",
  "Echo": "project-id-for-echo"
}
```

The default project is only for explicit internal/Echo requests. An unmapped client name is treated as missing context and the requester must pick from the configured projects before a confirm card appears.

## Operator Behavior

Echo asks for the minimum intake fields in Slack, two questions at a time, and never asks non-technical teammates for branches, files, tests, or implementation details.

Echo posts a confirm/dismiss card in the original thread when the draft is complete. Only the requester can confirm. Confirm creates one Linear issue in Inbox, owned by the configured default assignee, then posts the issue URL back to Slack.

## Fly Runtime

This responder is a long-running Socket Mode worker. The Fly machine must stay running; a suspended machine has no Slack WebSocket and receives no teammate events. Trial apps stop after the trial runtime window, so add billing or move the worker to an account/host that supports an always-on process.

Useful debugging commands:

```bash
fly status --app project-ech0
fly logs --app project-ech0
fly secrets set --app project-ech0 ECHO_LOG_LEVEL=debug
```

Structured stdout logs avoid Slack message bodies and tokens. Watch for `slack_socket_open` (info), `slack_event_ignored` (debug), `slack_socket_message_failed` (error), and `linear_intake_message_parsed` (debug). `fly.toml` ships `ECHO_LOG_LEVEL=info`, so the debug-level messages (`slack_event_ignored`, `linear_intake_message_parsed`) do not appear until `ECHO_LOG_LEVEL=debug` is set.

## Failure Evidence

Linear create calls use a bounded timeout and no duplicating retry. If a create times out or the responder restarts during the uncertain `creating` window, the draft is marked `needs-reconcile`, the requester sees a failure reply, and the draft JSON contains the failure phase/message for manual reconciliation.

Manual reconciliation rule: inspect Linear for a possible orphan issue before taking any further action. Do not re-click confirm until the operator has reconciled the draft.
