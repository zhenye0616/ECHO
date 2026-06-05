---
item_id: "2026-06-05-091-upstream-windows-compat-fixes"
round: 1
reviewer: "codex"
artifact_sha: "c37ef06bc2e5b5877a2b2f419a34e74e874d24c4"
completed_at: '2026-06-05T20:10:47Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC4 and files_to_modify"
    finding: "AC4 requires daemon autostart/doctor to avoid launchctl on Windows, but the allowed files only include src/daemon/lifecycle.ts for data-dir resolution and do not identify or allow the doctor/autostart implementation paths. Patch the spec to add the concrete launchctl/doctor source files and corresponding test paths to files_to_modify/spec_refs, or split the no-launchctl requirement out of this item."
  - severity: "medium"
    where: "AC5"
    finding: "AC5 says echo-fix is retired from the normal build/release path, but the spec does not name any build, release, CI, or package-script files to inspect or change, and it gives no falsifiable verification command. Patch AC5 to list the exact release-path files that may be modified or explicitly make this a verification-only AC with a concrete command that proves echo-fix is not referenced by normal build/release steps."
  - severity: "medium"
    where: "AC3 and tests/util/subprocess.test.ts"
    finding: "The subprocess resolver test must simulate Windows PATHEXT behavior, but the spec does not define an injectable platform/env/fs seam for src/util/subprocess.ts. Patch AC3 to specify the resolver API or dependency shape used by tests, so the Windows .cmd lookup can be tested on non-Windows hosts without monkey-patching process.platform or depending on the host PATH."
---
