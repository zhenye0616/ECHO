# G3 demo freeze record - template

**Status:** unsealed template; not evidence
**Freeze deadline:** 2026-07-18 PDT
**Rule:** do not fill or seal until the founder chooses the demo shape

## Demo decision

- YC application: `[submit | defer]`
- Demo option: `[A | B | not applicable because deferred]`
- Old scene 1: `[cut | brief internal-leverage beat]`
- Decision artifact/SHA:
- Exact claim the demo is allowed to make:
- Claims explicitly excluded:

## Artifact identity

- Source repository:
- Main-ancestor source SHA:
- Package version:
- Tarball filename:
- Tarball SHA-256:
- Build command and operator:
- Build timestamp (PDT):
- Storage location (no secret URL in git):

## Demo runtime identity

- Machine identifier (nonsecret alias only):
- macOS version / architecture:
- Node version:
- `ECHO_HOME` alias/path classification:
- Database path classification:
- MCP port:
- launchd label:
- Log paths:
- Credential owners/types (names only, never values):
- Granola workspace/folder classification (never real names):

## Snapshot and configuration

- Database snapshot filename/location:
- Database snapshot SHA-256:
- State/checkpoint snapshot filename/location:
- State snapshot SHA-256:
- Plist export filename/location:
- Plist export SHA-256:
- Redacted env-key inventory filename/location:
- Env inventory SHA-256:
- Confirmation that no credential values entered git:

## Smoke

- Smoke timestamp:
- Command/runbook version:
- Meeting input classification:
- Expected visible output:
- Actual structural result:
- Health/doctor result:
- Operator verdict: `[pass | block]`
- Independent verifier:

## Rollback

- Pre-freeze rollback artifact/location:
- Rollback command/runbook:
- Rollback test timestamp:
- Restored artifact/state hashes:
- Post-rollback health result:
- Data-loss check:

## Seal

- Emergency-change owner:
- Backup owner:
- Support contact/availability window:
- Sealed by:
- Sealed timestamp:
- Prepared-against main SHA:
- Companion seal-record path (created only after this record is committed):
- Non-author completeness verdict:

To seal without a circular self-SHA: fill and commit this freeze record once (commit `F`), then create a separate companion seal record that names `F`, its tree/blob hash, the founder authorization, and the non-author verdict. Do not edit commit `F` after the companion record lands. Record emergency changes as dated addenda that reference both records.

## Emergency addendum template

- Timestamp:
- Incident/reason:
- Authorized by:
- Operator:
- Before source/artifact/state hashes:
- Change made:
- After source/artifact/state hashes:
- Smoke result:
- Rollback result:
- New freeze status:
