---
item_id: 2026-06-08-098-per-actor-journal-shards
round: 6
spec_commit_sha: 90bd55ffe02a35730736a68de0aa471b854c3224
artifact_path: backlog/proposed/2026-06-08-098-per-actor-journal-shards.md
class: narrow
requested_at: '2026-06-08T22:38:05Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 827cd9f1-93f3-4717-a34d-52f8b6b056ce
focus_hints: "r5 was a deliberate SCOPE REDUCTION at baad003d: the 'no stale-path\
  \ window' gate (added r3, grew every round) was REMOVED because it is not load-bearing.\
  \ Review the reduction, not as a missing gate: (a) confirm AC1's wrapper-code shard\
  \ fix eliminates the documented wrapper-vs-wrapper HEADLINE collision with ZERO\
  \ dependence on any prose/skill/installed-cache surface (the wrapper hardcodes its\
  \ path); (b) confirm the only residual stale-path collision is a non-wrapper same-file/same-slug\
  \ case = a self-healing subset of the LD5 accepted residual. If both hold, the spec\
  \ is TERMINAL. Do NOT re-introduce a merge-blocking gate or add another instruction\
  \ surface (skills/.claude/commands/AGENTS.md/~/.codex are realigned as hygiene via\
  \ normal regen, not gates). If you believe the residual is HEADLINE-class rather\
  \ than an LD5 subset, state that as a scope disagreement for founder escalation\
  \ \u2014 not another gate patch."
---

# What to review

Read `backlog/proposed/2026-06-08-098-per-actor-journal-shards.md` at commit `90bd55ffe02a35730736a68de0aa471b854c3224`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
