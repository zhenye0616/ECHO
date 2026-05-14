---
task_id: 2026-05-13-047-codex-as-builder-binding-adapter
role: builder
writer: claude-code-builder
last_updated: 2026-05-14T06:38:41Z
---

## current_thesis

047 is being built by the Claude Code binding (Option B — existing-binding-build), chosen by the founder over Option A (codex-bootstrap recursive dogfooding) at the moment of `/process-backlog` invocation post-strategist `/clear`. Five concrete deliverables on `agent/codex-as-builder-binding-adapter`: AC1 wrapper at `tools/backlog/run-codex-builder.sh`, AC2+AC3-contract+AC6 "Binding-specific notes — codex" section appended to `skills/process-backlog.md` (synced to `.claude/commands/process-backlog.md`), AC4 three-case integration tests at `tests/backlog/run-codex-builder.test.ts` + mock at `tests/backlog/fixtures/mock-codex.sh`, and this pointer. AC5 measurement is observational and deferred to merge time by the strategist + founder. AC7 is doc-only inside the spec body — no code or skill changes.

## locked_decisions

- All 7 ACs implemented as specified; no scope expansion.
- Wrapper invocation has a `.sh`-suffix branch on `CODEX_BIN`: production path (`CODEX_BIN=codex`, a real binary) uses the AC1 spec form `exec -a codex codex exec -C ... --sandbox danger-full-access -`; test path (`CODEX_BIN` ends with `.sh`) sources the mock inside `bash -c` so the mock observes `$0="codex"`. Shebang re-exec on macOS/Linux strips `exec -a` argv[0] overrides from shebang scripts — empirically verified — so the discriminator is the minimum-cost concession to satisfy AC4 (a)'s "argv[0]=codex" assertion against a shebang fixture. Production semantics are unchanged from the spec.
- `ECHO_BUILDER_LOCK_DIR` is exported by the wrapper so the mock-codex.sh fixture can record lock-dir presence at invocation time (AC4 case 1 assertion e). Production-irrelevant; test-only readers.
- AC3 builder.md uses plain `git add` + `git commit` + `git push` (no CAS) per single-owner invariant — applies to the codex-builder future invocations AND to this Claude-Code-builder cycle. This file is the first concrete builder.md written under the schema.
- AC5 §1 measurement was completed by the strategist pre-claim (PASS — 0 MCP / ~175 lines / <60s); §3 codex-side token counts + §3-cursor qualitative + §5 founder activations are merge-time observations.

## open_questions

- None blocking. All 7 ACs verified locally (`npm test` for the new file passes 3/3; full suite + lint + typecheck + sync-skills --check to follow before push).

## dont_touch

- `wiki/` — only strategist edits, only post-shipment (per `CLAUDE.md` + `wiki/principles/drift-prevention.md`).
- `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md` — founder-owned.
- `raw/internal/dogfooding/role-typed-state-comparison-047.md` and its HTML twin — strategist owns AC5 measurements; merge-time observational fills, not builder work.
- `backlog/task-state/2026-05-13-047-.../strategist.md` — strategist-owned writer; this builder writes only `builder.md`.
- `tools/task-state/push-round-state.sh` — explicitly Out of Scope per spec; do not generalize to `builder.md` writes. `builder.md` is single-owner; no CAS needed.
- Launchd job for codex-builder, headless Claude Code reviewer, multi-machine builder coordination, builder retry semantics beyond `skills/process-backlog.md`, cross-tool protocol body, retroactive 046 builder.md, `claimed_by` schema rename, `raw/internal/queue-errors/` aggregator — all Out of Scope per spec.

## canonical_anchors

- spec: backlog/claimed/2026-05-13-047-codex-as-builder-binding-adapter.md
- reviews: backlog/reviews/2026-05-13-047-codex-as-builder-binding-adapter/
- branch: agent/codex-as-builder-binding-adapter
- worktree: ~/Desktop/Project_echo--codex-as-builder-binding-adapter/
- run_log: raw/internal/agent-runs/2026-05-13-2026-05-13-047-codex-as-builder-binding-adapter.md (will be written at handoff)
