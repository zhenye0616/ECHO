# Independent AC8 fresh review — echo-brain remediation 2 (item 133)

**Verdict: APPROVE — merge as-is**

This fresh independent judgment supersedes the REJECT record published at
`1caf83fc63c83f044a2f0d2608a85bcf4759bbcc`. The accepted candidate removes
file-global name-based executable authorization, fails closed on nonliteral
commands outside the three reviewed computed-command owners, and commits the
required shadowing, reassignment, aliased-import, and namespace-member
regressions. Static checks, the full target suite, and an independently operated
R1 lifecycle all pass at the exact accepted target.

## Reviewer identity and independence

- **Reviewer role:** `codex-ops`, fresh Codex review session
  `/root/fresh_review_133_r2`, completed 2026-07-14T23:05:09Z.
- **Independence:** this reviewer is not remediation builder
  `/root/remediate_133_r2` / `codex-builder-133`, original builder
  `fable-builder-133`, or the author/session of the superseded rejection.
- The reviewer read no `backlog/task-state/` pointer and made no ECHO MCP call.
- All write-heavy verification ran in fresh private clones and scratch outside
  the accepted target, builder worktree, and shared `main` checkout.
- The accepted target and shared target checkout were read-only. The only
  durable write is this review record in a fresh detached Project_echo
  worktree at the immutable builder head.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed handoff path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Handoff commit | `5b122b0c82053e4814508ed1fa7abdbcfe97a384` |
| Handoff blob / bytes / SHA-256 | `1a9599ad6417a67543cdbad5f597349f16008986`; 24,323 bytes; `15d7597c8662e6a370e14d08aa567638a6cb9b75aac75ebab5b93bd706742c79` |
| Current redo sidecar commit | `b292d693130edd050e033ec02d7ca9467a1ce2e3` |
| Redo-sidecar blob / bytes / SHA-256 | `c61ebfae8a90431331abaf46c6f6f6f5c08e057c`; 1,871 bytes; `6141db878659a381d0b033955088af01d1924ab35e68cddd0977f84d6e161180` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer acts as the independent `codex-ops` member |
| Immutable builder head / tree | `08f0441703a4b44e82dcea7e456129c4507d3cab` / `2e65030c3a1748fb983adee3555ab9f7014e05f9` |
| Builder-head sole parent | `1caf83fc63c83f044a2f0d2608a85bcf4759bbcc` |
| Builder-head tree delta | exactly `raw/internal/migrations/2026-07-13-133-echo-brain.md` |
| Migration-record blob / bytes / SHA-256 | `bdbdcbc5a0e2eee25add75dce444019e0562a50a`; 45,145 bytes; `15184f4b6fbdd6f7ece27b04d994adbe933f6fad7d8d135ac4707192c57a55b7` |
| Superseded rejection blob / SHA-256 | `02d14cead9fc268bb98012aaf7570386c648c59d`; `82d8ca117de8f8c1b7ed42638a0ae51b75d613dd2633d2610f0fa71e727faa0f` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| Accepted target HEAD / tree | `41c28171c64710b3ad23392a2606d75cfe8e7b2c` / `5691ab527de8eb622ed1d333ed867a2191afdf8a` |
| Publication ref / literal endpoint | `refs/heads/agent/133-echo-brain`; `https://github.com/zhenye0616/ECHO.git` |
| Authority / maturity | `authority:false`; `maturity:DEV` |

## Feature and target ground truth

- The builder head is a sole-parent child of the prior immutable rejection and
  changes only the refreshed migration record. No code or backlog state is
  smuggled into the Project_echo feature commit.
- The target is one parentless root commit with one local branch and no remote.
  Pre/post audits found a clean 57-file worktree, zero filesystem/tracked
  symlinks, zero gitlinks, no `node_modules`, `.DS_Store`, or
  `package-lock.json`, empty `git fsck --full --no-reflogs --unreachable`, and
  78 all-objects exactly equal to 78 reachable objects.
- A fresh reviewer clone used the sanitized AC1 Git envelope, empty
  template/hooks directories, `clone --no-local --no-hardlinks --no-checkout`,
  detached checkout of the exact target OID, and removal of `origin`. It ended
  clean with no remote, alternate, promisor, replace, shallow, graft, symlink,
  gitlink, unreachable-object, or residue state.
- The shared target remained byte-for-byte unchanged at the exact HEAD/tree
  after every review command.

## Prior blocker closure

`tools/check-dependencies.mjs` no longer authorizes a command token from a
file-global literal-name map. Outside these three reviewed whole-file owners,
every recognized nonliteral executable expression fails closed:

1. `src/product/spawn-sanitized-child.ts`
2. `tools/verify-artifact.mjs`
3. `tools/product/toolchain-preflight.mjs`

The scanner retains direct-literal and literal-tuple classification and
recognizes canonical child-process calls, aliased named imports, namespace
members, named/namespace `require` bindings, and dot/literal-bracket member
calls. The committed dependency suite passed all 18 tests, including:

- the exact outer-literal / inner attacker-controlled same-name shadow;
- a literal-initialized `let` later reassigned;
- an aliased named `child_process` import;
- a `child_process` namespace member;
- arbitrary-RHS and literal-destructure cases; and
- exact owner-list and helper-row omission checks.

This satisfies the prior sidecar's bounded fixups without adding a new owner or
executable.

## Static, provenance, and security results

| Check | Independently observed result |
|---|---|
| Node / npm / Git | `22.22.1` / `10.9.4` / `2.37.3` |
| Toolchain | TypeScript `5.9.2`, Vitest `2.1.9`, ESLint `9.18.0`, typescript-eslint `8.20.0`, `@types/node@22.10.5`, `@types/better-sqlite3@7.6.11`; all six registry integrities match the committed manifest |
| Scratch lint config | exact recorded bytes; SHA-256 `eb0562e63321f18f5ded9edfbb5fcb0c2058054455bccfb7458030c104b4a84c` |
| Provenance checker | exit 0, `ok:true`, 56-row partition, exact 21 target-only paths |
| Boundary checker | exit 0, 23-source closure, external packages exactly `ajv` and `better-sqlite3` |
| Dependency checker | exit 0, `ok:true`, 43 locked packages, expected helper/CLI command set, exactly three computed owners |
| Operator audit | `PASS`, zero errors, source tree 2,847, target tree 57, partition 56, target-only 21; output SHA-256 `ec19e08a89650d278a788ade116b9a3a4087b37b5b73fd32570d07f87ed70a96` |
| Lock/toolchain cross-check | 43/43 registry rows have version/resolution/integrity/license metadata; sole lifecycle hook is `better-sqlite3@12.10.0 install` |
| Focused regression suite | 1 file passed; 18/18 tests |
| Full target suite | 5 files passed; 29/29 tests |
| Typecheck / lint | pinned TypeScript compile passed with no diagnostics; exact scratch-config ESLint invocation passed with zero findings |
| Gitleaks | 8.30.1; one commit / about 397 KB; no leaks |
| Reviewer clone post-audit | clean; fsck empty; 57/57 files; 78/78 objects; zero remotes/symlinks/gitlinks/residue |
| Shared target post-audit | unchanged at `41c28171…` / `5691ab52…`; clean; fsck empty; 57/57 files; 78/78 objects |

Current content SHA-256 values independently match the migration record:

| Path | SHA-256 |
|---|---|
| `package.json` | `e7dd03dfce75c3ae4053541bb813b17f228dc6e15cec32aa268d0adbf3320736` |
| `npm-shrinkwrap.json` | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` |
| `README.md` | `ae9a62af323194c09124fa2023fd66420488f8f8788646938df65b30b4de8e4f` |
| `provenance/extraction-policy.v1.json` | `771a59ed73be2221ef10d1814beeb6d8d5cc06b937186407332f3cde67072945` |
| `provenance/source-plan.v1.json` | `3874b30f28955ff07850b9c841a35e76a1241cb82ba38191691335f9142840ab` |
| `provenance/source-extraction.v1.json` | `221dc36f859cc9c1aeb5fde0ee591024bb4c9bc5cabd9fd7f5d305db5f722009` |
| `provenance/test-parity.v1.json` | `97be8b6a5a8e2a3bb1519a6198c219e09d7474ecbcd017227100cc2b57d491cc` |
| `provenance/dependency-toolchain.v1.json` | `5990cfa19f036b7defebd6764052cb341b98ce46608d2c977aee2fef499d6ef2` |

## Fresh reviewer R1 lifecycle

The reviewer provisioned a fresh exact-version toolchain and a fresh
content-addressed cache. The online cache-fill phase ran with
`--ignore-scripts`; all lifecycle code ran later offline. R1 then ran from the
fresh sanitized clone with a distinct cache, copied exact Node 22.22.1 headers,
strict `env -i`, isolated HOME/XDG/TMP, umask 0022, poisoned proxies, and
`sandbox-exec -p '(version 1) (allow default) (deny network*)'`.

All six lifecycle phases passed:

1. offline `npm ci`, including source-built `better-sqlite3`;
2. deterministic TypeScript build and pack;
3. exact scratch-config lint;
4. clean-prefix offline tarball install;
5. installed `validate-config`; and
6. installed `selftest`.

DNS and direct-IP probes were denied before and after every phase: 24/24
successful denial checks. A local loopback listener accepted the outside
control connection and denied the identical connector inside the profile.
`validate-config` reported local/APFS, `maturity:"DEV"`, and
`wedge_executed:false`; `selftest` reported the brain adapter pending,
`maturity:"DEV"`, and `wedge_executed:false`.

Three reviewer-harness setup errors are disclosed. An initial cache-fill command
was invoked from the wrapper directory and npm exited `EUSAGE` before install.
The first R1 launcher used the same `/dev/null` for npm user/global config and
exited before dependency work; the next launcher omitted `ECHO_TSC` and stopped
at the build preflight after a successful offline install. The final canonical
run reset reviewer `node_modules`, HOME/XDG/TMP, output, prefix, and state and
reran from phase one through all six phases. No target byte changed in any
setup attempt.

## Artifact identity

| Field | Builder B0/B1/B2 | Fresh reviewer R1 | Result |
|---|---|---|---|
| Target HEAD | `41c28171c64710b3ad23392a2606d75cfe8e7b2c` | same | match |
| Target tree | `5691ab527de8eb622ed1d333ed867a2191afdf8a` | same | match |
| Tarball SHA-256 | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | same | match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | same | match |
| Ordered members | 27 | 27 | match |
| Canonical manifest digest | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | same | match |

## Design-choice judgments

- The founder-adjudicated package npm-pin transform and schema staging
  reconciliation remain accepted for this local DEV split.
- The byte-bound, uncommitted scratch lint configuration is independently
  reproduced and accepted.
- The three whole-file computed-command owners remain a narrow reviewed trust
  boundary; no owner was added in this remediation.
- The TypeScript/typescript-eslint peer-range mismatch remains qualification
  debt, not a blocker for this local `authority:false`, `maturity:DEV` split.
- Consolidating superseded identity sections in the long migration record is
  editorial follow-up, not an acceptance blocker.

## Merge-conflict preview

Against `origin/main` `5b122b0c82053e4814508ed1fa7abdbcfe97a384`,
the merge base is `4d85b6c3f0d76c19926d89e66e975aaf77e80311`.
The feature contributes only the item-133 migration and review records from
that base. A three-way `git merge-tree` produced no conflict markers,
both-modified paths, or overlap with current-main paths.

## Final verdict

**APPROVE — merge as-is.** All item-133 acceptance evidence required for this
local source split is green at the exact builder and target identities. No
pre-merge fixup is required. This approval proves only a reproducible local DEV
split; it does not transfer authority, authorize installation/cutover/release,
or advance maturity beyond DEV.
