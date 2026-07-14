# Independent AC8 fourth judgment — echo-loop local source extraction (item 134)

**Verdict: REJECT — redo before merge.**

The round-two implementation reproduces its declared hashes, tests, offline
lifecycle, and route result. It nevertheless remains acceptance-blocked by two
same-class residuals: the source-plan record is invalid under its own committed
schema and remains fail-open for several executable-edge forms; the watcher
takeover transition does not durably bind termination evidence atomically and
permits stale-owner terminal mutation after takeover.

This is a local `DEV` judgment only:

- `authority: false`
- `installed: false`
- maturity remains `DEV`

## Reviewer identity and independence

- Reviewer: fresh independent `codex-ops` session completed
  `2026-07-14T22:33:35Z`.
- Builder: `fable-builder-134b`; this reviewer did not create the target or
  reuse builder judgments.
- Fresh-eyes discipline: no `backlog/task-state/` pointer was read or written.
- No ECHO MCP call was made.
- Main, the shared feature worktree, and the accepted target remained
  read-only. Installs, builds, outputs, fixture repositories, and mutations
  lived only under `/tmp/echo-review-134.fRzbYv/`.
- Publication is wrapper-independent AC8 publication: this record is the sole
  changed path in a detached child whose sole parent is the immutable builder
  head; the child OID is learned from the literal remote ref, not embedded in
  this tree.

## Bound inputs

| Binding | Value |
|---|---|
| Item | `2026-07-13-134-local-echo-loop-source-extraction` |
| Pending-review handoff / spec commit | `0496acf5a36694f53aeb52aed95f7ae9d8976507` |
| Item blob / bytes / SHA-256 | `33cdcaa2ba72af5d72ff067aa987e7774067edf9`; 29,547 bytes; `6bb90a129c168ea0dd8b989f8f4d6a7ea9b4dddc639566e134f2eaf43ac75f2b` |
| `ready_content_sha` | `135bab0fd87554cc4ff3c052764d98b90debded4056ed8532c2cac0b9ebcb086` |
| Requested reviewers | `["codex", "codex-ops"]`; this binding is requested |
| Immutable builder head | `375bdf694d8bd71bf383b6ae7416d69990ab3092` |
| Builder parent / shape | sole parent `770b101fbc17ac48284a58a4ce9ca1ff60d23c1e` |
| Migration record blob / bytes / SHA-256 | `d65d05970efca060cd3749ad7813132335003ae8`; 12,096 bytes; `babecd62e1a61dca33c7f559583a5679317e015d29f0bc611760934de0ea6984` |
| Publication endpoint / full ref | `https://github.com/zhenye0616/ECHO.git`; `refs/heads/agent/134-echo-loop` |
| Expected-old publication OID | `375bdf694d8bd71bf383b6ae7416d69990ab3092` |
| Target path / branch | `/Users/zhenye/Desktop/echo-loop`; `migration/2026-07-13-134` |
| Target HEAD / tree | `d69c003ae4146140d3d0ee3fe945778781ae5a43`; `ca77fbda46887a4b7e6170029cd5615e2feefad8` |
| Pinned source | `Project_echo@2971310441b69735cbe759293abd8c4d044bf347` |

## Ground-truth audit

- Main was clean at `2e7755a956b29c7ed87b7e0c82e65034c741166a`.
- The shared feature worktree was clean at the immutable builder head. A strict
  literal `ls-remote` returned exactly that OID for the full feature ref.
- Builder head is a commit with exactly one parent, the prior review child
  `770b101f…`.
- Target HEAD/tree matched the bindings; history is 29 linear commits with one
  root and one branch, 355/355 objects reachable, no tags/remotes, no
  alternates/promisor/replace/shallow state, no symlinks/gitlinks, empty tracked
  status, and clean `git fsck --full --strict`.
- The target retained pre-existing ignored local outputs (`node_modules/`,
  `dist/`, `.DS_Store`, and `.verify-*` directories); no reviewer command
  touched them.
- Sealed source-policy blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`
  is a Project_echo blob, hashes to
  `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a`,
  and is byte-identical to the target copy.

## Acceptance status

| AC | Status | Independent evidence |
|---|---|---|
| AC1 | PASS | Exact raw-object identity, ordinary clean/no-remote target, full object closure, and fsck reproduced. |
| AC2 | **FAIL** | The edge record has 585 schema errors and the resolver remains fail-open/ambiguous under six same-class executable-edge fixtures. |
| AC3 | PASS | Coordination suite and native SQLite lifecycle pass; declared canonical/publication behavior tests are green. |
| AC4 | PASS | Provenance/source-independence and tree inspection show orchestration-only closure without Project_echo history/product context. |
| AC5 | **FAIL** | Existing 38 watcher tests pass, but direct state probes expose a crash window between takeover CAS and evidence persistence and an unguarded stale-owner escalation path. |
| AC6 | PASS | Four disposable workflow-loop fixtures pass. |
| AC7 | **FAIL overall** | Exact offline/native and dual-route execution reproduce, but the `source-plan` workload row false-greens an artifact rejected by its own schema, so the verifier is not fail-closed. |
| AC8 | COMPLETE AS REJECTION | Independent exact-object review and immutable one-path child publication are performed; no installation/authority/maturity advance. |

## Reproduced bindings

| Artifact | Blob OID | SHA-256 / result |
|---|---|---|
| `source-policy.v1.json` | `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` | `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a` |
| `edge-record.v1.json` | `3a7bf876d352f7c3c4762afe97fdcb72c70c1661` | `5e49ae70c5f67739c7fd176a808a95629013985c684ac617aa3ec5e2cec9b495` |
| `edge-record.v1.schema.json` | `2ad3c15fb478246fb753373d3638dc086e310f89` | `30d25c7fe55c27e2b79e06bbf38dbb410ab7e3ebbf3484c8ef8a408ef4429277` |
| `watcher-project.v1.json` | `af08720815120b4c40bc07ad1bf78977b1573f20` | `2efa5f264a76b3326a7e783bc7ec2cde6dab70c257f8a86a7f1f354b005bd302` |
| `verification-workload.v1.json` | `f5b632170bcd0c8b639d119124a3c962aa80ff52` | `be2d600767d88c9f4e057dc2a539ba9f5032fa40dab25495ffd4462902972a33` |
| `source-seed.v1.json` | `5278839736a53a82bfce884ea16eac0b254437ed` | `c6121b5092de071efebe1cd8a0c9f6cccbe3364f6edb3edd4548cf97618dd41a` |
| `package.json` | `afaedd015a49f98bf7bb3d154281665879f2aa10` | `c1ec2d0e0e02a16ca24b4fbc45e249442b4cc136073f276df12748651c6616b7` |
| `package-lock.json` | `b67ca3f905e5c87023198d47edaaf24f725edea2` | `74c56cce3e6703137a1b0ba4b97bd5c6fa087a192fb28c7af795ac89e0a195ea` |
| Edge fixed point | 584 rows / 9 classes / 103 source blobs / 3 manifest blobs | `203f53420fb50ce82d0064ef238b568371a7095d8f7d2fff52256f7875a8dac8` |
| Direct/npm inner result | 14/14 rows status 0, byte-identical | `b47d8c8d2bc0c99fbdd1550b4930a7199468360cb04f0f03c9332373840e3f9d` |

The direct/npm result reproduced the builder-bound hash under a distinct
reviewer scratch `HOME`/`TMPDIR`, so the round-two environment-tokenization fix
stands.

## Acceptance-blocking findings

### D1 — HIGH — edge-record v1 is invalid under edge-record v1 schema

Draft-07 validation of the exact committed record against the exact committed
schema reports **585 errors**:

- the record root carries `policy_sha256`, `source_blobs`, and
  `manifest_blobs`, while the schema has `additionalProperties:false` and does
  not declare them (`provenance/edge-record.v1.schema.json:7-13`);
- every one of the 584 rows carries `from_blob`, while row objects likewise
  forbid and do not declare it (`provenance/edge-record.v1.schema.json:15-47`).

`tools/build-source-plan.mjs:91-101` checks fixed-point equality and byte
equality only. It never validates the generated/committed value against the
versioned schema, so `--check` exits 0 on an artifact its schema rejects. This
violates AC2's versioned edge-record contract and makes AC7's source-plan row a
false green.

### D2 — HIGH — executable-edge extraction remains fail-open and context-global

Six direct library fixtures against the accepted resolver expose residuals:

1. A repository-capable `spawnSync('./tools/missing.sh')` in a test body yields
   zero edges because `tools/lib/source-plan.mjs:155-156` skips every test body.
2. `spawnSync(process.env.SCRIPT, [])` yields zero edges because the extractor
   at lines 182-188 accepts only a string or bare identifier.
3. `readFileSync('/src/missing.json')` yields zero rows rather than
   `unknown_edge`; absolute repository-shaped paths fall through the
   `isRepoCapable` gate at lines 71-78 and 355-359.
4. A function parameter shadowing an outer literal command is reported as the
   outer safe repository script, not rejected as computed.
5. A variable initialized to a safe literal and then reassigned from
   `process.env` is likewise reported as the stale safe literal.
6. Two variant tsconfig contexts assigning the same alias to different targets
   silently resolve every source to the last globally merged target rather
   than detecting source-context ambiguity (`buildContexts`, lines 102-109).

The global regex literal map at lines 149-150 has no scope or mutation model;
the computed-edge rejection at lines 329-332 can only reject expressions the
extractor first recognizes. Binding all source blobs makes mutations move the
fixed point, but does not make omitted or misclassified edges map exactly once.

### C1 — HIGH — takeover evidence is not atomic with the takeover CAS

`WatcherStore.takeover` clears `owner_pgid` and `termination_evidence` while
installing the new owner (`src/watcher/state.ts:169-182`). Only after that
transaction commits does `applyCandidate` separately call
`recordTermination` (`src/watcher/apply.ts:128-133`). A crash between those
writes leaves an APPLYING owner with neither the prior PGID nor the evidence
that supposedly gated takeover.

A direct compiled-source state probe reproduced the window: the first takeover
succeeded and left `owner_pgid:null` plus `termination_evidence:null`; after
that new lease expired, a second takeover succeeded with no evidence. The live
group fixtures exercise a non-crashing serial path and do not cover this
between-transactions crash.

### C2 — HIGH — a stale owner can terminally mutate the successor's APPLYING row

`setOwnerPgid`, `recordTermination`, `recoverToApproved`, and `markApplied` use
owner predicates, but `escalate` and `recordFailure` do not
(`src/watcher/state.ts:209-226`). `attemptPush` calls those unguarded mutations
after transport outcomes. A direct state probe took over from `old` to `new`,
then an unconditional stale-owner escalation succeeded and moved the new
owner's row to `ESCALATED`.

This violates the AC5 requirement that conditional transitions serialize
owners. The new PGID write guard prevents one stale write class, not stale
terminal/failure mutation.

## Design-choice judgments

- **Stand:** sealed-policy-driven source planning, source/manifest blob binding,
  canonical context hashes, and a non-writing `--check` are the right design;
  schema validation and complete extraction are missing from the enforcement.
- **Stand:** child-first PGID publication, group-directed TERM/KILL, and
  exact-expected-old remote CAS are appropriate; termination evidence must be
  committed in the same guarded transition and every stale-owner mutation must
  be token-predicated.
- **Stand:** normalized scratch roots, separate route envelopes, the 14-row
  roster, and the named offline native rebuild reproduce correctly.

## Drift and merge preview

- No product/context/history or installation/authority drift was observed.
- Source independence, 76 byte-identical ports, 13 skills, dependency closure,
  and the ordinary target topology reproduce.
- Feature merge base against current main is
  `84c15504a55d65c093a845b335748f2c58250dd1`. The feature adds only the
  migration record and review record relative to that base. Current main
  changes neither path; `merge-tree` reports no textual conflict.
- This conflict preview is not merge approval.

## Suggested fixups

1. Extend `edge-record.v1.schema.json` to describe every emitted root/row field
   and make `build-source-plan --check` validate both generated and committed
   bytes against it before fixed-point comparison. Commit a regression that
   validates the exact HEAD artifact.
2. Replace or strengthen regex extraction so unsupported executable patterns
   fail closed; do not skip executable test bodies; handle scope/reassignment;
   recognize member-expression commands and absolute repository paths; bind
   tsconfig contexts per source and reject ambiguity.
3. Make prior PGID + termination evidence an input to, and durable output of,
   the same takeover CAS. Owner-token-predicate every APPLYING mutation,
   including escalation and failure accounting. Add crash-between-CAS/evidence
   and stale-owner-after-takeover fixtures.
4. Regenerate a new target HEAD/tree and immutable migration record, publish a
   new builder head, and request another independent review. Do not install or
   advance authority/maturity.

## Test counts observed

- Full target suite: **22/22 files; 143/143 tests passed**.
- Source-plan focused suite: **38/38 passed**; independent schema validation:
  **585 errors**.
- Watcher suites: **38/38 passed** across containment 10, recovery 6, apply 5,
  state 5, project 5, and probe 7; two direct residual state probes exposed the
  C1/C2 failures above.
- Coordination: **28/28 passed**; task-state: **16/16 passed**; review queue:
  **9/9 passed**; workflow loop: **4/4 passed**.
- Migration suites: source-plan 38, source-seed 5, dependency 3,
  verification-result 1, source-independence 1 — **48/48 passed**.
- Typecheck, lint, provenance, dependencies, skills, source-plan `--check`,
  fsck, and recursive diff-tree rows: pass.
- Offline lifecycle: private clone, deny-network probe, offline `npm ci`, named
  `better-sqlite3` rebuild, and native load: pass.
- Direct/npm routes: **14/14 rows status 0** in each route; inner bytes equal;
  bound/environment-invariant SHA-256 reproduced.

## Final verdict

**REJECT — redo before merge.** The executable evidence is green, but it is not
acceptance-complete: the edge record fails its own schema, source-edge analysis
still has fail-open/ambiguous cases, and watcher takeover state can lose the
required evidence or be terminally changed by a stale owner. The target remains
unaccepted, `authority:false`, `installed:false`, and `DEV`; Project_echo
remains authoritative.
