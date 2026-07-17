---

item_id: "2026-07-15-137-echo-context-installable-shadow-runtime"
round: 8
reviewer: "codex"
artifact_sha: "e6ee720f09d72db7694ac25ff1a1d1cdd4cdbc5a"
completed_at: '2026-07-17T19:45:35Z'
review_protocol: 2
review_mode: "delta"
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    mechanism: "status and doctor can observe mixed lifecycle generations because they do not participate in lifecycle serialization"
    origin: "unknown"
    family_id: "fam-063c32423565fd88"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:124"
    finding: >-
      The shared lifecycle lock does not serialize launchd KeepAlive. A stopped job can start and exit entirely between snapshots, leaving identical stopped/no-PID identities while probes mix pre- and post-incarnation log or storage state. Include a monotonic launchd run/incarnation identity in both snapshots, discard observations when it changes, and add an explicit stopped-to-running-to-stopped ABA test.
  - severity: "high"
    mechanism: "launchd discards the fallback diagnostic channels before bounded runtime logging is guaranteed"
    origin: "unknown"
    family_id: "fam-b1c1dd448cd031dd"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:96,126"
    finding: >-
      The application sink cannot cover failures before Node enters runtime code. Missing or corrupt Node/entrypoint bytes, dyld or architecture failure, syntax errors, and static-import loader failures exit nonzero with stdout/stderr at /dev/null, so KeepAlive silently retries every ten seconds. Add a bounded diagnostic/restart gate active before Node and entrypoint loading, or revise the direct-runtime/output/KeepAlive contract, and test a pre-entrypoint failure.
  - severity: "high"
    mechanism: "trusted acquisition of the bundled Node and native runtime closure"
    origin: "original"
    family_id: "fam-d1516500edd71225"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:114,171"
    finding: >-
      The prescribed acquisition is not enforceably closed: curl --location contradicts the no-redirect rule, and bare npm ci can follow redirects, contact audit or metadata endpoints, inherit user configuration, or run under host Node/npm. Define an exact verified-Node/npm invocation with scrubbed configuration, fail-on-redirect lockfile-tarball prefetch and integrity verification, offline npm ci --ignore-scripts --no-audit --no-fund, and a network-denied source rebuild with build_from_source, nodedir, and x64 target flags. Tests must fail every unallowlisted request, redirect, prebuilt download, or host-tool fallback.
  - severity: "medium"
    mechanism: "authorization-to-bootstrap exact-artifact trust handoff"
    origin: "original"
    family_id: "fam-7c73935a9092db29"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:144,171"
    finding: >-
      The descriptor protocol does not define stream positioning. Hashing an inherited descriptor normally advances its shared open-file description to EOF, and bootstrap must both verify and subsequently consume each stream. Require positional hashing plus an explicit rewind before spawn, and define either one-pass protected materialization or independently opened verification/consumption descriptors. Add Darwin /dev/fd tests proving every child stream remains complete after hashing and verification.
  - severity: "high"
    mechanism: "authorization-to-bootstrap exact-artifact trust handoff"
    origin: "original"
    family_id: "fam-7c73935a9092db29"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:144"
    finding: >-
      Binding the runner's source hash and target SHA does not ensure those bytes are what Node executes. A mutable runner path, its import closure, or its interpreter can be substituted before protected asset descriptors exist, moving the TOCTOU boundary outward. Require a self-contained runner executed from an authorized descriptor snapshot or an equivalently verified fresh exact-SHA closure, with the interpreter identity bound and substitution tests covering the runner itself.
  - severity: "medium"
    mechanism: "capture-off service gating and synthetic fixture seeding"
    origin: "original"
    family_id: "fam-64c648d1288bdb65"
    where: "backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md:140,177"
    finding: >-
      O_NOFOLLOW plus verification before SQLite does not require seeding to consume the exact bytes that were verified; an implementation can hash and then reopen or reread mutable file content. Require a bounded read-once buffer or unlinked snapshot from the pinned descriptor, hash and parse/seed only those bytes without reopening by path, validate non-link path components, and add rename, symlink, in-place-rewrite, and swap-restore races proving SQLite remains unopened and unmodified on failure.
---
