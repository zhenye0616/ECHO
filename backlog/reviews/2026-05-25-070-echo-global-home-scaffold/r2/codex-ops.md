---
item_id: "2026-05-25-070-echo-global-home-scaffold"
round: 2
reviewer: "codex-ops"
artifact_sha: "1c5488d26e6f06501a833069c10c4c1c1e1c5552"
completed_at: '2026-05-25T22:57:43Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:155-160; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-195"
    finding: >-
      AC2 still claims `writeFileSync(path, json, { flag: 'wx' })` eliminates durable partial-state files because the inode is not visible until the payload is fully written. That is not an OS guarantee: `O_CREAT|O_EXCL` makes name creation atomic, but a crash, kill, ENOSPC, or short write after the exclusive open can still leave an empty or truncated `onboarding.json`/`projects.json` at the final path. Because the same AC requires later calls to treat any `EEXIST` as a successful no-op and not read/validate/repair the file, one unlucky first boot can permanently poison `~/.echo/state/*.json` and future daemon/CLI starts will silently skip recovery. Patch the absent-only durability contract to use a same-directory temp file plus atomic no-overwrite link into the final path (or another no-clobber publish primitive) and cleanup of orphan temps, then add a test that simulates an existing malformed/truncated final file or failed first create and requires an observable recovery/error path instead of silent success.
  - severity: "low"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157-158; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-195; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:224-245"
    finding: >-
      The concurrent-first-create test still models two synchronous calls scheduled on the JS microtask queue, so it does not exercise a real interprocess race; meanwhile the spec expects exactly one call to report `created_files.length === 2` and the other `0`. In production, two independent callers sharing `ECHO_HOME` can interleave per file, so one process may create `onboarding.json` while the other creates `projects.json`; both files are valid, but the result arrays split `1/1` and any future code or operational log that treats `2/0` as the only valid initialization shape will mislead the operator. Patch the contract/test to assert per-file uniqueness and valid final contents rather than single-winner ownership, and fix the Tests/DoD counts so the new race test cannot be accidentally omitted (`scaffold.test.ts` now has four cases; total new cases are seven, not six).
---

# codex-ops review

Verdict: `proceed_after_patches`.

The r2 patches improve the scaffold spec, especially the absent-only `EEXIST` behavior, but the durable-write claim is still stronger than what `wx` actually guarantees. The remaining patches should make crash recovery explicit and avoid treating a single JS microtask test as proof of production interprocess behavior.
