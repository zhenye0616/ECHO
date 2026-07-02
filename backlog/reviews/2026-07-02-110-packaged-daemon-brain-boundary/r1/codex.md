---
item_id: "2026-07-02-110-packaged-daemon-brain-boundary"
round: 1
reviewer: "codex"
artifact_sha: "52272d3339d7033fdcdb9b5e69e83e9fbfb082e0"
completed_at: '2026-07-02T07:06:56Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC3 / tests/packaging/import-closure.test.ts"
    finding: "AC3 currently allows the guard to either pack the tarball or walk dist against package files rules. That leaves room for a live-tree closure check that can accidentally resolve excluded files still present in the checkout, missing the packaged-install failure. Patch AC3 to require building, running npm pack against the package under test, reading the actual packed file set, and resolving shipped dist/**/*.js relative imports against that packed file set. Red verification should fail on current main because the packed file set lacks dist/surfaces/ceo-slack-responder/brain.js and intake-seed.js."
---

## Review

Proceed after tightening AC3 as above. The hoist list includes `preflightBrain`, preserves the 076 exclusion boundary, and the allowed files line up with the intended mechanical move plus import rewrites.
