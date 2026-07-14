# Independent AC8 third judgment — echo-loop local source extraction (item 134)

**Verdict: REJECT**

## Reviewer identity and independence

- **Reviewer:** `codex-ops` binding, independent content-only third judgment completed `2026-07-14T21:12:55Z`.
- **Independence:** This reviewer is neither original builder `fable-builder-134` nor successor builder `fable-builder-134b`, did not create or modify the target, and is independent of the neutral reviewer-side executor.
- **Supersession:** This judgment supersedes the second `codex-ops` REJECT at `c2a33138ef006739d97b70a724b7154a8b935e5e` while preserving the first REJECT at `ca82e5237d6212ae99fc9ae4ef3dd2451d760210` in the cumulative disposition.
- **Option B split:** A neutral executor ran the deterministic reviewer-side commands and captured evidence; this `codex-ops` session independently inspected the evidence, accepted target, implementation, sealed contract, and both prior judgments and authored the verdict; the orchestrating wrapper alone owns publication.
- The executor, verdict author, original builder, and successor builder are distinct parties. No builder self-certification occurred.
- This session performed read-only inspection only. It made no file writes, Git mutations, commits, or pushes.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-134-local-echo-loop-source-extraction` |
| Sealed item path | `backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md` |
| Current sealed item blob / bytes | Git blob `e13b13e53c4070db486d3114e425348b23055195`; 29,018 bytes; SHA-256 `562552909c9a82a6bcb59a7b9373e3be2acaa4a507123d91ba89fc0df401ecf5` |
| Current pending-review handoff | `5fd7e099d0f88d09bb0982765caac05067f32b78` |
| `ready_content_sha` | `135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086` |
| Requested reviewers | `["codex", "codex-ops"]`; this reviewer is a roster member |
| Original / successor builders | `fable-builder-134` / `fable-builder-134b` |
| Founder-authorized A–E resume | Commit `84080bf0d70fc338b1ba686309a8167860969e8f`; tree `2cc7163d40687f0bf76f760adc0b555361936ce5`; sole parent `fb616b924add474d17d28b57b4c1f7e44af96e45` |
| Immutable campaign builder head | `b8e4fe23f53db95b385eec748ce326269f9bf934` |
| Builder-head tree / parent | Tree `4faa9c95424a3f7d953ff982c952f93733b98233`; sole parent `7f89b291bb76086bb011575899a67d54043b1704` |
| First prior REJECT child | `ca82e5237d6212ae99fc9ae4ef3dd2451d760210`; tree `5c79f8326f28fc0dabe81dcb6904164841aa6204`; sole parent `1519a18ed4f1c05344a1ddbd7f102779c8553843`; target `8ad7c873d831153ddc25772640720895820515f8` / tree `1a6043d16aa21009f7e36909f25faad55fbdc850` |
| First prior REJECT record | Git blob `ce8ab04d281e003e5e98dbcc1c40243bd9357a60`; 16,122 bytes; SHA-256 `feda87dc37467810f73ee5226c9f35d2ac4513e1bbe00f3933aa8ec7fc7e427a` |
| Second prior REJECT child | `c2a33138ef006739d97b70a724b7154a8b935e5e`; tree `bfc625232b92072c4c981e529ee22bef0f778b6c`; sole parent `ee3bc0e9616a2ea9699ad673856518e8ba90744c`; target `2aeb1ede21b16d47f9d11da69f0a3cb10425ddb6` / tree `a56fe5e042fbcfa609918fe7b61c420805421880` |
| Second prior REJECT record | Git blob `120a8d3f350fd5f68ecfb1875449c6a964811241`; 18,349 bytes; SHA-256 `65879e6e2289a896ac441a659ae1e20e59303f14c7120fd6c6c5aa6252c1a2a6` |
| Campaign lineage | `ca82e523` → `ee3bc0e9` → `c2a33138` → `7f89b291` (D/A/B checkpoint) → `b8e4fe23` (C/E close-out) |
| Updated migration record | `raw/internal/migrations/2026-07-13-134-echo-loop.md` at immutable builder head `b8e4fe23f53db95b385eec748ce326269f9bf934` |
| Migration-record blob / bytes | Git blob `037457ed243b6f454e91cfc64821c1bd069bb783`; 11,414 bytes; SHA-256 `320ea0557798b9d991aded20daf8f078a2dcf58325291d80492d55ed8be628be` |
| Pinned source | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |
| Accepted target path / branch | `/Users/zhenye/Desktop/echo-loop`; `migration/2026-07-13-134` |
| Accepted target HEAD / tree | `171fdfc724f74f7cd6d4b8502e03264a517816d9`; tree `8f636631db2160370f051caaba1754ea30cb6d69` |
| Target repository state | 26 linear commits; one branch; no remote; 327 reachable objects; `git fsck --full --strict` exits 0; tracked status empty |
| Sealed source policy | Project_echo blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`; SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| Target policy copy | Same blob OID and SHA-256; byte-identical to the sealed Project_echo object |
| Target authority / installation / maturity | `authority:false`; `installed:false`; local `DEV` candidate only |
| Project_echo publication endpoint / full ref | `https://github.com/zhenye0616/ECHO.git`; `refs/heads/agent/134-echo-loop` |
| Expected-old feature ref value | `b8e4fe23f53db95b385eec748ce326269f9bf934` |
| Executor evidence session | `f96bfcee-3199-472c-adf2-9b7367d03b4d` |
| Evidence directory | `/private/tmp/claude-501/-Users-zhenye-Desktop-Project-echo/f96bfcee-3199-472c-adf2-9b7367d03b4d/scratchpad/r1-evidence-134-rerun2` |
| Rerun summary | `R1-SUMMARY.json`; 13,797 bytes; SHA-256 `d843637d6cb4c4ac79842c8d6a7f7aa81c1890dff5eb3e282fb3e4a12c2873f2` |
| Review request | `codex-ops-judgment-prompt.md`; 3,557 bytes; SHA-256 `2b2a7d5642c4dbdffe28e239ce58c73b0dfea6c511b1ad94113b69f3926c8132` |

## Builder succession

The run log records that `fable-builder-134b` adopted `fable-builder-134`’s clean in-claim checkpoint after the predecessor session exhausted. This was protocol-sanctioned exhaustion recovery: the claim remained continuous and the item never left `claimed/`.

The successor verified the feature worktree at `7f89b291bb76086bb011575899a67d54043b1704` and the target at `171fdfc724f74f7cd6d4b8502e03264a517816d9`, completed the migration record, pushed builder head `b8e4fe23f53db95b385eec748ce326269f9bf934`, and handed the item to `pending_review`.

The succession record is `raw/internal/agent-runs/2026-07-14-2026-07-13-134-local-echo-loop-source-extraction.md` at handoff commit `5fd7e099d0f88d09bb0982765caac05067f32b78`: Git blob `4d411284b1dc7d8a52a7ed6f6a5ca1d45611afd4`; 25,330 bytes; SHA-256 `89768efdb0c5b90b30c43acec89c2d2ffbe24b05903a097c7e1993264d27276a`.

The succession is valid and is not a review finding.

## Third-pass outcomes

| Evidence | Executor result | Independent reviewer determination |
|---|---|---|
| Shared-target pre-audit | `PASS` | Bound HEAD/tree, 26 linear commits, one branch, no remote, 327 reachable objects, fsck exit 0, and clean tracked status reproduce. |
| Source-object and artifact bindings | `PASS` | Sealed-policy type/hash and target byte identity reproduce. All eight artifact OID/SHA pairs and all 18 comparison rows below match. |
| Private clone | `PASS` | Config-free `--no-local --no-hardlinks --no-checkout` clone, detached accepted-OID checkout, origin removal, clean status, no alternates/promisor/replace/shallow state, and fsck exit 0 reproduce. |
| Finding A checker | `PASS` | Two clean `--check` runs exit 0 without writes; scratch regeneration is byte-identical. The initial uncommitted-worktree corruption was correctly irrelevant because the checker reads committed HEAD. Committed record corruption and committed source drift each exit 1. |
| Finding B envelope invariance | `PASS` | Direct route, npm route, and direct route under a second distinct scratch `HOME`/`TMPDIR` all reproduce `eb614a43…`; raw roots are absent from the inner projection. |
| Finding C watcher suite | `9 tests pass`; full suite `22 files / 121 tests` | The implemented group-reaping unit behavior is real, but the suite does not prove the sealed crash/takeover invariant. A crash during the active synchronous child leaves no durable current PGID or termination evidence. Finding C remains open. |
| Finding D source-plan suite | `18 tests pass`; committed record `538 rows / 9 classes` | The checker faithfully reproduces the implementation’s record, but the implementation does not produce the sealed `(path,blob,binding-context-hash)` closure, does not implement required workspace/context resolution, and silently drops several unknown/computed edge forms. Finding D remains open. |
| Offline matrix | `PASS` | Outbound loopback, DNS, and direct-IP controls behave coherently; private clone, offline install, named better-sqlite3 rebuild, and native load pass under network denial. |
| Migration-record inspection | Executor reports complete bindings | Artifact bindings are truthful, but the immutable builder record omits the literal Project_echo publication endpoint/full feature ref required by AC8 and presents placeholder route commands as exact commands. Finding E remains open. |
| Shared-target post-audit | `PASS` | HEAD, tree, object set, branch, no-remote state, fsck result, and clean tracked status remain unchanged. |
| `R1-SUMMARY` | Evidence-only `CLEAN PASS`, zero findings | The raw hashes and command outcomes are accepted. Its semantic acceptance implication is rejected because static implementation inspection demonstrates residual C, D, and E violations outside the executor assertions. |

## Cumulative F1–F5 and A–E dispositions

| Finding | Third-judgment disposition | Evidence |
|---|---|---|
| **F1 — missing task-state and review-queue suites** | **RESOLVED** | Substantive suites exist and the full suite passes 22 files / 121 tests. |
| **F2 — incomplete dual-route workload** | **RESOLVED** | The ordered 14-row roster is present, recursive full-test invocation is separated, and direct/npm inner bytes match. Finding B’s later envelope defect is also repaired. |
| **F3 — missing independent source-seed oracle** | **RESOLVED** | The independent hard-coded raw-object fixture exists and passes without invoking the extraction resolver. |
| **F4 — missing recovery/process-isolation proof** | **PARTIALLY RESOLVED; ACCEPTANCE-BLOCKING** | The five original fixtures and group-reaping unit fixtures exist. The active-child crash/takeover invariant remains unimplemented and untested; see Finding C residual. |
| **F5 — npm launcher/banner not bound** | **RESOLVED** | Route output retains the actual npm outer launcher metadata, banner, and user-agent, while direct-route npm fields are null. |
| **A — stale/self-overwriting edge record** | **RESOLVED** | `--check` is non-writing, detects committed record and closure drift, and reproduces fixed point `d1d0bc61…`. |
| **B — HOME-coupled inner hash** | **RESOLVED** | `<HOME>` and `<TMPDIR>` are tokenized and three independent route/envelope runs reproduce `eb614a43…`. |
| **C — watcher containment/takeover safety** | **PARTIALLY RESOLVED; ACCEPTANCE-BLOCKING** | Group TERM/KILL works in isolation, but the current child’s PGID is persisted only after the synchronous child returns and no durable termination evidence gates takeover. |
| **D — source-plan subset / sealed closure** | **PARTIALLY RESOLVED; ACCEPTANCE-BLOCKING** | More syntaxes and classes are recognized, but source blobs and manifest-context bytes are absent from the fixed point, workspace exports are unresolved, and unknown/computed edge forms can be silently skipped. |
| **E — immutable record bindings** | **PARTIALLY RESOLVED; ACCEPTANCE-BLOCKING** | Artifact/path/clean-state bindings are restored, but the literal Project_echo origin endpoint/full feature ref is absent and the claimed exact route commands still contain placeholders. |

## Bound-hash comparison

| Bound value | Migration record | Reviewer reproduction | Result |
|---|---|---|---|
| Sealed-policy blob OID | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | Match |
| Sealed-policy SHA-256 | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` | Match |
| Target HEAD | `171fdfc724f74f7cd6d4b8502e03264a517816d9` | `171fdfc724f74f7cd6d4b8502e03264a517816d9` | Match |
| Target tree | `8f636631db2160370f051caaba1754ea30cb6d69` | `8f636631db2160370f051caaba1754ea30cb6d69` | Match |
| Edge-record blob OID | `03667a39c3c95c897ee89e1ecf6cf0038856db8f` | `03667a39c3c95c897ee89e1ecf6cf0038856db8f` | Match |
| Edge-record SHA-256 | `5067d2f3a33ab230b2a513929ac94d64833ae1685fb924d3e8aae46320c723fc` | `5067d2f3a33ab230b2a513929ac94d64833ae1685fb924d3e8aae46320c723fc` | Match |
| Edge-record fixed point | `d1d0bc612fa1e914011f714d842bd69d28fe2d323ebc143a547657d7ee345c33` | `d1d0bc612fa1e914011f714d842bd69d28fe2d323ebc143a547657d7ee345c33` | Match |
| Edge-record schema SHA-256 | `30d25c7fe55c27e2b79e06bbf38dbb410ab7e3ebbf3484c8ef8a408ef4429277` | `30d25c7fe55c27e2b79e06bbf38dbb410ab7e3ebbf3484c8ef8a408ef4429277` | Match |
| Watcher-project SHA-256 | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` | Match |
| Verification-workload blob OID | `f5b632170bcd0c8b639d119124a3c962aa80ff52` | `f5b632170bcd0c8b639d119124a3c962aa80ff52` | Match |
| Verification-workload SHA-256 | `be2d600767d88c9f4e057dc2a539ba9f5032fa40dab25495ffd4462902972a33` | `be2d600767d88c9f4e057dc2a539ba9f5032fa40dab25495ffd4462902972a33` | Match |
| Source-seed blob OID | `5278839736a53a82bfce884ea16eac0b254437ed` | `5278839736a53a82bfce884ea16eac0b254437ed` | Match |
| Source-seed SHA-256 | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` | Match |
| `package.json` blob OID | `afaedd015a49f98bf7bb3d154281665879f2aa10` | `afaedd015a49f98bf7bb3d154281665879f2aa10` | Match |
| `package.json` SHA-256 | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` | Match |
| `package-lock.json` blob OID | `b67ca3f905e5c87023198d47edaaf24f725edea2` | `b67ca3f905e5c87023198d47edaaf24f725edea2` | Match |
| `package-lock.json` SHA-256 | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` | Match |
| Dual-route inner-result SHA-256 | `eb614a430ad5355addba076df9a2216e5b903b205c097fba67576fdf868b1483` | `eb614a430ad5355addba076df9a2216e5b903b205c097fba67576fdf868b1483` across direct, npm, and a second scratch envelope | Match |

All 18 bound values reproduce. This proves the identity and internal consistency of the examined candidate and evidence. It does not prove that the source-plan rows constitute the sealed closure or that the watcher satisfies the required crash/takeover semantics.

## Findings and dispositions

### Finding C residual — HIGH — A crash during the active probe or push leaves no durable process-group evidence for takeover

**Disposition: acceptance-blocking; existing Finding C / prior F4 remains open.**

`src/watcher/reaper.ts:36-56` implements group-directed TERM-then-KILL, and `runReaped` correctly attempts to reap a detached group after `spawnSync` returns. The standalone descendant and orphan-group fixtures therefore prove real reaping behavior.

The durable takeover path does not establish the sealed invariant:

- `src/watcher/apply.ts:141-142` calls the synchronous `probeRef` first and persists its PGID only after that call returns.
- `src/watcher/apply.ts:167-171` likewise runs the synchronous push first and persists its PGID only after the push returns.
- If the watcher crashes while either detached child is active, `owner_pgid` remains null or contains a stale PGID from an earlier completed child.
- `src/watcher/apply.ts:102-110` treats null or already-dead `owner_pgid` as sufficient to take over and begin another `attemptPush`, even though the actual prior probe/push group may still survive.
- `src/watcher/state.ts:42` stores only one PGID, not durable `TerminationEvidence`. `probeRef` drops the returned termination evidence, and `applyCandidate` ignores the push’s termination result.
- `src/watcher/state.ts:213-216` updates `owner_pgid` without an owner-token or state predicate, so an old owner returning after takeover can overwrite the new owner’s PGID.
- The takeover fixture at `tests/watcher/containment.test.ts:76-86` installs the already-dead synthetic PGID `2147483646`; it never couples a live prior-owner process group to an expired APPLYING lease. The real orphan group is tested separately.

This violates sealed AC5: every probe/push group must be TERM/KILL-reaped before takeover, and takeover requires termination evidence plus endpoint re-probe. Nine passing containment tests do not close the crash window.

### Finding D residual — HIGH — The fixed point is not the sealed path/blob/context closure and unknown edges remain fail-open

**Disposition: acceptance-blocking; existing Finding D remains open.**

The target now recognizes more syntax classes, but the accepted implementation does not satisfy AC2’s sealed closure:

- `tools/build-source-plan.mjs:29-33` loads and hashes the sealed policy, then discards it with `void policy`; the policy object is never passed to the resolver.
- `tools/lib/source-plan.mjs:52-74` collects `exports`, `bin`, `scripts`, `workspaces`, `baseUrl`, and `references`, but resolution at lines 267-280 consults only package `imports`, tsconfig paths, and dependency lock rows. Workspace exports, package exports, `extends`, base URL, and references have no resolution path.
- A read-only synthetic workspace fixture importing `@acme/foo` from a declared `packages/*` workspace fails with `unknown_edge`, directly contradicting the required workspace-only-alias fixture.
- `contextHash` at lines 77-80 hashes only source path, specifier, edge class, and a constant label. It does not hash canonical manifest/context bytes.
- Edge rows contain the source path but no source blob. The fixed point at lines 342-361 is only SHA-256 over those rows. Of 103 tracked executable code files, only 30 occur as repository-blob targets; 73 executable source blobs are not bound.
- An in-memory change to accepted `tools/build-source-plan.mjs`’s embedded sealed-policy SHA-256 leaves the 538-row fixed point exactly `d1d0bc612fa1e914011f714d842bd69d28fe2d323ebc143a547657d7ee345c33`, despite changing verifier behavior. This disproves the required `(path,blob,binding-context-hash)` closure on the accepted tree.
- Lines 285-325 return null for unresolved file/schema/worker/script/command/exec edges, and line 349 silently skips them. Read-only probes for a missing literal file, computed file read, unknown shell command, and computed executable each produce zero rows without `EdgeReject`, despite sealed `unknown_edges: reject` and `computed_repository_capable_edges: reject`.
- The “sealed edge-class roster” at `tests/migration/source-plan.test.ts:50-101` directly exercises only eight distinct edge classes. It lacks fixtures for dynamic literal import, CommonJS require, schema/template, npm JavaScript CLI, Python script, and worker entry, as well as the required workspace-only alias.

The recorded `d1d0bc61…` value is a true fixed point of this implementation, so Finding A is fixed. It is not the sealed AC2 source closure, so Finding D is not fixed.

### Finding E residual — MEDIUM — The immutable builder record still omits required publication bindings

**Disposition: acceptance-blocking under sealed AC8; existing Finding E remains open.**

The updated migration record truthfully binds the target, artifact OIDs/hashes, fixed point, dual-route result, clean status, no-remote status, and false authority/install state.

It does not record the literal Project_echo publication endpoint `https://github.com/zhenye0616/ECHO.git` or full feature ref `refs/heads/agent/134-echo-loop`, although sealed AC8 requires the push and strict probe to address the literal origin URL recorded in the migration record.

Its claimed exact route commands also use `<dir>` and `<npm-cli>` placeholders instead of the sealed absolute npm launcher and concrete route argv. These omissions cannot be repaired by the matching artifact hashes.

## Final verdict

**Verdict: REJECT.**

All 18 bound hashes and OIDs reproduce. Findings A and B are repaired; F1, F2, F3, and F5 remain resolved. The target is clean, stable, offline-installable, and internally consistent.

The sealed acceptance contract is nevertheless unmet. A watcher crash can leave a live probe/push group unrecorded and permit concurrent takeover; the source-plan fixed point omits source blobs and manifest-context bytes while silently skipping required unknown/computed edges; and the immutable builder record omits the literal publication endpoint required by AC8.

These are residual violations in the existing C, D, and E campaign classes, not a new finding class.

The local split remains rejected at `DEV`. The target remains `authority:false` and `installed:false`. This judgment authorizes no installation, cutover, remote creation, release, maturity advancement, or transfer of authority from Project_echo, which remains the active loop.