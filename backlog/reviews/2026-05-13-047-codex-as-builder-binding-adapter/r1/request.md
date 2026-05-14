---
item_id: 2026-05-13-047-codex-as-builder-binding-adapter
round: 1
spec_commit_sha: 4cce421586cd05f1d7d31b2e8871886f7c1ef112
artifact_path: backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md
class: structural-reform
requested_at: '2026-05-14T05:47:34Z'
requested_reviewers:
- codex
- cursor
focus_hints: "First post-046 spec. Ships codex-as-builder binding adapter (tools/backlog/run-codex-builder.sh).\
  \ 7 ACs: AC1 wrapper (matches _run_reviewer.sh shape + builder-specific additions\
  \ ECHO_AGENT_ID + lockfile + danger-full-access sandbox); AC2 binding-specific notes\
  \ appended to skills/process-backlog.md (no protocol changes); AC3 builder.md pointer\
  \ per 046 writer-responsibilities; AC4 integration test mocking codex exec (asserts\
  \ wrapper git ops + lockfile + ID generation, NOT codex's LLM behavior); AC5 opportunistic\
  \ 046 dogfooding (observational, not hard gate; FAIL \u2192 048-rollback); AC6 documentation;\
  \ AC7 cursor reviewer activation note (no new infra; manual trigger from Cursor\
  \ IDE).\n\nCycle bindings: strategist=claude, reviewers=[codex, cursor], builder\
  \ of 047 = whichever existing binding claims it (chicken-and-egg \u2014 codex builder\
  \ doesn't exist yet).\n\nCritical invariants reviewers must preserve and verify:\n\
  \n1. Codex reviewer (codex lens \u2014 implementability + ops/runtime, given codex-ops\
  \ is off-roster this cycle):\n   - AC1 wrapper shape implementable from _run_reviewer.sh\
  \ conventions? Sandbox + log + lockfile + PATH all consistent with existing patterns?\n\
  \   - AC3 builder.md writes \u2014 is push-round-state.sh suitable (it's currently\
  \ round-state.md-specific) or should builder.md use direct commit (single-owner\
  \ per 046 writer-responsibilities \u2192 no CAS needed)? R5 of spec surfaces this;\
  \ pick.\n   - AC4 test mocks codex exec \u2014 is the stub shape sufficient to verify\
  \ the wrapper end-to-end? What additional edges should the test cover?\n   - AC1\
  \ danger-full-access threat model documented adequately?\n\n2. Cursor reviewer (claude-in-Cursor\
  \ lens \u2014 IDE-side + builder-experience):\n   - Does AC2's \"Binding-specific\
  \ notes \u2014 codex\" section cover what a real codex builder needs to know? Anything\
  \ missing about codex CLI semantics?\n   - Is AC7's \"trigger cursor reviewer manually\
  \ from Cursor IDE\" workflow clear enough for the founder to execute repeatedly\
  \ across multiple rounds?\n   - AC5 dogfooding measurement: cursor-side reviewer-tick\
  \ INVARIANT is qualitative (no automated token-log like codex-side). What's the\
  \ right qualitative signal to capture in review_notes \u2014 \"did re-reading the\
  \ cycle's growing spec feel heavier than before?\"\n\nCross-strategist convergence:\
  \ claude strategist + codex strategist consult (2026-05-13 22:30 PDT, 115k tokens).\
  \ Codex pushed for (a-prime): \"file 047 now; claude-reviewer = cursor's claude\
  \ via existing skill; codex-builder is the genuine missing binding; recursive dogfooding\
  \ (same cycle measures 046's effect).\" Founder confirmed.\n\nEmpirical context:\
  \ 046 cycle baseline at raw/internal/dogfooding/role-typed-state-baseline.md (3\
  \ falsifiable PASS conditions for this cycle to test).\n\nTarget \u22643 rounds."
---

# What to review

Read `backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md` at commit `4cce421586cd05f1d7d31b2e8871886f7c1ef112`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
