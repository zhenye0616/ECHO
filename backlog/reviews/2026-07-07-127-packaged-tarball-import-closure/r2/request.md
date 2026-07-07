---
item_id: 2026-07-07-127-packaged-tarball-import-closure
round: 2
spec_commit_sha: a1e0fe8b14e37def73cacac98cc7e28f0e986a9a
artifact_path: backlog/proposed/2026-07-07-127-packaged-tarball-import-closure.md
class: narrow
requested_at: '2026-07-07T07:29:47Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 77a6b578-923b-412d-93b0-797c80ee215d
focus_hints: Verify AC1 is packaging-config only (restructure alternative removed;
  no src/mcp/server.ts or responder-tree source edits; files_to_modify stays package.json
  + tests/packaging/); AC3 pins tests/packaging/packaged-boot.test.ts doing a real
  npm pack + extract/install outside repo + launch packaged entrypoint no-mocks, failing
  on real ERR_MODULE_NOT_FOUND; AC4 post-merge Windows CI is founder/watcher validation
  not a builder AC; builder completion gate = AC3 + AC5 local; no propose_decision/Slack/brain-boundary
  contract changes.
---

# What to review

Read `backlog/proposed/2026-07-07-127-packaged-tarball-import-closure.md` at commit `a1e0fe8b14e37def73cacac98cc7e28f0e986a9a`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
