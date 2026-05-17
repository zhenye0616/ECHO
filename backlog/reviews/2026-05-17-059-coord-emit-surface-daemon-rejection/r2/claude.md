---
item_id: "2026-05-17-059-coord-emit-surface-daemon-rejection"
round: 2
reviewer: "claude"
artifact_sha: "033867c"
completed_at: '2026-05-17T07:59:12Z'
verdict: "proceed"
findings: []
---

# Claude review — conceptual / architectural / drift lens (r2)

Verdict: `proceed`. No new findings.

**Spec-shape after r1 patches is clean.** The `## Tests` section now sits between `## Risks` and `## Definition of Done` (codex F1 disposition), pins three cases by file path + assertion set + no-regression invariants, and explicitly enumerates out-of-scope-for-tests adjacencies. AC3's heading is now "Three new test cases" matching the locked AC1 three-branch state table. Definition of Done re-itemizes against the three locked branches (rejection / HTTP non-2xx / unreachable) plus the diff-stat scope gate from AC2. Cross-checking against the focus_hints in r1 combined.md:

- ✅ Tests section is well-formed and matches AC1/AC3.
- ✅ Port-0-bind-close pattern: `pickClosedPort()` helper is inlined in AC3 with TOCTOU window documented as millisecond-order, negligible in unit-test harness.
- ✅ Test (iii) uses an in-process `node:http` fixture explicitly NOT the MCP daemon; teardown via `afterEach` mirrors the existing `startMcpServer({port: 0})` pattern.
- ✅ 500-char truncation is the single shape, asserted in both AC1 parsing-constraint and R1 risk mitigation; no body-dump fallback anywhere in the spec.
- ✅ Out of Scope #11 names the concrete candidate callsites the strategist drift-prevention pattern asks for (`coord_invoke`, `push-with-retry.sh`, scheduler-tier emitters in `_run_reviewer.sh`).
- ✅ Definition of Done's three bullets align 1:1 with AC1 branches + AC2 caller-prose-unchanged + AC3 three test cases.

**No V1 / form-factor / cohort drift through the r1 patches.** The patches all *tightened* dispositions (locked the silent-on-unreachable branch, locked the truncation contract, added the parallel-wrapper-edit gate) rather than expanded mechanism. This is the disposition-discipline shape from `skills/review-queue-watch.md` — prefer removal/locking over deeper patching. R1 didn't drift into "while we're patching, let's also surface rejection to coord_status" or "let's also retrofit an opt-in verbose env flag"; those temptations are now affirmatively forbidden in Out of Scope #7 + #9 rather than left as choose-your-own-adventure. Good discipline.

**Architectural invariant still holds.** Exit-0-unconditional is re-asserted in AC1's exit-status-unchanged clause, in Out of Scope #1, and in the Definition of Done's per-branch wording. The locked load-bearing contract from 057b r1 codex-ops F2 HIGH is preserved bit-exact; the additive observability change does not touch the queue-durability invariant.

**Cross-item coherence preserved.** The "wrapper-side twin of 057-era launchd silent-fail" framing remains the right conceptual hook — it names the *class* of issue without prematurely abstracting it into a `wiki/principles/` page. After-Completion's "second spec is the trigger" rule for the silent-failure-class principle is unchanged through the patches, and Out of Scope #11 reinforces it by naming the concrete sites where the second-spec trigger would land.

**No new ECHO-domain wisdom violated.** The drift-prevention five-question test passes cleanly. No new layer (still L1/L3-adjacent infra), no new surface (wrapper stderr only), no cohort assumption (substrate, cohort-independent), no shipped wiki page touched. The After-Completion section continues to resist the temptation to promote a `wiki/principles/silent-failure-observability.md` page; the optional one-liner in `wiki/architecture/coord-active-trigger-and-role-emission.md` is correctly framed as "land only if a natural insertion point exists, don't restructure to make room."

**Why proceed (not proceed_after_patches).** R1 closed both explicit reviewer-disposition decision points (unreachable-branch posture; parsing-fallback shape) into single contracts. The r2 spec is no longer a choose-your-own-adventure; the builder lands one shape. The three reviewer lenses had complementary coverage in r1 (codex on shape + portability; codex-ops on runtime branches; claude on drift adjacencies); all seven findings dispositioned to "accepted — patched" with the patches now landed in 033867c. Nothing in the r2 artifact triggers a conceptual concern that wasn't already raised and closed in r1, and no patch in r1 introduced a new mechanism that warrants its own r2 finding.

**No overlap concerns with codex / codex-ops.** Implementability of the bash parsing pipeline (codex's lane) and runtime-branch shape under launchd (codex-ops's lane) are independently verifiable; my conceptual pass would not displace either of those reviews. If codex or codex-ops finds remaining implementability or runtime concerns in r2, those stand on their own; my proceed does not preclude them.
