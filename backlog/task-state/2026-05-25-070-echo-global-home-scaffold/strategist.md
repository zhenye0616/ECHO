---
role: strategist
task_id: 2026-05-25-070-echo-global-home-scaffold
written_at: 2026-05-25T22:55:00Z
written_by: strategist-070-r1-watcher
---

## current_thesis

070 is the foundation spec for the ECHO Pro coord layer — a paid-tier directory tree at `~/.echo/` that 071 (role TOMLs), 072 (adapter sync), 073 (onboarding wizard), 074 (`echo` CLI), and 075 (first demo) all build atop. This item ships ONLY the empty scaffold + state-file schemas + daemon-aware path module. No skills are populated (072's job), no roles (072 copies from `assets/echo-roles/`), no wizard, no CLI. The deliverable is the well-typed, atomically-creatable directory tree that everything else slots into. r1 reviewers (codex + codex-ops) converged on `proceed_after_patches` with the atomic absent-only state-file write as the load-bearing operational invariant.

## locked_decisions

- `~/.echo/` is the canonical home, overridable via `ECHO_HOME` env (matching `ECHO_DATA_DIR` precedent at `src/daemon/lifecycle.ts:18-22`).
- `src/echo-home/paths.ts` is the **sole** module that knows the layout. Every other consumer imports `ECHO_HOME_PATHS`. No path reconstruction elsewhere.
- `OnboardedAgentProfile` (this spec) is deliberately distinct from 072's `AdapterSyncProfile`. Collision avoidance is load-bearing because both types live under `src/echo-home/`.
- Atomic absent-only state-file write uses `writeFileSync(path, json, { flag: 'wx' })` (Node's `O_CREAT | O_EXCL`). On `EEXIST`: treat as success. No check-then-write. No temp-file-plus-rename (rename would overwrite). This is the only durability mechanism for first-create idempotency under interrupted-write + concurrent-first-create races.
- `ensureEchoHome()` is called from the daemon AFTER PID-lock acquisition, BEFORE extractors + MCP server start. Failure is non-fatal (log + continue) — substrate (free tier) doesn't require `~/.echo/`.
- Skills + roles directories are created EMPTY in 070. Populating them is 072's responsibility. 070 does not copy any files into them.

## open_questions

- None remaining at r1. The atomic absent-only invariant was tightened in r1 patches; the `ajv` import allowlist was clarified; the AC4 test count was made consistent with `mkdtempSync` semantics.

## dont_touch

- The substrate (free tier) capture path. `~/.echo/` is paid-tier surface only; the daemon must continue to start cleanly when `ensureEchoHome()` fails (e.g., readonly filesystem, exotic homedir).
- 072's `~/.echo/skills/` and `~/.echo/roles/` population. 070 creates empty directories; do NOT pre-populate.
- The existing daemon bootstrap order. `ensureEchoHome()` slots into a specific seam (post-PID-lock, pre-extractors); don't reorder.

## canonical_anchors

- spec: backlog/ready/2026-05-25-070-echo-global-home-scaffold.md
- reviews: backlog/reviews/2026-05-25-070-echo-global-home-scaffold/
- parent design: raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md
- daemon integration point: src/daemon/index.ts (post-PID-lock seam)
- resolution-rule precedent: src/daemon/lifecycle.ts:18-22 (resolveDataDir pattern)
