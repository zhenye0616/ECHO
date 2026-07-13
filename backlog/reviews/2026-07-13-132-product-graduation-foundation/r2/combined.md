---
item_id: 2026-07-13-132-product-graduation-foundation
round: 2
combined_at: '2026-07-13T09:29:39Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: a532c695f78d130b61214db28e5a4220244bda64
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
Reframe gate: all 12 findings target r1-patch mechanisms (sole prior patch commit 291870c3), so the mandatory fresh-context investigator ran (codex exec read-only). Verdict: `propagation_completion` — the r1 mechanisms implement accepted load-bearing rank-1 invariants; r2 exposes missing producer/enforcement/timeout/identity/terminal-gate edges, and removal would reopen r1 findings. Diagnostic check passed: reviewed spec blob identical at 291870c3 and request-pinned 41d2f17d (blob a8248d65). Strategist validation applied two nuances: row 1 is fixed by a corrective reorder of the r1 ordering bug (two-phase inventory — simpler, not deeper), and rows 5/7 are fixed by REMOVING the check-then-use cleanliness mechanism in favor of staging from Git objects at the SHA (bytes bound by construction). No finding warranted structural cut of an r1 invariant.

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC1 — Closure inventory comes first | accepted — patched (corrective reorder) | a532c695 — inventory is now two-phase: seed-module inventory before composition; real fence run immediately after minimal entry points + check-boundary.mjs exist, before remaining ACs; STOP-and-escalate and shrink-only retained |
| 2 | MEDIUM | codex | AC2 — classifyStateFilesystem production adapter | accepted — patched (merged with #9) | a532c695 — exact token set (nfs/smbfs/afpfs/webdav vs apfs/hfs), 2000 ms timeout, octal-escape mount parsing, path-component-aware exact-or-descendant matching with root fallback, fixtures incl. escapes/malformed/prefix-collision |
| 3 | MEDIUM | codex | AC4 hermetic guard enforcement | accepted — patched (merged with #10) | a532c695 — single named spawnSanitizedChild helper; in-worker child_process.{spawn,exec,execFile,fork} interception fails non-helper launches; blocklist extended to http2/dgram/dns; claim scope stated honestly; red fixtures for both escape paths |
| 4 | MEDIUM | codex | AC4/AC5 — offline inputs producer unspecified | accepted — patched (merged with #11) | a532c695 — tools/product/prepare-offline-deps.mjs is the single producer (cache + headers + hashed manifest); ci.yml quality job invokes it before unconditional test:product; full Node 22.x.y pin for headers and runtime |
| 5 | HIGH | codex | AC5 — build-artifact source identity | accepted — patched via mechanism removal (merged with #7) | a532c695 — cleanliness check-then-use dropped; staging tree materialized from Git objects at the supplied SHA; red tests: ignored file under allowed path never enters artifact; post-preflight mutation cannot change packed bytes |
| 6 | MEDIUM | codex | AC7 — terminal gate vs report validity | accepted — patched (merged with #12) | a532c695 — final always-running terminal gate exits nonzero on any implemented red cell/timeout/missing evidence/identity mismatch/unexpected skip after if:always() uploads; workflow-contract fixture for the forced-failure path |
| 7 | HIGH | codex-ops | AC5 — TOCTOU between preflight and pack | accepted — patched | a532c695 — same patch as #5 (Git-object materialization removes the race by construction) |
| 8 | MEDIUM | codex-ops | AC2 — unbounded component startup | accepted — patched | a532c695 — injectable per-component and overall startup deadlines; never-settling start = failure at deadline → reverse rollback with aggregated errors; test added |
| 9 | MEDIUM | codex-ops | AC2 — prefix matching not component-aware | accepted — patched | a532c695 — same patch as #2 (/Volumes/data vs /Volumes/database fixture named explicitly) |
| 10 | MEDIUM | codex-ops | AC4 — child contract asserted not enforced; UDP/DNS open | accepted — patched | a532c695 — same patch as #3 |
| 11 | MEDIUM | codex-ops | AC5 — compiler-only preflight insufficient | accepted — patched | a532c695 — same patch as #4: full node-gyp prerequisite preflight (python3, make, clang/clang++, Xcode CLT/SDK, node/npm identity, nodedir layout), versions recorded in evidence, per-missing-prereq fixtures |
| 12 | MEDIUM | codex-ops | AC7 — no exit-status protocol for red cells | accepted — patched | a532c695 — same patch as #6 |

## Convergence call

needs R3 — focus_hints: verify the r2 patch set at a532c695 (propagation-completion round; reframe gate ran, investigator verdict validated). Checks: (1) AC1 two-phase inventory — is the ordering now actually executable by a builder starting from zero, with no remaining circularity? (2) AC2 probe — token table, timeout, escape decoding, component-aware matching: fully falsifiable now? (3) AC4 — does spawnSanitizedChild + child_process interception + http2/dgram/dns blocklist close the enforcement gap without over-claiming? (4) AC5 — does Git-object staging fully retire both the ignored-file and TOCTOU identity holes? does prepare-offline-deps.mjs + full toolchain preflight close the offline native-build story end to end? (5) AC7 — terminal gate semantics: any path where a red implemented cell still yields a green workflow, or where uploads are skipped? (6) Regression sweep: did any r2 patch contradict an existing AC sentence or reopen an r1 disposition? This round should converge unless a NEW load-bearing defect is found; wording-level polish belongs to the builder, not another round.

