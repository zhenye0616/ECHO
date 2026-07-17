---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 6
reviewer: "codex"
artifact_sha: "4f0f0ea45ecd5df09c57d0e340e47207e654e724"
completed_at: '2026-07-17T08:01:52Z'
verdict: "proceed_after_patches"
review_protocol: 2
review_mode: "full"
findings:
  - severity: "high"
    mechanism: "capture-off service gating and synthetic fixture seeding"
    origin: "original"
    where: "Acceptance Criteria AC1, AC2, and AC6"
    finding: "The referenced generic service contract exposes POST /v1/capture as its write path, while the required runtime config sets accept_capture:false and the proof must report capture disabled. AC6 nevertheless requires both candidate fixture exercise and real-shadow fixture seeding, but specifies no permitted offline seed command, input asset, transaction boundary, or disabled-route response. The implementation therefore must either accept capture while claiming capture-off or cannot populate the proof database. Define an exact manifest-bound, idempotent offline seed mechanism that runs only while the service is stopped and under the lifecycle/writer-lock boundary; define the fail-closed POST /v1/capture response when accept_capture is false; and add tests proving no post-start write path exists and only the committed fixture was installed."
  - severity: "high"
    mechanism: "trusted acquisition of the bundled Node and native runtime closure"
    origin: "original"
    where: "Acceptance Criteria AC3 and Out of Scope"
    finding: "AC3 requires a fresh detached clone to bundle checksum-verified official Node 22.22.1 Darwin x64 plus matching native modules, while the artifact forbids downloads and remote assets and identifies neither a vendored distribution nor an immutable preseeded input, trusted upstream digest, or acquisition command. Hashing whichever local Node happens to exist is not verification and can silently package a Homebrew or otherwise non-official binary. Specify the exact trusted input location or narrowly authorized fetch, commit the expected upstream digest/signature and license inventory, pin the writer-lock/native-addon ABI closure, and fail closed before build on absence, wrong architecture, or digest mismatch. Tests must cover an empty cache and a substituted host Node."
  - severity: "high"
    mechanism: "authorization-to-bootstrap exact-artifact trust handoff"
    origin: "original"
    where: "Acceptance Criteria AC3 and AC6"
    finding: "The delegated installation record binds the manifest and asset hashes, but no prescribed command or flag makes the installer consume those authorized values. A self-consistent replacement of the manifest, bootstrap, runtime, and SBOM can therefore pass bundle-internal verification. The bootstrap also cannot establish trust in its own bytes after it has begun executing. Add a literal pre-execution verification procedure owned by the coordinator that compares the bootstrap and manifest against the immutable authorization record before invoking the bootstrap, then pass the authorized manifest digest explicitly so all remaining assets are verified before any real-path mutation. Add a negative test replacing all four assets coherently."
  - severity: "medium"
    mechanism: "launchd and no-launchd lifecycle state convergence"
    origin: "original"
    where: "Acceptance Criteria AC4 and AC6"
    finding: "AC4 promises exact source-owned launchctl vectors but does not prescribe the argv, GUI-domain targets, exit-code mapping, or state transitions. In particular, launchctl disable creates a persistent override, yet there is no enable command or defined start/install behavior to reverse it. Candidate mode also binds port 0 without defining the ready-FD or equivalent channel by which the harness learns the selected port and owns the foreground process. Specify literal bootstrap, bootout, enable, disable, kickstart/kill, and print vectors with idempotent outcomes and convergence probes, plus the exact candidate internal-serve invocation, readiness record, process-group ownership, and timeout cleanup. Tests should cover disable→start, disable→uninstall→reinstall, already-loaded/not-loaded jobs, and candidate restart."
  - severity: "medium"
    mechanism: "bearer credential disk and wire representation"
    origin: "original"
    where: "Acceptance Criteria AC2 and Tests"
    finding: "The spec says to write 32 random bytes and use them as an HTTP bearer credential, but arbitrary bytes are not a valid Authorization header value and no encoding, padding, newline, file-length, or strict parsing contract is defined. Implementations and clients can consequently derive different tokens while still claiming compliance. Define a canonical representation, such as unpadded base64url of exactly 32 random bytes, including exact file bytes and header grammar; reject malformed or non-canonical existing secrets on reinstall; compare fixed-length decoded values in constant time; and test binary, newline, padding, duplicate-header, and malformed-file cases without exposing the value."
---

