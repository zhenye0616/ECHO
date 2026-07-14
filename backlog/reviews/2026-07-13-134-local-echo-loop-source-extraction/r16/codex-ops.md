---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 16
reviewer: "codex-ops"
artifact_sha: "8e233be7e2b643b8ebd502ac12b8b61ee5e67acc"
completed_at: '2026-07-14T04:06:52Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC3 — invokeRole PENDING/PUBLISHED crash recovery"
    finding: "The spec neither requires the role.invoked event insert and PENDING-to-PUBLISHED update to commit atomically nor defines reconciliation when PENDING already has a matching unique event. A crash after event commit can strand PENDING while every retry collides. Require one SQLite transaction or explicit matching-event validation and promotion, with fixtures at both commit boundaries."
  - severity: "high"
    where: "AC3 — linkSync initialization and EEXIST reconciliation"
    finding: "coord.sqlite becomes visible at linkSync before post-link winner validation and sidecar checks finish, but consumer readiness is undefined; a concurrent writer can legitimately create a DELETE journal and make initialization fail after publication. Valid EEXIST also always returns BUSY/73 without a specified normal restart path for opening existing state. Define one readiness linearization point, an idempotent validate-and-open path, and init-versus-invoke/restart fixtures."
  - severity: "high"
    where: "AC5 — APPLYING remote push"
    finding: "The required ordinary non-force push does not atomically bind the update to expected-old. If the remote ref is deleted or rewound to an ancestor after re-probe, Git can create or fast-forward it and the watcher can mark APPLIED despite violating the approved precondition. Require an exact expected-old server-side lease/CAS plus the direct-parent check, and cover deletion and rewind races."
  - severity: "high"
    where: "AC5 — PREPARED founder approval and remote identity"
    finding: "A reproducible hash of candidate/ref/expected-old is not evidence of founder authorization and does not bind the destination repository, while mutable alias origin and Git configuration select the push endpoint. Specify a separate durable founder-issued approval transition, bind canonical repository identity and endpoint into it, and revalidate that identity using fixed-path config-isolated Git before every probe and push."
---
