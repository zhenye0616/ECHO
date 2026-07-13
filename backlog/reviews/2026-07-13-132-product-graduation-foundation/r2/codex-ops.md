---
item_id: "2026-07-13-132-product-graduation-foundation"
round: 2
reviewer: "codex-ops"
artifact_sha: "41d2f17dee44d26096cdccefed6cd7da5dbd3cdb"
completed_at: '2026-07-13T09:27:52Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC5 — Product-only artifact is built once and is installable without the repo"
    finding: "The HEAD and cleanliness checks occur before staging and packing, leaving a TOCTOU path where a concurrent tracked-source edit can be packaged under the previously verified source SHA. Build from an immutable tree materialized from the supplied commit, or revalidate HEAD, status, and source-closure digests immediately before atomic publication; add a test that mutates a closure file between preflight and staging and requires the build to abort."
  - severity: "medium"
    where: "AC2 — Product runtime owns only the wedge and fails closed"
    finding: "Shutdown is bounded, but component startup is not. A dependency whose start promise never settles can hang an unattended run without rollback or durable failure evidence. Require an injectable overall or per-component startup deadline that triggers reverse rollback, aggregates timeout and rollback errors, and exits nonzero; test never-settling startup and rollback handles."
  - severity: "medium"
    where: "AC2 — classifyStateFilesystem adapter"
    finding: "Longest mount-point prefix matching is unsafe unless it is path-component-aware: for example, /Volumes/data must not match /Volumes/database. Require exact-or-descendant matching after mount-path decoding and normalization, including the root mount special case, and add fixtures for overlapping names and escaped mount paths so a network volume cannot be misclassified as local."
  - severity: "medium"
    where: "AC4 — test:product becomes a real hermetic product suite"
    finding: "The sanitized-child contract is asserted but not enforced: the sentinel proves only its own child environment, while another test or product module can call spawn, exec, execFile, or fork with inherited credentials or bypass the poisoned proxy. The network guard also leaves UDP and direct DNS APIs open despite claiming network is disabled. Intercept all child-process entry points and reject launches that do not use the approved sanitized environment, and block dgram/DNS networking or narrow the claim; add red guard fixtures for both escape paths."
  - severity: "medium"
    where: "AC5 — Native source-build strategy"
    finding: "Checking only for a compiler does not preflight the offline better-sqlite3/node-gyp toolchain. Require pre-install checks for the selected Python, make, C/C++ compiler, Xcode command-line tools and SDK, executing Node/npm identity, and the exact nodedir header layout; record their resolved versions in evidence and fail before npm install when any prerequisite is missing. Fixture tests should cover each missing prerequisite."
  - severity: "medium"
    where: "AC7 — CI qualifies the same bytes on the declared phase-1 target"
    finding: "The workflow promises both always-uploaded evidence and a failing conclusion for red or missing machine cells, but no test or explicit exit-status protocol ensures both. A structurally valid incomplete DEV report can contain red cells while validation still succeeds. Specify that test/install status is captured without short-circuiting evidence generation, uploads run with if: always(), and a final always-running gate exits nonzero after upload for any red, timed-out, or missing cell; add a workflow-contract test for this failure path."
---
