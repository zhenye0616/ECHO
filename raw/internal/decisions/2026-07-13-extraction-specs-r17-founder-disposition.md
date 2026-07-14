# Extraction specs (133/134/135) — r17 founder disposition and convergence rule

**Date:** 2026-07-13 (22:20 PDT)
**Author:** strategist (Claude Code), drafted for founder review; loop paused by founder after r17
**Scope:** `backlog/proposed/2026-07-13-{133,134,135}-local-echo-*-source-extraction.md`

## Why the founder is dispositioning directly

Seventeen review rounds ran on the three extraction specs (two independent Codex bindings, codex + codex-ops). Round-over-round evidence shows the loop stopped converging:

- r7–r13: every finding dispositioned "patched," spec growth ~50%, finding count *rising* (13 findings at r13, zero convergent).
- r14: three-way pushback wall → "simplify to final-repo proof" removal reframe (−330 lines). Immediately produced the first zero-findings `proceed` (codex-ops, 133 r15).
- r15–r17: finding totals 28 → 40; severity re-inflated to HIGH; findings re-target the same AC5/AC7/AC8 verification-mechanics zones after each patch (sandbox effectiveness, Git envelope, cache-fill exactness, reviewer handoff — the AC8 handoff zone alone drew findings from 5 of 6 reviewer emissions at r17).
- One r17 pushback finding (add a non-Codex reviewer) is a process demand no spec edit can satisfy.
- 134's r15 combined and r17 pushback both cross the `{proceed*, pushback}` escalation boundary — this disposition is the protocol-required founder action, not an override.

Meanwhile a strategist cross-spec pass (import-graph analysis at pinned SHA `29713104`, machine-verified) found builder-wedging defects the per-item loop never raised in 17 rounds. Conclusion: the reviewer pair is a strong within-spec consistency checker and an unbounded verification-mechanics generator; convergence-by-zero-findings will not arrive. Disposition discipline (accept load-bearing, reject out-of-threat-model, prefer removal) closes the round instead.

## Disposition principles applied

1. **Threat model is settled (r14):** trusted, attended local build. Findings demanding kernel-level filesystem containment, per-phase sandbox coverage of first-party checkers, I/O flood caps, or per-command deadline/reap ceremony are **rejected** as process-containment infrastructure each spec's AC1 explicitly excludes.
2. **Internal contradictions are accepted** (launcher vs target ops, AC2 vs AC4 edge classes, state-graph missing its own recovery edge, Out-of-Scope contradicting AC1/AC8, non-executable reviewer rerun).
3. **Real races/durability gaps in load-bearing protocol are accepted minimally** (transport child vs APPLYING lease, candidate GC durability, ambiguous-push reconciliation, retry hot loop).
4. **Roster stands:** codex + codex-ops. The cursor binding was removed at r1 after a no-responses timeout; the demand to re-add a non-Codex reviewer is rejected on that recorded evidence. AC5's cross-vendor clause governs the extracted code, not this review's roster.

Full per-finding tables: each item's `backlog/reviews/<item>/r17/combined.md` (13 + 12 + 15 findings; 24 accepted full/minimal, 16 rejected).

## Cross-spec findings folded in (not reviewer-raised)

Per-item reviewers see one packet; none ran the three partitions against the actual import graph. The strategist pass did:

1. **135 closure gap (HIGH, fixed):** `src/guards.ts` (10 importers incl. core capture) and `tests/fixtures/` (5 shared modules, up to 18 importers) escaped the "exhaustive" 18 roots with no legal disposition path. Roots extended to 20; inventory recomputed and re-pinned: 217 paths (110 src / 107 tests), SHA-256 `8b0280660ea5eb64851a5ce0d1a9d56b707d6e29ce00d113ec6656b055d72d37` (independently reconstructed, matches). A third suspected escape (`util/subject.js`) was a false positive — a test's string-literal assertion, not an import; the real import resolves inside `src/util`.
2. **134 test-dependency reality (HIGH, fixed):** `tests/coord/` imports `src/mcp/server` (9 files) and `src/storage/memory` (18 files); `src/coord` imports capture/logging/echo-home/storage — all excluded capabilities. Spec now names these as `rewritten` lanes against echo-loop's own coord/stores; byte-identical preservation applies only where the import closure stays inside the policy roots.
3. **134 SQLite driver (HIGH, fixed):** repo dependency is `better-sqlite3` (native, install hook) but 134 forbade all hooks with no rebuild row. Spec now mirrors 135's contract: the pinned `npm rebuild better-sqlite3` workload row is the sole permitted lifecycle execution.
4. **133/135 enrich double-claim (MED, fixed):** `granola-signals.ts` + `post-meeting-brief.ts` sit in both 133's product closure and 135's roots; 135 now requires excluded-or-recorded-duplication, never a silent double claim.
5. **134 policy blob sealed:** `dd9d78abbbecf01d5de6ab7edbc8bace07e4f50a` / SHA-256 `44bef194b379b83185aab3f7055ce547c7a51a7b6df18764022a6f565cbde52a`; removed from builder-mutable scope.

Machine-verified while drafting: `/usr/local/bin/git` = 2.37.3, node = 22.22.1, npm-cli = 10.9.4 at pinned path, `Cellar/node@22/22.22.1_1` and `sandbox-exec` present.

## Convergence rule (the closure decision)

- **Option A (recommended):** dispatch one fenced r18 with focus_hints = "verify the r17 disposition patches only"; any finding outside the patched zones is auto-rejected with this document as rationale. Converged on any verdict; **no r19**.
- **Option B:** declare convergence now by founder authority (founder is a protocol-legitimate final reviewer).

Under either option the next pipeline step is: promote all three to `backlog/ready/` with fresh `ready_content_sha` (commit + push in the same action), then launch the three builders in parallel worktrees. Builders remain bound by each spec's Out-of-Scope; the three targets stay local-only, no-remote, DEV, `authority:false`.

## Process lesson filed

A review loop whose only stop condition is verdict-boundary crossing cannot terminate against reviewers that generate novel mechanism findings each round; and per-item review structurally cannot see partition/closure defects across sibling specs. Follow-ups worth separate backlog items: (a) round-count/finding-trend circuit breaker in `review-queue-watch`; (b) a cross-spec consistency round (the `backlog/reviews/cross-spec/` mechanism, last used for 070–072) as a standard gate whenever sibling specs partition one codebase.
