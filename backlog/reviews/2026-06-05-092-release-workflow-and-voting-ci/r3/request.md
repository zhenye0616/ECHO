---
item_id: 2026-06-05-092-release-workflow-and-voting-ci
round: 3
spec_commit_sha: 11d8dfaa45a69504473ae7fc055160f676eca58d
artifact_path: backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md
class: narrow
requested_at: '2026-06-05T21:15:17Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9e8f9a0e-5f67-459a-b039-ecbb9c2a21f3
focus_hints: "Verify r2 patches at the patched SHA. (AC2) ONE OS-portable Node crypto\
  \ SHA-256 verifier, run after actions/setup-node and before install on every matrix\
  \ OS; sha256sum/shasum/certutil explicitly forbidden \u2014 confirm no shell-divergent\
  \ verifier remains and Node-present ordering holds. (AC2b) rehearsal reachable without\
  \ a tag via pull_request/push (pre-merge window) while workflow_dispatch is post-merge-only\
  \ (new-workflow default-branch constraint) and publish stays gated on real v* tag\
  \ \u2014 confirm the trigger split is correct and complete. (AC5) builder gate is\
  \ local/static (npm pack + actionlint/YAML needs:-wiring + locally-runnable validation),\
  \ full GH-matrix run is founder/manual post-merge \u2014 confirm this is builder-executable\
  \ and doesn't require the pre-merge-impossible. Check NO new mechanism was introduced\
  \ by these refinements (guard against patch-on-patch)."
---

# What to review

Read `backlog/proposed/2026-06-05-092-release-workflow-and-voting-ci.md` at commit `11d8dfaa45a69504473ae7fc055160f676eca58d`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
