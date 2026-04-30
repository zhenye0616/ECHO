# raw/internal/decisions/

Decision log for things that come up during the build that aren't covered by the V1 spec.

## Why This Folder Exists

During build, decisions arise constantly that aren't pre-specified. Without a record, you'll re-litigate them. With a record, you decide once and move on.

This is also the place to capture **drift events** — when you noticed yourself rationalizing scope expansion. Writing it down is the counter-move.

## What goes here

Each decision = one markdown file, date-prefixed:
- `2026-05-03-mcp-tool-naming.md`
- `2026-05-15-storage-encryption-default.md`
- `2026-05-22-DRIFT-considered-adding-notion.md` (drift events explicitly tagged)

## Decision Note Template

```markdown
---
date: YYYY-MM-DD
type: build-decision | drift-event | spec-correction
status: decided | reverted | re-opened
---

# [Short title]

## Context
What came up. Why it required a decision.

## Options Considered
- A: ...
- B: ...
- C: ...

## Decision
What was chosen. (One paragraph.)

## Reasoning
Why. The criteria applied. Reference any [[wiki concepts]] that drove the call.

## What This Forecloses
Things you're explicitly NOT doing as a result.

## Re-evaluation Trigger
What signal would cause this decision to be revisited.
```

## Drift Event Template (Special Case)

```markdown
---
date: YYYY-MM-DD
type: drift-event
status: caught | corrected | escalated-to-spec-change
---

# DRIFT: [What I almost built]

## What I Was About to Do
The specific thing that triggered the drift check.

## Which Drift Pattern
(See [[drift-prevention]])
- [ ] One more integration
- [ ] Second admin surface
- [ ] Adjacent cohort
- [ ] Ambient surfacing (Layer 2)
- [ ] Conversational (Layer 4)
- [ ] Other: ...

## The Rationalization I Used on Myself
The honest version of why I almost did it.

## Counter-Move Taken
What I did instead. (Usually: deferred to V1.5/V2 list, kept building V1 critical path.)

## Lesson
If a pattern, note it for future me.
```

## Synthesis

After 5+ decision notes accumulate, look for patterns:
- Am I drifting in one direction repeatedly? (e.g., always toward more integrations)
- Are my V2 ideas converging on a coherent V2 spec? (good — start drafting)
- Am I making the same trade-off repeatedly? (might be a concept worth promoting to `echo-wiki/concepts/`)
