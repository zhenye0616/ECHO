# Slack enablement: two-stage plan (founder-agreed 2026-07-06, unexecuted)

> **SUPERSEDED / DEFERRED (2026-07-11).** Stage B targets the retired Justinian workspace regime (customer cancelled 2026-07-09; current commercial target is Zoom + self-hosted Mattermost). Stage A's structural-isolation shape survives as prior art for the YC demo scenes 2–3 decision (`2026-07-11-yc-demo-plan-amendment-template.md`, Option A). Slack enablement for a real client returns only through post-G2 scope if the Team product requires it.

Context: 65+ intake cards validated in the terminal store; Slack posting is the
built-but-disabled next step. The backfill deck contains sensitive negotiation
content (advisor equity/IP cards, bottom-line numbers; name redacted 2026-07-11) and the COUNTERPARTY OF
THOSE CARDS IS IN THE REAL WORKSPACE — channel-level privacy is one
misconfigured channel-id away from disaster, so isolation must be structural,
not config-level (same argument as capture-gate-in-code-not-policy).

Stage A (transport validation + rehearsal): a separate TEST Slack workspace
with its own token. Replay the full card backfill there with zero content
gating — validates auth/formatting/threading/retry/slack_ts end-to-end. A bug
cannot cross workspaces.

Stage B (the demo + real n=2 loop): the REAL workspace — the CEO must be the
reader for the loop signal to mean anything. Sensitivity handled by (1) source
scoping: fresh that-week meetings only (also fixes the recency skew), folder/
meeting allowlist so 1:1 negotiation notes never enter the intake scan;
(2) the confirm-before-post step already in station 3's design (109's
auto-scan + confirm). The test org never appears on demo day.

Status: agreed in conversation, no spec filed. Founder said "setting up slack
is easy" — the enablement spec (test-org config + allowlist + confirm-mode
defaults) is drafted on request.
