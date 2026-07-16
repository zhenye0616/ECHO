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
- Plist pins RunAtLoad true, KeepAlive true, ThrottleInterval 10s; logging is an always-on bundled supervisor sink (5 MiB x 4 chunks per stream, 64 MiB aggregate, 0700 dir, 0600 non-link files) that launchd stdout/stderr cannot bypass.
- src/install/layout.ts is the single closed resolver (flag > config > shadow default, no ECHO/HOME fallback) for all roots/label/port/GUI-domain; candidate mode uses one disposable root, run-unique com.echo.context.candidate.<run-id> label, collision-reserved port never 39478/38478/38479, unconditional finally cleanup, and before/after sentinels on canonical labels/ports/real roots.
- Architecture truth uses named bounded probes (sysctlbyname hw.optional.arm64 / sysctl.proc_translated, 5s arch -x86_64 probe, Mach-O header, 10s bundled-node probe) with typed exit mappings and separate doctor fields; pre-extraction failures leave zero mutation, bundled-node failure precedes plist/service/config/secret mutation.

## open_questions

- Reviewers must confirm the runtime closure truly excludes Project_echo defaults/workflow code without changing the eight context tools or opaque historical-event retrieval.
- Founder execute approval is required before installing the checksum-bound shadow into real per-user LaunchAgent paths.

## dont_touch

- Do not read or migrate live Project_echo state, enable live capture, rewire clients, take 38478, disable the old daemon, or transfer authority.
- Do not rotate the legacy Slack token here, install brain/loop, add tools/features, publish publicly, or advance Team-product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
- reviews: backlog/reviews/2026-07-15-137-echo-context-installable-shadow-runtime/
