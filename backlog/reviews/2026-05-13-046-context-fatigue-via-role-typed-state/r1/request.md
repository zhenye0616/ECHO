---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 1
spec_commit_sha: 5480034c98a7a28e6a8eefa1492c16cd6097585f
artifact_path: backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md
class: structural-reform
requested_at: '2026-05-14T00:22:28Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "8 ACs covering schema (AC1) + CI lint (AC2) + backlog/review frontmatter\
  \ extension (AC3) + ECHO MCP read tools (AC4) + read contract (AC5) + journal-by-proxy\
  \ rule (AC6) + cold-start skill primer (AC7) + dogfooding measurement (AC8). class:structural-reform\
  \ \u2014 this is the LAST friction-removal spec before vendor-agnostic ECHO pivot;\
  \ introduces a new namespace (backlog/task-state/<id>/), new MCP surface (get_role_state\
  \ + list_task_states), and a new journal-discipline rule for read-only consultees.\n\
  \nCritical invariants reviewers MUST preserve and verify:\n1. Fresh-eyes-at-SHA\
  \ for reviewer ticks \u2014 request.md schema gains task_state_ref: (AC3) but reviewers\
  \ MUST NOT consume task-state. validate.py adds a warn-lint if a reviewer response\
  \ references task-state. AC1 schema doc explicit prohibition. AC6 journal-by-proxy\
  \ rule does NOT cover reviewer ticks (still fully fresh-eyes).\n2. 120-line hard\
  \ cap (target 40-60, warn at 80+) is INTENTIONAL \u2014 no inline appendix loophole.\
  \ Codex's \"working memory not audit trail\" framing. If overflow appears frequent\
  \ post-merge, file successor item for separate history.md.\n3. V1 ships READ-ONLY\
  \ MCP. upsert_role_state is V2/047. Writers (humans, strategist, builder) use editor\
  \ + git commit.\n4. Read contract (AC5): FS-capable bindings (git show <sha>:...)\
  \ and MCP-capable bindings (get_role_state) MUST return byte-identical content for\
  \ same task_id+role+SHA. Future transports implement same contract.\n\nCross-strategist\
  \ convergence: claude + codex via ECHO-mediated retrieval, 2026-05-13 16:25-16:50\
  \ PDT. Closed-loop event journaled. Prior-codex JSONL rollout file is a spec_ref.\
  \ Target \u22643 rounds.\n\nReviewer lens differentiation:\n- codex: implementability\
  \ + AC executability + test coverage shape. Particular focus: AC2 lint script Python+TS-test\
  \ bridge; AC4 MCP isError shape + binding parameter no-op; AC6 journal-by-proxy\
  \ template.\n- codex-ops: runtime/ops lens. Particular focus: AC2 CI integration\
  \ without slowing existing lint; AC4 MCP under race conditions (read during write);\
  \ AC1 round-state rewrite-in-place hazard (stale write vs concurrent strategist\
  \ edit); AC8 recursive dogfooding actually produces measurable signal not noise."
---

# What to review

Read `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at commit `5480034c98a7a28e6a8eefa1492c16cd6097585f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
