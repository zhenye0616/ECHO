---
item_id: 2026-05-16-058-strategist-disposition-discipline-prefer-removal
round: 1
spec_commit_sha: ac8d1223ae4de1442d340078d34056a63cb44f19
artifact_path: backlog/ready/2026-05-16-058-strategist-disposition-discipline-prefer-removal.md
class: narrow
requested_at: '2026-05-16T06:32:02Z'
requested_reviewers:
- codex
focus_hints: "058 codifies the strategist disposition discipline that converged 057a\
  \ (r1\u2192r8: 7\u21926\u21925\u21923\u21922\u21923\u21922\u21920 findings). Two\
  \ file edits: (1) skills/review-queue-watch.md gets a new subsection inside Step\
  \ 3 (Disposition) at the path-(a)/(b)/(c) branching point; verbatim prose is embedded\
  \ in AC1 with two worked examples from 057a r4 (drop time-horizon optimization;\
  \ r5 zero storage-seam findings) and 057a r6 (drop runtime volume-warning; r7 zero\
  \ warning-path findings). (2) CLAUDE.md gets a new H3 'Strategist drift \u2014 patching\
  \ deeper instead of removing' under the existing 'Drift Prevention Applies to Agents\
  \ Too' section, pointing at the skill; verbatim prose in AC2. Verify: (a) the verbatim\
  \ prose is well-positioned at the moment of disposition choice; (b) the worked-example\
  \ signal is empirically tight \u2014 both r4 and r6 examples cite the specific mechanism\
  \ removed and the next-round zero-finding result; (c) the distinction between 'recent-patch\
  \ mechanism' (likely-removable) vs 'original-spec mechanism' (must-patch) is clearly\
  \ stated so the strategist doesn't apply removal to load-bearing AC text; (d) AC3\
  \ requires tools/sync-skills.sh post-edit so the .claude/commands/ adapter mirror\
  \ stays in sync (critical: editing only .claude/commands/ would be reverted by the\
  \ next sync); (e) the Out-of-Scope section correctly forecloses against (i) new\
  \ dispatch-helper code paths, (ii) retroactive 057a edits, (iii) a separate spec-evolution\
  \ skill, (iv) automating the removal choice, (v) changes to the 049 asymptote rule.\
  \ Pattern to evaluate: does the embedded skill prose successfully transmit the discipline\
  \ to a future strategist who doesn't have 057a in context? Worked examples are the\
  \ load-bearing test \u2014 they need to make the abstract pattern concretely actionable.\
  \ ops lens not applicable (operating-model change, no runtime/launchd surface)."
---

# What to review

Read `backlog/ready/2026-05-16-058-strategist-disposition-discipline-prefer-removal.md` at commit `ac8d1223ae4de1442d340078d34056a63cb44f19`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
