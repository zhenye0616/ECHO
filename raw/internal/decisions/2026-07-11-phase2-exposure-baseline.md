# Phase 2 exposure baseline - real scanner and reachable-history content sweep

**Date:** 2026-07-11 PDT  
**Phase 1 baseline:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`  
**Security-gate commit:** `5bd7b0cd` on `maint/clarity-phase2`  
**Scope:** read-only secret scanning, sanitized semantic-history assessment, and prospective guardrails. No history rewrite.

## Result in plain English

The real secret scanner found no credentials in reachable git history. This closes scan Job B, which Phase 1 left partial. It does not make the repository content-safe: known names, quotes, meeting pointers, founder paths, and removed private material remain in history until the separate filter-repo decision is made. Prior public clones, forks, and caches cannot be recalled by either scan or rewrite.

## Job B - Gitleaks full-history scan

| Field | Recorded value |
|---|---|
| Scanner | Gitleaks `8.30.1` |
| Installed binary SHA-256 | `bb73559cd722f511a32885e298a5bb124046ccf3f5b3ee173b18694901ee9bd0` |
| Configuration | Gitleaks `8.30.1` compiled default rules; no repo allowlist or suppression file |
| Command | `gitleaks git . --log-opts=--all --redact=100 --no-banner --no-color --report-format=json --report-path=<operator-temp>` |
| Ref scope | Local and remote branch refs plus tags reachable from the Phase 1 checkout; `git rev-list --all --count` reported 4,670 reachable commits at the baseline |
| Scanner accounting | 4,493 commits / about 28.51 MB at `f77ba415`; 4,494 commits / about 28.52 MB after `5bd7b0cd` |
| Findings | 0 |
| Redacted JSON report | Empty array (`jq length` = 0); operator-temporary only, because an empty machine report adds no durable evidence beyond this command/result record |

Primary tool references: [Gitleaks repository and CLI documentation](https://github.com/gitleaks/gitleaks) and the [v8.30.1 release assets/checksums](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

Gitleaks scans `git log -p`; its own commit count is therefore recorded separately from `git rev-list --all --count` rather than being forced to match. The `--all` ref contract and both counts are preserved so a later rerun can detect coverage drift.

### Negative control

A temporary repository outside Project ECHO was created with a fake AWS-shaped canary, committed, and scanned using the same redaction flags. Gitleaks exited 1, the harness classified the canary as detected, and the literal did not appear in stdout/stderr. The temporary repository was deleted. No canary was placed in ECHO history.

## Prospective gate

Commit `5bd7b0cd` adds:

- `tools/secret-scan.sh`, which fails closed unless Gitleaks is exactly `8.30.1` and then runs the redacted `--all` scan;
- `.github/workflows/secret-scan.yml`, which runs on every push and pull request without docs/raw path exclusions, downloads the official Linux x64 `8.30.1` release, verifies SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`, fetches reachable branches/tags, and invokes the repo-owned wrapper;
- `tools/install-pre-push-hook.sh`, a manual, idempotent local hook installer; it does not modify git configuration or install itself automatically;
- focused tests for version pinning, redaction flags, failure propagation, hook path resolution, idempotency, and mode repair (9/9 green).

The official release checksum file was also downloaded out of tree and matched the pinned Linux asset checksum. The checksum-file SHA-256 was `061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae`.

## Reachable-history semantic-content sweep

This is separate from Gitleaks. A sanitized scan read all added/deleted diff-content lines from `git log --all -p --format=` without emitting matched values:

| Detector | Reachable-history result | Comparison |
|---|---:|---|
| Diff content read | 36,857,911 bytes | Coverage measurement only |
| Live-looking Granola note IDs | 10 distinct | Current tracked tree also has 10; history-only delta is 0 |
| Absolute `/Users/...` path literals | 470 distinct | Expected broad low-severity historical class; not removed |
| Non-example email-shaped literals | 19 distinct | Count only; not treated as proof of identity or sensitivity without manual classification |

The redaction commits `001d7fe3` and `849c0b3c` are descendants of the exposed content, so the removed names, meeting title, quote, and sensitive note titles remain reachable in pre-redaction history. The already-known content anchors `ab95c519`, `1ba3580a`, and `7bc368b5` also remain reachable. No new note-ID class appeared beyond the tracked-tree inventory.

### Semantic-scan limitation

This sweep is not named-entity recognition and cannot prove that every personal name or paraphrased private fact was found. It covers the known exposure classes, redaction diffs, anchored historical paths, note-ID syntax, absolute paths, and email-shaped literals. The filter-repo decision must use the known anchors plus any later human-reported class; a clean Gitleaks result must never be used as a semantic-content clearance.

## GitHub and release settings

The local `gh` account token is invalid, so GitHub push protection, repository security settings, and authenticated release-asset policy were **not verified**. This is an explicit open item, not a green result. The committed workflow is reviewable locally but cannot be claimed active until it lands on `main` and a GitHub run succeeds.

## Adjacent dependency observation

`npm ci` reported six total dependency advisories. A production-only `npm audit --omit=dev` reduced that to one transitive high-severity package: `hono@4.12.23` through `@modelcontextprotocol/sdk@1.29.0`, with a fix available. This was not changed in the secret-gate commit and is not part of Job B. It must be dispositioned separately before qualification; `npm audit fix` was deliberately not run.

## Gate status

- Job B, real reachable-history secret scan: **DONE on the Phase 2 branch**, pending merge and independent rerun.
- Reachable-history semantic assessment: **DONE for the declared detectors**, with the limitation above.
- Prospective CI and pre-push protection: **IMPLEMENTED on the Phase 2 branch**, not yet proven by a GitHub run.
- Job C, filter-repo execute-or-defer: **PENDING founder decision**.
- G1 overall: **OPEN** until the filter-repo decision is recorded and the remaining GitHub-settings evidence is either verified or explicitly deferred with owner and trigger.
