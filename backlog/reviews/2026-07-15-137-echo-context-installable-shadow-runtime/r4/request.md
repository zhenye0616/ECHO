---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 4
spec_commit_sha: 65b9a0af5a4ab21a34ad71d6258c8e231427a180
artifact_path: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
class: structural-reform
requested_at: '2026-07-16T05:23:50Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 49bb18f3-ef45-481b-a97f-ad608e0e0d3b
focus_hints: "Verify the r3 founder-delegated propagation-completion patches at 65b9a0af:\
  \ (1) AC4/AC7 release FSM \u2014 builder authority ends at candidate-only handoff;\
  \ founder-owned tools/release-runtime.mjs stage|resume; durable journal keyed by\
  \ landed source SHA+version; release bytes built exactly once into owned staging;\
  \ atomic checkpoints of runtime tgz/manifest/checksum/SBOM/bootstrap hashes; smoke\
  \ re-run on release bytes; PAUSE for a separate approval bound to (landed source\
  \ SHA, version, runtime artifact SHA-256, bootstrap hash, asset-set manifest hash);\
  \ merge approval never equals release approval; resume verifies/reuses staged and\
  \ partially uploaded bytes with matching-asset no-op, missing-asset upload, mismatch/tamper\
  \ refusal; never rebuild/retag/replace; second-build hard refusal. (2) AC4/AC5 published\
  \ bootstrap \u2014 one independently published POSIX-sh asset outside the runtime\
  \ tgz, exact size/hash/mode/version bound in manifest and approval tuple; exact\
  \ repo-free invocation using only downloaded published assets; pre-extraction verification\
  \ of its own approved hash, host architecture/Rosetta, runtime checksum/manifest/SBOM,\
  \ and complete member path/type/mode/link inventory; post-staged-extraction bundled\
  \ absolute Node probe + bundled CLI; no host Node, checkout, npm, compiler, or hidden\
  \ alternate artifact; not item 138's residual deployer. (3) AC1/AC6 writer lock\
  \ \u2014 flock(2) LOCK_EX|LOCK_NB on the stable per-layout 0600 regular-file <home>/writer.lock\
  \ held process-lifetime from before SQLite open until after close, kernel-released\
  \ on SIGKILL; owner metadata diagnostic-only, separately atomically durable, replaceable\
  \ only after acquiring the kernel lock; bounded 0600 <home>/writer.last-refusal.json\
  \ with versioned schema and atomic update/clear; six-state doctor truth table (expected\
  \ launchd-correlated holder healthy; refused duplicate starter with healthy incumbent;\
  \ foreign holder unhealthy; stale metadata+unlocked reclaimable; running-without-lock\
  \ and stopped-with-live-holder fail); barrier multiprocess, PID-reuse, holder-exit,\
  \ simultaneous stale-reclaim, and SIGKILL tests prove exactly one storage opener;\
  \ lock stays distinct from item 138 cutover authority/execution coordination. (4)\
  \ AC5/AC6 launchd+logs \u2014 RunAtLoad true, KeepAlive true, ThrottleInterval 10s\
  \ pins; always-on bundled supervisor sink replacing install/start-only truncation;\
  \ exact numeric caps 5 MiB per chunk, max 4 chunks per stream, 64 MiB aggregate,\
  \ oldest-chunk overflow deletion; launchd StandardOut/ErrorPath cannot bypass the\
  \ sink; 0700 directory, 0600 regular non-link files, ownership checks; real-launchd\
  \ long-output and crash-loop tests exceed caps with no CLI reinvocation and bounded\
  \ on-disk aggregate; doctor independently recomputes effective caps. (5) AC3/AC5/AC7\
  \ layout resolver and candidate isolation \u2014 src/install/layout.ts single closed\
  \ resolver for support/state/log/release/shim/plist roots, label, port, launchd\
  \ GUI domain with flag>config>shadow-default precedence and no ECHO/HOME fallback\
  \ ambiguity; candidate mode under one disposable root rejecting founder/live paths\
  \ and canonical labels/ports, run-unique com.echo.context.candidate.<run-id> label,\
  \ collision-reserved port never 39478/38478/38479; every install/launchctl action\
  \ through the resolver; unconditional finally bootout/kill/listener-gone-proof/ownership-fenced\
  \ cleanup; redacted failure evidence persisted before cleanup; before/after sentinels\
  \ prove canonical labels, ports 39478/38478/38479, and real Application Support/secret\
  \ roots untouched. (6) AC5/AC6 architecture truth \u2014 named bounded probes (sysctlbyname\
  \ hw.optional.arm64 + uname -m, sysctl.proc_translated, 5s arch -x86_64 /usr/bin/true,\
  \ staged-node Mach-O header, 10s bundled-node -p process.arch) with typed exit mappings;\
  \ stable doctor fields physical_host_architecture/bundled_runtime_architecture/translation_required/translation_available/process_translated/architecture_verdict;\
  \ pre-extraction failure leaves no extracted/config/secret/plist/job state; bundled-Node\
  \ probe failure occurs after staged extraction but before plist/service/config/secret\
  \ mutation. (7) Tests cover release-FSM checkpoints and partial-upload resume without\
  \ rebuild, published-assets-only bootstrap and pre-extraction tamper/member rejection,\
  \ layout resolver/deny-write/run-unique label+port/finally cleanup, lock barriers/truth\
  \ table/refusal record, launchd restart policy/numeric caps/crash loops, and the\
  \ architecture matrix with mutation sentinels. Also confirm the patches complete\
  \ existing mechanisms without adding alternatives, the authority schema remains\
  \ exactly prepared|active|rolled_back, no source_fenced or 138 deployer/cutover\
  \ scope entered item 137, and candidate labels/ports avoid 39478/38478/38479."
---

# What to review

Read `backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md` at commit `65b9a0af5a4ab21a34ad71d6258c8e231427a180`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
