---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 6
combined_at: '2026-07-16T04:26:37Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 777c6f494c2b5acf9d5c138b24136c330b6e5ea4
next_round: 7
combined_verdict: divergent
escalated_to_founder: true
---

# Combined findings

**Divergent verdicts** — codex='pushback', codex-ops='proceed_after_patches' cross the `{proceed*, pushback}` boundary; founder escalation per §Out of Scope #7.

**Founder resolution (2026-07-15 PDT):** "yes keep and let them resume" — keep the current architecture for 137 and 138; accept all R3/R6 findings as required spec patches, including 138 source fence, artifact-only deployer, execute/resume lock, and metadata-aware drift-safe CAS; continue review only, no build. This disposition pass is founder-delegated under that decision; the divergent verdict and escalation flag above are preserved as historical facts.

Reframe gate: ≥2 r6 findings target r5-patch mechanisms (lock-only bootstrap state, self-bound manifests, deadline-bounded lock/service ops, best-effort fence evidence, installed identity record from r4/r5). Fresh-context codex investigator (read-only, run pre-disposition) returned kind=propagation_completion: the founder locked these mechanisms as item-138 producer capabilities consumed by item 139, so removal would require replacement machinery while local wording cannot close the producer-consumer seams; recommended accept-all with coalescing 1+9, 3+10, 5+12, adding no second lock, no counterpart choreography, no sink-health contract. Validated against the spec contract and founder instructions and applied; no removal language is used in any disposition, so the removal proof matrix does not fire.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC1 — lock-only bootstrap state and durable canonical-record commits | patched | 777c6f49 — reserved `transaction.json`/`transaction.json.tmp` names; lock+temp and record+temp are strictly validated interrupted-commit states reconciled under the held lock by discard-and-resume (rename is the sole commit point); kill matrix covers temp create/write/fsync and both rename sides for the first planned commit and every replacement. |
| 2 | HIGH | codex | AC1 and AC2 — authority.lock acquisition | patched | 777c6f49 — flock(2) LOCK_EX\|LOCK_NB via one pinned lockfile-recorded dependency shared by both packages; descriptor-relative no-follow open with post-acquisition dev/inode revalidation; monotonic-clock deadline; close-on-exec, never inherited, closed on every exit path; real multiprocess same-inode/no-overlap/stuck-holder-deadline tests; the same lock is the single machine-wide execute/resume lock. |
| 3 | HIGH | codex | AC1 durable-journaling rule and AC2 timeout/evidence paragraphs | patched | 777c6f49 — acquisition timeout writes nothing under the root (redacted stderr + non-zero only); post-acquisition failures journal under the held lock, then release; fence evidence remains best-effort for every rejection; stuck-lock/sink fixtures updated. |
| 4 | HIGH | codex | AC2 — installed authority-root identity record | patched | 777c6f49 — exact `share/echo/installed-authority-root.v1.json` path, schema id, canonical path + device/inode identity, package binding, owner/0444, integrity SHA-256; atomic `echo-bind-authority-root --prefix --root` entrypoint (temp/fsync/rename/parent-fsync); descriptor-pinned verification held through lock acquisition; symlink/alternate-spelling/parent-traversal/root-replacement-race fixtures. |
| 5 | HIGH | codex | AC5 — candidate staging and publication | patched | 777c6f49 — one fully-fsynced immutable versioned directory holding exactly manifest+archive; the sole commit point is one atomic same-filesystem directory rename + parent fsync; discovery ignores staging/orphans; concurrent-build rename loser aborts without disturbing the winner; kill tests immediately before/after the rename. |
| 6 | HIGH | codex | AC5 self-binding and AC8 reviewed-to-landed identity | patched | 777c6f49 — manifest SHA must equal the build checkout HEAD, tree derived from that SHA, archive provenance binds both; substituting another valid in-repo commit/tree pair fails verify; AC8 canonical readback proves per-repository reviewed-to-landed tree equality or forces re-review, with a landed-tree drift fixture. |
| 7 | MEDIUM | codex | AC5 and Tests — deterministic candidate builds | patched | 777c6f49 — pinned canonical entry order, fixed timestamps, uid/gid, modes, compression metadata, canonical manifest serialization, locale/timezone-independent tooling; named determinism test builds twice from two independent clean checkouts of the same SHA and requires byte-identical manifest and archive hashes. |
| 8 | HIGH | codex | AC7 — W/C cut chronology and rollback export | patched | 777c6f49 — activation baselines W0/C0 under the pre-flip freeze, rollback bounds W1/C1 under the rollback freeze, all four persisted in the canonical record; rollback exports exactly (W0,W1] and (C0,C1]; tests cover rows exactly on each boundary and crash replay before/after each flip. |
| 9 | HIGH | codex-ops | AC1 — Implement one closed, replayable phase machine behind a hard mutation boundary | patched | 777c6f49 — coalesced with #1: same reserved-temp interrupted-commit reconciliation (descriptor-relative, stale-temp discard, never trusted as authority) and the full kill matrix around temp creation/fsync and rename for first and later records. |
| 10 | MEDIUM | codex-ops | AC1 durable-journaling invariant and AC2 deadline-bounded lock acquisition | patched | 777c6f49 — coalesced with #3: lock-acquisition timeout = redacted stderr with zero root mutation (no concurrent-writer channel); ordinary under-root failure records persist only while the lock is held; fence wording aligned with the best-effort sink contract. |
| 11 | HIGH | codex-ops | AC2 start-job neutralization and AC7 rollback/recutover | patched | 777c6f49 — rollback idempotently restores the exact captured launchd enable/load/KeepAlive/plist service-control before-image of every job neutralized at source_fenced and proves old-full readiness through the restored job (never a direct test-only start) before completing; recutover's source_fenced step neutralizes it again; fake-launchd crash/failure tests specified. |
| 12 | MEDIUM | codex-ops | AC5 — Build deterministic controller and Project_echo package candidates | patched | 777c6f49 — coalesced with #5: the no-publishable-manifest guarantee is scoped to pre-commit failures; a kill immediately after the rename leaves a complete valid pair whose recovery plus `candidates:verify` counts as success; kill tests on both sides of the rename. |

## Convergence call

needs R7 — founder-delegated resolution of the divergent r6 verdict per the founder decision above (keep architecture; accept all findings as required spec patches; review only, no build): verify all twelve accepted findings plus the founder-required producer contracts (source_fenced phase, single execute/resume authority.lock, installed identity record, single-rename candidate publication, artifact-only deployment_entrypoint, metadata-aware drift-safe CAS, W0/C0–W1/C1 exports, exact service restoration) in `777c6f49`.
