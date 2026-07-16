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
- Rollback exports exactly (W0,W1]/(C0,C1] (baselines under the pre-flip freeze, bounds under the rollback freeze, all four persisted) and idempotently restores the exact launchd before-image with old-full readiness proven through the restored job; recutover re-neutralizes it. AC3 imports exactly (C0,C1] with idempotency/deadlines/checkpoints cut at C1 and nothing above C1.
- R7 (2026-07-15, propagation completion per reframe-gate investigator; all eight findings + founder independent-audit residuals accepted): one exhaustive per-phase transition/full-mode/resume table is normative — active → rolled_back is a real edge whose restorations (interval exports, clients/quarantine, launchd before-images) are durably journaled before the flip with readiness proven after it; full mode permits at absent/planned/recutover_prepared with no authorization, at rolled_back only against the durable rollback-authorization tuple, and rejects at every fenced phase.
- Resume re-proofs are phase-aware and generation-bound: source_fenced needs no completed backup (authenticated partial reconciled or discarded); rolled_back proves restored old authority without a zero-old-writer requirement; the G1 rolled_back projection is retained until G2 prepared atomically replaces it.
- Lock bootstrap: creator/contender rule with the empty sole `authority.lock` as the one exempted pre-acquisition root write; flock provider is pinned `fs-ext` (both lockfiles, sole allowlisted native member); pinned 100 ms poll / 30 s monotonic deadline / exit 75; interrupted temps are strictly validated (uid/0600/nlink=1/same-fs/≤1 MiB/schema/predecessor binding) and an invalid temp is left untouched, fail closed.
- Producer surface: controller manifest fields `execute_entrypoint`/`resume_entrypoint` (`bin/echo-cutover-execute|resume --approval <path>`) — approval-record-only parameters (landed SHAs/trees, manifest+archive hashes, plan hash, generation, root, prefix, mode), fresh-transaction-only execute, exact-tuple-only resume, same single lock; "no ungated or bypass entrypoint" replaces "no live-capable mode"; item 138 never invokes live adapters.
- Deployment is the trusted bootstrap composition: pre-extraction `bootstrap/echo-deploy-bootstrap` (manifest/approval/archive/prefix/root argv) verifies trust + member safety before staging, then payload publication, installed-receipt (installed-receipt.v1), identity binding, and evidence-dir provisioning as ONE crash-replayable transaction; immutable hash/version payload subtree vs mutable share/echo metadata subtree; descriptor-pinned handoff to the fence.
- Client-transform CAS has a normative per-target transition table (incl. create/delete): before→after, journaled-after no-op, after→before, before no-op, third-state untouched + durable block; in-place writes forbidden (same-dir O_CREAT|O_EXCL temp, metadata, fsync, rename, parent fsync); creates commit via renamex_np RENAME_EXCL; the replace-window never-overwrite promise is explicitly narrowed to pre-validation-durable foreign changes.

## open_questions

- Reviewers must validate both repository heads, mutation guard, full-start fence, consumer/caller closure, coord mirror, and G1-to-G2 crash matrix.
- Any production-adapter gap found after landing becomes a new proposal; item 139 may not hotfix or rebuild.

## dont_touch

- Do not read/write live state, configs, skills, packages, credentials, LaunchAgents, listeners, ports, or services.
- Do not activate/freeze authority, patch item 137, change context semantics, install brain/loop, edit wiki, or advance product maturity.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
- reviews: backlog/reviews/2026-07-15-138-echo-context-cutover-substrate-rehearsal/
