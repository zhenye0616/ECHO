---
item_id: "2026-06-13-102-orchestration-init-per-project"
round: 2
reviewer: "codex-ops"
artifact_sha: "9db479c2d777952cceff4198cb513a45908ff5b7"
completed_at: '2026-06-13T09:15:01Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/proposed/2026-06-13-102-orchestration-init-per-project.md:AC5/AC8"
    finding: "AC5 makes reviewer response writes, duplicate checks, and push/rebase target coord_ref-aware, but it does not explicitly require _run_reviewer.sh to select/read rounds from coord_ref. A launchd tick starting from a default-branch checkout can miss a request that exists only on a side ref, leaving an onboarded repo with a non-runnable unattended review loop. Patch AC5/AC8 to require the reviewer tick to fetch and scan/read the configured coord_ref for request selection and artifact reads, with a side-ref test whose request exists only on coord_ref and whose default branch remains untouched."
---

## Findings

- MEDIUM: AC5/AC8 should prove the reviewer tick reads the configured coordination ref, not only that its response push lands there. Without that, the side-ref path can pass write-target tests while failing at runtime before any reviewer is invoked.

## Verdict

Proceed after the AC5/AC8 patch above.
