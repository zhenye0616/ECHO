# Echo Slack Linear Intake Live Test - 2026-06-28

## Test Setup

- Tester role: nontechnical teammate.
- User-supplied initial issue: "The summary length is inconsistent across cards."
- Goal: verify Echo can gather missing intake information from plain-language Slack replies and create a detailed Linear issue.
- Slack workspace observed from bot auth: Justinian.
- Fly app: `project-ech0`.
- Machine: `68307ddb247e08`.

## Interaction Log

### 2026-06-28 13:12 PDT - Initial Slack Message

Zhen posted in Slack:

> @ECHO can you make a Linear issue for this?
>
> The summary length is inconsistent across cards.

Echo replied in the thread:

> Looking...
>
> I can create this issue once I have the missing context:
>
> 1. Which project should this go under? Choose one: claudia, ops & infra, platform & ingestion, or say internal/Echo.
> 2. Why does this matter now?
>
> Plain language is fine.

Zhen replied in the thread:

> 1. claudia 2. hard to evaluate the quality of llm output if content length are inconsistent

### 2026-06-28 13:15-13:18 PDT - Deployment/State Check

Fly status showed the machine was stopped:

```text
app     68307ddb247e08     sjc     stopped     2026-06-28T20:12:22Z
```

Fly logs showed the machine had been stopped by Fly's trial runtime limit:

```text
2026-06-28T20:12:21Z Trial machine stopping. To run for longer than 5m0s, add a credit card by visiting https://fly.io/trial.
```

I restarted the machine:

```text
68307ddb247e08 has been started
```

Follow-up status showed the machine running:

```text
app     68307ddb247e08     sjc     started     2026-06-28T20:15:44Z
```

Persisted draft state on `/data/linear-intake-drafts.json` contained two pending drafts for the Slack channel/thread roots. Both drafts only captured:

```json
{
  "fields": {
    "request": "can you make a Linear issue for this?"
  },
  "status": "pending"
}
```

Observed diagnosis:

- Echo was live for the first message because it posted the acknowledgement and follow-up questions.
- The machine stopped before the follow-up reply was captured.
- The intake parser inferred the request from the command sentence, not the actual issue sentence, so the persisted draft lost "The summary length is inconsistent across cards."
- The current Slack UX leaves the user uncertain because `Looking...` is the only visible runtime status before a follow-up or silence.

## Final Linear Issue

Pending. No Linear issue has been created yet.
