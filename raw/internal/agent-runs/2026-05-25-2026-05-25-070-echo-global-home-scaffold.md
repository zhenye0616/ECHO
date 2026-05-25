# 2026-05-25-070-echo-global-home-scaffold — agent run log

- **Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Codex builder)
- **Branch:** `agent/echo-global-home-scaffold`
- **Worktree:** `/Users/zhenye/Desktop/Project_echo--echo-global-home-scaffold`
- **Head SHA at handoff:** `9a010eb9471ae43dcf119dc005011b329e533b9f`

## Run 1 (2026-05-25 PDT) — Codex builder

### What was implemented

`9a010eb — 2026-05-25-070: add echo home scaffold`, 5 files, +427/-0:

- **AC1** — `src/echo-home/paths.ts`: added module-load `ECHO_HOME_PATHS` resolution with `ECHO_HOME` override, `~/.echo` fallback, exported onboarding/projects state interfaces, and Ajv validators for both v1 state-file shapes.
- **AC2** — `src/echo-home/scaffold.ts`: added synchronous `ensureEchoHome()` that creates root + `skills`, `roles`, `adapters`, `state`, writes the two initial state files with `writeFileSync(..., { flag: 'wx' })`, treats `EEXIST` as success, and reports only paths created by the current call.
- **AC3** — `src/daemon/index.ts`: daemon now calls `ensureEchoHome()` after PID-lock acquisition and before extractor/MCP startup, logging initialization details when anything is created and downgrading failures to non-fatal `daemon.echo-home` errors.
- **AC4** — `tests/echo-home/paths.test.ts` and `tests/echo-home/scaffold.test.ts`: six new tests cover default path resolution, module-load env override, schema validation, fresh scaffold creation, second-call idempotency/no rewrite, and existing state-file preservation.

### Verification

- `npm test -- tests/echo-home/` → 2 files passed, 6 tests passed.
- `npm run typecheck` → clean.
- `npm run lint` → clean, including `lint:task-state`.
- `npx prettier --check src/daemon/index.ts src/echo-home/paths.ts src/echo-home/scaffold.ts tests/echo-home/paths.test.ts tests/echo-home/scaffold.test.ts` → clean after formatting.
- `git diff --check` → clean.
- `npm test` → 105 files passed, 1 skipped; 1191 tests passed, 21 skipped.
- Manual daemon start with `ECHO_HOME=/private/tmp/echo-070-daemon-manual-1779751360/home`, `ECHO_DATA_DIR=/private/tmp/echo-070-daemon-manual-1779751360/data`, `ECHO_STORAGE=memory`, `ECHO_MCP_PORT=0`: first start logged `echo_home_initialized` with 5 created dirs + 2 created files and started MCP; second start reported `init_count=0` and `started_count=1`.

### Notes

- No ECHO MCP calls were made during this builder run, so no dogfooding journal entry was required.
- The first unprivileged manual daemon attempt hit sandbox `listen EPERM` on `127.0.0.1`; rerun with approved localhost binding verified the daemon behavior.

## Out of scope (didn't drift)

- Did not populate `~/.echo/skills/` or `~/.echo/roles/`.
- Did not write adapter config under `~/.codex`, `~/.claude`, `~/.cursor`, or any other agent-owned directory.
- Did not add onboarding wizard, CLI, project discovery, schema migrations, XDG/Windows path logic, MCP state exposure, or data-dir relocation.
