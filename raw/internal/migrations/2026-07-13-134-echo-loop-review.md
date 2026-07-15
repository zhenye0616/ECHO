# Independent AC8 seventh judgment — echo-loop local source extraction (item 134)

## Verdict

**ACCEPT — merge as-is.** AC1–AC8 pass. The sixth-review portability defect is closed under the required scratch-HOME/system-toolchain envelope, and no acceptance defect remains open. There are no pre-merge fixups.

This verdict does not claim that the review-record child has been committed or published. The later publication orchestrator must complete the exact detached-child and lease-bound feature-ref publication described below before merge.

## Reviewer independence and fresh-eyes statement

- Reviewer: fresh independent `codex-ops` judgment session, 2026-07-15 PDT.
- This session is not builder `fable-builder-134b`, not the neutral execution leg, and not the publication orchestrator.
- The current item, all ten current `spec_refs`, the builder migration record, sixth rejection, neutral evidence, full Vitest log, builder diff, and accepted target implementation were read independently.
- No file under `backlog/task-state/` was read. The referenced protocol skill was read; no per-task pointer was opened.
- Zero ECHO MCP calls were made.
- Project_echo and `/Users/zhenye/Desktop/echo-loop` were treated as read-only with `GIT_OPTIONAL_LOCKS=0` for Git probes.
- No file, sidecar, commit, ref, remote, authority state, installation state, or maturity state was changed.

## Immutable bindings

| Binding | Exact value |
|---|---|
| Review `spec_commit_sha` / Project_echo handoff | `a50f6f0a16acba9333db32612b4b74cfb92b7b80` |
| Handoff tree | `cde493a2e5ce83e5cb4aa8c71b298b099edd13be` |
| Item path | `backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md` |
| Item blob / bytes / SHA-256 | `eb2517b6a2a5cf33f673d6c59ee22990ffb7d7c1` / 28,479 / `1bae6c322dd70cc83c6323b960d072cd3163ca00d7aadea3ff9fc5c6dba23dfb` |
| Immutable builder head | `e2ccdf9a22eb272bdb608bf0a86a5a7d119cc915` |
| Builder sole parent | `e9ae6519070144a7dd04f98b5016ebe20b66ef38` |
| Builder tree | `469dfdc41ef88d02bdfd9664979650a6a5bb0afc` |
| Builder delta | exactly `M raw/internal/migrations/2026-07-13-134-echo-loop.md` |
| Migration blob / bytes / SHA-256 | `d171c7f2d7e684dbac429b55291f24f5e3fd8395` / 10,717 / `239f08e3a1271f212a995bf163fb05eb1c20bb649d1c3bf3addca26ed531f35d` |
| Sixth rejection blob / bytes / SHA-256 at `e9ae6519…` | `a047d8c8f096201dab260ca4456da7a942f1099b` / 8,819 / `5f4ddaa9f35f4d41188fa52273ac09ec1c8c163a8aca3bab600138de347521ba` |
| Source pin | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target | `/Users/zhenye/Desktop/echo-loop` |
| Target branch / HEAD / tree | `migration/2026-07-13-134` / `e945e33c498b5bb5689e30eb70952b688a6347df` / `bbc6832871655c138aab31420037e9dec480a611` |
| Neutral evidence / SHA-256 | `/private/tmp/echo-134-r7-executor/evidence.md` / `ab7ecdecf5fe074d623615b2252f869d1039b86fe7f7fcbd0a8bc97f2dfcbe51` |
| Full Vitest log / SHA-256 | `/private/tmp/echo-134-r7-executor/logs/full-vitest.log` / `8d6c49ff64574dcdf641c4fb174de62cd454446cd07e4cda26f2f786f008fc5b` |
| Literal publication endpoint | `https://github.com/zhenye0616/ECHO.git` |
| Full feature ref | `refs/heads/agent/134-echo-loop` |
| Review-publication expected-old | `e2ccdf9a22eb272bdb608bf0a86a5a7d119cc915` |

The neutral executor’s strict pre- and post-review probes observed exactly the builder head at the literal endpoint/ref. The earlier `e9ae6519…` expected-old in the migration record describes the already-completed builder remediation push; it is not the lease for the forthcoming review child.

## Target topology and provenance

- Target history is 43 linear commits with one root, `22a98d80227b0e95e25dbf4c6f5182aa0fabaf4d`, one local branch, and zero merges, tags, or remotes.
- All 487 objects are reachable: 43 commits, 185 trees, and 259 blobs. Strict full fsck passed with no garbage.
- Modes are 132 regular `100644` and 45 executable `100755`; there are no symlinks or gitlinks.
- The clean target has 177 tracked paths exactly equal to 177 non-`.git` filesystem paths. Both sorted NUL path lists hash to `d9ae764ea67d8241b1613ee88dd71be051772ba50501b8eb17e970b8deedbb7d`.
- No alternates, promisor configuration, replacement refs, grafts, shallow state, ignored residue, or untracked residue were found.
- The raw source-object audit reproduced all 148 source-seed rows, 11 literal seeds, 11 recursive roots, accepted modes, blob OIDs, byte lengths, and hashes from the pinned source commit.
- The sealed policy is Project_echo blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`, SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a`; the target copy is byte-identical.

### Bound target artifacts

| Artifact | Git blob | SHA-256 |
|---|---|---|
| `provenance/source-policy.v1.json` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| `provenance/edge-record.v1.json` | `d4dc3e22971ee8aaf778b5b9654b3fd2829f0b67` | `f7db0c5ce6c2ee3a3bb71abec8342caa3185eb781feb3a3776647a09781cb487` |
| `provenance/edge-record.v1.schema.json` | `f8fe0ab1c58442dfa2dfb6375a1d3ca7475d52f7` | `209c9cea6e04a61ad037d07731b0e0700b75ed7e500bcce1cfb43baf034b702e` |
| `provenance/watcher-project.v1.json` | `af08720815120b4c40bc07ad1bf78977b1573f20` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` |
| `provenance/verification-workload.v1.json` | `c367b354660af5ecd91789968bb668a2a03de963` | `ead0d267f78e6ecf8f940cb7c6d11bb5a4cf72de26be8876c189638bdcc84d0b` |
| `provenance/source-seed.v1.json` | `5278839736a53a82bfce884ea16eac0b254437ed` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` |
| `package.json` | `afaedd015a49f98bf7bb3d154281665879f2aa10` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` |
| `package-lock.json` | `b67ca3f905e5c87023198d47edaaf24f725edea2` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` |

The final closure is 646 rows across nine populated classes, 110 source blobs, and three manifest blobs, with fixed point `b9139e30a55e6b9dcf23bd3ecb3dfaa0fecfc65f58341ee452ebe5c570ae5054`. All 14 sealed classes remain implemented and fixture-covered; only nine are populated by this exact target.

## Acceptance status

| AC | Status | Independent judgment |
|---|---|---|
| AC1 | **PASS** | Raw pinned-object expansion, ordinary no-remote repository topology, clean filesystem equality, modes, reachability, and strict fsck all reproduce at the accepted HEAD/tree. |
| AC2 | **PASS** | Sealed-policy identity, 148-row source inventory, 76 byte-identical ports, 646-row fixed point, all 14 edge-class implementations, exact dependency/lock closure, and skill drift checks pass. Scratch-HOME and poisoned-user-site validation close the sixth rejection. |
| AC3 | **PASS** | Coord exports and semantics match the contract: reserved event kind, deterministic IDs, payload conflict behavior, PENDING/PUBLISHED recovery, ten-attempt 2,000ms initiation budget, SQLite readiness marker, inode/sidecar/temp handling, and named offline native rebuild all pass. |
| AC4 | **PASS** | Templates and target queue are minimal and reusable. No Project_echo wiki/raw/history archive, meeting product, context capture/storage/retrieval, MCP retrieval, or unrelated product lane is present. |
| AC5 | **PASS** | Watcher code and 53 tests preserve detached/private-index candidate preparation, exact endpoint/ref leases, launch registration barriers, nonce/PGID identity, leaderless group reaping, takeover CAS, retry/escalation, both watcher orders, and founder-checkout non-mutation. |
| AC6 | **PASS** | Four disposable workflow tests prove proposed-unclaimable, ready-seal freshness, single-winner claim, worktree isolation, and explicit merge checkpoint without real-repository writes. |
| AC7 | **PASS** | Private no-local/no-hardlinks clones, origin removal, offline locked install, deny-network native rebuild/load, source independence, both route orders, 14-row status-zero workloads, byte-identical inner results, final tracked cleanliness, and full tests reproduce. |
| AC8 | **PASS — judgment complete; publication pending** | Builder head is immutable, sole-parent, and migration-record-only; record/target bindings reproduce; authority/install remain false. The orchestrator must still publish this judgment as the required one-path detached child under the exact lease. |

## Scratch-HOME and Draft-07 portability judgment

The sixth rejection is closed:

- The committed schema declares exact absolute identity `https://echo-loop.invalid/provenance/edge-record.v1.schema.json`.
- Validation launches `/usr/bin/arch -arm64 /usr/local/bin/python3 -I -B -X utf8` with newly allocated scratch HOME/TMPDIR, ignored stdin, a mode-0600 external payload, an explicit minimal environment, a 30-second timeout, and unconditional cleanup.
- User-site selection, `PYTHONPATH`, `PYTHONHOME`, proxy variables, and ambient shell/Python state are not inherited.
- The accepted implementation resolves Python 3.10.7 and system `jsonschema` 4.16.0 from `/Library/Frameworks/Python.framework/Versions/3.10/lib/python3.10/site-packages/jsonschema/__init__.py`.
- `Draft7Validator(Draft7Validator.META_SCHEMA, format_checker=FormatChecker())` deterministically classifies malformed regex as `invalid_schema` with `regex`; a valid rejecting schema remains `validation_error`.
- The exact committed record validates under scratch HOME and with fake `jsonschema` packages planted in both user site and inherited `PYTHONPATH`.
- Four consecutive non-writing source-plan checks preserved record/schema bytes, mtimes, blobs, and fixed point.

## Drift findings

No blocking drift was found.

- The Project_echo builder commit changes exactly the migration record.
- The accepted target delta from `c8ed1b01435bf0cb9dbf1ff6eec4c42a5202082b` to `e945e33c498b5bb5689e30eb70952b688a6347df` changes exactly five paths: edge record, edge schema, Draft-07 wrapper, source-plan tests, and route-order test.
- That target delta is 199 insertions and 74 deletions and contains no watcher, coord, dependency, product, context, history, authority, installation, release, or maturity change.
- Target path and content scans found no forbidden product/context/history lane.
- The target remains an internal orchestration asset. It does not become the commercial Team product or a client deliverable.

## Design-choice judgments

- **Stand:** absolute reserved schema identity plus isolated system `jsonschema` is a sufficient local-host closure without adding a new dependency.
- **Stand:** explicit Draft-07 meta-validation with `FormatChecker()` correctly stabilizes malformed-regex behavior across the accepted system version.
- **Stand:** direct→npm and npm→direct are both exercised, with route-specific launch records kept outside the invariant inner projection.
- **Stand:** final tracked cleanliness uses exact-empty `git status --porcelain=v1 --untracked-files=no` at the manifest tail. This is stronger for worktree cleanliness than the former recursive `diff-tree` proxy, whose false-green behavior is regression-tested.
- **Stand:** watcher child-owned registration/completion CASes, sentinel-backed leaderless recovery, STOP/reinspect/CONT identity handling, and owner/fence-guarded transitions preserve AC5.
- **Stand:** coord’s deterministic publication protocol makes no external exactly-once claim and preserves the requested crash/retry boundary.
- **Stand:** offline install/native rebuild is a separate environment-bound proof while the route-invariant source-independence row remains reproducible across scratch roots.

## Bugs and risks

No merge-blocking bug remains.

- The validator and native rebuild remain intentionally bound to the accepted local Node/Python/macOS toolchain. That is appropriate for this local `DEV` extraction and is not evidence of client portability or installation readiness.
- Route-specific record hashes differ between builder and neutral runs because they bind launcher/cwd/output context. The invariant four-route inner bytes are identical, as required.
- The judgment session’s additional live endpoint probe could not resolve `github.com` inside its restricted network sandbox. The neutral executor supplied successful strict pre/post probes at the exact endpoint/ref. Publication must nevertheless fail closed on a fresh orchestrator-side probe; stale evidence never licenses the push.

## `EXTRACTION-STATUS.md` disposition

**NONBLOCKING FOLLOW-UP — not an acceptance defect, but not irrelevant.**

The tracked file is blob `8b79a28fcd67d372e2b972646fb768b05b0b4416`, 3,372 bytes, SHA-256 `e16b695bd4c07cc09a2e5f7649cf1b0fe18e43da10bcb9f67fd4f223ea2e9207`. It was last changed at commit `8ad7c873d831153ddc25772640720895820515f8`, 30 target commits before the accepted HEAD.

Its “61 tests,” “59 runtime edges,” and absent watcher-fixture prose are historical and no longer describe the accepted tree. The accepted tree proves 171 tests, 646 edges, and contains/passes those watcher fixtures.

This does not block acceptance because:

- the item does not name this prose file as an authoritative acceptance artifact;
- the immutable migration record, sealed provenance artifacts, executable workload, target HEAD/tree, and neutral evidence are current and exact;
- the stale statements undercount current proof and do not weaken or bypass a gate;
- its safety-critical posture remains conservative and correct: UNACCEPTED before publication, not installed, no remote, with Project_echo authoritative;
- it is not consumed by runtime, verifier, watcher, coord, installation, authority, or maturity logic.

Do not alter the accepted target inline: that would create a new target HEAD/tree and invalidate the exact reviewed binding. If the file is retained in a later deliberately rebound target version, refresh it or label it explicitly as an extraction-time snapshot and regenerate the corresponding provenance/review bindings.

## Merge-conflict preview

The merge base of handoff main and builder head is `84c15504a55d65c093a845b335748f2c58250dd1`.

At handoff `a50f6f0a16acba9333db32612b4b74cfb92b7b80`, main contains neither migration record. The feature history adds the migration record and sixth-review record; the forthcoming review child changes only the review-record path.

Classic three-tree `merge-tree` reports the two migration paths as feature-side additions, with no conflict markers and no changed-in-both path. The current handoff worktree was clean and `+0/-0` against upstream. The preview is clean, subject to normal revalidation if main advances before merge.

Founder checkpoints remain mandatory for substantive conflict resolution and the eventual push to `main`.

## Test counts and result hashes observed

- Full neutral Vitest: **24/24 files, 171/171 tests passed**, 577.23s.
- Focused source-plan: **48/48 passed**.
- Focused watcher: **7 files, 53/53 passed**.
- Focused review queue plus verification cleanliness: **4 files, 12/12 passed**.
- Focused coord: **5 files, 28/28 passed**.
- Disposable workflow: **4/4 passed**.
- Focused source independence: **1/1 passed**; the complete suite repeated it.
- Typecheck, lint over 46 source files, provenance, dependencies, skills, `npm ls --all`, strict fsck, topology, modes, and filesystem equality all passed.
- Dependencies: 5 declared; 132 locked; no root drift.
- Skills: 13 ported skills byte-identical.
- Provenance: 76 byte-identical ports of 148 inventory rows.

All four 3,049-byte inner results are byte-identical at SHA-256:

`84aa6bad2081be452470a0db2fab11d463f479f290f3c46737ad60fa3987944f`

Neutral route-record SHA-256 values:

| Order/route | SHA-256 |
|---|---|
| direct first | `8c90b57342be1e737c5ac1bfd32bc0f7ea61cc5d97ffe9ff1e3d4a939aa6f330` |
| npm second | `65370291db469a68f9f92a0b5c9c1bde8a104eaf75da857693ae33a1fd5f314f` |
| npm first | `7949f400490717efd07ecf3bc42e00b6de9fa0bed6146a890178e6b9e58cab74` |
| direct second | `f3cff8d6d6535ce1e6186b2bad3939c68744df9e92d9a79180b8b80b53dca552` |

Builder-record route hashes were respectively `0d1ee2b93ce479b61bb1ba379e1e2c29b2a93d919a45bf395d02ab9a4420ac2a`, `c0095e584c4a845b23c7b59ed26f3156d2e091816553c5915e623a4da9689e52`, `b4b4d9a30a18dc36ca93e079a69a519b31362dcb4307c765872a7f9c29226982`, and `cc6ee0250a2ed834cbfe831ff5debfdc72beca80fa45e7506e402dc41b3eca63`; route-specific variation is expected while the inner hash remains invariant.

Neutral offline-install result hashes:

- focused: `ebd219379ac34db022cbe11b388cd1afc44d139c8157246536afdbac73281041`
- complete-suite repetition: `0f2218fe4e87e1965ec0d8aebf1f0f7b9704b1b401a92e6b72dfe2f84eb9ac5e`

Both bind the accepted HEAD, private clone, denied network, offline locked install, named `better-sqlite3` rebuild, native load, origin removal, and passing verdict.

## Fixups and follow-ups

- **Required pre-merge fixups:** none.
- **Merge disposition:** merge as-is after successful review-child publication.
- **Nonblocking follow-up:** refresh or explicitly historicize `EXTRACTION-STATUS.md` only in a future target version whose new HEAD/tree and provenance are deliberately rebound.
- Do not install, publish the target, create a target remote, change launchd/user skills, transfer authority, or advance maturity as part of this merge.

## Publication instructions and boundary

Publication has not happened in this judgment session.

The orchestrator must:

1. Create a fresh detached Project_echo worktree at immutable builder head `e2ccdf9a22eb272bdb608bf0a86a5a7d119cc915`, never attaching the builder-owned branch.
2. Write exactly `raw/internal/migrations/2026-07-13-134-echo-loop-review.md` with this record. The resulting child must have the builder head as its sole parent and exactly one changed path.
3. Keep the item’s `head_sha` at the immutable builder head. Learn the review-child OID from the created commit and later from the full remote ref; no review-child OID belongs in its own tree.
4. Fail closed if shared repository configuration exposes any `url.*.insteadOf`, `url.*.pushInsteadOf`, `remote.*.pushurl`, `include.path`, or `includeIf.*.path`.
5. Under absolute, config-isolated Git, strictly probe:

   `/usr/local/bin/git ls-remote https://github.com/zhenye0616/ECHO.git refs/heads/agent/134-echo-loop`

   The parser must obtain exactly one valid row for the exact ref, and its OID must equal `e2ccdf9a22eb272bdb608bf0a86a5a7d119cc915`.
6. Push only the explicit child OID to the full ref using:

   `/usr/local/bin/git push --porcelain --force-with-lease=refs/heads/agent/134-echo-loop:e2ccdf9a22eb272bdb608bf0a86a5a7d119cc915 https://github.com/zhenye0616/ECHO.git <review-child-oid>:refs/heads/agent/134-echo-loop`

7. Re-probe the literal endpoint/ref. Remote-equals-child is success. Any missing, malformed, duplicate, unreachable, expected-old, or other-OID result stops publication.
8. After an ambiguous push exit, follow AC8’s durable run-log path on `main`, recording expected-old, child, observed-or-`unknown`, and probe evidence. Do not retry with a generic force, pull, rebase, merge, autostash, or bare remote name.

This feature-branch review publication needs no separate founder authorization. Founder authorization remains required for substantive merge-conflict resolution and the later push to `main`.

## Final authority, installation, and maturity state

- `authority: false`
- `installed: false`
- maturity: `DEV`
- target remote: none
- target publication/cutover: none
- active authority: Project_echo
- commercial/product authority: unchanged

Final acceptance state: **ACCEPT — merge as-is after exact review-child publication.** Passing proves only the reviewed local orchestration split; it does not install, release, qualify, cut over, or advance maturity.
