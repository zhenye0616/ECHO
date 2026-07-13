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
  - raw/internal/migrations/2026-07-13-133-echo-brain.md       # NEW Project_echo handoff/provenance/parity record
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

One assigned builder lane owns `/Users/zhenye/Desktop/echo-brain`; sibling lanes never touch it. The target must be absent when the attended run begins. The builder creates the repository directly, initializes branch `migration/2026-07-13-133`, sets local identity `ECHO Migration Agent <migration@echo.local>`, disables signing/hooks/templates/global and system Git config, and configures no remote. Source bytes come only from Project_echo commit objects at the pinned SHA via `git show`/`git archive`, never from dirty working-tree files.

This is a one-time operator build, not a reusable extraction product. Do not add a Project_echo extraction CLI, daemon, lifecycle database, lock/takeover protocol, sandbox profile, publication helper, or recovery code. If interrupted, the target is visibly incomplete and unaccepted; the orchestrator inspects and archives it before assigning a fresh run. No second agent automatically adopts, deletes, resumes, or repairs it.

The accepted target ends clean with exactly one local migration branch, a committed root history, and no remote. Its root README states `authority: false`, `maturity: DEV`, source SHA, item ID, and the later-cutover requirement.

### AC2 — Give echo-brain accurate product ownership

`/Users/zhenye/Desktop/echo-brain/package.json:1` names the private package and binary `echo-brain`, pins Node/npm, and contains no source-path dependency. A committed lockfile owns the full install. `/Users/zhenye/Desktop/echo-brain/src/:1` contains only the Team meeting-to-decision product composition: meeting intake, signal extraction, decision/rationale/action shaping, human review gate, decision cards/briefs, product-local health, and packaging. Generic context capture/retrieval and agent orchestration remain excluded.

Direct dependencies derive from final bare imports plus the fixed build/test toolchain at exact versions. Runtime file reads, package-script executables, and literal child binaries are inventoried; missing, extra, ranged, or undeclared edges fail `npm run check:dependencies`.

### AC3 — Preserve file-level provenance

`/Users/zhenye/Desktop/echo-brain/provenance/source-extraction.v1.json:1` records source repository identity, pinned SHA, item 132, boundary version, and a sorted row for every copied source file: source path/blob/content SHA-256, destination path/hash, disposition (`copied`, `relocated`, `rewritten`, `excluded`), and reason. Rewrites have an explicit literal/path substitution list. Small shared utilities may be copied with no synchronization promise. Symlinks, submodules, generated mirrors, workspaces, `file:`/Git/path dependencies, and imports into Project_echo or siblings are forbidden.

### AC4 — Enforce the product boundary natively

`/Users/zhenye/Desktop/echo-brain/product/source-boundary.v1.json:1` and `tools/check-boundary.mjs:1` enforce the full transitive closure. They reject backlog/review/coord/task-state/skills, context storage/retrieval/MCP, general capture, founder CLI brain, Slack/Linear responders, unrelated daemon workers, and any import or runtime path outside the repository. The native boundary test proves every shipped import resolves locally.

### AC5 — Own configuration, state, build, and artifact identity

`schemas/runtime-config.v1.schema.json:1` preserves the client-local config contract using secret references only; `src/runtime/paths.ts:1` owns install-local state distinct from Project_echo and siblings. `npm run build:artifact -- --expected-head <target-head> --run-output <empty-temp-dir>` exports the clean committed HEAD, emits version/HEAD/tree/artifact SHA-256, and never changes repository HEAD. The resulting artifact installs into a fresh temp prefix and runs `smoke`, `validate-config`, and `selftest` with maturity still DEV.

### AC6 — Preserve product behavior at the pinned boundary

`provenance/test-parity.v1.json:1` inventories exactly the eight pinned `tests/product` files, with source blob/hash, destination, disposition, allowed literal substitutions, and transformed hash. Standalone `npm run check:test-parity` verifies all eight rows without reading Project_echo. A new test outside that count proves synthetic `meeting input -> adapter -> manual review gate -> brief artifacts` with fixed time, no credentials, no real data, and no external service.

No behavior redesign is allowed. `selftest` remains honest about the production API brain and later ranks still being pending and keeps `wedge_executed:false`.

### AC7 — Prove clean-install and source independence

After the target HEAD is committed, verification exports that HEAD to a fresh temporary directory. Dependency installation runs under a scratch HOME/XDG/npm config with auth/proxy variables removed and the target lockfile as authority. Tests then run with network disabled and a temporary macOS sandbox rule denying Project_echo, sibling targets, live `~/.echo`, credentials, and writes outside the verification root. The profile is ephemeral evidence, not committed migration machinery.

Verification runs exact dependency, boundary, provenance, test-parity, typecheck, lint, product tests, synthetic end-to-end, artifact build/install, smoke/config/selftest, source-independence, and `git diff --check` commands. A hostile source-worktree edit, HOME npm config, Git config/template/hook, PATH, or sibling sentinel must not enter output. Final scans reject absolute source paths, symlinks, submodules, and escaping imports/process reads.

### AC8 — Record the local handoff and stop before authority transfer

Only after all checks pass, the builder writes `raw/internal/migrations/2026-07-13-133-echo-brain.md` in its isolated Project_echo feature worktree. It records the pinned source SHA, exact commands/exits, target path/branch/HEAD/tree, package/lock/provenance/parity hashes, artifact path/manifest/SHA-256, verified no-remotes/clean status, differences, and `authority:false`, `maturity:DEV`. The builder commits that record with the backlog handoff; it does not mutate target history afterward.

Independent review reruns target-local checks and compares record hashes to the actual target and artifact. Passing this item proves only a local DEV source split. It does not create a remote, release, install on a client, switch authority, or advance graduation.

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
