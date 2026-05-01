---
handoff_for: next strategist Claude Code session
authored: 2026-05-01
status: open — awaiting next session
---

# Handoff: ECHO wiki restructure

## TL;DR

The founder wants the `wiki/` reorganized for scale. **Your first job is to propose, not execute.** Read the project end-to-end, weigh several structures, write a proposal, get founder approval, then ship the move as one atomic commit with full validation. Do NOT move any files until the founder explicitly approves the plan.

The wiki today is 39 pages across 4 folders (`concepts/`, `entities/`, `sources/`, `analyses/`). It's small enough that whatever structure ships now will be the structure that scales to ~100 pages over Waves 4–6. Get this right.

---

## Read these first (in this order)

1. `CLAUDE.md` (project root) — load-bearing project conventions; the strategist/builder/founder split; the lagging-doc commitment.
2. `docs/NORTH_STAR.md` — brand promise, V1 scope, the five drift questions.
3. `docs/AGENT_INSTRUCTIONS.md` — operating manual; what each role can/cannot write.
4. `wiki/sources/v1-spec.md` — the locked V1 spec; status annotations from the wave 1–3 retrospective.
5. `wiki/.manifest.json` — current 39-page index with taxonomy.
6. `wiki/index.md` — auto-generated browsable index showing today's grouping.
7. `wiki/analyses/system-architecture.md` — the canonical architectural snapshot. Layer 1 / 3 / 5 framing.
8. `wiki/analyses/wave-1-2-3-retrospective.md` — what's been learned from items 001–015.
9. `wiki/sources/cursor-collected-data.md` — the per-app reference style; you'll want to make this scale to claude-code, github, slack.
10. `backlog/_followups.md` — the live queue of in-flight items / deferred fixups.

That's roughly 30–40 minutes of reading. Don't skip — every constraint you'd otherwise re-derive is in those files.

---

## Where the build is

Waves 1–3 (items 001–015) shipped. The killer-demo loop is operational:

- ✅ Substrate: capture pipeline + gate, append-only SQLite with WAL, structured logger, daemon lifecycle with PID lock, MCP server on `127.0.0.1:38478`, `search_memories` tool.
- ✅ Capture surfaces: fs-watcher, cursor-extractor, claude-code-extractor, git-watcher.
- ✅ Cursor extraction is recently-fixed (commits `95b7b12`, `e368843`, `7acf6a4`) — uses Cursor's real `type: 1|2` schema, pairs user→cluster of consecutive assistant bubbles, and extracts attached/referenced/deleted files into `metadata.context`.
- ✅ Cross-app data flows into one SQLite db; today the founder has 105 Cursor turns, 51 Claude Code turns, 59 git commits captured.
- ❌ Not yet shipped (V1 still): hotkey overlay, browser-extension wiring, audit page, GitHub/Slack integrations.

Waves 4–6 are not yet specced. The wiki restructure should make that future inviting, not painful.

---

## Recent strategic context (the conversation that produced this handoff)

The founder asked the prior session to think about wiki structure. The diagnosis that came back was that the current `concepts/` `entities/` `sources/` `analyses/` taxonomy doesn't fit the project well. **Five specific pain points were identified** (you should agree, disagree, or refine):

1. **`concepts/` is a junk drawer** — mixes brand commitments (`felt-not-seen`, `context-as-moat`), interaction patterns (`clipboard-and-launch`, `ambient-form-factor`), and operating disciplines (`drift-prevention`, `sandboxed-capture`).
2. **`entities/` is a flat 15-page list of unlike things** — substrate components, capture surfaces, retrieval surfaces, delivery surfaces, and even a research-finding cohort page.
3. **`analyses/` is also a junk drawer** — locked scope decisions, process retrospectives, architecture overview, and genuine cross-cutting analysis all coexist.
4. **Per-app reference pages have no natural home.** `cursor-collected-data.md` is currently in `sources/`, which is a stretch. Claude Code, GitHub, Slack will each get one.
5. **Lagging-doc commitment isn't structurally visible.** Shipped components and aspirational ones live in the same folders with no signal.

The prior session sketched **Option A** (topic + audience hybrid) as one possible answer:

```
wiki/
├── product/              # locked decisions + research
├── principles/           # commitments + disciplines (replaces concepts/)
├── architecture/         # the substrate that doesn't move
├── capture/              # Layer 1 — getting data IN
├── retrieval/            # Layer 3 — getting data OUT to AI
├── delivery/             # form factors users touch
├── per-app/              # what's actually collected from each app
├── operating-model/      # how we build (meta — agents, drift, retros)
├── index.md
└── .manifest.json
```

**This is one input, not your answer.** The founder explicitly asked you to *rethink* and propose what makes most sense. Take Option A as a starting datapoint, not gospel. Other framings the founder might prefer:

- **Audience-first**: foundation/, shipped/, planned/, references/, retros/, research/. Pro: clear lifecycle separation. Con: some pages straddle multiple buckets.
- **Layer-aligned (per L1–L5 from interface-layers.md)**: L1-capture/, L3-retrieval/, L5-audit/, plus form-factor/, principles/, product/, operating-model/, per-app/. Pro: aligns directly with the spec's vocabulary. Con: form-factor cuts across layers.
- **Hybrid you invent.** You may see something cleaner than any of these. Don't anchor on Option A just because it's named first.

A `status: shipped | planned | deferred` frontmatter field came up as a complementary tightening — worth bundling with whatever structure you land on, but not strictly required by the restructure itself.

---

## What you're optimizing for

In rough priority order:

1. **Scale to ~100 pages** without re-restructuring at Wave 4 / 5 / 6. The biggest projected growth is per-app references (5 in V1 bundle, more later) and additional capture surfaces (Slack messages, GitHub PRs, browser-extension wiring, hotkey overlay, etc.).
2. **Reflect the lagging-doc commitment.** A reader scanning `wiki/` should see at-a-glance which surfaces are shipped reality vs aspiration. The folder structure or a `status:` field should make this visible.
3. **Make the per-app pattern first-class.** `cursor-collected-data` will be joined by `claude-code`, `github`, `slack`, `web-extension`, etc. They should live somewhere that signals "this is the answer to *what context do I have for app X*".
4. **Mirror the spec's own architecture vocabulary** where possible. `interface-layers.md` already defines L1/L3/L5; `bundle-decision.md` already names the five tools; `system-architecture.md` already names the six components. The wiki structure should reinforce these, not invent new vocabulary that competes.
5. **Make the strategist's promotion job mechanical.** When an item lands in `backlog/complete/`, a strategist promotes its After-Completion notes to wiki pages. The folder structure should make "this item shipped, page goes here" obvious without requiring judgment.

---

## Hard constraints

These are non-negotiable; if your proposal violates one, the founder will reject it.

1. **Wiki is lagging-doc of shipped reality.** Pages get written *after* the corresponding item lands in `backlog/complete/`. Aspirational stubs are anti-pattern (today's `hotkey-overlay.md` and `audit-page.md` already drift here — your proposal should call out how they'll be marked).
2. **`docs/` is not wiki content.** `docs/CLAUDE.md`, `docs/AGENT_INSTRUCTIONS.md`, `docs/NORTH_STAR.md`, `docs/STATUS.md`, `docs/BACKLOG.md` live separately and are operating-model files, not lagging-doc. Don't propose moving them into `wiki/`.
3. **`backlog/` and `raw/` are not wiki content either.** Backlog items live in `backlog/`; agent run logs and decision archives live in `raw/`. Don't restructure those.
4. **Wikilinks are filename-only.** ECHO's wikilinks are `[[capture-gate]]` (no folder, no `.md`). Moving files between folders does NOT break internal links. Markdown links with explicit folder paths (rare; mostly cross-references to the YC wiki at `~/Desktop/yc/yc-wiki/`) DO break — grep for those before moving.
5. **Filenames are globally unique.** The manifest and index conventions assume this. Don't propose duplicate filenames in different folders (e.g., a `cursor.md` in two places).
6. **No content rewrites in the move commit.** Moves only. Frontmatter additions (`status:` field, updated `topic`/`subtopic`) are fine. Body content stays unchanged so the diff is auditable. Content updates ride in separate later commits.
7. **`wiki/.manifest.json` and `wiki/index.md` must stay in sync.** The index claims to be auto-generated from the manifest, even though it's currently hand-edited. Either build a generator or update both by hand atomically.

---

## What you should produce

Save your proposal to `raw/internal/decisions/2026-05-XX-wiki-restructure-proposal.md` with these sections:

1. **Diagnosis.** Your read of why the current structure doesn't scale. Confirm or refine the five pain points above.
2. **Three structural options sketched** at the folder-tree level. Include the prior session's Option A (topic + audience), at least one alternative (audience-first or layer-aligned), and one of your own. Each option gets ~5 lines of "why this works for ECHO specifically."
3. **A recommended option** with concrete tradeoffs. Be opinionated. The founder values "be specific, name the decision and the outcome — don't be diplomatic to mush" (from the wave 1–3 retro tone note).
4. **A complete file-move table** for the recommended option. Every one of the 39 current pages, where it goes, why. No pages dropped or merged in this commit.
5. **Frontmatter changes** if any. If you're adopting `status: shipped | planned | deferred`, give every page its initial value. (Most are `shipped`; `hotkey-overlay`, `audit-page` are `planned`.)
6. **Migration plan** as a numbered checklist:
   - branch
   - `git mv` the files
   - rewrite `wiki/.manifest.json`
   - regenerate `wiki/index.md`
   - grep for any folder-prefixed markdown links and fix
   - validate: `python3 -c "import json; m=json.load(open('wiki/.manifest.json')); print(sum(1 for k in m if not k.startswith('_') and k != '$schema'))"` matches `find wiki -name '*.md' ! -name 'index.md' | wc -l`
   - validate: every `[[wikilink]]` resolves to a file in `wiki/*/<link>.md`
   - one commit, one push
7. **What you'd defer.** If there's a clean future move that doesn't fit today (e.g., splitting `product/` into `product/strategy/` + `product/research/` once it crosses 20 pages), say so explicitly in a "Future moves" section so the founder knows what choices were intentionally deferred.

Then **stop and ask the founder to review the proposal**. Do not start moving files. The founder's response will either approve, request edits, or ask for a different option.

---

## After approval, the migration commit

Once the proposal is approved:

- Make the file moves with `git mv` (preserves history).
- Rewrite `wiki/.manifest.json` with the new paths and any new topic/subtopic groupings.
- Rewrite `wiki/index.md` to match. The header says "auto-generated; do not edit by hand" — if you choose to honor that, a tiny generator script (Python or Node) reading the manifest and emitting markdown is appropriate. Save it as `tools/wiki_index.py` or similar. If you choose to keep it hand-edited, update the header to be honest.
- Commit message: `wiki: restructure for scale (waves 4+)`. Body should explain the new shape in 2–3 paragraphs and link to the proposal doc.
- Do NOT also add new pages, fix typos, or update content in the same commit. Move-only diff.
- Push as one commit.
- Verify by running the validation steps from the migration plan and reporting results back to the founder.

---

## Recent context — commits and decisions you should know about

```
ca71ffc  wiki(system-architecture): fix Claude Code project layout + link cursor-collected-data
7acf6a4  feat(cursor-extractor): Tier A — extract attached/referenced/deleted files into metadata.context
e368843  fix(cursor-extractor): pair user with all consecutive assistant bubbles
2b28cda  docs: scrub stale Cursor shape references after the parser fix
95b7b12  fix(cursor-extractor): use real Cursor schema (type:1|2 + composerData ordering)
912ebab  chore: cursor/fs-watcher stability + lifecycle test port fix + blocked.py sidecar skip
238c530  simplify: small post-merge cleanups across wave 3 (010-015)
faa625e  wiki: system-architecture (minimum component view)
44dd2d3  wiki: promote waves 1-3 (items 001-015) shipped reality to wiki
70b5ea9  merge: 2026-04-30-015-mcp-integration-test (with founder reconciliation)
```

`44dd2d3` is the wiki promotion that produced today's structure. `7acf6a4` is the most recent feature commit. The wiki restructure should treat the post-`ca71ffc` state as the input.

---

## Open follow-ups (from `backlog/_followups.md`)

These are NOT your job, but they exist and may inform structural choices. The wiki restructure shouldn't make any of them harder to file later:

- `wiki/sources/claude-code-collected-data.md` (analogous to cursor-collected-data; queued)
- `tests/tools/mcp-integration-smoke.test.ts` Vitest harness (acceptance #3 from item 015, deferred)
- `docs/STATUS.md` first MCP-demo milestone entry (founder-only)
- Strategist amends item-spec template re: STATUS.md ownership (recurring conflict)
- Polish `tools/mcp-integration-smoke.sh:47–55` curl `-f` flag
- Investigate chokidar lifecycle teardown race (high-priority test-infra item)
- Wire `limit: MAX_OVERFETCH` into `storage.query` once storage guarantees DESC ordering
- Add `order` / `order_by` to `QueryFilter` once a second consumer needs DESC
- Boot-time workspace-inference scan for cursor-extractor
- Lag-measurement harness (cross-cutting Cursor + Claude Code)
- `log.warn("parse_failed", ...)` in claude-code-extractor

---

## What NOT to do

- **Do not move files until the founder approves the proposal.** This is the most important rule.
- Do not change wiki page *content* in the move commit. Move-only.
- Do not touch `docs/`, `backlog/`, `raw/`, or `src/` as part of this work — they're out of scope.
- Do not invent a new wiki taxonomy that isn't grounded in either the spec's vocabulary (L1–L5, the six components, the five tools) or in concrete reader audiences (founder, strategist, agent, reviewer).
- Do not add aspirational pages while moving — if `hotkey-overlay.md` is currently a stub, leave it as a stub but mark it `status: planned`. Don't grow the wiki content as part of the move.
- Do not propose a `wiki/<each-app>/` folder *per* app at the top level — `wiki/per-app/cursor.md` keeps the surface flat. Apps don't deserve their own siblings of `architecture/`.
- Do not skip writing the proposal doc. The founder explicitly asked you to think first; the doc is the artifact of thinking.

---

## How to know you're done

- Proposal doc exists at `raw/internal/decisions/2026-05-XX-wiki-restructure-proposal.md` with all seven required sections.
- Founder has explicitly approved (in conversation) the recommended option.
- One atomic commit moves all 39 files, rewrites the manifest, rewrites the index, fixes any folder-prefixed markdown links.
- Validation: file count matches manifest count matches index entry count.
- Validation: no broken `[[wikilinks]]` (the prior session's grep — `grep -roh '\[\[[a-z0-9-]*[]|]' wiki --include='*.md' | sed 's/\[\[//;s/[]|]//g' | sort -u` — should produce a list where every entry resolves to a file, except the two intentional cross-project / forward references already noted: `[[append-only-ledger]]` (cross-project to AIE wiki) and `[[ride-along-capture]]` (forward reference to a future principle page).
- Branch pushed; founder informed with a one-paragraph summary of what changed and how to navigate the new structure.

---

## A note on tone

The founder values directness over diplomacy. From the wave 1–3 retrospective: *"don't be diplomatic to the point of mush — name the specific decision and the specific outcome, and if something was a mistake, say so and say what should change."* If your proposal disagrees with the prior session's Option A, say so clearly and explain why. If the founder pushes back, push back if you still believe your read; agree if they convince you. Either response is fine. Hedging is not.
