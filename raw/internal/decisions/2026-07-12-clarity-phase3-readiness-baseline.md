# Clarity Phase 3 readiness baseline

**Date:** 2026-07-12 PDT
**Starting branch:** `maint/clarity-phase2`
**Starting SHA:** `19c5fc0122a598721a99b128c2006fc7bb7248ea`
**Main baseline:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Gate state:** G1 open; G2 open; product maturity DEV
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
- The canonical closure register remains 1 resolved / 26 pending.
- The last independently reviewed Phase 2 tip is `c8ddd38b`. The five later commits through `19c5fc01` contain the checkpoint, founder filter-repo decision, GitHub audit, and first remote workflow evidence; that range still needs independent current-tip review before landing.

## Non-negotiable boundaries

- Do not create or populate `backlog/proposed/`, `backlog/ready/`, or product task-state pointers.
- Do not change `src/`, `tests/product/`, product packaging, or product runtime behavior.
- Do not claim FOUNDER LIVE, QUALIFIED, or CLIENT LIVE.
- Do not mutate GitHub settings, releases, tags, environments, branches, or protection rules without explicit founder authorization.
- Do not run real-meeting, billed-vendor, auth-mutating, launchd, client-data, or destructive empirical probes without the data/environment/operator approval required by the predeclared rubric.
- Do not merge or push `main` without the project’s founder checkpoint.
- A green branch workflow is not the first landed `main` workflow required by G1.
- A completed register is not itself the G2 lift; the lift is a separate founder decision naming an approved main SHA after independent mechanical verification.

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

### R3 — Land the Phase 2 evidence branch

After R1 and the relevant R2 work, prepare the Phase 2 branch for founder-approved landing. Preserve the single-purpose history and do not combine it with product work or optional physical reorganization.

**Ready when:** the candidate tip is independently reviewed, required checks are green, merge conflict preview is clean, and the founder has approved the main update. Landing still does not lift G2.

### R4 — Close G1 on landed evidence

After the workflow exists on main, verify the first `main` secret-scan run at the exact landed SHA. Rerun the GitHub settings audit after any authorized setting changes. Preserve the distinction between credential-secret results and known semantic-content exposure.

**Ready when:** A6 has a terminal register state backed by landed scan evidence, the first green main run, and either verified remediation or explicit risk dispositions.

### R5 — Founder closure session for the remaining register

Work through `2026-07-11-phase2-founder-decision-packet.md` without reopening product demand. Record each answer in a dated decision artifact or as `deferred-with-owner-and-trigger`. Run empirical rubrics only after their separate input/operator approvals.

**Ready when:** all 27 canonical rows are exactly one of `resolved`, `accepted-risk`, or `deferred-with-owner-and-trigger`, with a real evidence or trigger reference.

### R6 — Independent mechanical G2-readiness check

A different binding verifies the complete register at an exact main SHA: row count, allowed terminal states, owner/trigger requirements, cited-path existence, and consistency with the locked Team-product direction and four-stage maturity contract.

**Ready when:** the checker records a clean result or all findings are resolved and rechecked at the new exact SHA.

### R7 — Separate founder halt-lift consideration

Only after R4-R6 may the founder consider a separate `clarity-halt-lift` decision naming the approved main SHA. That decision may authorize reviewed conversion of approved acceptance outlines into `backlog/proposed/`; it does not authorize direct-to-ready work and does not advance product maturity.

The first post-lift proposal remains the graduation foundation: product composition root and source fence, runtime isolation, `tests/product/`, build-once artifact identity, and machine-readable qualification evidence.

## Current stop line

The first action requiring new authority is R2: remediation versus explicit risk disposition for the verified-red GitHub controls. Until the founder answers that question, safe work is limited to current-tip review preparation, decision-session preparation, and non-mutating verification.

No Phase 3 readiness work may silently convert “recommended” choices in the founder packet into decisions.
