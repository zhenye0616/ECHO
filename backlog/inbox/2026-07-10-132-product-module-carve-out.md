---
id: 2026-07-10-132-product-module-carve-out
title: "Product module carve-out v0: relocate the customer-facing meeting→decision loop (code + tests) under src/product/ with a module-only composition root (`echoctl product daemon`) and an enforced import boundary"
status: inbox            # PARKED — `inbox` is NOT a kanban stage and is NOT scanned by tools/blocked.py. This is a large pure-move diff across the live Station-2 demo path; promotion gate = YC demo done (promote backlog/inbox/ → backlog/ready/ on or after 2026-07-25, founder call). Spec review via the review queue runs WHILE parked so the item is convergence-complete at promotion.
priority: HIGH
estimate: 1.5d
created: 2026-07-10
blocked_by: []           # Intentionally empty — the gate is the manual promotion gate above (a calendar/demo condition, not an item; per the parked-spec inbox convention, do not fake a no-code gate item).
task_state_ref: ""
requested_reviewers: ["codex", "codex-ops"]
spec_refs:
  - CLAUDE.md                                        # operating model; V1 scope; drift-prevention rules
  - src/daemon/index.ts                              # current composition root — starts EVERYTHING unconditionally; the product daemon subtracts, never changes, this
  - src/capture/surfaces/granola-poller.ts           # moves (capture side of the loop)
  - src/enrich/granola-signals.ts                    # moves (extraction)
  - src/enrich/post-meeting-brief.ts                 # moves (brief compile)
  - src/enrich/granola-intake-candidates.ts          # moves (actionable-items bridge, item 109/123)
  - src/enrich/granola-intake-seed-store.ts          # moves
  - src/surfaces/ceo-slack-responder/                # moves wholesale (decision propose-confirm gate, changeset compiler, Linear client — items 130 lineage)
  - src/enrich/dispatch.ts                           # STAYS — enrichment composition glue (composes product + dev workers); allowed product-importer
  - src/enrich/worker-heartbeat.ts                   # STAYS kernel — shared by product workers AND decision-drift AND doctor
  - src/normalize/adapters/granola.ts                # STAYS kernel — normalize adapter registry is shared substrate across all sources
  - eslint.config.js                                 # currently TS-recommended only; the boundary fence does not exist yet (codex consult 2026-07-10)
  - vitest.product.config.ts                         # `test:product` = ALL non-orchestration tests; semantics PINNED unchanged (AC5)
  - package.json                                     # bin, files allowlist, scripts
  - tests/packaging/packed-manifest.test.ts          # tarball manifest snapshot — dist paths change; deliberate update (AC6)
  - .github/workflows/ci.yml                         # CI gate = typecheck + lint + build:cli + test:product; NO workflow change expected
files_to_modify:
  # PROVISIONAL — builder refines, no scope expansion. Everything below is either a git mv, an import-path
  # rewrite, or one of the named NEW files. NO logic edits anywhere else (AC1 pure-move contract).
  - src/product/**                                   # NEW home: capture/granola-poller.ts, extract/granola-signals.ts, brief/post-meeting-brief.ts, intake/{candidates,seed-store}.ts, surfaces/decision-responder/** (from ceo-slack-responder/), cli/brief.ts
  - src/product/daemon.ts                            # NEW: module-only composition root
  - src/product/index.ts                             # NEW: curated public export surface for non-product consumers
  - src/cli/index.ts                                 # wire `echoctl product <daemon|brief>`; keep top-level `echoctl brief` alias
  - src/cli/commands/product.ts                      # NEW: subcommand dispatcher (thin; composition root)
  - src/daemon/index.ts                              # import-path updates only
  - src/enrich/dispatch.ts                           # import-path updates only
  - eslint.config.js                                 # boundary fence (AC3/AC4)
  - package.json                                     # add `test:product-module` script; verify files allowlist ships dist/product/**
  - tests/product/**                                 # moved test files (mirrored), zero assertion changes
  - tests/product/boundary-import-closure.test.ts    # NEW (AC3)
  - tests/product/daemon-smoke.test.ts               # NEW (AC2)
  - tests/packaging/packed-manifest.test.ts          # snapshot update for dist/product/** paths (AC6)
---

## Context

ECHO is phasing its rollout: the meeting → decision-extraction → brief → actionable-items loop has live external demand (lab-pilot advisor loop ran 2026-07-09; items 104/109/112–115/123/130/131 lineage), while the machine-scoped dev capture (Cursor/Claude Code/Codex extractors, MCP server, coord layer) benefits only the founder today. The founder wants the customer-facing part carved into a bounded module **inside the same repo and same package.json** (one dependency surface), runnable standalone, so the wedge can be rolled out — concierge-run first — without shipping the rest of ECHO.

Naming was settled through two rejection rounds (`recap` = artifact-named, dies when intake/decisions outgrow summaries; `align` = names the problem being solved, not the shipping part) and two codex consults (2026-07-10, both adopt-with-caveats; all caveats are ACs below). **`product`** encodes the durable axis — client-facing/shippable vs dev-internal — and matches existing repo vocabulary (`wiki/product/`, `vitest.product.config.ts` already draw a product-vs-orchestration line). Codex confirmed no repo tooling special-cases `src/product` and found no stronger alternative.

Design decisions locked in conversation (founder-approved 2026-07-10):
- **Shared kernel, shared db.** `storage/`, `brain/`, `echo-home/`, `logging/`, `guards.ts`, `util/`, `capture/{gate,pipeline,sources}.ts`, `normalize/`, `daemon/lifecycle.ts` stay put; product imports kernel, never the reverse. Same SQLite db, no schema changes.
- **Pure move.** This item is `git mv` + import rewrites + composition root + fence. Zero behavior change. Ports/adapter interfaces are item 133, deliberately separate so the mechanical diff and the semantic diff stay independently reviewable.
- **Parked until post-demo.** This diff crosses the live Station-2 demo path; it does not land before the 2026-07-24 demo.

## Acceptance Criteria

- **AC1 (pure-move contract):** the modules listed in spec_refs relocate under `src/product/**` via `git mv` (history preserved — `git log --follow` resolves each moved file). The ONLY in-file edits in moved files are import-path rewrites. The full existing test suite passes with **zero assertion changes** in moved tests (path/import updates only). `npm run typecheck`, `lint`, `build:cli`, `test:product` all green.
- **AC2 (module composition root):** NEW `src/product/daemon.ts` starts ONLY: storage open + granola poller + signals worker + intake bridge + decision responder. No fs/git watchers, no dev-tool extractors, no MCP server, no coord. Exposed as `echoctl product daemon`. It acquires the **same pid lock** (`resolveDataDir()` conventions) as the full daemon, so the two cannot run concurrently against one db — attempting to start it while `com.echo.daemon` runs fails loud with a message naming the conflict. `echoctl product brief` is added; top-level `echoctl brief` remains and produces byte-identical output (demo path unbroken). The full `echoctl daemon` behavior is unchanged — same workers, now imported from new paths. Smoke test: product daemon starts and stops cleanly against a scratch ECHO_HOME, and the set of workers it registers is exactly the five named above.
- **AC3 (boundary fence + closure test):** ESLint `no-restricted-imports` (or equivalent zone rule) added: `src/product/**` may import only the kernel dirs named in Context, node builtins, and declared deps — and may NOT import `capture/extractors/**`, `capture/surfaces/**` (fs/git watchers), `mcp/**`, `coord/**`, `trace/**`, `reasoning/**`, `daemon/index.ts`. A NEW import-closure test walks the transitive import graph of `src/product/**` (relative `.js` specifiers included) and asserts the closure contains no forbidden dir — this test, not the lint rule alone, is the enforcement of record (codex consult: existing import-closure tests do NOT cover this boundary).
- **AC4 (inward fence):** non-product code imports product only via `src/product/index.ts` (curated public surface) or the named composition roots: `src/daemon/index.ts`, `src/enrich/dispatch.ts`, `src/cli/**`. Enforced in the same lint config; the closure test's inverse walk (grep-level is acceptable) asserts no other `../product/` deep imports exist.
- **AC5 (test relocation + gate semantics pinned):** meeting-loop tests move to mirrored `tests/product/**` paths in the same commit-series as their sources. `vitest.product.config.ts` semantics are UNCHANGED: `test:product` continues to mean **all non-orchestration tests** (its exclude list is untouched) — it must NOT be narrowed to the new subtree now or later; a comment pinning this lands in the config. NEW convenience script `test:product-module` runs only `tests/product/**`.
- **AC6 (packaging is deliberate, not incidental):** `package.json` `files` allowlist and the packed-manifest snapshot are updated for `dist/product/**`; the packed tarball's file SET is identical modulo path prefixes — nothing newly shipped, nothing dropped. `tests/packaging/**` green; the manifest diff is quoted in `agent_notes`.
- **AC7 (no persisted-semantics drift):** zero changes to: db source strings (`api:granola`, `derived:granola-signals`, `derived:intake-cards`, `derived:team-decisions`, …), dedupe_key formats, checkpoint file paths, ECHO_HOME layout, env var names, the `com.echo.daemon` launchd label. No `product:*` identifiers are minted in any persisted namespace. (Future `com.echo.product.daemon` launchd install is a separate item — noted, not built; launchd migration is operational state, not a rename.)

## Out of Scope (Don't Drift)

- Ports/adapter interfaces (`MeetingSource`, `ChatChannel`, `Tracker`) — item 133, blocked on this one.
- Zoom / Mattermost / any second adapter; any lab-pilot-specific config.
- npm workspace split, separate publishable package, separate repo — phase-2, only when a customer self-installs.
- Moving `decision-drift.ts`, `dispatch.ts`, `worker-heartbeat.ts`, `normalize/**` — they stay put (dev-side / shared kernel).
- Any behavior, schema, prompt, or output change anywhere. Any launchd installer work.
- Renaming `test:product` or restructuring vitest configs beyond the pinned comment + new script.

## After Completion (Strategist Notes)

Wiki (post-merge): new `architecture/product-module-boundary.md` (the fence, the kernel list, the composition-root allowlist, naming rationale incl. both codex consults); update `architecture/system-architecture.md` paths; update `surfaces/mcp-server.md`-adjacent pages only where file paths are cited. Update `docs/AGENT_INSTRUCTIONS.md` if the fence changes builder rules. Promote item 133 to ready. Follow-on items to spec later: `com.echo.product.daemon` launchd unit + install story (needed for first non-concierge run), product-module CI job split (only if/when workspace split happens).
