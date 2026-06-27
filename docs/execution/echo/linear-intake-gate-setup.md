# Echo Linear Intake Gate - Setup

**Date:** 2026-06-27
**Status:** initial operating design
**Owner:** Zhen
**Systems:** Slack, Echo, Linear

## Goal

Use Echo as the intake gate between plain-language team requests in Slack and executable work in Linear.

The team should be able to describe work in normal planning language. Echo should gather the minimum missing context before creating or promoting a Linear issue. Linear should then track accepted client work, execution sub-issues, status, and receipts.

The operating rule:

> Echo owns intake quality. Linear owns accepted work tracking.

## Project Model

### Linear Projects

Use Linear projects for two different project types:

1. Client projects
   - One project per client.
   - Examples: `Claudia`, future client names.
   - These projects hold client-facing deliverables and their engineering sub-issues.

2. Internal product projects
   - One project for Echo itself.
   - Suggested project name: `Echo`.
   - Echo is not a client project. It is the internal intake, memory, triage, and workflow assistant.

### Issue Hierarchy

For client projects:

```text
Client project
  Parent issue: client deliverable in business language
    Sub-issue: engineering slice
    Sub-issue: engineering slice
    Sub-issue: engineering slice
```

For Echo:

```text
Echo project
  Parent issue: Echo capability or workflow
    Sub-issue: Slack intake prompt
    Sub-issue: Linear issue creation
    Sub-issue: duplicate detection
    Sub-issue: admin review dashboard
```

## Mental Model

Non-technical teammates should not need to know the implementation plan.

They should only need to answer:

```text
Who is this for?
What do you want changed?
Why does it matter?
What example or evidence shows the need?
What would done look like?
How urgent is it?
Is this client-facing?
```

Engineering then turns the accepted deliverable into sub-issues.

## End-To-End Flow

### 1. Teammate Starts In Slack

The teammate talks to Echo in `#eng`, a project channel, or a thread.

Example:

```text
@Echo Claudia needs real-time amendment alerts. When a bill changes, we should show what actually changed in the bill text. Let's start with California.
```

### 2. Echo Classifies The Request

Echo classifies the request into one of these buckets:

| Type | Meaning | Linear destination |
| --- | --- | --- |
| Client deliverable | New client outcome or promised capability | Client project, parent issue |
| Bug / regression | Existing behavior is wrong | Client or internal project |
| Research / question | Needs investigation before build | Client or internal project |
| Ops / access | Billing, deploy, repo, credentials, process | Ops/Internal project |
| Echo capability | Improves Echo itself | Echo project |
| Update to existing issue | Adds context to existing work | Comment or related issue |
| Duplicate / already covered | Same as existing work | No new issue, link existing issue |

### 3. Echo Checks Mandatory Intake Context

Echo must gather this context before creating a Linear parent deliverable:

```text
Client / project:
Request:
Why:
Client outcome:
Evidence / example:
Done when:
Urgency:
Client-facing:
```

If anything is missing, Echo asks targeted follow-up questions in Slack.

Echo should ask at most two questions at a time.

Good follow-up:

```text
I can file this once I have two missing pieces:
1. Which client/project is this for?
2. What would "done" look like for the teammate or client?

Plain language is fine.
```

Bad follow-up:

```text
Please provide implementation details, acceptance criteria, affected files, deployment target, branch, and test plan.
```

Echo should not ask non-technical teammates for engineering details.

### 4. Echo Searches For Existing Work

Before creating a new Linear issue, Echo should search for likely matches:

```text
Client/project
Key nouns
Requested outcome
Related source or surface
Recent Slack thread
Known issue IDs
```

Echo then chooses one:

| Verdict | Action |
| --- | --- |
| New | Create a new issue in Linear `Inbox` or `Triage` |
| Duplicate | Reply with the existing issue and do not create a new one |
| Related | Create or update an issue and link the related issue |
| Needs more info | Keep the request in Slack until enough context exists |

### 5. Echo Creates Linear Issue

Echo creates a parent deliverable issue when the minimum context is present.

Default state:

```text
Inbox
```

Default owner:

```text
Zhen
```

Default status note:

```text
Intake deliverable. Needs triage/decomposition before engineering starts.
```

### 6. Zhen Triages

Zhen reviews the issue and chooses:

| Verdict | Linear action |
| --- | --- |
| Promote | Move to `Todo`, confirm shape, create sub-issues if needed |
| Ask | Echo asks the teammate for missing context |
| Duplicate | Mark duplicate of existing issue |
| Collapse | Fold into existing issue as comment/context |
| Cancel | Move to `Canceled` |

### 7. Engineering Decomposes

For accepted client-facing deliverables, Zhen or engineering creates technical sub-issues.

Parent issue stays in business language. Sub-issues carry implementation detail.

## Mandatory Parent Deliverable Shape

Use this for client-facing or client-relevant parent issues.

```md
## Request

Plain-language ask. What does the teammate/client want?

## Why

Business or client reason. Why does this matter now?

## Client outcome

What should the client or internal operator experience when this is done?

## Scope

What is included.

## Out of scope

What is explicitly not included.

## Current state / evidence

Slack thread, client doc, screenshot, failing example, current behavior, or known issue.

## Done when

- [ ] Client/team outcome is achieved
- [ ] Any required internal review path works
- [ ] Any known gaps are tracked as sub-issues
- [ ] Production receipt is attached if client-facing

## Delivery

Owner:
Project:
Priority:
Client-facing:
Surface:
Parent:
Branch:
Worktree:
Preview URL:
Production SHA:
Status note:
Next action:

## Dependencies / blockers

What must happen first or what this blocks.

## Receipts

Slack thread:
Doc:
PR:
Preview deploy:
Production deploy:
Commit SHA:
Verification:
```

## Mandatory Technical Sub-Issue Shape

Use this for engineering execution issues.

```md
## Request

Specific implementation task.

## Why

Which parent/client outcome this unlocks.

## Scope

Concrete behavior, files, systems, or flows included.

## Out of scope

What this task will not solve.

## Current state / evidence

Current code/config/bug/prod behavior.

## Done when

- [ ] Specific behavior works
- [ ] Tests or verification exist
- [ ] Preview or production receipt is recorded if relevant

## Delivery

Owner:
Project:
Priority:
Client-facing:
Surface:
Parent:
Branch:
Worktree:
Preview URL:
Production SHA:
Status note:
Next action:

## Dependencies / blockers

Blocked by / blocks / related work.

## Receipts

PR:
Preview deploy:
Production deploy:
Commit SHA:
Verification:
```

## Echo Slack Conversation Contract

Echo should be helpful, short, and specific.

### Echo Should

* Accept plain-language requests.
* Ask for missing business context before creating work.
* Search existing Linear work before creating new issues.
* Explain whether it created, linked, or held a request.
* Post the Linear issue link back into the Slack thread.
* Keep non-technical teammates out of implementation details.

### Echo Should Not

* Create vague issues with no `Done when`.
* Ask teammates for branch names, files, test plans, or implementation details.
* Move accepted work directly to `In Progress`.
* Auto-send client-facing work without human approval.
* Create duplicate issues when an existing parent deliverable already covers the ask.

## Slack Prompts

### New Deliverable Prompt

```text
I can file this as a deliverable. I need:

Client/project:
Request:
Why now:
Evidence/example:
Done when:
Urgency:
Client-facing: yes / no / not sure
```

### Missing Context Prompt

```text
I can file this once I have the missing context:

1. <missing field>
2. <missing field>

Plain language is fine.
```

### Duplicate Prompt

```text
This looks covered by <JUS-123>. I will not create a new issue unless this is materially different.

What is different about this request?
```

### Issue Created Prompt

```text
Created <JUS-123> in <Project>, status Inbox.

I included:
- request
- why
- evidence
- done-when
- next action for triage
```

### Needs Triage Prompt

```text
I created this as an intake issue. Zhen still needs to accept, split, or collapse it before engineering starts.
```

## Linear Status Enforcement

### Inbox

Raw accepted intake.

Allowed:

* Echo-created parent deliverables.
* Human-created issues that still need shape.

Required:

* Minimum Echo intake context, or a clear marker that more info is needed.

### Todo

Accepted and shaped work.

Required before moving to `Todo`:

* Request
* Why
* Client outcome or technical outcome
* Scope
* Out of scope
* Current state / evidence
* Done when
* Owner
* Project
* Priority
* Client-facing status
* Surface
* Next action

### In Progress

Actively being worked.

Required before moving to `In Progress`:

* Owner
* Parent if part of a deliverable
* Branch or worktree plan if code is involved
* Clear done criteria
* Known blockers called out

### Done

Finished and verified.

Required for client-facing issues:

* PR or commit
* Production deploy / SHA
* Verification receipt
* Follow-up issues for any known gaps

## Echo Project Issues

Track Echo itself as an internal project with issues like:

```text
Echo intake gate MVP
Echo Slack follow-up question loop
Echo Linear duplicate search
Echo issue-shape validator
Echo daily Inbox digest
Echo project/client router
Echo admin review command
Echo Linear creation receipts
```

Each Echo issue should still use the same issue shape, but `Client-facing` should usually be:

```text
Client-facing: no, internal workflow
```

## MVP Build Plan

### Phase 1 - Manual Echo-Assisted Flow

Goal: use Echo behavior socially before automating everything.

* Pin the intake prompt in `#eng`.
* Echo asks for missing context manually.
* Echo creates Linear issues only after required context exists.
* Zhen manually reviews `Inbox` daily.

### Phase 2 - Structured Intake Gate

Goal: Echo enforces minimum fields.

* Echo stores draft intake state per Slack thread.
* Echo refuses to create Linear issues with missing minimum context.
* Echo searches Linear before creation.
* Echo posts created issue links back to Slack.

### Phase 3 - Shape Validator

Goal: Linear cannot silently drift.

* Echo scans `Inbox`, `Todo`, and `In Progress`.
* Echo flags missing sections or fields.
* Echo posts a daily cleanup digest.
* Echo can suggest a patch to issue descriptions.

### Phase 4 - Decomposition Assistant

Goal: turn accepted deliverables into engineering plans.

* Echo proposes sub-issues for accepted parent deliverables.
* Zhen approves, edits, or rejects the split.
* Echo creates sub-issues only after approval.

## Validation Criteria

This setup is working when:

* Non-technical teammates can submit requests without learning Linear.
* Echo asks fewer, better follow-up questions.
* `Inbox` contains only actionable intake items.
* `Todo` contains only shaped work.
* Client projects are readable by non-technical teammates.
* Engineering sub-issues are specific enough to execute without reinterpreting the parent.
* Duplicate work decreases.
* Zhen can review client progress from Linear without reconstructing Slack context.

## Open Decisions

* Should Echo create issues directly in `Inbox`, or hold Slack drafts until Zhen approves creation?
* Should Echo use one shared `#eng` channel or also support client/project-specific channels?
* Should Echo be allowed to comment on existing issues automatically?
* Should Echo suggest sub-issues automatically, or only after Zhen asks?
* Should client deliverables always be parent issues, or should tiny one-step requests stay as standalone issues?

## Recommended Defaults

For now:

* Echo can create issues directly in `Inbox` only when minimum context is present.
* Echo should never create issues directly in `Todo`.
* Echo should search for duplicates before creation.
* Echo should post created issue links back to Slack.
* Zhen remains the human gate from `Inbox` to `Todo`.
* Echo project work should live in the `Echo` Linear project.
* Client work should live in the relevant client Linear project.

