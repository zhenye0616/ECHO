---
item_id: "2026-05-28-078-decision-card-board"
round: 1
reviewer: "codex-ops"
artifact_sha: "9f126461b80f3ea035ec0d40f87d926e95afcf7a"
completed_at: '2026-05-29T03:07:11Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:14-15; backlog/ready/2026-05-28-078-decision-card-board.md:19; backlog/ready/2026-05-28-078-decision-card-board.md:86-89"
    finding: >-
      The board's source of truth is a mutable local checkout, but the spec never defines a freshness contract. Reviewer, watcher, and merge ticks write queue state from ephemeral worktrees and push it to origin/main; Raycast then asks the daemon to read whatever `repo_path` points at. If the founder's live checkout is stale, dirty, or blocked from `git pull`, AC4's live re-read just polls stale files and can show "no decisions" while origin/main already has an escalated combined.md. Patch the spec so `pending_decisions` reads an authoritative snapshot or explicitly reports stale/dirty source state: e.g. fetch/read origin/main from a temp worktree, or return `source_breakdown/result_caps` fields including local HEAD, upstream HEAD, dirty/unpulled status, and a visible warning/card state with tests for stale and dirty repos.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:87-89; backlog/ready/2026-05-28-078-decision-card-board.md:97-100"
    finding: >-
      The runtime state machine for "awaiting the founder" and A1 reset is underspecified. AC2 says cards are for escalated/at-boundary rounds that are not yet dispositioned, and AC3/J3 says runaway churn resets on founder touch, but the spec does not identify the durable marker for either condition. In production, combined.md files remain under backlog/reviews after disposition, backlog items move across ready/claimed/pending_review/complete, and a founder can touch a round by editing/dispositioning without any explicit receipt field. Without a precise marker, the board can either keep firing stale cards/alarms after the founder acted or suppress a card because the item moved directories. Patch the source-adapter contract with exact predicates for open card, dispositioned card, founder touch, and reset, plus fixture tests covering an escalated combined.md before and after disposition and a multi-round reset.
  - severity: "medium"
    where: "backlog/ready/2026-05-28-078-decision-card-board.md:14; backlog/ready/2026-05-28-078-decision-card-board.md:19; backlog/ready/2026-05-28-078-decision-card-board.md:86-92"
    finding: >-
      The live Raycast board can turn the daemon into a polling scanner with no operational budget. AC4 requires interval re-reads while the command is open, while AC2 reads backlog/reviews/**/combined.md plus backlog state; this repo already has roughly a thousand review-round commits, and the existing Raycast MCP client aborts calls after two seconds. At runtime an open board can repeatedly scan the whole queue, time out as "daemon unreachable," or monopolize the local MCP server while other tools are in use. Add a concrete poll interval, single-flight/backoff behavior, a response-time or corpus-size fixture using the current review corpus shape, and a visible partial/stale warning when the daemon hits its budget instead of silently degrading.
---

# codex-ops review

Verdict: `pushback`.

The DecisionCard primitive is coherent, but the runtime source contract is not safe yet. The board is meant to keep the founder in the decision loop during unattended queue activity; if it reads a stale checkout, cannot tell whether a founder already acted, or times out under the existing review corpus, it fails in exactly the 03:00 unattended path this surface is supposed to fix.
