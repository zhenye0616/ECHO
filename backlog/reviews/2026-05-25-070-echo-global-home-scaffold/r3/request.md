---
item_id: 2026-05-25-070-echo-global-home-scaffold
round: 3
spec_commit_sha: 2137c9cf268d68176a321847b4d25d603f2796e5
artifact_path: backlog/ready/2026-05-25-070-echo-global-home-scaffold.md
class: narrow
requested_at: '2026-05-25T23:01:16Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 7c70bd47-ab3a-4f77-ada4-9a8488e88a4e
focus_hints: "r2 verification round \u2014 both r2 patches are REMOVAL of r1-introduced\
  \ mechanism, per disposition discipline. Verify: (1) AC2.2 (line ~157) no longer\
  \ claims wx provides crash-atomic durability \u2014 it now scopes the invariant\
  \ strictly to concurrent-first-create exclusion (O_CREAT|O_EXCL). The text now explicitly\
  \ says partial-write recovery is out of scope for 070 and points to downstream schema_version===1\
  \ check in 071-074 as the recovery contract. Confirm this honest scoping is the\
  \ right resolution vs adding linkSync+temp-file mechanism (which 070 deliberately\
  \ defers to V1.5+). (2) AC4 Test 4 (Promise.all microtask race) has been removed\
  \ entirely. Test 3 (Partial-state recovery) is now documented as also pinning the\
  \ EEXIST-as-success handler \u2014 EEXIST is EEXIST regardless of how the pre-existing\
  \ file got there. Confirm Test 3's expanded purpose is sufficient to pin the EEXIST\
  \ handler contract. (3) Test counts back to 3+3=6, consistent with the existing\
  \ Tests section and DoD. (4) The substrate-ships-dormant framing means the partial-write\
  \ failure window for a few-hundred-byte init write is acceptable for V1; no operational\
  \ gap remains for the substrate phase. Codex-ops lens: confirm no production durability\
  \ surprise remains under the substrate ships-dormant model; if the per-file-interleave\
  \ concern from r2 F5 still applies somewhere, flag it."
---

# What to review

Read `backlog/ready/2026-05-25-070-echo-global-home-scaffold.md` at commit `2137c9cf268d68176a321847b4d25d603f2796e5`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
