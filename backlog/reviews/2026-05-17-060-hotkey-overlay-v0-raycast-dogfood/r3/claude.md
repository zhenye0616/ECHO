---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 3
reviewer: "claude"
artifact_sha: "34f29a8"
completed_at: '2026-05-17T21:34:48Z'
verdict: "proceed"
findings: []
---

# claude review — 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood r3

## Lens

Conceptual / architectural / scope-drift / V1-spec-discipline, applied to
the r2 patch deltas (`74cb464..34f29a8`) rather than re-reading the
whole artifact. The r2 convergence call asked r3 to verify five
focus_hints centred on the three r2 codex MED dispositions (helper
relocation REMOVAL, Accept-header one-line addition in R1 only, 7-field
template reconciliation) plus continued reviewer-lens differentiation
and persistence of all r1 patches.

## Verdict rationale — proceed

All three r2 codex dispositions landed cleanly and the patch surface is
the tightest of the three rounds so far. Two of the three (F1 helper
relocation, F3 template reconciliation) honor the
disposition-discipline rule in `skills/review-queue-watch.md` by either
*removing* surface area or *resolving* an inconsistency rather than
adding mechanism. The remaining one (F2 Accept header) adds the minimum
text needed to make the fallback contract correct against the daemon's
actual content-negotiation behavior — same constraint enforced by
`tools/review-queue/coord-emit.sh` and locked at 057b r9 codex F1
HIGH — without leaking the fallback recipe into AC1/AC2 (Risks remains
the canonical home).

Verification of the five r2 focus_hints, in order:

- **(1) F1 disposition is a REMOVAL — no new file under
  `tools/raycast-echo/src/lib/`; `format.ts` is the sole helper home;
  `files_to_modify` count unchanged at 7.** Verified by parsing
  frontmatter directly: `files_to_modify` length = 7 (package.json,
  search-context.tsx, mcp.ts, format.ts, tsconfig.json, README.md,
  docs/BACKLOG.md). Spec body line 59 now reads "Define `derivedApp` as
  a small top-of-file helper inside `tools/raycast-echo/src/lib/
  format.ts` (already listed in `files_to_modify` — no new file
  added)" with the explicit close "Co-locating with the formatter keeps
  the markdown-shape contract and its source-name derivation in one
  file; no separate `source-app.ts` needed." This is a one-fewer-file
  outcome relative to the r1 spec — the cleanest possible shape of the
  r2 codex F1 finding.

- **(2) F2 disposition is a one-line Accept-header addition in R1
  ONLY (not duplicated into AC1/AC2), cross-referenced to
  coord-emit.sh and 057b r9 F1.** Verified by reading AC1 (lines
  114–119) and AC2 (lines 121–127) at the request SHA: neither AC body
  mentions the Accept header. The patch lives entirely in R1 (line
  185) and the added text correctly names *both* required media types
  (`Content-Type: application/json` AND
  `Accept: application/json, text/event-stream`), cites the same 406
  failure mode that the daemon's `StreamableHTTPServerTransport`
  enforces, and cross-references both `057b r9 codex F1 HIGH` and
  `tools/review-queue/coord-emit.sh`. The added JSON-RPC envelope
  sentence is the minimum extra detail needed to make the fallback
  buildable; the "Builder picks the cleaner path (SDK vs fetch)"
  framing is preserved — the fallback remains optional, not pre-empted.

- **(3) F3 disposition reconciles the four template references at
  "7-field" AND explicitly disclaims contradiction with the CLAUDE.md
  cross-tool 6-field baseline.** Cross-checked the four sites:
  - AC4 line 137: "7-field template (Trigger / Query inputs / Returned
    / Sources / **Repo** / Verdict / Note)" ✓
  - AC8 line 155: "7-field template (Trigger / Query inputs / Returned
    / Sources / **Repo** / Verdict / Note)" ✓
  - DoD line 204: "AC4: README documents install + hotkey binding + the
    7-field dogfooding template (R2 claude F2) verbatim." ✓
  - After Completion line 212: "**7-field** template … defined in AC4
    for ⌘⇧E invocations specifically (R3 codex F3 — MED — corrects an
    earlier 6-field reference here that contradicted AC4/AC8/DoD).
    One-liner, not a writeup. **Note:** the canonical cross-tool
    journal template per CLAUDE.md preamble remains 6-field for every
    other MCP caller; the **Repo** addition is v0-Raycast-scoped only
    per the R2 claude F2 disposition." ✓
  This is the exact framing my r2 review used in its "Where I
  deliberately did NOT find drift" section — the strategist moved the
  disclaimer from "implicit-in-claude-review" to "explicit-in-spec,"
  which is durable across future readers. The "If V1 dogfooding shows
  the **Repo** field is generally useful for other callers, a separate
  operating-model item promotes it" sentence keeps the V1 promotion
  path open without pre-empting V1.

- **(4) All six r1 patches still hold (no second-guessing of r1
  dispositions in r2 patches).** Spot-checked each:
  - r1 F1 — `derivedApp` inverts `buildSourceAppMap()`: still verbatim
    in spec body line 59 (now in `format.ts` instead of `source-app.ts`,
    but the inversion recipe is unchanged).
  - r1 F2 — ⌘B bare index URL: line 71 still pins
    `http://127.0.0.1:38479/` with the explicit "Per-atom deep-linking
    is V1 territory and explicitly out of scope for v0" close.
  - r1 F3 — AC8/AC9 in Post-Merge Gate: lines 148–164 unchanged, DoD
    preamble line 197 still carries the matching exclusion.
  - r1 F4 — no per-extension `.gitignore`: AC5 line 143 still cites the
    root `.gitignore` and explicitly notes the R2 codex F4 — LOW
    removal.
  - r1 F5 — placement note: line 110 unchanged, still framed as v0
    junk-drawer with V1 strategist choosing durable home.
  - r1 F6 — Repo field present in AC4/AC8/DoD/After-Completion: all
    four sites carry the field (now consistently named in all four,
    per F3 reconciliation above).

- **(5) Reviewer-lens differentiation continues.** The three r2 codex
  dispositions were all on r1-patch-induced surface area — file path
  ambiguity, missing Accept header, template number mismatch — squarely
  in the implementability lens. The r2 claude review (prior round) was
  zero findings, focused on disposition-discipline and structural
  separation. The r3 patches are now small enough that both lenses
  converge to "proceed" without overlap. The two lenses have stayed
  differentiated across all three rounds: claude verified disposition
  discipline at r2; codex verified spec-correctness at r2; r3 is the
  convergence point. This matches the r2 convergence call's success
  criterion: "If r3 lands [proceed, proceed] zero, this becomes a
  3-round convergence (6→3→0 shape, matching 040/042/045 historical
  decay)."

## Conceptual / scope-drift sweep on r2 patches

Beyond verifying the focus_hints, I applied my standard
conceptual/architectural-drift checks to the three r2 patches in
isolation:

- **V1-spec scope drift.** None. The r2 patches are spec-internal
  hygiene (helper relocation, header rigor, template reconciliation) —
  no new integrations, no new UI surfaces, no Layer 2/4 features
  introduced. The v0/V1 separation is intact.
- **Form-factor drift.** None. The clipboard-only delivery (↩ Copy /
  ⌘↩ Paste) and the deferral of explicit "launch into Cursor/Claude/
  browser with bundle attached" to V1 are unchanged. ⌘O remains the
  debug "open original source file" affordance (an OS file-association
  open), distinct from the V1 launch primitive.
- **Spec-vs-build divergence.** None. No `wiki/` page is touched; no
  manifest entry is changed; no `status: shipped` content is silently
  rewritten. AC9 line 159 still forbids the wiki update at v0 ship.
- **Cohort drift.** None. Patches don't introduce any non-indie-AI-
  builder assumptions.
- **Cross-item coherence.** The F2 Accept-header patch cross-references
  057b r9 codex F1 HIGH and `tools/review-queue/coord-emit.sh` —
  consistent with the same constraint enforced everywhere else in the
  repo that POSTs to `StreamableHTTPServerTransport`. F3's
  cross-tool-template disclaimer is consistent with the CLAUDE.md
  preamble (which I re-read at this SHA — the cross-tool template
  there is indeed the 6-field T/Q/R/S/V/N shape; the Repo field is
  v0-Raycast-local additive, not a silent override).
- **"Out of Scope" honesty.** OoS list stayed at 14 items. The r2
  patches did not introduce any new high-temptation adjacencies that
  would warrant a 15th item. The existing 14 items already cover the
  shape of the patches (e.g., #2 forbids new MCP tools; #11 forbids
  performance optimization; the Accept-header patch is implementation-
  detail rigor inside an existing fallback path, not new mechanism).

## Where I deliberately did NOT find drift

- **Renumbering skips AC6 and AC7.** Numbering jumps from AC5 to AC8
  (with AC8/AC9 in the Post-Merge Gate). Line 146 explicitly documents
  the renumbering origin (r2 codex F3 — MED) and the rationale (AC8/AC9
  could not be builder-verified, so they were moved out of the DoD
  block). The cosmetic awkwardness of "missing" AC6/AC7 is the cost of
  preserving traceability — future readers will hit the "where did AC6
  go?" question, but the inline `(R2 codex F3 — MED)` annotation
  answers it. Renumbering AC8→AC6 and AC9→AC7 would break that
  traceability and is the wrong trade for a cross-round review trail.
  Not a finding.
- **F2 R1 patch length.** The Accept-header patch grew R1 by ~3 lines
  (Accept header + JSON-RPC envelope sentence + cross-references). This
  is the upper bound of "minimum text to be correct" — any less and a
  builder forced into the fallback would still hit a 406. Not bloat;
  necessary precision. Not a finding.
- **derivedApp helper still offers a builder choice (import vs
  duplicate).** Same conceptual concern I read-not-finding at r2: the
  duplicate path is bounded, disclosed, and the import path requires
  Raycast's bundler to accept a cross-tree import. The escape hatch is
  consistent with R1's SDK-vs-fetch builder choice. Not a finding.

## Convergence read

The patch decay shape is on the predicted curve:
- r1: 4 MED + 2 LOW across two reviewers (6 findings total)
- r2: 0 claude findings + 3 codex MED on r1-patch surface (3 findings
  total)
- r3: 0 claude findings; codex r3 prediction is "0 to 1 LOW on r2-patch
  surface at most"

If codex r3 also lands `proceed` with zero new MED+, this is a
3-round convergence at the 6→3→0 decay shape — matching the historical
shape of 040/042/045. The spec is shippable as written; the strategist
should move to combine + close after codex r3 lands.
