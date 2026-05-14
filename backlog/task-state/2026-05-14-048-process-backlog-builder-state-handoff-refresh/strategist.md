---
task_id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
role: strategist
writer: codex-strategist
last_updated: 2026-05-14T07:59:31Z
---

## current_thesis

Spec 048 is drafted and awaiting claim. It serves the friction-first gate by removing a concrete reviewer/founder correction from the builder handoff path: 047 proved `builder.md` can go stale when `/process-backlog` moves an item to `pending_review/` without refreshing the role-typed builder pointer.

## locked_decisions

- Scope is narrow: fix `/process-backlog` final handoff for `builder.md`; do not redesign task-state or reviewer/merge flows.
- `task_state_ref` is self-referential on the spec so future strategist/builder cold starts can find this pointer first.
- Design pick: build a minimal `patch-builder-state.py`, not a deterministic full renderer.
- Reason for patcher: `locked_decisions` contains builder-authored design choices and rejected alternatives; CLI args cannot reconstruct that content without flattening it into placeholders.
- Rejected alternative: full renderer `write-builder-state.py` from CLI args. It would either erase load-bearing `locked_decisions` content or secretly become a parser/patcher anyway.
- Rejected alternative: ask builders to hand-edit the pointer at handoff with no helper. 047 showed memory/procedure alone is insufficient; the protocol needs an executable step.
- Rejected alternative: CAS/blob-lease for `builder.md`. Builder state has a single owner during a claim; CAS remains specific to multi-writer `round-state.md`.
- Patcher updates only staleness-prone fields: frontmatter `last_updated`, lifecycle summary/open questions, and canonical anchors (`spec`, `branch`, `run_log`, `head_sha`).
- Patcher preserves `locked_decisions` and `dont_touch` byte-for-byte, and fails closed on malformed/missing pointers rather than creating generic placeholder state.

## open_questions

- None blocking. Builder should implement the patcher design as specified and escalate only if existing pointer shapes make byte-preserving patching ambiguous.

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
