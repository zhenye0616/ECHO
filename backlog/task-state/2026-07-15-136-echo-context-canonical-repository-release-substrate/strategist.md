## current_thesis

Turn the reviewed local echo-context extraction into the canonical private source repository and a verifiable source artifact. This gate changes source authority only; Project_echo remains installed runtime and live-state authority.

## locked_decisions

- Item 135's exact commit 0cf7b006eba665c0bf55e82ff04da70f19f01ebb and tree 70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05 are the immutable extraction baseline.
- The intended canonical remote is the empty private zhenye0616/echo-context repository; no generated initial commit and no history rewrite are allowed.
- The exact reviewed baseline is pushed first as main, then all evolution is descendant-only through reviewed changes.
- Existing extraction evidence remains immutable and is checked at the baseline, not reinterpreted against evolving HEAD.
- LICENSE, .gitignore, and target AGENTS.md become reviewed successor files; they do not alter the frozen baseline.
- echo-context/main becomes source authority; runtime, installation, endpoint, and live-state authority stay with Project_echo.
- Clean hosted CI is sibling-free and state-free; raw Project_echo object replay is an explicit operator/release-review suite.
- Main requires enforceable no-force/no-delete, PR, quality, and secret-scan controls; inability to enforce stops the release gate.
- Version 0.1.0-dev.136.1 produces a deterministic source archive classified installable:false, runtime_authority:false, and state_authority:false.
- The private source prerelease is built once and founder-approved by source SHA + version + artifact SHA-256; publish may not rebuild.
- Successor work uses an isolated target branch, independent review, founder target-main merge/readback, then a fresh clone of the landed SHA for build/release.
- Item 137 consumes the exact released tuple and is solely responsible for an installable runtime artifact.

## open_questions

- Reviewers must verify that every extraction-era exact-HEAD/no-remote invariant is either preserved at the frozen baseline or replaced by an equally strict successor rule.
- The builder must stop if the target remote exists unexpectedly or the hosting tier cannot enforce the locked main controls.

## dont_touch

- Do not install a daemon, choose live ports/auth, read or migrate live state, rewire clients, switch authority, or alter context behavior.
- Do not publish publicly, delete/rename Project_echo, touch echo-brain/echo-loop, or advance Team-product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/
