---
task_id: 2026-05-28-079-loop-reliability-pack
role: builder
writer: codex-builder-079
binding: codex
claim_branch: agent/loop-reliability-pack
last_updated: 2026-05-29T06:33:14Z
---

## current_thesis

Claimed 079 as Codex builder. Implement the loop reliability pack as operating-model hardening: AC1 clean-snapshot helper and live-checkout guard, AC2 one effect boundary and non-live push sentinel guard, AC3 validated committed review sidecar contract, and AC4 coupled-file invariant checker. AC5 is stretch only after AC1-AC4 are complete and green.

## locked_decisions

- AC1: factor the existing ephemeral-worktree preamble into `tools/review-queue/_clean-snapshot.sh`, convert `_run_reviewer.sh` and the watcher/merger skill prose to source it, and guard `combine.py`'s git-mutating path against founder-live checkout mutation unless a valid `$TMPDIR/echo-<role>-<uuid>` snapshot or explicit `--allow-live` is used.
- AC2: add one `tools/review-queue/_effect-runner.sh` boundary for `{spawn-agent,codex-exec,push,launchd,review-tick}`; live mode executes unchanged, while dry-run/test no-op with exact mode-symmetric status, including `ECHO_EFFECT_NONLIVE_RC=97` for `push`.
- AC2 false-completed guard: route the whole `push-with-retry.sh` pull+push cycle through the boundary and make `commit-reviewer-response.sh` treat the non-live push sentinel as non-completed without leaving a local-only response commit.
- AC3: add the committed sidecar schema and validator, preserving the existing `/review-pending` sidecar shape with only additive `producer`, exact heading matching, and `reviewed_at` datetime coercion; update canonical skills and re-sync adapters.
- AC4: add `check-coupled-invariants.sh` for package-lock coherence, skill-adapter sync, and MCP registration coherence, then wire it into merge-and-cleanup C5 as a pause-on-failure gate.
- AC5: optional stretch only; if shipped, produce a standalone provenance classifier and test without wiring it into the watcher reframe gate.
- AC6: no builder-side marker beyond handoff evidence; observational validation happens on the next full review-to-merge cycle after this item merges.
- AC7: per-AC shell tests plus root `npm test`, `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh --check`, and `git diff --check` must be green before handoff.

## open_questions

- None blocking at claim. Escalate if implementation requires files outside `files_to_modify`, a new dependency, item-body edits, daemon production TypeScript changes, coord-ledger changes, or any alteration to founder-gate checkpoints.

## dont_touch

- No new orchestration layer, role, product surface, coord event, MCP tool, or daemon production TypeScript change.
- Do not modify atomic claim, reviewer independence, founder-gate checkpoints, `request.py` round semantics, `dispatch-next-round.py`, or `combine.py` emitter content.
- Do not wire AC5 into the watcher reframe gate; producing the classifier is the full stretch scope.
- No auto-fix behavior in AC4; the coupled-file checker is a gate that pauses and surfaces drift.
- Do not edit `wiki/**`, `docs/BACKLOG.md`, `docs/STATUS.md`, `docs/NORTH_STAR.md`, item bodies, HTML twins, or the dogfooding archive.

## canonical_anchors

- spec: backlog/claimed/2026-05-28-079-loop-reliability-pack.md
