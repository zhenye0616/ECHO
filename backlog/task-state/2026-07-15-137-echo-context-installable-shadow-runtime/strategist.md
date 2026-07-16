## current_thesis

Verify item 136 as the immutable predecessor, implement and seal an item-137 successor source artifact, then build one installable Darwin x64 runtime and prove those runtime bytes as an authenticated, capture-off per-user shadow. Project_echo remains the live context authority until item 139.

## locked_decisions

- Version 0.1.0-dev.137.1 is built once from an independently reviewed descendant item-137 source SHA/tree/artifact; its manifest also binds the exact item-136 predecessor tuple and installs never rebuild.
- The installed artifact is Darwin x64 on Node 22.22.1 and includes its verified native better-sqlite3 runtime closure.
- Node 22.22.1 Darwin x64 is checksum-verified and bundled with its license/notices; launchd never depends on host Node.
- Those bytes also contain the six capture adapters, closed prepared/active/rolled_back authority schema+validator, and complete generic service subset required by the Project_echo residual; item 138 rehearses and item 139 creates a matching live record and activates without rebuild.
- Production uses a new closed composition root, not tools/verify-service-parity.mjs.
- Shadow identity is com.echo.context at 127.0.0.1:39478 with /Users/zhenye/.echo-context-shadow, authority:false, accept_capture:false, and no workers.
- Port 38478 remains Project_echo and 38479 stays reserved for item 139's residual endpoint.
- Every data-bearing MCP/service route requires one bearer credential stored as a 0600 file reference; no secret enters plist/env/argv/artifact/log/status.
- Installation is per-user, immutable-release based, ownership-manifest guarded, idempotent for identical bytes, and refuses root/foreign collisions.
- Offline prepare-final is the sole authority-record-gated, journaled shadow-to-final config/plist/install-state rebind; it cannot activate.
- Default uninstall preserves state and secret; purge is explicitly shadow-only and cannot target the future live home.
- Doctor reports artifact, process, launchd, listener, auth, roster, storage, capture, authority, permissions, and repo-independence truth without repairing.
- Context preserves opaque coord:* retrieval compatibility but owns no coordination producers, tools, task-state readers, reviewer defaults, or protocol semantics.
- The real shadow uses synthetic fixture state only, changes no AI-client config, and remains installed healthy after proof.
- Target changes land through independent review and founder merge; source/runtime artifacts build only from the read-back canonical main SHA.
- Exact runtime tgz/manifest/checksum/SBOM/bootstrap bytes are retained in a private prerelease and owned 0600 installer cache for item 139.
- Final authority requires a matching active record that item 137 cannot create; shadow commands refuse final activation.
- Founder decision 2026-07-15 ("yes keep and let them resume"): keep the architecture, accept all r3 findings as required spec patches, review-only, no build.
- Builder authority ends at candidate-only handoff; phase two is founder-owned tools/release-runtime.mjs stage|resume over a durable FSM keyed by landed SHA+version, with a separate release approval bound to SHA/version/artifact-SHA-256/bootstrap-hash/asset-set-manifest-hash (merge approval never equals release approval); resume verifies/reuses staged and partially uploaded bytes and never rebuilds, retags, or replaces.
- One published POSIX-sh bootstrap asset outside the tgz (size/hash/mode/version bound in manifest+approval) is the only repo-free installer entrypoint; it verifies itself, architecture, checksums, and full member inventory before extraction; it is not item 138's residual deployer.
- Writer exclusion is flock(2) LOCK_EX|LOCK_NB on 0600 <home>/writer.lock held process-lifetime from before SQLite open until after close; owner metadata is diagnostic-only and atomically durable; stale metadata replaced only after lock acquisition; bounded 0600 last-refusal record with atomic update/clear; doctor uses the six-state truth table; distinct from item 138 cutover coordination.
- Plist pins RunAtLoad true, KeepAlive true, ThrottleInterval 10s; logging is an always-on bundled supervisor sink (5 MiB x 4 chunks per stream, 64 MiB aggregate, 0700 dir, 0600 non-link files); r4 structural cut: launchd StandardOut/ErrorPath route to /dev/null (no last-resort files, truncation, or counting), with a separate bounded durable 0600 last-exit record (<=4096 B, atomic replace on child exit) surfaced by doctor.
- src/install/layout.ts is the single closed resolver (flag > config > shadow default, no ECHO/HOME fallback) for all roots/label/port/GUI-domain; candidate mode uses one disposable root, run-unique com.echo.context.candidate.<run-id> label, collision-reserved port never 39478/38478/38479, unconditional finally cleanup, and before/after sentinels on canonical labels/ports/real roots.
- Architecture truth uses named bounded probes (sysctlbyname hw.optional.arm64 / sysctl.proc_translated, 5s arch -x86_64 probe, Mach-O header, 10s bundled-node probe) with typed exit mappings and separate doctor fields; pre-extraction failures leave zero mutation, bundled-node failure precedes plist/service/config/secret mutation.
- r4: release FSM is serialized by flock(2) LOCK_EX|LOCK_NB on a per-landed-SHA+version fsm.lock held across journal read/build/upload/install/record; journal is release-journal.v1 (0600 in 0700 dir, atomic temp+rename with file+parent fsync, write-ahead intent records, monotonic CAS transitions); every crash window verify-adopts or hard-refuses, never rebuilds.
- r4: the only release-approval ingress is `resume --approve <file>` — an independently created owner-checked 0600 file binding the exact tuple plus operator, timestamp, and single-use nonce; journal edits and merge metadata never authorize; absent/malformed/stale/replayed/pre-smoke/wrong-tuple refuse.
- r4: asset trust anchor — a non-recursive canonical release-set manifest (sorted name/size/SHA-256 per asset, never covering itself) whose digest is in the approval tuple; the repo-free runner verifies bootstrap+release-set manifest against journal-checkpointed hashes BEFORE /bin/sh, executes protected verified bytes (TOCTOU defense), with absolute tools/pinned PATH, umask 077, and an env allowlist stripping NODE_OPTIONS/DYLD_*; cache acceptance covers the exact full asset set with no extras.
- r4: the bootstrap verifies/extracts only into a self-created 0700 staging dir (its only path decision, no second resolver); the bundled CLI via src/install/layout.ts owns the sole final atomic install; candidate argv is literal and closed (--candidate-root/--label/--port only); port handoff is a bounded close-bind protocol with typed port-stolen failure plus cleanup and a competing-binder test.
- r4: launchd owns exactly the supervisor; one verified direct runtime child owns listener/SQLite/writer.lock (descriptor CLOEXEC); one-child and sole-restart authority, signal forwarding, bounded TERM-to-KILL, reaping, parent-death child shutdown, exact launchctl lifecycle sequences; status/doctor split supervisor_pid/runtime_pid and the AC6 truth table keys the lock holder to the verified child of the launchd-reported supervisor.
- r4: owner sidecar is <home>/writer.owner.json, writer-owner.v1, <=4096 B, 0600 current-user regular non-link file, atomic temp+rename with file+parent fsync only under the held lock, binding PID/start/exe/artifact-hash/lock device+inode; loser never writes, normal close clears, crash-stale replaced only after acquisition.
- r4: install is a crash transaction — 0600 intent in a fresh 0700 transaction dir before first real-path mutation, provisional ownership checkpoint, atomic commits, no launchd start before ownership-manifest commit, adopt/rollback/refuse on rerun, kill-at-every-boundary tests.
- r4: failure evidence persists to a caller-supplied destination outside the disposable root (0700 dir/0600 files, atomic+fsync, versioned redacted bounded schema) and survives cleanup.
- r4: status/doctor process contract — exit-code enum 0 healthy / 1 unhealthy / 2 usage / 3 not-installed / 4 probe-timeout / 5 internal-error, exactly one schema-valid JSON stdout document per outcome, credential-free stderr, bounded probes, exact-bytes subprocess tests.

## open_questions

- Reviewers must confirm the runtime closure truly excludes Project_echo defaults/workflow code without changing the eight context tools or opaque historical-event retrieval.
- Founder execute approval is required before installing the checksum-bound shadow into real per-user LaunchAgent paths.

## dont_touch

- Do not read or migrate live Project_echo state, enable live capture, rewire clients, take 38478, disable the old daemon, or transfer authority.
- Do not rotate the legacy Slack token here, install brain/loop, add tools/features, publish publicly, or advance Team-product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
- reviews: backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/
