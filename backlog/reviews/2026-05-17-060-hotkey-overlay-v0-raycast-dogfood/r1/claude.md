---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 1
reviewer: "claude"
artifact_sha: "e26d2cc"
completed_at: '2026-05-17T21:10:25Z'
verdict: "proceed"
findings:
  - severity: "low"
    where: "files_to_modify (lines 12-17); architecture diagram (lines 84-102); OoS #1 (line 158)"
    finding: |
      Directory placement under `tools/raycast-echo/` is a conceptual taxonomy
      smudge. `tools/` currently houses *operational scaffolding* —
      `sync-skills.sh`, `wiki_index.py`, `review-queue/`, `push-with-retry.sh`,
      `raycast-monitor/` — i.e. build/coordination infra invisible to end
      users. A Raycast extension is the opposite: a user-facing *surface*
      (the v0 of the hotkey overlay, which `wiki/surfaces/hotkey-overlay.md`
      models as one of the two `planned` L3 surfaces). The
      substrate-vs-surface line that `wiki/architecture/system-architecture.md`
      keeps clean blurs slightly when a surface lands in `tools/`.

      That said, creating a new top-level `clients/` or `surfaces-impl/`
      directory just for one v0 item is itself premature taxonomy — exactly
      the kind of architectural fan-out the [[drift-prevention]] five-question
      test discourages ("does this add a new top-level abstraction?"). The
      pragmatic call (use `tools/` because it is the existing junk-drawer
      for v0-grade scaffolding) is defensible.

      Recommendation: add one sentence to the spec body (e.g., after the
      Architecture diagram) explicitly noting *why* `tools/` was chosen —
      "treated as v0 dogfooding scaffolding, not a shipped surface; when V1
      lands the V1 backlog item should choose the durable home (likely
      `clients/raycast/` or similar)." This future-proofs the taxonomy
      decision and makes the v0 → V1 relocation expectation visible to the
      strategist who writes the V1 spec. Not blocking — clarification only.
  - severity: "low"
    where: "AC4 README dogfooding section (lines 128-132); OoS #4 (line 161); AC6 (lines 140-147)"
    finding: |
      OoS #4 explicitly defers `repo_path` scoping ("the founder lives in one
      repo today (`Project_echo`) and unscoped is fine"). That is true for
      Project_echo work, but the founder demonstrably operates across multiple
      repos in routine work — `yc-wiki` (cited in CLAUDE.md cross-project
      references), and any other Cursor instance open at hotkey-fire time.
      When ⌘⇧E fires from a Cursor instance in `yc-wiki` or elsewhere,
      `find_clusters()` and `search_memories({query})` return clusters/matches
      from ALL ingested sources including Project_echo. The dogfooding signal
      that feeds AC6 then becomes ambiguous: a "wrong retrieval" verdict in
      the journal may actually be a "wrong repo scope" issue masquerading as
      a retrieval-quality issue. That ambiguity poisons the V1 spec's load-
      bearing input.

      Recommendation: extend the AC4 README "Dogfooding (v0 contract)"
      section's 6-field template with a 7th convention — log the active repo
      (frontmost Cursor instance's repo, or "none" if invoked from elsewhere)
      as part of the **Trigger** or **Note** field. One-line addition; makes
      AC6's journal entries interpretable when the V1 strategist reads them
      back. This is a signal-quality enhancement, not a build-blocker.

      Out-of-scope alternative considered and rejected: adding `repo_path`
      auto-detection from frontmost-app context would be a v0 scope drift
      (OoS #4 forbids it for good reason — Raycast window-context APIs are
      gnarly enough to be a v0-eating distraction). The journal-entry hint
      is the lighter intervention.
---

# claude review — 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood r1

## Lens

Conceptual / architectural / scope-drift / V1-spec-discipline. Read the
artifact at `e26d2cc` against `wiki/product/v1-spec.md` (V1 scope lock),
`wiki/principles/` (drift-prevention, felt-not-seen, compose-not-capture,
clipboard-and-launch), `wiki/surfaces/hotkey-overlay.md` (the planned
surface this v0 informs), and the operating-model rule in CLAUDE.md that
wiki edits happen only post-shipment.

## Verdict rationale — proceed

This spec is unusually disciplined and reads as a deliberate anti-drift
exemplar:

- **AC7 is the spec spine.** "V1 spec is deferred, not pre-empted" is
  the right pattern for substrate-ready / form-unproven items. The wiki
  page at `wiki/surfaces/hotkey-overlay.md` stays `status: planned`; the
  V1 spec gets written only after the dogfooding journal produces ≥10
  entries across ≥3 days AND the founder articulates top-3 retrieval-
  quality issues. This is the founder-loop-close pattern applied to
  substrate→surface evolution: empirical signal drives V1+ specs, not
  theory.

- **No new MCP tools, no new daemon endpoints, no synthesis.** The
  extension consumes `find_clusters`, `search_memories`, `get_atom`,
  `get_atoms` verbatim from the existing MCP surface. OoS #2 forbids 5th
  tools explicitly ("If the builder thinks a 5th tool is needed for v0,
  stop and re-read this OoS"). Raw markdown concatenation only;
  downstream LLMs do synthesis after paste. [[compose-not-capture]]
  honored cleanly.

- **The "felt-not-seen" compromise is acknowledged, not hidden.**
  spec_refs line 21 explicitly notes the v0 "partially honors" but
  "doesn't fully embody" `[[felt-not-seen]]` because Raycast's own chrome
  is visible during use. This is exactly the kind of honest principle-
  tradeoff disclosure the project's drift-prevention discipline calls
  for — and it tees up V1 redesign ("V1 redesigns chrome") without
  pre-committing to a specific V1 chrome decision.

- **The 14-item "Out of Scope" list is unusually thorough.** It forbids
  the high-temptation adjacencies (native app, new MCP tools, synthesis,
  auto-detection, voice, ambient, audit page, telemetry, Raycast Store,
  wiki updates, V1 pre-emption, perf opt, capture surfaces, auth,
  multi-result state). Each one names a specific anti-drift commitment;
  none feel performative.

- **Cross-item coherence is clean.** No other items in `backlog/ready/`
  (only this one); no shipped hotkey-overlay or Raycast-related items in
  `backlog/complete/`. The audit-page surface (the other `planned` L3
  surface in `wiki/product/v1-spec.md`) is correctly punted to a
  separate future spec per OoS #6.

- **Cohort discipline holds.** The cohort (indie AI builders on macOS)
  matches V1's target. Raycast is a popular indie-builder launcher; the
  v0 does not expand to designer-adjacent or writer-adjacent cohorts.

- **Form-factor commitments hold.** No chat UI, no autonomous agent
  action, no Layer 2 ambient surfacing, no Layer 4 conversational
  dialogue. ⌘B (open trace viewer) and ⌘O (open source file) are both
  L3 push delivery patterns consistent with `[[clipboard-and-launch]]`.

The two findings above are advisory observations — F1 is a one-line
clarification of taxonomy intent; F2 is a one-line addition to the
journal template that strengthens AC6's signal quality. Neither blocks
claim/build. The watcher union-find may collapse F2 with similar
findings from codex if it surfaces the same multi-repo concern.

## Where I deliberately did NOT find drift

A few places the conceptual lens *could* have flagged but I read as
in-bounds after consideration:

- **Empty-state cluster auto-display** (lines 56, 117): The v0 shows
  clusters on empty input via `find_clusters()` no-args. The V1 wiki
  page (lines 22-30) frames Input as "user types intent + target" — i.e.
  no empty-state behavior described. One could read the v0 empty-state
  as a design *addition* not described by V1. But: AC7 whole point is
  that v0 informs V1, not pre-empts it. If empty-state proves useful in
  dogfooding, it goes into V1; if not, V1 may drop it. v0/V1 sequencing
  working as intended. Not a finding.

- **⌘B trace viewer URL shape unverified** (line 69, R3 line 177): The
  spec acknowledges in R3 that `http://127.0.0.1:38479/?atom=<id>` may
  not be the actual route shape, with a documented fallback ("toast no
  per-atom links yet + open index"). Builder empowered to pick closest
  equivalent and note in `agent_notes`. Honest uncertainty with bounded
  mitigation — not drift.

- **R1 fallback to a 30-line fetch-based JSON-RPC client** if
  `@modelcontextprotocol/sdk` does not bundle cleanly in Raycast (line
  174-176): Introduces a "builder picks one of two architectures"
  decision. For v0, either path is fine — both target the same daemon
  endpoint with the same JSON-RPC shape. Worth noting the builder must
  record which path was taken in `agent_notes` for the merge reviewer to
  verify, but the spec already requires `agent_notes` per CLAUDE.md so
  this is implicit.

- **`tools/raycast-echo/` placement** is the closest call (F1 above).
  Flagged as `low` advisory rather than ignored because the taxonomy
  clarity would help the eventual V1 strategist.

- **The X-Echo-Role header non-use** (lines 14, 104): Correctly
  identified — the four retrieval tools do not require it; only
  coord-surface emissions do. Architectural detail honored correctly.

## What the strategist should do with this review

If F1 and F2 land as recommendations the strategist accepts, the patches
are tiny:
- F1: one sentence in the Architecture section explaining `tools/`
  placement as v0-scaffolding intent.
- F2: one line in the AC4 README dogfooding template adding "active repo
  at hotkey-fire" to the Trigger/Note field.

If the strategist disagrees with either, both are defensible to defer to
post-v0 observation — the spec is shippable as written. Either way,
proceed to claim.
