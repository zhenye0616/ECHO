## current_thesis

Land and rehearse all code needed for a reversible context cutover without touching founder-machine state. Item 139 alone builds from the landed SHAs and executes live.

## locked_decisions

- Item 138 is code/rehearsal only; authority remains Project_echo and every real user path/process/port is guarded out.
- One canonical transaction record is the authority commit point; configs/projection records reference it.
- Residual exposes exactly seven non-context tools, owns coord.sqlite, and never opens a context DB.
- Product consumers use only item 137's sealed generic service-operation manifest; uncovered calls block.
- Every canonical coord write atomically creates an outbox row; stable-ID context mirrors keep wait/search behavior without becoming authority.
- Full/rollback mode checks authority before PID, directory, DB, worker, or socket mutation; all supported global start paths are fenced.
- Client key echo remains context; echo-project-residual is new. Every endpoint caller and installed adapter template is classified and reversible.
- The known preexisting ~/.echo-context scaffold is whole-root quarantined only after exact recheck; it is never merged/deleted.
- Rehearsal proves populated migration, coord reconstruction, G1 cutover, new writes, rollback, rollback-era writes, and fresh G2 recutover.
- Target code lands first, then Project_echo; live artifacts build only from read-back canonical landed SHAs in item 139.
- Founder r6 resolution (2026-07-15, "yes keep and let them resume"): keep the 137/138 architecture; accept all R3/R6 findings as required spec patches; review only, no build.
- source_fenced is a controller-only phase in both sequences (planned→source_fenced→backed_up→migrated→prepared→active; rolled_back→recutover_prepared→source_fenced→…); the 137 projection stays absent before prepared and sealed to prepared/active/rolled_back after; no backup/migration/transform/prepare before source_fenced commits.
- One `authority.lock` (flock LOCK_EX|LOCK_NB, descriptor-pinned no-follow, monotonic deadline) is also the machine-wide execute/resume lock 139 consumes; no second lock; acquisition timeout = redacted stderr only with zero root mutation; post-acquisition failures journal under the held lock.
- Canonical record commits use reserved `transaction.json`/`transaction.json.tmp` names; a stale temp is a strictly validated interrupted-commit state reconciled by discard-and-resume, never trusted as authority.
- Installed authority-root identity record: exact path/schema/0444/integrity hash, atomic `echo-bind-authority-root` entrypoint, descriptor-pinned verification held through lock acquisition.
- Candidate publication = one fully-fsynced immutable versioned directory committed by one atomic same-filesystem directory rename; manifest SHA equals build HEAD with derived tree; two-clean-checkout byte-identical determinism proof; AC8 readback proves reviewed-to-landed tree equality or forces re-review.
- Project_echo manifest field `deployment_entrypoint` names the artifact-only deployer (`bin/echo-deploy-artifact --archive --prefix`): verbatim bytes, no scripts/deps/mutation/activation, installed-byte hash readback; 139 consumes it by name.
- Client transforms ride one journaled per-target metadata-aware CAS (bytes + type/owner/mode); restore only exact after-images; foreign drift left untouched with secret-free manual-recovery evidence blocking phase commit; 137 keeps only sealed aggregate hashes.
- Rollback exports exactly (W0,W1]/(C0,C1] (baselines under the pre-flip freeze, bounds under the rollback freeze, all four persisted) and idempotently restores the exact launchd before-image with old-full readiness proven through the restored job; recutover re-neutralizes it.

## open_questions

- Reviewers must validate both repository heads, mutation guard, full-start fence, consumer/caller closure, coord mirror, and G1-to-G2 crash matrix.
- Any production-adapter gap found after landing becomes a new proposal; item 139 may not hotfix or rebuild.

## dont_touch

- Do not read/write live state, configs, skills, packages, credentials, LaunchAgents, listeners, ports, or services.
- Do not activate/freeze authority, patch item 137, change context semantics, install brain/loop, edit wiki, or advance product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
- reviews: backlog/reviews/2026-07-15-138-echo-context-cutover-substrate-rehearsal/
