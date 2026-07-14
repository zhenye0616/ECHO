# Independent AC8 fresh review — echo-brain remediation (item 133)

**Verdict: REJECT**

This fresh judgment supersedes the prior ACCEPT record published at
`f92af1db90fd6fb911243deb408a1ed760c3b249`. The exact newly committed
arbitrary-RHS regression is fail-closed, but the same executable provenance can still
pass through a scope-blind same-name literal binding. AC2, AC5, and AC7 therefore remain
unmet at the accepted target.

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, fresh implementation-review session
  `/root/fresh_review_133`, completed `2026-07-14T21:51:15Z`.
- **Independence:** this reviewer is not remediation builder `codex-builder-133`, original
  builder `fable-builder-133`, or the author/session of the superseded ACCEPT record.
- This reviewer personally executed the write-heavy R1 mechanics from fresh private,
  configuration-isolated scratch; no builder evidence or counts were trusted.
- The accepted target, current `main` checkout, and builder worktree were strictly read-only.
  The only durable write is this review record in a fresh detached Project_echo worktree.
- No ECHO MCP call was made. No task-state pointer was read or written.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-133-local-echo-brain-source-extraction` |
| Sealed handoff path | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.md` |
| Handoff / spec commit | `0eced4c26e30ea6b19aef396185810a6bd58369e` |
| Handoff blob / bytes / SHA-256 | `d892ca802c732ef10a3f4fc5021c319d2cfea60a`; 33,749 bytes; `85d3bd955fe5d6ae191992af5364ef4c14e508b207d52277064cac11996b3540` |
| Current redo sidecar | `backlog/pending_review/2026-07-13-133-local-echo-brain-source-extraction.review.md` at `a76ac9f7f3089cf94efe837375399cfaaadc4b54` |
| Redo-sidecar blob / bytes / SHA-256 | `51b1ae33ccf0520cb9d5f70e82c164ab0b91e8c0`; 2,273 bytes; `e648ed49867e3dfa393f5506714ff8a1c0fbe5504fa80ea9c11318cc743a18fa` |
| `ready_content_sha` | `832be81341f2c523fd42918206774ec8a51f54de653a323ad56d612e0ea47748` |
| Requested-reviewer roster | `["codex", "codex-ops"]`; this reviewer is a member |
| Immutable builder head / tree | `b62d160c6deeb77f528e58e0ef49090de7fac72d` / `821d287721030560656099cb7daf7a2252046eb5` |
| Builder-head sole parent | `f92af1db90fd6fb911243deb408a1ed760c3b249` |
| Migration-record blob / bytes / SHA-256 | `f19e732ec98284bd9eb476c7fc82322d24db5913`; 37,059 bytes; `527de18b5d1650a8be5abcd3ebe0a4a12101e44dc4b126d75e6bc7fadf6f97ae` |
| Superseded review blob / bytes / SHA-256 | `a9399ffebd0f08dd8817e0865bab0c6454b35440`; 15,123 bytes; `3cd9e6ac5b1c405de580e9e03376966c6bc12b2caf3994d147647a228f26ed12` |
| Pinned source SHA | `2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-brain`; `migration/2026-07-13-133` |
| Accepted target HEAD / tree | `957ad4680f6c67d15fb3dfa0941b52c2ab9c3110` / `0a34ef4aa27ca460b0697773c78a2281ff534f31` |
| Publication ref / literal endpoint | `refs/heads/agent/133-echo-brain`; `https://github.com/zhenye0616/ECHO.git` |
| Authority / maturity | `authority:false`; `maturity:DEV` |

## Ground-truth and drift audit

- Pre/post shared-target audits matched exactly: parentless one-commit history, one local branch,
  no remote, clean 57-file worktree, zero filesystem/tracked symlinks, zero gitlinks, no
  `node_modules`, `.DS_Store`, or `package-lock.json`, empty
  `git fsck --full --no-reflogs --unreachable`, and 78 all-objects equal 78 reachable objects.
- Target HEAD/tree, refs, config, index metadata, object set, and no-follow disk-versus-HEAD
  enumeration were unchanged after all review commands.
- A fresh clone used the sanitized AC1 Git envelope, empty template/hooks directories,
  `clone --no-local --no-hardlinks --no-checkout`, detached checkout of the accepted OID,
  and removal of `origin`. It was clean with no remote, alternate, promisor, replace, shallow,
  graft, symlink, gitlink, or unreachable-object state.
- Baseline candidate content hashes, the three changed blob OIDs, and the 57-path partition
  exactly match the remediation migration record. No scope drift beyond
  `tools/check-dependencies.mjs`, `tests/migration/dependency-set.test.ts`, and regenerated
  `provenance/source-extraction.v1.json` was observed.

## Rejection finding — scope-blind executable provenance

**Severity: HIGH.**

The exact committed regression is now rejected:

```js
const attackerControlled = [process.env.SNEAKY, []];
const [command, args] = attackerControlled;
spawnSync(command, args);
```

In an independently committed disposable clone,
`node tools/check-dependencies.mjs` exited 1 with:

```text
computed spawn command 'command' in tools/fixture-arbitrary-rhs.mjs
(not a declared computed_command_owner)
```

However this same-class fixture passed:

```js
import { spawnSync } from 'node:child_process';

const command = 'git';
{
  const attackerControlled = [process.env.SNEAKY, []];
  const [command, args] = attackerControlled;
  spawnSync(command, args);
}
```

After committing that fixture on the exact candidate in a separate disposable clone,
`node tools/check-dependencies.mjs` exited **0** with `"ok": true` and `"errors": []`.

Root cause: `tools/check-dependencies.mjs:152` collects simple literal bindings into one
file-global `constStrings` map, and lines 162–170 authorize any same-named spawn token without
scope, shadowing, or mutation analysis. The unrelated outer `command = 'git'` therefore
authorizes the inner attacker-controlled destructured `command`. The added test proves only
one syntax instance; it does not prove the sealed fail-closed invariant.

Impact: the checker can still omit a computed executable edge while reporting a complete
helper/CLI partition. Baseline checks, lifecycle reproducibility, and green committed tests
cannot cure that semantic enforcement failure. AC2's exhaustive dependency partition, AC5's
listed-executable contract, and AC7's fail-closed reviewer battery are not satisfied.

## R1 command results

| Check | Independently observed result |
|---|---|
| Node / npm / Git | `22.22.1` / `10.9.4` / `2.37.3` |
| Toolchain roots | TypeScript `5.9.2`, Vitest `2.1.9`, ESLint `9.18.0`, typescript-eslint `8.20.0`, `@types/node@22.10.5`, `@types/better-sqlite3@7.6.11`; all six registry integrities matched the manifest |
| Scratch lint config | SHA-256 `eb0562e63321f18f5ded9edfbb5fcb0c2058054455bccfb7458030c104b4a84c`; exact recorded bytes |
| Dependency checker | baseline exit 0, `ok:true`, 43 locked packages; exact fixture exit 1; scope-shadow fixture exit 0 (blocking) |
| Boundary checker | exit 0, 23-source closure, external packages exactly `ajv` and `better-sqlite3` |
| Provenance checker | exit 0, 56 partition rows, exact 21 target-only paths |
| Operator audit | `PASS`, zero errors, source tree 2,847, target tree 57, partition 56, target-only 21; output SHA-256 `ec19e08a89650d278a788ade116b9a3a4087b37b5b73fd32570d07f87ed70a96` |
| Runtime lock/toolchain cross-check | 43/43 version+integrity rows matched; sole lifecycle hook `better-sqlite3@12.10.0 install` matched |
| Typecheck | exit 0, no diagnostics |
| Lint | exit 0, zero findings |
| Target suite | 5 files passed; 25/25 tests passed, including 14/14 dependency-partition tests and the exact arbitrary-RHS test |
| Gitleaks | 8.30.1; one commit / about 392 KB; no leaks |
| Clone object/filesystem audit | clean; fsck empty; 78/78 objects; 57/57 no-follow files; zero remotes/symlinks/gitlinks/residue |
| Shared target pre/post | unchanged at `957ad468…` / `0a34ef4a…`; 78/78 objects; 57/57 files |

The formal R1 lifecycle used a new sanitized clone, distinct offline cache and absent outputs,
strict `env -i`, umask 0022, accepted commit time, pinned headers, poisoned proxies, and
`sandbox-exec` deny-network. DNS and direct-IP probes failed before/after every phase; the
loopback control accepted outside and was denied inside. On its first formal execution,
offline `npm ci`, build+pack, lint, clean-prefix install, `validate-config`, and `selftest`
all passed. The smokes returned local/APFS, `maturity:"DEV"`,
`wedge_executed:false`, and pending brain adapter.

A preliminary install probe before the formal run failed `ENOTCACHED` because the reviewer's
initial cache fill omitted package packuments. No target byte changed. The reviewer enriched a
new cache online with `--ignore-scripts`, discarded that preliminary clone/output, and began
the fresh formal R1 above. This is disclosed as harness setup evidence, not a candidate defect.

## R1 artifact tuple

| Field | Builder B0/B1/B2 | Fresh reviewer R1 | Result |
|---|---|---|---|
| Target HEAD | `957ad4680f6c67d15fb3dfa0941b52c2ab9c3110` | same | match |
| Target tree | `0a34ef4aa27ca460b0697773c78a2281ff534f31` | same | match |
| Tarball SHA-256 | `b7708d8f195662a9180347ea0a52e6440af3b572fa2a6248c61e146d65f26e8b` | same | match |
| Lock SHA-256 | `9ffc39fa013a67517d95399c80759a4fd359ce1ab1ccc5ee0e957504796ab296` | same | match |
| Ordered members | 27 | 27 | match |
| Canonical manifest digest | `f868ad68125b2d0943f98793419784ba7399357eaf3ecd13f770a55d8f25cc24` | same | match |

## Design-choice judgments

- Founder adjudication #1 (schema committed at the AC5 path and staged at the byte-immutable
  runtime path; eight product tests retained as parity leaves) is accepted for this DEV split.
- Founder adjudication #3's sole semantic `engines.npm="10.9.4"` transform and uncommitted
  scratch-config lint are reproduced and accepted.
- The three whole-file `computed_command_owner` exceptions remain a reviewed trust boundary.
  Their current contents were inspected and do not add a separate blocker; this verdict is about
  non-owner scope confusion that the checker claims to reject.
- The TypeScript/typescript-eslint peer-range mismatch remains qualification debt, not the
  rejection reason for this local DEV split.

## Merge-conflict preview

The merge base is `4d85b6c3f0d76c19926d89e66e975aaf77e80311`. The feature contributes
only the item-133 migration and review records relative to that base. A three-way
`git merge-tree` against current `main` produced no conflict markers or both-modified paths.
If the item is re-reviewed, preserve current-main backlog/task-state/index/run-log/sidecar state;
do not use a misleading two-dot branch replacement.

## Required fixups before another review

1. Replace the file-global name map with scope- and mutation-correct analysis, or fail closed on
   every nonliteral executable token outside the three explicit owners.
2. Commit the exact same-name shadowing fixture above as a fail-closed regression, alongside the
   already-added direct arbitrary-RHS test.
3. Produce a new accepted target root OID/tree, regenerate extraction provenance and the
   Project_echo migration record, and rerun B0/B1/B2 plus fresh independent R1.
4. Publish a new immutable builder head and independent sole-parent review child. Do not advance
   authority or maturity.

## Final verdict

**REJECT.** The candidate is reproducible and clean, and the fresh R1 tuple matches B0/B1/B2,
but the command-edge checker remains fail-open for a same-class arbitrary-RHS shadowing case.
This review proves no authority transfer, cutover, install authorization, publication, release,
or maturity advancement. The target remains `authority:false`, `maturity:DEV`.
