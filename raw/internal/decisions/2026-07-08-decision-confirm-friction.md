# Decision-confirm friction — founder direction (2026-07-08)

## Founder signal (verbatim intent)

After the five "EchoBrain Legal" decision cards were posted to the confirm channel, founder said:

> just confirm the content of all 5 cards. all valuable and useful info. but i want to make the decisions and more natural not like an extra chore people have to do after a long meeting

Two things in one sentence: (a) the extraction quality was right — all five cards were "valuable and useful," zero dismissals; (b) the **confirm leg is the wrong shape**. Confirmation-as-a-separate-Slack-chore after a 30-minute meeting reads as homework, not as a natural part of the flow.

## What the confirm attempt surfaced (observations only, no fix design)

1. **The buttons were dead anyway.** The confirm leg requires the local Socket Mode responder (`node dist`) to be running; it wasn't. Five cards sat in the channel with Confirm/Dismiss buttons that silently do nothing. Nothing in the channel tells the human the gate is offline.
2. **There is no MCP confirm path.** `propose_decision` exists as an MCP tool; its inverse (confirm/dismiss) exists only as a Slack block-action. An AI client acting on an explicit founder instruction ("just confirm all 5") has no sanctioned path.
3. **Direct store writes are (correctly) blocked.** Driving `confirmDraft` → `appendConfirmedDecision` via a script against the prod stores was denied by the Claude Code permission classifier. The gate's integrity held — but that means the only working confirm path today is: founder starts the responder by hand, then clicks 5 buttons. That is the chore, squared.
4. **Batch shape mismatch.** One meeting produced five cards, each demanding an individual click. Confirmation cost scales linearly with extraction quality — the better ECHO gets at extraction, the worse the chore gets.

## Status

RESOLVED for this batch (2026-07-08 ~23:17 PDT): founder ran the confirm script himself via the `!` in-session command — all five drafts (aae935d7, 0d19ef3b, 3249e17f, e1f83bb0, ea5b6e16) are `confirmed`, attributed `U0BF9M04EBH (founder, via claude-code chat)`, with team-decision atoms appended to prod echo.db (`derived:team-decisions`). The human-executes-the-write shape satisfied the gate's intent while remaining a single batch gesture — one command for five decisions, versus five button clicks behind a responder that wasn't running. That contrast is the strongest single datapoint for the "natural, not a chore" direction below.

Backlog item(s) should come from end-of-window synthesis, not this note. The direction to preserve: **confirmation should ride an existing natural moment (the meeting's own wrap-up, the recap read, a single batch gesture) rather than being a new post-meeting workflow.** Connects to the recap-pilot decision (2026-07-07): the ledger rides the recap because recap is a pull the CEO already wants — decision confirms likely want the same host.
