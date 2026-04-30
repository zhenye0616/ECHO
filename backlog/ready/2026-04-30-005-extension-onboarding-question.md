---
id: 2026-04-30-005-extension-onboarding-question
title: Extension onboarding question (cohort tagging)
status: ready
priority: MED
estimate: 1d
created: 2026-04-30
spec_refs:
  - echo-wiki/entities/browser-extension.md
  - echo-wiki/sources/extension-funnel-logic.md
acceptance:
  - One skippable question after first successful action (not modal, not blocking)
  - Question copy: "What do you mostly use AI for? Coding / Writing / Research / Skip"
  - Captures answer in user record (or anonymous analytics if not signed up)
  - Skip rate and answer distribution captured for later analysis
  - Drops <5% of installs (measure via funnel analytics)
files_to_modify:
  - extension/src/onboarding/CohortQuestion.tsx (or equivalent)
  - extension/src/analytics/track.ts
agent_notes: ""
review_notes: ""
---

# Extension Onboarding Question (Cohort Tagging)

## What

After the user's first successful cross-platform context action in the extension, show a tiny skippable prompt asking about their primary AI use. Captures cohort signal that informs which V1 alpha invitation list each user belongs to.

## Why

Per [[extension-funnel-logic]], extension paid users tagged "Coding" become the V1 alpha pool. Without this question, you can't filter the email list by cohort when V1 alpha invites go out. This is the cheap, high-value signal capture that costs almost nothing in onboarding friction.

## Acceptance Criteria

- [ ] Trigger: after user's first successful context-port action (NOT on install — that has worse friction asymmetry)
- [ ] UI: small banner or toast at the top/bottom of the active page; not modal; doesn't block
- [ ] Copy: *"Quick question — what do you mostly use AI for? Coding / Writing / Research"* with small "Skip" link
- [ ] Single tap to answer, single tap to skip
- [ ] Captures: { user_id (or anon), choice, timestamp, browser_locale }
- [ ] Persists answer to user profile (if signed up) or local storage (if anon)
- [ ] Answers feed analytics dashboard for cohort distribution analysis
- [ ] Funnel measurement: track install → first-action → question-shown → answered (vs skipped)
- [ ] Drop rate from onboarding ≤5% (measure pre/post)

## Constraints

- One question only — never expand to a multi-question onboarding flow
- Skippable, not required — required prompts cost 15–25% of installs
- Behavior framing, not identity framing — *"what do you use AI for"* not *"are you a developer"*

## Out of Scope (Don't Drift)

- ❌ Multi-question onboarding (one question is the discipline)
- ❌ Mandatory answer (must remain skippable)
- ❌ More cohort options beyond Coding/Writing/Research (V1.5 if needed)
- ❌ Personalization based on answer (V2 — for now just tag)

## Definition of Done

Founder can install the extension, complete one context port, see the question appear non-modally, tap an answer, see the answer recorded in analytics. Skip flow works. Answer persists across sessions.
