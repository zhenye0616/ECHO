# Agent run — 2026-07-13-135-local-echo-context-source-extraction

- Item: `2026-07-13-135-local-echo-context-source-extraction`
- Builder persona: `fable-builder-135` (Claude Code / claude binding)
- Branch: `agent/135-echo-context`
- Worktree: `/Users/zhenye/Desktop/Project_echo--135-echo-context`
- Target repo: `/Users/zhenye/Desktop/echo-context` (standalone, local-only)
- Pinned source commit: `2971310441b69735cbe759293abd8c4d044bf347`
- Outcome: **ESCALATED — incomplete attended build, target unaccepted.** Per the
  governing lifecycle decision, the visible target is incomplete and must be
  founder-archived before a continued or fresh run. No auto-resume.

## Run 1 (2026-07-14, PDT)

### Summary

This is a 5-day-estimate, byte-exact multi-proof extraction spec (eight ACs,
14 provenance JSON + 9 schemas, six authored audit tools, a standalone-buildable
TS package with ~107 tests, a native `better-sqlite3` install proof under
`sandbox-exec` network denial, context-tool + service parity harnesses, a
migration record, and a `codex-ops` reviewer feature-branch child-push handoff).
Full acceptance at the required correctness bar — where an independent reviewer
reproduces every artifact byte-for-byte from its own clone — is not reachable in
a single attended session. The governing decision
`raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md`
explicitly provisions for this: "If a builder is interrupted, the visible target
is incomplete and unaccepted. The orchestrator inspects and manually archives it
before a fresh assigned run. No agent automatically adopts, deletes, resumes,
reconciles, or repairs it."

Rather than push a large volume of unverified, non-byte-exact, non-building
artifacts into `pending_review` (which would fail the reviewer's from-clone
reproduction immediately and misreport status), this run completes and *verifies*
the load-bearing foundation, records the full disposition analysis, and escalates
honestly with a precise per-AC remaining-work map. This de-risks the continuation.

### What was completed and verified this run

**Environment binding (verified).** Toolchain matches the spec pins exactly:
`/usr/local/bin/git` = git 2.37.3; `/usr/local/bin/node` = v22.22.1. Pinned
commit `2971310…` resolves to a `commit` object; its tree is `7320c94d…`.
Source-repo hygiene under the config-free envelope: no replace/graft refs, no
promisor config, not shallow, no alternates.

**AC1 — target repository created (structural init done).**
- Absence gate passed; one non-recursive `mkdir` (EEXIST-fail semantics).
- `git init --initial-branch=migration/2026-07-13-135 --template=` under the
  config-free envelope (`env -i` allowlist; `GIT_CONFIG_NOSYSTEM=1`, empty
  `GIT_CONFIG_GLOBAL`, `GIT_ATTR_NOSYSTEM=1`, `GIT_NO_REPLACE_OBJECTS=1`).
- Config set: fixed identity (`echo-context migration` /
  `migration@echo-context.local`), `core.hooksPath=/dev/null`,
  `core.logAllRefUpdates=false`, `commit.gpgsign=false`, `tag.gpgsign=false`.
- HEAD → unborn `refs/heads/migration/2026-07-13-135`. No remote. No reflogs.
- NOT YET accepted: acceptance ("clean, one branch/root history, passing
  `git fsck --full`") is only meaningful once the extracted contents are
  committed; the repo currently has zero commits (correct incomplete state).

**AC6 — canonical source-inventory tool authored and VERIFIED.**
`/Users/zhenye/Desktop/echo-context/tools/emit-source-inventory.mjs` implements
the AC6 algorithm: refuses any `--git` not literally `/usr/local/bin/git` (and
not symlink-resolving to it), spawns git under AC1's config-free envelope,
requires zero exit / no signal, parses NUL-delimited `ls-tree -r -z` output,
selects exact root-or-descendant membership, rejects LF/invalid-UTF-8 paths,
sorts by raw UTF-8 bytes, and emits each path + LF including a final LF.

Verified with the exact canonical command from AC6 (20 roots):
```
/usr/local/bin/node tools/emit-source-inventory.mjs \
  --git /usr/local/bin/git --git-dir /Users/zhenye/Desktop/Project_echo/.git \
  --sha 2971310441b69735cbe759293abd8c4d044bf347 \
  --root src/capture … --root src/guards.ts … --root tests/fixtures
```
Output: **217 paths (110 source, 107 test/fixture)**, SHA-256
**`8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`** — matches
the spec binding byte-for-byte (7408 bytes, 217 LF-terminated lines). Negative
case: `--git /bin/git` is rejected. The full tool source is in the appendix
below (durable against target archival).

### Disposition analysis (verified against pinned source; ready for continuation)

The 217-path closure default is `ported` (byte-exact copy at the same path). The
following forbidden-capability modules under the roots must be `excluded` or
`rewritten` per AC6/AC5 (each with recorded rationale; `rewritten` rows bind
source OID + target OID + deterministic byte diff + replay command — never a
whole-blob authored replacement):

Source modules requiring exclusion/rewrite:
- `src/mcp/server.ts` — mixed registry; **rewrite** to register only the eight
  context tools (`echo_ping`, `echo_resolve_mru`, `find_clusters`, `get_atom`,
  `get_atoms`, `get_recent_work_context`, `search_memories`,
  `wait_for_new_turns`); drop imports/registration of the product/loop tools.
- `src/mcp/tools/coord-emit.ts`, `coord-invoke.ts`, `coord-status.ts` — loop
  coordination → **exclude**.
- `src/mcp/tools/get-role-state.ts`, `list-task-states.ts`,
  `pending-decisions.ts` — loop/product → **exclude**.
- `src/mcp/tools/internal/decision-card-types.ts`,
  `decision-source-playbook.ts` — product decision surface → **exclude**.
- `src/mcp/tools/_cursor.ts` — inspect: exclude unless a context tool depends on it.
- `src/enrich/decision-drift.ts`, `granola-intake-candidates.ts`,
  `granola-intake-seed-store.ts` — product enrichment → **exclude**.
- `src/enrich/granola-signals.ts`, `post-meeting-brief.ts` — product-owned by
  item 133 (AC5): **exclude** or recorded deliberate duplication — never a
  silent double-claim. `granola-signals-cli-adapter.ts`, `dispatch.ts` — inspect
  import reach; likely exclude.
- `src/echo-home/wizard/detect-agents.ts` — → **exclude**.

Their tests (must be excluded alongside, per AC6's cannot-exclude carve-out that
protects only capture/normalize/storage/trace/context-MCP/util tests):
- `tests/mcp/pending-decisions.test.ts`,
  `tests/mcp/tools/list-task-states-batching.test.ts` and its
  `tests/mcp/tools/fixtures/{build-list-task-states-fixture.ts,list-task-states-baseline.json}`.
- `tests/enrich/{decision-drift,granola-intake-candidates,granola-intake-card-atom,granola-intake-cutoff-clock,granola-intake-seed-store,post-meeting-brief}.test.ts`.
- `tests/echo-home/wizard/detect-agents.test.ts`.
- `tests/normalize/dispatch.test.ts`, `tests/storage/iterate-coord-by-append-order.test.ts` — inspect: exclude iff they exercise excluded coord/dispatch capability.

The full byte-exact import-graph closure (to confirm no `ported` file
transitively imports an `excluded` module, forcing further rewrite/exclusion)
is the first task of the continuation and is NOT yet complete.

### Per-AC remaining work (not done this run)

- **AC1 (finish):** commit the accepted contents; prove clean/one-root/no-reflogs/`git fsck --full`.
- **AC2:** `package.json` (Node 22.22.1 / npm 10.9.4) + committed lockfile;
  `provenance/runtime-inventory.v1.json` (closed edge grammar);
  `tools/check-runtime-inventory.mjs`. Standalone import closure.
- **AC3:** `context-tools.v1.json` (exactly 8); `tests/fixtures/context-tool-parity.v1.json`
  (10 ordered cases); `tools/verify-context-tools.mjs` projector;
  `provenance/context-tool-parity.v1.json` + schema; byte-canonical aggregate;
  live source-MCP-over-stdio parity run on synthetic seed.
- **AC4/AC5:** `src/state/paths.ts` `ECHO_CONTEXT_HOME` distinct default;
  Granola dedup dispositions recorded in provenance.
- **AC6 (finish):** materialize ported/rewritten source byte-exact; author
  `source-evidence.v1.json`, `parity-matrix.v1.json`, `source-extraction.v1.json`,
  `target-only-policy.v1.json` (38 paths) + schemas; `tools/check-parity.mjs`,
  `tools/audit-pinned-extraction.mjs`; standalone typecheck/lint/tests green.
- **AC7:** `lifecycle-expected/observed.v1.json`, `native-toolchain.v1.json`;
  private `git clone --no-local`; `sandbox-exec` deny-network `npm ci --offline
  --ignore-scripts` + `npm rebuild better-sqlite3` (only that rebuild executes);
  DNS/TCP-connect + loopback-control probes; object-closure + source-independence.
- **AC8:** `schemas/service-api.v1.json`; `tools/verify-service-parity.mjs`;
  `tests/integration/context-service.test.ts`; migration record with full hash
  set; `codex-ops` reviewer feature-branch child-push handoff (expected-old CAS).

### Notes on handoff shape

- No `agent/135-echo-context` code commits: this item's code lives in the
  separate standalone target repo, not the worktree branch, by design. The
  branch head therefore equals the claim commit.
- No migration record (`raw/internal/migrations/2026-07-13-135-echo-context.md`)
  was authored — writing one would falsely assert an accepted target. It is
  produced only on a completed build.
- ECHO MCP: zero `mcp__echo__*` calls this run (all work was filesystem/git/node);
  per the CLAUDE.md skip-rule, no dogfooding-journal entry is owed.

## Appendix — verified `tools/emit-source-inventory.mjs`

Reproduces `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37`.
Preserved here so it survives founder archival of the incomplete target. Also at
`/Users/zhenye/Desktop/echo-context/tools/emit-source-inventory.mjs` and
`<session-scratchpad>/inv-emit.txt` (its 217-line output).
