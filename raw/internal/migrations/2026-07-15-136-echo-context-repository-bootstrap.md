# Migration record — item 136 canonical echo-context repository and source-artifact seal

Date: 2026-07-16
Item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`
Result: complete source-only DEV substrate; no install, hosted release, or live-state mutation

## Authority boundary

- `source_authority: echo-context/main`
- `artifact_authority: versioned-source-artifact`
- `runtime_authority:false`
- `state_authority:false`
- `installed:false`
- `maturity: DEV`

Project_echo remains the installed runtime, daemon, live-state, client-endpoint,
backup, and rollback authority. No machine client points at this repository or
the sealed source tuple. This record does not authorize item 137 installation,
item 140 hosted publication, or any later release.

## Canonical identities

- Canonical URL: `https://github.com/zhenye0616/echo-context.git`
- Repository: `zhenye0616/echo-context`
- Repository numeric ID / node ID: `1302541575` / `R_kgDOTaM1Bw`
- Visibility / default branch: `private` / `main`
- Owner login / numeric ID: `zhenye0616` / `73834646`
- Project repository: `zhenye0616/ECHO`
- Project numeric ID / node ID: `1225417447` / `R_kgDOSQpi5w`
- Project visibility / default branch: `public` / `main`
- Exact reviewed specification commit: `f80003a7fbd08755dbff669951ed07bf43b390d0`
- Ready-content seal: `a1570370f26201be2e2390dbc94407cce5ee2e65b76843ca6b787c8d20d7e5ca`
- Baseline `B`: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`
- Baseline tree: `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`
- Reviewed feature `H`: `ad370ae0a666f366e1ff93c9ec5b920763e9cbb8`
- Reviewed feature tree: `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`
- Canonical merge `M`: `78bf523e87c8b9986d31ba28fdf987cf6ea66c29`
- Canonical merge tree: `3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`
- Ordered `M` parents: `[B, H]`
- Merge message: `Merge item 136 echo-context canonical source`
- Merge author and committer: `ECHO Coordinator <echo-coordinator@users.noreply.github.com>`
- Merge author and committer timestamp: `2026-07-16T19:49:32Z`
- Package version: `0.1.0-dev.136.1`

Authenticated post-landing readback returned exact user, repository, visibility,
default-branch, and ref identities above with `refs/heads/main=M` and object type
`commit`. The complete advertised branch/tag readback contained only:

```text
ad370ae0a666f366e1ff93c9ec5b920763e9cbb8  refs/heads/agent/echo-context-canonical-repository-release-substrate
78bf523e87c8b9986d31ba28fdf987cf6ea66c29  refs/heads/main
```

No tag was advertised. The reviewed feature branch is retained; item 136 did
not authorize branch deletion or other cleanup mutation.

## Immutable repository bootstrap lineage

Repository creation and baseline publication were completed once before the
implementation cycle and were never repeated:

- Repository-create approval ID: `6a2e8326-3213-45cb-856a-56a2952ab125`
- Repository-create approval record:
  `raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-repository-create-6a2e8326-delegated-approval.md`
- Repository-create authorization Project commit / tree:
  `e1ec8f74ae812e5df0983cd11a9a0827a9aefb67` /
  `b810080a7ae225638b8b91dc417decd4d0ef2822`
- Repository-create record SHA-256 / Git blob:
  `b766d9be93bed3e60b39ca33eed1dd9fc07cb3e8c489e2f6bd94f41afca5fd3f` /
  `668ce41e8ffba58c1435b9fb880f8d84bc07ea3b`
- Creation result: exactly one direct HTTP 201 at `2026-07-16T08:43:51Z`;
  authenticated readback bound owner `zhenye0616`, private repository numeric
  ID `1302541575`, node ID `R_kgDOTaM1Bw`, full name
  `zhenye0616/echo-context`, empty refs, and default branch name `main`.
- Baseline-main approval ID: `472e7bf5-553a-4e6e-b160-63ab300f1c1b`
- Baseline-main approval record:
  `raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-baseline-main-push-472e7bf5-delegated-approval.md`
- Baseline-main authorization Project commit / tree:
  `ece86049e8bfca567f03e7cdfbb8ee1d0b45fd05` /
  `f6ee6e4c52a071a2f4463579bd8b591f166fbe2e`
- Baseline-main record SHA-256 / Git blob:
  `85b2f64d786140ce2eed6bf3bedfe6e62d740f4049d228de3c6fa53a9258f307` /
  `6fb5f360b9c42f7c04e300286f90347d4a90c1b4`
- Baseline result: exactly one create-only, empty-expect leased porcelain row
  with flag `*`, destination `refs/heads/main`, and summary `[new branch]`;
  authenticated readback returned exact `main=B` and the same immutable
  repository identities.

The two authorization records and the current target object graph are the
durable readback evidence. Neither operation is retryable, adoptable,
deletable, or reinterpretable by this record.

The completed bootstrap secret scan is also immutable prerequisite evidence:

- Scanner contract: `tools/secret-scan-contract.json`, 946 bytes, SHA-256
  `b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453`.
- Scanner executable: Gitleaks `8.30.1`, official Darwin x64 binary SHA-256
  `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`.
- Baseline pre-publication coverage: sole ref at exact `B`, 35 reachable
  commits, 190 tracked paths, non-shallow repository, and clean full fsck.
- Result: exit zero, zero findings. No secret value entered the record.

## Independent implementation review

- Review record: `raw/internal/migrations/2026-07-15-136-echo-context-implementation-review.md`
- Review-record Project commit: `058eeed26f217e1a4d3f35fc7f2070138b2540a8`
- Review-record byte count: `14230`
- Review-record SHA-256: `e669a2c9c0b6c9843741cf8298dc0986440156525e1e41caa8a7b2bf7e4c82d5`
- Review-record Git blob: `e9697f2172cfe0c685085a1faaa4f7958d7a09b8`
- Builder actor / run: `codex-136-cycle3-builder-mendel-222cc09b` / `cycle3-mendel-222cc09b-20260716T184207Z`
- Reviewer actor / run: `codex-136-final-reviewer-b9e01c42` / `codex-136-final-rereview-20260716T192413Z`
- Verdict: `merge_ready`
- Remaining findings: zero HIGH and zero MEDIUM

The actor IDs and run IDs are nonempty and independently unequal. The review
bound exact `H` and its tree, reran AC3 twice in fresh canonical HTTPS clones,
and passed the focused 49/49 tests, typecheck, lint, runtime inventory 340/23,
repository authority, full CI 1,086 passed / 17 skipped, operator replay 2/2,
four-ref full-history secret scan, exact-tree merge preview, scope audit, and
full fsck.

## Target-main authorization and landing result

The effective one-use authorization was:

- Approval ID: `d7189a6f-813b-40d1-ae03-bb19eedf816a`
- Record: `raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-target-main-landing-d7189a6f-813b-40d1-ae03-bb19eedf816a-delegated-approval.md`
- Authorization-containing Project commit: `66509501308942e18f00b78dbdc0fec3982c160f`
- Authorization-containing Project tree: `ad27d982e080c5e4d41fe398f7306b9defc5eba4`
- Authorization-record SHA-256: `bba8652c86f83610a2e5b7e9b809ad4ef4f86770d856b8f3d165a9f9202c6a3d`
- Authorization-record Git blob: `bef2c3545160d81a37fb404e4571f2b42da991fc`

The prior approval `372e5d50-ae1e-43c6-a557-ab874994784c`, record
`raw/internal/migrations/2026-07-15-136-echo-context-canonical-repository-release-substrate-target-main-landing-372e5d50-ae1e-43c6-a557-ab874994784c-delegated-approval.md`,
was published by Project commit / tree
`d6c7baa92c1a0aff9cc96553cfce12671cb804a3` /
`681a996195ff6f7c82520d6d825e1a7aa7c6ce04`. It was consumed by a client-side
zsh refspec-expansion error before Git sent an update. It produced no porcelain
update row and authenticated reconciliation proved `main=B`. It was never
retried or reused. The effective replacement authorized literal argv tokens
and preserved the already-reviewed merge object `M` without rewrite.

After exact authorization readback and revalidation, the coordinator invoked
the sole replacement target-write command once:

```text
/usr/local/Cellar/git/2.37.3/bin/git -c http.followRedirects=false push --porcelain --no-verify --no-follow-tags --force-with-lease=refs/heads/main:0cf7b006eba665c0bf55e82ff04da70f19f01ebb https://github.com/zhenye0616/echo-context.git 78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main
```

The command exited zero. Its sanitized porcelain proof was exactly one
fast-forward row between the required header and terminal marker:

```text
To https://github.com/zhenye0616/echo-context.git
<space><tab>78bf523e87c8b9986d31ba28fdf987cf6ea66c29:refs/heads/main<tab>0cf7b00..78bf523
Done
```

Parsed proof: flag `space`; source
`78bf523e87c8b9986d31ba28fdf987cf6ea66c29`; destination
`refs/heads/main`; summary `0cf7b00..78bf523`; exactly one row and no other
ref. Authenticated readback then returned exact `main=M`, the same repository
and owner identities, and private visibility. There was no second target push,
tag, release, asset, install, client mutation, or live-state mutation.

## AC6 fresh canonical clone

The coordinator created mode-0700 temporary root
`/private/tmp/echo-136-ac6.3jmziX`, disabled system/global Git configuration,
and used the founder's existing GitHub credential helper without recording any
credential. The exact clone and checkout operations were:

```text
GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null HOME=/Users/zhenye /usr/local/Cellar/git/2.37.3/bin/git -c credential.helper= -c 'credential.helper=!/usr/local/bin/gh auth git-credential' -c http.followRedirects=false clone --no-checkout --no-local https://github.com/zhenye0616/echo-context.git /private/tmp/echo-136-ac6.3jmziX/canonical
GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null /usr/local/Cellar/git/2.37.3/bin/git -c core.hooksPath=/dev/null checkout --detach 78bf523e87c8b9986d31ba28fdf987cf6ea66c29
```

Pre-build readback proved detached `HEAD=M`, tree
`3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec`, `origin/main=M`, empty
porcelain, non-shallow clone, no alternates, and clean `git fsck --full --strict`.
Authenticated remote readback again returned `main=M` after both
builds and verifications.

Toolchain identities were exact:

```text
NODE = /usr/local/Cellar/node@22/22.22.1_1/bin/node (v22.22.1)
NPM  = /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js (10.9.4)
GIT  = /usr/local/Cellar/git/2.37.3/bin/git (git version 2.37.3)
```

## Dual deterministic builds and verification

The two builds used separate mode-0700 HOME, TMPDIR, npm-cache, and output
directories. From the canonical clone root, the substantive build invocations
were:

```text
env HOME=/private/tmp/echo-136-ac6.3jmziX/home TMPDIR=/private/tmp/echo-136-ac6.3jmziX/tmp npm_config_cache=/private/tmp/echo-136-ac6.3jmziX/npm-cache PATH=/usr/local/Cellar/node@22/22.22.1_1/bin:/usr/local/bin:/usr/bin:/bin /usr/local/Cellar/node@22/22.22.1_1/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js run build:artifact -- --source-sha 78bf523e87c8b9986d31ba28fdf987cf6ea66c29 --out /private/tmp/echo-136-ac6.3jmziX/build-1
env HOME=/private/tmp/echo-136-ac6.3jmziX/home-2 TMPDIR=/private/tmp/echo-136-ac6.3jmziX/tmp-2 npm_config_cache=/private/tmp/echo-136-ac6.3jmziX/npm-cache-2 npm_config_update_notifier=false PATH=/usr/local/Cellar/node@22/22.22.1_1/bin:/usr/local/bin:/usr/bin:/bin /usr/local/Cellar/node@22/22.22.1_1/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js run build:artifact -- --source-sha 78bf523e87c8b9986d31ba28fdf987cf6ea66c29 --out /private/tmp/echo-136-ac6.3jmziX/build-2
```

Each build emitted the exact carrier:

```text
manifest_hash=6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01
```

Each output directory contained exactly these three regular files and no other
entry:

| typed file | bytes | file SHA-256 |
|---|---:|---|
| source manifest `echo-context-0.1.0-dev.136.1-source.manifest.json` | 74,584 | `6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01` |
| source archive `echo-context-0.1.0-dev.136.1-source.tgz` | 661,024 | `3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef` |
| checksum sidecar `echo-context-0.1.0-dev.136.1-source.tgz.sha256` | 106 | `6b3cd9a2e3f45cffe1619ca2527f03f92a17b8d6bd428bb05f2d00bd2819e104` |

Pairwise byte comparison passed for the source manifest, source archive, and
checksum sidecar. Both checksum sidecars were exact coreutils sha256sum lines
and bound the source-archive SHA-256 above.

Each build was independently verified with its own emitted carrier. The exact
invocations were:

```text
env HOME=/private/tmp/echo-136-ac6.3jmziX/home TMPDIR=/private/tmp/echo-136-ac6.3jmziX/tmp npm_config_cache=/private/tmp/echo-136-ac6.3jmziX/npm-cache npm_config_update_notifier=false PATH=/usr/local/Cellar/node@22/22.22.1_1/bin:/usr/local/bin:/usr/bin:/bin /usr/local/Cellar/node@22/22.22.1_1/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js run verify:artifact -- --archive /private/tmp/echo-136-ac6.3jmziX/build-1/echo-context-0.1.0-dev.136.1-source.tgz --checksum /private/tmp/echo-136-ac6.3jmziX/build-1/echo-context-0.1.0-dev.136.1-source.tgz.sha256 --manifest /private/tmp/echo-136-ac6.3jmziX/build-1/echo-context-0.1.0-dev.136.1-source.manifest.json --expected-manifest-hash 6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01
env HOME=/private/tmp/echo-136-ac6.3jmziX/home-2 TMPDIR=/private/tmp/echo-136-ac6.3jmziX/tmp-2 npm_config_cache=/private/tmp/echo-136-ac6.3jmziX/npm-cache-2 npm_config_update_notifier=false PATH=/usr/local/Cellar/node@22/22.22.1_1/bin:/usr/local/bin:/usr/bin:/bin /usr/local/Cellar/node@22/22.22.1_1/bin/node /usr/local/Cellar/node@22/22.22.1_1/lib/node_modules/npm/bin/npm-cli.js run verify:artifact -- --archive /private/tmp/echo-136-ac6.3jmziX/build-2/echo-context-0.1.0-dev.136.1-source.tgz --checksum /private/tmp/echo-136-ac6.3jmziX/build-2/echo-context-0.1.0-dev.136.1-source.tgz.sha256 --manifest /private/tmp/echo-136-ac6.3jmziX/build-2/echo-context-0.1.0-dev.136.1-source.manifest.json --expected-manifest-hash 6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01
```

Both verifier invocations exited zero and returned:

```text
verify-source-artifact OK: manifest_hash=6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01 source_archive_sha256=3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef
```

An independent read-only agent then repeated the clone identity, exact-file,
pairwise-byte, manifest, checksum, and committed-verifier checks. That audit
returned PASS with the same tuple and empty canonical-clone porcelain.

## Final six-field content tuple

```text
source SHA              = 78bf523e87c8b9986d31ba28fdf987cf6ea66c29
source tree             = 3285a3f147a2de3bd6bd54b0ed2ccdc3f92573ec
version                 = 0.1.0-dev.136.1
source-archive SHA-256  = 3e7a76c930e7198bbf03b7b13390f5eb2341702d2d3c61ba6d89d00090647bef
lock hash               = 13ead528470d91adfc4456d349ae628f03f768ba51d78aee8d0b2c42dc12784b
manifest hash           = 6a5def0ec7ca27f9230c587f5f9e2bb7caedb0253171198a7bde380877a26e01
```

Both authenticated manifests independently provided the tuple. Each manifest
contains 225 sorted inventory entries and 225 USTAR members rooted at
`echo-context-0.1.0-dev.136.1/`; binds extraction baseline `B` and tree
`70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`; and states exactly
`artifact_kind:source`, `installable:false`, `runtime_authority:false`,
`state_authority:false`, and `maturity:DEV`.

The manifest hash is the SHA-256 of the canonical manifest bytes. The
source-archive SHA-256 is the digest of the `.tgz` and the value bound by the
checksum sidecar. The lock hash is the SHA-256 of the `package-lock.json` blob
at `M`. These identities are distinct and are not interchangeable.

## Recovery and successor handoff

- Immutable pre-landing backup: `B` and tree
  `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`.
- Restore proof: `M` has ordered parents `[B,H]` and tree exactly equal to the
  independently reviewed `H` tree.
- Canonical recovery entry point: private `echo-context/main=M`, the immutable
  review and landing-authorization records above, and this six-field tuple.
- Automatic rollback is not authorized. Any later target mutation requires a
  new exact-operation authorization.
- No artifact bytes are hosted, committed to Project_echo, or handed over as
  files. Deterministic rebuild from `M` is the distribution mechanism.
- Item 137 must consume exact `M`, this six-field tuple, and this record's
  Project publication commit; rebuild with `build:artifact`; and verify the
  tuple before any install work.
- Item 140 owns every hosted CI, protection, tag, GitHub Release, and release
  asset operation.

The Project commit that lands this record is intentionally written only into
the later item-136 completion-move commit as `project_landed_sha`; a commit
cannot name itself. The completed item also records `target_landed_sha=M`.

## ECHO MCP

Zero ECHO MCP calls were made while landing, sealing, or recording item 136, so
no dogfooding journal entry is owed.
