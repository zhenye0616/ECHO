---
item_id: 2026-06-13-102-orchestration-init-per-project
verdict: merge with founder fixups
reviewed_at: '2026-06-13T18:23:04Z'
test_counts:
  passed: 547
  failed: 1
producer: review-pending-orchestrator
---
## Verdict
The per-project orchestration-init vertical slice is well-built — typecheck and lint clean, all 547 tests across the four targeted suites (coord, cli/orchestration, echo-home, review-queue) pass including new side-ref reviewer, adversarial path-containment, and idempotency tests. Drift discipline is clean: src/cli/index.ts (+6, subcommand registration) and src/mcp/tools/coord-invoke.ts (+22, the AC3 path-validation decoupling) are legitimate integration points, not scope expansion. Two bounded, non-architectural fixups gate a clean merge: B1 (HIGH) — resolveCoordRequestPath realpaths the request file itself, throwing ENOENT before wrapper resolution and breaking pre-existing main test tests/cli/shell-reachable.test.ts:213, a real regression of the strategist active-trigger seam violating AC7 byte-stability; and B2 (MED) — the AC5/AC8 no-silent-misconfiguration fail-loud guardrail (non-default coord_ref but helper still targets default branch) is neither implemented as a cross-check nor tested. Not redo (core design sound), not merge-as-is (a green-on-main test now fails).

## Pre-merge fixups
- [ ] B1 (HIGH) — src/coord/paths.ts:154-162: stop requiring the request *file* to exist at invoke time. Keep realpath canonicalization of repoRoot and reviews_root (the symlink-escape defense AC3 needs) but resolve/contain the request path lexically (pathResolve + isWithin on the non-realpath'd path, or realpath only its existing ancestor dir) so a not-yet-written request.md validates. Then confirm tests/cli/shell-reachable.test.ts passes again and decide whether tests/coord/coord-request-fixture.ts is still needed (it likely becomes unnecessary). Restores AC7 byte-stable behavior on the coord_invoke seam.
- [ ] B2 (MED) — push-with-retry.sh / _run_reviewer.sh: add the AC5/AC8 fail-loud guardrail so a non-default coord_ref in .echo/project.json that resolves to the default branch exits loudly instead of silently defaulting to main, with a test asserting the loud exit. AC5 and AC8 both name this case explicitly; currently unimplemented and untested.

## Expected merge conflicts
- Low risk; expect a clean `merge --no-ff`. src/coord/paths.ts, src/mcp/tools/coord-invoke.ts, src/cli/index.ts, src/echo-home/paths.ts, and tools/review-queue/* are touched only by this branch's intended decoupling — main's versions are the regex/hardcoded `origin main` baselines this branch replaces wholesale; no competing in-flight item edits them (102 is head of the 102–105 decomposition).
- The only "conflict" is logical, not textual: until B1 is fixed, main's tests/cli/shell-reachable.test.ts will be red post-merge.

## Follow-up items (defer, do not block merge)
- Add a true parallel (Promise.all) two-writer race test for upsertProjectRegistration to complement the existing lock-timeout/no-truncation test (paths.test.ts:191); AC8 says "concurrent-upsert atomicity" and only sequential + lock-failure paths are currently exercised.
- Have the builder note the coord_invoke behavioral change in agent_notes for the record (it flagged the file touch but not that request-file existence became a precondition).
