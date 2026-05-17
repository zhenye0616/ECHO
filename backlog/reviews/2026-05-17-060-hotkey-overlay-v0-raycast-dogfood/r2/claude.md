---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 2
reviewer: "claude"
artifact_sha: "74cb464"
completed_at: '2026-05-17T21:23:44Z'
verdict: "proceed"
findings: []
---

# claude review — 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood r2

## Lens

Conceptual / architectural / scope-drift / V1-spec-discipline, applied to
the r1 patch deltas (e26d2cc..74cb464) rather than re-reading the whole
artifact. The r1 convergence call asked r2 to verify (a) r1 patches landed
without scope-expansion, (b) AC8/AC9 reads as clean structural separation,
(c) the inline `derivedApp` helper recipe matches `buildSourceAppMap()`,
(d) AC1–AC5 did not soften, (e) reviewer-lens differentiation continues.

## Verdict rationale — proceed

All six r1 dispositions landed cleanly and the patches honor the
disposition-discipline rule in `skills/review-queue-watch.md` (prefer
removal over deeper patching). Two of the six dispositions are explicit
**removals** (R2 codex F2 trimmed ⌘B to bare index URL and removed
fallback heuristics; R2 codex F4 dropped the per-extension `.gitignore`
mention). The remaining four are tight inline clarifications, none
adding mechanism beyond what each finding required.

Verification of the five focus_hints from the r1 convergence call:

- **(a) No scope expansion.** Counted the patch surface against each r1
  disposition: derivedApp helper (single inline paragraph + one
  references update in AC2), ⌘B simplification (replacement, net
  shorter), AC6/AC7 restructure (renames + structural section split, no
  new ACs added), `.gitignore` removal (deletion), placement note
  (single inline paragraph in Architecture), 7-field template (one new
  field name + cross-reference). No new files added to
  `files_to_modify`; no new `spec_refs`; no new Risks; no new OoS items.
  The 14-item OoS list at r1 stayed 14 items at r2 — strategist did not
  bloat the don't-drift fence in response to the patches, which is the
  exact anti-pattern the disposition-discipline rule guards against.

- **(b) Post-Merge Gate section reads as clean structural separation.**
  AC8/AC9 are now under a dedicated "Post-Merge Gate (V1 spec trigger)"
  heading at line 148, with an explicit "These are NOT builder-verified"
  preamble. Definition of Done at line 197 carries a matching
  parenthetical: "_(Builder-verifiable scope only. R2 codex F3 — MED:
  AC8/AC9 are post-merge founder-verified gates and live in the
  Post-Merge Gate section above; they are NOT in the builder's DoD.)_"
  The structural separation is explicit on both sides of the boundary
  (the gate section calls itself out, and the DoD calls out the
  exclusion). Builder pipeline now has unambiguous claim/move semantics.

- **(c) derivedApp helper matches buildSourceAppMap() inversion.**
  Verified `src/mcp/util/source-app.ts:17-25`: the map returns
  `{cursor: 'fs:$HOME/Library/Application Support/Cursor/',
  claude_code: 'fs:$HOME/.claude/projects/', codex:
  'fs:$HOME/.codex/sessions/', git: 'git:'}`. The spec's inversion
  recipe — "iterate `buildSourceAppMap()` entries and return the key
  whose value is a prefix of the input `source`; fallback `\"unknown\"`"
  — is the correct inversion. Output enum
  `cursor | claude_code | codex | git | unknown` matches
  `SOURCE_APP_VALUES` plus the fallback. The "may import directly /
  otherwise duplicate" escape hatch is honest about the cross-tree
  bundler unknown and bounds drift-risk to the four-entry map ("has not
  changed since item 037 shipped") — acceptable v0 risk, flagged not
  hidden.

- **(d) AC1–AC5 did not soften.** AC2 line 126 added an explicit
  parenthetical pin ("ActionPanel … with five actions: ↩ Copy / ⌘↩
  Paste / ⌘O Open Source / ⌘B Open in Trace Viewer (opens
  `http://127.0.0.1:38479/`) / ⌘C Copy Raw JSON") and line 127 added
  "(R2 codex F1)" reference for the bundle-format derivation. Both
  tighten, not loosen, the contract by removing implicit
  builder-judgment ambiguity. AC5 dropped the `.gitignore` clause (was
  redundant per root `.gitignore`); the AC's actual verification
  (`tsc --noEmit` clean + `ray build` clean) is unchanged. AC1, AC3, AC4
  bodies unchanged except for AC4's template extension (which is an
  addition, not a softening). Definition-of-Done line 202–205
  cross-references the relevant r1 finding IDs so a future reader can
  trace each tightening back to its origin.

- **(e) Reviewer-lens differentiation continues.** The r2 focus_hints
  are tractable from both lenses (implementability for "patch matches
  schema," conceptual for "structural separation reads as honest"), so
  a small amount of overlap is expected at r2. My read of the patches
  found zero conceptual concerns that a code-aware lens would also
  catch, so this review is again non-overlapping with what I'd expect
  codex to land. If codex's r2 also lands `proceed` with zero new MED+,
  convergence is reached per the r1 convergence call's success
  criterion ("If r2 lands [proceed, proceed] with zero findings,
  convergence is at hand").

## Where I deliberately did NOT find drift

A few patch-introduced shapes the conceptual lens *could* have flagged,
but I read as in-bounds after consideration:

- **7-field "Repo" template diverges from CLAUDE.md's 6-field cross-tool
  template.** The CLAUDE.md journal preamble documents a 6-field
  template (Trigger / Query inputs / Returned / Sources / Verdict /
  Note) as the cross-tool, cross-AI standard for every `mcp__echo__*`
  invocation. AC4 here introduces a 7-field variant by inserting
  **Repo** between Sources and Verdict, scoped to ⌘⇧E invocations from
  the Raycast extension. This is an additive local-scope extension, not
  a contradiction — the broader journal stays 6-field for every other
  caller. The strategist explicitly framed it as v0-specific and tied
  it to disambiguating "wrong retrieval vs wrong repo scope" verdicts
  that feed the V1 spec. If V1 dogfooding shows the Repo field is
  generally useful, V1 (or a separate operating-model item) can promote
  it to the cross-tool template. Not drift — additive scoped extension
  with a clear V1 promotion path. Not a finding.

- **Inline derivedApp helper as builder-choice (import vs duplicate).**
  Offering the builder two implementations of the same primitive
  (import `src/mcp/util/source-app.ts` directly, or duplicate the
  four-entry map) creates a small ergonomic ambiguity. But: the
  alternative (mandate one path) would either force a cross-tree import
  the Raycast bundler may reject, or force a duplication when the
  bundler would happily import. The "builder picks the cleaner path
  and notes in `agent_notes`" pattern is consistent with how R1's
  fetch-vs-SDK fallback already works (Risks line 185). Drift-risk on
  the duplicate map is bounded and disclosed. Not a finding.

- **Placement note's "V1 strategist chooses durable home" framing.**
  Line 110 says the V1 spec "includes the move" to `clients/raycast/`
  or similar. One read is that this pre-empts a V1 design decision by
  naming a probable directory. The stronger read is that it's framed
  as "likely" with an explicit deferral — "the V1 strategist should
  choose the durable home (likely `clients/raycast/` or similar
  `clients/<host>/<adapter>/` taxonomy)." The "likely" / "should choose"
  framing keeps the V1 strategist's choice live. Not a finding.

- **The dropped per-extension `.gitignore` clause might silently leave
  build artifacts trackable.** Verified `.gitignore` at the repo root
  already ignores `node_modules/` and `dist/` globally (the spec body
  cites lines 36-39). No risk of build-artifact leakage from the
  removal. Not a finding.

- **R3 risk text shortened — possible loss of nuance.** The r1 R3
  language documented a builder-choice fallback for an unverified URL
  shape. The patch removes the fallback because R2 codex F2 verified
  there is no per-atom route to fall back to. Shortening the Risk text
  here is correct (R3 is no longer an open risk, it's a resolved
  scope-trim) — but if the trace viewer later grows a per-atom route,
  V1 will re-pick this up. Acceptable v0 posture. Not a finding.

## Convergence read

The patch decay shape matches r1's prediction:
- r1: 4 MED + 2 LOW across two reviewers, all accepted inline
- r2: 0 findings from this lens

If codex r2 also lands `proceed` with 0 new MED+, the round is at
[proceed, proceed] and convergence fires. The spec is shippable as
written; the strategist may move to `request.py` for r3 only if codex
r2 turns up something this lens missed.
