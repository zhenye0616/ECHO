# Clarity Phase 3 readiness baseline

**Date:** 2026-07-12 PDT
**Starting branch:** `maint/clarity-phase2`
**Starting SHA:** `19c5fc0122a598721a99b128c2006fc7bb7248ea`
**Main baseline:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Gate state:** G1 closed; G2 open; product maturity DEV
**Scope:** closure, security, review, and landing readiness only

## Meaning of Phase 3

“Phase 3” is an operating label for getting the Phase 2 evidence and founder decisions into a reviewable, landable, mechanically verifiable state. It is not a product maturity stage, a clarity-halt lift, or authorization to create product specs or product code.

The only product maturity vocabulary remains `DEV -> FOUNDER LIVE -> QUALIFIED -> CLIENT LIVE`. The current candidate remains DEV.

## Entry evidence

- The Phase 2 branch and its remote tracking ref were aligned at `19c5fc01` when this baseline was opened.
- `f77ba415` is an ancestor of the Phase 2 tip. A merge-tree inspection found no conflict markers against the unchanged main baseline.
- The Phase 2 secret-scan workflow passed on GitHub at exact branch heads [`10d01db4` (run 29207214563)](https://github.com/zhenye0616/ECHO/actions/runs/29207214563) and [`19c5fc01` (run 29207272582)](https://github.com/zhenye0616/ECHO/actions/runs/29207272582). The final-tip run was rechecked read-only when this baseline was opened: completed/success at the exact 40-character SHA.
- The real text and binary reachable-history scan is complete and independently rerun.
- The filter-repo rewrite is deliberately deferred with a founder-owned G4 trigger.
- The GitHub settings audit is complete but VERIFIED RED.
- The founder-approved terminal package reconciles the canonical register to 11 resolved / 16 deferred-with-owner-and-trigger / 0 pending on the decision branch. It still requires landing and exact-SHA independent verification.
- A different binding reviewed `c8ddd38b..a2c53cb9` and returned READY with no medium-or-higher findings. The final remediation delta still needs independent review at its exact candidate tip before landing.

## Non-negotiable boundaries

- Do not create or populate `backlog/proposed/`, `backlog/ready/`, or product task-state pointers.
- Do not change `src/`, `tests/product/`, product packaging, or product runtime behavior.
- Do not claim FOUNDER LIVE, QUALIFIED, or CLIENT LIVE.
- Do not mutate GitHub settings, releases, tags, environments, branches, or protection rules without explicit founder authorization.
- Do not run real-meeting, billed-vendor, auth-mutating, launchd, client-data, or destructive empirical probes without the data/environment/operator approval required by the predeclared rubric.
- Do not merge or push `main` without the project’s founder checkpoint.
- A green branch workflow is not the first landed `main` workflow required by G1.
- A completed register is not itself the G2 lift; the lift is a separate founder decision naming an approved main SHA after independent mechanical verification.

**Narrow supersession 2026-07-12:** the founder later approved the exact CodeQL terminal table, including fixes to the specifically enumerated source alerts. That approval supersedes the earlier no-source-fix line only for alerts `3-8`, `10`, and PR-only `80`; every other halt boundary remains in force.

## Phase 3 readiness sequence

### R1 — Current-tip independent review

Have a different binding review `c8ddd38b..19c5fc01`, including the filter-repo deferral, GitHub audit interpretation, branch-run evidence, and all cross-file gate-state updates. Any later readiness edits join the review range. Self-review may prepare the range but cannot close this row.

**Ready when:** the independent reviewer records no unresolved medium-or-higher blocker at the exact candidate tip.

### R2 — Founder G1 disposition

For the verified-red GitHub controls, the founder must choose one of two paths:

1. authorize remediation and name the security executor; or
2. record explicit accepted-risk or deferred-with-owner-and-objective-trigger dispositions for each control.

The recommended remediation order remains: native secret scanning/push protection; vulnerability alerts and fixes; main/tag rules; immutable action pins plus enforced SHA pinning; protected production environment; immutable future releases.

**Ready when:** every red control has an authorized remediation path or terminal risk disposition. Evidence, not authorization alone, closes the control.

**Status 2026-07-12:** authorized and executed pre-land. Native scanning, push protection, dependency controls, CodeQL, branch/tag rulesets, a protected production environment, immutable releases, and private vulnerability reporting are enabled. The founder separately approved the exact CodeQL terminal table. At PR head `3c69f815`, CodeQL has zero open PR-ref alerts; 70 baseline alerts have evidence-specific dismissals and the nine fix-designated baseline alerts await post-land natural closure. Exact evidence and residuals are in `2026-07-12-phase3-github-security-remediation.md` and `2026-07-12-codeql-terminal-disposition-table.md`.

### R3 — Land the Phase 2 evidence branch

After R1 and the relevant R2 work, prepare the Phase 2 branch for founder-approved landing. Preserve the single-purpose history and do not combine it with product work or optional physical reorganization.

**Ready when:** the candidate tip is independently reviewed, required checks are green, merge conflict preview is clean, and the founder has approved the main update. Landing still does not lift G2.

### R4 — Close G1 on landed evidence

After the workflow exists on main, verify the first `main` secret-scan run at the exact landed SHA. Rerun the GitHub settings audit after any authorized setting changes. Preserve the distinction between credential-secret results and known semantic-content exposure.

**Ready when:** A6 has a terminal register state backed by landed scan evidence, the first green main run, and either verified remediation or explicit risk dispositions.

**Completed 2026-07-12:** A6 is resolved by `2026-07-12-g1-exposure-baseline-closure.md`. PRs #8 and #9 landed; post-land CodeQL and full-history secret scanning passed at `48ed4f87`; CodeQL has zero open alerts; Actions SHA pinning, GitHub-owned action restriction, and strict required checks are enforced. G2 remains open.

### R5 — Founder closure session for the remaining register

Work through `2026-07-11-phase2-founder-decision-packet.md` without reopening product demand. Record each answer in a dated decision artifact or as `deferred-with-owner-and-trigger`. Run empirical rubrics only after their separate input/operator approvals.

**Ready when:** all 27 canonical rows are exactly one of `resolved`, `accepted-risk`, or `deferred-with-owner-and-trigger`, with a real evidence or trigger reference.

**Completed on the decision branch 2026-07-12:** the founder instruction `APPROVE TERMINAL PACK` approved `2026-07-12-g2-terminal-dispositions-and-repository-topology.md`. The reconciled register contains 11 resolved and 16 deferred-with-owner-and-trigger rows, with zero pending rows. Landing approval is separate.

### R6 — Independent mechanical G2-readiness check

A different binding verifies the complete register at an exact main SHA: row count, allowed terminal states, owner/trigger requirements, cited-path existence, and consistency with the locked Team-product direction and four-stage maturity contract.

**Ready when:** the checker records a clean result or all findings are resolved and rechecked at the new exact SHA.

### R7 — Separate founder halt-lift consideration

Only after R4-R6 may the founder consider a separate `clarity-halt-lift` decision naming the approved main SHA. That decision may authorize reviewed conversion of approved acceptance outlines into `backlog/proposed/`; it does not authorize direct-to-ready work and does not advance product maturity.

The first post-lift proposal remains the graduation foundation: product composition root and source fence, runtime isolation, `tests/product/`, build-once artifact identity, and machine-readable qualification evidence.

## Current stop line

**Superseding status 2026-07-12:** R1-R5 are complete on the decision branch and G1 is closed. The stop line is now R6: independently verify the terminal register at the exact candidate tip, obtain founder approval to land it, recheck the exact landed SHA, and then obtain the separate founder G2 signature. Product specs and maturity advancement remain halted.

**Historical pre-land stop line:** R2 remediation authority was granted by the founder's instruction to proceed with Phase 3. The next irreversible action then requiring authority was the R3 update of `main`.

**Historical pre-land qualification finding:** the first remote PR run exposed inherited onboarding/release failures requiring product/runtime or package work across the halt. The security-only landing proceeded under founder authority; those failures remain post-G2 qualification blockers. Exact run evidence is in `2026-07-12-phase3-github-security-remediation.md`.

No Phase 3 readiness work may update `main`, fix additional product/source findings beyond the founder-approved CodeQL table, or silently convert “recommended” choices in the founder packet into decisions.
