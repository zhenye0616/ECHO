---
task_id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
role: strategist
writer: codex-strategist
last_updated: 2026-05-14T08:47:33Z
---

## current_thesis

R1 reviews landed and were dispositioned with founder authorization to patch despite divergent verdicts (`codex=pushback`, `cursor=proceed_after_patches`). Spec 048 is patched and should go to R2. The core design remains minimal patcher, tightened after R1: preserve builder-authored body content, keep `canonical_anchors` schema-compliant (`spec`/`reviews` only), and move handoff branch/head/run-log metadata to frontmatter.

## locked_decisions

- Scope is narrow: fix `/process-backlog` final handoff for `builder.md`; do not redesign task-state or reviewer/merge flows.
- `task_state_ref` is self-referential on the spec so future strategist/builder cold starts can find this pointer first.
- Design pick: build a minimal `patch-builder-state.py`, not a deterministic full renderer.
- Reason for patcher: `locked_decisions` contains builder-authored design choices and rejected alternatives; CLI args cannot reconstruct that content without flattening it into placeholders.
- Rejected alternative: full renderer `write-builder-state.py` from CLI args. It would either erase load-bearing `locked_decisions` content or secretly become a parser/patcher anyway.
- Rejected alternative: ask builders to hand-edit the pointer at handoff with no helper. 047 showed memory/procedure alone is insufficient; the protocol needs an executable step.
- Rejected alternative: CAS/blob-lease for `builder.md`. Builder state has a single owner during a claim; CAS remains specific to multi-writer `round-state.md`.
- Patcher updates only staleness-prone fields: frontmatter `last_updated` plus handoff metadata, lifecycle markers/open-question markers, and `canonical_anchors.spec`.
- Patcher preserves `locked_decisions` and `dont_touch` byte-for-byte, and fails closed on malformed/missing pointers rather than creating generic placeholder state.
- R1 accepted: `canonical_anchors` may contain only `spec` and optional `reviews`; branch/run-log/head-sha metadata moves to free frontmatter keys (`handoff_branch`, `handoff_head_sha`, `handoff_run_log`).
- R1 accepted: `current_thesis` updates are append-only via a patcher-owned marker block; no sentence guessing.
- R1 accepted: non-empty `open_questions` is preserved; missing `builder.md` is a no-op; malformed existing `builder.md` fails closed.
- R1 rejected/overrode Cursor LOW suggestion to preserve non-named anchors, because the shipped anchor parser rejects unknown keys.

## open_questions

- None blocking. Next action: open R2 on the patched 048 spec.

## dont_touch

- Do not edit `wiki/`; promotion is post-merge only.
- Do not modify reviewer queue behavior, merge-and-cleanup, or role-state MCP tools.
- Do not generalize `tools/task-state/push-round-state.sh` or add CAS for `builder.md`.
- Do not backfill old task-state pointers.
- Do not replace builder-authored `locked_decisions` with generated boilerplate.

## canonical_anchors

- spec: backlog/ready/2026-05-14-048-process-backlog-builder-state-handoff-refresh.md
- parent_spec: backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md
- schema: skills/role-typed-task-state.md
- followup: backlog/_followups.md
