---
status: shipped
topic: Process
subtopic: Wave Retrospective
aliases:
  - Wave 1-2-3 Retrospective
  - Substrate Wave Retrospective
  - Wave Retrospective
---

# Wave 1–2–3 Retrospective

A process retrospective on the 15-item run (items 001–015) that produced ECHO's V1 substrate: capture surfaces, gate, storage, MCP server, `search_memories`, and the first end-to-end Cursor + Claude Code demo. The point of the page is to make Wave 4 better, not to celebrate Wave 1–3. What's specced here as "operating model" is the [[drift-prevention]] doctrine plus the agent runtime in `docs/AGENT_INSTRUCTIONS.md`, the `backlog/` pipeline, and the slash commands (`/process-backlog`, `/process-backlog-batch`, `/review-pending`, `/merge-and-cleanup`).

## Definition

Three waves' worth of work shipped through the same pipeline:

- **Wave 1 (substrate skeleton, items 001–005):** repo bootstrap, logger, allowlist, gate, storage interface — six pieces of provably-correct-but-doing-nothing scaffolding.
- **Wave 2 (bring to life, items 006–009):** capture pipeline seam, daemon entry + lifecycle, SQLite storage, FS watcher — the substrate starts breathing; the gate's accept-path is exercised in production for the first time at 009.
- **Wave 3 (demo arc, items 010–015):** Cursor extractor, Claude Code extractor, git capture, MCP server skeleton, `search_memories`, end-to-end integration test — the killer-demo loop closes from a real Cursor or Claude Code session through to retrieved context.

Twelve of the fifteen items shipped clean. Two escalated and resumed (002, 008). One escalated and was rewritten before re-claim (010). Zero items shipped silent drift that founder review didn't catch. Operating-model bugs were found and queued for fix in the followups file. The work is materially better than what an undisciplined sequential run would have produced — but the gains were not where the operating model said they'd be.

## 1. Where Small Items Helped vs. Hurt

### Where small helped: the substrate skeleton (001–005)

The substrate items are the cleanest exhibit. Each one has a single concept (logger, allowlist, gate, storage interface), one or two source files, a self-contained test surface. Each landed in under a day with review notes shorter than the spec. Five items, five clean merges, no ambiguity in any review.

The split between **storage interface** (item 005, in-memory only) and **storage implementation** (item 008, SQLite + migrations) is the canonical case. Splitting the interface from the impl meant items 006 and 009 could be built against `Storage` without waiting for SQLite to land — and when SQLite did land, the daemon swap was a one-line `process.env.ECHO_STORAGE === 'memory' ? new MemoryStorage() : new SqliteStorage(...)`. Without that split, items 006/009/008 would have stacked into a single ~3-day monolith with three coupled review surfaces. They didn't.

### Where small hurt: items split below the unit of useful spec

Item 002 (logger) escalated because item 001 (bootstrap) didn't install `@types/node`. The agent halted on a strict-typecheck failure caused by an upstream omission, wrote the escalation, waited. Net: a 20-minute escalation cycle to add a type-only devDependency that the bootstrap item should have included. The fix is captured in commit `e79540b ops: spec-authoring lesson — bootstrap items must include runtime types`. Lesson: when an item depends on a "scaffold" item, the scaffold's `acceptance` must explicitly cover the dependent's needs. Splitting them too small makes the dependency contract implicit.

Item 008 (SQLite storage) escalated for a similar reason — it needed to modify `src/daemon/lifecycle.ts` to wire `storage.close()` into shutdown, but `lifecycle.ts` wasn't in `files_to_modify`. The unblock was a one-line spec edit (`5d69fdc unblock: 008-sqlite-storage — add src/daemon/lifecycle.ts to files_to_modify`). Same pattern: `files_to_modify` is a scope contract, but spec authors keep forgetting to include the test/lifecycle/integration files of dependent modules.

This pattern recurred at item 015: the spec asked for a Vitest harness around the smoke script but didn't list `tests/tools/mcp-integration-smoke.test.ts` in `files_to_modify`. The agent (correctly) declined to write the test file and escalated to the founder. That is exactly the right behavior — but it cost a roundtrip that better-specified `files_to_modify` would have prevented.

### Where atomic claim helped (and where it didn't)

The atomic-claim mechanism (single commit moves `ready/ → claimed/`, push immediately, race the remote) was designed for parallel agents. **In the actual run, parallelism was rare.** Three host identifiers appeared across the 15 items (`MacBook-Pro.local-zhenye`, `Mac.attlocal.net-zhenye`, UUID `78D5AB0F-...`), but reading the `claimed_at` timestamps and the git log shows the work was almost always sequential within an agent: items 006 → 007 → 008 claimed back-to-back over 16 minutes by the same agent, items 010 → 011 claimed sequentially, items 014 → 015 claimed by the same agent over different sessions. The closest thing to a true parallel race was when the 78D5 agent picked up items 010+011 while the `Mac.attlocal.net` agent was finishing 012+013 — but those items had no overlap in `files_to_modify`, so no contention surfaced.

What atomic claim did instead was protect the *resume-after-crash* path. Item 010 was claimed, escalated (chat-storage layout drift), the spec was rewritten, the same item was re-claimed by the same agent UUID, and the resume worked because the frontmatter was the canonical state and the worktree was idempotent. The mechanism is right; we just don't yet have enough concurrent agents to stress it. **For Wave 4 — when extension upgrade, GitHub adapter, Slack adapter, audit page, and hotkey overlay can genuinely run in parallel — this matters more.**

### Serial chains the operating model forced

The blocked_by graph forced honest sequencing in three places:

- **001 → 002 → 003/004/005**: the substrate ladder.
- **006 + 007 + 008 → 009**: capture pipeline + daemon + storage all required before the FS watcher could be alive.
- **013 → 014 → 015**: MCP server skeleton → `search_memories` tool → end-to-end demo.

`tools/blocked.py` (commit `270add8`, 17 tests) made these constraints machine-checkable rather than founder-remembered. No item was claimed against an unmet `blocked_by`. That's a cheap win that paid off most when the strategist was specifying out of order — items 010–015 were specced in a single batch (`46acd1f wave 3: items 010-015 specced`) and the graph kept the agents from picking unbuildable work.

## 2. Where the Operating Model Paid Off

### The founder-as-merger pattern surfaced real issues

The `/review-pending` → `/merge-and-cleanup` workflow is the single highest-leverage piece of the operating model. Every item that landed in `pending_review/` got a sidecar review with a verdict and a fixup list, and the fixups consistently caught real bugs:

- **Item 014 (`search_memories`):** the reviewer caught that `source_prefix` was passed into `WHERE source LIKE ?` without escaping `%`, `_`, or `\`. Fixup applied pre-merge at `src/storage/sqlite.ts:90`. A user with a literal `%` in a source string would have hit unintended LIKE-pattern semantics. This is the kind of bug that ships through a "looks good, merging" review.
- **Item 010 (Cursor extractor):** the `2c01f8b fixup: emit timestamp from assistant bubble createdAt, not mtime` correction landed pre-merge. The fix is small but semantically important — `mtime` is "when the SQLite file was last touched," not "when this turn happened." Wrong field would have skewed every timestamp in storage.
- **Item 015:** the founder caught that the example log line in `docs/mcp-integration.md` was an idealized shape; the real daemon emits `{"timestamp":..., "level":..., ...}`. Cosmetic, but the doc is user-facing and the agent had no way to verify against a live daemon.

These are not pedantic catches; they are bugs the agent wouldn't have caught and that ad-hoc review would have likely waved through. The "founder reads sidecar, applies pre-merge fixups, then merges --no-ff" rhythm is doing work.

### The drift discipline held under pressure

Item 010 is the doctrine's tested-in-the-field example. The spec assumed Cursor stored composer chat in per-workspace `state.vscdb`. The agent did a privacy-respecting schema probe (no chat content into agent transcript) and discovered that per-workspace `cursorDiskKV` row count = 0; chat actually lives in `globalStorage/state.vscdb` keyed by `bubbleId:<composer>:<bubble>`. The temptation, per the run log, was to "just pick a reasonable default and document it in agent_notes" — that would have been silent drift. Instead the agent stopped, wrote `raw/internal/decisions/2026-04-30-DRIFT-cursor-chat-storage-location.md`, escalated, and the strategist rewrote the item to reality before re-claim.

This is exactly what [[drift-prevention]] specifies ("ambiguity not resolved by spec → STOP, log, escalate"), and it cost about 90 minutes of pipeline time. The alternative — agent guesses, ships, founder discovers in dogfooding two weeks later that workspace_id is structurally wrong — would have cost a rewrite of the cursor extractor, the storage queries that key on `metadata.composer_id`, and possibly the MCP tool's filtering. Discipline paid for itself one item in.

### Idempotent resume worked at every escalation boundary

Item 002, item 008, item 010 — three escalations across the run, each with a different shape (missing dep, missing file in scope, spec premise wrong). All three resumed cleanly: same item file in `claimed/`, same branch, same agent UUID picking back up after the human-in-the-loop intervention. The `RESUMING=1` reconciliation path in `process-backlog` was exercised on each. No item was double-claimed, no branch was orphaned, no commit had to be cherry-picked across worktrees. This is hard to appreciate until you've seen it fail; in this run it didn't.

### Batch mode reduced the founder's context-switching

`/process-backlog-batch` (commit `9f8c486`) was the workhorse for the 78D5 agent across items 010, 011, 014, 015. The hard-stop discipline (max items, time budget, escalation, no-candidates, git error) meant the founder could hand the batch session a wave and walk away, returning to a populated `pending_review/` rather than four separate "agent finished, now what?" pings. The cost is sequential within a session — but multi-session parallelism (separate `ECHO_AGENT_ID` per terminal) composes orthogonally, so the upper bound on throughput is unchanged.

## 3. Where the Operating Model Did Not Pay Off (Honest)

### Hidden assumptions in specs were the dominant escalation cause

Three Wave-3 items shipped agent_notes that boil down to "the spec said the data shape is X but the actual data shape is Y, so I made a judgment call." This is the failure mode the [[drift-prevention]] doctrine names, but the discipline pushes the cost upstream onto strategist time rather than eliminating it.

- **Item 010 (Cursor):** spec said per-workspace `state.vscdb`; reality is `globalStorage`. Caught by escalation.
- **Item 011 (Claude Code):** spec assumed JSONL turn shape `{role, text, ...}`; reality is nested `{type, sessionId, message: {role, content: [<content blocks>]}, timestamp}`. Caught by the agent in implementation, parser written to the real shape, flagged in agent_notes for the founder to verify against real Claude Code (`(2)` of the open items).
- **Item 015 (smoke script):** spec assumed the MCP tool-call response would contain `"matches"` inline. Reality is the SDK wraps the JSON inside `content[0].text` as a stringified payload, so the wire bytes contain `\"matches\"`. Caught when the agent ran the script against a live daemon and the grep failed; switched to an ERE alternation matching either form.

The retrospective lesson — already filed in followups, ready for the spec template — is **probe before you spec**. When an item depends on the runtime shape of a third-party data structure (Cursor's SQLite, Claude Code's JSONL, the MCP SDK's wire format), the strategist should do a privacy-respecting probe before writing acceptance criteria. The agent's drift-discipline is a *backstop* for spec error, not a replacement for spec accuracy. We invoked the backstop three times in six items.

### Operating-manual contradictions inside item specs

Item 015 is the canonical example. The spec listed `docs/STATUS.md` in `files_to_modify` and as an acceptance criterion. The operating manual (`docs/AGENT_INSTRUCTIONS.md` "What You Must Not Write") forbids agents from editing `STATUS.md` (founder-only, "founder updates Friday"). The agent caught the contradiction at the iteration boundary, declined to touch `STATUS.md`, escalated the conflict in the agent_notes. The founder confirmed the operating manual wins.

This is two failure modes compounded: (a) the spec template doesn't explicitly carve out STATUS.md as founder-only, and (b) the strategist re-introduced the conflict by listing it in `files_to_modify`. Followup #3 from item 015 (`backlog/_followups.md`, 2026-05-01 section) is exactly this fix: **amend the item-spec template to phrase STATUS.md updates as founder-post-merge, never as agent acceptance.** This is the canonical "operating-model bug surfaced by an item" pattern; it should be the model's response to *any* contradiction the agent flags.

### The chokidar lifecycle race is now technical debt with a price

Item 009 chose chokidar as the FS-watcher backend. By item 014 the test suite had grown enough that 4–6 chokidar-based tests intermittently time out at 5000ms under parallel CPU pressure (different tests fail each run, confirming a race rather than a regression). The 014 sidecar documents the symptom; the 015 review verifies the same flake on `main` post-014 merge; the chokidar race is now an entry in `backlog/_followups.md` (2026-05-01 section, item 3) as a high-priority Wave-4 blocker.

The architectural cost: items 009 → 010 → 011 → 012 all wired chokidar watchers without writing a *teardown contract*. Each surface has its own `stop()` semantics; nothing centralizes "wait for in-flight events to drain before close()." The flake is the surface of a missing primitive. **Wave 4 must not add another long-running watcher subsystem (browser extension wiring is the obvious risk) until the teardown contract exists.** Otherwise the test suite becomes unworkable at exactly the moment Wave 4 expands surface area.

### `search_memories` overfetch pattern is V1.5 debt

Item 014's tool implementation pulls `Math.min(limit * 4, 200)` candidates from storage and does the substring filter + DESC sort *in the tool*, not the storage. This was the right V1 call (the alternative — adding `order` / `order_by` to `QueryFilter` — wasn't spec-authorized and would have been drift). But the in-tool sort is O(N) memory in the size of the matching set: fine for V1 dataset sizes, becomes a hotspot at scale. Followup #1 from item 014 (`backlog/_followups.md`, 2026-05-01 section) tracks the upgrade path: once storage guarantees timestamp-DESC ordering at the query layer, the tool's overfetch logic collapses to a single bounded read.

This is also a **spec-authoring lesson**: queries that scale to "the user's full memory" need an ordering primitive in the interface contract. Substring search is fine to defer to V1.5 embeddings; the *ordering* is what makes the contract scalable.

### Drift the operating model didn't catch — none, but the bar wasn't tested

Honest read: I cannot point to an item across 001–015 where the operating model failed to catch drift. But the bar wasn't really tested — the surface area was small, the strategist was attentive, and most of the shipped agent_notes flagged judgment calls explicitly rather than burying them. The case where the operating model is genuinely tested is when an agent silently makes a "while I'm in here, let me also..." addition that lands invisibly in a 200-LOC PR. That hasn't happened yet at this scale, but it's the kind of failure that is hard to *detect* — only audits catch it. The Friday drift-audit ritual specified in `drift-prevention.md` should be exercised at least once in Wave 4 and the result documented.

## 4. Implications for Wave 4

Wave 4 is the extension upgrade, GitHub adapter, Slack adapter, audit page, and hotkey overlay. Each of those is structurally larger than any Wave-1–3 item. The operating model needs to evolve before Wave 4 starts, not during it.

### Spec-template fixes to land before any Wave 4 item is written

- **STATUS.md ownership:** founder-post-merge, never agent acceptance criterion. (Followup from item 015.)
- **Probe before spec:** when an item depends on third-party data shape (extension messaging, GitHub event payloads, Slack message JSON), the strategist must do a privacy-respecting probe and quote the actual shape in the spec body. Three of six Wave-3 items had this hole; Wave 4 has more third-party shape than Wave 3 did.
- **`files_to_modify` includes test surfaces:** if an acceptance criterion mentions a test, that test path must be in `files_to_modify`. Item 015's smoke-test escalation is the canonical example.
- **Storage extensions are pre-authorized:** when an item legitimately needs a new query primitive (e.g., `order_by`, future `metadata` index), the spec should authorize it explicitly rather than forcing the agent to escalate. Item 014's `source_prefix` extension was pre-authorized; the in-tool DESC sort was *not*, which produced the V1.5 debt.
- **Manual-verification gates are explicit:** item 015's "founder runs Cursor + Claude Code in real sessions during review" is the right pattern — make this an explicit acceptance phrase ("Manual verification (founder during review)") rather than an inline note buried in spec text.

### Process changes worth considering

- **Teardown contract before next watcher:** the chokidar race must be fixed before extension wiring lands. Otherwise Wave 4 inherits a flaky test suite.
- **Storage `order_by` lands when the second consumer needs it:** until then, the in-tool sort is fine. The lesson is to recognize the upgrade trigger (audit page will be the second consumer; it will need DESC by timestamp), not to land it speculatively.
- **Try a real two-agent parallel run:** Wave 4 has at least two items with no shared `files_to_modify` (e.g., audit-page UI + GitHub adapter). Running them in parallel would be the first real stress test of the atomic-claim mechanism. If the merge-time conflicts are non-trivial, the process needs sharper conflict-prediction in `/review-pending` sidecars.

### Items that would not have shipped without the operating model

- **Item 010 cursor extractor as it now exists.** Without the drift-prevention escalation, the agent would have shipped a per-workspace tracker against a globalStorage reality. The extractor would have captured zero turns; the bug would surface only in dogfooding; the rewrite would touch `src/capture/extractors/cursor.ts`, `src/capture/sources.ts`, every test fixture, the storage backfill query, and possibly the MCP tool's source-prefix filter. Estimated cost of *not* having drift discipline: ~2 days of rework.
- **Item 014's `source_prefix` LIKE-escape fixup.** Without the founder-as-merger sidecar, this lands on main as a latent SQL-pattern bug. It isn't catastrophic (read-only LIKE), but it's the kind of paper cut that compounds.
- **The MCP SDK wire-format discovery in item 015.** Without the agent running the smoke script against a live daemon during implementation, the script would have shipped broken on the first real `tools/call` response. Caught because the discipline ("no shipping without empirical verification") held.

### Items the operating model arguably over-constrained

- **Item 015 Vitest harness.** The agent declined to add `tests/tools/mcp-integration-smoke.test.ts` because the path wasn't in `files_to_modify`. That is *literally* correct and the founder would prefer the strict reading — but the test was only ~30 LOC, the work was done, and the discipline added a follow-up item rather than just adding the test. The fix is on the strategist, not the agent: list the test path in `files_to_modify` next time. But it's worth naming as a place where the agent's strict drift-reading produced a backlog item that a more confident agent would have just shipped.

There is no item across 001–015 where the agent escalated for a question the founder would clearly have preferred them to decide. The escalations were all genuine ambiguity. That's a healthy ratio.

## 5. The Single Property Worth Restating

Across 15 items, the things that paid off were the *boring* parts of the operating model: blocked_by graphs, idempotent resumes, sidecar reviews, founder-as-merger, the followups queue. The things that didn't pay off as much as advertised were the *flashy* parts: parallel-agent atomic claim (rare in practice), drift-prevention catching insidious silent additions (no exhibit yet at this scale).

**The discipline's payoff scales with surface area.** Wave 1–3 had ~6,000 LOC of substrate code; Wave 4 will at minimum double that and add a UI plus a Swift shim. The mechanisms that earned their keep on the substrate are the ones to reinforce before Wave 4. The mechanisms that didn't get tested yet — parallel claim, drift audit ritual, manual-verification gates as first-class spec citizens — are the ones to *use* in Wave 4 so we know whether they work. Don't add new mechanisms. Exercise the ones already specified.

## Related

- [[v1-spec]] — the spec these waves realized
- [[drift-prevention]] — the doctrine
- [[narrowest-v1-scope]] — the cut decisions these waves implemented
- [[system-architecture]] — the architectural snapshot at the end of Wave 3
- [[capture-allowlist]] — first non-empty entry shipped at item 009
- [[capture-gate]] — accept-path first exercised in production at item 009
- [[storage]] — the substrate's persistence layer
- [[mcp-server]] — retrieval interface
- [[mcp-search-memories]] — the L3 Pull realization
- [[fs-watcher]] — first capture surface
- [[cursor-extractor]] — the canonical drift-discipline exhibit
- [[claude-code-extractor]] — JSONL turn extraction
- [[git-capture]] — commits via refs watch + polling
- [[capture-pipeline]] — gate→storage seam
- [[stack-decision]] — TS/Node + Vitest + ESLint + Prettier + better-sqlite3 + chokidar
