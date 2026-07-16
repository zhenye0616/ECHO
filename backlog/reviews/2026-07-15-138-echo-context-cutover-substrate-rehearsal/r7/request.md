---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 7
spec_commit_sha: 777c6f494c2b5acf9d5c138b24136c330b6e5ea4
artifact_path: backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md
class: structural-reform
requested_at: '2026-07-16T05:24:47Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 1b9561ee-4127-47cd-bf21-0c9d62e836fe
focus_hints: "Verify the r6 founder-resolved propagation-completion patches (all twelve\
  \ r6 findings accepted; founder decision: keep architecture, accept all findings,\
  \ review only, no build; spec-r6-patches 777c6f494c2b5acf9d5c138b24136c330b6e5ea4):\
  \ (1) source_fenced controller phase \u2014 exactly two closed sequences planned->source_fenced->backed_up->migrated->prepared->active\
  \ and rolled_back->recutover_prepared->source_fenced->backed_up->migrated->prepared->active;\
  \ controller-only phase, NOT a new item-137 context-authority.v1 state; 137 projection\
  \ absent before prepared and sealed to prepared/active/rolled_back after; no checkpoint/backup/migration/client-transform/prepare-final/prepared-service\
  \ start before source_fenced commits; fence-commit contract verifies installed identity\
  \ + exact fenced package, boots out and persistently disables each old job, relocates\
  \ plists into protected snapshot, stops mixed daemon/shadow, proves zero matching\
  \ jobs/PIDs/listeners and zero DB/WAL/SHM/allowlisted-sidecar writers, and binds\
  \ fence identity + source identity/cut/digest + service-control readback. (2) Reserved\
  \ transaction.json/transaction.json.tmp names with strictly validated interrupted-commit\
  \ reconciliation (discard-and-resume under the held lock; rename is the sole commit\
  \ point) and the kill matrix at every commit boundary including the first planned\
  \ commit. (3) authority.lock exclusion primitive: flock(2) LOCK_EX|LOCK_NB via one\
  \ pinned shared dependency, descriptor-relative no-follow open with post-acquisition\
  \ dev/inode revalidation, monotonic deadline, close-on-exec/never-inherited/closed-on-every-exit,\
  \ real multiprocess same-inode and stuck-holder tests; the SAME single lock is the\
  \ machine-wide execute/resume lock item 139 consumes \u2014 confirm no second lock\
  \ object. (4) Lock-acquisition timeout = redacted stderr + non-zero with zero root\
  \ mutation vs post-acquisition under-lock journaling; fence evidence best-effort\
  \ under missing/unwritable/full sink. (5) Installed authority-root identity record:\
  \ exact share/echo/installed-authority-root.v1.json path/schema/owner/0444/integrity\
  \ SHA-256, atomic echo-bind-authority-root --prefix --root entrypoint, descriptor-pinned\
  \ verification held through lock acquisition, symlink/alternate-spelling/parent-traversal/root-replacement-race\
  \ fixtures. (6) Candidate publication: one fully-fsynced immutable versioned directory\
  \ (manifest+archive), single atomic same-filesystem directory rename commit point\
  \ + parent fsync, staging/orphan-ignoring discovery, concurrent-build loser aborts,\
  \ no-publishable-manifest guarantee scoped to pre-commit failures, post-rename recovery\
  \ + candidates:verify counts as success, kill tests both sides of the rename. (7)\
  \ Manifest SHA equals build checkout HEAD with tree derived from it and archive\
  \ binding both; substituted-valid-commit/tree rejection; AC8 canonical readback\
  \ proves reviewed-to-landed tree equality or forces re-review with landed-tree drift\
  \ fixture. (8) Deterministic builds: pinned entry order/timestamps/uid-gid/modes/compression/serialization/locale/timezone/toolchain;\
  \ two independent clean checkouts byte-identical. (9) Literal deployment_entrypoint\
  \ manifest field naming bin/echo-deploy-artifact --archive --prefix: approved archive\
  \ bytes verbatim only, no lifecycle/build scripts, no dependency resolution, no\
  \ byte mutation, no activation, installed-byte hash readback, rehearsal-root tests,\
  \ missing/mismatched-binding rejection \u2014 the producer contract item 139 consumes.\
  \ (10) One journaled per-target metadata-aware CAS transaction governing apply/abort-recovery/resume/rollback/recutover:\
  \ descriptor-relative identity, exact before bytes/hash/type/owner/mode plus planned\
  \ after-image; restore only exact controller after-images, before-images untouched,\
  \ foreign byte or metadata drift never overwritten/deleted and recorded as secret-free\
  \ manual-recovery evidence blocking activation/phase commit; 137 projection keeps\
  \ only sealed aggregate hashes. (11) W0/C0 under the pre-flip freeze and W1/C1 under\
  \ the rollback freeze, all four persisted; rollback exports exactly (W0,W1] and\
  \ (C0,C1]; boundary-row and flip-crash tests. (12) Rollback idempotently restores\
  \ the exact captured launchd enable/load/KeepAlive/plist before-image and proves\
  \ old-full readiness through the restored job before completion; recutover source_fenced\
  \ re-neutralizes. (13) source_fenced-or-later pre-prepared resume re-proof: reacquire\
  \ the same lock, re-prove fence/zero-writer state and source identity/cut/digest,\
  \ re-validate authenticated backup + scratch restore; foreign-restart/unjournaled-physical-state/source-drift/backup-mismatch\
  \ fail closed with redacted durable evidence and no phase advance. Also check: the\
  \ patches introduce no new unnamed mechanism, no second lock, no live-capable deployer\
  \ mode, no counterpart-manifest revival, no sink-health contract; Tests cover both\
  \ phase sequences, every new kill/negative matrix, DB/WAL/SHM/sidecar drift, byte-only\
  \ and metadata-only client drift at initial/rollback/recutover, deployer, execute/resume\
  \ contention, installed-identity races, publication/determinism, W/C interval boundaries,\
  \ and exact service restoration."
---

# What to review

Read `backlog/proposed/2026-07-15-138-echo-context-cutover-substrate-rehearsal.md` at commit `777c6f494c2b5acf9d5c138b24136c330b6e5ea4`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
