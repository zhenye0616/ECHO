# Agent run log — 2026-05-08-028-rwc-envelope-skeleton-format

**Item:** `backlog/claimed/2026-05-08-028-rwc-envelope-skeleton-format.md` (moved to `pending_review/` at handoff).
**Branch:** `agent/rwc-envelope-skeleton-format` @ `73a94269234c87e3e914a0aefe208a7e62129411`.
**Worktree:** `~/Desktop/Project_echo--rwc-envelope-skeleton-format/`.
**Agent persona:** `78D5AB0F-A8A3-4F01-BC2E-EB05961B2405` (Claude Code, single-machine).
**Started:** 2026-05-08T23:01:33Z. **Pushed:** 2026-05-08T23:15:00Z (≈14 min wall clock; clean run).

## Run 1

### Regression baseline (verbatim from dogfooding journal)

The acceptance asked for the regression baseline pulled verbatim. From `raw/internal/dogfooding/mcp-interactions-journal.md`:

| Time (PDT) | Build | Envelope size | Source line |
|---|---|---|---|
| 2026-05-08 15:05 | post-025 | **72,283 chars** | journal:600 |
| 2026-05-08 15:14 | post-025 | **76,593 chars** | journal:621 |
| 2026-05-08 15:54 | **post-026 + post-027** | **84,188 chars** | journal:631 |

The 15:54 PDT spill is at `~/.claude/projects/-Users-zhenye-Desktop-Project-echo/f89407ef-eb99-4968-a961-114d15e938fe/tool-results/mcp-echo-get_recent_work_context-1778280862563.txt` (84,317 bytes raw; the in-tool measurement of 84,188 is JSON-content length on the wire, slightly less than file size due to spill-file framing). This file is the source of the new test fixture.

### Per-mode envelope size measurements on the new realistic fixture

Measured against `tests/mcp/fixtures/recent-work-context-realistic-claude-code.json` (the redacted 15:54 PDT spill — 1 cluster, 20 atoms, ≥15 open_loop_hints, populated artifacts[2-17]/atom + populated actors + populated provenance):

| Format | Compact JSON length | Within 25k budget? | Within 12.5k headroom? |
|---|---|---|---|
| `full` (verbatim atoms + verbatim cluster bodies) | ~92,000 chars (extrapolated: full carries action.input/output verbatim, but the spilled fixture is already minimal-truncated; full would be larger again) | ❌ | ❌ |
| `minimal` (= the fixture as-is, since spill was captured in minimal mode) | **85,624 chars** | ❌ | ❌ |
| `skeleton` | **12,091 chars** | ✅ (52% under) | ✅ (3% under headroom) |

Reduction `minimal → skeleton` = **86%**. Reduction `full → skeleton` is even larger.

The 12,091 measured against the 12,500 threshold is tight (~3% headroom). Future atom-shape changes that add more bytes to `id` / `time` / `source` / `action.kind` / 200-char `action.summary` will land on this assertion. That tightness is intentional per the spec ("half the consumer budget, leaving headroom").

### Before/after wire example

Real spilled atom (compact, ~2,851 chars, abbreviated for log brevity):
```json
{
  "id": "012af57f-1da0-4954-ae9a-4bbe4724225d",
  "schema_version": 1,
  "time": { "occurred_at": "2026-05-08T22:26:10.000Z" },
  "source": { "app": "git", "surface": "commit", "raw_pointer": "git:/Users/<redacted>/Desktop/Project_echo" },
  "actors": [{ "role": "author", "name": "Zhen", ... }],
  "action": { "kind": "commit", "verb": "post-merge: 027 ...", "input": "<569-char commit msg>", "output": "<570-char files-changed list>" },
  "artifacts": [{ "type": "repo", ... }, { "type": "file", ... }, { ... }, { ... }],
  "context": { "ambient": { ... } },
  "state": { "snapshot": { "artifact_id": "...", "hash": "..." } },
  "provenance": { "source_event_id": "...", "raw_payload_hash": "...", "extractor_version": "..." }
}
```

Skeleton-mode atom (compact, ~570 chars):
```json
{
  "id": "012af57f-1da0-4954-ae9a-4bbe4724225d",
  "time": { "occurred_at": "2026-05-08T22:26:10.000Z" },
  "source": { "app": "git", "surface": "commit", "raw_pointer": "git:/Users/<redacted>/Desktop/Project_echo" },
  "action": {
    "kind": "commit",
    "summary": "post-merge: 027 mcp-stateless-transport + complete (founder reconciliation)\n\nSwitches ECHO MCP from stateful per-session McpServer to documented stateless mode (sessionIdGenerator: undefined, enableJs"
  }
}
```

What was dropped: `schema_version` (atom-level — kept at response root only), full `actors[]`, `action.verb`, `action.input` body, `action.output` body, `artifacts[4]`, `context`, `state`, `provenance`. Kept: id (hydration handle), occurrence time (resume ordering), source ref (raw_pointer is the tail-session/search-memories handle), action.kind (debug breadcrumb), action.summary (200-char head clip — enough to disambiguate atoms in a resume briefing).

Cluster-level: open_loop_hints reduced from `{atom_id, kind, text, confidence, resolved}` to `{atom_id, resolved}` only; edges array dropped entirely; anchor_artifacts dropped.

### What I implemented

1. **`src/trace/types.ts`** — widened `ResponseFormat` from `'full' | 'minimal'` to `'full' | 'minimal' | 'skeleton'`.

2. **`src/mcp/tools/recent-work-context.ts`** —
   - Widened `formatSchema` enum to match.
   - Added `SkeletonAtom`, `SkeletonOpenLoopHint`, `SkeletonCluster`, `SkeletonResponse` types.
   - Added `applySkeletonAtom(atom)` — strips uncapped sub-collections, synthesizes `action.summary` as a 200-char head-clip of `action.input ?? action.output`.
   - Added `applySkeletonCluster(cluster)` — drops `edges[]`, `anchor_artifacts`, hint body fields; keeps id/label/atom_ids/source_breakdown/time_range + reduced hints `{atom_id, resolved}`.
   - Added `buildSkeletonResponse(response)` — composes the two transforms over a full `RecentWorkContextResponse`.
   - Skeleton transform is applied **at the MCP wire boundary** in `registerRecentWorkContext`, not inside `getRecentWorkContext`. This keeps `getRecentWorkContext`'s public return type narrow (`RecentWorkContextResponse`) so non-MCP callers (e.g., `tools/validate-resolution.ts`) don't have to handle a union.
   - Updated `RECENT_WORK_CONTEXT_DESCRIPTION` to advertise the three-format ladder by intent — cost ordering with concrete use-case guidance.
   - The output schema is permissive on inner bodies (`z.record(z.string(), z.unknown())` for atoms/clusters), so skeleton responses validate against the same schema with no extra union work.
   - Added `SKELETON_SUMMARY_CAP = 200` exported constant.

3. **`tests/mcp/fixtures/recent-work-context-realistic-claude-code.json`** — new fixture, 110,795 bytes pretty / 85,624 bytes compact JSON. Sourced verbatim from the 15:54 PDT spill, with two redaction passes:
   - `/Users/zhenye/` → `/Users/<redacted>/`
   - `-Users-zhenye-` → `-Users-<redacted>-` (Claude Code's mangled-path encoding inside `raw_pointer` strings)
   - Verified: 0 occurrences of `zhenye` remain in the committed fixture.

4. **`tests/mcp/tools/recent-work-context.test.ts`** — extended with a new `describe("item 028: format='skeleton' on realistic-density fixture", ...)` block carrying 9 new tests:
   - Fixture preserves the post-026+027 regression shape (cardinal counts: 20 atoms, 1 cluster, ≥15 open_loop_hints, ≥40 total artifacts).
   - Minimal-mode envelope on this fixture exceeds 25,000 chars (documents the gap skeleton closes).
   - **Load-bearing**: skeleton-mode envelope on this fixture is < 12,500 chars (12,091 measured).
   - Skeleton mode strips artifacts/actors/provenance/context/conversation/atom-level open_loop_hints.
   - Skeleton atom `action.summary` is a head-clip ≤200 chars of `action.input`.
   - Skeleton cluster drops `edges` body and reduces hints to `{atom_id, resolved}`.
   - Manual-revert proof: re-serializing the fixture as-is exceeds 12,500 chars.
   - End-to-end MCP round-trip with `format:'skeleton'` on a small fixture.
   - Tool description advertises the three-format ladder.
   - `format:'skeleton'` is accepted by the input schema (regression guard).

5. **`docs/mcp-integration.md`** — added a per-tool subsection on `get_recent_work_context` response formats: a 4-column table covering each format's purpose / what it keeps / what it drops / typical envelope, with explicit links to the journal regression history (lines 600 / 621 / 631) and a "When to pick X" guide. Notes that auto-downgrade is intentionally NOT in the MCP server (caller picks deterministically).

### Files modified

| File | Branch | head_sha @ end of run |
|---|---|---|
| `src/trace/types.ts` | `agent/rwc-envelope-skeleton-format` | `73a9426` |
| `src/mcp/tools/recent-work-context.ts` | `agent/rwc-envelope-skeleton-format` | `73a9426` |
| `tests/mcp/tools/recent-work-context.test.ts` | `agent/rwc-envelope-skeleton-format` | `73a9426` |
| `tests/mcp/fixtures/recent-work-context-realistic-claude-code.json` (new) | `agent/rwc-envelope-skeleton-format` | `73a9426` |
| `docs/mcp-integration.md` | `agent/rwc-envelope-skeleton-format` | `73a9426` |

Diff stat: 5 files changed, 2867 insertions, 11 deletions.

### Decisions made during implementation (worth founder review)

1. **Field naming map.** Acceptance prose used colloquial names (`atom.timestamp`, `atom.source_app`, `atom.source_prefix`, `atom.action.summary`) that don't exist on `NormalizedContextEvent`. Mapped to actual schema:
   - `timestamp` → keep full `time` sub-object (`TimeRef`: occurred_at + optional observed_at + duration_ms — already small).
   - `source_app` + `source_prefix` → keep full `source` sub-object (`SourceRef`: app + surface + raw_pointer + optional account). Drops the colloquial split but preserves all the affordances; `raw_pointer` is the only non-trivial field (~80 chars on fs: pointers) and it's the load-bearing handle for follow-up `tail_session` / `search_memories` hydration.
   - `action.summary` → synthesized as a 200-char head-clip of `action.input ?? action.output`. The schema has no native summary field. Documented in `applySkeletonAtom`'s comment with the rationale.

2. **Skeleton transform location.** Initially placed inside `getRecentWorkContext` (which would have widened the return type to `RecentWorkContextResponse | SkeletonResponse`). That cascaded a typecheck error into `tools/validate-resolution.ts:185`, which is NOT in `files_to_modify`. To avoid a transitive scope bleed, I refactored the transform to apply at the MCP wire boundary in `registerRecentWorkContext`. Net effect: `getRecentWorkContext` keeps its narrow signature; all skeleton-aware code lives behind the MCP registration. No file outside `files_to_modify` was modified.

3. **Real fixture density falls short of spec's "≥30 artifacts/atom" claim.** The acceptance asked for "each atom carries ≥30 entries in artifacts[]". The canonical 15:54 PDT spill (the file the spec explicitly cites) caps at 17 artifacts on the densest atom and ranges 2–17 across all 20 atoms. I used the real spill faithfully rather than artificially inflate (per the spec's stronger constraint: "Do NOT hand-author a synthetic fixture"). The fixture-shape sanity test now asserts ≥40 *total* artifacts across the 20-atom cluster (a floor that holds for this fixture and any plausible later one). The regression history's "33 entries" came from a *pre-025* spill on a different code path; later truncation may have reduced per-atom artifact counts. Either way, the load-bearing assertion (skeleton < 12,500 chars on real-shape data) still pins the regression closure. **If the founder considers this insufficient — i.e., wants to see a ≥30-artifact fixture specifically — I'd need a fresh spill from a denser working session, which is dogfooding work, not agent work.**

4. **Test file path.** `files_to_modify` lists `tests/mcp/recent-work-context.test.ts` and the acceptance suggests "or extend the existing test". The actual existing test lives at `tests/mcp/tools/recent-work-context.test.ts`. I extended that file rather than creating a sibling at the listed path; the acceptance "extend the existing test" branch covers this.

5. **`buildSkeletonResponse` exported.** The test file imports it directly to verify the transform without a server round-trip. Tagged as `export` rather than internal; not on the spec's API surface but no caller outside MCP / tests touches it, so the surface stays internal-by-convention.

### Acceptance criteria status

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `formatSchema` widened to `'full' \| 'minimal' \| 'skeleton'`; description advertises three modes by intent | ✅ | `src/mcp/tools/recent-work-context.ts:73` (formatSchema), description block at line 14–40 |
| 2 | Skeleton strips artifacts/actors/provenance/context, reduces edges[] body, reduces open_loop_hints to `{id, resolved}` | ✅ | `applySkeletonAtom` / `applySkeletonCluster` in `src/mcp/tools/recent-work-context.ts`; tested by 6 assertions in the new describe block |
| 3 | Realistic-density envelope test: skeleton < 12,500 chars on real-shape fixture; minimal allowed > 25k; existing 025 test still passes | ✅ | New tests pass (12,091 measured for skeleton, 85,624 for minimal); existing 025 envelope test still passes (suite green) |
| 4 | Fixture sourced from real spilled response, with redaction; not hand-authored | ✅ | Fixture is byte-for-byte the 15:54 PDT spill modulo two redaction passes; 0 `zhenye` strings remain |
| 5 | Tool description tells AI clients when to use which mode | ✅ | Description rewrite covers cost ordering + use cases + the resume-call recommendation |
| 6 | Default stays `'minimal'` (no auto-downgrade) | ✅ | `recent-work-context.ts:154` `format = params.format ?? 'minimal'` unchanged |
| 7 | `docs/mcp-integration.md` updated with three-format ladder; cites journal entries by line range | ✅ | New "`get_recent_work_context` response formats" section with 4-column table + per-mode "when to pick" + journal links |
| 8 | `npm test` / `npm run lint` / `npm run typecheck` all pass; new envelope test fails on revert; existing 025 test still passes | ✅ | typecheck clean; lint clean; 522 passed / 0 failed; the load-bearing assertion is `< 12,500` on real-shape data — reverting the skeleton transform leaves the fixture at 85,624 bytes, which the test would catch |
| 9 | Run log appended | ✅ | This file |

### Verbatim test output

```
$ npm run typecheck
> echo-daemon@0.0.0 typecheck
> tsc --noEmit
(clean — exit 0)

$ npm run lint
> echo-daemon@0.0.0 lint
> eslint . --max-warnings 0
(clean — exit 0)

$ npm test
> echo-daemon@0.0.0 test
> vitest run

 RUN  v2.1.9 /Users/zhenye/Desktop/Project_echo--rwc-envelope-skeleton-format

 ✓ tests/mcp/tools/recent-work-context.test.ts (49 tests) 2660ms
 ✓ tests/mcp/tools/search-memories.test.ts (33 tests) 1758ms
 ✓ tests/mcp/tools/tail-session.test.ts (18 tests) 1249ms
 ✓ tests/mcp/server.test.ts (12 tests) 967ms
 ✓ tests/capture/extractors/codex.test.ts (43 tests) 14991ms
 ✓ tests/capture/extractors/claude-code.test.ts (31 tests) 12781ms
 ✓ tests/capture/surfaces/git-watcher.test.ts (13 tests) 8386ms
 [...full suite...]

 Test Files  32 passed | 1 skipped (33)
      Tests  522 passed | 21 skipped (543)
   Start at  16:13:54
   Duration  16.99s
```

### Open questions for founder

1. **Fixture artifact density.** The realistic fixture caps at 17 artifacts/atom; the spec asked for ≥30. See decision #3 above. If you want a denser fixture, the path is to capture a fresh spill from a heavier working session (more parallel Read/Edit/Bash tool calls per turn) and re-redact. Not blocking — load-bearing assertion holds.

2. **Skeleton summary source.** I picked `action.input ?? action.output` (user/originator turn over assistant reply). Open question: should it ever be `action.output` first? Concrete case: a `git:commit` atom has both input (commit message) and output (files changed list); user-facing intent is the message, which is what `action.input` carries on git commits. For `claude_code:message` atoms, input is the user turn — same intent. I think this is right but flagging in case there's a use case I'm missing.

3. **Auto-downgrade gating.** Spec says auto-downgrade is OUT OF SCOPE for this item. The docs section I wrote explicitly calls out "auto-downgrade is intentionally NOT in the MCP server" with the rationale. If you'd rather word that more openly ("a future item may add it"), happy to soften.

### Drift events caught

None substantive. One near-miss: I briefly added a one-line type cast in `tools/validate-resolution.ts` to handle a typecheck cascade after I widened `getRecentWorkContext`'s return type. Caught the drift (file not in `files_to_modify`), reverted, and refactored the skeleton transform to apply at the MCP wire boundary instead. Net effect: the only files modified are the four listed in `files_to_modify` plus the new fixture (also listed).
