---
item_id: 2026-07-15-138-echo-context-cutover-substrate-rehearsal
round: 3
combined_at: '2026-07-16T03:17:25Z'
codex_response: codex.md
cursor_response: null
codex-ops_response: codex-ops.md
claude_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
---

# Combined findings

Reframe gate: FIRED. Six of ten findings (rows 1, 2, 4, 6, 7, 8) target mechanisms introduced by the sole prior patch commit `9c37bd8c` (spec-r2-patches): the AC1 non-mutating command catalogue, the AC1 pre-trust rejection-record-under-root requirement, and the AC5/AC8 operational preflight/landing gate. Fresh-context investigator ran (`codex exec --sandbox read-only`, session 019f68ef-6418-7d20-b3e5-bf0129e86cf3); verdict `kind: structural_cut` — the three r2 overlays cross boundaries already owned by the Tests section, the successor-repository landing protocol (`raw/internal/decisions/2026-07-15-echo-context-successor-repository-execution.md`), and item 139's frontmatter-SHA authority. Diagnostic check applied before patching: (a) the single `rehearse --root` entrypoint still proves old→G1→old→G2 with zero live mutation after the cut — confirmed, only the catalogue/record overlays are removed; (b) item 139 obtains both canonical landed SHAs solely from completed-item frontmatter plus canonical remotes — confirmed against 139's AC ("Read the item-138 `target_landed_sha` and `project_landed_sha` from the frontmatter … cross-check … verify each SHA is reachable from the default branch of the canonical remote"), which never consumes the r2 gate-check results. Rows 3, 5, 9, 10 target original spec mechanisms and receive real patches.

Removal proof matrix (rows 1/2/4/6/7/8 structural cut):
- state_removed: pre-trust redacted rejection records written under the untrusted rehearsal root (AC1); AC5 operational preflight/landing gate check-result entries in the AC8 migration record.
- behavior_removed: AC1 AC-level non-mutating command allowlist (the commands survive only as ordinary Tests-section checks); durable evidence writes before root trust; the 138-owned preflight gate and landing recheck mechanism.
- owners_removed: none — the overlays were prose-only with no dedicated file owner; no compensating owner is added and files_to_modify cardinality is unchanged (smell-only signal, matrix is the proof).
- tests_removed_or_changed: mutation-guard tests changed to assert ABSENCE on pre-trust rejection (non-zero exit, zero filesystem mutation, no record anywhere); no gate-check tests exist or remain.
- remaining_invariants: rehearse permanently root-scoped/fake-service-only with no live mode/flag/env bypass; non-zero exit on every guard rejection and replay stop; post-trust durable redacted replay records; deterministic candidate builds with binding manifests; original canonical readback fills both landed SHAs in a follow-up evidence commit; 139 pins completed-item frontmatter cross-checked against the migration record — a pre-existing 139-side contract, not a new compensating mechanism.

Failure-mode check: state, behavior removed = true; remaining invariants are pre-existing contracts owned elsewhere, not relabeled replacements. Cut is valid.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | MEDIUM | codex | AC1, AC5, and Tests | accepted — r2 command catalogue dropped (structural cut); single exact rehearse entrypoint named (package script, cwd, output boundary, exit contract) | spec-r3-patches; AC5 candidate build/verify package scripts named; Tests names `tools/install-echo-codex-skills.sh --dry-run` literally; extracted-archive no-bypass inspection added |
| 2 | HIGH | codex | AC1 — mutation guard and replay contract | accepted — pre-trust rejection record dropped (structural cut, matrix above); initialize-vs-resume semantics, descriptor-relative no-follow root validation, per-root exclusive lock added | spec-r3-patches; pre-trust failures = redacted stderr + non-zero exit + zero mutation; post-trust replay stops keep durable redacted records; table-driven root-rejection tests added |
| 3 | HIGH | codex | AC1 and AC2 — phase commit and old-full authority fence | accepted — patched (original mechanism, must-patch) | spec-r3-patches; fence decision and controller transitions serialized via exclusive lock on the canonical transaction record, recheck-while-held; barrier-controlled concurrent start-vs-activation fixtures for every supported start path |
| 4 | HIGH | codex | AC5 and AC8 — operational preflight, landing, and readback | accepted — r2 operational gate dropped (structural cut, matrix above); self-embedding impossibility resolved by making the follow-up evidence commit explicit | spec-r3-patches; AC8 now states readback lands in a subsequent evidence commit (never the landing commit) into completed-item frontmatter, which is the sole SHA authority item 139 pins; landing protocol remains owned by the successor-repository decision |
| 5 | HIGH | codex | AC3 and AC7 — rollback and recutover W/C cuts | accepted — patched (original mechanism, must-patch) | spec-r3-patches; explicit writer-freeze/transactional-cut protocol: quiesce writers, drain outbox, verify high-water marks under freeze, commit cut + authority flip in one canonical-record transaction; race tests at every cut/flip boundary; recutover reuses the protocol |
| 6 | HIGH | codex-ops | AC1 — mutation-guard rejection evidence | accepted — same structural cut as row 2. Investigator override recorded: the prescribed separately-supplied evidence sink is REJECTED — such a sink is itself a pre-trust path requiring validation (regress); removal chosen instead. stderr + exit code is the unattended-run contract, stated in AC1 | spec-r3-patches; forbidden/symlinked/unwritable-root tests assert non-zero exit, zero mutation, no record |
| 7 | MEDIUM | codex-ops | AC1, AC5, and Tests — executable command contract | accepted — same cut + precision as row 1 | spec-r3-patches |
| 8 | MEDIUM | codex-ops | AC5 and AC8 — remote preflight and landing race | accepted — same structural cut as row 4; the preflight-to-landing race disappears with the 138-owned gate; 139 independently verifies SHA reachability from canonical remotes | spec-r3-patches |
| 9 | MEDIUM | codex-ops | AC2 — old-plist authority-fence behavior | accepted — patched (original mechanism, must-patch) | spec-r3-patches; old start jobs neutralized before prepared/active commit; durable rate-bounded fence-rejection evidence in the packaged daemon's log location; fake-launchd KeepAlive fixture proves bounded termination |
| 10 | MEDIUM | codex-ops | AC3 — mirror collision and retry exhaustion | accepted — patched (original mechanism, must-patch) | spec-r3-patches; collision/retry-exhaustion persists terminal state (last error + watermark) in residual coord.sqlite, surfaced via coord_status/health, proven visible across restart |

## Convergence call

needs R4 — focus_hints: verify the r3 structural cut and four original-mechanism patches (see r4 request).

