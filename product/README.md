# echo-brain product boundary

`echo-brain` is the DEV-only package boundary for ECHO's Team meeting-to-brief wedge. It is private, unpublished, and not client-ready. A successful build, install, or offline selftest does not advance the candidate beyond DEV and does not prove that a real meeting ran.

## Local DEV artifact flow

Use the repository commands from a clean commit with Node 22.22.1:

```text
npm run product:check-boundary
npm run product:prepare-offline-deps -- --out-dir /absolute/path/to/support
npm run product:build-artifact -- --version 0.1.0-dev.1 --source-sha <HEAD> --out-dir /absolute/path/to/lineage
```

The artifact builder accepts one explicit prerelease version and source SHA, stages committed Git-object bytes, and refuses to overwrite a lineage. The support directory is separate from the product tarball. It contains only the exact-lock npm cache, matching Node headers, synthetic seed data, and hashed support/evidence scripts needed for offline verification.

The installed CLI exposes `validate-config`, `selftest`, and `run`. `selftest` is offline and reports the rank-3 production brain adapter as pending; it never claims the wedge executed. `run` fails closed until that adapter exists.

## Explicit inherited debt

This product-only boundary does not absorb, relabel, or waive generic `echoctl` and platform failures:

- Generic release-doctor omission of `tools/install-echo-codex-skills.sh` remains owned by the dev-platform package maintainer. It must be fixed before the next generic `echoctl` tag or the `echo-dev-platform` extraction, whichever comes first.
- Windows onboarding/validation `EBUSY` and filesystem-event failures remain owned by the platform maintainer. They must be green before any Windows product support claim. Phase 1 is macOS-only.
- The macOS Node 22 PID-lock/selftest race and Ubuntu Node 22 packaging-cleanup `ENOTEMPTY` race remain owned by QA. If either reproduces in the product qualification workflow, it is a blocking red cell, never a retry-based waiver.

`backlog/_followups.md` remains the owner of these generic-package debts. This package does not imply that the repository is globally green.

## Maturity and handoff

This item performs no tag, GitHub Release, package publication, protected-environment approval, client installation, real meeting, credential change, repository transition, or release authorization. The `echo-brain` repository does not exist, and no path outside this repository becomes authoritative.

The next gates remain, in order:

1. rank 2 first-run cutoff and newest-first behavior;
2. rank 3 API-key brain adapter;
3. V2 authentication probes and A2 cold-state grading;
4. exact-artifact isolated INTERNAL LIVE;
5. repository extraction and cutover before full qualification.

Only later evidence may advance `DEV -> INTERNAL LIVE -> QUALIFIED -> CLIENT LIVE`.
