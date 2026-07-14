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
  - /Users/zhenye/Desktop/.echo-migration-evidence/133/**      # NEW retained artifact/command evidence through review disposition
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW Project_echo handoff/provenance/parity record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-133-local-echo-brain-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-133-local-echo-brain-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-133-local-echo-brain-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # one-time attended build; no migration controller
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # locked Team product and client-machine endpoint
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # maturity and artifact evidence contract
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # T1 allowlist and provenance rule
  - raw/internal/decisions/2026-07-12-clarity-halt-lift.md # post-G2 proposal gate
  - backlog/complete/2026-07-13-132-product-graduation-foundation.md # reviewed in-repo product closure
  - product/source-boundary.v1.json                            # machine-readable product closure
  - product/package.template.json                             # current runtime identity and dependencies
  - product/npm-shrinkwrap.json                               # pinned product runtime tree
  - product/README.md                                         # DEV commands and inherited debt
  - wiki/architecture/product-composition-boundary.md         # durable boundary explanation
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

The founder has named the complete client-facing Team decision product `echo-brain`. Item 132 established its reviewed closure inside Project_echo. This item materializes that closure from exact committed source SHA `2971310441b69735cbe759293abd8c4d044bf347` as an independent local repository at `/Users/zhenye/Desktop/echo-brain` and proves it builds, tests, packages, and runs without Project_echo. Project_echo remains the migration source, backup, and authority. Remote creation, authority transfer, and maturity advancement are later founder checkpoints.

### AC1 — Materialize one local Git repository without shipping migration machinery

One assigned builder lane owns `/Users/zhenye/Desktop/echo-brain`; sibling lanes never touch it. The attended-build threat model assumes no hostile concurrent local filesystem actor. Founder/orchestrator provisioning of `/Users/zhenye/Desktop/.echo-migration-evidence/133` is a fail-closed prerequisite outside the builder item: every evidence component must already be a real directory owned by the current UID with exact mode 0700. The no-follow walk is anchored at `/`: `/` and `/Users` must be root-owned real directories with no group/world write; `/Users/zhenye` and Desktop must be current-UID real directories with no group/world write; `.echo-migration-evidence` and `133` must additionally be exact mode 0700. The builder records path/device/inode/uid/gid/mode tuples in `<attempt-root>/preflight/parent-chain.v1.json`, repeats the walk after each root mkdir, and requires tuple equality. After it confirms the final target is absent, the builder's first target mutation is plain non-recursive `mkdir /Users/zhenye/Desktop/echo-brain`, which must fail on `EEXIST`; only that invocation may write inside. The builder initializes branch `migration/2026-07-13-133`, sets local identity `ECHO Migration Agent <migration@echo.local>`, disables signing/hooks/templates/global and system Git config, and configures no remote.

Every source and target Git command runs from an explicit minimal environment that clears `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_COMMON_DIR`, `GIT_CONFIG_COUNT/KEY/VALUE`, replace/graft/ceiling variables, askpass/SSH/proxy settings, and sets `GIT_NO_REPLACE_OBJECTS=1`. Final checks prove git-dir/worktree/index/object storage are target-local, `git fsck --full` passes, and no alternates, replace/graft refs, promisor objects, or external object stores exist. Source bytes come only from Project_echo commit objects at the pinned SHA via explicit-repository `git show`/`git archive`, never dirty working-tree files.

This is a one-time operator build, not a reusable extraction product. Do not add a Project_echo extraction CLI, daemon, lifecycle database, lock/takeover protocol, publication helper, or recovery code. If a prior target exists, the builder aborts; only the founder/orchestrator may confirm the prior process group is terminated/quiescent and archive it before authorizing another mkdir. No second agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with exactly one local migration branch, a committed root history, and no remote. Its root README states `authority: false`, `maturity: DEV`, source SHA, item ID, and the later-cutover requirement.

### AC2 — Give echo-brain accurate product ownership

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node/npm, and contains no source-path dependency. A committed lockfile owns the full install. `/Users/zhenye/Desktop/echo-brain/src/:1` contains only the Team meeting-to-decision product composition: meeting intake, signal extraction, decision/rationale/action shaping, human review gate, decision cards/briefs, product-local health, and packaging. Generic context capture/retrieval and agent orchestration remain excluded.

Direct dependencies derive from final bare imports plus the fixed build/test toolchain at exact versions. Runtime file reads, package-script executables, and literal child binaries are inventoried; missing, extra, ranged, or undeclared edges fail `npm run check:dependencies`.

### AC3 — Preserve file-level provenance

Committed `provenance/schemas/source-plan.v1.schema.json`, `source-extraction.v1.schema.json`, and `rewrite-plan.v1.schema.json` reject unknown fields and pin NFC UTF-8 repository-relative POSIX paths, byte ordering, Git modes, SHA-256 formats, and conditional fields. `provenance/source-plan.v1.json` independently derives the item-132 transitive source/test/build closure from the pinned boundary and Git tree. `provenance/source-extraction.v1.json` covers that source universe plus every regular file blob in committed target HEAD, excluding only the extraction manifest itself; `.git/**`, untracked install/build/transient files, symlinks, and submodules are outside and rejected rather than inventoried. The operator audit enumerates the identical source and destination universes.

Every source row appears exactly once. `copied` requires identical source/destination path, Git mode, and content hash; `relocated` requires different paths but identical Git mode/content hash; `excluded` forbids a destination and requires rationale. `rewritten` requires one rewrite-plan entry with ordered exact literal bytes, occurrence counts, non-overlap, deterministic replay, and explicit reviewed mode change if any. Tests forbid rewritten disposition and require mode equality. Target-only blobs appear once as `authored` or `generated`, with destination/hash/mode/origin and no source fields. Target-local `tools/check-provenance.mjs` validates schemas, target partition, destination hashes/modes, cross-manifest consistency, and rewrite-plan shape without claiming source bytes. The read-only operator audit alone derives the pinned source universe, verifies source identities/modes, and forward-replays rewrites. Small shared utilities may be copied with no synchronization promise. Generated mirrors, workspaces, `file:`/Git/path dependencies, and imports into Project_echo or siblings are forbidden.

### AC4 — Enforce the product boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `tools/check-boundary.mjs:1` enforce the full transitive closure. They reject backlog/review/coord/task-state/skills, context storage/retrieval/MCP, general capture, founder CLI brain, Slack/Linear responders, unrelated daemon workers, and any import or runtime path outside the repository. The native boundary test proves every shipped import resolves locally.

### AC5 — Own configuration, state, build, and artifact identity

`schemas/runtime-config.v1.schema.json:1` preserves the client-local config contract using secret references only; `src/runtime/paths.ts:1` owns install-local state distinct from Project_echo and siblings. Before any target mutation, the builder validates a lowercase UUID attempt ID and atomically creates 0700 `/Users/zhenye/Desktop/.echo-migration-evidence/133/<attempt-id>` beneath the prevalidated parent; EEXIST refuses. Every HOME/XDG/TMPDIR/cache/config/tool-bin/output/private-clone root is a named mode-0700 child beneath that attempt root and refuses EEXIST.

There is no mutable receipt, acceptance state, retry reconciler, or evidence lock. Before ledger coverage, the builder writes retained `<attempt-root>/operator/evidence-publish.c`, compiles it with pinned clang, and records source/binary hashes; bootstrap failure uses stderr and stops. Its descriptor-relative `linkat` publication creates a final hard link only if absent, fsyncs the directory, and removes the temp; collision preserves prior bytes and fails. `<attempt-root>/attempt.v1.json` is create-once and binds item, attempt, source SHA, target path, builder identity, publisher hash, and parent-chain hash. Before command N it publishes create-new `commands/<NNN>.intent.json` with argv, cwd, sorted environment, runner/profile hash, timeout, and raw stream paths; afterward it publishes create-new `<NNN>.result.json` with start/end, exit/signal, stream hashes, quiescence proof, and produced-path hashes. Intent/result temps and raw streams use descriptor-relative O_CREAT|O_EXCL|O_NOFOLLOW mode 0600, full-stream drain, fsync, and the no-replace helper. Missing result means interrupted/unaccepted; no actor edits or completes it. Collision tests preserve existing bytes.

Every command runs in a fresh session/process group. Timeout or signal triggers TERM for 5 seconds, KILL for 5 seconds, whole-group wait/reap, and descendant/listener/open-writer checks; non-quiescence stops the run and forbids handoff. Baseline, hostile, and rebuild namespaces each have create-new clone, HOME/XDG/TMP, writable cache, ledger, and artifact-output roots; baseline artifact is canonical. Attempt metadata, ledgers, raw logs, profiles, probes, caches, installs, clones, artifacts, and manifests remain under the attempt root; this item deletes nothing beneath it.

### AC6 — Preserve product behavior at the pinned boundary

`provenance/test-parity.v1.json:1` inventories exactly the eight pinned `tests/product` files. Every row has disposition `copied`, keeps the identical repository-relative destination, carries source blob/content hash and identical destination content hash, and forbids substitutions. If repository code must move, production layout/adapters change so these tests remain byte-identical. `source-extraction.v1.json` must contain the same eight source identities, destinations, dispositions, and hashes; any mismatch fails both `npm run check:provenance` and standalone `npm run check:test-parity`. AC7's pinned-source operator audit recomputes all eight source blobs/hashes and byte-compares target files. A new test outside that count proves synthetic `meeting input -> adapter -> manual review gate -> brief artifacts` with fixed time, no credentials, no real data, and no external service.

No behavior redesign is allowed. `selftest` remains honest about the production API brain and later ranks still being pending and keeps `wedge_executed:false`.

### AC7 — Prove clean-install and source independence

After the target HEAD is committed, each verifier treats the shared target read-only, captures its exact 40-hex HEAD/tree, clones beneath `<attempt-root>/private-clones/<uuid>` with `--no-local --no-hardlinks`, detaches that OID, verifies commit/tree, removes origin, proves clean/no-remotes/no-alternates/no-promisor, and rechecks shared HEAD unchanged. `provenance/toolchain.v1.json` pins `/usr/local/bin/node` 22.22.1, resolved npm CLI `/usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js` 10.9.4, `/bin/sh`, Git 2.37.3, and `/usr/bin/sandbox-exec` by path/version/hash. Every Node/npm/sandbox phase uses `env -i`, attempt-local HOME/XDG/TMPDIR, `npm_config_script_shell=/bin/sh`, and exact `PATH=<attempt-root>/tool-bin:<private-clone>/node_modules/.bin`. Tool-bin contains only verified links for inventoried absolute system tools; no default host PATH directory is present. Each phase records realpath/version/hash resolution for Node, npm CLI, shell, every package `.bin`, and every inventoried child; an unlisted or differently resolved executable fails.

Phase 1 runs in its own retained fetch clone and invokes `/usr/local/bin/node <pinned-npm-cli> ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/ --cache <attempt-root>/cache-fetch --userconfig <attempt-root>/config/npmrc --globalconfig <attempt-root>/config/npmrc-global` inside the retained fetch profile. The profile denies source/sibling/live-state/credential reads and external writes while allowing only registry fetch. The runner verifies lock-authorized package integrities and records lock/config/profile/runner/cache/install manifests and probes. It preserves that clone and node_modules, copies cache-fetch to immutable mode-0500 `cache-seed`, and records its byte manifest.

Phase 2 allocates different create-new baseline/hostile/rebuild clones, copies `cache-seed` to distinct writable offline caches, and invokes the same absolute Node/npm CLI with `ci --offline --ignore-scripts --no-audit --no-fund --cache <namespace-cache> --userconfig <namespace-config>/npmrc --globalconfig <namespace-config>/npmrc-global` under deny-all network. After all commands, the verifier proves the immutable seed and Phase-1 install manifests unchanged. Mandatory probes prove allowed roots/fetch and forbidden read/write/network classes, PATH fallback, and executable tripwires; enforcement absence fails closed.

Committed `provenance/schemas/verification-plan.v1.schema.json` requires each ordered row's index, stable ID, kind (`target-check`, `operator-audit`, or `artifact-rebuild`), literal argv, cwd token, sorted env, profile/hash, timeout_ms, stdout/stderr paths, outputs, namespace, and normalizer ID. The exact roster is dependency, boundary, provenance, test-parity, typecheck, lint, product tests, synthetic end-to-end, artifact build/install, smoke/config/selftest, source-independence, `git fsck --full`, `git diff-tree -r --check --root HEAD`, operator audit, and independent artifact rebuild. A nested-file fixture must fail the recursive Git check.

Before use, the builder publishes `<attempt-root>/operator/{verification-runner.mjs,operator-audit.mjs,semantic-normalizer.v1.json}` create-only with the helper, fsyncs, hashes, chmods 0400, and records hashes in attempt metadata. Bootstrap is `/usr/local/bin/node <verification-runner> --plan <private-clone>/provenance/verification-plan.v1.json --target <private-clone> --evidence-root <attempt-root> --namespace <baseline|hostile|rebuild> --ledger <namespace-ledger>`. Every intent binds runner/plan/normalizer hashes. The normalizer is allowlist-only by JSON pointer/token replacement, retains raw hashes, rejects undeclared variance, and has bounded input/output bytes. Operator audit and second rebuild are ledgered plan rows with their own namespaces/outputs.

A separate read-only operator audit derives both manifest universes from the item-132 boundary, pinned Git tree, and committed target HEAD; recomputes every source blob/content hash/mode at `2971310441b69735cbe759293abd8c4d044bf347`; validates all transforms/target partition; enforces cross-manifest equality; and byte-compares the eight immutable tests. Baseline, hostile, and rebuild artifacts from distinct roots use fixed `SOURCE_DATE_EPOCH=<target-commit-time>` and must have identical artifact SHA-256, member manifest, target HEAD/tree, and lock hash. Any byte difference fails.

### AC8 — Record the local handoff and stop before authority transfer

Failures are durable in the immutable command ledger and raw logs only; after a handoff commit exists, the builder never edits Project_echo agent-run or backlog files. On success or an intentional failure handoff, the builder first writes the Project_echo agent-run log/agent notes, migration record when applicable, and backlog stage move, then creates one exact handoff commit. Before its sole push attempt it publishes create-new `<attempt-root>/handoff.intent.json` containing Project_echo remote URL hash, destination feature ref, expected-absent remote OID, and exact commit. It pushes create-only with `--force-with-lease=<ref>:`; existing ref, non-fast-forward, transport ambiguity, or any nonzero result stops with evidence only and no automatic retry/reconciliation. A successful push is already observable as the exact committed branch; no receipt finalization exists.

The migration record contains the pinned source SHA, exact command-ledger paths including operator audit, target path/branch/HEAD/tree, package/lock/provenance/parity hashes, stable evidence root and artifact manifest/SHA-256, verified no-remotes/clean status, differences, and `authority:false`, `maturity:DEV`. The builder does not mutate target history afterward.

After handoff, the builder attempt root is read-only. Each independent reviewer allocates a separate create-new 0700 `/Users/zhenye/Desktop/.echo-migration-evidence/133/<review-uuid>` with `kind:review`, reviewer identity, accepted target HEAD/tree, and builder-attempt hash in create-once metadata; it has its own immutable ledger and never writes the builder root. Review inspects the target read-only, uses reviewer-owned clones/outputs, recomputes the source audit, and requires byte-identical artifact SHA-256 plus identical member manifest. Passing proves only a local DEV source split.

## Out of Scope (Don't Drift)

- Do not create/configure a target remote, tag, release, registry publication, deployment, or client install.
- Do not build reusable extraction, crash-recovery, lock, takeover, or publication-control machinery.
- Do not implement rank 2/rank 3 features, decision-card redesign, org-context retrieval, delivery, or launchd.
- Do not extract/modify echo-loop or echo-context, or import their source/runtime packages.
- Do not move, delete, freeze, or rename current Project_echo product paths.
- Do not access real meetings, live databases, credentials, Keychain, or client data.
- Do not advance beyond DEV or touch holdout-131.

## Risks

- **Hidden dependency:** the product closure may rely on undeclared build/runtime edges. Mitigation: exact dependency inventory plus clean exported install/build/test.
- **Behavior drift:** relocation rewrites can alter behavior. Mitigation: eight source blobs remain at identical paths with identical content/destination hashes and byte comparison, plus synthetic packaged end-to-end proof.
- **Interrupted build:** direct materialization can leave an incomplete target. Mitigation: one attended lane; incomplete targets are never accepted or auto-resumed and are archived manually before retry.
- **Premature authority:** a green local repo may be mistaken for released product. Mitigation: explicit false authority/no-remote/DEV evidence and separate cutover proposal.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/import-fence.test.ts` — native closure and forbidden ownership edges.
- `/Users/zhenye/Desktop/echo-brain/tests/product/runtime-isolation.test.ts` — local state and fail-closed boot.
- `/Users/zhenye/Desktop/echo-brain/tests/product/packaged-product.test.ts` — artifact installs/runs from exported HEAD.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — meeting through manual gate to brief artifacts.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/test-parity.test.ts` — exact eight-file source-blob/content/destination-hash equality and byte-comparison contract; any differing byte fails.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — exact direct dependency set.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no source/sibling/path/symlink/submodule escape.
- Migration record review — exact target HEAD/tree, artifact, commands, no-remotes, clean status, and false-authority evidence.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority; this is a local DEV candidate.
- After founder accepts parity, propose private remote creation, branch protection, authority transfer, and old-path freeze separately.
- Later feature work lands only in the repository selected by that explicit authority checkpoint.
