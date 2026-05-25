---
item_id: "2026-05-25-070-echo-global-home-scaffold"
round: 2
reviewer: "codex"
artifact_sha: "1c5488d26e6f06501a833069c10c4c1c1e1c5552"
completed_at: '2026-05-25T22:53:37Z'
verdict: "proceed_after_patches"
findings:
  - severity: "high"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157"
    finding: >-
      AC2.2 still does not eliminate the durable partial-write failure from r1. `writeFileSync(path, json, { flag: 'wx' })` maps to exclusive create, so it prevents two creators from overwriting each other, but it does not make the create+write crash-atomic: a SIGKILL or I/O failure after open(O_EXCL) and before the full payload is written can leave an empty or truncated final JSON file, and the same paragraph requires future starts to treat any existing file as a successful no-op. Patch the spec to either stop promising interrupted-write safety, or require a real no-overwrite durable pattern such as temp file in the same directory, full write/fsync, atomic `linkSync(tmp, final)` with EEXIST as the loser path, then unlink the temp file. The current wording says "at worst the file does not exist," which is not guaranteed by Node or the OS.
    cross_ref:
      round: 1
      reviewer: "codex"
      finding_index: 3
  - severity: "medium"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:194"
    finding: >-
      AC4 Test 4 does not actually exercise a concurrent first-create race or force the implementation through the EEXIST loser branch. `Promise.resolve().then(() => ensureEchoHome())` schedules callbacks as microtasks, but each `ensureEchoHome()` call is synchronous, so one call runs to completion before the next starts. A check-then-write implementation could still pass this test because the second call simply observes already-created files. To pin the AC2.2 contract, use a real multi-process/worker-thread race with a shared ECHO_HOME and start barrier, or add a focused unit test that makes the absent-create write throw EEXIST and asserts it is handled as success without reading or rewriting.
    cross_ref:
      round: 1
      reviewer: "codex-ops"
      finding_index: 1
  - severity: "low"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:190-245"
    finding: >-
      The r2 AC4 list now has three `paths.test.ts` cases plus four `scaffold.test.ts` cases, but the Tests section still says `scaffold.test.ts` has three cases and Definition of Done still says "All six new test cases pass." Patch those counts to four scaffold cases and seven total cases so the builder does not have contradictory completion targets.
---

# Codex review

Verdict: proceed_after_patches.

The r1 patches for the Ajv import allowlist, the fresh tmpdir setup, and the task-state pointer are present at the pinned SHA. The remaining issue is the state-file creation contract: the spec now names `wx`, but it still claims stronger crash-safety than `open(O_EXCL)+write` provides, and the new test does not actually create same-file concurrency for a synchronous function.

## Findings

1. HIGH - AC2.2 still does not eliminate durable partial writes. `wx` gives exclusive creation, not crash-atomic population of the final file. If the process dies after opening the final path and before the full JSON payload is written, the next daemon start must preserve that malformed file forever under the current absent-only rule. Either weaken the durability claim or specify a real no-overwrite durable pattern such as write/fsync temp + `linkSync(tmp, final)` + unlink temp.

2. MEDIUM - AC4 Test 4 serializes both calls on the JS microtask queue. Because `ensureEchoHome()` is synchronous, the first callback completes before the second begins, so the test does not prove an EEXIST loser path and would not catch check-then-write. Use worker threads/processes with a start barrier, or a focused test that injects EEXIST from the absent-create call.

3. LOW - The test counts are stale: AC4 now defines seven total cases, but the Tests and Definition of Done sections still say three scaffold cases / six total cases.
