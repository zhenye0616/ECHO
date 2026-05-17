---
item_id: "2026-05-17-060-hotkey-overlay-v0-raycast-dogfood"
round: 4
reviewer: "claude"
artifact_sha: "37751e3"
completed_at: '2026-05-17T21:46:36Z'
verdict: "proceed"
findings: []
---

# claude review — 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood r4

## Lens

Conceptual / architectural / scope-drift / V1-spec-discipline, applied
to the r3 patch deltas (`34f29a8..37751e3`) rather than re-reading the
whole artifact. The r3 codex review surfaced 1 MED + 1 LOW; the r3
claude review was zero findings (proceed); combined verdict was
`proceed_after_patches`. R4 must verify the two r3 dispositions landed
cleanly and applied the disposition-discipline rule from
`skills/review-queue-watch.md`.

## Verdict rationale — proceed

Both r3 codex dispositions landed cleanly and the patch surface is the
*smallest* it has been across four rounds (6→3→2 finding decay; r4 is
zero). The MED disposition is a textbook application of the
"prefer removal over deeper patching" rule in
`skills/review-queue-watch.md` — the strategist deleted the misleading
`prefer:"newest_first"` parameter and honestly relabeled the v0
behavior as "3 representative atoms in lex-id order," rather than
adding a two-stage fetch-and-resort pipeline that would have grown
the spec surface. The LOW disposition correctly extended codex's
3-site fix to a 4th site the reviewer missed, while preserving the
rename-origin annotation at line 146 for cross-round traceability.

Verification of the two r3 codex dispositions, in order:

- **(F1 MED — cluster atom selection chronology-safety: REMOVAL, not
  expansion.)** The original line 63 read
  `get_atoms(cluster.atom_ids.slice(0,3), format:"minimal",
  prefer:"newest_first")` — silently wrong because
  `connectedComponents()` in `src/trace/cluster.ts:151-156` lex-sorts
  cluster IDs before they reach `find_clusters`, so the slice picks an
  arbitrary lex-prefix subset and `prefer:newest_first` only re-sorts
  those three lex-prefix atoms (not the cluster's newest three). The
  strategist had two paths: (a) ADD mechanism — fetch more atoms then
  resort client-side, or (b) REMOVE the misleading parameter and tell
  the truth about what v0 does. The diff at line 63 confirms path (b):
  `prefer:"newest_first"` is deleted, the spec body now states "V0
  accepts '3 representative atoms' in lex-id order," and Codex's
  "fetch up to the `get_atoms` max [50] and display the newest
  returned atoms" alternative is explicitly tagged as "the V1 candidate
  fix if dogfooding flags it." This is the disposition-discipline
  rule from `skills/review-queue-watch.md` applied correctly: the
  patch makes the spec smaller and honest, defers the
  chronology-correct version to V1 where dogfooding will determine
  whether the cost of correctness is justified, and avoids
  pre-committing to a V1 implementation shape. The commit message's
  own framing — "Per disposition discipline: removed mechanism rather
  than added (e.g., a two-stage fetch pipeline)" — names the rule
  explicitly. Also note the commit message's honest "ORIGINAL-spec
  bug, not r2-patch-induced" attribution: this is not strategist
  drift; codex caught a pre-existing bug at r3.

- **(F2 LOW — stale AC6/AC7 references: 4 sites fixed, not 3.)** Codex
  named lines 17, 48, 211. The strategist found and fixed a 4th site
  at line 26 (`spec_refs` entry for the dogfooding journal: "AC6's
  '≥10 entries / ≥3 days'" → "AC8's"). Verified by diff: all four
  numbering references now correctly point at AC8/AC9, the live
  Post-Merge Gate items. Line 146 — the
  `(R2 codex F3 — MED)` rename-origin annotation that explains why
  the numbering jumps from AC5 to AC8 — is PRESERVED. This is the
  right call: future readers hitting "where did AC6 go?" still find
  the answer at line 146, and the four downstream references are now
  consistent with the rename. Renumbering line 146 would have broken
  the cross-round traceability for a cosmetic gain.

## Conceptual / scope-drift sweep on r3 patches

Beyond verifying the two F-dispositions, I applied my standard
conceptual / architectural-drift checks to the r3 patch surface in
isolation:

- **V1-spec scope drift.** None — in fact, the F1 disposition *strengthens*
  v0/V1 separation: a v0 feature (`prefer:"newest_first"`) that the
  underlying primitive cannot actually deliver was deleted, and the
  V1 candidate-fix is documented in the spec body as a
  dogfooding-gated future decision. This is the rare patch that
  shrinks v0 surface while clarifying V1 territory — the cleanest
  possible shape of the [[drift-prevention]] rule.

- **Form-factor drift.** None. ⌘B / ⌘O / ⌘↩ / ⌘C / ↩ ActionPanel
  shape unchanged; clipboard-only delivery unchanged; no Layer 2 /
  Layer 4 introduction.

- **Spec-vs-build divergence.** None. No `wiki/` page is touched; no
  manifest entry is changed; no `status: shipped` content is silently
  rewritten. AC9 (line 159 at the new SHA) still forbids the wiki
  update at v0 ship.

- **Cohort drift.** None. Patches are spec-internal hygiene; no new
  cohort assumptions enter.

- **Cross-item coherence.** The F1 disposition's explicit reference
  to `src/trace/cluster.ts:151-156` is correct against the pinned SHA
  (codex traced this; I verified the line range is unchanged at
  37751e3). The "V1 candidate fix" framing keeps a future V1
  hotkey-overlay backlog item in a clean position to either adopt
  Codex's recommendation or pick a different chronology-safe shape
  based on dogfooding data — neither path is pre-empted.

- **"Out of Scope" honesty.** OoS list stayed at 14 items. The F1
  disposition arguably surfaces a 15th-candidate
  ("chronology-correct cluster atom selection — V1 if dogfooding
  flags it"), but this is already deferred in the spec body via the
  "V1 candidate fix" framing and the OoS list is not the right home
  for every V1-deferred decision — it's reserved for high-temptation
  builder adjacencies (new MCP tools, telemetry, multi-user
  installers, etc.). The 14 items continue to cover those. Not a
  finding; the disposition is correctly placed in the spec body, not
  in OoS.

## Where I deliberately did NOT find drift

- **The F1 disposition narrows V1's implementation latitude.** The
  spec body now names "fetch up to the `get_atoms` max [50] and display
  the newest returned atoms" as the "V1 candidate fix." This is *more*
  specific than the prior round's silence on the topic. One could
  argue the strategist should have left V1 entirely unconstrained
  ("v0 ships lex-id order; V1's selection policy is TBD"). I
  considered this — but the framing as "Codex's recommended
  alternative" + "if dogfooding flags it" is sufficient distance: it
  names a *plausible* V1 path without making it canonical. The
  attribution to "Codex's recommended" makes clear this is a
  reviewer-surfaced idea, not strategist's pre-decision. Not a
  finding; the V1-deferral discipline is still honored.

- **The F1 patch grew the spec body by ~3 lines.** Adding 3 lines of
  rationale around a 1-parameter deletion is the price of explaining
  *why* the deletion was the right disposition. Without that
  rationale, a future builder or V1 strategist might re-introduce
  `prefer:"newest_first"` under the assumption that the v0 author
  just forgot it. The explanatory text is load-bearing, not bloat.
  Not a finding.

- **F2 line 26 fix was beyond codex's 3-site claim.** Codex named
  lines 17, 48, 211; the strategist found a 4th site at line 26. This
  is the strategist doing the diligence codex didn't (codex's grep
  was probably scoped to non-frontmatter lines). The right disposition
  for an "X sites" reviewer claim is "fix X-plus-whatever-else-the-
  grep-actually-catches," not "fix exactly the X sites named." Not a
  finding — this is correct scope-completion, not scope-expansion.

## Convergence read

The patch decay shape continues on the predicted curve:
- r1: 4 MED + 2 LOW across two reviewers (6 findings total)
- r2: 0 claude findings + 3 codex MED on r1-patch surface (3 findings)
- r3: 0 claude findings + 1 codex MED + 1 codex LOW on
  original-spec-bug + r2-rename leftover (2 findings)
- r4: 0 claude findings; codex r4 prediction is "0 findings, or at
  most 1 LOW on r3-patch-attribution leftovers"

If codex r4 also lands `proceed` with zero new findings, this is a
4-round convergence at the 6→3→2→0 decay shape — slightly longer than
the historical 3-round shape of 040/042/045, with the extra round
explained by codex catching one ORIGINAL-spec bug at r3 that the
prior rounds (and my own three prior claude reviews) missed. That
miss is worth naming honestly: my r1/r2/r3 reviews focused on
disposition discipline and conceptual drift but did not trace the
`prefer:"newest_first"` parameter all the way to
`src/trace/cluster.ts` — that's exactly codex's implementability
lens working as designed, with the two lenses converging by r4.

The spec is shippable as written; the strategist should combine and
close after codex r4 lands.
