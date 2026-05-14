---
item_id: 2026-05-13-047-codex-as-builder-binding-adapter
round: 3
spec_commit_sha: ac9fa7d46d67b1c1227e56fc92eba539f8cb0624
artifact_path: backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md
class: structural-reform
requested_at: '2026-05-14T06:04:14Z'
requested_reviewers:
- codex
- cursor
focus_hints: "R2 dispositioned: 6 findings (5 unique root) accept-with-patch + 1 acknowledged-nit.\
  \ Verdicts CONVERGED at R2 (both proceed_after_patches). One HIGH closed (codex\
  \ F1 lock-info $ITEM_ID unbound).\n\nR3 NARROW focus (last-mile):\n1. AC1 lock-info\
  \ content `codex-builder @ <ts> by $$ agent=$ECHO_AGENT_ID` \u2014 verify the metadata\
  \ is sufficient for operator stuck-lock diagnosis (\"whose lock is this?\"). If\
  \ yes, ship.\n2. AC4 case-3 polling sync (2s timeout, 0.1s sleeps) \u2014 verify\
  \ enough headroom for the slow stub's mkdir to land under reasonable test-runner\
  \ load. If yes, ship.\n3. DoD \"3 cases\" + R4 \u2192 AC5 sync \u2014 cosmetic;\
  \ verify count + risk text reference AC4 + AC5 correctly.\n\nCursor NIT on R2 request.md\
  \ wording (AC7+AC8 vs AC1-AC7) acknowledged; THIS R3 request uses correct AC numbering.\n\
  \nR3 target: convergence \u2014 both reviewers proceed or proceed_after_patches\
  \ with LOW only (no HIGH). Decay so far: R1: 8 (7 unique) \u2192 R2: 6 (5 unique)\
  \ \u2192 projected R3: \u22643 LOWs.\n\nSame roster [codex, cursor]. Cursor requires\
  \ manual `/review-queue-cursor` trigger from Cursor IDE."
---

# What to review

Read `backlog/ready/2026-05-13-047-codex-as-builder-binding-adapter.md` at commit `ac9fa7d46d67b1c1227e56fc92eba539f8cb0624`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
