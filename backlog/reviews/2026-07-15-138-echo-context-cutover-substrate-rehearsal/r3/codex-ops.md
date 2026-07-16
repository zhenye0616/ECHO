---
item_id: "2026-07-15-138-echo-context-cutover-substrate-rehearsal"
round: 3
reviewer: "codex-ops"
artifact_sha: "9c37bd8c9a2b7bc577269e0637f3e515de1da34a"
completed_at: '2026-07-16T03:06:17Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "AC1 — mutation-guard rejection evidence"
    finding: "A forbidden, symlinked, or unwritable `--root` must be rejected before filesystem mutation, yet AC1 requires every rejection record to be written under that same root. These requirements cannot both hold and can leave an unattended failure only on stderr. Define a separately supplied, prevalidated durable evidence sink within the authorized output boundary, require a redacted record and non-zero exit there, and test forbidden, symlinked, and unwritable roots."
  - severity: "medium"
    where: "AC1, AC5, and Tests — executable command contract"
    finding: "The spec names `rehearse --root` without its executable or package-script path, refers to candidate build/verify entrypoints only through `tools/**` globs, and describes the Codex render dry run only in prose. Name each exact command, working directory, output location, and exit contract; add named tests that inspect the extracted controller archive and reject alternate commands, live adapters, guard-disable flags, or environment bypasses."
  - severity: "medium"
    where: "AC5 and AC8 — remote preflight and landing race"
    finding: "The gate does not identify the fetched canonical remote ref, record its expected pre-landing SHA, or require a recheck at the landing mutation boundary. An upstream push after preflight can change the base or trigger retry/rebase behavior before post-landing readback detects the mismatch. Require a named gate that fetches and compares the expected remote SHA immediately before landing, forbids automatic rebase, autostash, force, or tree-changing retry behavior, aborts on change, and records tested race/mismatch results in AC8."
  - severity: "medium"
    where: "AC2 — old-plist authority-fence behavior"
    finding: "A stale plist using `KeepAlive` can repeatedly relaunch the fenced full daemon. Pre-open rejection prevents authority mutation but can still create an unattended restart storm with evidence only in transient launchd output. Require prepared/active transition ordering that neutralizes every old start job before committing the fence, durable rate-bounded rejection evidence, and a fake-launchd test proving repeated KeepAlive attempts terminate without looping."
  - severity: "medium"
    where: "AC3 — mirror collision and retry exhaustion"
    finding: "A differing-ID collision merely `stops`, and bounded retry has no required durable terminal state. The residual can remain healthy-looking while wait/search observations silently stop advancing. Persist collision or retry-exhaustion state plus the last error and watermark in canonical residual storage, expose it through existing status or health output, and test that the failure remains visible across restart."
---
