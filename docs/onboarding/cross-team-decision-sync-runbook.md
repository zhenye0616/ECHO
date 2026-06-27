# Cross-Team Decision Sync Runbook

White-glove setup for a two-technical-cofounder team.

## Sequence

1. Install and verify each cofounder's individual ECHO setup first. The first impression should be the single-user aha, not team sync.
2. Install the Slack app in the shared workspace and choose the confirm target channel or user.
3. Configure the responder host:
   - `ECHO_SLACK_BOT_TOKEN`
   - `ECHO_SLACK_APP_TOKEN`
   - `ECHO_TEAM_DECISION_CONFIRM_TARGET`
   - `ECHO_TEAM_DECISION_STORE`
   - `ECHO_TEAM_DECISION_DRAFT_STORE`
   - optional `ECHO_TEAM_DECISION_AUTHOR`
   - optional `ECHO_TEAM_COFUNDER_IDENTITIES` as JSON, e.g. `[{"id":"avery","slack_user_id":"U123"}]`
4. Drop `docs/onboarding/AGENTS.md.snippet` into Codex-backed repos and `docs/onboarding/CLAUDE.md.snippet` into Claude Code-backed repos.
5. Trigger one explicit code-session decision with `/echo decision` or an end-of-task summary. Confirm the Slack card.
6. Ask Slack a cross-team question such as `what did we decide about auth this week?` and verify the answer uses confirmed shared decisions only.

## Trust Boundary

Raw context never leaves the owner's machine. The shared store contains only confirmed `derived:team-decisions` atoms: subject, decision, optional rationale, author, confirmer, timestamp, source app, and dedupe key.

If `propose_decision` reports a missing Slack token, missing confirm target, or responder outage, no draft is created and nothing is shared.

## Success Signal

After individual aha, the cross-team moment succeeds when both cofounders understand the boundary and ask "when can I pay?" because the other person's decisions are available without exposing raw work.
