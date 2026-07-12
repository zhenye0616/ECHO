# Phase 2 exposure baseline - real scanner and reachable-history content sweep

**Date:** 2026-07-11 PDT
**Phase 1 baseline:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Security-gate commits:** `5bd7b0cd` through `10c578fd` on `maint/clarity-phase2`
**Scope:** read-only secret scanning, sanitized semantic-history assessment, and prospective guardrails. No history rewrite.

## Result in plain English

The real secret scanner found no credentials in reachable git history. This closes scan Job B, which Phase 1 left partial. It does not make the repository content-safe: known names, quotes, meeting pointers, founder paths, and removed private material remain in history under the founder's recorded Job C deferral. Prior public clones, forks, and caches cannot be recalled by either scan or rewrite.

## Job B - Gitleaks full-history scan

| Field | Recorded value |
|---|---|
| Scanner | Gitleaks `8.30.1` |
| Installed binary SHA-256 | `bb73559cd722f511a32885e298a5bb124046ccf3f5b3ee173b18694901ee9bd0` |
| Configuration | Gitleaks `8.30.1` compiled default rules; no repo allowlist or suppression file |
| Command | `gitleaks git . --log-opts=--all --redact=100 --no-banner --no-color --report-format=json --report-path=<operator-temp>` |
| Ref scope | Local and remote branch refs plus tags reachable from the Phase 2 checkout; `git rev-list --all --count` reported 4,678 reachable commits at `10c578fd` |
| Scanner accounting | 4,493 commits / about 28.51 MB at `f77ba415`; 4,501 commits / about 28.59 MB at `10c578fd` |
| Findings | 0 |
| Redacted JSON report | Empty array (`jq length` = 0); operator-temporary only, because an empty machine report adds no durable evidence beyond this command/result record |

Primary tool references: [Gitleaks repository and CLI documentation](https://github.com/gitleaks/gitleaks) and the [v8.30.1 release assets/checksums](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).

Gitleaks scans `git log -p`; its own commit count is therefore recorded separately from `git rev-list --all --count` rather than being forced to match. The `--all` ref contract and both counts are preserved so a later rerun can detect coverage drift.

### Negative control

A temporary repository outside Project ECHO was created with a fake AWS-shaped canary, committed, and scanned using the same redaction flags. Gitleaks exited 1, the harness classified the canary as detected, and the literal did not appear in stdout/stderr. The temporary repository was deleted. No canary was placed in ECHO history.

A second temporary repository stored a fake AWS-shaped canary as odd-offset UTF-16LE inside a binary-classified blob. The repo-owned binary-history pass exited 1. This proves the encoded-string path reaches Gitleaks even when the string is not aligned to byte zero. The temporary repository was deleted and the literal was never committed to ECHO.

## Prospective gate

Commits `5bd7b0cd` through `10c578fd` add:

- `tools/secret-scan.sh`, which fails closed unless Gitleaks is exactly `8.30.1`, runs the redacted `--all` text-patch scan, and then requires the binary-history pass;
- `tools/binary-history-scan.mjs`, which enumerates every unique path Git classified as binary across `--all`, extracts every unique reachable blob version, runs archive traversal, extracts printable ASCII plus ASCII-range UTF-16LE/UTF-16BE strings at both byte alignments, and sends those strings through redacted Gitleaks stdin;
- `tools/semantic-history-scan.mjs`, which commits the semantic detector regexes/exclusions and emits only sanitized counts;
- `.github/workflows/secret-scan.yml`, which runs on every push and pull request without docs/raw path exclusions, pins Node 22 through immutable `actions/setup-node` SHA `49933ea5288caeca8642d1e84afbd3f7d6820020`, downloads the official Linux x64 Gitleaks `8.30.1` release, verifies SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`, fetches reachable branches/tags, and invokes the repo-owned wrapper;
- `tools/install-pre-push-hook.sh`, a manual, idempotent local hook installer; it does not modify git configuration or install itself automatically, preserves different existing hook content by default, and requires explicit `--force` to replace it;
- focused tests for version pinning, redaction flags, text/binary failure propagation, semantic-count privacy, hook path resolution, idempotency, refusal-by-default, explicit force, and mode repair (13/13 green).

The official release checksum file was also downloaded out of tree and matched the pinned Linux asset checksum. The checksum-file SHA-256 was `061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae`.

## Reachable-history semantic-content sweep

This is separate from Gitleaks. A sanitized scan read added/deleted diff-content lines across all reachable refs without emitting matched values. Its exact 36,941,730-byte input is sealed by SHA-256 `4dfbefc8178ded6d620a0ee70013d979dfdbe1794cedebac887c9ee72a18acfe`. A second run bound only to exact commit `10c578fdd6b05ba214f7f3c0c4695d011ddbc0c5` produced the same detector counts. The scanner's own synthetic-fixture path is a declared exclusion so the detector does not count its test datum as repository exposure:

| Detector | Reachable-history result | Comparison |
|---|---:|---|
| Diff content read | 36,941,730 bytes across `--all`; 36,841,348 bytes at exact branch commit | Coverage measurement only |
| Live-looking Granola note IDs | 10 distinct | Current tracked tree also has 10; history-only delta is 0 |
| Absolute `/Users/...` path literals | 470 distinct | Expected broad low-severity historical class; not removed |
| Non-example email-shaped literals | 19 distinct | Count only; not treated as proof of identity or sensitivity without manual classification |

The redaction commits `001d7fe3` and `849c0b3c` are descendants of the exposed content, so the removed names, meeting title, quote, and sensitive note titles remain reachable in pre-redaction history. The already-known content anchors `ab95c519`, `1ba3580a`, and `7bc368b5` also remain reachable. No new note-ID class appeared beyond the tracked-tree inventory.

Exact commands: `node tools/semantic-history-scan.mjs` for full all-ref coverage, then `node tools/semantic-history-scan.mjs --ref 10c578fd` for the immutable branch control. JSON output records the ref scope, resolved commit SHA when applicable, SHA-256 of the exact textual-diff input, detector regexes, email exclusions, the single path exclusion (`tests/tools/semantic-history-scan.test.ts`), counts, and the rule that matched values are never emitted.

## Reachable binary/archive pass

Gitleaks git mode reads textual patches and does not cover NUL-classified binary diffs. The repo-owned second pass therefore enumerated the full binary history separately:

| Field | Result |
|---|---:|
| Unique binary-diff paths | 7 |
| Unique reachable blob versions across those paths | 8 |
| Raw binary bytes extracted | 2,765,149 |
| Printable bytes sent through Gitleaks stdin | 228,139 |
| Explicit printable encodings | ASCII, UTF-16LE, UTF-16BE; both UTF-16 byte alignments |
| Archive traversal (`max-archive-depth=3`) | clean |
| Printable-string scan | clean |

The seven path classes were one architecture PNG, one historical NUL-containing TypeScript path, two historical Python bytecode paths, and three application icon PNGs. The scan emits only counts and redacted Gitleaks output. It is run automatically by `tools/secret-scan.sh history`, including in CI and the installed pre-push hook.

This closes the observed binary bypass for printable ASCII, ASCII-range UTF-16LE/UTF-16BE credential strings, and archives Gitleaks can traverse to depth 3. It does not cover arbitrary encodings, split or deliberately obfuscated values, steganography, or unsupported/encrypted archives. Those remain accepted scanner limitations, not an assertion that arbitrary binary content is semantically safe.

### Semantic-scan limitation

This sweep is not named-entity recognition and cannot prove that every personal name or paraphrased private fact was found. It covers the known exposure classes, redaction diffs, anchored historical paths, note-ID syntax, absolute paths, and email-shaped literals. The filter-repo decision must use the known anchors plus any later human-reported class; a clean Gitleaks result must never be used as a semantic-content clearance.

## GitHub and release settings

The local `gh` account token is invalid, so GitHub push protection, repository security settings, and authenticated release-asset policy were **not verified**. This is an explicit open item, not a green result. The committed workflow is reviewable locally but cannot be claimed active until it lands on `main` and a GitHub run succeeds.

## Adjacent dependency observation

`npm ci` reported six total dependency advisories. A production-only `npm audit --omit=dev` reduced that to one transitive high-severity package: `hono@4.12.23` through `@modelcontextprotocol/sdk@1.29.0`, with a fix available. This was not changed in the secret-gate commit and is not part of Job B. It must be dispositioned separately before qualification; `npm audit fix` was deliberately not run.

## Gate status

- Job B, real reachable-history secret scan: **DONE and independently rerun on the Phase 2 branch**, including the separately enumerated binary/archive history; pending merge.
- Reachable-history semantic assessment: **DONE for the declared detectors**, with the limitation above.
- Prospective CI and pre-push protection: **IMPLEMENTED on the Phase 2 branch**, not yet proven by a GitHub run.
- Job C, filter-repo execute-or-defer: **DEFERRED-WITH-OWNER-AND-TRIGGER on 2026-07-12**; known history exposure is explicitly accepted until the recorded trigger.
- G1 overall: **OPEN** until the remaining GitHub-settings evidence is either verified or explicitly deferred with owner and trigger, and the first landed workflow run is green.
