---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 13
spec_commit_sha: 465536240e5a8d50b0dea49c9e4b75cf7c795935
artifact_path: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
class: structural-reform
requested_at: '2026-07-16T07:37:58Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: a87a2166-76b0-4ff6-9e48-a033eeb398b7
focus_hints: "Verify the R12 fresh-clone-verifier corrections at exact SHA 465536240e5a8d50b0dea49c9e4b75cf7c795935:\
  \ tools/fresh-clone-acceptance.sh stays a thin wrapper whose sole command is tools/fresh-clone-verifier.mjs;\
  \ the verifier spawns shell-free only (shell:false, executable+argv array) from\
  \ exact per-mode argv templates with fixed order and once-only counts \u2014 no\
  \ generic 'npm run <script>' form; common templates are git status --porcelain=v1\
  \ --untracked-files=all, git rev-parse HEAD, npm ci, exact no-extra-argument npm\
  \ run typecheck/lint/test:ci/verify:inventory/verify:authority/scan:secrets, and\
  \ git fsck --full; source mode alone runs one 'npm run build:artifact -- --source-sha\
  \ <validated-full-HEAD> --out <verifier-owned-temp-dir>' then one derived-path verify:artifact\
  \ consuming the build's manifest_hash carrier; release mode never builds and runs\
  \ one caller-bound verify:artifact after the existing manifest/source/version bindings;\
  \ test:operator is independently runnable but rejected by both mode allowlists;\
  \ three fail-closed empty-stdout clean probes (before install, immediately after\
  \ npm ci, after all mode checks plus verifier-owned temp cleanup) with no auto-cleanup\
  \ of non-verifier mutations; Tests bullet covers dirty-index, dirty-worktree, nonignored-untracked,\
  \ npm-lifecycle mutation, check-time mutation, leftover-temp, test:operator, disallowed\
  \ script/executable, extra/reordered/missing argv, shell:true/string command, duplicate/missing\
  \ invocation, wrong-mode, and source-build-in-release fixtures for both modes as\
  \ applicable. Confirm option B and no retry/adoption/cleanup/authority expansion."
---

# What to review

Read `backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md` at commit `465536240e5a8d50b0dea49c9e4b75cf7c795935`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
