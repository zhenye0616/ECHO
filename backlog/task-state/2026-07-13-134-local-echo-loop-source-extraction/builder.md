---
last_updated: 2026-07-15T06:25:47Z
handoff_branch: agent/134-echo-loop
handoff_head_sha: 155c48c0f3b79fb4aad4fa2b1ad95d175f0b0601
handoff_run_log: raw/internal/agent-runs/2026-07-14-2026-07-13-134-local-echo-loop-source-extraction.md
---
## current_thesis

Claim of 2026-07-13-134 by builder binding `fable-builder-134` (Claude Code). Materialize the internal orchestration protocol as a source-independent local `echo-loop` repo at `/Users/zhenye/Desktop/echo-loop` from pinned Project_echo objects, prove it on disposable fixtures, and hand off at `pending_review` with a migration record. Active Project_echo loop is untouched; target is local, no-remote, not installed.

<!-- builder-state-handoff:start -->
- Lifecycle: COMPLETE — ready for review at 155c48c0f3b79fb4aad4fa2b1ad95d175f0b0601.
<!-- builder-state-handoff:end -->

## locked_decisions

- Source pin is `Project_echo@2971310441b69735cbe759293abd8c4d044bf347`; reads are raw git objects (`ls-tree` + `cat-file --batch`) under config-free git 2.37.3; dirty/replacement/filter inputs fail.
- The sealed source policy `raw/internal/migrations/2026-07-13-134-echo-loop-source-policy.v1.json` (blob `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a`, sha256 `44bef194…`) is loaded by OID, never modified, aborts on mismatch, and is the sole authority for seeds/roots/expansion/edges/precedence/exclusions.
- Target repo owns internal branch `migration/2026-07-13-134`, fixed identity, no remote, hooks/signing/templates off; EEXIST aborts. Project_echo feature branch is `agent/134-echo-loop`.
- `./coord` is a rewritten lane (better-sqlite3 publication protocol + atomic init); it does not import capture/logging/echo-home/storage. `role.invoked` reserved to `invokeRole`; relative `deadlineMs`; 2s publication budget bounds retry.
- Trusted attended build: no migration controllers/evidence publishers/capsules/process watchers/custom recovery. An interrupted target is unaccepted and founder-archived.

## open_questions

- No open builder question. D1/D2/C1/C2 are closed at target HEAD
  `38989db78e221a7e15b2adbe859fa76244bf16e4`; feature head
  `ed41a6685848a0dc6f04d558e00e3c426a9b3166` requires fresh independent
  review. The target remains UNACCEPTED, `authority:false`, `installed:false`,
  and local `DEV`.

<!-- builder-state-handoff-open-questions:start -->
- No escalation question; see pending-review agent_notes and run log Run 9 for
  exact evidence.
<!-- builder-state-handoff-open-questions:end -->

## dont_touch

- No target remote, publish/install, or launchd/user-skill changes.
- No copying of Project_echo history/wiki/raw/backlog archives; no product/context capabilities.
- Beyond pinned read-only source reads, target creation, and the AC8 feature-branch push: do not touch real repos/remotes/state, siblings (133/135), wiki, or holdout-131.

## canonical_anchors

- spec: backlog/pending_review/2026-07-13-134-local-echo-loop-source-extraction.md
- reviews: backlog/reviews/2026-07-13-134-local-echo-loop-source-extraction/
