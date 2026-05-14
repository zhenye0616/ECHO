---
item_id: 2026-05-13-046-context-fatigue-via-role-typed-state
round: 3
spec_commit_sha: a252dc29c5b01679c0d24db5ff1c31151c3a47a1
artifact_path: backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md
class: structural-reform
requested_at: '2026-05-14T03:58:27Z'
requested_reviewers:
- codex
- codex-ops
focus_hints: "R2 dispositioned: 5 unique root issues, all accept-with-patch at this\
  \ SHA. See r2/combined.md for the full disposition table.\n\nR3 focused re-review\
  \ (priority):\n\n1. AC1 round-state CAS protocol \u2014 the 6-step sequence (read\
  \ base blob \u2192 compute \u2192 fetch origin \u2192 compare upstream blob \u2192\
  \ abort on mismatch \u2192 os.replace + push-with-retry). Verify no residual TOCTOU\
  \ window between step 4 (CAS) and step 6 (commit+push). Intent: step 4 closes the\
  \ read-to-write race; push-with-retry closes the local-commit-to-remote-push race.\
  \ (codex+codex-ops convergent R2 finding \u2014 third pass on this protocol; please\
  \ confirm or surface the remaining race.)\n\n2. AC3 lint field-aware detection \u2014\
  \ the \u22653-of-6 heading-pattern threshold + `consumed_task_state: bool` boolean\
  \ self-declaration. Verify: (a) threshold of 3 is right (not too loose / not too\
  \ tight); (b) string-match precision avoids false-positives on YAML key/value of\
  \ the boolean itself (e.g., reviewer body containing `consumed_task_state: false`\
  \ as a quoted contract should not count toward the 3). The R2 patch itself names\
  \ `## current_thesis` once in critique \u2014 at threshold-3 this passes; verify\
  \ intended.\n\n3. AC4 always-pin-to-commit-SHA \u2014 resolved_ref = git rev-parse\
  \ <input_or_HEAD>^{commit} once at call entry; all subsequent ops use resolved_ref.\
  \ New tests (j) HEAD-race + (k) branch-ref-movement. Verify (a) implementation pattern\
  \ is achievable in existing MCP server architecture, (b) test (j) is buildable (fixture\
  \ must advance `main` between rev-parse and content read; check if the test harness\
  \ supports the inter-operation hook).\n\n4. AC1 parser collapse to TS-only \u2014\
  \ `src/mcp/parse-anchors.ts` as the single parser; lint script genuinely needs no\
  \ anchor parsing (block presence only). Verify by re-reading AC2 \u2014 if lint\
  \ surfaces any anchor-shape need, flag it.\n\nSame roster [codex, codex-ops]. R3\
  \ target: convergence \u2014 both reviewers `proceed` OR `proceed_after_patches`\
  \ with LOW findings only. If a new HIGH surfaces, we go to R4; the spec is in the\
  \ diminishing-returns zone (R1: 9 findings, R2: 7 unique findings collapsed to 5\
  \ root issues; expecting R3 \u2264 3)."
---

# What to review

Read `backlog/ready/2026-05-13-046-context-fatigue-via-role-typed-state.md` at commit `a252dc29c5b01679c0d24db5ff1c31151c3a47a1`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
