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

---

## Run 2 (2026-07-14 — codex-builder-133 independent-review remediation)

- **Trigger:** the independent HIGH sidecar proved that arbitrary-RHS array
  destructuring was accepted as command provenance.
- **Old reproduction:** target `4a6dcb33…` plus disposable fixture commit
  `5f80742`; `check-dependencies.mjs` exited 0 with `ok:true` for an
  attacker-controlled `[command, args]` initializer.
- **Resolution:** removed generic destructuring trust. Computed commands are
  now allowed only in the three explicit reviewed owners; literal tuples stay
  independently enumerated. Added the exact fixture, a same-class literal
  destructuring adversary, and an explicit-owner positive regression.
- **Target:** `957ad4680f6c67d15fb3dfa0941b52c2ab9c3110` (tree
  `0a34ef4aa27ca460b0697773c78a2281ff534f31`), one parentless branch, no
  remotes, clean, 57 tracked files, 78/78 reachable objects.
- **Feature handoff:** `b62d160c6deeb77f528e58e0ef49090de7fac72d`, pushed to
  `origin/agent/133-echo-brain`; its delta from review child `f92af1db` is only
  the refreshed migration record.

### Verification

- Native dependency/provenance/boundary checkers: PASS.
- Focused dependency suite: 14/14; full executable target suite: 25/25 across
  five files; TypeScript and ESLint: PASS.
- Operator extraction audit, gitleaks, fsck, object equality, no-follow
  filesystem equality, symlink/gitlink/residue, and lock metadata checks: PASS.
- B0/B1/B2/builder-R1 strict offline matrix: PASS on first formal execution;
  six sandboxed argv entries and zero dangerous inherited variables per leg.
- Shared tuple: tarball `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b`,
  tree `0a34ef4aa27ca460b0697773c78a2281ff534f31`, lock
  `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296`,
  27 members, manifest digest
  `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24`.

### Handoff boundary

Builder-operated R1 is reproducibility evidence, not independent judgment.
The existing rejection record and review sidecar remain immutable; a fresh
reviewer must bind the exact new target OID/tree and feature head. Target stays
local-only, `authority:false`, and at DEV maturity.

---

## Run 3 (resumed at 2026-07-14T22:48:44Z — scope-shadow rejection remediation)

### Previous state reconciled

- Read the committed builder pointer first, then the canonical project instructions, item,
  every `spec_ref`, fresh rejection sidecar, immutable rejection record at reviewer child
  `1caf83fc63c83f044a2f0d2608a85bcf4759bbcc`, and prior run history. No ECHO MCP call was made.
- Fast-forwarded the clean feature worktree from builder head `b62d160c…` to the exact reviewer
  child before editing. Preserved the target boundary, the three reviewed computed-command
  owners, and the unchanged artifact payload. Superseded the rejected target root and discarded
  only scratch outputs from incomplete harness attempts; no rejected target code was retained as
  acceptance evidence.

### What I implemented

- Removed file-global literal-name authorization from `tools/check-dependencies.mjs`. Outside
  the unchanged three `computed_command_owners`, every nonliteral executable now fails closed;
  binding syntax is not executable provenance.
- Extended child-process spawner recognition across aliased named imports, namespace/default
  imports, named/namespace `require` bindings, and dot or literal-bracket member calls without
  adding an owner or allowed command.
- Added four regressions: the reviewer's exact same-name shadow fixture, reassigned `let`
  command, aliased named child-process import, and namespace-member child-process call. The
  prior arbitrary-RHS and literal-destructure regressions remain.
- Rebuilt the target as the parentless root
  `41c28171c64710b3ad23392a2606d75cfe8e7b2c`, tree
  `5691ab527de8eb622ed1d333ed867a2191afdf8a`, and regenerated extraction hashes.

### Files modified and publication identity

- Target old-to-new delta is exactly three modified paths, with no additions/deletions:
  `tools/check-dependencies.mjs` (235 lines),
  `tests/migration/dependency-set.test.ts` (228 lines), and
  `provenance/source-extraction.v1.json` (529 lines).
- Project_echo feature delta from reviewer child is only
  `raw/internal/migrations/2026-07-13-133-echo-brain.md` (718 lines after refresh).
- Feature branch `agent/133-echo-brain` head
  `08f0441703a4b44e82dcea7e456129c4507d3cab`, sole parent `1caf83fc…`, was pushed with an exact
  lease and literal remote readback.

### Decisions

- Chose the reviewer's conservative option: fail closed on every nonliteral executable outside
  the three whole-file owners, instead of adding scope/mutation analysis or another trust path.
- Kept direct literal commands and literal tuples independently classified.
- Builder R1 is labeled mechanical reproducibility evidence only and cannot satisfy AC8 reviewer
  independence. Authority remains false and maturity remains DEV.

### Acceptance status

- AC1: PASS — parentless, one-branch, no-remote target; clean 57-file tree; fsck empty; all
  objects equal reachable objects (78/78).
- AC2: PASS — dependency checker reports `ok:true`, 43 locked packages, expected commands, and
  errors `[]`; all requested adversarial command-provenance fixtures fail closed.
- AC3: PASS — provenance reports `ok:true`, 56 partition rows and 21 target-only files; operator
  audit PASS against the pinned Project_echo object database.
- AC4: PASS — boundary reports `ok:true`, closure 23, external packages exactly `ajv` and
  `better-sqlite3`.
- AC5/AC7: PASS for builder evidence — B0/B1/B2/builder-R1 strict offline lifecycle matrix is
  green and produces one exact tuple.
- AC6: PASS — executable target suite and synthetic end-to-end proof are green.
- AC8: PENDING — fresh independent review of this exact OID/tree is required.

### Test and evidence output

Focused dependency suite:

```text
Test Files  1 passed (1)
Tests       18 passed (18)
Duration    114.53s
```

Definitive full suite:

```text
Test Files  5 passed (5)
Tests       29 passed (29)
Duration    46.26s
```

- TypeScript: PASS, no diagnostics. Exact scratch-config ESLint: PASS, zero findings.
- Operator audit: PASS; source tree 2,847; target 57; partition 56; target-only 21; errors `[]`;
  output SHA-256 `ec19e08a89650d278a788ade116b9a3a4087b37b5b73fd32570d07f87ed70a96`.
- Gitleaks 8.30.1: PASS, one target commit, no leaks. Target fsck: empty; object closure 78/78.
- B0/B1/B2/builder-R1: every leg passed offline `npm ci`, build+pack, lint, clean-prefix
  install, `validate-config`, and `selftest` under strict `env -i` plus deny-network. Per leg:
  six argv records, 24 DNS/direct-IP denial probes, two loopback controls, and a zero-byte
  dangerous-environment capture.
- Shared tuple: tarball
  `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b`; lock
  `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296`; 27 members; canonical
  manifest `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24`.

The first full-suite attempt lacked target runtime/type provisioning (23 tests passed, two
packaged tests failed, and one suite could not load Ajv). A separate unsanitized diagnostic
matrix attempt failed lint resolution from a copied scratch-config location. Both were discarded
as harness setup misses, all scratch state was reset, no target byte changed, and the definitive
strict runs above passed.

### Open questions and drift

- No builder-blocking question remains. Fresh independent review must bind target
  `41c28171…` / tree `5691ab52…` and feature head `08f04417…`.
- The recorded TypeScript/typescript-eslint peer-range mismatch remains qualification debt, not
  a blocker for this local DEV extraction.
- Drift events: none. No sidecar/review record, wiki, docs index, adjacent item, release state,
  authority, or maturity was changed.
