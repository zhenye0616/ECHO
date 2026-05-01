---
id: 2026-04-30-015-mcp-integration-test
title: Cursor + Claude Code MCP integration test (first end-to-end demo)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-04-30
spec_refs:
  - wiki/entities/mcp-server.md
  - wiki/sources/v1-spec.md
blocked_by:
  - 2026-04-30-014-mcp-search-memories
acceptance:
  - "User-facing setup documentation at `docs/mcp-integration.md` covering: how to add ECHO's MCP server to Cursor's settings; how to add it to Claude Code's settings; troubleshooting (port in use, daemon not running, no results)"
  - "Smoke-test script at `tools/mcp-integration-smoke.sh` that runs the daemon, sends a `tools/list` and `tools/call search_memories` request via curl, asserts expected response shape"
  - "Manual verification (founder during review): from a real Cursor session, configure ECHO's MCP, ask a question that should trigger search_memories, observe the tool being called, observe the result improving the response. Document with a brief paragraph in `agent_notes` describing what was asked and what surfaced."
  - "Manual verification: same for Claude Code"
  - "If either client cannot be configured cleanly, escalate (don't paper over it) — the demo arc depends on this working"
  - "`docs/mcp-integration.md` includes an example query that demonstrates the value (e.g., \"What were we discussing about pricing last week?\")"
files_to_modify:
  - docs/mcp-integration.md
  - tools/mcp-integration-smoke.sh
  - docs/STATUS.md (record the milestone)

claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-01T06:00:00Z"
branch: "agent/mcp-integration-test"
worktree: "~/Desktop/Project_echo--mcp-integration-test"
head_sha: "8517962123351367310a959260fd35a4ce253cc5"
pr_url: ""
agent_notes: |
  Shipped docs/mcp-integration.md (Cursor + Claude Code setup, verification
  walkthrough, troubleshooting, example query) and tools/mcp-integration-smoke.sh
  (curl-based MCP handshake → tools/list → tools/call search_memories, asserts
  shape, exits 0/1 with clear stderr). Smoke script verified empirically against
  a live `npm run daemon` (RC=0) and against a not-running port (RC=1).

  Lint + typecheck clean. `npm test` baseline-flaky on chokidar lifecycle tests
  (same pre-existing race observed in item 014; this item touches zero
  TypeScript so the flake is independent of my work — confirmed by reproducing
  the flake with only the chokidar test files in isolation).

  THREE JUDGMENT CALLS DEFERRED TO YOU (full reasoning in run log):
    1. The Vitest test for the smoke script (acceptance #3) was NOT added.
       Adding tests/tools/mcp-integration-smoke.test.ts would create a file
       outside files_to_modify (drift). Suggest you either authorize the
       test file in a follow-up item or append it to files_to_modify and
       re-claim.
    2. `docs/STATUS.md` was NOT touched. AGENT_INSTRUCTIONS.md
       "What You Must Not Write" forbids agents from editing STATUS.md
       (founder-only, "founder updates Friday"). The acceptance criterion
       conflicts with the operating manual; I followed the operating
       manual. Suggest you write the milestone entry yourself.
    3. Manual verification (Cursor + Claude Code in real client sessions)
       is founder work by the spec ("Manual verification (founder during
       review)"). Run the smoke script first, then drive the documented
       walkthrough through each client and record findings in review_notes.
       If a client cannot be configured cleanly, the spec says ESCALATE
       (don't paper over).
review_notes: ""
---

# Cursor + Claude Code MCP integration test (first end-to-end demo)

## What

The first item with substantial *manual* acceptance. Items 006–014 produced a daemon that captures conversations + commits and exposes them via an MCP `search_memories` tool. This item proves the loop closes from the user's actual AI clients.

Three deliverables:

1. **Setup documentation** (`docs/mcp-integration.md`) — concrete steps for the founder (and eventually external users) to add ECHO's MCP server to Cursor and Claude Code. Includes troubleshooting.
2. **Smoke-test script** (`tools/mcp-integration-smoke.sh`) — automated check that the MCP server is reachable and the `search_memories` tool returns sensible results. Run from a terminal, no client needed.
3. **Manual verification** — the founder, during review, configures both Cursor and Claude Code with ECHO's MCP, asks a real question, and verifies the AI's response now reflects ECHO-retrieved context. Documented in `agent_notes`.

If steps 1+2 are clean but step 3 doesn't actually work in a real client (e.g., Cursor's MCP config doesn't accept HTTP servers, or the AI doesn't invoke the tool), the agent escalates rather than papering over it.

## Why

This is the milestone that the V1 spec week 4–5 commitment points to: **end-to-end demo to founder with Cursor + Claude Code.** Without this verification, every prior item is theoretical. With it, the killer demo's underlying mechanics are real, and the rest of V1 (GitHub, Slack, hotkey overlay, audit page) is layering features onto a working spine.

It's also the first time the founder *uses ECHO* as a user, not as a builder. The dogfooding loop — which the V1 spec calls a non-negotiable quality gate — starts here.

## Acceptance Criteria

- [ ] `docs/mcp-integration.md` exists and contains:
  - **Cursor setup**: the exact JSON snippet to add to Cursor's MCP config; where Cursor's config file lives on macOS; how to verify the server appears in Cursor's MCP tool list
  - **Claude Code setup**: the equivalent for Claude Code
  - **Verification steps**: a 5-minute walkthrough — start daemon, configure client, send a test question, expect ECHO-retrieved context in the response
  - **Troubleshooting**: port already in use, daemon not running, no results returned, MCP server not appearing in client
  - **Example query that demonstrates value**: a concrete prompt the user can try first, framed to trigger meaningful retrieval (e.g., a question whose answer benefits from prior conversation context)
- [ ] `tools/mcp-integration-smoke.sh` (executable bash):
  - Checks daemon is running (PID file or `curl http://127.0.0.1:38478/mcp`)
  - Sends a raw HTTP MCP `tools/list` request; greps for `search_memories`
  - Sends a `tools/call` for `search_memories` with `{ limit: 3 }`; checks the response is JSON with a `matches` array
  - Exit 0 on success; exit 1 with a clear stderr message on failure
- [ ] Script is also tested in CI-style: a Vitest test that runs the script and asserts exit 0, against a daemon spawned in the test
- [ ] **Manual verification (founder runs during review):**
  - **Cursor:** open Cursor; add ECHO's MCP per the docs; restart Cursor if needed; send a real question that has answerable context in storage; observe Cursor's response. Record in `agent_notes`: what was asked, did Cursor invoke `search_memories`, did the response include ECHO-retrieved context, was the context relevant.
  - **Claude Code:** same flow. Record in `agent_notes`.
  - If either fails, escalate.
- [ ] `docs/STATUS.md` updated: this is the week's milestone. The founder's report on the verification goes here too (or in a linked weekly-changelog entry).

## Out of Scope (Don't Drift)

- **Other MCP clients** (Claude Desktop, Continue, etc.) — only Cursor + Claude Code for V1
- **Tool installer / one-click setup** — manual config is fine for V1; user is technical
- **Pretty UI for the MCP server status** — V1.5 audit-page shows it
- **Cross-platform setup docs** (Linux, Windows) — macOS only
- **Embedding-based retrieval improvements** — only what 014 ships
- **Adding new MCP tools** — only `echo_ping` and `search_memories` for V1
- **Auth / API keys** — loopback-only, no auth in V1
- **Performance benchmarks** — anecdotal latency observations are fine for the founder's notes; formal perf testing is V1.5
- **Founder's actual product feedback (NPS, qualitative)** — this is acceptance verification, not validation research; product feedback rolls into the V1 validation experiments separately
- **GitHub / Slack / web AI integration** — Wave 4
- **Hotkey overlay** — separate Swift-shim wave

## After Completion (Strategist Notes)

This is a milestone item. When it lands in `backlog/complete/`, the strategist's tasks expand beyond just wiki updates:

1. **Big update to `wiki/sources/v1-spec.md`:**
   - The "killer demo" section: Layer 3 Pull mode is now operational for the two AI MCP clients in the bundle
   - Update the "Sequencing" table: weeks 1–3 substrate ✓, weeks 4–5 MCP demo ✓ (or whatever week we land on)
2. **Create `wiki/analyses/wave-1-2-3-retrospective.md`** capturing what was learned across the substrate skeleton + bring-to-life + MCP-demo waves:
   - Where small items helped vs. hurt
   - Where the operating model (idempotency, blocked_by, batch mode) paid off
   - Where it didn't (hidden assumptions, escalations that took multiple rounds)
   - What this implies for Wave 4 (extension upgrade, GitHub/Slack integrations, audit page)
3. **Update `docs/NORTH_STAR.md`** if any of the brand-promise commitments need re-stating in light of what shipped
4. **First public weekly-changelog entry** with substantive product content rather than infrastructure: "ECHO V1 substrate is alive — Cursor and Claude Code now share unified memory via MCP. Try asking about prior conversations." Per V1 spec, the public changelog runs from week 1; this is the first entry the cohort would actually find interesting.
5. **Trigger the next strategic conversation:** Wave 4 sequencing decisions (extension upgrade vs. GitHub vs. audit page vs. hotkey). Based on dogfooding observations during 015's manual verification, one of those will be the obvious next priority.
6. Update manifest + index
