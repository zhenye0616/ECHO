---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 8
spec_commit_sha: 1f5729999154691efeb76161c17db8a186884b0f
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T05:58:55Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 8e20cf8d-2894-4652-8b90-584251b929bd
focus_hints: "Verify the r7 propagation-completion patches (all eight r7 findings\
  \ accepted plus founder-directed independent-audit residuals; spec-r7-patches 1f5729999154691efeb76161c17db8a186884b0f):\
  \ (1) AC1's exhaustive per-phase transition/full-mode/resume table \u2014 sole permitted\
  \ transitions for all eight phases plus the new in-generation active\u2192rolled_back\
  \ edge; full-mode admission permits absent/planned/recutover_prepared with no authorization,\
  \ permits rolled_back only against the exact durable rollback-authorization tuple\
  \ (generation, phase, restoration digests), rejects source_fenced/backed_up/migrated/prepared/active;\
  \ active\u2192rolled_back ordering makes interval exports, client/quarantine restoration,\
  \ and launchd before-image restoration durably journaled complete BEFORE the flip\
  \ with old-full readiness proven after it through the restored job. (2) Phase-aware\
  \ generation-bound resume matrix: planned/recutover_prepared journal-replay only;\
  \ source_fenced re-proves fence/zero-writer/source identity-cut-digest WITHOUT requiring\
  \ a completed backup (authenticated partial reconciled or discarded); backed_up+\
  \ adds backup+scratch restore; migrated adds output digests; prepared adds projection/service/client-CAS/readiness;\
  \ active proves new authority + one writer; rolled_back proves restored old authority\
  \ with NO zero-old-writer requirement; G1 rolled_back projection retained until\
  \ G2 prepared atomically replaces it. (3) Lock bootstrap creator/contender rule:\
  \ O_CREAT non-exclusive convergence on one inode, empty sole authority.lock creation\
  \ as the one exempted pre-acquisition root write narrowing the timeout zero-write\
  \ guarantee, multiprocess creator-loser test; named flock provider fs-ext pinned\
  \ with sha512 integrity in BOTH package-lock.json files, API pinned to flock/flockSync(fd,'exnb'),\
  \ Darwin x64 prebuilt as the SOLE allowlisted native archive member reconciling\
  \ AC5's native rejection, both-binaries-same-inode test; pinned 100 ms poll / 30\
  \ s monotonic deadline / exit code 75. (4) Strict interrupted-temp validation (exact\
  \ name, regular non-symlink, euid owner, 0600, nlink=1, same device, \u22641 MiB,\
  \ canonical schema, predecessor hash/generation/phase binding); invalid temp left\
  \ untouched with fail-closed redacted evidence \u2014 only a fully valid stale temp\
  \ is unlinked. (5) Production producer surface: controller manifest fields execute_entrypoint/resume_entrypoint\
  \ with exact argv bin/echo-cutover-execute|resume --approval <path>; approval record\
  \ is the sole parameter source (landed target/project SHAs+trees, controller/runtime/residual\
  \ manifest+archive hashes, plan hash, generation, authority root, install prefix,\
  \ mode) with integrity hash plus item-139-only authorization; no env/npm/checkout\
  \ fallback; execute fresh-transaction-only, resume exact-journal-tuple-only, both\
  \ under the same single authority.lock; 'no ungated or bypass entrypoint' guarantee\
  \ replaces 'no live-capable mode'; item 138 never invokes live adapters; execute/execute,\
  \ execute/resume, resume/resume contention plus the approval rejection matrix; archive\
  \ command-surface enumeration proves every mutation-capable entrypoint gated and\
  \ no other executable exists. (6) Trusted deployment composition: deployment_entrypoint\
  \ names the pre-extraction bootstrap bootstrap/echo-deploy-bootstrap --manifest\
  \ --approval --archive --prefix --root, self-contained (no host Node/npm/checkout),\
  \ trust chain (approval binds manifest hash, manifest binds bootstrap+archive SHA-256)\
  \ and member safety verified BEFORE staging; payload publication, installed-receipt.v1,\
  \ identity binding (echo-bind-authority-root as a journaled step), and evidence-dir\
  \ provisioning composed as ONE crash-replayable transaction with replay table +\
  \ kill matrix; immutable hash/version payload subtree vs declared mutable share/echo\
  \ metadata subtree; descriptor-pinned receipt/identity handoff to the fence; installed-byte\
  \ hash readback. (7) AC4 normative per-target CAS transition table incl. create/delete\
  \ targets binding presence/bytes-hash/type/uid-gid/mode/parent-target identity/generation:\
  \ before\u2192after, journaled-after no-op, after\u2192before, before no-op on unapplied\
  \ rollback, third state untouched + durable block with completed sibling transitions\
  \ retained; in-place writes forbidden (same-dir O_CREAT|O_EXCL 0600 temp, metadata\
  \ apply, file fsync, rename, parent fsync, under-lock reconciliation) so no controller-created\
  \ third image exists; creates commit via renamex_np RENAME_EXCL; replace-window\
  \ never-overwrite promise EXPLICITLY narrowed to foreign changes durable before\
  \ the under-lock descriptor-pinned final validation (Darwin has no compare-and-rename);\
  \ barrier-controlled foreign rename/chmod/byte races + kill tests at all five boundaries\
  \ across apply/rollback/recutover. (8) AC3 imports exactly (C0,C1] with idempotency/deadlines/checkpoints\
  \ cut at C1 and a no-row-or-state-above-C1 assertion, consistent with AC7's persisted\
  \ four bounds. Also check: no new unnamed mechanism, still exactly one authority.lock\
  \ and no second lock object, no counterpart-manifest revival, 137 projection stays\
  \ sealed with prior rolled_back retained until replacement, and Tests sections cover\
  \ every new table cell, race, and kill matrix named above."
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `1f5729999154691efeb76161c17db8a186884b0f`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
