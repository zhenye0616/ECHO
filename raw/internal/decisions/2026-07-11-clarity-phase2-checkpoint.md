# Clarity Phase 2 checkpoint

**Date:** 2026-07-11 PDT
**Readiness:** READY FOR FOUNDER DECISION SESSION
**Phase 1 baseline:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Branch:** `maint/clarity-phase2`
**Independently reviewed tip:** `c8ddd38b17765c96efbfc90505c0c82dbc34c3ba`
**Main/origin main:** unchanged at the Phase 1 baseline
**Product maturity:** DEV; unchanged

## What this checkpoint means

Phase 2 has completed the executor work needed to make the remaining closure questions decidable. It has not completed the founder decisions, lifted the clarity halt, created product specs, built the client carve, or advanced product maturity.

The branch is ready for a founder session because the objective security work is reproducible, the 27-row closure register has been audited, empirical work has predeclared rubrics, and the remaining questions are collected in one decision packet.

## Work completed

### Exposure and prevention

- Installed and pinned Gitleaks `8.30.1`; recorded local and official release checksums.
- Ran the real all-ref textual-history scan with full redaction. Evidence at `10c578fd`: 4,501 scanner-counted commits / about 28.59 MB / zero findings.
- Enumerated binary history separately: 7 paths, 8 unique blobs, 2,765,149 raw bytes, and 228,139 extracted ASCII/UTF-16LE/UTF-16BE bytes; archive and string scans clean.
- Proved failure behavior in temporary repositories, including odd-offset UTF-16LE and independent UTF-16LE/UTF-16BE controls. No canary entered ECHO history.
- Ran the sanitized semantic sweep across all refs: 10 live-looking note IDs, 470 absolute user paths, and 19 non-example email-shaped literals. The exact 36,941,730-byte detector input is SHA-256 sealed; a commit-bound control reproduced the same counts.
- Added a pinned all-path push/PR workflow, a pinned repo wrapper, and a manual pre-push installer that preserves existing hooks unless `--force` is explicit.
- Preserved the boundary between secret scanning, semantic exposure, and the still-pending history-rewrite decision.

### Closure preparation

- Audited all 27 canonical halt rows: 1 resolved, 26 pending.
- Created a closure inventory that names available evidence, missing closure, and the decision owner / next action for every row.
- Created a founder packet covering filter-repo, GitHub settings, demo shape, commercial mechanics, vendor/key economics, client topology, consent/support, and technical boundary choices.
- Created predeclared rubrics for cold-db extraction, current CLI-auth expiry, clean-machine rehearsal, and the Jul 18 demo freeze. No live, billed, credential-mutating, or destructive probe was run.
- Created the lab access-discovery checklist and a noncircular G3 freeze/seal template.

## Commit set

| Commit | Purpose |
|---|---|
| `5bd7b0cd` | Pinned history-scan wrapper, CI gate, hook installer, and tests |
| `6bb66ad9` | Real scanner evidence and policy/tracking updates |
| `96695c6c` | Closure inventory, rubrics, founder packet, lab checklist, and G3 template |
| `47c171b1` | Immutable checkout action pin |
| `8e0e591f` | Binary-history coverage and existing-hook preservation |
| `d80b5155` | Review corrections to questions, evidence, and G3 sealing |
| `dae903ab` | UTF-16 extraction, exact semantic ref support, and pinned Node runtime |
| `10c578fd` | SHA-256 fingerprint for the semantic detector input |
| `c8ddd38b` | Final scan-evidence seal |

This checkpoint file is the only change after the independently reviewed tip.

## Verification

| Check | Result |
|---|---|
| Focused security tests | 4 files / 13 tests passed |
| Product suite | exit 0; 180 files passed, 1 skipped; 1,865 tests passed, 21 skipped, 1 todo |
| Orchestration suite | 30 files / 269 tests passed |
| Typecheck | passed |
| Lint plus task-state lint | passed |
| CLI build | passed |
| `npm pack --dry-run` | passed; 313 files; 429.0 kB package / 1.6 MB unpacked |
| Backlog index check | passed |
| Blocked-item validation | 130 items; no errors |
| Wiki index check | passed |
| Skill synchronization check | passed |
| July journal concatenation | exit 0 |
| Diff whitespace check | passed |
| Independent rereview at `c8ddd38b` | no medium-or-higher blockers; READY FOR FOUNDER DECISION SESSION |

The first GitHub workflow run is not evidence yet because this branch has not been pushed or merged. GitHub push protection, repository settings, and authenticated release-asset policy also remain unverified because local `gh` authentication is invalid.

## Scope audit

- No `src/` changes.
- No `tests/product/` changes.
- No product backlog item or task-state pointer changes.
- No `wiki/` changes.
- No product maturity advancement.
- No history rewrite.
- No holdout-131 branch or worktree mutation.
- No live ECHO state, credential, launchd, or client-data mutation.
- Main and `origin/main` remain at `f77ba415`.

## Gates and residual risk

### G1 - OPEN

Job B is complete on the Phase 2 branch and independently rerun. G1 remains open until:

1. the founder records execute or defer for Job C/filter-repo;
2. GitHub push protection/settings/release policy are verified after reauthentication or explicitly deferred with owner and trigger; and
3. after landing, the first GitHub secret-scan workflow run is green.

Prior public clones, forks, and caches cannot be recalled. A clean credential scan does not clear names, quotes, meeting information, or other semantic content. The production dependency audit also has one separately tracked transitive high advisory (`hono@4.12.23` through `@modelcontextprotocol/sdk@1.29.0`) that must be dispositioned before qualification.

### G2 - OPEN

The register remains 1 resolved / 26 pending. The packet and recommendations are not decisions. The founder must place every row into exactly one terminal state, a different binding must mechanically verify the completed register and cited artifacts, and the founder must then commit a separate halt-lift decision naming an approved main SHA.

A later G2 lift will authorize reviewed spec conversion. It will not declare the product FOUNDER LIVE, QUALIFIED, or CLIENT LIVE.

## Founder decisions now required

1. Job C/filter-repo: execute the history rewrite in the documented safe order, or defer it with named owner, date/trigger, and accepted residual exposure.
2. GitHub security evidence: reauthenticate and verify the settings now, or explicitly defer with owner and trigger.
3. Demo: choose the Jul 18 demo shape and YC submit/defer posture so G3 can freeze a real artifact. The packet recommends meeting-to-brief only and cutting the old Machine-centered scene.
4. Close or defer the remaining commercial, vendor/key, client/legal, operational, and technical-boundary questions in the founder packet.
5. Approve named operators and safe inputs for any empirical rubrics that should run before G2.

## Exact next action

Run the founder decision session from `2026-07-11-phase2-founder-decision-packet.md`, beginning with filter-repo and GitHub security evidence because those are the remaining G1 blockers. Do not merge this branch, lift G2, or create product specs as part of that decision unless the separate review and approval gates are satisfied.
