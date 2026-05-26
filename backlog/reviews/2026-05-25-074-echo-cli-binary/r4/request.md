---
item_id: 2026-05-25-074-echo-cli-binary
round: 4
spec_commit_sha: 604e4fdd15e6a4e4a5317bc42b1d3a6d63095e8e
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T06:33:41Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 343c88f9-e97a-4c37-b1f3-3461a8406dd0
focus_hints: "r4 verification (cycle-shape check: r1 found 5 findings, r2 found 8,\
  \ r3 found 8 \u2014 if r4 surfaces only cleanup-class findings with no new HIGH\
  \ design issues, we are at convergence; the spec's r2 + r3 patches should have closed\
  \ the load-bearing classes). Specifically verify: (1) AC5.4 step 10's NEW first-priority\
  \ receivedSignal.current check unconditionally exits 130/143 BEFORE inspecting outcomes\
  \ \u2014 no path exists where an interrupted process exits 0; AC7.4 cases 12a (between-step\
  \ SIGTERM) + 12b (post-final-step SIGTERM) actually exercise the gap windows. (2)\
  \ AC5.3 step 0 pre-iteration signal check is purely defense-in-depth \u2014 doesn't\
  \ introduce a TOCTOU vs the abort-and-kill path. (3) The --agent <abs-path> escape-hatch\
  \ language is fully removed; the PATH-requirement docs are sufficient + actionable;\
  \ nothing in AC5/AC7 implies path support exists. (4) Binary-rename cascade is complete\
  \ except for the rationale prose (lines describing the bug itself) \u2014 no builder-instructable\
  \ text says 'echo init'. (5) AC1.5 npm run build:cli prerequisite makes the smoke\
  \ truly hermetic on a fresh clone. (6) AC3.2 transport headers + initialize envelope\
  \ match src/mcp/server.ts contract; the 406-on-missing-header negative is testable.\
  \ (7) Stale wording fixes are correct and don't leave any other contradictory frontmatter/body\
  \ pairs. (8) Per 058 discipline: did any r3 patch introduce a new mechanism that\
  \ itself needs review? Particularly: the AC5.4 step 10 priority-order change is\
  \ small and additive but if it has a sub-detail bug, that's the next round's target."
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `604e4fdd15e6a4e4a5317bc42b1d3a6d63095e8e`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
