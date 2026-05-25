---
item_id: "2026-05-25-070-echo-global-home-scaffold"
round: 3
reviewer: "codex"
artifact_sha: "2137c9cf268d68176a321847b4d25d603f2796e5"
completed_at: '2026-05-25T23:05:32Z'
verdict: "proceed_after_patches"
findings:
  - severity: "medium"
    where: "backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:157; backlog/ready/2026-05-25-070-echo-global-home-scaffold.md:193"
    finding: >-
      The r3 text now scopes `wx` correctly to concurrent name creation, but AC4 Test 3 still does not actually pin the AC2.2 `wx`/`EEXIST` handler. Pre-creating `state/onboarding.json` and asserting it remains untouched also passes under the explicitly forbidden check-then-write implementation, because that implementation observes the file and skips the absent-create call instead of ever receiving or handling `EEXIST`. That leaves the load-bearing concurrent-first-create exclusion untested. Patch either by adding a focused test that forces the absent-create write path to receive `EEXIST` and asserts success/no rewrite, or by softening line 193 to say Test 3 pins existing-file preservation while the literal `{ flag: 'wx' }` requirement is enforced by implementation review rather than by that unit test.
    cross_ref:
      round: 2
      reviewer: "codex"
      finding_index: 2
---

# Codex review

Verdict: `proceed_after_patches`.

The r3 durability scoping is now honest: `O_CREAT | O_EXCL` is treated as concurrent name-creation exclusion, not crash-atomic content publication, and deferring temp-file durable publish is reasonable for the dormant substrate phase.

One test-contract issue remains. The removed microtask race was the right deletion, but the replacement wording overclaims what Test 3 proves. A pre-existing-file preservation test does not force the implementation through the `writeFileSync(..., { flag: 'wx' })` loser path, so it would not catch a check-then-write implementation that AC2.2 explicitly forbids.
