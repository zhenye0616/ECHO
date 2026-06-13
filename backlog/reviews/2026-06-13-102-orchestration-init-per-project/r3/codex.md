---
item_id: "2026-06-13-102-orchestration-init-per-project"
round: 3
reviewer: "codex"
artifact_sha: "815272edcaf757c0f7fe820248ba8c96c13726db"
completed_at: '2026-06-13T09:21:44Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "Spec: files_to_modify and spec_refs"
    finding: "AC6 and Out of Scope now deliberately defer the agent-command-dir override to item 104, but files_to_modify still tells the builder to make _run_reviewer.sh honor a per-project command-dir override and reviewer-bindings.json still says to templatize agent-command dir / allow per-project override. Patch those entries, and the reviewer-bindings spec_ref note, so 102 only owns reviews_root-relative response artifact paths and assumes reviewer command files are already reachable in-repo or synced."
---

## Findings

This is a patch-on-patch issue from the R2 narrowing, not a new architectural objection. The AC6 body correctly narrows 102 to reviewer response artifact paths and defers external command-copy execution to 104, but the implementation surface list still instructs the builder to implement that deferred command-dir behavior.

Required patch: remove command-dir override language from `tools/review-queue/_run_reviewer.sh`, `tools/review-queue/reviewer-bindings.json`, and the `reviewer-bindings.json` `spec_refs` note. Keep only the `reviews_root`-relative artifact-path work in 102.
