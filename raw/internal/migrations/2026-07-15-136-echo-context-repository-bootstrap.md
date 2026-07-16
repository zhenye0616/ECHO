# Echo-context canonical-repository bootstrap and source-release evidence

Date: 2026-07-16 PDT
Item: `2026-07-15-136-echo-context-canonical-repository-release-substrate`
Builder: `codex-builder-136-20260716`
Status: builder evidence in progress; no repository creation, target-main push, release, installation, or authority transfer is claimed by this record

## Reviewed contract binding

- Reviewed specification commit: `f130ba6fd89bd598a06e7603b700fb0f66c6dd54`
- Ready content seal: `42d2d266660453fc204b6cd3ddaed3b41768c410e1e007ebca9465e60022833e`
- Project_echo claim commit: `c6e97f683e3456df531b8ee1fcbbe59aa620bffb`
- Canonical target URL: `https://github.com/zhenye0616/echo-context`
- Accepted extraction baseline commit: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb`
- Accepted extraction baseline tree: `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`
- Accepted extraction tracked-path count: `190`
- Item-135 migration record SHA-256: `eed83d4ad6d6706a3b2b1a454716f4344016481ba6108257b9f46f9055b0cc28`
- Item-135 independent-review record: `raw/internal/migrations/2026-07-13-135-echo-context-review.md`
- Personal-account hosting under `zhenye0616` is the reviewed initial deviation from the earlier organization-repository shape. A later transfer remains separately gated.

## Pre-publication scanner contract

The baseline does not contain successor files. Before the exact-baseline bootstrap, the builder prepared the final successor contract bytes off-repository and used those exact bytes for the scan. The future tracked file `tools/secret-scan-contract.json` must be byte-identical to this staged object; any different digest invalidates this bootstrap evidence and blocks publication.

- Contract schema: `secret-scan-contract.v1`
- Scanner: `gitleaks`
- Scanner version: `8.30.1`
- Staged contract size: `946` bytes
- Staged/future-committed contract SHA-256: `b186d99d61f774a6fbf6f16849c7aeb21618d90f79d3f7da4398d88d95925453`
- Configuration: Gitleaks 8.30.1 embedded default rules; no external configuration file
- Exact argv template: `gitleaks detect --source . --log-opts=--all --redact=100 --no-banner --no-color --report-format json --report-path <temporary-report>`
- Accepted report projection: sanitized `File` and `RuleID` only; never a secret value

### Official release and binary provenance

Authenticated GitHub API readback named `gitleaks/gitleaks` release ID `299662760`, tag `v8.30.1`, author `zricethezav`, published at `2026-03-21T02:17:58Z`. GitHub reported `immutable:false`, so every consumed asset is pinned by stable asset ID, size, authenticated metadata digest, the official checksum-file row, and independently computed downloaded bytes. The official checksum asset is ID `378333193`, size `999`, SHA-256 `061476c21adaf5441516f96f185c1a4706a83cd6329b9b38762271b3d4a52fae`.

| Platform | Asset ID | Archive SHA-256 (API = checksum row = downloaded bytes) | Extracted binary SHA-256 |
|---|---:|---|---|
| Darwin arm64 | 378332059 | `b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5` | `ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f` |
| Darwin x64 | 378332053 | `dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709` | `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291` |
| Linux arm64 | 378332057 | `e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080` | `00e91bbe655bd7c47753e8cfe61cb76ea1a5d7e7702fe161ee40102b46b3823b` |
| Linux x64 | 378332058 | `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` | `88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509` |

## Exact-baseline pre-push proof

- Scan started: `2026-07-16T08:39:25Z`
- Scan finished: `2026-07-16T08:39:26Z`
- Working repository: `/Users/zhenye/Desktop/echo-context`
- HEAD/tree: `0cf7b006eba665c0bf55e82ff04da70f19f01ebb` / `70c5cf8352652b3c4c1dce68cd1a5e40d44e4b05`
- Status: clean, including nonignored untracked paths
- Shallow repository: `false`
- `git fsck --full`: exit `0`, no findings
- Reachable namespace: exactly `refs/heads/migration/2026-07-13-135=0cf7b006eba665c0bf55e82ff04da70f19f01ebb`
- Reachable commits: `35`
- Scanner binary: official Darwin-x64 release binary, SHA-256 `cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291`
- Scanner exit: `0`
- Sanitized finding count: `0`
- Sanitized path/rule finding set: empty
- Scanner stdout SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty)
- Redacted informational stderr SHA-256: `d9b1e5342d267580664f757bd5de5dc2eca8fcbc9b755ad6b33f9f19a818af2d`

This evidence permits only the separately authorized create-only empty-repository bootstrap of the exact extraction baseline. It does not authorize a successor-byte push, target-main merge, release, installation, or runtime/state mutation.

## Builder implementation identities

- Project_echo feature branch: `agent/echo-context-canonical-repository-release-substrate`
- Project_echo feature HEAD: pending
- Echo-context feature branch: `agent/echo-context-canonical-repository-release-substrate`
- Echo-context feature HEAD/tree: pending
- Canonical echo-context landed main HEAD/tree: pending independent review and delegated authorization
- Canonical Project_echo landed main HEAD/tree: pending independent review and delegated authorization

## Source artifact and release identities

- Version: `0.1.0-dev.136.1` (reviewed target; pending landed-byte readback)
- Source SHA/tree: pending canonical target-main landing
- Lock hash: pending canonical target-main landing
- Source-archive SHA-256: pending build-once release gate
- Manifest hash: pending build-once release gate
- Workflow run ID: pending
- Workflow artifact ID: pending platform allocation
- Workflow-artifact digest: pending exact-ID raw-ZIP readback
- Tag name/tag-object OID: pending separately authorized release operation
- Release ID: pending platform allocation
- Asset IDs: pending platform allocation

No artifact is built or released by this builder record. Exact-artifact fields are populated only from the later fresh detached clone and protected build-once workflow after canonical landing.

## Authority boundary

- Source authority after successful canonical landing: `echo-context/main`
- Source-artifact authority after successful private prerelease: versioned source artifact only
- Runtime authority: `false`
- State authority: `false`
- Installed: `false`
- Maturity: `DEV`
- Active daemon, live state, client endpoint, and rollback authority remain in Project_echo.
