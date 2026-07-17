---
item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 7
reviewer: "codex"
artifact_sha: "add84d7175238018c0e5c62a16014664f6ea4ab7"
completed_at: '2026-07-17T18:47:16Z'
review_protocol: 2
review_mode: "delta"
verdict: "pushback"
findings:
  - severity: "high"
    mechanism: "trusted acquisition of the bundled Node and native runtime closure"
    origin: "original"
    family_id: "fam-d1516500edd71225"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC3 and Tests"
    finding: >-
      The final build starts from a fresh detached clone, forbids caches and host Node/npm/compiler fallback, and declares the Node tarball the sole network input, yet it must include package-lock-pinned better-sqlite3 and writer-lock native addons. A lockfile contains integrity metadata, not package or prebuilt-addon bytes, so no permitted mechanism supplies this closure; npm would require registry/GitHub access or a vendored store and possibly a compiler. Define and authorize every dependency/native input—either reviewed vendored bytes with hashes or explicit immutable URLs, digests, and toolchain commands—add the corresponding files_to_modify paths, inspect Mach-O dylib/rpath closure, and prove empty-cache repo-free assembly. As written, the bundle is not buildable.
  - severity: "high"
    mechanism: "authorization-to-bootstrap exact-artifact trust handoff"
    origin: "original"
    family_id: "fam-7c73935a9092db29"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC6"
    finding: >-
      The coordinator hashes pathnames and later reopens the bootstrap through /bin/sh, while the bootstrap reopens the manifest, tgz, and SBOM by pathname. A same-UID rename or same-size in-place rewrite between check and execution/use can therefore execute or install unauthorized bytes before the post-execution check; device, inode, size, and mode do not bind content, and a raced bootstrap controls its own self-check. Require a trusted mechanism that opens non-link assets with O_NOFOLLOW, hashes and executes or consumes the same held descriptors or one-pass authenticated snapshot without pathname reopening, all before mutation. Add rename-swap, in-place-rewrite, and swap-and-restore race tests.
  - severity: "high"
    mechanism: "launchd and no-launchd lifecycle state convergence"
    origin: "original"
    family_id: "fam-59151b4a69e640a5"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC4 and AC6"
    finding: >-
      The launchd transition sequence is contradictory. launchctl kill SIGTERM does not unload a job; after a graceful zero exit under KeepAlive SuccessfulExit=false, the job remains loaded and stopped. The spec nevertheless makes stop wait for job absence and makes restart bootstrap afterward, which can return already-loaded and be adopted without restarting. Specify one executable transition table: either kill and drain, then bootout to job absence before restart bootstraps, or leave the job loaded and have restart kickstart it. Also define the separate no-launchd process-group ownership, stop, restart, and uninstall transitions rather than leaving them implicit in the harness.
  - severity: "medium"
    mechanism: "status and doctor can observe mixed lifecycle generations because they do not participate in lifecycle serialization"
    origin: "unknown"
    family_id: "fam-063c32423565fd88"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC4 and AC5"
    finding: >-
      LOCK_SH only serializes status and doctor against cooperating CLI writers. Launchd can autonomously restart the directly owned runtime, and the runtime can exit, while those commands combine PID, start-time, listener, readiness, writer-lock, and log observations, so a shared lock still permits a mixed-generation result. Require beginning/end process and generation correlation with bounded retry or a typed unstable/busy result, or another non-deadlocking protocol in which autonomous transitions participate. Test a KeepAlive restart during probing and define the read-only never-installed case where lifecycle.lock does not yet exist.
  - severity: "medium"
    mechanism: "launchd discards the fallback diagnostic channels before bounded runtime logging is guaranteed"
    origin: "unknown"
    family_id: "fam-b1c1dd448cd031dd"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC1, AC4, and AC5"
    finding: >-
      The candidate entrypoint is declared as internal serve --config --ready-fd without --log-dir, although startup must open the sink before parsing configuration; that path cannot satisfy the required ordering. The exit contract is also ambiguous: every initial sink-open failure exits zero, while typed transient failures exit nonzero, so a transient logger-open error satisfies both. With stdout/stderr discarded and no independent record, a transient failure that clears cannot always be diagnosed specifically as startup_logging_unavailable. Make --log-dir mandatory for every serve path, define an exact error-to-exit/evidence mapping or an honest unknown state, and test persistent and transient logger-open failures.
  - severity: "medium"
    mechanism: "capture-off service gating and synthetic fixture seeding"
    origin: "original"
    family_id: "fam-64c648d1288bdb65"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md: AC4 and AC6"
    finding: >-
      internal seed-fixture receives both the fixture pathname and expected digest from its caller, but the spec does not identify the installed, authorization-bound manifest or receipt lookup that independently anchors those values. An arbitrary fixture paired with its own digest can otherwise self-authenticate despite the stated committed-member restriction. Require the command to resolve fixture ID, path, and digest through the verified immutable release manifest whose hash is bound by the receipt and delegated authorization before opening SQLite; treat CLI values only as assertions. Also define whether an identical ID-and-digest replay is a successful no-op or a typed refusal and align the idempotence tests.
---

