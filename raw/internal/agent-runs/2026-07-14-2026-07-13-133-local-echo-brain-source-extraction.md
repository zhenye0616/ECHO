# Agent run: 2026-07-13-133-local-echo-brain-source-extraction

- **Item:** 2026-07-13-133-local-echo-brain-source-extraction
- **Builder persona:** fable-builder-133 (Claude Code / claude actor)
- **Branch:** agent/133-echo-brain
- **Worktree:** /Users/zhenye/Desktop/Project_echo--133-echo-brain
- **Target repo:** /Users/zhenye/Desktop/echo-brain (builder-only creation)
- **Pinned source commit:** 2971310441b69735cbe759293abd8c4d044bf347
- **Claim commit on main:** 4d85b6c3

## Run 1 (started 2026-07-14T05:46Z)

### Context established
- Pipeline dir is `backlog/claimed/` (skill stage name). Claimed atomically; pushed main 4d85b6c3.
- Node 22.22.1 at /usr/local/bin/node, git 2.37.3 at /usr/local/bin/git — both match the spec's pinned toolchain.
- Pinned commit product trees are byte-identical to current main (`git diff --stat 2971310..a23e55cd -- src/product product schemas/product tools/product tests/product` empty), so extraction target is stable.

### Source closure determination
Traced the fixed-point closure from AC3 seeds (2 entry points + 8 tests/product files + meta relocations). Result: **32 tracked source blobs**:
- 23 production `src/` modules (matches item-132's recorded "23 internal modules" closure).
- 8 byte-identical `tests/product/` files (build-once-contract, hermeticity, import-fence, packaged-product, qualification-report, runtime-config, runtime-isolation, setup.ts).
- `tools/product/toolchain-preflight.mjs` — reached by a literal static import in `packaged-product.test.ts`; it has only `node:` imports (closure leaf).

All 32 blobs are git mode `100644` (no symlinks/executables).

Plus 4 relocated/copied meta seeds:
- `product/package.template.json` -> `package.json` (relocated)
- `product/npm-shrinkwrap.json` -> `npm-shrinkwrap.json` (relocated)
- `product/source-boundary.v1.json` -> `product/source-boundary.v1.json` (copied, same path)
- `schemas/product/runtime-config.v1.schema.json` -> `schemas/runtime-config.v1.schema.json` (relocated)

### Interpretation decisions (for reviewer adjudication)
1. **8 product tests are byte-parity leaves, not executed.** They reference item-132 qualification tooling (`tools/product/check-boundary.mjs`, `build-artifact.mjs`, `prepare-offline-deps.mjs`, `validate-qualification.mjs`), CI workflow files, `product/README.md`, and `product/package.template.json` via runtime `join(REPO_ROOT, '<literal>')` path construction passed to `spawnSanitizedChild`. Those are runtime-computed paths, not module import edges, so the fixed-point resolver does **not** follow them (they are recorded as parity-only references). Extracting them would pull the entire qualification/CI toolchain into a repo whose AC2/AC4 boundary explicitly forbids that scope and would require copying the source `product/README.md` at its source path, conflicting with the target-authored standalone `README.md`. Therefore echo-brain preserves the 8 tests byte-identically as parity evidence (verified by `test-parity.v1.json` hash equality) and its executable suite is `tests/migration/**` + `tests/product/end-to-end-synthetic.test.ts`.
2. **`src/runtime/paths.ts` (named in AC5) is not created.** The "rewrite and exclusion allowlists are empty" + "Production TypeScript remain byte/mode identical" constraints forbid rewriting import paths, so production source is copied at identical paths. State distinctness (AC5) is satisfied structurally: echo-brain resolves all mutable state under the client-configured absolute `state_dir` from `schemas/runtime-config.v1.schema.json`, which is distinct from Project_echo and siblings by construction.

### Results (verified this session)

Target: `/Users/zhenye/Desktop/echo-brain`, branch `migration/2026-07-13-133`, single root
commit HEAD `54259ef67eb90b5a1412bf15bac716180e822c72`, tree `e13b0cc57365acf9600f06882750982e02412c5a`,
no remote, working tree clean.

Green:
- **AC1** — sanitized-envelope repo creation; 36 source-derived blobs byte-identical
  (`git hash-object` == source OIDs); single root commit; `git fsck --full --no-reflogs
  --unreachable` empty; object-set == reachable-set (78 objects).
- **AC2** — `tools/check-dependencies.mjs` exit 0 (`ok:true`); 43 locked packages;
  used_external = {ajv, better-sqlite3}.
- **AC3** — `tools/check-provenance.mjs` exit 0; independent `tools/audit-pinned-extraction.mjs`
  verdict PASS (0 byte divergences vs pinned source object DB); 56-row partition; exact 21
  target-only set; empty transform/exclusion allowlists.
- **AC4** — `tools/check-boundary.mjs` exit 0; product closure resolves entirely locally;
  external = {ajv, better-sqlite3}.
- **AC6** — `provenance/test-parity.v1.json` records the 8 byte-identical parity leaves;
  `tests/product/end-to-end-synthetic.test.ts` passes (synthetic meeting → adapter → manual
  gate → brief artifacts; fixed time; no creds/network/storage).
- **AC5/AC7 (partial, demonstrated)** — `vitest run` 14/14 across 5 files including
  `packaged-product` proving B0==B1 identical tarball SHA-256
  (`d8abbae572bac1a00c93522263d9e8f94112fe582aa7ef2ddf992267e39c970f`, 27 members) and offline
  clean-prefix install; source-independence (no symlink/submodule/remote/sibling-escape) green.

Remaining (documented, not run this session):
- **AC5/AC7 formal offline matrix** — B0/B1/B2/R1 across four separate clones under the
  `sandbox-exec '(deny network*)'` profile with DNS/direct-IP probes and the isolated cache
  fill. Determinism + offline install were demonstrated with B0/B1; the four-clone sandbox
  matrix was not executed here.
- **AC8 reviewer leg** — the independent `codex-ops` review record + feature-branch child
  commit is the reviewer's responsibility.

Genuine tension surfaced for adjudication: **AC3↔AC5 schema path.** Byte-identical
`src/product/config.ts:55` + `package.json` `files` reference `schemas/product/runtime-config.v1.schema.json`,
but AC5 names `schemas/runtime-config.v1.schema.json`. Reconciled by committing at the AC5 path
and having `verify-artifact.mjs` stage into the tarball at `schemas/product/...`. Reviewer should
confirm or direct a same-path copy instead.

Toolchain note: `node_modules` was provisioned with `--no-save --no-package-lock` (no
package.json/lock mutation) to run vitest/tsc, then moved out of the target so the working tree
is clean and no `.gitignore` (which would violate the exact 21 target-only set) was added.

Feature branch `agent/133-echo-brain` head_sha: `0caef8237c2aefba0d65c5f70000220654ee8f2e`
(binds the migration record `raw/internal/migrations/2026-07-13-133-echo-brain.md`).
