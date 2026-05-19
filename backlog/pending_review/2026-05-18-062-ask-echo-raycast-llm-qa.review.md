---
item_id: 2026-05-18-062-ask-echo-raycast-llm-qa
verdict: merge with founder fixups
reviewed_at: 2026-05-19T05:50:00Z
amended_at: 2026-05-19T06:33:00Z
amended_head_sha: 30e124d0020da888713b4ea032bc74e0967b394c
amended_note: |
  Empirical dogfood at 06:21 PDT surfaced that Raycast's Node runtime hands
  the extension process.env.PATH=undefined, so the AC4 preflight `which`
  failed for both default profiles even when /usr/local/bin/codex was on
  disk. Patched on the agent branch in commit 30e124d: resolvePathEnv()
  fallback + spawn/which env wiring + 3 new tests. Sidecar verdict
  unchanged; the patch is strictly additive to the reviewed surface.
test_counts: { passed: 1140, failed: 0, skipped: 21 }
---

## Verdict

Merge with founder fixups. Implementation is high-quality and faithful to the spec at the load-bearing level: monkeypatch wrapper inserted before `register*` calls (AC5 option b), runtime-enumerated daemon test (AC6 round-3 fix), stateful ANSI stripper handling mid-escape boundaries (AC2 round-3), throttled 80 ms flush via `useRef` (AC3), audit fetch with ±2 s padding from `audit.ts` only (AC3), HEAD-probe-counts-405-as-reachable (AC4), pending-eviction no-op (AC5), isError-envelope classification (AC5), full redaction-allowlist projections for all 13 registered tools. Tests are green across both suites; `npx ray build` succeeds; both `tsc --noEmit` runs are clean. Ground-truth SHA matches.

Two narrow items hold this back from "as-is":

1. The agent's `BLOCKED` escalation (manual ⌘⇧A flow + `customCommand` conditional visibility) is correctly out of headless reach and must be exercised by the founder. This is a founder-dogfood condition, not a redo.
2. `tools/raycast-echo/package.json:43–49` ships the `customCommand` textfield always-visible because Raycast's manifest schema has no conditional-visibility primitive — documented in the field description but not enforced. Acceptable for v0.

## Pre-merge fixups

- [ ] **Founder dogfood the 5 manual integration cases before merge or immediately after** (per AC2/AC4 contract — the only items the agent could not run in headless CLI):
  - [ ] Codex profile fires end-to-end on a real question (e.g. "what did I work on yesterday morning?") — streaming chunks land, sidebar populates with ≥1 MCP call, all entries reach terminal status by exit.
  - [ ] Claude profile fires end-to-end on the same question — same checks.
  - [ ] Cancel via ⌘W mid-run → `ps -ef | grep <binary>` shows no subprocess leak after 5 s.
  - [ ] Restart daemon mid-run → documented error path (agent non-zero exit → AC4 footer with stderr tail).
  - [ ] Deliberately set `customCommand` to a non-existent binary, fire ⌘⇧A → AC4 toast appears within 2 s with "Open Raycast preferences" action.

## Expected merge conflicts

- `src/mcp/server.ts` — none (untouched on main since fork point `dae1111`).
- `src/mcp/request-log.ts` — new file, no conflict.
- `tools/raycast-echo/package.json` — none.
- `tools/raycast-echo/README.md` — none.
- `tools/raycast-echo/src/ask-context.tsx`, `lib/{agent-profiles,agent-runner,audit,system-prompt}.ts`, `test/*.test.ts` — all new files.
- `tests/mcp/request-log.test.ts`, `tests/mcp/recent-calls-endpoint.test.ts` — new files.
- Note: main rewrote `tools/raycast-echo/src/search-context.tsx` (Direction-C, +692/-161 in `8d1bc9f`); this branch does NOT touch that file (correct per OoS#11). Zero predicted conflicts.

## Follow-up items (defer, do not block merge)

- Add `AbortController` timeout (~3 s) to `fetchRecentCalls` in `tools/raycast-echo/src/lib/audit.ts` so a hung daemon (slow, not unreachable) falls through to "Audit unavailable" instead of an indefinite "Waiting" sidebar state.
- File a v0.1 backlog item for the Raycast-crashes-mid-run orphan-process recourse — README mentions `pkill -f <binary>`; could ship a `tools/raycast-echo/scripts/cleanup-orphans.sh` once dogfooding shows it matters.
- Investigate whether `pref` ActionPanel toggles can simulate conditional visibility for `customCommand` once enough dogfooding signal exists to justify the work.
- AC9 founder-gate (post-merge): ≥5 journal entries with `**Surface:** Ask ECHO` marker across ≥2 calendar days, ≥1 ✅ and ≥1 🟡/❌. Mechanical grep verification per AC9.

## Acceptance status (detail)

| AC | Status | Evidence |
|---|---|---|
| AC1 | Partial | `tools/raycast-echo/package.json:23–58` registers ask-context + agentKind/customCommand/repoPath; "visible only for custom" not honored by Raycast schema (agent_notes BLOCKED — workaround: description text + inert-when-not-custom in `agent-profiles.ts:31–39`) |
| AC2 | Met | `agent-runner.ts:72–80` (pipe stdio + NO_COLOR/TERM=dumb), `:121–131` (EPIPE catch), `:114–116` (4KB stderr tail), `:89–105` (30s idle / 5min ceiling), `:296–342` (stateful ANSI/CSI/OSC stripper, mid-escape-safe) |
| AC3 | Met | `ask-context.tsx:99–160` (useRef buffer, 80ms throttle, flush-on-exit, audit fetch ±2s from audit.ts only, sidebar at `:210–214`) |
| AC4 | Met | `agent-runner.ts:27–38` (HEAD probe, any response = reachable incl. 405), `:40–55` (which/access existence check), `ask-context.tsx:56–64` toast paths; audit-fetch failure → "Audit unavailable" at `:153–155` |
| AC5 | Met | `src/mcp/server.ts:233–234` (instrumentMcpServer before register*), `:298–302` (recent-calls dispatched before methodNotAllowed), `request-log.ts:36–62` (monkeypatch), `:87` (isError envelope classification), `:85–86, :96–98` (pending-eviction no-op via id lookup), `:135–237` deterministic per-tool projections, all field names `args_shape`/`result_shape` |
| AC6 | Met | `tests/mcp/recent-calls-endpoint.test.ts:109–144` enumerates `client.listTools()` at runtime, asserts one entry per registered tool with ok/error per envelope; `tests/mcp/request-log.test.ts` covers cap-1000, since/until/status, pending-evicted-then-completes, both error paths |
| AC7 | Met | `tools/raycast-echo/README.md` (preferences walkthrough, dogfood template with `**Surface:** Ask ECHO` marker, single-shot/no-follow-up notice) |
| AC8 | Met | Root `tsc --noEmit` clean; root `npm test` 1114 passed/21 skipped; `tools/raycast-echo` `tsc --noEmit` clean; `npx ray build` `built extension successfully` |
| AC9 | Deferred | Post-merge founder-gated — correct |

## Drift findings

None. Diffstat touches exactly the 12 files in `files_to_modify`. `tools/raycast-echo/src/search-context.tsx` (OoS#11) untouched. No new MCP tools (OoS#12). No follow-up affordances or chat-bubble UI in `ask-context.tsx` (OoS#16/17). No persistence (OoS#15). Field names are `args_shape`/`result_shape`, not `_summary` (OoS#18).

## Design-choice judgments

- **`BLOCKED` escalation is correct.** The 5 manual ⌘⇧A integration cases genuinely require a Raycast GUI session. The agent did everything reachable: pure unit tests, daemon integration test, `ray build`, both typechecks. Founder-dogfood condition, not a redo.
- **`customCommand` always-visible workaround is acceptable for v0.** Raycast's manifest preference schema has no conditional-visibility primitive; `required: false` + description text is the documented pattern. The field is inert when `agentKind !== "custom"` per `agent-profiles.ts:31–39`.
- **Monkeypatch over per-callsite refactor is the right call.** Smaller blast radius (zero changes to existing tool files), matches AC5 option (b) explicitly. The daemon test enumerates runtime registrations, so a future tool registered outside the wrapper would be caught.

## Bugs / risks (non-blocking)

- `tools/raycast-echo/src/lib/audit.ts:31–49` — `fetchRecentCalls` has no client-side timeout. If the daemon hangs mid-response (not unreachable, but slow), the sidebar stays "Waiting" indefinitely. Promoted to follow-up.
- `tools/raycast-echo/src/lib/agent-runner.ts:131–142` — `stdoutPump` IIFE catches errors and pushes an `error` event; `close` listener `awaits stdoutPump` at `:148`. Stuck-queue risk if `child.stdout` throws after `close`; unlikely in practice.
- `src/mcp/request-log.ts:85` — `calls.find(...)` on a 1000-entry array is O(n) per completion. Benign (<1 ms) at expected call rates.
- `tools/raycast-echo/src/ask-context.tsx:184` — Cancel action only renders while `isLoading`. After exit, no in-UI way to re-cancel a detached subprocess if it somehow outlives `cancel()`. Matches AC2 (Raycast-crash recovery is `pkill` per README).

## Test counts observed

- Root `npm test`: **1114 passed, 21 skipped** across 99 test files. Includes new `tests/mcp/request-log.test.ts` (7) + `tests/mcp/recent-calls-endpoint.test.ts` (2).
- `tools/raycast-echo` vitest: **23 passed** across 5 test files — `audit.test.ts` (2), `agent-profiles.test.ts` (9), `system-prompt.test.ts` (4), `format.test.ts` (5, pre-existing), `agent-runner.test.ts` (3).
- Root + extension `tsc --noEmit`: clean.
- `npx ray build`: built extension successfully.
- Lint: not configured (no lint script in either `package.json`).
- Ground-truth SHA: `8af996e7646aaab3fd45f8c8ca9e949c16a4e74d` matches expected. Branch forked from `dae1111`; main advanced to `abe1623` via `8d1bc9f` which rewrote only OoS#11 file.
