---
id: 2026-05-10-033-full-atom-recovery
title: Full-atom recovery — `get_atom(id)` verbatim escape hatch (Magic Moments M1-3)
status: ready
priority: HIGH
estimate: 0.5-1d
created: 2026-05-10
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
spec_refs:
  - src/mcp/tools/get-atoms.ts  # sibling pattern; same Storage.getByIds backbone
  - src/mcp/wire-shape/caps.ts  # WIRE_SHAPE_CAPS — the caps `get_atom` deliberately bypasses
  - src/mcp/wire-shape/match.ts  # projectMatch — the projector `get_atom` deliberately skips
  - src/storage/interface.ts    # CaptureEvent + Storage.getByIds contract
  - tools/mcp-integration-smoke.sh  # tool-count assertion bumps 7 → 8
  - raw/internal/dogfooding/mcp-interactions-journal.md  # M1-3 incident log
  - backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md  # toolkit decomposition precedent
resume_tail_source: "fs:/Users/zhenye/.claude/projects/-Users-zhenye-Desktop-Project-echo/<current>.jsonl"
---

# Context

Magic Moment M1-3 (long-turn elision still requires JSONL fallback for full-text recovery) fired **four times** in the 24h window 2026-05-09 to 2026-05-10 — all on long Codex assistant turns where `truncations: ["content"]` clipped the middle of multi-finding reviews or pushback lists:

1. **2026-05-09 ~01:55 PDT** — cross-tool review of item 030; Codex turn 8 verdict content elided; strategist recovered via direct JSONL parse to land the `c12617b` fixup.
2. **2026-05-10 14:50 PDT** — Codex turn 8 pushback on item 032 path sequencing; `bytes_elided=1043`; pushbacks 2-3 in the middle; recovered via `jq`.
3. **2026-05-10 15:00 PDT** — Codex turn 11 R1 spec review of 032; `bytes_elided=1708`; recovered via `jq`.
4. **2026-05-10 15:32 PDT** — Codex turn 15 R2 review of patched 032; `bytes_elided=1537`; recovered via `jq`.

Pattern: dense multi-finding Codex turns (model `gpt-5.5`, reasoning_effort `xhigh`) reliably elide their middle paragraphs once content crosses `WIRE_SHAPE_CAPS.match_content = 2_000`. ECHO's wire-shape head+tail keep verdict + conclusion visible, but the per-finding reasoning between bullets is lost. Item 030 added `truncations: string[]` as a trust signal (a consumer can KNOW content was clipped), but the existing tools don't offer a way to RECOVER the full content through MCP — the documented mitigation in `_followups.md:38-46` is "read JSONL/SQLite directly."

The JSONL/SQLite escape hatch works for the strategist (shell access + composer-id from prior dogfooding entries) but does NOT work for:
- AI client subagents with only MCP access (can't shell out)
- Group-session participants who don't know the source path
- Builder agents claiming items where the spec references elided content

The cross-tool spec review pattern ([[cross-tool-spec-review]]) is now structurally dependent on this escape hatch — see `wiki/operating-model/cross-tool-spec-review.md` "Cost / value" + the M1-3 reference in the evidence base. Codex pushback #5 on item 032 (2026-05-10 14:50 PDT) explicitly endorsed this as a small separate item to ship alongside M2 first-call reliability (item 032).

This item ships the in-MCP escape hatch so AI clients can recover verbatim atom content without shell or composer-id context.

# Goal

Add an MCP tool `get_atom(id)` that returns ONE atom verbatim — no `WIRE_SHAPE_CAPS.match_content` clip, no `WIRE_SHAPE_CAPS.metadata_value` clip, no projector reshape — so consumers hitting `truncations: ["content"]` on `search_memories` / `tail_session` / `get_atoms` results can recover the full upstream payload through MCP alone.

Demo bar: a Codex review turn elides mid-content; the strategist (or any AI client) calls `get_atom(<elided_atom_id>)` and receives the full verbatim turn body in a single MCP response — no JSONL fallback required.

# In Scope (Acceptance Criteria)

### AC1 — New MCP tool `get_atom` (singular)

**Tool name:** `get_atom` (singular — distinct from `get_atoms` plural). Snake_case matches existing tool convention (`echo_ping`, `find_clusters`, `tail_session`, `wait_for_new_turns`).

**Input schema (zod):**
- `id: string` — REQUIRED. The atom's `EventId` (UUID v4 string), typically obtained from `find_clusters.clusters[].atom_ids[]` or `search_memories.matches[].id` or `get_atoms.atoms[].id` or `tail_session.turns[].id` or a journal entry quoting the ID.

**No other parameters.** Specifically: NO `atom_ids[]` (use `get_atoms` for batch), NO `format` (this tool has exactly one shape), NO `fields[]` (this is the verbatim escape hatch — projection defeats the purpose).

**Output shape (success):**
```json
{
  "schema_version": 1,
  "tool": "get_atom",
  "atom": {
    "id": "<uuid>",
    "source": "fs:/...",
    "timestamp": "2026-05-10T22:00:36.612Z",
    "content": "<VERBATIM full content from storage, no clipping>",
    "metadata": { "<projected metadata, see scope rules below>" },
    "truncations": []
  },
  "atom_size_bytes": <number — JSON.stringify(atom).length>,
  "warnings": []
}
```

**Scope of "verbatim" (load-bearing, addresses R1 Finding 1):**
- **`content`: verbatim** — no `WIRE_SHAPE_CAPS.match_content` clip. This is the load-bearing fix for M1-3 (long-turn elision recovery — the elided field is always `content`).
- **`metadata`: PROJECTED** — uses the existing `projectMatch` pipeline from `src/mcp/wire-shape/match.ts`, applying `WIRE_SHAPE_CAPS.metadata_value` per-key clipping AND the `tool_calls` → `trajectory` projector reshape. Why: Codex extractor stores `metadata.tool_calls` at **120-130KB per atom** (per `raw/internal/dogfooding/mcp-interactions-journal.md` line 737, "NEW Bug A2"); verbatim metadata would force the atom-too-large error path on every Codex atom — the exact M1-3 case `get_atom` is supposed to fix. `truncations` field on the returned atom reflects which metadata keys were projected (e.g., `["metadata.tool_calls:projected"]`); empty `truncations: []` means content was unclipped AND no metadata projection fired.
- **`embedding`: EXCLUDED** (R1 Finding 3) — `CaptureEvent` carries optional `embedding?: number[]` (`src/storage/interface.ts:8`); embeddings are large (~1-2KB each, sometimes more), rarely useful for M1-3 recovery, and not what a consumer is trying to recover when they see `truncations: ["content"]`. The returned `atom` deliberately drops the field.

**The contract is "content verbatim, metadata projected, embedding excluded."** A consumer who needs verbatim metadata is in a different use case (rare; out-of-scope for this item — V2+ if real demand surfaces).

**Output shape (atom-too-large error):**
```json
{
  "schema_version": 1,
  "tool": "get_atom",
  "atom": null,
  "atom_size_bytes": <actual size, e.g. 87_345>,
  "error_code": "atom_too_large_for_wire",
  "source": "fs:/Users/zhenye/.codex/sessions/.../rollout-*.jsonl",
  "warnings": [
    "Atom JSON exceeds 25_000-byte MCP envelope ceiling even with metadata projection; cannot transmit over MCP. Read source path directly to recover full content."
  ]
}
```

The `source` field is populated so the consumer knows WHERE to read JSONL — closes the loop on the rare case the escape hatch can't fit. After the R1 contract revision (content verbatim + metadata projected + embedding excluded), this error path fires only when `content` alone exceeds ~24KB (rare — typical chat turns are 5-15KB content).

**Output shape (atom-not-found error, R1 Finding 4):**
```json
{
  "schema_version": 1,
  "tool": "get_atom",
  "atom": null,
  "atom_size_bytes": 0,
  "error_code": "atom_not_found",
  "source": null,
  "warnings": [
    "No atom with id=<uuid> exists in storage. Verify the id was obtained from a current find_clusters / search_memories / get_atoms / tail_session response — atom IDs are storage row IDs and cannot be guessed."
  ]
}
```

`atom_not_found` is a distinct error class from `atom_too_large_for_wire`. Consumers should branch on `error_code`:
- `atom_too_large_for_wire` → read the `source` path directly (JSONL/SQLite fallback path exists; the atom DOES exist, just doesn't fit the wire).
- `atom_not_found` → do NOT retry; the ID is wrong or stale. The atom doesn't exist in storage.

### AC2 — Hard envelope ceiling (no silent truncation)

Single hard ceiling: `GET_ATOM_RESPONSE_BYTE_CEILING = 25_000` (matches the project-wide MCP convention; same constant value as `GET_ATOMS_RESPONSE_BYTE_CEILING`).

**Pre-flight size check:** before serializing the success response, compute `JSON.stringify({...success_envelope_with_atom...}).length`. If > 25_000, return the atom-too-large error shape (above) instead. There is NO middle path — `get_atom` either returns verbatim or returns an explicit error. **No silent clipping** is the load-bearing contract.

Implementation note: this is similar to `get_atoms`' size check (`src/mcp/tools/get-atoms.ts:~217`), but `get_atom`'s response is single-atom so the budget calculation is simpler — no deterministic-prefix-drop loop needed.

### AC3 — Tool description signals cost class explicitly

Per item 025 MCP best-practices convention, `GET_ATOM_DESCRIPTION` must lead with the discriminator one-liner and explicitly call out cost class:

> Use ONLY when you observed non-empty `truncations` (especially `["content"]`) on a prior `search_memories` / `tail_session` / `get_atoms` response AND you need the verbatim content for that specific atom. The content-recovery escape hatch — bypasses `WIRE_SHAPE_CAPS.match_content` clipping for `content`, while keeping the existing metadata projection (per-key cap + `tool_calls` reshape) and excluding `embedding`. Pair this with the other retrieval tools (which clip content + metadata for budget reasons): use `find_clusters` + `get_atoms` for routine discovery, and reach for `get_atom` only when you need verbatim content for a specific atom.
>
> Cost: HIGH. Typical Codex long-turn content is 5-15KB; with metadata projected to ~2KB, response fits the 25k ceiling. If the atom's content alone exceeds ~24KB (rare), the tool returns `{atom: null, error_code: "atom_too_large_for_wire", source: "..."}` so you can read the source path directly. If the atom ID doesn't exist in storage, returns `{atom: null, error_code: "atom_not_found"}` — do NOT retry, the ID is wrong or stale. Do NOT call `get_atom` in a tight loop — it's the escape hatch, not the discovery primitive.

Description must also document the canonical recovery pattern:
```js
const r = await get_atom(id);
if (r.error_code === "atom_too_large_for_wire") { /* read r.source directly */ }
else if (r.error_code === "atom_not_found") { /* ID is stale; abort */ }
else { /* r.atom is the content-verbatim recovery */ }
```

The discriminator wording (per R1 Finding 2) deliberately says "non-empty `truncations`" — NOT "`truncations: []` matters." The use case is recovery FROM clipping, not verification of unclipped responses.

### AC4 — Test coverage

- **Unit test (content verbatim + metadata projected):** insert an atom with `content` = 5KB lorem ipsum + `metadata = {tool_calls: <8KB structured payload>, session_id: "abc", git_state: {...}}`. Call `get_atom(id)`. Assert: response `atom.content` byte-for-byte equals input content (no clipping); `atom.metadata.tool_calls` is the PROJECTED shape (trajectory reshape per `projectMatch`) NOT the verbatim 8KB; `atom.metadata.session_id` and `atom.metadata.git_state` byte-for-byte equal input (small-key path doesn't fire `WIRE_SHAPE_CAPS.metadata_value` clipping); `atom.embedding` is NOT present (excluded); `atom.truncations` contains `"metadata.tool_calls:projected"`; `atom_size_bytes` matches `JSON.stringify(response.atom).length`.
- **Unit test (Codex-realistic recovery — the primary use case):** insert an atom shaped like the typical Codex long-turn extractor output — `content` = 10KB chat turn (a multi-finding review body that would normally elide under `WIRE_SHAPE_CAPS.match_content = 2_000`) + `metadata.tool_calls` = 130KB raw payload (the documented Bug A2 scale from `mcp-interactions-journal.md:737`). Call `get_atom(id)`. Assert: response success path (NOT atom_too_large), `atom.content` byte-for-byte = input content (no clipping), `atom.metadata.tool_calls` is projected (so the 130KB doesn't blow the envelope), `atom.truncations` contains `"metadata.tool_calls:projected"`, response envelope `JSON.stringify(envelope).length < 25_000`. This is the load-bearing test that validates the contract revision from R1 Finding 1.
- **Unit test (envelope ceiling — content-too-large):** insert an atom with `content` = 30KB (exceeds 25k even with metadata projected). Call `get_atom(id)`. Assert: `atom: null`, `error_code: "atom_too_large_for_wire"`, `atom_size_bytes` ≈ 30_500 (within JSON overhead), `source` populated, `warnings[]` contains the documented recovery message.
- **Unit test (envelope ceiling — content-just-fits):** insert an atom with `content` = 22KB + minimal metadata (no tool_calls). Call `get_atom(id)`. Assert success path (atom returned verbatim, no error). Validates the size check is precise enough to land 22KB content under the 25k ceiling without spurious refusal.
- **Unit test (missing ID):** call `get_atom("00000000-0000-0000-0000-000000000000")` (a UUID not in storage). Assert: `atom: null`, `error_code: "atom_not_found"` (distinct from `atom_too_large_for_wire`), `source: null`, `atom_size_bytes: 0`, `warnings[]` contains the documented "no atom with id=... exists" message.
- **Integration test (round-trip from `truncations`):** insert an atom with content 5KB; call `search_memories` → assert returned match has `truncations: ["content"]` (because `WIRE_SHAPE_CAPS.match_content = 2_000` clips it); call `get_atom(match.id)` → assert `response.atom.content` byte-for-byte matches input.

### AC5 — Smoke test + MCP integration

Bump `tools/mcp-integration-smoke.sh`:
- Line 552 assertion: `tools/list 7 tools` → `tools/list 8 tools`.
- Add a V1.6.1 (item 033) tool-presence check block mirroring the V1.6 (030) one at lines 129-140, asserting `get_atom` is advertised in `tools/list` with `outputSchema` + `readOnlyHint: true`.
- Add a smoke round-trip: insert a test atom, call `get_atom(id)`, assert atom returned verbatim.

# Out of Scope (Don't Drift)

- **Do NOT extend `get_atoms` with a `full=true` flag.** Codex pushback #5 offered "`get_atom(id, full=true)` or equivalent" — the spec deliberately chooses a separate tool over a flag because: (a) batch + verbatim mode would invite consumers to pass 50 IDs and blow the budget; (b) it bisects the contract of `get_atoms` ("targeted body fetch with caps") with a different semantic ("verbatim escape hatch"); (c) the 030 atomic-decomposition principle says one tool, one purpose.
- **Do NOT add range / offset / chunked parameters** (`offset`, `length`, `from_byte`). If an atom is too large for the envelope, return the error shape and let the caller read the source path. Chunked download is V2+ territory if real demand surfaces — for now, point at JSONL.
- **Do NOT touch `WIRE_SHAPE_CAPS` constants.** This tool deliberately bypasses them; the other tools keep them intact for their cost-bounded use cases.
- **Do NOT touch `projectMatch` in `src/mcp/wire-shape/match.ts`.** `get_atom` skips it entirely; do not refactor it.
- **Do NOT add metadata filtering / projection** (`fields[]` parameter). The escape hatch returns everything.
- **Do NOT touch `get_atoms` behavior.** The two tools coexist; `get_atoms` keeps its `truncations` signal + budget loop.
- **Do NOT change M2 first-call reliability (item 032).** That's a different surface; this item runs in parallel.
- **Do NOT add `get_atom` to the `get_recent_work_context` deprecation banner.** Banner already names `find_clusters` + `get_atoms` as the replacement chain; `get_atom` is an escape hatch for those, not a replacement for the deprecated tool.

# Implementation Notes

- New file: `src/mcp/tools/get-atom.ts` (singular). Follow `src/mcp/tools/get-atoms.ts` for structure (zod schema, tool registration, response envelope).
- `Storage.getByIds([id])` is the storage call — there's no `getById` single-ID variant on the interface; just call `getByIds([id])` and unwrap `result[0]` (or treat `result.length === 0` as `atom_not_found`).
- **Metadata projection (per R1 Finding 1 contract revision):** import `projectMatch` from `src/mcp/wire-shape/match.ts` and use it for the metadata path, BUT bypass its content clipping. The simplest implementation: call `projectMatch(captureEvent)` to get the projected wire-shape match (content clipped + metadata projected + embedding stripped), then OVERWRITE `match.content` with `captureEvent.content` (the verbatim source). The `truncations` array carries over from `projectMatch` so consumers see exactly which metadata keys were projected. This pattern avoids duplicating the metadata projection logic; only the content-clipping decision differs.
- **Embedding exclusion:** `projectMatch` already drops `embedding` from the wire shape, so the contract is achieved by reusing the projector. If a future refactor of `projectMatch` re-introduces embedding, this item's tests catch it.
- `GET_ATOM_RESPONSE_BYTE_CEILING = 25_000` — export as a named constant for testability; same value as `GET_ATOMS_RESPONSE_BYTE_CEILING` but a separate constant so future tightening of one doesn't accidentally tighten the other.
- Size check pattern: build the success envelope with the verbatim-content + projected-metadata atom inline, `JSON.stringify(envelope).length`, compare to ceiling, branch to `atom_too_large_for_wire` shape if over. Do NOT pre-size against the atom alone — the envelope overhead (schema_version, tool, atom_size_bytes, warnings, truncations[]) is ~150 bytes and matters at the boundary.
- Missing-ID detection: if `Storage.getByIds([id])` returns `[]`, branch to `atom_not_found` shape immediately. Don't do the projection or size check on a missing ID.
- Error-shape envelopes (both `atom_too_large_for_wire` and `atom_not_found`) are small (~400 bytes) and always fit; no recursive size-check needed on the error paths.
- Tool registration in `src/mcp/server.ts` (or wherever the other tools register — verify with `grep -l "find_clusters\|get_atoms" src/mcp/`); register `get_atom` alongside, with `readOnlyHint: true`, `outputSchema`, and the description from AC3.
- Smoke test edits: keep them minimal (single tool-presence assertion + tool-count bump). Don't rewrite the smoke test architecture.

# After Completion (Strategist + Founder Notes)

- **Dogfooding verification:** Next time a Codex (or other long-turn) MCP response comes back with `truncations: ["content"]`, the strategist (or any AI client) should call `get_atom(<elided_atom_id>)` instead of `jq` against the JSONL. Log the call in `raw/internal/dogfooding/mcp-interactions-journal.md` documenting whether the response returned verbatim or hit the atom-too-large error — both outcomes are useful data.
- **Move M1-3 from `_followups.md` "biting" to a "Resolved" subsection** with this item's merge SHA + the dogfooding-verification entry timestamp.
- **Promote new behavior to `wiki/surfaces/mcp-get-atom.md`** (new page; will be created by strategist post-merge alongside the other 030 + 032 wiki promotions). Mirror the `mcp-find-clusters.md` / `mcp-get-atoms.md` per-tool page convention. Update `wiki/surfaces/mcp-server.md` to list the new tool.
- **Update `wiki/operating-model/cross-tool-spec-review.md`** "Findings classes" + "Cost / value" sections to reference `get_atom` as the in-MCP recovery primitive (replaces the "use JSONL/SQLite fallback" language).
- **Update `wiki/architecture/system-architecture.md`** "MCP toolkit" surface count: 7 → 8.
- **Re-evaluate item 031 (`get_recent_work_context` deprecation) readiness** — adding `get_atom` does NOT change the 031 gate (judgment-step + first-call-reliability), but it does close the M1-3 dependency that was implicitly blocking comfortable deprecation. After 033 ships, the new toolkit truly covers all resume patterns including trust-bug recovery.

# Self-review checklist (pre-commit gates, applied by strategist before this spec landed)

Per `wiki/operating-model/cross-tool-spec-review.md` "Strategist self-review checklist":

1. **Path gate:** every `spec_refs` path → `ls` exists. ✅ All 7 paths verified (`get-atoms.ts`, `caps.ts`, `match.ts`, `interface.ts`, `mcp-integration-smoke.sh`, `mcp-interactions-journal.md`, `030 complete/` spec).
2. **Field gate:** every named field → `grep` exists in the named file. ✅ `CaptureEvent.{id,source,timestamp,content,metadata}` (storage/interface.ts:3-10), `WIRE_SHAPE_CAPS.match_content` (caps.ts:21), `WIRE_SHAPE_CAPS.metadata_value` (caps.ts:29), `GET_ATOMS_RESPONSE_BYTE_CEILING` (get-atoms.ts:24), `GET_ATOMS_MAX_IDS` (get-atoms.ts:29), `Storage.getByIds(ids)` (interface.ts:47).
3. **Existing-behavior gate:** every "existing behavior" claim → `grep` confirms the implementation. ✅ `get_atoms`' size check at `get-atoms.ts:~217` (verified earlier in R2 cycle). Smoke test "tools/list 7 tools" at line 552 (verified).
4. **Cross-reference gate:** AC ↔ Implementation Notes ↔ Out-of-Scope ↔ After Completion all cross-referenced consistently. ✅ All references to `get_atom` (singular) vs `get_atoms` (plural) reviewed; all references to `WIRE_SHAPE_CAPS.match_content` consistent; all references to envelope ceiling 25_000 consistent across AC2 + Implementation Notes.

This spec was the first to apply the checklist before the first cross-tool review.

# Review Round 1 — Cross-tool spec review (Cursor + Codex, 2026-05-10 16:00 PDT)

The 4-gate self-review checklist was applied pre-commit; expectation was that R1 would find fewer Class B/C findings than 032's R1 (9 findings). Result: **R1 found 4 unique findings, 1 convergent + 3 single-source.** Class B/C count: **0** (the checklist worked for those classes). Class D (contract-vs-reality semantic gap) count: **1 — and it was the HIGH-severity load-bearing finding the checklist could not have caught.**

**Divergent verdicts (first time in today's review cycles):**
- **Cursor:** "Proceed (with two small nits)."
- **Codex:** "Pushback. I would not send 033 to a builder yet."

Per `wiki/operating-model/cross-tool-spec-review.md` "Verdict-convergence signal" — divergence on verdict is the substantive-disagreement signal. Strategist sided with Codex's harsher reading after validating the metadata-size claim against the dogfooding journal evidence (`mcp-interactions-journal.md:737` documents `metadata.tool_calls` at 120-130KB per Codex atom).

**Findings:**

- **R1-1 (Codex HIGH — Class D contract-vs-reality, load-bearing):** Original spec promised "verbatim metadata" + 25k ceiling + no chunking. But Codex's `metadata.tool_calls` is 120-130KB per atom → verbatim metadata always blows the envelope on the primary use case. The escape hatch was structurally non-functional for the exact M1-3 case it was supposed to fix. **Fixed:** Contract revised to "content verbatim, metadata projected (per `projectMatch` pipeline), embedding excluded." AC1 output shape + AC3 description + AC4 tests + Implementation Notes all updated coherently. The Codex-realistic test case (10KB content + 130KB tool_calls metadata → must succeed) added to AC4 as the load-bearing assertion.
- **R1-2 (Codex Medium — Class F user-facing description drift):** AC3 description led with "Use ONLY when `truncations: []` matters" — inverted. The use case is recovery when `truncations` is NON-empty. **Fixed:** Description rewritten to "Use ONLY when you observed non-empty `truncations` (especially `['content']`) on a prior call AND you need the verbatim content."
- **R1-3 (convergent — Codex Medium/Low + Cursor nit #1):** Spec didn't say whether `CaptureEvent.embedding` is included in the wire atom. **Fixed:** Explicitly excluded (per AC1 "Scope of verbatim" + Implementation Notes); achieved by reusing `projectMatch` which already drops it.
- **R1-4 (convergent — Codex Low + Cursor nit #2):** `atom_not_found` error was tested in AC4 but not defined as a canonical error shape in AC1. **Fixed:** Full JSON shape added to AC1 alongside `atom_too_large_for_wire`; consumers can branch on `error_code` without guessing the envelope shape.

**Pattern note (load-bearing for the operating-model wiki):**

This is the **seventh cross-tool review cycle today** and the **first divergent-verdict cycle.** The checklist worked for Class B/C (paths, fields, internal contradictions, "existing behavior" claims) — those caught 0 findings in R1, down from 6 across 032's R1+R2+R3 cycles. But Class D (contract-vs-reality semantic gap) requires the reviewer to read the dogfooding evidence base and reason about whether the contract achieves its stated goal — that's outside the checklist's scope.

**Conjecture (observation-only):** Class D findings might require a fifth gate: (e) for every load-bearing claim (the spec's "demo bar" or "load-bearing fix"), find the dogfooding evidence supporting it AND find the evidence that contradicts it (or could). The Codex finding here used journal line 737 as the contradicting evidence — the strategist had the same access but didn't look. **The checklist needs a "dogfooding evidence consultation" gate for load-bearing claims.** Not yet applying as a process change pending founder approval.

**Disposition:** All 4 R1 findings addressed in this revision. The contract revision is substantive (changes the load-bearing promise), so expecting R2 to verify the revised contract still achieves the M1-3 demo bar (i.e., does "content verbatim + metadata projected" actually solve the elision use case that motivated this item).

# References

- `wiki/operating-model/cross-tool-spec-review.md` — strategist self-review checklist + finding-class taxonomy
- `raw/internal/dogfooding/mcp-interactions-journal.md` — M1-3 incident log (entries 2026-05-09 ~01:55, 2026-05-10 14:50 / 15:00 / 15:32 PDT)
- `backlog/complete/2026-05-09-030-mcp-toolkit-reshape-and-group-session.md` — `truncations: string[]` trust signal that this item recovers from
- `backlog/ready/2026-05-10-032-m2-first-call-reliability.md` — parallel V1.6 item; no overlap with this one (032 touches `find-clusters` + `get-atoms`; 033 adds `get-atom`)
- Codex session `019e10a5-4046-7a20-9396-2543df466702`, turn 8 (`2026-05-10T21:50:11Z`) — pushback #5 endorsing this as a small separate item
- `_followups.md` "MCP retrieval — long-turn elision + envelope caps" — the friction this item closes
