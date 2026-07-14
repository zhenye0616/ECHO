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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-brain`; sibling lanes never touch it. The attended-build threat model assumes no hostile concurrent local filesystem actor. The orchestrator owns creation of missing owner-only mode-0700 evidence parents, records device/inode/owner/mode for every Desktop, evidence, and target-parent component, rejects symlinks, and immediately revalidates the complete chain before each root mkdir. After it confirms the final target is absent, the builder's first target mutation is plain non-recursive `mkdir /Users/zhenye/Desktop/echo-brain`, which must fail on `EEXIST`; only that invocation may write inside. The builder initializes branch `migration/2026-07-13-133`, sets local identity `ECHO Migration Agent <migration@echo.local>`, disables signing/hooks/templates/global and system Git config, and configures no remote.

Every source and target Git command runs from an explicit minimal environment that clears `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_COMMON_DIR`, `GIT_CONFIG_COUNT/KEY/VALUE`, replace/graft/ceiling variables, askpass/SSH/proxy settings, and sets `GIT_NO_REPLACE_OBJECTS=1`. Final checks prove git-dir/worktree/index/object storage are target-local, `git fsck --full` passes, and no alternates, replace/graft refs, promisor objects, or external object stores exist. Source bytes come only from Project_echo commit objects at the pinned SHA via explicit-repository `git show`/`git archive`, never dirty working-tree files.

This is a one-time operator build, not a reusable extraction product. Do not add a Project_echo extraction CLI, daemon, lifecycle database, lock/takeover protocol, publication helper, or recovery code. If a prior target exists, the builder aborts; only the founder/orchestrator may confirm the prior process group is terminated/quiescent and archive it before authorizing another mkdir. No second agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with exactly one local migration branch, a committed root history, and no remote. Its root README states `authority: false`, `maturity: DEV`, source SHA, item ID, and the later-cutover requirement.

### AC2 — Give echo-brain accurate product ownership

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node/npm, and contains no source-path dependency. A committed lockfile owns the full install. `/Users/zhenye/Desktop/echo-brain/src/:1` contains only the Team meeting-to-decision product composition: meeting intake, signal extraction, decision/rationale/action shaping, human review gate, decision cards/briefs, product-local health, and packaging. Generic context capture/retrieval and agent orchestration remain excluded.

Direct dependencies derive from final bare imports plus the fixed build/test toolchain at exact versions. Runtime file reads, package-script executables, and literal child binaries are inventoried; missing, extra, ranged, or undeclared edges fail `npm run check:dependencies`.

### AC3 — Preserve file-level provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` covers the independently derived item-132 transitive source/test/build closure plus every newly created target file, excluding only the manifest itself and generated install/build outputs. Paths are NFC UTF-8 repository-relative POSIX paths, unique and byte-sorted; hashes are SHA-256. Source-backed rows require source path/blob/content hash and disposition `copied`, `relocated`, `rewritten`, or `excluded`; materialized rows require destination path/hash, while excluded rows forbid destination fields and require rationale. New rows use `authored` or `generated`, require destination fields/origin rationale, and have no source identity. Rewrites outside the eight product-test rows may use only exact literal module/path relocation pairs generated from a source-plan row whose source and destination both exist; no semantic, assertion, fixture-value, control-flow, or expected-output rewrite is permitted. Small shared utilities may be copied with no synchronization promise. Symlinks, submodules, generated mirrors, workspaces, `file:`/Git/path dependencies, and imports into Project_echo or siblings are forbidden.

### AC4 — Enforce the product boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `tools/check-boundary.mjs:1` enforce the full transitive closure. They reject backlog/review/coord/task-state/skills, context storage/retrieval/MCP, general capture, founder CLI brain, Slack/Linear responders, unrelated daemon workers, and any import or runtime path outside the repository. The native boundary test proves every shipped import resolves locally.

### AC5 — Own configuration, state, build, and artifact identity

`schemas/runtime-config.v1.schema.json:1` preserves the client-local config contract using secret references only; `src/runtime/paths.ts:1` owns install-local state distinct from Project_echo and siblings. Before target creation, the orchestrator validates a lowercase UUID attempt ID and atomically creates 0700 `/Users/zhenye/Desktop/.echo-migration-evidence/133/<attempt-id>` after the AC1 parent-chain revalidation; EEXIST refuses. It creates all HOME/XDG/TMPDIR/cache/config/tool-bin/output subdirectories beneath that root at declared modes with EEXIST refusal.

The single canonical receipt is `<attempt-root>/receipt.v1.json`. Schema v1 binds item, attempt, target, writer, generation, monotonic phase (`PREPARED`, `BUILDING`, `CHECKS_PASSED`, `HANDOFF_COMMIT_RECORDED`, `PUSH_CONFIRMED`), acceptance (`NOT_ACCEPTED` or `HANDOFF_PUBLISHED`), current command intent, raw stdout/stderr relative paths and hashes, target HEAD/tree, handoff commit, destination ref, and observed remote OID. The builder is the sole writer through push. Before target mutation it persists PREPARED/NOT_ACCEPTED; before every command it writes intent and raw-log paths, then records exit/hashes. Every expected-generation update uses same-directory 0600 temp write, file fsync, atomic rename, and parent fsync. Phase and acceptance never roll back: a failed command or push stays at its last phase with NOT_ACCEPTED.

Before pushing, the builder records the exact Project_echo handoff commit and new feature-branch ref, then pushes that exact `<commit>:<ref>` and requires the remote ref to equal the commit before writing PUSH_CONFIRMED/HANDOFF_PUBLISHED. If execution stops after push, a founder/orchestrator-only manual reconciliation reads the immutable commit/ref from the receipt: missing ref retries that exact push, exact equality finalizes idempotently, and any other OID stops for review. This reconciliation may update only the receipt; it never adopts or mutates target history. `npm run build:artifact -- --expected-head <target-head> --run-output <attempt-root>/artifact` refuses pre-existing output. Receipt, raw logs, profiles, artifact, and manifest are retained for the life of this item; this item performs no evidence cleanup.

### AC6 — Preserve product behavior at the pinned boundary

`provenance/test-parity.v1.json:1` inventories exactly the eight pinned `tests/product` files. Every row has disposition `copied`, keeps the identical repository-relative destination, carries source blob/content hash and identical destination content hash, and forbids substitutions. If repository code must move, production layout/adapters change so these tests remain byte-identical. `source-extraction.v1.json` must contain the same eight source identities, destinations, dispositions, and hashes; any mismatch fails both `npm run check:provenance` and standalone `npm run check:test-parity`. AC7's pinned-source operator audit recomputes all eight source blobs/hashes and byte-compares target files. A new test outside that count proves synthetic `meeting input -> adapter -> manual review gate -> brief artifacts` with fixed time, no credentials, no real data, and no external service.

No behavior redesign is allowed. `selftest` remains honest about the production API brain and later ranks still being pending and keeps `wedge_executed:false`.

### AC7 — Prove clean-install and source independence

After the target HEAD is committed, each verifier treats the shared target read-only, captures its exact 40-hex HEAD/tree, clones to a unique absent root with `--no-local --no-hardlinks`, detaches that OID, verifies commit/tree, removes origin, proves clean/no-remotes/no-alternates/no-promisor, and rechecks shared HEAD unchanged. `provenance/toolchain.v1.json` pins `/usr/local/bin/node` 22.22.1, resolved npm CLI `/usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js` 10.9.4, `/bin/sh`, Git 2.37.3, and `/usr/bin/sandbox-exec` by path/version/hash. Every Node/npm/sandbox phase uses `env -i`, declared scratch HOME/XDG/TMPDIR, `npm_config_script_shell=/bin/sh`, and exact `PATH=<attempt-root>/tool-bin:<private-clone>/node_modules/.bin`. Tool-bin contains only verified links for inventoried absolute system tools; no default host PATH directory is present. Each phase records realpath/version/hash resolution for Node, npm CLI, shell, every package `.bin`, and every inventoried child; an unlisted or differently resolved executable fails.

Phase 1 invokes `/usr/local/bin/node <pinned-npm-cli> ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org/ --cache <attempt-root>/cache-fetch --userconfig <attempt-root>/config/npmrc --globalconfig <attempt-root>/config/npmrc-global` inside the retained fetch profile. The profile denies source/sibling/live-state/credential reads and external writes while allowing only registry fetch. The runner verifies lock-authorized package integrities, records lock/config/profile/runner/cache manifests and probes, deletes phase-1 node_modules, copies cache-fetch to immutable mode-0500 `cache-seed`, and records its byte manifest.

Phase 2 copies `cache-seed` to separate writable `cache-offline` and invokes the same absolute Node/npm CLI with `ci --offline --ignore-scripts --no-audit --no-fund --cache <attempt-root>/cache-offline --userconfig ... --globalconfig ...` under deny-all network. Package scripts use the same absolute Node/npm CLI, pinned shell, explicit PATH, and writable offline cache; pre/post hooks remain disabled unless separately inventoried. After all lifecycle/build/test commands, the verifier proves the immutable seed manifest is unchanged. Mandatory positive/negative probes prove allowed roots/fetch and forbidden read/write/network classes, PATH fallback, and executable tripwires; enforcement absence fails closed. Profiles and probe evidence remain under the attempt root.

Verification runs exact dependency, boundary, provenance, test-parity, typecheck, lint, product tests, synthetic end-to-end, artifact build/install, smoke/config/selftest, source-independence, `git fsck --full`, and `git diff-tree --check --root HEAD` commands. A separate read-only operator audit derives the manifest universe from the item-132 boundary and pinned Git tree, recomputes every source blob/content hash at `2971310441b69735cbe759293abd8c4d044bf347`, enforces cross-manifest equality, byte-compares the eight immutable tests, validates only the narrowly allowed non-test relocation pairs against committed target HEAD, and records exact rerunnable commands/exits. Hostile source/HOME/npm/Git/PATH/Node/sibling sentinels must not affect output.

### AC8 — Record the local handoff and stop before authority transfer

Every failed stop appends the receipt's phase/command/exit, target HEAD/tree when available, retained raw-log/evidence/scratch paths, and reconciliation status to the Project_echo agent-run log/agent notes; it preserves the no-adopt/no-delete target rule and cleans only uniquely owned ephemeral scratch after containment checks. The attempt root is never deleted by this item. Only after all checks pass, the builder writes `raw/internal/migrations/2026-07-13-133-echo-brain.md` in its isolated Project_echo feature worktree. It records the pinned source SHA, exact commands/exits including operator source audit, target path/branch/HEAD/tree, package/lock/provenance/parity hashes, stable evidence root and artifact manifest/SHA-256, verified no-remotes/clean status, differences, and `authority:false`, `maturity:DEV`. The builder commits that record with the backlog handoff; it does not mutate target history afterward.

Independent review inspects the shared target read-only, uses a unique private clone/output root for every install/test/artifact rebuild, recomputes the operator source audit, and compares the record to the actual target and retained artifact. Passing proves only a local DEV source split.

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
- **Behavior drift:** relocation rewrites can alter behavior. Mitigation: eight-file transformed-hash parity and synthetic packaged end-to-end proof.
- **Interrupted build:** direct materialization can leave an incomplete target. Mitigation: one attended lane; incomplete targets are never accepted or auto-resumed and are archived manually before retry.
- **Premature authority:** a green local repo may be mistaken for released product. Mitigation: explicit false authority/no-remote/DEV evidence and separate cutover proposal.

## Tests

- `/Users/zhenye/Desktop/echo-brain/tests/product/import-fence.test.ts` — native closure and forbidden ownership edges.
- `/Users/zhenye/Desktop/echo-brain/tests/product/runtime-isolation.test.ts` — local state and fail-closed boot.
- `/Users/zhenye/Desktop/echo-brain/tests/product/packaged-product.test.ts` — artifact installs/runs from exported HEAD.
- `/Users/zhenye/Desktop/echo-brain/tests/product/end-to-end-synthetic.test.ts` — meeting through manual gate to brief artifacts.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/test-parity.test.ts` — exact eight-file transformed-hash contract.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/dependency-set.test.ts` — exact direct dependency set.
- `/Users/zhenye/Desktop/echo-brain/tests/migration/source-independence.test.ts` — no source/sibling/path/symlink/submodule escape.
- Migration record review — exact target HEAD/tree, artifact, commands, no-remotes, clean status, and false-authority evidence.

## After Completion (Strategist Notes)

- Do not update the wiki or transfer authority; this is a local DEV candidate.
- After founder accepts parity, propose private remote creation, branch protection, authority transfer, and old-path freeze separately.
- Later feature work lands only in the repository selected by that explicit authority checkpoint.
