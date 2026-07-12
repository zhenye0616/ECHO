# GitHub security and release settings - read-only audit

**Date:** 2026-07-12 13:05 PDT
**Repository:** `zhenye0616/ECHO`
**Repository main SHA:** `f77ba415fd6848fbb52586dc0ca4ada522097bac`
**Phase 2 audit input SHA:** `9b356167d3d4ad8e274aa3804bd6127e0d0d09dc`
**Authenticated account:** `zhenye0616`
**Mode:** read-only; no repository setting, ref, release, workflow, or asset was changed
**Verdict:** VERIFIED RED - evidence is complete, remediation or explicit risk disposition is not

## Plain-English result

GitHub authentication works and the repository settings are now observable. The result is not green. GitHub's native secret scanning and secret push protection are disabled; `main` has no branch protection or ruleset; repository Actions permit any action without enforced SHA pinning; vulnerability alerts and automated fixes are disabled; the production environment has no protection rules; and the existing release is mutable.

The existing beta tarball itself is internally consistent: its downloaded SHA-256 matches both GitHub's asset digest and the uploaded `.sha256` file. That validates the bytes currently hosted, not the policy controlling future releases.

## Observed settings

| Control | Read-only result | Interpretation |
|---|---|---|
| Repository visibility/default | public; `main` | Canonical history and releases are publicly readable |
| GitHub secret scanning | disabled | No GitHub-native repository history/content scanning |
| Secret push protection | disabled | GitHub will not block recognized secrets at push time |
| Non-provider patterns / validity checks | disabled | Additional GitHub secret detectors are not active |
| Open secret-alert query | unavailable because secret scanning is disabled | This is not evidence of zero alerts |
| Dependabot vulnerability alerts | disabled | Dependency alerts are not available |
| Dependabot security updates | disabled | No automatic security-update PRs |
| Automated security fixes | disabled | No automatic fix path |
| Code scanning | no analysis found | No GitHub code-scanning result exists |
| Private vulnerability reporting | disabled | No private reporting channel through GitHub |
| `main` branch protection | absent (`Branch not protected`) | Direct/unreviewed updates are not blocked by branch protection |
| Repository rulesets | none | No branch or tag ruleset is active |
| Actions policy | enabled; `allowed_actions=all`; `sha_pinning_required=false` | Third-party actions are allowed and immutable pins are not enforced |
| Default workflow token | read; cannot approve PR reviews | Good least-privilege default |
| Production environment | exists; zero protection rules | Release jobs are not protected by environment approval rules |
| Active workflows on main | `ci`, `release` | Phase 2 `secret-scan` is not active until it lands |
| Existing workflow action references | floating `@v4` tags in `ci` and `release` | Current main workflows are not immutably pinned |
| Existing release | `v0.1.0-beta.1`; prerelease; `immutable=false` | Release assets can still be changed or removed under current policy |
| Release/tag rules | no repository ruleset | No observed rule protects the release tag |

## Release-asset integrity check

The read-only audit downloaded the two public assets for `v0.1.0-beta.1` to a temporary directory and deleted the directory after comparison.

| Field | Value |
|---|---|
| Release tag commit | `1cee7ecdad28714c997e4ec988795b6f73968304` |
| Tarball | `echoctl-0.1.0-beta.1.tgz` |
| Computed SHA-256 | `d62b1ec9c7dbbb4b90891b4cbef953b3bcbe27cc938c5653c7f6c5b356179a8d` |
| GitHub asset digest | `sha256:d62b1ec9c7dbbb4b90891b4cbef953b3bcbe27cc938c5653c7f6c5b356179a8d` |
| Uploaded checksum value | `d62b1ec9c7dbbb4b90891b4cbef953b3bcbe27cc938c5653c7f6c5b356179a8d` |
| Comparison | all three match |

The release workflow builds once, validates the downloaded artifact on Ubuntu/macOS/Windows, verifies its checksum, and publishes only for `v*` tags. However, it uses floating action tags, has no protected environment, and publishes a mutable release. The valid current checksum does not remove those prospective policy risks.

## Evidence commands

Read-only GitHub API and CLI calls covered:

- authenticated user and repository metadata;
- `security_and_analysis` settings;
- `main` branch protection and repository rulesets;
- Actions policy and default workflow-token permissions;
- secret-scanning, Dependabot, vulnerability-alert, automated-fix, and code-scanning endpoints;
- private vulnerability reporting;
- environment protection;
- active workflows, tags, releases, and release assets;
- temporary `gh release download` plus local SHA-256 comparison.

No `PATCH`, `PUT`, `POST`, or `DELETE` GitHub API call was made. No git push, release creation, asset upload, tag mutation, or settings write occurred.

## Gate effect

The GitHub-settings evidence portion of A6/G1 is now **verified**, but it is verified red. A6 remains `pending`. Before it can become terminal, the founder must either:

1. authorize and complete remediation, then rerun this audit; or
2. explicitly accept/defer each red control with an owner and objective trigger.

The first successful GitHub run of the Phase 2 `secret-scan` workflow also remains pending because the workflow has not landed on `main`.

## Recommended remediation order

1. Enable GitHub secret scanning and secret push protection.
2. Enable vulnerability alerts, Dependabot security updates, and automated security fixes.
3. Add a `main` ruleset requiring pull requests and the selected CI checks; add an appropriate tag rule for releases.
4. Pin every action in `ci.yml` and `release.yml` to immutable commit SHAs, then enforce repository SHA pinning/restrict allowed actions.
5. Protect the production environment and route the release publish job through it.
6. Enable immutable releases for future releases and confirm the policy with a fresh read-only audit.

These are recommendations only. This audit made no changes.

## First Phase 2 branch run

After the audited branch was pushed with explicit founder approval, GitHub ran `secret-scan` at exact head `10d01db44efa33663349bf5adf5bd2dd7084ca46`. [Run 29207214563](https://github.com/zhenye0616/ECHO/actions/runs/29207214563) completed successfully in 17 seconds; checkout, setup-node, full ref fetch, pinned Gitleaks install, and the text-plus-binary history scan all passed.

GitHub emitted one maintenance annotation: the pinned `actions/checkout` v4 and `actions/setup-node` v4 commits target the deprecated Node 20 action runtime, so GitHub forced those action implementations onto Node 24. This did not fail the scan, but the action pins need an explicit version-upgrade review rather than silent drift.

The green branch run proves the workflow executes remotely. It is not yet an active `main` control; a post-merge `main` run remains required.
