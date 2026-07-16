---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 5
spec_commit_sha: 7a79d6d479d872062bbb177c2cd8eb43e88f7cde
artifact_path: backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md
class: structural-reform
requested_at: '2026-07-16T05:55:18Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 376b8786-5e9c-4803-8e46-d55fa24fbca3
focus_hints: "Verify the r4 patches at 7a79d6d4 across nine groups: (1) AC4 release\
  \ FSM \u2014 release-journal.v1 at <staging-root>/<landed-sha>-<version>/journal.json,\
  \ 0600 in 0700 dir, atomic temp+rename with file+parent fsync, write-ahead intent\
  \ records, monotonic compare-and-swap transitions, per-landed-SHA+version flock(2)\
  \ LOCK_EX|LOCK_NB on fsm.lock held from before journal read across build/upload/install/record\
  \ and checkpoints, verify-adopt-or-hard-refuse at every crash window (never a second\
  \ build); approval ingress solely via resume --approve <owner-checked 0600 file>\
  \ binding tuple (landed SHA, version, runtime artifact SHA-256, bootstrap hash,\
  \ asset-set manifest digest) + operator + timestamp + single-use nonce; journal\
  \ edits/merge metadata never authorize; absent/malformed/stale/replayed/pre-smoke/wrong-tuple/reused-nonce/wrong-owner-mode\
  \ negatives; concurrent stage/stage, stage/resume, resume/resume barrier tests +\
  \ kill-at-every-boundary proving one build and one journal mutator. (2) AC4/AC5\
  \ asset trust \u2014 non-recursive canonical release-set manifest (sorted per-asset\
  \ name/size/SHA-256, covers every asset, never itself) with its digest in the approval\
  \ tuple; the repo-free runner verifies bootstrap + release-set manifest against\
  \ journal-checkpointed approval-bound hashes external to downloaded assets BEFORE\
  \ /bin/sh, executes protected 0700-staged/open-descriptor verified bytes (verify/use\
  \ swap impossible), pinned absolute tools or minimal PATH, umask 077, env allowlist\
  \ stripping NODE_OPTIONS/DYLD_*; whole-set substitution, swap-race, hostile-PATH/env,\
  \ missing-utility tests; private-release/cache acceptance covers the exact bootstrap+release-set-manifest+tgz+runtime-manifest+checksum+SBOM\
  \ set with all hashes/sizes/modes and no extras. (3) AC5 bootstrap/layout \u2014\
  \ bootstrap verifies/extracts only into a self-created 0700 staging dir (its sole\
  \ path decision, no second resolver); bundled CLI via single src/install/layout.ts\
  \ resolver owns the sole final atomic install into the immutable release root; literal\
  \ closed candidate argv --candidate-root/--label com.echo.context.candidate.<run-id>/--port\
  \ covering every root/label/port/domain/bootstrap write with refusal of founder/live\
  \ paths and canonical labels/ports; bounded close-bind port handoff with typed port-stolen\
  \ failure + unconditional cleanup; deny-write and competing-binder tests. (4) AC1/AC5/AC6\
  \ supervisor/runtime \u2014 launchd owns exactly the supervisor; supervisor spawns/verifies\
  \ exactly one direct runtime child (realpath under owned release + artifact hash)\
  \ which alone binds the listener, opens SQLite, and holds writer.lock with a close-on-exec\
  \ descriptor; one-child + sole-restart authority, signal forwarding, bounded TERM-to-KILL,\
  \ reaping, parent-death child shutdown, exact launchctl start/stop/disable/restart\
  \ sequences; status/doctor split supervisor and runtime-child PID/start/realpath;\
  \ AC6 truth table keys the expected holder to the verified child of the launchd-reported\
  \ supervisor; real-launchd kill/hang-either-process convergence tests. (5) AC1 owner\
  \ sidecar \u2014 <home>/writer.owner.json, writer-owner.v1, max 4096 bytes, 0600\
  \ current-user regular non-link file, atomic temp+rename with file+parent fsync\
  \ only while the kernel lock is held, binds PID/start/exe realpath/artifact hash/lock\
  \ device+inode; loser never writes, normal close clears, crash-stale replaced only\
  \ after acquisition; corruption/boundary tests. (6) AC5/AC6 structural cut \u2014\
  \ launchd StandardOutPath/StandardErrorPath route to /dev/null; last-resort files,\
  \ spawn-time truncation, and aggregate counting fully removed (state/behavior/owners/tests\
  \ absent per the r4 combined.md removal proof matrix); one bounded rotating internal\
  \ sink remains plus a separate bounded durable 0600 last-exit record (<=4096 B,\
  \ atomic replace on child exit: status/signal, timestamps, restart count) surfaced\
  \ by doctor even under sink failure or pre-sink crash; sustained-supervisor-output,\
  \ sink-failure, pre-sink crash-loop, /dev/null-persistence, no-last-resort-file,\
  \ and cap-invariant tests; doctor fails on non-/dev/null output paths or files at\
  \ retired last-resort paths. (7) AC5 install crash transaction \u2014 0600 install-intent\
  \ in a fresh 0700 owned transaction dir before first real-path mutation, staging\
  \ + provisional ownership checkpoint, atomic release/config/plist/ownership commits,\
  \ no launchd load/start before ownership-manifest commit, adopt/rollback/refuse\
  \ on rerun; kill-at-every-boundary tests prove no untracked bytes, no loaded job\
  \ without a committed manifest, no unremovable real-path mutation. (8) AC7 failure\
  \ evidence \u2014 caller-supplied evidence destination outside the disposable root\
  \ (release runs: founder-owned release-staging evidence dir), versioned redacted\
  \ bounded schema, 0700 dir/0600 regular files, atomic+fsync, survives disposable-root\
  \ cleanup; failure/timeout tests prove persistence and no secret/unredacted-path\
  \ leak. (9) AC6 status/doctor process contract \u2014 stable exit-code enum 0 healthy/1\
  \ unhealthy/2 usage/3 not-installed/4 probe-timeout/5 internal-error, exactly one\
  \ schema-valid JSON document on stdout per outcome, credential-free stderr, bounded\
  \ probes, exact-bytes subprocess tests. Also confirm: patches complete existing\
  \ mechanisms with no new alternatives beyond the founder-directed cut in (6); authority\
  \ schema stays exactly prepared|active|rolled_back; no source_fenced and no item-138\
  \ deployer/controller scope entered item 137; candidate labels/ports never touch\
  \ com.echo.context or 39478/38478/38479."
---

# What to review

Read `backlog/proposed/2026-07-15-137-echo-context-installable-shadow-runtime.md` at commit `7a79d6d479d872062bbb177c2cd8eb43e88f7cde`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
