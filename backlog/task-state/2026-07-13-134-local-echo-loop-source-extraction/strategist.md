## current_thesis

Materialize the internal orchestration protocol as a source-independent local `echo-loop` repo while leaving the active Project_echo loop untouched. Judge exact repo semantics and disposable fixtures, not migration machinery.

## locked_decisions

- `echo-loop` owns skills, backlog/task-state, review queue, coordination/deadlines, builder/reviewer/merge workflows, and operator tooling.
- Source is raw Git objects at `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; dirty/replacement/filter/external-object inputs fail.
- One builder creates absent `/Users/zhenye/Desktop/echo-loop`, local branch `migration/2026-07-13-134`, fixed identity, and no remote; EEXIST aborts.
- No dedicated evidence tree, migration controller, publisher, capsule, process watcher, or custom handoff/recovery is built.
- Source fixed point bootstraps variant configs/workspaces by raw-tree enumeration and keys traversal by canonical binding context.
- Final HEAD dependencies partition local blobs, npm rows, and toolchain rows; product/context/history sources are excluded.
- `role.invoked` is reserved to `invokeRole`; deterministic invocation identity and bounded synchronous PENDING publication/retry never return false success.
- SQLite init is sidecar-free DELETE mode and no-replace; stale final sidecars fail BUSY.
- Watcher actions use PREPARED/APPLIED/ESCALATED data, candidate commit, exact Git ref CAS, and same-digest crash reconciliation.
- Direct/npm verifier envelopes are route-local; canonical inner roster projections must match.
- Install/test environments are allowlisted and all real workflow tests use only disposable repos/remotes.
- Normal Project_echo builder workflow owns handoff; independent review reruns from a fresh clone.
- Active Project_echo loop remains installed/authoritative; target is local and not installed.

## open_questions

- R15 by `codex` and `codex-ops` must confirm the simplified migration boundary plus resolver, invokeRole, SQLite, watcher-CAS, and verifier semantics.
- Later cutover decides installation, remote, per-repo state, and authority transfer.

## dont_touch

- Do not change active loop/launchd/user skills, touch real repos/remotes/state, include product/context/history, or touch siblings/wiki/holdout-131.

## canonical_anchors

- decision: raw/internal/decisions/2026-07-13-one-shot-local-extraction-lifecycle.md
- spec: backlog/proposed/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
