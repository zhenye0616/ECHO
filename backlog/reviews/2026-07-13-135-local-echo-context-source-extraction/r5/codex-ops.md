---
item_id: "2026-07-13-135-local-echo-context-source-extraction"
round: 5
reviewer: "codex-ops"
artifact_sha: "22b706d9a16591ff3b4ecaa1cc9fbac89baa9da4"
completed_at: '2026-07-13T22:42:36Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC3 — Split retrieval MCP from loop coordination tools"
    finding: "The source-snapshot checkpoint launches legacy source code without explicitly requiring the sanitized environment and filesystem/network sandbox used by later candidate execution. Merely running it against scratch state does not prevent ignored or incomplete overrides from reading or mutating live ~/.echo state. Require env -i with explicit HOME, ECHO_HOME, ECHO_CONTEXT_HOME, TMPDIR, cache, and scratch paths; permit writes only to the snapshot workspace; deny the live source worktree and live state; allow loopback only; and add a sentinel test proving attempted live-state access fails."
  - severity: "high"
    where: "AC1 — stale-lock quarantine and process-group takeover"
    finding: "The spec records a leader start identity but does not explicitly require a positive identity match immediately before every TERM or KILL sent to the recorded PGID. A stale PGID may later identify an unrelated process group. Require identity verification before each signal, refuse and preserve evidence when the leader or group cannot be proven extraction-owned, and test PID/PGID reuse or identity mismatch without signaling the unrelated process."
  - severity: "medium"
    where: "AC7 — env -i offline installation and checks"
    finding: "The sanitized execution contract names cache and scratch roots but does not define executable lookup. With env -i, Homebrew or user-installed node/npm and install-script toolchains may disappear from PATH; inheriting a fallback PATH would instead weaken the preflight binding. Persist and invoke the preflighted absolute tool paths, construct an explicit allowlisted PATH including the candidate's node_modules/.bin where required, and test both an empty and a poisoned host PATH."
  - severity: "medium"
    where: "AC1 command roster and AC3 snapshot-source-tools checkpoint"
    finding: "AC1 defines the committed entrypoint command set without snapshot-source-tools, while AC3 requires that command through the same entrypoint. Add snapshot-source-tools to the authoritative command roster and bind its arguments, exit codes, resumability, state transitions, and failure evidence so an implementation cannot satisfy AC1 while leaving the checkpoint unreachable."
  - severity: "medium"
    where: "AC7 — AF_INET and AF_INET6 sandbox probes"
    finding: "Negative non-loopback coverage is conditional on available interface addresses, so a host with no non-loopback address for one family can pass without proving that family's inbound and outbound denial. Require at least one denial-qualified endpoint per required family or fail preflight, and test that each negative result is attributable to the sandbox rather than missing routing, listener absence, or loopback-only binding."
---
