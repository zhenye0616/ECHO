---
id: 2026-07-13-135-local-echo-context-source-extraction
title: "Local standalone echo-context source extraction and synthetic parity proof"
status: proposed
priority: HIGH
estimate: 5d
created: 2026-07-13
blocked_by:
  - 2026-07-13-132-product-graduation-foundation
task_state_ref: 2026-07-13-135-local-echo-context-source-extraction
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: aa9fa9d89c30b2ba2823d6b3eecdc32e389120bb9f3bc46538b9335a301c8392
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/**                      # NEW standalone context repository; local only
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW Project_echo provenance/parity record
  - raw/internal/migrations/2026-07-13-135-echo-context-review.md # independent same-host review record
  - raw/internal/agent-runs/**                                 # workflow-owned failure/completion run log
  - backlog/task-state/2026-07-13-135-local-echo-context-source-extraction/builder.md # workflow continuity pointer
  - backlog/ready/2026-07-13-135-local-echo-context-source-extraction.md # workflow claim source
  - backlog/in_progress/2026-07-13-135-local-echo-context-source-extraction.md # workflow claimed item
  - backlog/pending_review/2026-07-13-135-local-echo-context-source-extraction.md # workflow handoff item
  - docs/BACKLOG.md                                           # generated stage-derived index on claim/handoff
spec_refs:
  - raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md # attended build; final repo is the acceptance object
  - raw/internal/decisions/2026-07-11-commercial-focus-team-product-carve.md # context remains internal substrate
  - raw/internal/decisions/2026-07-11-team-product-graduation-pipeline.md # product maturity remains separate
  - raw/internal/decisions/2026-07-12-g2-terminal-dispositions-and-repository-topology.md # source topology/provenance
  - src/mcp/server.ts                                        # current mixed tool registry
  - src/mcp/tools/                                           # current context/loop/product tool implementations
  - src/storage/interface.ts                                 # storage contract
  - tests/mcp/                                               # retrieval/API behavior
  - tests/storage/                                           # storage behavior
claimed_by: "fable-builder-135"
claimed_at: "2026-07-14T05:47:41Z"
branch: "agent/135-echo-context"
worktree: "/Users/zhenye/Desktop/Project_echo--135-echo-context"
head_sha: "8d5ae35e502fb6105f17ae9088b51f750f721cc2"
pr_url: ""
agent_notes: |
  ESCALATION at capacity (Run 4, AC7 install proof landed) — INCOMPLETE/UNACCEPTED target, GREEN build + verified native install.
  Target: /Users/zhenye/Desktop/echo-context @ HEAD e5a34a357e1fcee8b142e85d4d37c06202f6ffb3
  (tree 24ae1c2291106d580f7ba6d2b1060dd2395325af), branch migration/2026-07-13-135, no remote,
  fsck clean, no unreachable. node_modules + scratch tsconfig NOT tracked. NOT accepted.
  HEADLINE Run 3: standalone tsc = 0 errors; vitest = 64 files / 939 tests pass, 0 fail.
  HEADLINE Run 4: AC7 clean-install proof VERIFIED — private clone, npm ci --offline --ignore-scripts (exit 0),
  npm rebuild better-sqlite3 --build-from-source under sandbox-exec deny-network (exit 0, only better-sqlite3 executed),
  DNS/IP/https denied inside + loopback control both halves, better_sqlite3.node sha256 289ac267..., module loads.
  Committed lifecycle-expected/observed + native-toolchain provenance. All 65 exclusion rows now cite their spec clause.
  Partition finalized (import-closed): 144 ported / 8 rewritten / 65 excluded, 0 unresolved.
  8 rewrites (parity-matrix rows w/ target hashes + replay): server.ts (8-tool roster), granola-signals.ts
  (AC5 generic duplicate), state-paths.ts (AC4: ECHO_HOME→ECHO_CONTEXT_HOME, ~/.echo→~/.echo-context per
  Founder adjudication #2), + 5 test rewrites (roster 15→8, enable_deadlines drop, coord_emit→search_memories
  isError case, product-case excision, AC4 defaults). 65 excluded now also includes the echo-home
  onboarding/config-sync layer (not context substrate per AC2; reaches assets/ outside roots).
  AC1 ✓. AC4 ✓ (per Q2). AC5 ✓. AC6 extraction + source-evidence/parity-matrix ✓. AC7 install proof ✓ (lifecycle-expected/observed + native-toolchain committed).
  Q1 record: scratch tsconfig SHA-256 7164ed9356aa3bd1d9108283eee164053bc6f251418d0aa1dc4d4b02726bf78f (invoke typecheck/lint via --project <scratch>; not committed).
  Remaining (bounded, interdependent): AC2 runtime-inventory + check-runtime-inventory.mjs (+ dependency-set test);
  AC3 context-tool-parity fixture + verify-context-tools.mjs + stdio runner + provenance + roster test;
  AC8 service-api schema + verify-service-parity + context-service test + migration record (binds all hashes/AC3-aggregate/service results; cites Q1 + Founder-adjudication-#2 deviations) — NOT the codex-ops reviewer leg;
  AC6 close-out: target-only-policy (38) + source-extraction + 9 schemas + check-parity/audit-pinned-extraction + 5 migration tests + exact-HEAD (gated on all 38 target-only files existing); lint.
  head_sha is the Project_echo feature-branch head (no code by design — code lives in the standalone target repo; the
  branch-advancing builder migration record is in the AC8 remaining set). Target HEAD above (e5a34a35) is the real deliverable pointer.
  Why escalated: at-capacity per founder instruction; founder-endorsed incomplete milestone for continuation. Full per-AC map in the Run 4 run log.
review_notes: ""
---

# Local standalone echo-context source extraction and synthetic parity proof

## Why this spec exists

`echo-context` owns generic capture, normalization, storage, clustering/retrieval, permissions/health, and context APIs. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-context` and proves it only on synthetic state. Project_echo remains the active daemon/MCP, backup, and authority. Live-state migration, installation, remote creation, and cutover are later checkpoints.

## Acceptance Criteria

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-context`; sibling lanes never touch it. It verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes `migration/2026-07-13-135` with fixed local identity, hooks/signing/templates disabled, `core.logAllRefUpdates=false`, and no remote. The accepted target is clean with one branch/root history, no reflogs, no alternates/promisor/replace state, and passing `git fsck --full`.

Source reads use `/usr/local/bin/git` 2.37.3 with explicit `--git-dir`, `GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`, `GIT_NO_REPLACE_OBJECTS=1`, and no alternates, under a literal `env -i` allowlist that omits `GIT_DIR`, `GIT_WORK_TREE`, `GIT_COMMON_DIR`, `GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_NAMESPACE`, `GIT_EXEC_PATH`, and `GIT_CONFIG_COUNT/KEY/VALUE`; repository-local config includes are rejected before use, with injected-environment fixtures. The builder rejects replace/graft refs, partial-clone/promisor config, filters, export-subst attributes, symlinks, and submodules; verifies pinned commit/tree/blob types; and materializes raw bytes through literal `ls-tree` plus `cat-file --batch`. Dirty checkout, replacement-object, and export-subst fixtures cannot change source, package, lock, or test bytes.

This is a trusted attended build, not a crash-atomic or supply-chain containment product. Do not add migration controllers, evidence publishers, failure capsules, process watchers, credential transport, or custom Git handoff. An interrupted target is unaccepted and founder-archived before retry. Existing Project_echo builder workflow owns claim/commit/push.

### AC2 — Give echo-context accurate capture/retrieval ownership

`package.json` pins Node 22.22.1/npm 10.9.4 and owns a committed lockfile. `src/` contains only generic capture adapters/gate, normalization/identity, generic trace/enrichment, append-only storage/migrations, source/workspace matching, clustering/search/body retrieval/wait, permissions, health/logging, and context-only MCP/service surfaces.

`provenance/runtime-inventory.v1.json` names every final-HEAD entrypoint from `package.json` exports, bin, lifecycle/verification scripts, service/MCP launchers, and every executable tool invoked by those launchers; an executable field absent from the manifest fails. Its closed edge grammar is `repository_static_import`, `repository_dynamic_literal_import`, `repository_commonjs_literal_require`, `repository_literal_read`, `repository_literal_process_launch` (a literal repository-local launch resolving to one tracked target executable blob; computed launches still fail), `node_builtin`, `npm_package`, `npm_javascript_cli`, and `native_or_system_helper`. Local edges resolve to one tracked target blob; bare imports/JavaScript CLIs resolve to exact locked npm rows; native/system helpers resolve to pinned toolchain rows. Computed repository-capable reads/imports/process launches, unknown classes, missing/unused rows, and source/sibling paths fail. The exact final-HEAD check is `/usr/local/bin/node tools/check-runtime-inventory.mjs --git-dir <private-clone>/.git --commit <accepted-oid> --manifest provenance/runtime-inventory.v1.json`. Fixtures omit one entrypoint/edge from each class and add computed/unknown edges. Product decision/rationale/action extraction, cards/briefs/manual approval/product health, loop coordination/task-state/review tools, and Project_echo/sibling dependencies are forbidden.

### AC3 — Pin and prove the context-only retrieval surface

`context-tools.v1.json` registers exactly `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Target exposes those eight and no product/loop extras.

Before target finalization, builder exports raw pinned source blobs to scratch, installs from the pinned lock using AC7's sanitized environment, offline-after-cache-fill lifecycle policy, and deny-network sandbox, then launches source MCP over stdio on fresh synthetic state (fixed clock/random/ID injection is part of the pinned harness bytes, hash-bound in provenance), and runs `tests/fixtures/context-tool-parity.v1.json`. The immutable case order is `ping-empty`, `resolve-mru-granola`, `find-empty`, `find-seeded`, `get-atom-present`, `get-atom-missing`, `get-atoms-mixed`, `recent-seeded`, `search-seeded`, `wait-timeout`; requests use fixed UUID atoms, timestamps, sources, repo path `/fixture/repo`, query `alpha`, limit 10, and wait timeout 10ms defined literally in that file. Seed state is one empty DB plus three byte-pinned atoms/sources and one cluster. Fixed clock/random/IDs make the exhaustive volatile-pointer allowlist empty; adding a pointer requires a new reviewed spec. The stdio runner creates a process group, closes child stdin after the ordered requests, and records the active case plus bounded stderr. Startup is 10s, each request 5s, overall suite 60s, graceful shutdown 5s, then process-group TERM 5s and KILL 5s; timeout or surviving descendant fails.

Source may expose a mixed roster; projector requires the eight IDs exactly once, byte-projects only them, and classifies ignored non-context IDs. Canonical descriptor/response bytes are UTF-8 JSON with recursively byte-sorted object keys, arrays preserved, no insignificant whitespace, and LF. Aggregate framing in case order is `case-id + NUL + lowercase response SHA-256 + LF`, including final LF. `provenance/context-tool-parity.v1.json` and its schema bind source full-roster descriptors, every ignored ID/classification, projected eight-tool descriptor hash, ordered case IDs/hashes, and aggregate. Builder target and reviewer results must equal those fields; the reviewer record binds its aggregate. Descriptor-only, omitted-case, reordered-case, masked-field, semantic, ignored-roster, and source-evidence mutations fail.

### AC4 — Own isolated context state and migrations

`src/state/paths.ts` resolves mutable state under explicit `ECHO_CONTEXT_HOME` with a default distinct from echo-brain, echo-loop, and `~/.echo`. `src/storage/` owns schema/migrations, append order, source matching, request logs, and context health. Tests use synthetic scratch state. Implicit reads, copies, migrations, or mutations of live databases, checkpoints, credentials, or user config are forbidden.

### AC5 — Resolve Granola overlap without product coupling

`src/capture/granola/` may own raw Granola capture only as a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, cards, approval, and product health are excluded. Echo-brain may separately own a minimal product adapter; neither repository imports or synchronizes the other's source. Provenance records deliberate duplicated adapter utilities. `src/enrich/granola-signals.ts` and `src/enrich/post-meeting-brief.ts` are product-owned (item 133's reviewed closure); in echo-context each is either an `excluded` row or a recorded deliberate duplication under the same rule — never a silent double claim.

### AC6 — Preserve capture, storage, and retrieval behavior

The exhaustive roots are the following 20 literals: `src/capture`, `src/normalize`, `src/storage`, `src/trace`, `src/echo-home`, `src/enrich`, `src/logging`, `src/mcp`, `src/util`, `src/guards.ts`, `tests/capture`, `tests/normalize`, `tests/storage`, `tests/trace`, `tests/echo-home`, `tests/enrich`, `tests/logging`, `tests/mcp`, `tests/util`, `tests/fixtures` (import-graph closure at the pinned SHA requires `src/guards.ts`, imported by ten capture/echo-home files, and the five shared `tests/fixtures/` modules). The canonical command is `/usr/local/bin/node /Users/zhenye/Desktop/echo-context/tools/emit-source-inventory.mjs --git /usr/local/bin/git --git-dir /Users/zhenye/Desktop/Project_echo/.git --sha 2971310441b69735cbe759293abd8c4d044bf347 --root src/capture --root src/normalize --root src/storage --root src/trace --root src/echo-home --root src/enrich --root src/logging --root src/mcp --root src/util --root src/guards.ts --root tests/capture --root tests/normalize --root tests/storage --root tests/trace --root tests/echo-home --root tests/enrich --root tests/logging --root tests/mcp --root tests/util --root tests/fixtures`. The tool refuses any `--git` value that does not equal and resolve (after symlinks) to literal `/usr/local/bin/git`, then spawns it under AC1's config-free envelope, requires zero exit/no signal before accepting bytes, parses NUL paths, selects exact root-or-descendant membership, rejects invalid UTF-8/NUL/LF, sorts raw UTF-8 bytes, and emits each path plus LF including final LF. Output is exactly 217 paths (110 source, 107 test/fixture), SHA-256 `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`.

`provenance/source-evidence.v1.json` records source path/mode/blob/content hash. `parity-matrix.v1.json` gives each source row one target assertion and `ported`, `rewritten`, or `excluded` rationale, with exact product/loop exclusion policy bound to eventual `ready_content_sha`. Modules under the roots whose pinned-source imports reach forbidden capabilities — the coord/product tool files under `src/mcp`, `src/enrich/decision-drift.ts`, `src/enrich/granola-intake-candidates.ts`, `src/enrich/post-meeting-brief.ts`, `src/echo-home/wizard/detect-agents.ts`, and their tests — receive `excluded` or `rewritten` dispositions with recorded rationale. The cannot-exclude rule protects capture/normalize/storage/trace/context-MCP/util tests, not product/loop-flavored rows. Each `rewritten` row binds source blob OID, target blob OID, and a deterministic byte diff with an exact replay command; an authored whole-blob replacement under a rewritten disposition fails.

The exhaustive 38-path target-only policy is exactly: `package.json`; `package-lock.json`; `README.md`; `context-tools.v1.json`; `schemas/service-api.v1.json`; `provenance/target-only-policy.v1.json`; `provenance/runtime-inventory.v1.json`; `provenance/source-evidence.v1.json`; `provenance/parity-matrix.v1.json`; `provenance/source-extraction.v1.json`; `provenance/lifecycle-expected.v1.json`; `provenance/lifecycle-observed.v1.json`; `provenance/native-toolchain.v1.json`; `provenance/context-tool-parity.v1.json`; `provenance/schemas/target-only-policy.v1.schema.json`; `provenance/schemas/runtime-inventory.v1.schema.json`; `provenance/schemas/source-evidence.v1.schema.json`; `provenance/schemas/parity-matrix.v1.schema.json`; `provenance/schemas/source-extraction.v1.schema.json`; `provenance/schemas/lifecycle-expected.v1.schema.json`; `provenance/schemas/lifecycle-observed.v1.schema.json`; `provenance/schemas/native-toolchain.v1.schema.json`; `provenance/schemas/context-tool-parity.v1.schema.json`; `tools/check-runtime-inventory.mjs`; `tools/check-parity.mjs`; `tools/audit-pinned-extraction.mjs`; `tools/verify-context-tools.mjs`; `tools/verify-service-parity.mjs`; `tools/emit-source-inventory.mjs`; `tests/fixtures/context-tool-parity.v1.json`; `tests/api/context-only-roster.test.ts`; `tests/integration/context-service.test.ts`; `tests/migration/parity-matrix.test.ts`; `tests/migration/context-tool-evidence.test.ts`; `tests/migration/dependency-set.test.ts`; `tests/migration/committed-source-only.test.ts`; `tests/migration/source-independence.test.ts`; and `tests/migration/object-closure.test.ts`. `target-only-policy.v1.json` copies this exact list and ready SHA; accepted HEAD equality is exact. `source-extraction.v1.json` partitions every other regular tracked blob. Omission, authored replacement, whole-blob rewrite, and extra-path fixtures fail.

Target tests prove capture allow/reject, normalization determinism/identity, SQLite/memory conformance, migrations, append ordering, metadata/current-source matching, clustering/open-loop hints, search pagination, source/session resolution, newest-first body retrieval, caps/truncation, wait semantics, and stateless MCP transport.

### AC7 — Prove dependencies, provenance, and source independence

After target HEAD is committed, builder and reviewer each use absolute `/usr/local/bin/git` under AC1's config-free envelope, an empty template directory and hooks path, to create a private `git clone --no-local --no-hardlinks --no-checkout`; each performs a hook-disabled detached checkout of the accepted OID, removes origin, and verifies clean/no-remotes/no-alternates/no-promisor/no-replace state. All target init/add/commit/clone/checkout/status/fsck commands use the same envelope. A minimal environment uses scratch HOME/XDG/TMP/cache/config and contains no live-state, credential, Project_echo, or sibling path.

Before final target commit, `provenance/lifecycle-expected.v1.json` is derived solely from raw package/lock/package-tarball manifests and lists every root/transitive hook, exact package/version/integrity, working directory, allowed command, expected outputs, and toolchain inputs; only the pinned `better-sqlite3` rebuild may execute. The online cache-fill phase is separate, uses only exact lock URL/integrity tarballs, and cannot execute lifecycle scripts. Every later install/rebuild runs through `/usr/bin/sandbox-exec -p '(version 1) (allow default) (deny network*)'`; absence or ineffective enforcement aborts. Inside that same profile, DNS resolution and direct-IP TCP-connect probes must fail, and a local loopback control listener must accept outside the profile and be denied inside it (both halves required), immediately before and after both absolute npm-cli `ci --offline --ignore-scripts --no-audit --no-fund` and exact `npm rebuild better-sqlite3 --offline --foreground-scripts` with `npm_config_nodedir=/usr/local/Cellar/node@22/22.22.1_1` and build-from-source. A fixture package whose install hook attempts a secondary download must fail at the socket and produce no accepted observation. Unknown hooks, secondary downloads, path/Git/workspace dependencies, or output/closure drift fail.

That pre-commit draft install writes `provenance/lifecycle-observed.v1.json` and `native-toolchain.v1.json` with invoked script, process argv, produced files/hashes, Node/npm/compiler/SDK/header hashes, and network-denial result; then final HEAD is committed. Each post-commit builder/reviewer private install writes scratch observation and must equal committed expected/observed/toolchain projections; compared projections normalize clone-local absolute paths to root tokens, exclude schema-enumerated volatile fields, and compare native artifacts by content hash after normalization, so replay has one deterministic pass condition. Fixtures cover transitive hook, secondary download, wrong tool, and output drift.

From the private clone, direct-Node tools run runtime-inventory, source evidence/parity/extraction, context-tool fixtures, typecheck, lint, capture/normalize/storage/retrieval tests, stdio/service parity, whitespace, source-independence, fsck, and recursive diff-tree. Operator audit alone accesses pinned source objects and recomputes the 217-path closure/dispositions. Shared target checks use `GIT_OPTIONAL_LOCKS=0` and require sole branch `migration/2026-07-13-135`, no tags/other refs/reflogs, exact equality between unique sorted OIDs from `git cat-file --batch-all-objects --batch-check='%(objectname)'` and `git rev-list --objects --no-object-names refs/heads/migration/2026-07-13-135`, and no output from `git fsck --full --no-reflogs --unreachable`. Amended/deleted staged-blob fixtures fail. HEAD/tree, refs/config/status, object set, and filesystem-versus-HEAD are checked before/after.

### AC8 — Prove local service parity and record the normal builder handoff

The eight MCP tools remain read-only retrieval. Capture is a separate service-only `POST /v1/capture` operation, never a ninth MCP tool. `schemas/service-api.v1.json` pins `GET /v1/ping` and POST `/v1/{capture,search,clusters,atoms,wait}` request/response JSON with unknown-field rejection. `tests/integration/context-service.test.ts` runs `/usr/local/bin/node tools/verify-service-parity.mjs --home <scratch> --host 127.0.0.1 --port 0 --ready-fd 3`; the child is process-group leader and writes exactly one canonical JSON-LF readiness record `{host:"127.0.0.1",port:<1..65535>,pid:<int>}` to FD3. Startup is 10s, each request 5s, wait case 100ms, graceful shutdown 5s then group TERM 5s/KILL 5s. It proves ping, service capture, search, clustering, body fetch, wait, and no non-loopback listener/live-state read.

The builder follows `docs/AGENT_INSTRUCTIONS.md` and stops at pending_review. The immutable feature-head migration record contains source SHA, target HEAD/tree, package/lock/runtime/provenance/parity/lifecycle/tool hashes, commands/exits, context-tool aggregate, service results, object-closure/no-remotes/clean checks, differences, `authority:false`, and `installed:false`. Target history remains unchanged and has no remote.

An independent `codex-ops` binding/session reviewer binds request bytes/`spec_commit_sha`, immutable Claude-builder feature head, migration-record hash, and target HEAD/tree; runs a read-only verification list from its own private clone and scratch synthetic state (AC7's clone-side checks, AC3 tool parity, AC8 service parity); it never mutates the accepted target and never reruns builder-only creation (AC1 absence/mkdir/init) or this handoff step itself. It then creates a fresh detached Project_echo worktree at the immutable builder head (never attaching the builder-owned branch), adds exactly `raw/internal/migrations/2026-07-13-135-echo-context-review.md` (one-path tree delta), commits on detached HEAD with the builder head as sole parent, and pushes the explicit child OID to the full feature-branch ref with expected-old equal to the builder head. The item's `head_sha` remains the immutable builder-head OID (a pre-existing object, never the self-referential child); downstream merge tooling accepts the branch tip only if it is a sole-parent child of `head_sha` whose tree delta is exactly the review record, learning the child OID from the remote ref, never from the child's own tree. Push and probe address the literal Project_echo origin URL recorded in the migration record (never a bare remote name) under absolute config-isolated Git (`GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_ATTR_NOSYSTEM=1`, fixed reviewer identity, hooks/signing/askpass disabled, clean index; no pull/rebase/merge/autostash/generic force), preceded by a fail-closed check that no `url.*.insteadOf`/`pushInsteadOf`, `remote.*.pushurl`, or config include is active in the shared repository config; the probe is `/usr/local/bin/git ls-remote <endpoint> <full-ref>` with a strict exactly-one-valid-OID parser distinguishing missing, malformed, duplicate, and unreachable outcomes. After an ambiguous push exit it re-probes: remote-equals-child is success; any other state stops and appends expected, child, and observed-or-`unknown` OIDs plus probe evidence to the item's workflow-owned run log under `raw/internal/agent-runs/` on `main` (a durable sink surviving worktree cleanup, outside the feature ref). This feature-branch push needs no separate founder authorization; founder checkpoints remain at merge and main-push. The record names reviewer binding/session independence, commands, result hashes, object closure, context-tool parity aggregate, and verdict; its child becomes the pending-review head and target history remains unchanged. Passing proves only a local split; Project_echo daemon/MCP/live state remain authoritative.

## Out of Scope (Don't Drift)

- Do not create/configure a target remote, publish/install, or change daemon/MCP/launchd.
- Do not build migration/evidence/recovery/process-containment/credential infrastructure.
- Do not read/copy/migrate/mutate live databases, checkpoints, credentials, Keychain, or user config.
- Do not include echo-brain product semantics or echo-loop protocols, add features, or touch siblings/wiki/holdout-131.

## Risks

- **Server/tool entanglement:** mitigate with exact eight-tool roster and mixed-source projection.
- **Storage drift:** mitigate with synthetic conformance and explicit product/loop exclusions.
- **Native dependency drift:** mitigate with locked lifecycle plan, recorded toolchain, and independent clean install.
- **Interrupted build:** target remains unaccepted and is manually archived.

## Tests

- `/Users/zhenye/Desktop/echo-context/tests/capture/`, `normalize/`, `storage/`, and `retrieval/` — owned context behavior.
- `/Users/zhenye/Desktop/echo-context/tests/api/context-only-roster.test.ts` — exact eight tools; loop/product absent.
- `/Users/zhenye/Desktop/echo-context/tests/integration/context-service.test.ts` — synthetic loopback service end-to-end.
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 217/110/107 raw-object inventory and disposition allowlists.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — identical source/target fixture hashes.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — final-HEAD edges, lock, lifecycle, and toolchain record.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty/replacement/filter bytes excluded.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling/live-state escape.
- `/Users/zhenye/Desktop/echo-context/tests/migration/object-closure.test.ts` — no reflog-only, dangling, unreachable, or extra target object.
- Independent migration-record review — accepted HEAD/tree, rerun commands, no remote, and false authority/live-state evidence.

## After Completion (Strategist Notes)

- Do not switch daemon/MCP or migrate live state.
- Propose remote, installation, state migration/rollback, and authority transfer separately after local parity.

## Founder adjudication #2 (2026-07-13, Run 2 escalation)

**Q1 — tsconfig vs 38-path policy: ACCEPTED as check-time scratch config, never committed.**
AC7 mandates that typecheck/lint pass, not a committed tsconfig; the sealed 38-path target-only
exact set stays intact. The scratch tsconfig's exact bytes MUST be recorded in the migration
record so the codex-ops reviewer reruns with byte-identical config from its own clone
(pattern precedent: 133's uncommitted --no-save toolchain node_modules).

**Q2 — AC4 `src/state/paths.ts`: ACCEPTED as recorded rewrite of the extracted
`src/echo-home/state-paths.ts`.** AC4's literal path is a spec-authoring artifact neither the
20 roots nor the 38-path set can produce; authoring a new src/state/paths.ts would break
exact-HEAD equality. The binding requirement is the semantics: isolated mutable state under
explicit `ECHO_CONTEXT_HOME` with a default distinct from echo-brain, echo-loop, and `~/.echo`
— implemented in state-paths.ts as a parity-matrix `rewritten` row with byte diff + replay.
Deviation recorded in the migration record citing this section.

Reviewer + merge `review_notes` should cite both entries.
