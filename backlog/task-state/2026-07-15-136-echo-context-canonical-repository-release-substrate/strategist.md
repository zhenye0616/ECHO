## current_thesis

Implementation cycle one remains independently rejected and frozen. R18 reviewed exact spec commit `065feea6cda7f9824d54f9041fecc637dd1bccbc` and both requested reviewers returned `proceed_after_patches`. Every substantive R18 finding is accepted. A separate pre-build audit found a higher-order deadlock: the founder delegation requires a record-only approval commit before a normally founder-gated Project main integration, but the former linear CAS design advanced `main` and invalidated the reviewed candidate base. The R18 structural cut replaces that recursion with deterministic `Q/C/A/U/F` integrations, adds a fourth completion-evidence class, separates integration approvals from target/release execution approvals, moves hosted evidence collection into a fresh post-`M` read-only phase, and closes the lifecycle/deadline/ownership findings. R19 must verify these exact patched bytes; no claim or implementation may start earlier.

## locked_decisions

- Item 135 baseline commit `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / tree `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`, accepted extraction evidence, and target repository identity remain immutable.
- Repository creation and baseline-main publication are completed once-only history authorized at Project commits `e1ec8f74ae812e5df0983cd11a9a0827a9aefb67` and `ece86049e8bfca567f03e7cdfbb8ee1d0b45fd05`; they may never be repeated, adopted, or rewritten.
- R14 historical convergence and its old seal remain immutable but are not current claim authority. Cycle-one Project head `25b833332bb22ec79700fcdf31b9c9f20eea79f5` and target head `145868a67a85dbb651faed457ee4001370c0fad0` are evidence only and stay frozen.
- Version remains `0.1.0-dev.136.1`; the sole deliverable is canonical source plus a deterministic source artifact with `installable:false`, `runtime_authority:false`, `state_authority:false`, `installed:false`, maturity DEV.
- A fresh Codex builder repairs through new exact `P_H` and `H`; a different fresh reviewer owns canonical implementation-review JSON and source candidate `R_C`. Builder/reviewer actor and run identities must differ.
- Project authority uses four classes and one shared nonrecursive topology: `implementation_review R_C→R`, `target_main_authority L_C→P_L`, `source_publication_authority S_C→P_S`, and `completion_evidence E_C→P_E`.
- For every class, `Q` is the candidate base; `C` is independently reviewed only for `R_C` and is deterministic schema/evidence-gated for `L_C`, `S_C`, and `E_C`; `A` is a public record-only integration approval; `U` is the disjoint deterministic union; and `F` is the fixed raw two-parent integration `[A,C]`. Candidate/public overlap, main drift during `A→F`, alternate tree/body/parent order, retry, rebase, adoption, or cleanup blocks.
- Each `A` is the only program change in its create-only leased push. Its schema-valid block contains pre-A `Q/E/C` inputs and fixed derivation rules only; `A`/record-blob/`U/F` identities exist only in post-readback evidence. Exact readback of `A`, then `F`, is durable authority. The sole reviewed-local `P_H` exception is Project-only `A_R/R` authorize/integrate/read-only reconcile.
- Coordinator-only execution-purpose authorize publishes record-only `A_M` after public `P_L` and `A_N` after public `P_S`, at full-item-ID delegated-approval paths intentionally absent from builder `files_to_modify`. Integration approval, machine JSON, and execution approval never substitute for one another.
- Target landing is three fresh hosts: read-only `land/evidence`, sole-write `land/write`, then read-only `land/converge`. The write host ends after exact `main=M` readback; convergence independently authenticates `quality-macos`, `quality-ubuntu`, `secret-scan`, and `source-release-build` at exact `M`.
- Postlanding convergence uses a 6,000-second host aggregate and one 15-second grid through offset 5,400, at most 361 ticks. The source-build collect phase uses a 3,000-second aggregate and one grid through offset 2,340, at most 157 ticks; discovery must occur by 1,800 and exact-ID settlement continues on the same cadence.
- Quality jobs have an 80-minute hard bound with nonborrowable 120-second setup, 3,700-second verifier, 300-second carrier, and 180-second cleanup budgets; cleanup begins by elapsed 4,500, retains 120 seconds before hard cutoff, and uses exact authenticated `ci-clean-owned-home.mjs`/Node argv plus parent `ENOENT` readback.
- AC3 cleanup atomically marks `running` before any fallible child settlement/helper authentication. Every later error marks `failed`; `finally` cannot start a second transition or helper.
- The host aggregate begins at the coordinator-known successful direct-child spawn, not after host readiness. PPID/liveness startup consumes the aggregate.
- Poison rejects every later RPC/resource dispatch except one preauthenticated bounded local cleanup helper for already-recorded roots with no credential, network, Git/gh, Project, target, or reconciliation capability.
- GitHub CLI config path ownership is explicit: `/` and `/Users` are UID 0; `/Users/zhenye` and descendants are UID 501; all are regular nonsymlink and not group/world writable; final/snapshot `hosts.yml` is UID 501 mode 0600.
- The pinned GH binary/version plus exact `gh auth token --hostname github.com --user zhenye0616` is the trusted acquisition child. The host alone owns token buffers, `/user` scope/identity authentication, HTTP, askpass/token/receipt pipes, direct child groups, zeroing, and cleanup.
- Workflow metadata uses plain `.github/workflows/source-release-build.yml`; run readback requires current-API `.github/workflows/source-release-build.yml@main`. Global `head_sha=M` cardinality must remain exactly one after discovery.
- Destination namespace authenticated readback remains the sole release authority. Full repository namespace must move serially `E→N0→…→N5`; every response and exact-ID readback is one-attempt, with no retry, adoption, delete, remote cleanup, or automatic re-entry.
- After exact `N5` and release-mode fresh-clone acceptance, final record/backlog bookkeeping forms `E_C`; record-only `A_E` plus deterministic integration yields public `P_E`. Completed-item `project_landed_sha` means `P_S`; `P_E` is the non-self-referential completion-evidence boundary pinned by exact origin readback and later item 137.
- Founder delegation permits the persistent coordinator to perform the approved integrations, target landing, source release, and completion publication without another founder response, but it does not waive exact approvals, fresh independence, tests, readback, or failure repair.
- Items 137–139 remain frozen horizon/risk evidence until exact `P_E` readback. No edit, promotion, claim, review round, build, install, or live mutation for them is permitted during item 136.

## open_questions

- None requiring founder input. R18 is an intentional structural cut because multiple findings attack lifecycle mechanisms introduced by prior patches and the authorization recursion is independently build-blocking.
- Any accepted R19 finding that edits the specification requires R20+ exact-SHA verification. Promotion requires all requested same-SHA reviewers, no unresolved substantive finding, a dispositioned combined artifact, and a fresh content seal.

## dont_touch

- Do not edit, merge, rebase, reset, delete, or treat either cycle-one implementation head as authority.
- Do not merge target main, publish a Project integration/approval, trigger or rerun a target build, create a tag/release/asset, install, change credentials, touch LaunchAgents/clients/database/config, or transfer runtime/state authority while specification review is active.
- Do not alter item-135 provenance, R1–R14 artifacts, the cycle-one rejection sidecar, items 137–139, echo-brain, echo-loop, or unrelated user/agent work.

## canonical_anchors

- spec: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.md
- rejected_review: backlog/proposed/2026-07-15-136-echo-context-canonical-repository-release-substrate.review.md
- reviews: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/
- r17_combined: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r17/combined.md
- r18_combined: backlog/reviews/2026-07-15-136-echo-context-canonical-repository-release-substrate/r18/combined.md
- delegation: raw/internal/decisions/2026-07-16-echo-context-sequential-program-delegated-authority.md
