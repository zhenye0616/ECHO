---
item_id: 2026-05-14-048-process-backlog-builder-state-handoff-refresh
round: 1
reviewer: cursor
artifact_sha: 72f3ddb9b501fd80a8ae12db9a3c0a93cc089dbd
completed_at: "2026-05-14T08:14:00Z"
verdict: proceed_after_patches
findings:
  - severity: high
    where: AC1 — "In `## open_questions`, write `- None blocking; handed off for review.` for `complete`..."
    finding: |
      The patcher's open_questions rewrite OVERWRITES the builder's content rather than preserving it. This contradicts the spec's own stated motivation that the patcher should preserve builder-authored working memory. 047's empirical builder.md had open_questions = "None blocking. All 7 ACs verified locally (npm test for the new file passes 3/3; full suite + lint + typecheck + sync-skills --check to follow before push)." — a builder-authored summary, not the spec's mandated literal "- None blocking; handed off for review." string. Forcing the rewrite is a regression vs. the 047 pattern and erases concrete acceptance evidence the builder wrote. Fix options (pick one): (a) treat open_questions like locked_decisions — preserve byte-for-byte if non-empty, only inject the literal default when the block is empty/whitespace; (b) APPEND the lifecycle marker as a final bullet rather than replacing the block; (c) make the rewrite conditional on a builder-set sentinel (e.g., if the block ends with "<!-- patcher-may-overwrite -->"). Option (a) is the smallest behavioral change and matches the locked_decisions/dont_touch preservation pattern already chosen.
  - severity: medium
    where: AC1 — "In `## current_thesis`, change the lifecycle sentence to complete/ready-for-review or escalated-for-founder-input without deleting the builder's existing implementation summary."
    finding: |
      Underspecified: the patcher needs a deterministic way to identify the "lifecycle sentence" within current_thesis. The AC names the constraint (don't delete implementation summary) but not the mechanism. Three viable specifications: (i) a marker the builder MUST emit (e.g., a leading literal "Lifecycle: in-flight." sentence) which the patcher swaps; (ii) a regex/anchor pattern the patcher matches; (iii) the patcher APPENDS a lifecycle sentence as a new final sentence/paragraph rather than swapping anything. Without picking one, the builder will improvise per-cycle and the patcher's behavior will be inconsistent. Recommend (iii) — append-only is simplest and never destroys content; matches the patcher's conservative "preserve builder authorship" intent.
  - severity: medium
    where: AC2 — "Detect builder-state scope if `task_state_ref:` is non-empty in the item frontmatter OR `backlog/task-state/<task-id>/builder.md` already exists." + AC1 — "If `builder.md` is missing, malformed, or lacks required blocks, the helper exits non-zero..."
    finding: |
      Internal contradiction in the detection-vs-failure logic. The detection condition is OR (either task_state_ref non-empty OR builder.md exists), which means the patcher gets invoked whenever task_state_ref is set even if builder.md is absent. Then AC1 says the patcher exits non-zero on missing builder.md. Net effect: any spec with task_state_ref set but no initial builder.md created causes the builder handoff to fail. This is exactly the new 048 spec's situation (task_state_ref is self-referenced, no builder.md exists yet) and would also break any future spec that doesn't explicitly create an initial builder.md during the build phase. Fix: either (a) tighten the detection condition to AND (`task_state_ref` set AND `builder.md` exists) — patcher only runs when both are true; (b) keep OR but make missing-builder.md a no-op (not a failure) since the protocol's intent is "refresh if exists" not "require exists"; (c) make AC2 explicitly state that the builder MUST create the initial builder.md before this step, and the missing case is a build-time bug not a patcher bug. Recommend (b) — it matches the protocol's friction-first intent without adding builder ceremony.
  - severity: low
    where: AC1 — "In `## canonical_anchors`, replace or add `spec`, `branch`, `run_log`, and `head_sha` anchors."
    finding: |
      Behavior for non-named anchors is unspecified. 047's builder.md has a `worktree` anchor (`- worktree: ~/Desktop/Project_echo--codex-as-builder-binding-adapter/`) that isn't in the four named anchors. AC1 should explicitly state whether: (a) non-named anchors are preserved as-is (likely intent — matches the "preserve builder content" principle), (b) the patcher rewrites the entire canonical_anchors block from a fixed template (would erase the worktree anchor and any future builder-authored anchors). Recommend (a) — explicitly state non-named anchors are preserved.
  - severity: low
    where: AC2 — "Update the protocol body in `skills/process-backlog.md`, not only the codex binding-specific notes."
    finding: |
      AC2 names the protocol body (vendor-neutral) as the canonical insertion site, and AC3 has the codex binding section defer to it. But `skills/process-backlog.md` may have other binding-section equivalents (for Claude Code, Cursor's Claude builder bindings) once those are formalized. AC2 should explicitly state that the protocol-wide step is the ONLY canonical site and all binding sections must reference it (not duplicate it), to prevent future binding sections from each re-implementing the handoff step. Trivial — one sentence in AC2.
  - severity: low
    where: AC5 — "malformed or missing `builder.md` exits non-zero without creating a generic replacement pointer"
    finding: |
      Test fixture for "malformed builder.md" needs a concrete shape definition. Possibilities: (i) missing one of the five required headings; (ii) frontmatter present but YAML-invalid; (iii) headings present but out-of-order; (iv) frontmatter absent entirely. The lint at tools/task-state/lint.py only checks block presence + order + cap (per its own docs). The patcher's "malformed" notion should align with what the lint flags, OR define a separate malformed condition. AC5 should name at least two concrete malformed fixtures the test must cover.
  - severity: nit
    where: AC5 — "`skills/process-backlog.md` contains the named final builder-state refresh step; that step names `task_state_ref`, existing `builder.md`, `patch-builder-state.py`, `backlog/pending_review/`, and `tools/task-state/lint.py`"
    finding: |
      Asserting that skill prose contains specific literal tokens is brittle — any prose refactor breaks the test even when behavior is unchanged. Behavioral alternative: a small integration test that exercises the protocol step against a fixture worktree and verifies (a) the patcher was invoked, (b) the file landed in the commit. More durable; harder to wire. Acceptable as-is for v1 if you note the brittleness and accept it; flag if you want the durable form.
  - severity: nit
    where: AC4 — "Update `docs/AGENT_INSTRUCTIONS.md` so the generic builder loop mentions final `builder.md` refresh"
    finding: |
      AC4 expands scope to a documentation-consistency update that isn't strictly necessary to resolve the 047 friction. Defensible (manual should mirror skill) but adds files-to-modify and verification surface. Could alternatively be filed as a followup ("AGENT_INSTRUCTIONS mirror") and 048 would land tighter. Cosmetic call — keep or split, either is fine.
---

# Cursor reviewer notes — R1 / 048

**Verdict: proceed_after_patches.** The spec is structurally sound, the patcher-vs-renderer design call is correct, and the Risks section is honest about limitations. The pushback to fix is concentrated on AC1's `open_questions` overwrite (the HIGH finding) and AC1+AC2's detection-vs-failure contradiction (a MEDIUM that would actually break 048's own builder cycle if shipped as-written, since 048 has `task_state_ref` set but no initial `builder.md`).

**What's strong about the spec:**
- The pivot from "deterministic renderer" to "minimal patcher" is the right call and is well-defended in the Risks section and in the strategist's design rationale.
- `## Out of Scope` is comprehensive — 8 bullets covering schema, push-round-state.sh, CAS, backfill, locked_decisions overwrite, wiki, reviewer queue, run-log convention. No obvious drift surfaces are left ungated.
- Cross-vendor reviewer roster `["codex", "cursor"]` preserves the multi-vendor signal from 047.
- The friction-first compliance argument in "Why this spec exists" is concrete (cites the 047 review-pending sidecar staleness as empirical evidence).

**What's worth pushing back on (the four real findings):**
- F1 (HIGH): preserve `open_questions` like `locked_decisions` and `dont_touch` are preserved. The current design erases builder-authored content that the patcher framing was specifically meant to protect.
- F2 (MEDIUM): pick a mechanism for the `current_thesis` lifecycle-sentence update. Recommend append-only.
- F3 (MEDIUM): resolve the detection-vs-failure contradiction. Recommend `OR detection` with `missing-builder.md = no-op`. As-written would block 048's own builder cycle.
- F4 (LOW): explicitly preserve non-named `canonical_anchors`.

**Scope-coherence / role-split:** clean. No drift findings; no role ambiguity. The patcher's owner is clear (tools/task-state/), the skill caller's owner is clear (skills/process-backlog.md vendor-neutral body), the test owners are clear (tests/task-state/ + tests/backlog/).

**Drift watch vs 047:** the spec correctly does NOT re-touch surfaces 047 closed (`run-codex-builder.sh`, codex binding section structure, role-typed-task-state schema). It adds one new helper and one new protocol step. Surface delta is appropriate to the friction.

**Drift watch vs 046:** the spec correctly defers to 046's writer-responsibilities table for `builder.md` ownership semantics and does not propose changing the role-typed task-state schema. Compliant with 046's contract.

**Recommended disposition for the watcher:**
- F1, F2, F3, F4 are all mechanically dispositionable inline (small AC clarifications). No structural redesign needed.
- F5, F6 are stylistic clarifications — accept-with-patch or defer to followup, watcher's call.
- F7, F8 are nits — accept-with-patch (cosmetic) or defer.

If the codex reviewer agrees on verdict (proceed_after_patches), the 046 R4 precedent allows the watcher to auto-disposition all 8 findings as accept-with-patch inline, then either declare claim-ready (if all patches mechanical) or open R2 (if any patch needs founder judgment). The HIGH finding's "preserve open_questions like locked_decisions" patch is the most consequential — it should land cleanly in AC1's bullet list.
