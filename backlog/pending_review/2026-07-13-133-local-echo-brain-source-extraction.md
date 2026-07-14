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
ready_content_sha: 832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748
files_to_modify:
  - /Users/zhenye/Desktop/echo-brain/**                         # NEW standalone client-product source repository; local only
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW Project_echo provenance/parity record
  - raw/internal/migrations/2026-07-13-133-echo-brain-review.md # independent same-host review record
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
claimed_by: "fable-builder-133"
claimed_at: "2026-07-14T05:46:05Z"
branch: "agent/133-echo-brain"
worktree: "/Users/zhenye/Desktop/Project_echo--133-echo-brain"
head_sha: "0caef8237c2aefba0d65c5f70000220654ee8f2e"
pr_url: ""
agent_notes: |
  Builder fable-builder-133 (Claude Code). Attended one-time extraction; no migration
  controller/evidence-publisher built (per one-shot-lifecycle decision).

  Target: /Users/zhenye/Desktop/echo-brain, branch migration/2026-07-13-133, single root
  commit HEAD 54259ef67eb90b5a1412bf15bac716180e822c72, tree e13b0cc57365acf9600f06882750982e02412c5a,
  no remote, clean tree. Migration record on feature head 0caef8237c2aefba0d65c5f70000220654ee8f2e.

  VERIFIED GREEN this session:
  - AC1 sanitized-envelope repo creation; 36 source-derived blobs byte-identical (hash-object==source OIDs);
    fsck --no-reflogs --unreachable empty; object-set==reachable-set (78 objs).
  - AC2 check-dependencies exit 0; AC4 check-boundary exit 0 (closure resolves locally, external={ajv,better-sqlite3}).
  - AC3 check-provenance exit 0 + independent audit-pinned-extraction verdict PASS (0 byte divergences vs pinned
    source object DB), 56-row partition, exact 21 target-only set, empty transform/exclusion allowlists.
  - AC6 test-parity records the 8 byte-identical parity leaves; synthetic e2e passes.
  - vitest 14/14 (5 files) incl packaged-product proving B0==B1 identical tarball SHA-256
    d8abbae572bac1a00c93522263d9e8f94112fe582aa7ef2ddf992267e39c970f (27 members) + offline clean-prefix install;
    source-independence (no symlink/submodule/remote/sibling-escape) green.

  REMAINING (documented, not run): AC5/AC7 formal offline sandbox-exec 4-clone matrix (B0/B1/B2/R1 across
  separate clones under '(deny network*)' with DNS/direct-IP probes + isolated cache fill) — determinism +
  offline install demonstrated with B0/B1 but the four-clone sandbox matrix was not executed. AC8 codex-ops
  reviewer leg is the reviewer's responsibility.

  QUESTION FOR REVIEWER/FOUNDER — AC3<->AC5 schema path: byte-identical src/product/config.ts:55 + package.json
  files field reference schemas/product/runtime-config.v1.schema.json, but AC5 names schemas/runtime-config.v1.schema.json.
  Reconciled by committing at the AC5 path and having verify-artifact.mjs stage into the tarball at schemas/product/...
  so the unchangeable runtime loader resolves it. Confirm this reconciliation or direct a same-path copy instead.

  Also flagged: 8 product tests treated as byte-parity leaves (not executed); their runtime join(REPO_ROOT,'<literal>')
  references are recorded parity-only, not module edges. Executed suite = tests/migration/** + end-to-end-synthetic.
  Full details in raw/internal/migrations/2026-07-13-133-echo-brain.md and the agent-run log.
review_notes: ""
---

# Local standalone echo-brain source extraction and parity proof

## Why this spec exists

Item 132 defined the complete client-facing Team decision product. This item materializes that closure from exact Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` as a separate local repository at `/Users/zhenye/Desktop/echo-brain`. Project_echo remains source, backup, and authority. Remote creation, cutover, and maturity advancement are later founder checkpoints.

## Acceptance Criteria

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder is the sole target writer; sibling lanes never touch `/Users/zhenye/Desktop/echo-brain`. The builder-only creation gate verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes local branch `migration/2026-07-13-133` with fixed identity, hooks/signing/templates disabled, and no remote. The accepted target is clean with exactly that branch, one committed root history, no alternates/promisor/replace state, and passing fsck. After handoff, an independent same-host reviewer is explicitly authorized read-only access and may create its own clone outside the target.

All source reads use one launcher: `env -i HOME=<scratch> LC_ALL=C TZ=UTC PATH=/usr/local/bin:/usr/bin:/bin GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_ATTR_NOSYSTEM=1 GIT_NO_REPLACE_OBJECTS=1 /usr/local/bin/git --git-dir=<project-git-dir> ...`. It rejects `commondir`, `objects/info/alternates`, graft/replace refs, partial-clone/promisor config, config includes, filters/export-subst, and any inherited `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, or `GIT_CONFIG_COUNT/KEY/VALUE`. It validates commit/tree/blob types, enumerates `ls-tree -rz --full-tree`, parses NUL paths without quoting, and reads exact declared blob lengths through `cat-file --batch`. Fixtures cover hostile paths, dirty checkout, replacement objects, commondir/alternate/config redirection, and export-subst. The `env -i` sanitized environment above is the shared Git envelope (pinned `/usr/local/bin/git` 2.37.3); it composes with three explicit command forms — source-object reads (`--git-dir=<project-git-dir>`, read-only plumbing only), target/worktree operations (`-C <target>` with explicit work-tree), clone operations (explicit source and destination operands), and a constrained Project_echo handoff form used only by AC8 (detached worktree creation at the builder head, one-path commit, lease push, and ls-remote probe under the same sanitized per-command configuration). No form may address another form's repository; wrong-repository fixtures fail.

This is a trusted, attended local build—not a crash-atomic migration system. Do not create a migration controller, evidence publisher, capsule, process watcher, lock/takeover protocol, or custom Git handoff. Ordinary command output is summarized in the Project_echo run/migration records. An interrupted target is unaccepted and founder-archived before a fresh attempt.

### AC2 — Give echo-brain accurate product ownership

`package.json` names the private package and binary `echo-brain`, pins Node 22.22.1/npm 10.9.4, and owns a committed lock. `src/` contains only meeting intake, signal extraction, decision/rationale/action shaping, human review, decision cards/briefs, product health, and packaging. Generic context capture/retrieval, MCP, agent coordination, review queue, and task-state code are excluded.

`tools/check-dependencies.mjs` scans captured target HEAD blobs and partitions every edge: repository-local imports/reads resolve to one tracked target blob; bare imports/package CLIs map to exact locked npm rows; literal system helpers map to a pinned toolchain row. Missing, ranged, unused, path/Git/workspace, source-repo, or sibling edges fail.

### AC3 — Preserve deterministic file-level provenance

The reviewed policy is committed as `provenance/extraction-policy.v1.json` with `reviewed_spec_sha` equal to this item's eventual `ready_content_sha`. Its source seeds are exactly the two entry points and allowed-path expansion in pinned `product/source-boundary.v1.json`, raw `product/package.template.json -> package.json`, raw `product/npm-shrinkwrap.json -> npm-shrinkwrap.json`, raw `product/source-boundary.v1.json -> product/source-boundary.v1.json`, the runtime schema, and the eight literal paths returned by the pinned item-132 `tests/product` inventory. `product/README.md` is a review input only; target `README.md` is an explicitly authored target-only file so it can state standalone identity without pretending byte relocation. A byte-sorted fixed-point resolver follows static/dynamic literal imports/reads, package exports, schemas, fixtures, and literal child executables using raw blobs. Unknown/computed repository-capable edges fail. The source plan records every reached path, Git mode, blob OID, and SHA-256.

Every source row appears exactly once as `copied` or `relocated`; reviewed rewrite and exclusion allowlists are empty. Production TypeScript, `product/source-boundary.v1.json`, and all eight tests remain byte/mode identical. Boundary-forbidden behavior is outside the source closure, not excludable. The exhaustive 21-path target-only set is exactly: `README.md`; `provenance/extraction-policy.v1.json`; `provenance/source-plan.v1.json`; `provenance/source-extraction.v1.json`; `provenance/test-parity.v1.json`; `provenance/dependency-toolchain.v1.json`; `provenance/schemas/extraction-policy.v1.schema.json`; `provenance/schemas/source-plan.v1.schema.json`; `provenance/schemas/source-extraction.v1.schema.json`; `provenance/schemas/test-parity.v1.schema.json`; `provenance/schemas/dependency-toolchain.v1.schema.json`; `tools/check-provenance.mjs`; `tools/check-boundary.mjs`; `tools/check-dependencies.mjs`; `tools/audit-pinned-extraction.mjs`; `tools/verify-artifact.mjs`; `tests/product/end-to-end-synthetic.test.ts`; `tests/migration/provenance.test.ts`; `tests/migration/dependency-set.test.ts`; `tests/migration/source-independence.test.ts`; and `tests/migration/packaged-product.test.ts`. Exact set equality is required. Relocated shrinkwrap bytes are identical and npm recognizes it as the sole lock; `package-lock.json` is forbidden.

`provenance/source-extraction.v1.json` partitions every regular tracked target blob other than itself. Target-local `check:provenance` validates schemas, target hashes/modes, reviewed policy SHA, empty transform/exclusion sets, and full target partition. Read-only `tools/audit-pinned-extraction.mjs` is invoked exactly as `/usr/local/bin/node tools/audit-pinned-extraction.mjs --source-git-dir <project-git-dir> --source-sha 2971310441b69735cbe759293abd8c4d044bf347 --target-git-dir <clone>/.git --target-commit <accepted-oid> --policy provenance/extraction-policy.v1.json --out <absent-json>`. It independently runs AC1's object envelope and emits a versioned policy/spec/source-tree/target-tree/sorted-row/target-only/verdict result. Omission, policy mismatch, disposition evasion, hash/mode drift, or extra blob exits nonzero.

### AC4 — Enforce the product boundary natively

`product/source-boundary.v1.json` and `tools/check-boundary.mjs` reject backlog/review/coord/task-state/skills, context storage/retrieval/MCP, general capture, founder CLI brain, responders, unrelated workers, source/sibling paths, and repository-local path-like edges that escape the repository. Bare npm imports and package CLIs are validated by AC2's locked-edge partition, and both `node:`-prefixed and bare core-module specifiers (`fs`, `path`, ...) classify against the pinned Node 22 built-in set — never as npm rows; each class has pass/fail fixtures. The full transitive target closure must resolve locally.

### AC5 — Own configuration, state, build, and artifact identity

`schemas/runtime-config.v1.schema.json` preserves the client-local config contract using secret references only. `src/runtime/paths.ts` owns state distinct from Project_echo and siblings. `provenance/dependency-toolchain.v1.json` and its schema name every root/transitive lifecycle hook, allowed explicit package script, package/version/integrity, JavaScript CLI, and absolute system helper; unlisted hooks/executables fail. Verification uses `/usr/local/bin/node` 22.22.1 and absolute npm-cli 10.9.4 under `env -i` with only scratch HOME/XDG/TMP, `LC_ALL=C`, `TZ=UTC`, umask 0022, `SOURCE_DATE_EPOCH`, `PATH=/usr/local/bin:/usr/bin:/bin`, empty npm user/global configs, and explicit cache/registry flags; `NODE_OPTIONS`, `NODE_PATH`, proxy, shell-startup, DYLD/LD, and inherited npm/Git variables are absent. The only online phase is an isolated cache fill that admits exact lockfile registry URL/integrity pairs and runs no package lifecycle code. Every `npm ci`, build, pack, fresh-project tarball install, and smoke occurs offline under `/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'`; a DNS probe and direct-IP socket probe must fail before and after each lifecycle-bearing phase, a local loopback control listener must accept a connection outside the profile and be denied inside it (both halves required), and absence/ineffectiveness of `sandbox-exec` aborts. B0/B1/B2/R1 use distinct npm cache roots. `npm ci`, build, pack, fresh-project tarball install, CLI smoke/config/selftest, and member-manifest hashing all succeed without Project_echo access.

Four named runs use the accepted commit time and distinct absent output roots: `B0` runs `/usr/local/bin/node tools/verify-artifact.mjs --run-id B0 --out <builder-target-output>` in the accepted target, `B1` and `B2` run the same command in two separate builder clean clones/outputs, and `R1` runs it in the independent reviewer clone/output. All four must share one tarball SHA-256, ordered member `{path,mode,size,sha256}` manifest, HEAD/tree, and lock hash; the migration record binds B0/B1/B2 and the review record binds R1 plus equality to them. The README states `authority:false`, `maturity:DEV`, source SHA, item ID, and later-cutover requirement.

### AC6 — Preserve product behavior at the pinned boundary

`provenance/test-parity.v1.json` inventories exactly the eight pinned `tests/product` files. Each remains at the identical path with identical raw bytes, Git mode, source blob/hash, and destination hash; both target checker and operator audit enforce equality. A new standalone test proves synthetic `meeting input -> adapter -> manual review gate -> brief artifacts` with fixed time, no credentials, no real data, and no external service. No behavior redesign is allowed; selftest keeps `wedge_executed:false` while production API brain work remains pending.

### AC7 — Prove source independence from fresh clones

After committing target HEAD, the builder creates B1 and B2 and the reviewer creates R1 with the sanitized AC1 Git envelope, an empty `GIT_TEMPLATE_DIR`, `core.hooksPath` pointing to an empty directory, and `git clone --no-local --no-hardlinks --no-checkout`; each then performs a hook-disabled detached checkout of the accepted OID, removes origin, and verifies clean/no-remotes/no-alternates/no-promisor/no-replace state. Target init/add/commit/status/fsck and all clone/checkout/status/fsck operations use that same envelope. Under AC5's environment they run dependency, boundary, provenance, test-parity, typecheck, lint, full tests, synthetic end-to-end, clean build/package/install/smoke, source-independence, fsck, recursive diff-tree, and AC3's exact operator audit.

The operator audit alone receives read-only access to the pinned Project_echo Git object database; target tests and runtime do not. Before and after B0/B1/B2/R1, the accepted target's unique sorted object set from `git cat-file --batch-all-objects --batch-check='%(objectname)'` must exactly equal the unique reachable set from `git rev-list --objects --no-object-names refs/heads/migration/2026-07-13-133`; `git fsck --full --no-reflogs --unreachable` must emit nothing, so dangling, unreachable, alternate, and reflog-only acceptance is impossible. Shared-target status/refs/config/fsck/no-follow filesystem-versus-HEAD checks use `GIT_OPTIONAL_LOCKS=0` and must preserve HEAD/tree/object set. Any command failure stops the attended build; no claim is made that hostile child processes or local concurrent actors are contained.

### AC8 — Record the normal builder handoff and stop at DEV

The builder follows `docs/AGENT_INSTRUCTIONS.md` for claim, run log, migration record, backlog move, commit, and feature-branch push. At the immutable pending-review feature head, `raw/internal/migrations/2026-07-13-133-echo-brain.md` binds source SHA, target path/branch/HEAD/tree, package/lock/provenance/parity hashes, commands/exits, artifact tuple, shared-target audit, differences, `authority:false`, and `maturity:DEV`. Target has no remote and history is unchanged afterward.

An independent `codex-ops` binding/session reviewer binds request path/bytes, `spec_commit_sha`, roster/membership, immutable Claude-builder feature head, migration-record hash, and accepted target HEAD/tree. Builder-only mkdir/init is not rerun; reviewer-rerunnable pre/post audit is status/refs/config/object-state/fsck plus no-follow filesystem-versus-HEAD enumeration. It runs AC7 from R1, then creates a fresh detached Project_echo worktree at the immutable builder head (never attaching the builder-owned branch), adds exactly `raw/internal/migrations/2026-07-13-133-echo-brain-review.md` (one-path tree delta), commits on detached HEAD with the builder head as sole parent, and pushes the explicit child OID to the full feature-branch ref with expected-old equal to the builder head. The item's `head_sha` remains the immutable builder-head OID (a pre-existing object, never the self-referential child); downstream merge tooling accepts the branch tip only if it is a sole-parent child of `head_sha` whose tree delta is exactly the review record, learning the child OID from the remote ref, never from the child's own tree. Push and probe address the literal Project_echo origin URL recorded in the migration record (never a bare remote name) under absolute config-isolated Git (`GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`, fixed reviewer identity, hooks/signing/askpass disabled, clean index; no pull/rebase/merge/autostash/generic force), preceded by a fail-closed check that no `url.*.insteadOf`/`pushInsteadOf`, `remote.*.pushurl`, or config include is active in the shared repository config; the probe is `/usr/local/bin/git ls-remote <endpoint> <full-ref>` with a strict exactly-one-valid-OID parser distinguishing missing, malformed, duplicate, and unreachable outcomes. After an ambiguous push exit it re-probes: remote-equals-child is success; any other state stops and appends expected, child, and observed-or-`unknown` OIDs plus probe evidence to the item's workflow-owned run log under `raw/internal/agent-runs/` on `main` (a durable sink surviving worktree cleanup, outside the feature ref). This feature-branch push needs no separate founder authorization; founder checkpoints remain at merge and main-push. The record names reviewer binding/session independence, commands/results, accepted tuple, artifact tuple, and verdict; its child commit becomes the pending-review head and the target history remains unchanged. Passing proves only a local DEV split.

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
- Exact operator-audit command from AC3 — policy/source closure/target partition result and nonzero omission/evasion fixtures.
- Independent migration-record review — accepted HEAD/tree, clean shared target, rerun commands, artifact, and false authority.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority; this is a local DEV candidate.
- After founder accepts parity, propose private remote creation, branch protection, authority transfer, and old-path freeze separately.

## Founder adjudication (2026-07-13, pre-review)

**Schema-path tension (AC3 vs AC5) — builder reconciliation ACCEPTED.** AC3's byte-identical
`src/product/config.ts` + `package.json` reference `schemas/product/runtime-config.v1.schema.json`,
while AC5 names the committed schema `schemas/runtime-config.v1.schema.json` — a spec-internal
inconsistency that 19 review rounds did not surface. The builder committed at the AC5 path and
`tools/verify-artifact.mjs` stages the schema into the tarball at `schemas/product/…` so the
byte-immutable runtime loader resolves it. Accepted because it preserves source byte-identity AND
the exact 21-path target-only set, and at DEV the packaged artifact is the operative runtime
contract (packaged smoke passes). Reviewer + merge `review_notes` should cite this section.
The 8 product tests as unexecuted byte-parity leaves (they reach item-132 CI tooling via literal
REPO_ROOT joins, not module edges) is likewise accepted for the DEV split.
