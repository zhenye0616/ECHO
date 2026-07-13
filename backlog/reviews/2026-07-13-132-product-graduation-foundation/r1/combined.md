---
item_id: 2026-07-13-132-product-graduation-foundation
round: 1
combined_at: '2026-07-13T09:18:43Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: 291870c32b33bb085504a20ac09cb22ed74a183c
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings


## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | AC1 and files_to_modify | accepted — patched | 291870c3 — AC1 now requires closure-inventory-first (fence run against proposed allowlist before code), STOP-and-escalate to pending_review on any edge no authorized seam absorbs, allowlist shrink-only without re-review |
| 2 | MEDIUM | codex | AC2 filesystem-type probe | accepted — patched (merged with #8) | 291870c3 — probe is now an injectable `classifyStateFilesystem` adapter: absolute-path `/sbin/mount`, LC_ALL=C, bounded timeout, realpath closest-ancestor + longest mount-prefix match, explicit normalization table, unknown = fail-closed for run, per-class fixtures, no real `mount` in tests |
| 3 | MEDIUM | codex | AC3 compatibility tests | accepted — patched | 291870c3 — AC3 + Tests add a dispatch-level composition spy on `createLabGranolaSignalOptions(env)` proving env→brain mapping, preflight, prompt/parser options, timeout, no-fallback unchanged |
| 4 | HIGH | codex | AC4 and AC7 workflow triggers | accepted — patched (merged with #12) | 291870c3 — ci.yml quality job now runs `test:product` unconditionally (no path filter); AC7 path filters demoted to cost optimization, not coverage guarantee |
| 5 | MEDIUM | codex | AC4 hermetic setupFiles guard | accepted — patched (merged with #10) | 291870c3 — guard scope made honest: enumerated in-worker interceptions (fetch, net.Socket.connect, tls.connect, http/https request), injected-clock discipline, explicit child-process env contract + sentinel child test instead of an impossible in-worker child guard |
| 6 | HIGH | codex | AC5 and AC7 offline native installation | accepted — patched (merged with #11) | 291870c3 — single pinned strategy: build-from-source + bundled exact Node 22 headers via npm_config_nodedir (hashed in support manifest), toolchain preflight, any prebuild/header fetch attempt fails the test |
| 7 | HIGH | codex | AC1 closure output and AC5 build-artifact.mjs | accepted — patched (merged with #14) | 291870c3 — builder requires --out-dir, verifies HEAD == supplied SHA, clean tree incl. untracked, temp-sibling build + atomic rename onto absent lineage dir |
| 8 | MEDIUM | codex-ops | AC2 — filesystem probe executable semantics | accepted — patched | 291870c3 — same patch as #2 |
| 9 | MEDIUM | codex-ops | AC2 — partial-startup/termination lifecycle | accepted — patched | 291870c3 — AC2 now requires transactional startup with reverse-order rollback, idempotent deadline-bounded shutdown, SIGINT/SIGTERM wiring, nonzero exit propagation; runtime-isolation tests inject failure after each component start |
| 10 | MEDIUM | codex-ops | AC4/AC5 — child processes escape setupFiles guard | accepted — patched | 291870c3 — same patch as #5 (sanitized child env contract + sentinel child test) |
| 11 | MEDIUM | codex-ops | AC5 — node-gyp header fetch breaks offline install | accepted — patched | 291870c3 — same patch as #6 |
| 12 | MEDIUM | codex-ops | AC4/AC7 — path-filter trigger contract | accepted — patched | 291870c3 — same patch as #4 |
| 13 | MEDIUM | codex-ops | AC7 — evidence upload skipped on failure | accepted — patched | 291870c3 — bounded job/child timeouts; evidence collection/upload `if: always()`; aggregation runs on failed deps recording explicit red cells while workflow conclusion stays failing |
| 14 | MEDIUM | codex-ops | AC5/AC7 — source SHA vs synthetic merge ref | accepted — patched | 291870c3 — same patch as #7 plus AC7 exact-head checkout semantics (PR head SHA / github.sha, never merge ref) and SHA propagation unchanged through manifests/reports/names |

## Convergence call

needs R2 — focus_hints: verify the r1 patch set at 291870c3 (all 14 findings accepted-with-patch; round 1, so no reframe gate). Load-bearing checks: (1) AC1 closure-inventory-first + STOP-and-escalate — does it actually resolve the builder deadlock, or does the fixed allowlist still make implementation impossible without amendment? (2) AC2 probe adapter — is the /sbin/mount + normalization-table contract falsifiable and fixture-testable as written? unknown=fail-closed for run: acceptable for phase-1 APFS/HFS-only targets? (3) AC4 unconditional test:product in ci.yml — does this fully retire the trigger-contract concern, and is the double-run cost acceptable? (4) AC4 guard honesty — enumerated in-worker interceptions + child env contract + sentinel child test: any remaining escape that matters at rank 1? (5) AC5 single native strategy (bundled Node 22 headers + nodedir + build-from-source + toolchain preflight) — complete offline closure for better-sqlite3 on the macOS runner, or is a header-set/compiler mismatch still possible? (6) AC5/AC7 builder identity (HEAD==SHA, clean+untracked, atomic lineage rename) + exact-head checkout — any residual way one commit's bytes carry another's SHA? (7) AC2 transactional startup/rollback + AC7 if:always() evidence/aggregation red cells — internally consistent with the workflow-fails-on-red-cell rule?

