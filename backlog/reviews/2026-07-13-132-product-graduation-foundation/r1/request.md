---
item_id: 2026-07-13-132-product-graduation-foundation
round: 1
spec_commit_sha: 6b0d582d0ecc83dd19870a50fbb24c062a1808f6
artifact_path: backlog/proposed/2026-07-13-132-product-graduation-foundation.md
class: narrow
requested_at: '2026-07-13T09:14:48Z'
requested_reviewers:
- codex
- codex-ops
correlation_id: 9d615bce-1ef3-41d2-94fa-b8bd915c7b28
focus_hints: "Rank-1 post-G2 graduation foundation; broad by design (spec Risks says\
  \ split only if remainder stays one usable foundation). Seams to pressure: (1) AC1\
  \ fence realism \u2014 is the stated max allowlist actually transitively closed?\
  \ granola-poller/signals/storage likely pull sources.ts, paths.ts, or brain.ts today;\
  \ flag any AC that requires a refactor the files_to_modify list doesn't authorize.\
  \ Also: TS-compiler-API fence vs re-exports/createRequire \u2014 implementable in\
  \ 5d? (2) AC2 filesystem-type probe (nfs/smbfs/afpfs/WebDAV) on macOS \u2014 statfs\
  \ semantics injectable+testable, or premature mechanism that should be narrowed?\
  \ (3) AC3 DI refactor regression surface on the LIVE daemon (station 2 runs granola-signals\
  \ in prod on founder machine) \u2014 are compatibility ACs strong enough that dispatch.ts\
  \ injection cannot change brain selection/timeout behavior? (4) AC4 hermetic guard\
  \ \u2014 intercepting sockets/fetch/clock via shared setupFiles under Vitest 3 threads:\
  \ feasible, or does it fight fileParallelism:false config just landed? Also verify\
  \ test:repo rename doesn't silently drop files from CI (product excluded from repo\
  \ suite = coverage gap if tests/product thin at first). (5) AC5 offline packaged\
  \ install \u2014 better-sqlite3 native build with npm_config_build_from_source in\
  \ an offline cache on the macOS runner: realistic? exactly-once pack rule vs local\
  \ scratch lineage carve-out \u2014 contradiction-free? (6) AC7 macOS-runner dependency:\
  \ external macOS queue delays already observed; is a macOS-required qualification\
  \ workflow a merge-blocking risk or informational? (7) AC6/AC9 honesty: any wording\
  \ that could be read as advancing maturity past DEV or waiving AC8 inherited debts?\
  \ (8) estimate 5d vs ~30 files incl. 9 new test files \u2014 realistic or should\
  \ ACs be staged?"
---

# What to review

Read `backlog/proposed/2026-07-13-132-product-graduation-foundation.md` at commit `6b0d582d0ecc83dd19870a50fbb24c062a1808f6`. Apply the canonical reviewer
loop (see `.claude/commands/review-queue-<reviewer>.md`). Embed any
prior-round context inline below; do not rely on out-of-band atom
lookups for the review itself.
