---
id: 2026-07-13-133-local-echo-brain-source-extraction
title: "Local standalone echo-brain source extraction and parity proof"
status: proposed
priority: HIGH
estimate: 4d
created: 2026-07-13
blocked_by:
  - 2026-07-13-132-product-graduation-foundation
task_state_ref: 2026-07-13-133-local-echo-brain-source-extraction
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - /Users/zhenye/Desktop/echo-brain/**                         # NEW standalone client-product source repository; local only
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW Project_echo provenance/parity record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-133-local-echo-brain-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-133-local-echo-brain-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-133-local-echo-brain-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # attended build; final repo is the acceptance object
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # locked Team product and client-machine endpoint
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # maturity and artifact evidence contract
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # T1 allowlist and provenance rule
  - backlog/complete/2026-07-13-132-product-graduation-foundation.md # reviewed in-repo product closure
  - product/source-boundary.v1.json                            # machine-readable product closure
  - product/package.template.json                             # runtime identity and dependencies
  - product/npm-shrinkwrap.json                               # pinned runtime tree
  - product/README.md                                         # DEV commands and inherited debt
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-brain source extraction and parity proof

## Why this spec exists

Item 132 defined the complete client-facing Team decision product. This item materializes that closure from exact Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` as a separate local repository at `/Users/zhenye/Desktop/echo-brain`. Project_echo remains source, backup, and authority. Remote creation, cutover, and maturity advancement are later founder checkpoints.

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-brain`; sibling lanes never touch it. The builder verifies the target is absent, then its first target write is one non-recursive `mkdir`; EEXIST aborts. It initializes local branch `migration/2026-07-13-133` with identity `ECHO Migration Agent <migration@echo.local>`, hooks/signing/templates disabled, and no remote. The accepted target is clean with exactly that branch, one committed root history, no alternates/promisor/replace state, and `git fsck --full` passing.

All source reads use `/usr/local/bin/git` 2.37.3 with explicit `--git-dir`, `GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_NO_REPLACE_OBJECTS=1`, and no alternates. The builder rejects replace/graft refs, partial-clone/promisor config, filters, export-subst attributes, symlinks, and submodules. It validates the pinned commit/tree/blob types and reads raw bytes with literal `ls-tree` plus `cat-file --batch`; checkout/archive filters and dirty worktree bytes are never inputs. Fixtures prove a dirty checkout, replacement object, and export-subst attribute cannot affect the target.

This is a trusted, attended local build—not a crash-atomic migration system. Do not create a migration controller, evidence publisher, capsule, process watcher, lock/takeover protocol, or custom Git handoff. Ordinary command output is summarized in the Project_echo run/migration records. An interrupted target is unaccepted and founder-archived before a fresh attempt.

### AC2 — Give echo-brain accurate product ownership

`package.json` names the private package and binary `echo-brain`, pins Node 22.22.1/npm 10.9.4, and owns a committed lock. `src/` contains only meeting intake, signal extraction, decision/rationale/action shaping, human review, decision cards/briefs, product health, and packaging. Generic context capture/retrieval, MCP, agent coordination, review queue, and task-state code are excluded.

`tools/check-dependencies.mjs` scans captured target HEAD blobs and partitions every edge: repository-local imports/reads resolve to one tracked target blob; bare imports/package CLIs map to exact locked npm rows; literal system helpers map to a pinned toolchain row. Missing, ranged, unused, path/Git/workspace, source-repo, or sibling edges fail.

### AC3 — Preserve deterministic file-level provenance

The source closure starts from the two entry points and allowed paths in pinned `product/source-boundary.v1.json`, the package template/shrinkwrap/README/runtime schema, and exactly the eight `tests/product/**` files established by item 132. A byte-sorted fixed-point resolver follows static TS/JS imports, dynamic literal imports/reads, package exports, schemas, fixtures, and literal child executables using raw pinned blobs. Unknown/computed repository-capable edges fail. The committed source plan records every reached path, Git mode, blob OID, and SHA-256.

Every source row appears exactly once as `copied`, `relocated`, `rewritten`, or `excluded`. Copied/relocated rows preserve bytes and mode. Production TypeScript and the eight product tests may not be rewritten or excluded. Rewrites are limited to exact package/import-name literals and generated package/README metadata, with before/after bytes, occurrence counts, and replay hash; whole-blob replacement is forbidden. Exclusions are limited to boundary-forbidden product-external behavior and may not be replaced by an authored equivalent. Target-only rows are limited to `package.json`, lockfile, README, provenance schemas/manifests/checkers, and new standalone tests/tools named by this spec.

`provenance/source-extraction.v1.json` partitions every regular tracked target blob other than itself. Target-local `check:provenance` validates schemas, target hashes/modes, transform replay, exact allowlists, and full target partition. A read-only operator audit independently recomputes the pinned source closure/raw blob hashes and rejects omitted files, disposition evasion, authored replacements, or target-only extras.

### AC4 — Enforce the product boundary natively

`product/source-boundary.v1.json` and `tools/check-boundary.mjs` reject backlog/review/coord/task-state/skills, context storage/retrieval/MCP, general capture, founder CLI brain, responders, unrelated workers, source/sibling paths, and imports leaving the repository. The full transitive target closure must resolve locally.

### AC5 — Own configuration, state, build, and artifact identity

`schemas/runtime-config.v1.schema.json` preserves the client-local config contract using secret references only. `src/runtime/paths.ts` owns state distinct from Project_echo and siblings. `npm ci` from the committed lock, `npm run build`, `npm pack`, installation of the produced tarball into a fresh scratch project, CLI smoke/config/selftest, and artifact member-manifest hashing all succeed without Project_echo access.

Two clean scratch clones of the same target commit build with `SOURCE_DATE_EPOCH` equal to the verified target commit time and produce identical tarball SHA-256/member manifests. The root README states `authority:false`, `maturity:DEV`, source SHA, item ID, and later-cutover requirement.

### AC6 — Preserve product behavior at the pinned boundary

`provenance/test-parity.v1.json` inventories exactly the eight pinned `tests/product` files. Each remains at the identical path with identical raw bytes, Git mode, source blob/hash, and destination hash; both target checker and operator audit enforce equality. A new standalone test proves synthetic `meeting input -> adapter -> manual review gate -> brief artifacts` with fixed time, no credentials, no real data, and no external service. No behavior redesign is allowed; selftest keeps `wedge_executed:false` while production API brain work remains pending.

### AC7 — Prove source independence from fresh clones

After committing target HEAD, the builder and later reviewer each create their own `git clone --no-local --no-hardlinks`, detach the exact accepted OID, remove origin, and verify clean/no-remotes/no-alternates/no-promisor/no-replace state. From a minimal allowlisted environment with scratch HOME/XDG/TMP and no Project_echo/sibling paths, they run dependency, boundary, provenance, test-parity, typecheck, lint, full tests, synthetic end-to-end, clean build/package/install/smoke, source-independence, `git fsck --full`, and `git diff-tree -r --check --root HEAD`.

The operator audit alone receives read-only access to the pinned Project_echo Git object database; target tests and runtime do not. Shared target status, refs, config, no-follow filesystem-versus-HEAD enumeration, and HEAD/tree are checked before and after clone verification. Any command failure stops the attended build; no claim is made that hostile child processes or local concurrent actors are contained.

### AC8 — Record the normal builder handoff and stop at DEV

The builder follows `docs/AGENT_INSTRUCTIONS.md` for Project_echo claim, run log, migration record, backlog move, commit, and feature-branch push; this spec adds no second publication protocol. The migration record contains source SHA, target path/branch/HEAD/tree, package/lock/provenance/parity hashes, exact verification commands/exits, artifact SHA-256/member manifest, no-remotes/clean checks, differences, `authority:false`, and `maturity:DEV`. The target repo receives no remote and its history is not changed after the record is written.

An independent reviewer binds the review request path/bytes, `spec_commit_sha`, reviewer roster/membership, accepted target HEAD/tree, and migration-record commit. It reruns the full AC1 object-state/shared-target checks and AC7 verification from its own clone, then records its commands/results in the review response. Passing proves only a local DEV source split.

## Out of Scope (Don't Drift)

- Do not create/configure a target remote, publish, deploy, install on a client, or advance maturity.
- Do not build migration/evidence/recovery/process-containment infrastructure.
- Do not implement rank 2/rank 3 features, org-context retrieval, delivery, or launchd.
- Do not modify/freeze current Project_echo product paths, live state, credentials, wiki, holdout-131, or sibling targets.

## Risks

- **Hidden dependency:** mitigate with final-HEAD edge partition plus clean-clone install/build/test.
- **Behavior drift:** mitigate with byte-identical tests, raw-object provenance, transform allowlists, and packaged synthetic parity.
- **Interrupted build:** target remains unaccepted and is manually archived before retry.
- **Premature authority:** explicit false-authority/no-remote/DEV evidence and a separate cutover proposal.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/` — the eight byte-identical product tests.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — meeting through manual gate to brief.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/provenance.test.ts` — raw-object closure, exact dispositions, target partition, and evasion failures.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — local/npm/toolchain edge partition.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no source/sibling/path/symlink/submodule escape.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/packaged-product.test.ts` — clean build, identical artifacts, install, and smoke.
- Independent migration-record review — accepted HEAD/tree, clean shared target, rerun commands, artifact, and false authority.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority; this is a local DEV candidate.
- After founder accepts parity, propose private remote creation, branch protection, authority transfer, and old-path freeze separately.
