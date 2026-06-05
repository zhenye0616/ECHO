---
item_id: "2026-06-05-091-upstream-windows-compat-fixes"
round: 1
reviewer: "codex-ops"
artifact_sha: "c37ef06bc2e5b5877a2b2f419a34e74e874d24c4"
completed_at: '2026-06-05T20:11:22Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "AC2 — R1 (separators)"
    finding: "The spec only requires separator normalization before startsWith-style prefix checks. On Windows that can still fail valid captures when drive/path casing differs, and can still accept sibling prefixes such as C:\\foo matching C:\\foobar. Patch AC2 and its tests to require path-component-aware normalization for filesystem paths, including Windows case-folding and a boundary check, while keeping logical coord: prefixes untouched."
  - severity: "medium"
    where: "files_to_modify / AC4 — no-launchctl false-fail + Windows data dir"
    finding: "AC4 requires daemon autostart/doctor not to call launchctl on Windows, but the only listed AC4 implementation file is src/daemon/lifecycle.ts, which covers data-dir resolution rather than the launchctl caller or doctor/autostart reporting path. Patch the spec to name the actual launchctl/doctor files and spec_refs, plus the no-launchctl Windows test target, so the unattended Windows selftest cannot still false-fail after the data-dir fix lands."
---
