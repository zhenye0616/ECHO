---
item_id: 2026-05-25-074-echo-cli-binary
round: 7
spec_commit_sha: 5c0356de0b11ddd99539d9ab90adf43f69c395af
artifact_path: backlog/ready/2026-05-25-074-echo-cli-binary.md
class: structural-reform
requested_at: '2026-05-26T07:07:46Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 039297bb-7375-475d-8e55-97f3e07cc32e
focus_hints: "r7 CONVERGENCE CHECK: r6 codex-ops was 'proceed' (zero findings); r6\
  \ codex had 1H+1M in the packaging contract (now patched). Expecting r7 to be 'proceed'\
  \ from BOTH reviewers \u2014 if so, declare claim-ready. Verify: (1) broadened files\
  \ allowlist (dist/**/*.js) plus the canonical tsconfig.cli.json shape correctly\
  \ pack ALL transitive runtime imports \u2014 especially the deep paths (dist/echo-home/wizard/*.js,\
  \ dist/echo-home/adapters/*.js, dist/storage/*.js, dist/mcp/util/source-app.js).\
  \ (2) AC1.5 step 3b's strengthened smoke (real 'echoctl doctor --json' against unreachable\
  \ daemon \u2192 exit 1 + overall:broken) actually exercises transitive imports.\
  \ (3) tsconfig.cli.json's exclude list is sufficient (tests + tools + *.test.ts)\
  \ \u2014 no spurious test code in the tarball. (4) Per 058 discipline: are r6 patches\
  \ sound or did the broader allowlist introduce its own gap (e.g., over-inclusion\
  \ of test fixtures, dev-only modules)?"
---

# What to review

Read `backlog/ready/2026-05-25-074-echo-cli-binary.md` at commit `5c0356de0b11ddd99539d9ab90adf43f69c395af`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
