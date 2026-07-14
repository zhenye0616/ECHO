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
files_to_modify:
  - /Users/zhenye/Desktop/echo-context/**                      # NEW standalone context repository; local only
  - raw/internal/migrations/2026-07-13-135-echo-context.md     # NEW Project_echo provenance/parity record
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
  - src/mcp/tools.ts                                         # current mixed tool registry
  - src/storage/interface.ts                                 # storage contract
  - tests/mcp/                                               # retrieval/API behavior
  - tests/storage/                                           # storage behavior
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# Local standalone echo-context source extraction and synthetic parity proof

## Why this spec exists

`echo-context` owns generic capture, normalization, storage, clustering/retrieval, permissions/health, and context APIs. This item materializes that closure from Project_echo commit `2971310441b69735cbe759293abd8c4d044bf347` into `/Users/zhenye/Desktop/echo-context` and proves it only on synthetic state. Project_echo remains the active daemon/MCP, backup, and authority. Live-state migration, installation, remote creation, and cutover are later checkpoints.

### AC1 — Create one ordinary local repository from raw pinned Git objects

One builder owns `/Users/zhenye/Desktop/echo-context`; sibling lanes never touch it. It verifies absence, performs one non-recursive mkdir that fails on EEXIST, and initializes `migration/2026-07-13-135` with fixed local identity, hooks/signing/templates disabled, and no remote. The accepted target is clean with one branch/root history, no alternates/promisor/replace state, and passing `git fsck --full`.

Source reads use `/usr/local/bin/git` 2.37.3 with explicit `--git-dir`, `GIT_CONFIG_NOSYSTEM=1`, empty global config, `GIT_NO_REPLACE_OBJECTS=1`, and no alternates. The builder rejects replace/graft refs, partial-clone/promisor config, filters, export-subst attributes, symlinks, and submodules; verifies pinned commit/tree/blob types; and materializes raw bytes through literal `ls-tree` plus `cat-file --batch`. Dirty checkout, replacement-object, and export-subst fixtures cannot change source, package, lock, or test bytes.

This is a trusted attended build, not a crash-atomic or supply-chain containment product. Do not add migration controllers, evidence publishers, failure capsules, process watchers, credential transport, or custom Git handoff. An interrupted target is unaccepted and founder-archived before retry. Existing Project_echo builder workflow owns claim/commit/push.

### AC2 — Give echo-context accurate capture/retrieval ownership

`package.json` pins Node 22.22.1/npm 10.9.4 and owns a committed lockfile. `src/` contains only generic capture adapters/gate, normalization/identity, generic trace/enrichment, append-only storage/migrations, source/workspace matching, clustering/search/body retrieval/wait, permissions, health/logging, and context-only MCP/service surfaces.

`provenance/runtime-inventory.v1.json` partitions every captured target-HEAD edge: repository-local imports/reads resolve to one tracked target blob; bare imports/JavaScript CLIs resolve to exact locked npm rows; non-JS helpers resolve to pinned toolchain rows. Product decision/rationale/action extraction, cards/briefs/manual approval/product health, loop coordination/task-state/review tools, and Project_echo/sibling dependencies are forbidden.

### AC3 — Pin and prove the context-only retrieval surface

`context-tools.v1.json` registers exactly `echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`, `get_atoms`, `get_recent_work_context`, `search_memories`, and `wait_for_new_turns`. Target exposes those eight and no product/loop extras.

Before target finalization, builder exports raw pinned source blobs to scratch, installs from the pinned lock, launches source MCP over stdio on fresh synthetic state, and runs the committed per-tool fixture matrix. Source may expose a mixed roster; projector requires the eight IDs exactly once, byte-projects only them, and classifies ignored non-context IDs. Canonical descriptor and response bytes use fixed time/random/IDs, recursively sorted object keys, preserved arrays, and named volatile pointers. Target runs the same cases; per-case and aggregate SHA-256 must match. Descriptor-only and semantic mutations fail.

### AC4 — Own isolated context state and migrations

`src/state/paths.ts` resolves mutable state under explicit `ECHO_CONTEXT_HOME` with a default distinct from echo-brain, echo-loop, and `~/.echo`. `src/storage/` owns schema/migrations, append order, source matching, request logs, and context health. Tests use synthetic scratch state. Implicit reads, copies, migrations, or mutations of live databases, checkpoints, credentials, or user config are forbidden.

### AC5 — Resolve Granola overlap without product coupling

`src/capture/granola/` may own raw Granola capture only as a generic context source. Decision/rationale/action extraction, post-meeting briefs, intake classifiers, cards, approval, and product health are excluded. Echo-brain may separately own a minimal product adapter; neither repository imports or synchronizes the other's source. Provenance records deliberate duplicated adapter utilities.

### AC6 — Preserve capture, storage, and retrieval behavior

The pinned inventory is the LF-sorted raw-tree output for `src/capture`, `src/normalize`, `src/storage`, `src/trace`, `src/echo-home`, `src/enrich`, `src/logging`, `src/mcp`, `src/util` and matching test roots: exactly 211 paths (109 source, 102 test/fixture), SHA-256 `e1fde9ae3f2730572dfaec621dc6531665594696917d81b31b9d997d5fd08f62`.

`provenance/source-evidence.v1.json` records source path/mode/blob/content hash. `parity-matrix.v1.json` gives each source row one target assertion and `ported`, `rewritten`, or `excluded` rationale, with exact allowlists for product/loop exclusions. Production/context tests cannot be excluded; rewrites record exact before/after bytes and replay. `source-extraction.v1.json` also partitions every regular tracked target blob except itself; target-only files are limited to package/lock/README, provenance/check tools, and standalone tests named here. Omission, authored replacement of excluded behavior, whole-blob rewrite, and target-only extra fixtures fail.

Target tests prove capture allow/reject, normalization determinism/identity, SQLite/memory conformance, migrations, append ordering, metadata/current-source matching, clustering/open-loop hints, search pagination, source/session resolution, newest-first body retrieval, caps/truncation, wait semantics, and stateless MCP transport.

### AC7 — Prove dependencies, provenance, and source independence

After target HEAD is committed, builder and reviewer each create a private `git clone --no-local --no-hardlinks`, detach the accepted OID, remove origin, and verify clean/no-remotes/no-alternates/no-promisor/no-replace state. A minimal environment uses scratch HOME/XDG/TMP/cache/config and contains no live-state, credential, Project_echo, or sibling path.

Dependency fetch/install follows the exact committed lock. The threat model trusts those pinned dependency packages; it does not claim hostile lifecycle containment. `provenance/lifecycle-plan.v1.json` records every root/transitive automatic hook and native build, including `better-sqlite3`, with package/version/integrity, command, working directory, toolchain inputs, and outputs. Unexpected hooks, unpinned downloads, mutable path/Git/workspace dependencies, or closure differences fail. Builder records Node/npm and actual native compiler/SDK/header hashes used; reviewer repeats install independently.

From the private clone, direct-Node tools run runtime-inventory, source evidence/parity/extraction, context-tool fixtures, typecheck, lint, capture/normalize/storage/retrieval tests, stdio/service parity, whitespace, source-independence, `git fsck --full`, and recursive diff-tree checks. The read-only operator audit alone accesses pinned Project_echo objects and recomputes the exact 211-path raw closure/dispositions. Shared target HEAD/tree, refs/config/status, and filesystem-versus-HEAD enumeration are checked before and after. Any failure stops; no adversarial descendant-containment claim is made.

### AC8 — Prove local service parity and record the normal builder handoff

`tests/integration/context-service.test.ts` launches with synthetic `ECHO_CONTEXT_HOME`, binds loopback port 0, reports readiness through a dedicated FD, and proves ping, capture, search, clustering, body fetch, wait, bounded startup/request/shutdown, and ordinary process-group cleanup. It never reads live state or exposes a non-loopback listener.

The builder follows `docs/AGENT_INSTRUCTIONS.md` for Project_echo claim, run log, migration record, backlog move, commit, and feature-branch push; this spec defines no endpoint, credential, receipt, or second handoff protocol. The record contains source SHA, target path/branch/HEAD/tree, package/lock/runtime/provenance/parity/tool hashes, exact commands/exits, context-tool aggregate, service results, no-remotes/clean checks, differences, `authority:false`, and `installed:false`. Target history remains unchanged and has no remote.

Independent review binds the review request bytes/`spec_commit_sha`, accepted target HEAD/tree, and migration-record commit, then reruns AC1 object-state and AC7/AC8 verification from its own clone/synthetic state. Passing proves only a local source split; Project_echo daemon/MCP/live state remain authoritative.

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
- `/Users/zhenye/Desktop/echo-context/tests/migration/parity-matrix.test.ts` — exact 211/109/102 raw-object inventory and disposition allowlists.
- `/Users/zhenye/Desktop/echo-context/tests/migration/context-tool-evidence.test.ts` — identical source/target fixture hashes.
- `/Users/zhenye/Desktop/echo-context/tests/migration/dependency-set.test.ts` — final-HEAD edges, lock, lifecycle, and toolchain record.
- `/Users/zhenye/Desktop/echo-context/tests/migration/committed-source-only.test.ts` — dirty/replacement/filter bytes excluded.
- `/Users/zhenye/Desktop/echo-context/tests/migration/source-independence.test.ts` — no source/sibling/live-state escape.
- Independent migration-record review — accepted HEAD/tree, rerun commands, no remote, and false authority/live-state evidence.

## After Completion (Strategist Notes)

- Do not switch daemon/MCP or migrate live state.
- Propose remote, installation, state migration/rollback, and authority transfer separately after local parity.
