---
item_id: "2026-07-13-134-local-echo-loop-source-extraction"
round: 14
reviewer: "codex-ops"
artifact_sha: "58870d8c6dca1ed230cd3af8f9262cd36bc1087c"
completed_at: '2026-07-14T02:59:00Z'
verdict: "pushback"
findings:
  - severity: "high"
    where: "AC5 — watcher_round_claims paragraph"
    finding: "The coordination-store claim/terminal transition cannot be atomic with the Git ref update, yet later same-key ticks must return BUSY/duplicate and perform no repository write. A winner crash after claim persistence but before the ref CAS wedges the round; a crash after the ref update but before terminal persistence leaves contradictory state. Define a durable PENDING/APPLYING/APPLIED reconciliation protocol with action digest, reviewed-input hashes, expected-old/new refs, idempotent Git CAS, and retry ownership; escalate durably on divergence and add crash fixtures at every boundary."
  - severity: "high"
    where: "AC7 — paragraph beginning `Committed fetch/offline profiles fail closed`"
    finding: "The install and verification environment strips inherited npm_config_* and NPM_CONFIG_* variables but does not require an env-i allowlist for Node, npm, and their script shell. NODE_OPTIONS, NODE_PATH, BASH_ENV/ENV, and DYLD_*/LD_* can load unpinned code despite absolute executable paths and --ignore-scripts. Require a complete allowlist, explicitly synthesize the npm child environment, reject unknown launch-affecting variables, and add hostile-variable fixtures."
  - severity: "high"
    where: "AC7 verification-result equality paragraph and AC8 independent-review paragraph"
    finding: "The equality contract is internally unsatisfiable: direct and npm routes run from unique private roots and necessarily have different outer argv, cwd, and environment, but the result requires literal hashes for those fields while equality excludes only route, output path, and monotonic/PID fields. Separate and independently validate route-local launch provenance from a canonical inner-roster projection, define root normalization and exact comparison fields, and test direct/npm runs with different roots and npm-injected environment."
  - severity: "high"
    where: "AC7 — paragraph beginning `Every migration command has a monotonic 900-second deadline`"
    finding: "Only timeout, overflow, and listed signals explicitly trip the shutdown latch. Spawn failure, child nonzero exit, framing/hash/log-write failure, or supervisor exception can therefore bypass group cleanup or permit later phases. Require every fatal path to close the launch gate, signal the verified entire process group through TERM/KILL, reap and check survivors, exit nonzero, and forbid acceptance; add failing-spawn, framing/log failure, and child-exits-with-stubborn-grandchild fixtures."
  - severity: "medium"
    where: "AC3 — paragraph beginning `invokeRole owns recovery`"
    finding: "The bounded publisher transaction has no measurable monotonic budget, SQLite busy policy, retry limit, or held-lock fixture; deadlineMs is described only as invocation payload. Specify the publication busy timeout and finite retry/backoff budget, define durable failure evidence when the coordination store cannot accept the attempt row, and test a writer lock held beyond the budget."
  - severity: "medium"
    where: "AC7 — create-new fsynced diagnostics requirement"
    finding: "Create-new plus fsync does not ensure an atomically complete diagnostic: interruption during direct O_EXCL writing can leave a partial file that blocks replacement, and diagnostic-publication failure has no durable fallback. Require bounded schema-sized staging, file fsync, atomic no-replace publication, parent-directory fsync, and a bounded stderr fallback with nonzero exit; test interruption and injected EEXIST/ENOSPC failures."
---
