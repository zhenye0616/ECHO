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
- The private source prerelease is built once and founder-approved over the presented nine-field tuple (source SHA, source tree, version, source-archive SHA-256, lock hash, manifest hash, run ID, workflow artifact ID, workflow-artifact digest); publish may not rebuild, and the annotated tag is written and verified before any draft exists.
- FOUNDER DECISION (2026-07-15, R10, option B): the destination namespace proven by authenticated exact readback is the sole durable mutation authority; Actions run-log intent markers are best-effort diagnostics only — presence proves nothing, absence proves nothing, and log content never authorizes continuation, recovery, or attribution. Each next release mutation is permitted only after the previous call returned unambiguous success AND exact readback verified the expected object/bytes/digest/flags; any lost/ambiguous response, failed/ambiguous readback, cancellation, or runner loss means read-only reconciliation then nonzero stop with zero later writes; a fresh dispatch is manual, founder-dispositioned, and re-enters only through the complete authenticated fully paginated empty-namespace preflight (tag-only, draft, partial-assets, and apparently-complete states all block).
- Both create-only pushes (AC1 prepared main push, AC6 tag push) use explicit `git push --porcelain --force-with-lease=...`; the tag push's refspec source is the pre-verified immutable TAG_OBJECT_OID, never the mutable local refs/tags/v<version>; the three release assets are written and read back one at a time in fixed order, each with its own marker → write → authenticated readback leg.
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
