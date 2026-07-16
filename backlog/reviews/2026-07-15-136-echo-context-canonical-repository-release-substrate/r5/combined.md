---
item_id: 2026-07-15-136-echo-context-canonical-repository-release-substrate
round: 5
combined_at: '2026-07-16T03:26:26Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 3d74d33bdf0a3bd81c409478b83b3702d4704c67
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: TRIGGERED — all 7 findings (4 codex, 3 codex-ops) target the AC5/AC6 publication-recovery surface built up by prior `spec-r1/r2/r3/r4-patches` commits (ad53c6c7, 0f05a7ce, 9997f073, 28f70ee0): ownership marker + deterministic tag-object SHA, ambiguous-response resume, automated cleanup, pre-dispatch expected-manifest-hash computation, and rerun attribution — none of which existed in the original spec. Count >= 2, so the mandatory fresh-context investigator ran (`codex exec --sandbox read-only`). Verdict: `structural_cut` — the r4 cut removed cross-version management but retained a custom recovery *transaction*; r5 targets exactly that patch-added surface. A supervised, founder-gated one-shot release needs fail-closed publication, not a release manager: cut marker-based recovery, ambiguous-write resume, automated cleanup, pre-dispatch manifest building, and rerun-recovery; add only fixed release identity/flags, fail-stop transitions, an exhaustive exact-set final postcondition, and `run_attempt == 1` enforcement. Diagnostic check applied: after the cut, a clean first attempt still progresses from a fully paginated empty namespace to exactly one named annotated tag, one correctly flagged prerelease, and three verified assets; any ambiguity, failure, cancellation, foreign state, or rerun causes no further write or deletion and blocks pending founder disposition. The cut preserves every load-bearing prior control (founder gate over the nine-field tuple, build-once/no-rebuild, three assets, build/publish split, empty-namespace rule, main/ref/API dispatch guards, minimal permissions), so no accepted r1–r4 finding reopens. Investigator risk accepted: removal of unattended-recovery liveness means any ambiguous post-write response blocks until founder inspection — acceptable for a founder-supervised first-release-only workflow; item 137 owns any real recovery generalization.

Removal proof matrix:
- state_removed: canonical ownership marker (draft body + tag message) and its approved-tuple-hash encoding; deterministically pre-constructed tag-object bytes/SHA; `expected manifest hash` dispatch input; per-attempt recovery records.
- behavior_removed: resume-after-ambiguous-write via marker readback; automated best-effort same-run draft/asset/tag deletion on failure; founder-local pre-dispatch `build:artifact` run; rerun (`run_attempt > 1`) recovery handling.
- owners_removed: the dispatching founder/operator no longer builds the artifact pre-dispatch; the publish-release job no longer owns cleanup deletion or ambiguity resolution (founder manual disposition owns both).
- tests_removed_or_changed: lost-response resume-on-marker fixtures → fail-stop absence fixtures (no retry/repeat/delete); cleanup fixtures deleted; wrong-expected-manifest-hash dispatch fixture deleted; rerun-recovery → `run_attempt > 1` rejection fixture; added release-identity and exact-set final-postcondition fixtures.
- remaining_invariants: founder approval over the nine-field tuple via the source-release protected environment; build-once, artifact-ID-bound download + digest verification, publish-without-rebuild; empty-namespace precondition + fully paginated exact-set final postcondition; draft-staged publication with fixed identity/flags; fail-closed stop on any ambiguity/failure/foreign state; per-dispatch run-ID/conclusion record; item-137 gate on later-release generalization.
- Failure-mode check: the additions (fixed identity/flags, final exact-set readback, rerun guard) are declarative postconditions/guards, not a relabeled recovery mechanism; state, behavior, and owners genuinely disappear. Matrix passes — this is a true structural cut, not deeper patching.

Patch commit: 3d74d33bdf0a3bd81c409478b83b3702d4704c67 (`spec-r5-patches`).

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC6 publication marker and annotated-tag paragraph | accepted — mechanism dropped (structural cut): ownership marker + deterministic tag-object SHA removed; release identity now fixed and falsifiable by readback (tag ref `refs/tags/v<version>` at approved source SHA, message = version + source SHA, release name/tag `v<version>`) instead of by byte-encoded tag-object construction | 3d74d33b |
| 2 | MEDIUM | codex | AC6 empty-namespace and staged-publication paragraphs | accepted (adapted): no claim of serializing foreign writers; per-write readback retained and a fully paginated exact-set final postcondition added (exactly one expected tag, one published prerelease, three matching assets, nothing else) — foreign state appearing mid-run blocks at final readback | 3d74d33b |
| 3 | MEDIUM | codex | AC6 failure cleanup paragraph | accepted — mechanism dropped (structural cut): automated best-effort cleanup removed entirely; fail-stop no-delete after any ambiguous/failed write incl. post-publish-update states, founder manual disposition, fresh dispatch re-enters via empty-namespace rule; the draft-vs-published deletion edge no longer exists | 3d74d33b |
| 4 | MEDIUM | codex | AC5 deterministic archive contract and AC6 expected-manifest-hash computation | accepted — mechanism dropped (structural cut): pre-dispatch expected-manifest-hash input and founder-local build removed, so cross-host byte-equality is no longer load-bearing; manifest hash is computed once inside build-artifact and bound by founder approval over the nine-field tuple; AC5 two-build determinism remains a pinned-toolchain test property, unchanged | 3d74d33b |
| 5 | MEDIUM | codex-ops | AC6 — release publication contract | accepted — same patch as row 1: explicit `tag_name`/name `v<version>`, `draft: true` at staging, `prerelease: true` + `make_latest: false` at publish, all three flags verified in every post-update readback and the final postcondition; a normal/latest release now fails verification | 3d74d33b |
| 6 | MEDIUM | codex-ops | AC6 — empty-namespace checks and publication concurrency | accepted (adapted) — same patch as row 2: stage readbacks + exact-set final postcondition rather than concurrency exclusion; extra tag/release/asset at final readback blocks for founder disposition | 3d74d33b |
| 7 | MEDIUM | codex-ops | AC6 — cancellation, rerun, and migration evidence | accepted (alternative): reruns rejected instead of ledgered — `github.run_attempt == 1` guard fails any rerun before job steps, so failed attempts cannot write and recovery is always a fresh dispatch through the empty-namespace rule; per-dispatch run-ID/terminal-conclusion record retained; per-attempt ledger unnecessary once reruns cannot mutate | 3d74d33b |

## Convergence call

needs R6 — focus_hints: verify the r5 fail-closed structural cut: fixed release identity/flags (tag ref `refs/tags/v<version>` at approved source SHA, `draft: true` staging, `prerelease: true` + `make_latest: false` at publish); no ownership marker, no deterministic tag-object SHA, no ambiguous-write resume, no automated cleanup — fail-stop no-delete with founder manual disposition; dispatch inputs reduced to source SHA + version + expected lock hash (manifest hash bound only by tuple approval); `run_attempt == 1` rerun rejection; fully paginated exact-set final postcondition; Tests bullet alignment (release-identity, fail-stop, final-postcondition, rerun-rejection fixtures).

