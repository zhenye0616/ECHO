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

## Phase 2 — claim `ready/ → claimed/`  (codex builder atomic claim, 2026-06-04)

Driver: background codex builder (`run-codex-builder.sh`). Claimed at `929a6448`.

- 🟢 **Atomic claim clean.** Builder acquired the lock (PID 47455), pulled main, claimed 089 (the only
  ready candidate), pushed. No collision, no friction.
- 🟢 **Seal survived the claim — the important validation.** The claim commit mutates agent-managed
  frontmatter (`claimed_by`/`claimed_at`/`branch`), and `ready_content_sha` STILL validated afterward,
  because those fields are in the seal's exclusion set (`AGENT_MANAGED_FIELDS`). This is the new gate
  working as designed: a builder can claim a sealed item without invalidating its seal.

## Phase 3 — build on the agent worktree  (implement AC1–AC6, 2026-06-04)

Branch `agent/legacy-spec-review-gate-teardown` @ `c4150c62`. Diff: 6 files, net −15 (removal-heavy).

- 🟢 **Removal-heavy build, no drift.** `tools/blocked.py` −75 lines (legacy path + validation + helpers
  gone); `legacy_spec_review_satisfied` and the `--spec-review-sha` alias both verified absent (0
  occurrences). Diff matches `files_to_modify` exactly. `test_blocked.py` 33→35 tests, full `npm test`
  1555 passed, lint/typecheck/sync-skills/validate all green (independently re-run, not trusted from
  agent_notes).
- 🟢 **Builder honored the r1 spec disposition.** `agent_notes` confirms it kept `CONTENT_MARKER_FIELDS`
  unchanged and ran the AC3 caller sweep ("found no users" → removed the alias) — i.e. the spec-review
  round's decisions propagated correctly into the build. The proposed→ready review actually shaped the
  implementation.

## Phase 4 — `claimed/ → pending_review/`  (builder handoff, 2026-06-04)

- 🟡 **Handoff commit mislabeled `review:`.** The move-to-`pending_review` commit is `e01aef58 review:
  2026-06-04-089-…` — the SAME mislabel observed at the 088 build. The builder prefixes its
  completion/handoff commit with `review:`, which collides visually with `/review-pending` sidecar
  commits in `git log` (those are also `review: <id>`). Cosmetic but misleading for anyone scanning
  history. Recurring across two builds → `_followups.md`.
- 🟡 **`status: proposed` propagates to `pending_review`.** The Phase-1 stale-status finding rides all
  the way through `claimed/` and `pending_review/` — the item still reads `status: proposed` while
  physically in `pending_review/`. Folder is authoritative so nothing breaks, but the field is now
  doubly misleading (and still frozen by the seal). Reinforces the promote.py fix already filed: the
  field should be corrected at promotion (or excluded from the seal) so it can track the folder.

---

## Net read on the new pipeline

Functionally **solid** end-to-end: proposed→ready→claimed→pending_review all worked, the seal held
across the claim, the spec-review decisions shaped the build, and verification is green. All friction
found is 🟡 (cosmetic/operational), zero 🔴. The one structural rough edge is the **`status` field**:
sealing it froze a value that the folder-authoritative model otherwise renders vestigial — it should
either track the folder (updated at each stage move) or be excluded from the seal. The `review:`
handoff-commit mislabel is a trivial builder-prompt fix.
