---
id: 2026-05-16-057b-coord-active-trigger-and-role-emission
title: Coord layer 057b — active trigger + role emission (strategist-spawned reviewers + wrapper two-phase emission + skill post-push hooks; activates 057a's dormant substrate)
status: claimed
priority: HIGH
estimate: 2-2.5d
created: 2026-05-16
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-16T09:19:24Z"
branch: "agent/057b-coord-active-trigger-and-role-emission"
head_sha: ""
pr_url: ""
task_state_ref: 2026-05-16-057b-coord-active-trigger-and-role-emission
blocked_by:
  - "2026-05-16-057a-coord-substrate-and-observability"
agent_notes: |
  057b is the production-emission half of the decomposed 057 spec.
  Depends on 057a (substrate). DO NOT CLAIM 057b until 057a is in
  `complete/`; the build requires `coord_emit` + `coord_status` + the
  deadlines tracker + per-tier registry to already exist.

  057a + 057b together = the original 057 scope. The split was made
  2026-05-16 after 057's r5 plateau (decay r1=9 → r2=5 → r3=4 → r4=5
  → r5=5 — 049 fail-to-converge asymptote). Each half is expected to
  converge in 3-4 rounds.

  Parent context (read once): backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md and its r1-r5 review history.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC0 — coord_invoke MCP tool (spawns wrapper script with env-var pinning + appends coord:reviewer_invoked atom; r1 codex F3 HIGH wrapper-spawn replaces raw-argv-spawn)
  - src/mcp/tools/coord-invoke.ts                  # new MCP write tool — imports resolveReviewerWrapperPath from src/coord/paths.ts (NOT raw import.meta.url, per r3 codex F1 + r3 codex-ops F1 convergent HIGH); validates inputs (canonical uuid4 regex per r3 codex F2 MED + role 5-step gate per r4 codex F1 HIGH); subprocess.spawn with shell:false + stdio:'ignore' + cwd:REPO_ROOT + env={ECHO_REVIEW_QUEUE_REPO_ROOT, ECHO_COORD_REQUEST_PATH, ECHO_COORD_CORRELATION_ID} + child.on('error', ...) async-error listener BEFORE child.unref() (r5 codex-ops F1 HIGH — unhandled spawn 'error' is process-fatal); appends coord:reviewer_invoked synchronously BEFORE returning (full lineage: r4 codex F2 HIGH security + r4 codex-ops F2 HIGH pinned-mode + r5 codex-ops F1 HIGH causality + r1 codex F3 HIGH wrapper-spawn + r2 codex-ops F4 HIGH cwd-independent + r2 codex F2 + r2 codex-ops F5 MED stdio/unref + r5 codex-ops F1 HIGH async-error)
  - src/coord/paths.ts                             # NEW (r3 codex F1 + r3 codex-ops F1 convergent HIGH): canonical repo-root + wrapper-path resolver; sits at src/coord/ depth so import.meta.url math (../..) lands at repo root correctly (same depth convention 057a's loadCoordRoles uses); exports REPO_ROOT (with ECHO_REPO_ROOT env override) + resolveReviewerWrapperPath(role)
  - src/mcp/server.ts                              # register coord_invoke
  # AC0/AC7 — request.py correlation_id generation (load-bearing for active/fallback sharing the same round id per r3 codex-ops F1 HIGH)
  - tools/review-queue/schemas/request.schema.json # add correlation_id required field, canonical uuid4 pattern: ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ (r3 codex F2 MED — version-4 + variant nibble enforced; the prior ^[a-f0-9-]{36}$ was too loose)
  - tools/review-queue/request.py                  # generate correlation_id = str(uuid.uuid4()) (36 chars with dashes; uuid4 by construction → automatically matches the canonical regex; closes r1 codex F1 HIGH); NO MCP call
  # AC7 — wrapper two-phase emission (scheduler_health no-correlation_id + request-scoped tick_start/tick_end with correlation_id)
  - tools/review-queue/coord-emit.sh               # NEW (r6 codex F1 HIGH): standalone repo executable that wraps curl with the full 057a coord_emit input contract (event_type + schema_version + emitted_at + subject_role + tier_key + payload); callable from _run_reviewer.sh AND from inside reviewer skill steps run by codex exec / claude -p (the prior r5 sourced-shell-function design was unimplementable because reviewer skill steps run in a child CLI shell where parent's bash function is invisible); reads REVIEWER_NAME for X-Echo-Role header
  - tools/review-queue/_run_reviewer.sh            # Phase 1 scheduler_health at log-redirect-open (invokes tools/review-queue/coord-emit.sh scheduler_health --tick-run-id=...); Phase 2 tick_start after candidate selection OR (pinned-mode) before bind-validation; tick_end on EVERY clean exit including bind_failed (r4 codex-ops F3 HIGH outcome enum + r1 codex F2 + r1 codex-ops F3 convergent HIGH bind_failed via tick_end-not-tick_failed_to_bind)
  - tools/review-queue/run-codex-reviewer.sh       # no-op for 057b — env-var inheritance from coord_invoke's subprocess.spawn carries through; the 5-line wrapper passes env unchanged
  - tools/review-queue/run-codex-ops-reviewer.sh   # same — no-op for 057b
  # AC7 — pinned-request mode in reviewer prompts (bind-failure flow uses tick_end(outcome=bind_failed), NOT tick_failed_to_bind — r1 codex F2 + r1 codex-ops F3 convergent HIGH)
  - skills/review-queue-codex.md                   # Step 2 scan-skip when ECHO_COORD_REQUEST_PATH set; emit tick_start BEFORE bind-validate; emit tick_end(outcome=bind_failed,reason=...) on validation failure (r4 codex-ops F2 HIGH + r1 codex F2 + r1 codex-ops F3 convergent HIGH)
  - skills/review-queue-codex-ops.md
  - skills/review-queue-claude.md                  # (if 056 has shipped; otherwise skip and add in successor)
  - .claude/commands/review-queue-codex.md         # synced from skills/ via tools/sync-skills.sh
  - .claude/commands/review-queue-codex-ops.md     # synced
  - .claude/commands/review-queue-claude.md        # synced (conditional)
  - adapters/codex/skills/review-queue-codex/SKILL.md  # synced
  - adapters/codex/skills/review-queue-codex-ops/SKILL.md  # synced
  # AC7 — post-push hooks in strategist/watcher skills (reviewer-role active trigger ONLY; builder/merger/watcher event-type emission deferred per r1 codex-ops F4 MED)
  - skills/review-queue-watch.md                   # Step 3 (b) post-push hook calls coord_invoke for each headless reviewer in next round's requested_reviewers; NO coord:round_combined emission in 057b (deferred per r1 codex-ops F4 MED — event type not in 057a registry)
  - skills/review-pending.md                       # post-push hook calls coord_invoke for sidecar review reviewers
  - .claude/commands/review-queue-watch.md         # synced
  - .claude/commands/review-pending.md             # synced
  - adapters/codex/skills/review-queue-watch/SKILL.md  # synced
  - adapters/codex/skills/review-pending/SKILL.md  # synced
  # AC7 — daemon internal-emitter attribution (daemon writes reviewer_invoked + deadline_missed with subject_role attribution)
  - src/coord/internal-emitter.ts                  # new module — daemon-side emitter with emitter_role=daemon + subject_role=<reviewer> (r2 codex-ops F2 HIGH)
  # AC8 — integration tests (require both 057a substrate + 057b emission to pass)
  - tests/coord/active-trigger-roundtrip.test.ts            # coord_invoke spawns wrapper; reviewer_invoked + tick_start + tick_end appear within budget
  - tests/coord/pre-spawn-deadline-fires.test.ts            # wrapper exits BEFORE tick_start → daemon's pre-spawn deadline fires coord:deadline_missed (r1 codex-ops F1 HIGH)
  - tests/coord/daemon-down-tolerance.test.ts               # coord_invoke + coord_emit failures non-fatal to queue (r1 codex-ops F2 HIGH)
  - tests/coord/no-pre-push-spawn.test.ts                   # request.py alone produces ZERO coord:reviewer_invoked/tick_start/tick_end atoms (r2 codex F1 + codex-ops F1 convergent HIGH)
  - tests/coord/internal-emitter-attribution.test.ts        # daemon-emitted reviewer_invoked + deadline_missed atoms use subject_role attribution; source=coord:<subject_role> (r2 codex-ops F2 HIGH)
  - tests/coord/scheduler-health-two-phase.test.ts          # wrapper emits scheduler_health (no correlation_id) + later tick_start (with correlation_id) (r2 codex-ops F3 MED)
  - tests/coord/correlation-id-shared-active-and-fallback.test.ts  # active-spawn crashes pre-tick_start; launchd-fallback closes the daemon's reviewer_invoked deadline using same correlation_id (r3 codex-ops F1 HIGH)
  - tests/coord/coord-invoke-input-validation.test.ts       # shell metacharacters + path traversal + bad uuid4 rejected; no spawn + no atom on rejection (r4 codex F2 HIGH security); ALSO role validation — shape-invalid role values ("../", "/", "foo/../bar", "foo;rm", "foo bar", "", "FOO") rejected before ANY config-file read OR FS access (shape-check first per AC0 step 1 sub-step 1); roster-invalid role values ("cursor" [headless:false], "nonexistent" [not in coord-roles.json]) reject AFTER loadCoordRoles() reads coord-roles.json but BEFORE any wrapper-path construction / stat / spawn AND with no MCP side-effects, no atoms appended (r4 codex F1 HIGH role-shape + roster + containment + executable-bit gates; r5 codex F2 LOW narrowed claim)
  - tests/coord/pinned-request-mode.test.ts                 # coord_invoke specifies request_path; wrapper reviews EXACT request (no scan-pick); roster guard (requested_reviewers membership) preserved (r4 codex-ops F2 HIGH + r5 codex F2 MED)
  - tests/coord/tick-end-covers-clean-exits.test.ts         # completed / stale_combined / duplicate_response / upstream_duplicate / bind_failed all emit tick_end and close the open tick_start deadline (r4 codex-ops F3 HIGH + r1 codex F2 + r1 codex-ops F3 convergent HIGH bind_failed outcome)
  - tests/coord/causality-reviewer-invoked-before-tick-start.test.ts  # daemon's reviewer_invoked atom precedes child's tick_start in replay order (r5 codex-ops F1 HIGH)
  - tests/coord/pinned-request-bind-failed-closes-deadline.test.ts  # pinned-request validation failure emits tick_start then tick_end(outcome=bind_failed) — 057a's expects-based tracker closes the deadline correctly; NO coord:deadline_missed false-positive (r1 codex F2 + r1 codex-ops F3 convergent HIGH)
  - tests/coord/coord-invoke-spawns-wrapper.test.ts          # coord_invoke spawns tools/review-queue/run-<role>-reviewer.sh (NOT raw codex argv); env vars ECHO_COORD_REQUEST_PATH + ECHO_COORD_CORRELATION_ID + ECHO_REVIEW_QUEUE_REPO_ROOT arrive in the wrapper process; role with headless:false (e.g. cursor) is rejected with structured MCP error (r1 codex F3 HIGH wrapper-spawn)
  - tests/coord/coord-invoke-cwd-independent.test.ts          # NEW (r2 codex-ops F4 HIGH): start MCP daemon from a non-repo cwd (e.g. process.chdir("/")) — wrapper path still resolves via import.meta.url, child cwd is REPO_ROOT, ECHO_REVIEW_QUEUE_REPO_ROOT env var arrives, wrapper's git/storage operations hit the right checkout
  - tests/coord/coord-invoke-fire-and-forget.test.ts          # NEW (r2 codex F2 MED + r2 codex-ops F5 MED convergent): wrapper spawns a sleep/early-stderr sequence — coord_invoke returns within bounded timeout (under 1s) AND child does not block on undrained pipe AND daemon does not retain child handle (child.unref()); test asserts process.memoryUsage stays bounded across N=100 coord_invoke calls
  - tests/coord/coord-invoke-spawn-error-noncrash.test.ts      # NEW (r5 codex-ops F1 HIGH): force spawn to emit async 'error' (e.g. delete the wrapper between stat-check and spawn-call OR set ulimit -n 0 to force EMFILE) — daemon stays alive, coord_invoke returns/records bounded failure, pre-spawn deadline still fires deadline_missed via 057a tracker (the correct operator signal)
  - tests/coord/coord-emit-wrapper-transport.test.ts           # NEW (r5 codex F1 MED, extended r6 codex F1 HIGH + r7 convergent HIGH): wrapper-originated atoms carry metadata.coord.emitter_role=${REVIEWER_NAME} via X-Echo-Role header; daemon-down does NOT abort the queue tick (curl --connect-timeout 2 --max-time 5 returns non-zero, wrapper continues with `|| true`); **executes tools/review-queue/coord-emit.sh on the local (macOS BSD-date) platform** and asserts the produced emitted_at value (e.g. "2026-05-16T08:05:09Z") is accepted by 057a's coord_emit validator AND canonicalized to ms-precision on the daemon side; full 057a input contract (event_type + schema_version=1 + emitted_at + subject_role + tier_key + optional payload) verified end-to-end (r6 codex F1 HIGH + r7 convergent HIGH portability)
  - tests/coord/paths-resolution.test.ts                       # NEW (r3 codex F1 + r3 codex-ops F1 convergent HIGH, narrowed r6 codex F2 LOW): src/coord/paths.ts exports REPO_ROOT that ends in canonical repo dir regardless of process.cwd(); resolveReviewerWrapperPath("codex") returns existing executable; ECHO_REPO_ROOT env override is honored; SHAPE-INVALID roles ("../", "/", "foo/../bar", "foo;rm", "foo bar", "", "FOO") reject with NO FS access AND NO MCP side-effects (shape regex first); ROSTER-INVALID roles ("cursor" [headless:false], "nonexistent") reject AFTER loadCoordRoles() reads coord-roles.json but BEFORE wrapper-path construction/stat/spawn/MCP side-effects
  - tests/coord/scheduler-health-bootstrap-scope.test.ts       # NEW (r3 codex-ops F2 MED): wrapper emits scheduler_health → does bootstrap (worktree, env, prompt routing) → emits scheduler_health_done → THEN starts review work; long review (synthesized 5+ min codex exec) does NOT fire false coord:deadline_missed for the scheduler_health tier; round-tier tick_start/tick_end lifecycle covers the long review window
  - tests/coord/silent-fail-detection.test.ts               # the full motivating scenario: launchd-style wrapper invocation fails to emit tick_start; deadline fires coord:deadline_missed within budget
  # AC9 — task-state pointer per 046 AC1
  - backlog/task-state/2026-05-16-057b-coord-active-trigger-and-role-emission/builder.md
spec_refs:
  # SIBLING SPEC — 057a MUST be in `complete/` before 057b builder claims (machine-enforced via blocked_by above per r1 codex-ops F2 HIGH). Both paths listed because 057a moves ready→claimed→complete during normal pipeline progression; reader resolves whichever exists (r1 codex F4 MED). 057b uses 057a's coord_emit MCP tool, coord-roles.json + TS daemon loader, deadlines tracker, coord_status surface, and event-type registry as-is — does not modify them.
  - backlog/complete/2026-05-16-057a-coord-substrate-and-observability.md
  - backlog/ready/2026-05-16-057a-coord-substrate-and-observability.md
  - backlog/complete/2026-05-15-057-coord-layer-narrow-append-and-deadlines.md  # Parent monolithic spec (decomposed 2026-05-16). r1-r5 review history captures the design archive.
  - backlog/reviews/2026-05-15-057-coord-layer-narrow-append-and-deadlines/  # r1 through r5 — 21+ findings are the source of truth for AC text below.
  - backlog/complete/2026-05-13-043-per-round-reviewer-roster.md  # AC7 pattern: per-role roster + Python loader. coord-roles.json (in 057a) is the sibling.
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # Cross-tool role pattern. 057b extends emission to the wrapper layer.
  - backlog/complete/2026-05-14-050-worktree-isolation-for-multi-step-main-writers.md  # 050 worktree-isolation: 057b's AC7 wrapper emission happens INSIDE the ephemeral worktree; cleanup trap fires after journal push.
  - tools/review-queue/_run_reviewer.sh  # AC7 touch site. Two-phase emission must wrap the existing tick body, not replace it.
  - skills/review-queue-watch.md  # AC7 touch site (post-push hook).
  - tools/review-queue/request.py  # AC7 touch site (correlation_id field write).
  - tools/review-queue/schemas/request.schema.json  # AC7 touch site (correlation_id required field add).
---

## Why this spec exists

057b activates the substrate that 057a ships dormant. Without 057b:
- 057a's `coord_emit` MCP tool exists but no production code calls it.
- 057a's deadlines tracker initializes but has no events to track.
- 057a's `coord_status()` returns empty open-deadlines and zero-tick last-tick rows.

With 057b:
- The strategist actively spawns reviewers via `coord_invoke` (post-push hook in `review-queue-watch` + `review-pending` skills only — `merge-and-cleanup` and `process-backlog` emission are deferred to a follow-on builder/merger/watcher observability spec per r1 codex-ops F4 MED; closes r2 codex F3 MED motivation/AC7 contradiction).
- The daemon attributes `reviewer_invoked` + `deadline_missed` atoms to the correct `subject_role`.
- Wrappers emit `scheduler_health` + `tick_start`/`tick_end` for both active-spawn and launchd-fallback paths.
- The launchd silent-fail (`_followups.md` HIGH #1 — the motivating incident) becomes observable AND alertable via `coord_status()` within seconds.

The boundary with 057a is **producer vs substrate**: 057b is producer; 057a is substrate. 057b adds exactly one new MCP tool (`coord_invoke`) and one request-frontmatter field (`correlation_id`); it does NOT modify 057a's deadline tracker, event-type registry, `coord_emit`/`coord_status` surface, or `coord-roles.json` schema (r3 codex F3 LOW — earlier wording said "doesn't add MCP tools" which contradicted AC0's own `coord_invoke` introduction; the load-bearing boundary is "no 057a substrate touches").

## Acceptance Criteria

**AC0 — `coord_invoke` MCP tool (with argv-spawn + input validation + pinned-request mode).**

New MCP tool at `src/mcp/tools/coord-invoke.ts`. Required input: `coord_invoke(role, request_path, correlation_id)`. ALL THREE parameters required (r4 codex F2 HIGH + r4 codex-ops F2 HIGH).

The daemon:

1. **Spawns the reviewer wrapper** at `<REPO_ROOT>/tools/review-queue/run-<role>-reviewer.sh` (r1 codex F3 HIGH — re-uses existing `_run_reviewer.sh` plumbing for prompt routing, log redirect, codex argv assembly, env handoff). 057a's `coord-roles.json` `invoke_command` argv is NOT what `coord_invoke` spawns directly — that argv targets `codex exec` and assumes the wrapper has already done prompt routing. Instead, `coord_invoke` calls `resolveReviewerWrapperPath(role)` from the new helper module `src/coord/paths.ts` (NEW 057b file — r3 codex F1 + r3 codex-ops F1 convergent HIGH; the r2 patch erroneously suggested `new URL("../../tools/...", import.meta.url)` from `src/mcp/tools/coord-invoke.ts`, but that path resolves to `<repo>/src/tools/...` not `<repo>/tools/...` because the MCP tool module sits at a different depth than 057a's `src/coord/roles.ts`). The helper module:
   - **Lives at `src/coord/paths.ts`** so its `import.meta.url`-based resolution is at the same depth as 057a's `src/coord/roles.ts` (which already correctly resolves `<repo>/tools/review-queue/coord-roles.json`).
   - **Exports `REPO_ROOT`**: computed once at module load via `fileURLToPath(new URL("../..", import.meta.url))` — from `src/coord/paths.ts`, `..` = `src/`, `../..` = repo root. Honors `ECHO_REPO_ROOT` env-var override (for tests + for any future bundled-daemon deployment where the source-tree path math doesn't hold).
   - **Exports `resolveReviewerWrapperPath(role: string): string`**: validates + resolves in this exact order (r4 codex F1 HIGH — `role` was previously interpolated into the path without validation; `../../../../tmp/x`-style values could `path.normalize` outside the reviewer-wrapper directory before the exists-check ran):
     1. **Shape check** (FIRST — before any FS access, before `loadCoordRoles()`): `role` MUST match `^[a-z][a-z0-9-]*$` (canonical reviewer slug — lowercase, starts with letter, no slashes, no shell metacharacters, no path-traversal characters). Reject with structured error otherwise. Shape-invalid roles never reach the roster check, so the "no FS access" property of the malicious-role test (r4 codex F1 HIGH) holds true only for the shape-invalid subset (r5 codex F2 LOW narrowing).
     2. **Roster check** (reached only for shape-valid roles): `role` MUST be present in `loadCoordRoles()` (the 057a TS loader, which reads `coord-roles.json` from disk) AND its entry MUST have `headless: true`. IDE-mode roles (`cursor` with `headless:false`) and unknown roles → structured error AFTER the config read but BEFORE any wrapper-path construction / stat / spawn AND with no MCP side-effects, no atoms appended.
     3. **Path construction**: `const candidate = path.join(REPO_ROOT, "tools/review-queue", `run-${role}-reviewer.sh`);`
     4. **Containment check**: `const resolved = path.resolve(candidate);` and assert `resolved.startsWith(path.resolve(REPO_ROOT, "tools/review-queue") + path.sep)` AND `path.basename(resolved) === `run-${role}-reviewer.sh``. Structured error on mismatch (defense-in-depth: even if shape-check + roster-check both pass, the resolved path must stay in-tree under the reviewer-wrapper directory).
     5. **Existence + executable bit**: `fs.statSync(resolved)` must show a regular file with executable mode; otherwise structured error.
   - **Has its own parity test** in `tests/coord/paths-resolution.test.ts` (NEW r3, extended r4, narrowed r6): asserts `REPO_ROOT` ends in `/Project_echo` (or equivalent canonical root) regardless of daemon's `process.cwd()`; `resolveReviewerWrapperPath("codex")` returns the existing wrapper file; `ECHO_REPO_ROOT` env override is honored. **Malicious-role test split by where they reject** (r6 codex F2 LOW — matches AC0 step 1 sub-step semantics): (a) **Shape-invalid roles** (`"../"`, `"/"`, `"foo/../bar"`, `"foo;rm"`, `"foo bar"`, `""`, `"FOO"`) reject with **NO file-system access AND NO MCP-tool side-effects** (caught by shape regex BEFORE `loadCoordRoles()`); (b) **Roster-invalid roles** (`"cursor"` [headless:false], `"nonexistent"` [not in coord-roles.json]) reject AFTER `loadCoordRoles()` reads `coord-roles.json` from disk, BUT before any wrapper-path construction / stat / spawn / MCP side-effects — i.e. NO `path.join` / `path.resolve` / `fs.statSync` / `coord_emit` atom.
   - The daemon never depends on `process.cwd()`. Roles with `headless: false` in `coord-roles.json` (e.g. `cursor` IDE-mode) have no wrapper and are rejected by `resolveReviewerWrapperPath()` with structured MCP error.
2. **Validates inputs strictly** (r4 codex F2 HIGH security + r3 codex F2 MED uuid4-shape strictness + r4 codex F1 HIGH role-validation):
   - `role` MUST match `^[a-z][a-z0-9-]*$` AND be a known `headless: true` entry in `coord-roles.json` AND its resolved wrapper path MUST stay under `${REPO_ROOT}/tools/review-queue/` with exact basename `run-<role>-reviewer.sh` (full 5-step gate in `resolveReviewerWrapperPath` — see step 1 above; r4 codex F1 HIGH).
   - `correlation_id` MUST match the **canonical uuid4 regex**: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (r3 codex F2 MED — the prior `^[a-f0-9-]{36}$` was too loose; it accepted 36-char strings with no canonical dash positions, no version-4 nibble, no variant `[89ab]` byte). The canonical regex matches what `str(uuid.uuid4())` actually produces while rejecting malformed inputs. The SAME regex lives in `tools/review-queue/schemas/request.schema.json` for cross-tool consistency.
   - `request_path` MUST match `^backlog/reviews/[a-z0-9-]+/r[0-9]+/request\.md$` (no traversal, no shell metacharacters).
   - Reject with structured MCP error on either failure; do NOT spawn anything; do NOT append `coord:reviewer_invoked`.
3. **Wrapper-spawn execution** (r4 codex F2 HIGH + r1 codex F3 HIGH + r2 codex F2 MED + r2 codex-ops F4 HIGH + r2 codex-ops F5 MED + r3 codex F1 + r3 codex-ops F1 convergent HIGH — no shell injection AND no argv-vs-prompt-routing impedance mismatch AND fire-and-forget semantics explicit AND repo-root-stable AND correct path-resolution depth):
   ```typescript
   import { spawn } from 'node:child_process';
   import { REPO_ROOT, resolveReviewerWrapperPath } from '../../coord/paths.js';

   const wrapperAbsolutePath = resolveReviewerWrapperPath(role);  // throws if role unknown/non-headless/wrapper missing
   const child = spawn(wrapperAbsolutePath, [], {
     shell: false,                                    // r4 codex F2 HIGH — no shell injection
     detached: true,                                  // fire-and-forget; child outlives daemon-request lifetime
     stdio: 'ignore',                                 // r2 codex F2 MED + r2 codex-ops F5 MED — no inherited pipe; daemon never blocks on undrained child output; wrapper opens its own log redirect inside the body
     cwd: REPO_ROOT,                                  // r2 codex-ops F4 HIGH — child sees repo root regardless of daemon cwd; wrapper's `git` commands hit the right checkout
     env: {
       ...process.env,
       ECHO_REVIEW_QUEUE_REPO_ROOT: REPO_ROOT,        // r2 codex-ops F4 HIGH — wrapper honors this per 050 worktree-isolation contract
       ECHO_COORD_REQUEST_PATH: request_path,
       ECHO_COORD_CORRELATION_ID: correlation_id,
     },
   });
   child.on('error', (err) => {                       // r5 codex-ops F1 HIGH — async 'error' events (EMFILE, EAGAIN, wrapper removed between stat and exec, bad shebang) are process-fatal without a listener; the daemon MUST NOT crash on a failed reviewer spawn
     // Record the spawn failure to the operator surface; do NOT throw.
     // - log structured: `{ event: 'coord-invoke-spawn-error', role, request_path, correlation_id, error: err.message }`
     // - do NOT retract the already-appended `coord:reviewer_invoked` atom (the pre-spawn deadline will fire `deadline_missed` naturally, which is the correct operator signal — the wrapper didn't run)
     // - return from this handler without re-throwing; the daemon's event loop continues
   });
   child.unref();                                     // r2 codex F2 MED + r2 codex-ops F5 MED — daemon's event loop doesn't retain the child handle; coord_invoke returns promptly
   ```
   Pinned-request mode is signaled to the wrapper purely via the two `ECHO_COORD_*` env vars — no command-line change. The wrapper's existing body (set REVIEWER_NAME, ephemeral worktree creation, codex exec, log redirect) runs unchanged. Argv-vs-shell hardening still applies: the wrapper path is a fixed string (no path traversal possible since validated to be the canonical resolution), the env-var values are pre-validated regex matches, and `shell: false` ensures no expansion. The r4 codex F2 security guarantee holds. **Async spawn-error handling** (r5 codex-ops F1 HIGH): the `child.on('error', ...)` listener is mandatory BEFORE `child.unref()` — Node emits spawn/exec failures asynchronously, and an unhandled 'error' event on a ChildProcess is process-fatal. The listener logs the failure to the operator surface and returns without re-throwing; the pre-spawn `reviewer_invoked` atom stays in the ledger so 057a's deadline tracker fires `deadline_missed` for the failed spawn (the correct operator signal — the wrapper never ran).
4. **Causality-safe `reviewer_invoked` emission** (r5 codex-ops F1 HIGH): the daemon appends `coord:reviewer_invoked` atom SYNCHRONOUSLY BEFORE returning to the caller — meaning before the spawned child can possibly emit `tick_start`. The contract: by the time `coord_invoke` returns, the `reviewer_invoked` atom is durable in the ledger AND the deadline tracker has opened the pre-spawn record. Concrete ordering in code:
   - daemon validates inputs
   - daemon appends `reviewer_invoked` atom (single-writer; durable)
   - daemon opens the pre-spawn deadline in the tracker
   - daemon `subprocess.spawn(argv, { shell: false })` — fire-and-forget
   - daemon returns success to caller
   - The child wrapper starts running; ANY `tick_start` it emits cannot precede the `reviewer_invoked` atom in replay order.
5. **Pinned-request reviewer mode** (r4 codex-ops F2 HIGH + r5 codex F2 MED roster preservation + r1 codex F2 + r1 codex-ops F3 HIGH convergent — bind-failure path uses tick_start+tick_end(bind_failed), NOT a new `tick_failed_to_bind` event-type): the wrapper receives `ECHO_COORD_REQUEST_PATH=<request_path>` and `ECHO_COORD_CORRELATION_ID=<correlation_id>` as env vars (r5 codex F1 HIGH — env-var handoff is implementable; CLI-flag handoff is not since `codex exec` doesn't expose those flags). When these are set, the reviewer skill's Step 2 (in `skills/review-queue-codex.md` etc.) MUST:
   - Read ONLY the specified `$ECHO_COORD_REQUEST_PATH` (not scan-pick from `backlog/reviews/*/r*/`).
   - Emit `coord:tick_start(subject_role=$MY_REVIEWER, correlation_id=$ECHO_COORD_CORRELATION_ID)` BEFORE the bind-validation block (so 057a's existing close rule fires: `reviewer_invoked.expects = "tick_start"` → tick_start closes the pre-spawn deadline and opens a `tick_start.expects = "tick_end"` record per 057a's coord-roles.json).
   - Validate: file exists; `correlation_id` in frontmatter matches `$ECHO_COORD_CORRELATION_ID`; `requested_reviewers` includes `$MY_REVIEWER` (preserves 043 roster guard per r5 codex F2 MED); no `combined.md` or `<my_slug>.md` already exists.
   - **On bind-validation failure**: emit `coord:tick_end(subject_role=$MY_REVIEWER, correlation_id=$ECHO_COORD_CORRELATION_ID, outcome="bind_failed", reason="request_not_found"|"correlation_id_mismatch"|"role_not_in_roster"|"already_combined"|"already_responded")` and exit non-zero. The `outcome=bind_failed` value is added to AC7's `tick_end.outcome` enum (alongside `completed`/`stale_combined`/`duplicate_response`/`upstream_duplicate`). 057a's tracker closes the open `tick_start` deadline on `tick_end` arrival — no `coord:deadline_missed` false-positive. (r1 codex F2 + r1 codex-ops F3 convergent — closes the cross-spec inconsistency between 057a's `expects`-based close rule and 057b's pinned-request bind-failure path WITHOUT modifying 057a's substrate. The bind-failure cause is preserved in `coord:tick_end.metadata.coord.reason` for `coord_status()` operator inspection.)
   - On success: proceed with the rest of the reviewer protocol (which itself emits `tick_end` on every clean exit per AC7 step 6).
   - Scan-pick remains the launchd-fallback path (when `$ECHO_COORD_REQUEST_PATH` is unset).
6. **Best-effort emission contract** (r1 codex-ops F2 HIGH carried forward): `coord_invoke` callers use bounded HTTP timeouts (2s connect, 5s total) and tolerate non-zero rc without aborting the parent step. Watcher/skill callers wrap in `|| true` equivalent guards. Queue durability stays intact when the daemon is down.

**AC7 — Role emission (wrappers + skills emit coord events).**

Production emission lands in 057b. ALL integration is ADDITIVE — no protocol body changes; only emission lines appended.

**Wrapper transport contract** (r5 codex F1 MED — 057a's identity model makes the wrapper-side HTTP header part of the production emission contract; without pinning, a builder could implement payload-only or native-MCP emissions that look consistent with this spec but get rejected at runtime by 057a's X-Echo-Role gate):

Wrappers (`_run_reviewer.sh`, `run-<role>-reviewer.sh`) and reviewer skills emit coord events via the **same curl-style HTTP transport 057a's AC5 mandates for V1**: POST JSON-RPC `tools/call` for `coord_emit` to `${ECHO_MCP_URL:-http://127.0.0.1:${ECHO_MCP_PORT:-38478}/mcp}`, with `--connect-timeout 2 --max-time 5` and `-H "X-Echo-Role: ${REVIEWER_NAME}"`. Native-MCP emission is NOT supported in V1 (per 057a AC5 — the existing MCP server doesn't expose request headers to tool handlers; native clients would fail the X-Echo-Role check).

**Helper is a repo executable** (r6 codex F1 HIGH — the r5 in-shell-function design was unimplementable because: (a) it was sourced by `_run_reviewer.sh` but `tick_start`/`tick_end` emissions happen inside the reviewer skill steps run by `codex exec` / `claude -p`, a separate shell environment where the parent's bash function is not visible; (b) the JSON-RPC arguments were incomplete vs 057a's `coord_emit` contract which requires top-level `event_type`, `schema_version`, `emitted_at`, `subject_role`, exactly one tier key (`correlation_id` or `tick_run_id`), and optional `payload`). The helper is now a standalone executable at `tools/review-queue/coord-emit.sh`, callable identically from the wrapper, the reviewer skill steps, and any post-push hook in `skills/review-queue-watch.md` etc.:

```bash
#!/usr/bin/env bash
# tools/review-queue/coord-emit.sh — wrapper-side V1 coord event emitter
# Usage: coord-emit.sh <event_type> --correlation-id=<UUID> [--payload='{...}']
#    OR: coord-emit.sh <event_type> --tick-run-id=<UUID>   [--payload='{...}']
# Reads from env: ECHO_MCP_URL, ECHO_MCP_PORT, REVIEWER_NAME (= X-Echo-Role)
# Exit 0 on success OR daemon-down (best-effort; queue durability preserved).
set -u
event_type="${1:?event_type required}"; shift
correlation_id=""; tick_run_id=""; payload="{}"
for arg in "$@"; do
  case "$arg" in
    --correlation-id=*) correlation_id="${arg#--correlation-id=}" ;;
    --tick-run-id=*)    tick_run_id="${arg#--tick-run-id=}"       ;;
    --payload=*)        payload="${arg#--payload=}"               ;;
  esac
done
# Per 057a coord_emit input contract: top-level event_type, schema_version,
# emitted_at, subject_role, exactly one tier key, optional payload.
# r7 convergent HIGH (codex F1 + codex-ops F1): use seconds precision via portable
# BSD/GNU date format. BSD date on macOS launchd does NOT support `%N`; the prior
# `%S.%3N` would render literal `.3NZ` and 057a's coord_emit validator would reject
# every atom (silently — curl `|| true` swallows the failure). 057a canonicalizes
# emitted_at via `new Date(...).toISOString()` which pads seconds → ms server-side.
emitted_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
tier_key="\"correlation_id\": \"${correlation_id}\""
[ -z "${correlation_id}" ] && tier_key="\"tick_run_id\": \"${tick_run_id}\""
curl -sS --connect-timeout 2 --max-time 5 \
     -H "X-Echo-Role: ${REVIEWER_NAME}" \
     -H "Content-Type: application/json" \
     -X POST "${ECHO_MCP_URL:-http://127.0.0.1:${ECHO_MCP_PORT:-38478}/mcp}" \
     -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"params\":{\"name\":\"coord_emit\",\"arguments\":{\"event_type\":\"${event_type}\",\"schema_version\":1,\"emitted_at\":\"${emitted_at}\",\"subject_role\":\"${REVIEWER_NAME}\",${tier_key},\"payload\":${payload}}},\"id\":1}" \
     >/dev/null 2>&1 || true   # r1 codex-ops F2 HIGH best-effort — non-fatal on daemon-down
```

Call sites:
- `_run_reviewer.sh` Phase 1 bootstrap: `tools/review-queue/coord-emit.sh scheduler_health --tick-run-id="${TICK_RUN_ID}"` (then `scheduler_health_done` after bootstrap)
- Reviewer skill Phase 2: `tools/review-queue/coord-emit.sh tick_start --correlation-id="${ECHO_COORD_CORRELATION_ID}"` (then `tick_end` with `--payload='{"outcome":"completed"}'` etc.)
- Pinned-mode bind-failure: `tools/review-queue/coord-emit.sh tick_end --correlation-id="${ECHO_COORD_CORRELATION_ID}" --payload='{"outcome":"bind_failed","reason":"correlation_id_mismatch"}'`

Non-fatal semantics (`|| true`) preserve queue durability when the daemon is unreachable. AC8 fixture `coord-emit-wrapper-transport.test.ts` (NEW r5, extended r6) asserts: (a) wrapper-originated atoms carry `metadata.coord.emitter_role = ${REVIEWER_NAME}` via the X-Echo-Role header; (b) daemon-down does NOT abort the queue tick; (c) **`coord-emit.sh tick_start --correlation-id=...` invocation produces a valid `coord:tick_start` atom that 057a's `coord_emit` validator accepts** — i.e. the JSON-RPC arguments match the full 057a contract (event_type + schema_version + emitted_at + subject_role + tier key) — r6 codex F1 HIGH; (d) `coord-emit.sh scheduler_health --tick-run-id=...` analogously accepted.

**Wrapper two-phase emission** (r2 codex-ops F3 MED scheduler/round distinction; r4 codex-ops F3 HIGH every-clean-exit coverage):

- **Phase 1 — scheduler health (bootstrap-scoped)** (no `correlation_id`; r3 codex-ops F2 MED — scheduler_health represents BOOTSTRAP completion, NOT process lifetime): at log-redirect-open in `_run_reviewer.sh`, emit `coord:scheduler_health(subject_role=<slug>, tick_run_id=<uuid4 generated at process-start>)`. This opens a SHORT-lived deadline (default 120s, max 300s per 057a's coord-roles.json) covering ONLY the bootstrap window (worktree creation, env setup, prompt routing, codex argv assembly — the work the wrapper does before launching `codex exec`). After bootstrap completes and BEFORE the actual review work starts (i.e. right before `codex exec` is invoked, AND for pinned-mode right before bind-validate), emit `coord:scheduler_health_done(subject_role, tick_run_id)`. This decouples scheduler-health-tier (bootstrap, sub-120s) from round-tier (review work, can run 5-15+ min). Without this split, the scheduler_health deadline would fire false `deadline_missed` alerts during every normal long review (r3 codex-ops F2 MED). Round-tier tick_start/tick_end takes over from there.
- **Phase 2 — request-scoped events** (r2 codex F1 HIGH alignment with AC0 step 5):
  - **Launchd-fallback (scan-pick) mode**: after Step 2 selects a candidate, read the candidate's `correlation_id` field; emit `coord:tick_start(subject_role, correlation_id)` BEFORE running the review.
  - **Pinned-request mode** (`$ECHO_COORD_REQUEST_PATH` set): read `$ECHO_COORD_CORRELATION_ID` from env; emit `coord:tick_start(subject_role, correlation_id)` **BEFORE the bind-validation block** (per AC0 step 5). 057a's existing close rule then handles `reviewer_invoked → tick_start` deadline closure regardless of bind-validation outcome. On bind-failure, emit `coord:tick_end(outcome="bind_failed", reason=...)`; on bind-success, proceed to running the review and emit `coord:tick_end(outcome=...)` on every clean exit per the outcome enum below.
  - In both modes: scheduler_health_done is ALREADY emitted by Phase 1 (after bootstrap, before review work starts) per the r3 codex-ops F2 MED split — NOT at process exit. Phase 2 only emits round-tier events (tick_start / tick_end).
- **`tick_end` covers EVERY clean exit after `tick_start`** (r4 codex-ops F3 HIGH; closes the false-`deadline_missed`-on-no-op exit class):
  - `outcome="completed"` — review succeeded; response file committed + pushed.
  - `outcome="stale_combined"` — `combined.md` already existed when wrapper started Step 2.
  - `outcome="duplicate_response"` — local os.link race lost; another wrapper wrote the response first.
  - `outcome="upstream_duplicate"` — pre-push pull found another response landed.
  - `outcome="bind_failed"` — pinned-request validation rejected the request (r1 codex F2 + r1 codex-ops F3 convergent HIGH; closes the cross-spec inconsistency between 057a's `expects`-based close rule and 057b's pinned-request bind-failure path WITHOUT modifying 057a's substrate). The bind-failure cause goes in `metadata.coord.reason` (`request_not_found` | `correlation_id_mismatch` | `role_not_in_roster` | `already_combined` | `already_responded`).
  - Wrapper CRASH before tick_end: intentionally NO terminal event → pre-spawn deadline fires `deadline_missed` per 057a AC3. That's correct behavior for real failures.
- **No-candidate exit (Phase 2 finds nothing):** `scheduler_health_done` was already emitted by Phase 1 after bootstrap completed (per r3 codex-ops F2 MED) — do NOT re-emit (r4 codex-ops F2 LOW — duplicate emission would make `coord_status().last_scheduler_health_done` reflect the no-candidate exit rather than the bootstrap boundary the tier is measuring). For this round, emit NO further coord events: no `tick_start`/`tick_end`, no second `scheduler_health_done`. The launchd-fallback "I ran but nothing to do" case stays cleanly distinguishable from a tick that processed a round by the absence of `tick_start` between scheduler_health and scheduler_health_done in the per-role event stream.

**Internal-emitter daemon attribution** (r2 codex-ops F2 HIGH):

The daemon writes `coord:reviewer_invoked` (from `coord_invoke`) and `coord:deadline_missed` (from 057a's tracker) atoms. These have a `subject_role` field that identifies the role being tracked, distinct from the `emitter_role: "daemon"` field. The atom's `source` field is `coord:<subject_role>` (so per-role `coord_status()` aggregation is correct). AC5's "caller-supplied role is ignored" rule from 057a applies ONLY to wrapper-side `coord_emit` calls — the daemon bypasses the X-Echo-Role check because it IS the authenticated emitter. New module `src/coord/internal-emitter.ts` codifies this.

**Skill-side post-push hooks** (the ONLY legitimate `coord_invoke` call sites per r2 codex F1 + codex-ops F1 convergent HIGH). 057b is scoped to **reviewer-role active trigger only** — builder/merger/watcher lifecycle event types are deferred to a separate spec (r1 codex-ops F4 MED — those event types are not in 057a's registry and `coord_emit` would silently reject them at runtime; rather than amend 057a's registry mid-flight, defer the entire builder/merger/watcher observability surface to a follow-on spec where the registry expansion + event-shape design can be reviewed together):

- **`skills/review-queue-watch.md` Step 3 (b)** after `push-with-retry.sh` succeeds: call `coord_invoke(role=X, request_path=<r<N+1>/request.md>, correlation_id=<from r<N+1>/request.md>)` for each headless reviewer in the next round's `requested_reviewers`. NO `coord:round_combined` emission (deferred per F4 — would require registry entry that 057a doesn't have).
- **`skills/review-pending.md`** after sidecar push: call `coord_invoke` for the next reviewer round (if any). NO `coord:review_pending_*` emission (deferred).
- **`skills/merge-and-cleanup.md`** NO emission in 057b (deferred — `coord:merge_start` + `coord:merge_complete` need their own event-type registry entries in a follow-on spec). The skill's flow is unchanged in 057b.
- **`skills/process-backlog.md`** NO emission in 057b (deferred — `coord:item_claimed` + `coord:item_pushed` are V1.5+). The builder atomic-claim flow is unchanged in 057b.
- **`request.py` is NEVER a `coord_invoke` caller** (r2 codex F1 + codex-ops F1 convergent HIGH). Its only coord-related responsibility is generating + writing the `correlation_id` uuid string to `request.md`. Zero MCP calls. `tests/coord/no-pre-push-spawn.test.ts` asserts this invariant.

**`request.py` + request.schema.json `correlation_id` field** (r3 codex-ops F1 HIGH + r3 codex F2 MED convergent):

- `tools/review-queue/schemas/request.schema.json` extends with `correlation_id: { type: "string", pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" }` as a required field (canonical uuid4 regex per r3 codex F2 MED — version-4 nibble + `[89ab]` variant enforced); existing `additionalProperties: false` constraint preserved. The schema pattern is identical to the `coord_invoke` validator regex in AC0 step 2.
- `tools/review-queue/request.py` generates `correlation_id = str(uuid.uuid4())` at request-write time and includes it in the frontmatter. **The string-rendered form (36 chars with dashes — e.g. `c9b71286-5f67-4a6c-9a5a-ab6ed07ce4ef`) matches the schema pattern AND the `coord_invoke` validation regex from AC0 step 2** (closes r1 codex F1 HIGH — the `uuid.uuid4().hex` form is 32 chars without dashes and would fail both validators; one representation everywhere is the requirement). The example's fourth group starts with `9` (one of `[89ab]`), satisfying the canonical uuid4 variant byte per r5 codex F3 NIT. No MCP call.
- The watcher's `coord_invoke` reads the value from `request.md`; the launchd-fallback wrapper's Phase 2 reads the SAME value. Active-spawn + launchd-fallback share one correlation_id per round → daemon's pre-spawn deadline closes correctly regardless of which path succeeds (the load-bearing test in `tests/coord/correlation-id-shared-active-and-fallback.test.ts`).
- **Backward compatibility:** pre-057 requests on origin/main without `correlation_id` are treated as "no coord-tracked round" — wrapper falls back to scheduler-tier identifiers only (no round-tier deadline opened).

**AC8 — Falsifiable integration tests.**

Each test below is merge-blocking. All assume 057a substrate is in place (so `coord_emit`, `coord_status`, deadlines tracker, registry exist as-is). 057b tests exercise the production-emission path end-to-end.

Test inventory in `files_to_modify` above. Each test maps to a finding from 057's r1-r5 review cycle.

**AC9 — Builder pointer per 046 AC1 + 047 AC3.**

Standard schema use.

## Out of Scope (Don't Drift)

- **NO new MCP tools beyond `coord_invoke`.** 057a shipped `coord_emit` + `coord_status` + the registry; 057b does not modify them.
- **NO daemon-side deadlines tracker changes.** 057a's `src/coord/deadlines.ts` is consumed as-is (the daemon-internal-emitter module in 057b uses 057a's APIs).
- **NO `coord-roles.json` schema additions.** 057a's `invoke_command` argv-array shape is what 057b reads.
- **NO cross-machine support.**
- **NO active-coordinator policy.** 057b emits events; the strategist decides what to do with notifications.
- **NO cursor IDE-mode emission.** Cursor's file-side review path stays unchanged.
- **NO retroactive `correlation_id` injection** for pre-057b requests already in `backlog/reviews/`. Those degrade gracefully to scheduler-tier only.

## After Completion (Strategist Notes)

Post-merge wiki promotion:

- **Update `wiki/operating-model/review-queue-protocol.md`** to flip the coord-substrate lane from "057b — not yet active" to "active." Add a sequence diagram showing the `coord_invoke` → `reviewer_invoked` → wrapper → `tick_start` → review → `tick_end` flow.
- **Update `wiki/architecture/coord-layer.md`** (created by 057a) with the producer-side contract: pre-spawn deadline causality, two-phase wrapper emission, pinned-request mode, internal-emitter attribution model.
- **Close `_followups.md` HIGH #1 launchd silent-fail** end-to-end. The full chain works: founder dispatches r1 → watcher post-push hook calls `coord_invoke` → daemon emits `reviewer_invoked` + opens pre-spawn deadline → if wrapper dies silently, deadline fires `coord:deadline_missed` within ~90s and `coord_status()` shows it.
- **Update memory `project_loop_close_gate.md`** if applicable — operator out-of-band health visibility now exists.
- **Dogfooding verification:** the very NEXT spec dispatched after 057a+057b ship is the empirical test. Run `coord_status()` periodically; assert per-role last-tick timestamps update.
