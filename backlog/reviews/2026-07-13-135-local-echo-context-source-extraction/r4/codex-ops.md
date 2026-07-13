---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 4
reviewer: "codex-ops"
artifact_sha: "fa7b3a03ad11e39c0ea89fb252dac52bcf6790ad"
completed_at: '2026-07-13T22:18:15Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC7 — isolated npm installation"
    finding: "The sanitized scratch HOME provides an empty npm cache while the sandbox permits only loopback networking, so a cold `npm ci` cannot obtain lockfile packages. Add a checkpointed pre-isolation fetch into a per-run cache, verify package-lock integrity and cache hashes, run sandboxed `npm ci --offline --cache <scratch-cache>`, and test a genuinely cold-cache run."
  - severity: "high"
    where: "AC1 and AC7 — stale-lock quarantine and process-group cleanup"
    finding: "Lock liveness tracks only the owner PID/start identity; if the orchestrator is killed while its supervised process group remains alive, quarantine can issue a new nonce and resume against staging that orphaned children still mutate. Persist the active process-group identity with the nonce, require quarantine to terminate or prove that group quiescent before reacquisition, probe sockets and SQLite locks, and test killing the supervisor mid-command followed by quarantine/resume."
  - severity: "medium"
    where: "AC1, AC7, and AC8 — extractor provenance and handoff"
    finding: "The run pins the source commit but not the orchestrator entrypoint/profile bytes, so extraction can execute dirty or uncommitted lifecycle and sandbox code that `verify-handoff` cannot identify. Require committed extractor/profile hashes or an orchestrator commit SHA before candidate writes, reject mismatched working-tree bytes, record that identity in external state and the migration record, verify it during handoff, and add a dirty-extractor refusal test."
---
