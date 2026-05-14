---
item_id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
round: 2
reviewer: cursor
artifact_sha: 971112f23861677ed5593c1e522dc3e1e9cf6e41
completed_at: "2026-05-14T08:56:00Z"
verdict: proceed_after_patches
findings:
  - severity: medium
    where: "AC1 — `current_thesis` marker block: 'append or replace a patcher-owned marker block: `<!-- builder-state-handoff:start -->` / `<!-- builder-state-handoff:end -->`'; AC1 — `open_questions` escalated case: 'append or replace a patcher-owned marker bullet'"
    finding: |
      'Append or replace' is ambiguous in two places (current_thesis marker block + open_questions escalated marker bullet). The patcher needs deterministic semantics to satisfy AC5's marker-idempotence test: 'complete handoff appends/replaces only the patcher-owned current_thesis marker block.' Without an explicit rule, two patcher invocations could produce different states (one appends a second marker block; another replaces the first). Tighten AC1 to say: 'If the start marker (`<!-- builder-state-handoff:start -->` or the marker bullet's canonical prefix) is present, REPLACE the entire marker block/bullet (between start and end markers, or the marker bullet's line). If absent, APPEND a new marker block/bullet after the existing block content.' Apply the same rule to the open_questions escalated case so the test for marker idempotence has unambiguous behavior to assert.
  - severity: low
    where: "AC1 — `current_thesis` marker block content: 'containing the complete/ready-for-review or escalated-for-founder-input lifecycle note'"
    finding: |
      The literal content INSIDE the marker block is unspecified — only the wrapper tags are pinned. Different patcher invocations (or different builder bindings — codex vs Claude Code) could write different lifecycle-note wordings, making the AC5 marker-idempotence test non-deterministic. Recommend specifying a canonical template, e.g.: complete → `- Lifecycle: COMPLETE — ready for review at <head_sha>.`; escalated → `- Lifecycle: ESCALATED — see agent_notes for blocker.` Pinning the wording lets the test assert a specific string and lets readers grep for it across the corpus. Trivial AC1 addition — one line per outcome.
  - severity: low
    where: "AC1 — marker block authorship: 'Patch only the `## current_thesis`, `## open_questions`, and `## canonical_anchors` blocks. Preserve `## locked_decisions` byte-for-byte...'"
    finding: |
      The spec doesn't explicitly state that the marker-block region is reserved for the patcher. A builder who writes `<!-- builder-state-handoff:start -->` literally in their current_thesis (e.g., to demonstrate the pattern, or by copy-paste from this spec) would have whatever follows replaced on the next patcher run. Probably zero-impact in practice (no realistic builder would emit this token in narrative prose), but worth a sentence under AC1 explicitly reserving the marker zone for patcher use, OR under dont_touch in the strategist.md template: 'Builder must not author content inside `<!-- builder-state-handoff:* -->` markers; the region is patcher-owned.' Defensive-only.
  - severity: nit
    where: "AC5 — `tests/task-state/patch-builder-state.test.ts` 'malformed existing builder.md exits non-zero. Required malformed fixtures: missing `## canonical_anchors` and required headings out of order.'"
    finding: |
      Two fixture shapes are listed but a third worth-covering shape is missing: frontmatter present but YAML-invalid (e.g., unclosed brace, key without value). The lint at `tools/task-state/lint.py` checks block presence + order + cap, not frontmatter validity — so a YAML-invalid frontmatter is its own malformed category. If the patcher tries to read/update `last_updated` and the YAML parser raises, the helper should exit non-zero per AC1's malformed-exits-non-zero rule. Add as a third concrete fixture in AC5 (e.g., 'YAML-invalid frontmatter') to cover the parser-failure malformed shape.
---

# Cursor reviewer notes — R2 / 048

**Verdict: proceed_after_patches.** All R1 HIGH and MEDIUM findings are resolved as the R1 focus_hints required. Remaining items are specificity tightenings (one MEDIUM, two LOW, one nit). No HIGH; no design redo; spec is structurally ready for build.

## R1 focus_hints verification

| R1 focus_hint | Verified? | Evidence |
|---|---|---|
| canonical_anchors schema-compliant (spec + optional reviews only); handoff_* in frontmatter doesn't require parser/schema change | ✅ | AC1: "write only `spec` and, if already present, `reviews`. Unknown keys such as `branch`, `run_log`, `head_sha`, and `worktree` must not remain in `canonical_anchors`; the named handoff metadata belongs in frontmatter." Frontmatter handoff_* keys don't trigger `parse-anchors.ts` (parser only reads canonical_anchors body) or `lint.py` (lint checks block presence/order/cap, not frontmatter schema). Out of Scope preserved. |
| current_thesis update is marker-block append/replace, not sentence guessing | ✅ (with MEDIUM specificity finding) | AC1: marker block with explicit wrapper tags. Sentence-guessing eliminated. Remaining: "append or replace" ambiguity (see finding 1). |
| non-empty open_questions/locked_decisions/dont_touch preserved; missing no-op; malformed fail-closed | ✅ | AC1 explicit on all four: open_questions preserved when non-empty; locked_decisions byte-for-byte; dont_touch byte-for-byte; missing → exit 0 no-op; malformed-existing → exit non-zero. |
| AC5 fixtures cover malformed shapes + marker idempotence | ✅ (with LOW completeness finding) | AC5: "complete handoff appends/replaces only the patcher-owned current_thesis marker block and preserves the existing multi-sentence implementation summary"; "missing canonical_anchors and required headings out of order" as concrete malformed fixtures. Remaining: third malformed shape worth covering (YAML-invalid frontmatter — see finding 4). |

R1 focus_hints **all satisfied at the load-bearing level**. The MEDIUM and LOWs in this round are downstream from the focus_hints' partial completeness, not contradictions.

## Findings summary

| # | Severity | Topic | Disposition recommendation |
|---|---|---|---|
| 1 | MEDIUM | marker-block "append or replace" ambiguity | accept-with-patch — tighten to "if start marker present, REPLACE; else APPEND" |
| 2 | LOW | marker block content template unspecified | accept-with-patch — pin canonical wording per outcome |
| 3 | LOW | marker zone authorship reservation not stated | accept-with-patch (one sentence in AC1 or dont_touch) |
| 4 | NIT | AC5 missing third malformed-fixture shape (YAML-invalid frontmatter) | accept-with-patch — add fixture |

All 4 are mechanically dispositionable inline. None require structural redesign.

## Drift watch vs R1

The R1 disposition+patch commit (`971112f`) touched only the spec body and supporting artifacts. No regression introduced. The Out of Scope section was correctly extended (added "Do not replace builder-authored locked_decisions with generic helper output" in R1 disposition — preserved in R2). Risks section gained R5 ("Canonical anchor cleanup may remove legacy non-schema anchor keys"). All additive.

## Recommendation for the strategist watcher

If codex reviewer converges to `proceed` or `proceed_after_patches` on R2 (likely, since codex's R1 HIGH was fully resolved): apply the 4 mechanical patches inline per the 046 R4 precedent, then declare CLAIM-READY at the patched SHA. No R3 needed unless codex flags something new.

If codex reviewer flags a new HIGH at R2: open R3.

Either way, no founder escalation expected — all findings to date have been mechanically dispositionable.

## Convergence trajectory

| Round | codex verdict | cursor verdict | Findings | Decay shape |
|---|---|---|---|---|
| R1 | pushback | proceed_after_patches | 10 (2 codex + 8 cursor) | DIVERGENT — codex caught the parser-contract HIGH cursor missed; cursor caught open_questions overwrite codex missed |
| R2 | ? | proceed_after_patches | ≤ ~6 (4 cursor + likely 0-2 codex) | converging |

The R1 → R2 decay matches the 046/047 cross-vendor pattern: divergent at R1 (complementary lenses surface different load-bearing issues), converging at R2 (mechanical patches absorbed). 048 is on track to claim-ready by R3 at latest.
