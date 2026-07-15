---
id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
title: "Canonical echo-context repository, self-contained CI, and source-artifact authority"
status: proposed
priority: HIGH
estimate: 3d
created: 2026-07-15
blocked_by:
  - 2026-07-13-135-local-echo-context-source-extraction
task_state_ref: 2026-07-15-136-echo-context-canonical-repository-release-substrate
requested_reviewers: ["codex", "claude"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/.github/workflows/** # NEW least-privilege CI and private source-release workflows
  - /Users/zhenye/Desktop/echo-context/package.json # prerelease identity and self-contained operator scripts
  - /Users/zhenye/Desktop/echo-context/package-lock.json # exact dependency graph for the source artifact
  - /Users/zhenye/Desktop/echo-context/README.md # replace extraction-era no-remote/awaiting-review status
  - /Users/zhenye/Desktop/echo-context/LICENSE # exact reviewed MIT license for standalone distribution
  - /Users/zhenye/Desktop/echo-context/.gitignore # ignore build/artifact/cache/log/state outputs
  - /Users/zhenye/Desktop/echo-context/AGENTS.md # target-repo internal-asset and review/build-once instructions
  - /Users/zhenye/Desktop/echo-context/tsconfig.json # commit the reviewed standalone compiler configuration
  - /Users/zhenye/Desktop/echo-context/eslint.config.mjs # commit the reviewed standalone lint configuration
  - /Users/zhenye/Desktop/echo-context/vitest.*.config.ts # separate source-independent CI from operator replay
  - /Users/zhenye/Desktop/echo-context/provenance/** # NEW baseline/repository authority plus regenerated runtime inventory
  - /Users/zhenye/Desktop/echo-context/schemas/** # NEW source-artifact and authority schemas
  - /Users/zhenye/Desktop/echo-context/tools/** # repository checks, deterministic source build, verification, and secret scan
  - /Users/zhenye/Desktop/echo-context/tests/migration/** # bind extraction proof to the frozen baseline instead of evolving HEAD
  - /Users/zhenye/Desktop/echo-context/tests/operator/** # explicit Project_echo raw-object replay, excluded from hosted CI
  - /Users/zhenye/Desktop/echo-context/tests/governance/** # NEW authority, artifact, and workflow-policy tests
  - raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md # NEW redacted authority/release record
  - raw/internal/agent-runs/** # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-15-136-echo-context-canonical-repository-release-substrate/** # workflow continuity pointers
  - backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # proposal and review revisions
  - backlog/ready/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # watcher-owned promotion target
  - backlog/claimed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # workflow claim target
  - backlog/pending_review/2026-07-15-136-echo-context-canonical-repository-release-substrate.md # workflow handoff target
  - docs/BACKLOG.md # generated stage-derived index
spec_refs:
  - backlog/complete/2026-07-13-135-local-echo-context-source-extraction.md # exact reviewed extraction and later-authority boundary
  - raw/internal/migrations/2026-07-13-135-echo-context.md # accepted source/parity evidence and target identity
  - raw/internal/migrations/2026-07-13-135-echo-context-review.md # independent acceptance record
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # two-organization-repository topology + controls-preservation rule; predates this split and is not its authority
  - raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md # founder-authorized cross-repo execution/review protocol
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context remains an internal asset
  - /Users/zhenye/Desktop/echo-context/provenance/target-only-policy.v1.json # extraction-era exact-HEAD/finality constraint
  - /Users/zhenye/Desktop/echo-context/provenance/runtime-inventory.v1.json # current executable/dependency closure
  - /Users/zhenye/Desktop/echo-context/tests/migration/object-closure.test.ts # one-branch/no-remote extraction invariant to historicize
  - /Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts # source-dependent proof that hosted CI cannot assume
  - /Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts # source replay seam and sealed eight-tool evidence
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
target_repo: "/Users/zhenye/Desktop/echo-context"
target_remote: "https://github.com/zhenye0616/echo-context"
target_branch: ""
target_worktree: ""
target_head_sha: ""
target_pr_url: ""
target_landed_sha: ""
project_landed_sha: ""
---

# Canonical echo-context repository, self-contained CI, and source-artifact authority

## Why this spec exists

Item 135 proved that the local echo-context extraction is source-independent and behaviorally faithful, but it deliberately ended with one migration branch, no remote, no install, and no runtime authority. Its extraction-finality tests also bind several checks to the then-current HEAD and two operator proofs default to Project_echo Git objects, so blindly publishing that directory would produce a repository that cannot safely evolve or validate itself in hosted CI.

This first gate makes echo-context/main the canonical source authority without confusing source publication with installation or live-state authority. It preserves the exact reviewed extraction as an immutable baseline, creates the private canonical repository, gives clean clones a self-contained quality gate, and seals one explicitly non-installable source artifact for item 137. Project_echo remains the installed runtime and state authority throughout this item. The third-repository split executed here is authorized by the 2026-07-15 successor-repository execution decision and item 135's founder-reconciled merge; the G2 topology record defined two organization repositories and kept the context layer inside echo-dev-platform until split triggers fired, so it is cited for its controls-preservation rule, not as the split authority.

This internal-asset work is permitted by the scope guard because unified machine context across Codex, Claude Code, and Cursor is required by the current ECHO development workflow and Team-product delivery. It is not a parallel commercial roadmap or a second product.

## Acceptance Criteria

### AC1 — Publish the exact reviewed extraction as the immutable private baseline

Before any remote mutation, the builder proves /Users/zhenye/Desktop/echo-context is clean at commit 0cf7b006eba665c0bf55e82ff04da70f19f01ebb and tree 70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05, passes git fsck --full, has exactly the accepted 190 tracked files, and matches the item-135 migration and independent-review records. A full reachable-history secret scan runs locally and any finding stops publication. Because the frozen baseline predates tools/secret-scan.sh, this bootstrap scan uses gitleaks pinned to an exact release version and binary SHA-256 (both recorded in the migration record), invoked non-shallow across every ref (`gitleaks detect` over `--log-opts='--all'` with redaction on), reporting file paths and rule IDs only — never credential values. The builder runs and records this bootstrap scan; AC4's committed tools/secret-scan.sh must encode the equivalent scanner, version pin, configuration, and invocation so the pre-push and post-push scans are the same contract.

At a founder checkpoint, the founder creates the empty private GitHub repository zhenye0616/echo-context with no generated README, license, .gitignore, commit, tag, release, or package. The local migration branch is renamed to main without rewriting its commit and the canonical remote is added; per the locked 2026-07-15 execution decision, the initial push of the exact baseline commit to echo-context main is founder-operated — the builder prepares commands and verifies readback but never executes a push to target main, and no reading of this spec authorizes a builder identity to push to either main. API and fresh ls-remote readback must prove private visibility, the expected owner/name, default branch main, and refs/heads/main exactly equal to 0cf7b006eba665c0bf55e82ff04da70f19f01ebb. Force-push, merge/squash replacement, and any history rewrite fail.

If the remote already exists, is non-empty, has the wrong visibility/owner, or points main elsewhere, stop for founder disposition; never adopt or overwrite it automatically. Remote creation and the initial push are the only external mutations in this AC. Personal-account hosting under zhenye0616 is the accepted initial owner — a recorded deviation from the G2 record's organization-repository shape; a later organization transfer remains governed by the G2 controls-preservation gate, and the AC6 migration record must state this deviation explicitly.

### AC2 — Convert extraction-finality into explicit successor provenance

Add provenance/extraction-baseline.v1.json, provenance/repository-authority.v1.json, their schemas, and tools/check-repository-authority.mjs. The baseline binds the accepted commit/tree, the 190-path mode/blob/content inventory, item-135 evidence hashes, and independent-review record. The authority record binds canonical repository/default branch, source_authority echo-context/main, artifact_authority versioned-source-artifact, extraction baseline ancestry, runtime_authority false, state_authority false, installed false, and maturity DEV.

Refactor tests/migration/object-closure.test.ts, tests/migration/committed-source-only.test.ts, and every target-only/extraction check that currently treats evolving HEAD as the final 190-file acceptance object. Those tests must inspect the frozen baseline through Git objects while successor tests require that baseline to be an ancestor of every releasable source SHA. Existing item-135 provenance bytes remain immutable historical proof; successor manifests reference rather than rewrite them.

README.md must state the exact split: echo-context/main owns source after this item; Project_echo still owns the active daemon, live state, client endpoint, and rollback. It must not say the repository is installed, authoritative at runtime, qualified, or a commercial product.

Add LICENSE as a byte-identical reviewed copy of Project_echo's MIT license; .gitignore covering at least node_modules, dist/build, artifacts, caches, temporary files, logs, and mutable state; and a target AGENTS.md that locks the internal-asset boundary, main-branch review rule, exact-artifact release rule, no-live-state default, and Project_echo coordination-record requirement. These are successor files covered by provenance and the source artifact, not retroactive changes to the frozen extraction baseline.

### AC3 — Make a sibling-free clean clone fully self-testing

Commit the exact standalone tsconfig.json and eslint.config.mjs configurations used in the accepted item-135 private-clone review. Add explicit vitest.ci.config.ts and vitest.operator.config.ts. package.json defines the exact scripts the gate, CI, and the fresh-clone run all share: `typecheck`, `lint`, `test:ci` (vitest run --config vitest.ci.config.ts), `test:operator` (vitest run --config vitest.operator.config.ts), `verify:inventory`, `verify:authority`, `verify:artifact`, and `scan:secrets` (tools/secret-scan.sh). The scripted fresh-clone acceptance run is tools/fresh-clone-acceptance.sh and drives only these named scripts plus git fsck. Move only the raw Project_echo Git-object recomputation portions of tests/migration/parity-matrix.test.ts and tests/migration/context-tool-evidence.test.ts into tests/operator/source-parity.test.ts; the operator suite requires an explicit ECHO_SOURCE_GIT_DIR and pinned source SHA and never supplies a founder-path default.

A fresh no-local clone in a temporary HOME, with Project_echo and sibling repositories absent and all ECHO_* variables cleared, must pass npm ci from the exact lock, typecheck, lint, the complete source-independent CI suite, runtime-inventory validation, repository-authority validation, context-tool roster/parity fixtures, and service parity. There may be no unexpected skip caused by missing Project_echo. Hosted CI must never read /Users/zhenye/Desktop, ~/.echo, ~/.echo-context, credentials, or a live database.

The operator replay remains independently runnable against the pinned item-135 source objects and must still reproduce the accepted source inventory and parity aggregate. It is a release-review check, not a hosted-CI dependency.

### AC4 — Add least-privilege CI and enforceable repository controls

Add .github/workflows/ci.yml (job IDs quality-macos, quality-ubuntu), secret-scan.yml (job ID secret-scan), and source-release.yml (job IDs build-artifact, publish-release) plus tools/secret-scan.sh and workflow-policy tests. All third-party actions are pinned to immutable commit SHAs. Default permissions are contents: read; only the founder-gated release job receives the minimum write scope it needs. Quality jobs pin Node 22.22.1 and npm 10.9.4, run on macOS and Ubuntu, and exercise AC3 from a clean clone. The secret scan covers the full reachable history before and after first publication and reports paths/rules without printing credential values; tools/secret-scan.sh pins the same scanner, version, digest, and configuration as AC1's bootstrap invocation, and tests/governance/workflow-policy.test.ts asserts the pre-push and post-push scan commands are equivalent.

The founder (or a founder-approved named operator, recorded in the migration record) configures main protection with these exact fields: required pull-request review with at least one approval, required status checks exactly quality-macos, quality-ubuntu, and secret-scan with strict up-to-date-branch enforcement, no bypass actors, force-push rejected, and deletion rejected. Read back the effective repository rules through the hosting API and save only nonsecret settings and run identifiers in the migration record. If the account/hosting tier cannot enforce the locked controls, stop for founder disposition rather than silently weakening or claiming the release gate.

CI and workflows may not checkout Project_echo, use a founder-local absolute path, consume live user state, publish to a public registry, or create a release from an unreviewed branch.

### AC5 — Build one deterministic, explicitly non-installable source artifact

Set the first successor version to 0.1.0-dev.136.1 and add schemas/source-artifact-manifest.v1.schema.json, tools/build-source-artifact.mjs, tools/verify-source-artifact.mjs, and tests/governance/source-artifact.test.ts. The builder consumes committed Git objects at a reviewed source SHA, never mutable working-tree bytes, and emits exactly three sidecar files: echo-context-<version>-source.tgz, echo-context-<version>-source.tgz.sha256 (coreutils sha256sum format), and echo-context-<version>-source.manifest.json. The manifest is a sidecar and is never a member of the archive it describes — no self-referential size/hash. The manifest serializes as canonical JSON (UTF-8, sorted keys, LF, single trailing newline). The archive root is the single directory echo-context-<version>/ containing exactly the Git-tracked paths at the source SHA in sorted path order, modes taken from Git (0644/0755), uid/gid 0 with numeric owners, member mtimes fixed to the source commit's committer timestamp, and gzip written without name/timestamp metadata.

The manifest binds version, source commit/tree, extraction baseline, package-lock hash, exact path/mode/blob/content inventory, tar member order/modes/timestamps, artifact size/hash, and the literal classifications artifact_kind source, installable false, runtime_authority false, state_authority false, maturity DEV. The archive contains source and verification material only; it has no compiled service, LaunchAgent, client config, credential, live state, or install script.

Two builds from the same Git objects and pinned toolchain must be byte-identical — a determinism property proven in tests; the release path itself builds exactly once per AC6. Dirty-byte substitution, wrong commit/tree/version, missing/extra/reordered member, unsafe archive path, mode/timestamp drift, checksum mismatch, baseline non-ancestry, or changing any authority/installability flag fails verification.

### AC6 — Seal one private source prerelease without granting runtime authority

All successor changes occur in an isolated echo-context feature worktree/branch under the founder-authorized multi-repo protocol. After independent review, the founder merges that target PR to echo-context/main; readback proves the landed canonical SHA/tree and required checks. Only a fresh detached clone of that landed main SHA may enter the release gate.

source-release.yml is dispatched manually (workflow_dispatch) with explicit inputs — source SHA, version, and expected lock/manifest hashes — and fails unless that SHA equals canonical main HEAD; a concurrency group serializes release runs. Its unprivileged build-artifact job (contents: read) checks out the landed SHA as a fresh detached clone, verifies extraction-baseline ancestry, builds the artifact exactly once, and persists the three AC5 files as an immutable workflow artifact identified by run ID, artifact ID, and SHA-256 digest. Founder release approval happens after this build: the complete tuple (source SHA, tree, version, artifact SHA-256, lock hash, manifest hash, run ID, artifact ID) is presented, and approval is granted only through the protected environment source-release, whose sole authorized reviewer is the founder identity zhenye0616.

The publish-release job runs only after that approval with the minimum write scope, downloads the persisted artifact, re-hashes it against the approved digest, re-reads the repository ID, owner, and private visibility through the API immediately before publication, and publishes those exact bytes without rebuilding. It rejects any pre-existing tag, release, or asset of the same name, never clobbers, and before declaring success reads back the annotated tag object and uploaded asset hashes against the approved tuple. The tag is annotated and bound to the landed canonical source SHA; publication is executed by the guarded workflow under founder approval, never by a builder identity directly.

A fresh no-local clone downloads the three private prerelease assets named in AC5, verifies the archive against the .sha256 file, validates the manifest (canonical-JSON bytes, inventory, extraction-baseline ancestry) with tools/verify-source-artifact.mjs, and runs the AC3 source-independent checks. raw/internal/migrations/2026-07-15-136-echo-context-repository-bootstrap.md records the canonical URL, baseline and final main SHAs, CI run IDs, tag/version, artifact hash, reviewer identity, and the explicit authority split without credentials or expiring URLs.

The handoff to item 137 is the immutable tuple source SHA + source tree + version + source artifact SHA-256 + lock hash + manifest hash. At completion, echo-context owns source and source-artifact authority only; Project_echo remains installed runtime and live-state authority, and no machine client points at the new repository or artifact.

## Out of Scope (Don't Drift)

- No LaunchAgent, machine-wide/per-user install, service composition root, MCP client registration, port, bearer-token, or loopback-exposure decision.
- No live database, capture checkpoint, onboarding state, project config, credential, or client-config read/copy/migration.
- No active daemon switch, dual-run, rollback ceremony, Project_echo context freeze, or runtime/state authority transfer.
- No npm/public package publication, public repository visibility, auto-update channel, source signing program, or generic release framework.
- No context-tool, capture, storage, retrieval, schema, clustering, enrichment, or embedding behavior change.
- No Project_echo deletion/rename/deprecation and no echo-brain or echo-loop repository/install work.
- No Team-product maturity advancement; this internal source release remains DEV.

## Risks

- Extraction evidence could be weakened by rebasing it onto evolving HEAD. The frozen-baseline plus ancestry contract is the fallback; existing evidence bytes are never rewritten.
- Hosted CI could appear green only because the founder machine supplies Project_echo or state. AC3 removes implicit paths and proves a clean sibling-free clone.
- Publishing history could expose a secret. Pre/post full-history scans block the private push/release without printing values.
- Native better-sqlite3 behavior can differ across hosted runners. CI pins Node/npm and uses macOS plus Ubuntu; item 137 separately owns the exact Darwin runtime closure.
- Repository controls may not be enforceable on the current hosting tier. The builder stops for a founder decision and does not claim source-release completion.
- A source archive could be mistaken for an installable runtime. Its filename, manifest, tests, README, and release record all state installable:false and authority:false.
- Remote creation, branch settings, tagging, and release publication are irreversible external mutations. Each is founder-gated and bound to readback evidence.

## Tests

- tests/governance/repository-authority.test.ts verifies the exact frozen baseline, successor ancestry, canonical authority fields, immutable item-135 evidence hashes, and negative wrong-remote/wrong-baseline fixtures.
- tests/governance/source-artifact.test.ts builds twice, compares bytes, validates the manifest/inventory, and rejects dirty, missing, extra, reordered, unsafe-path, checksum, version, tree, and authority-flag mutations.
- tests/governance/workflow-policy.test.ts parses all workflows and rejects mutable actions, excess permissions, unpinned Node/npm, Project_echo checkout, founder-local paths, live-state access, and rebuild-on-publish; it also asserts the build/publish job separation (unprivileged build-artifact; approval-gated publish-release behind the source-release protected environment) and bootstrap/committed secret-scan command equivalence.
- tests/operator/source-parity.test.ts, with explicit source Git dir/SHA, recomputes the item-135 source inventory and eight-tool parity aggregate; absence of those inputs fails clearly rather than skipping.
- tests/migration/object-closure.test.ts and tests/migration/committed-source-only.test.ts prove the 190-file extraction baseline stays closed while successor HEAD may add reviewed files.
- Existing tests/api/context-only-roster.test.ts and tests/integration/context-service.test.ts keep the exact eight-tool and service semantics unchanged.
- A scripted fresh-clone acceptance run executes npm ci, typecheck, lint, CI Vitest, runtime inventory, authority verification, artifact verification, git fsck, and secret scan with no sibling repositories or ECHO_* state.

## After Completion (Strategist Notes)

- Update no wiki page: repository source authority is internal shipped topology, not a new user-facing capability.
- Mark the item-135 follow-up's repository/default-path portion complete only for source publication; installation, vocabulary closure, auth, rehearsal, and live authority remain with 137/138/139.
- Feed the exact AC6 tuple into item 137 without rebuilding or substituting a mutable branch.
- Keep Project_echo as the context runtime/state authority and pinned migration source while item 138 lands the rehearsed substrate; item 139 alone may complete the founder cutover.
