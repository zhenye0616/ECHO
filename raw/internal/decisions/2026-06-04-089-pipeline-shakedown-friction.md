# 089 pipeline shakedown — friction log (proposed → ready → claimed → pending_review)

**Purpose.** 089 (`legacy-spec-review-gate-teardown`) is the first item run end-to-end through the
post-088 pipeline. This log captures every friction point observed at each stage transition, in the
moment, so the new infra's rough edges become backlog input rather than lore. Observations only — fixes
are filed to `backlog/_followups.md`, not designed here.

Legend: 🟢 worked cleanly · 🟡 friction (works, but rough) · 🔴 broken / needed intervention

---

## Phase 1 — author into `proposed/` + spec-review → `ready/`  (DONE, 2026-06-04)

Driver: strategist (Claude). Reviewers: codex + codex-ops. 2 rounds to convergence.

- 🟢 **`request.py` proposed-first resolution.** Seeded r1 with no `--artifact-path`; it resolved the
  artifact straight from `backlog/proposed/` (088 AC3). Zero friction.
- 🟢 **Proposed-stage path-(c) cut.** r1 returned `proceed_after_patches`; the patched proposed spec
  correctly routed to a verification round (r2) instead of terminalizing. 088 AC4 held live.
- 🟢 **`promote.py` stage-only promotion.** Stamped `ready_content_sha` (`f4401d9e`) + `git mv
  proposed→ready`, folded into the terminal commit (no separate promote commit). Seal self-validates;
  `blocked.py` immediately listed 089 as the claimable READY candidate.
- 🟡 **Stale `status:` field after promotion (the irony finding).** `promote.py` moved the file to
  `ready/` and sealed it but left `status: proposed` in the frontmatter. It's cosmetic — the gate keys
  off folder, and `--validate` + claimability both pass — but it is the exact folder-vs-field drift 088
  set out to kill. Worse: because `status` is a non-excluded (sealed) field, the seal *froze* it — you
  cannot correct it to `status: ready` without invalidating `ready_content_sha`. Fix options for a
  `promote.py` follow-up: set `status: ready` *before* stamping, OR exclude `status` from the seal.
  → filed to `_followups.md`.
- 🟡 **Same-vendor reviewer serialization.** codex + codex-ops share one Codex account, so each round's
  two reviews ran sequentially (~2× wall-clock), not in parallel. Known issue (087 followup); confirmed
  again live. The lever is vendor diversity in `requested_reviewers`; non-blocking.
- 🟢 **Review substance.** r1 caught a real internal contradiction (AC5 guard vs decision-2 lenient-
  ignore) and the two reviewers even disagreed on the fix; the root-cause disposition (keep
  `CONTENT_MARKER_FIELDS` unchanged) converged r2 to `proceed`/0-findings. The queue is not a rubber
  stamp.

## Phase 2 — claim `ready/ → claimed/`  (codex builder atomic claim)

_(appended as observed)_

## Phase 3 — build on the agent worktree  (implement AC1–AC6)

_(appended as observed)_

## Phase 4 — `claimed/ → pending_review/`  (builder handoff)

_(appended as observed)_
