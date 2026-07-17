---
item_id: 2026-07-15-137-echo-context-installable-shadow-runtime
round: 6
combined_at: '2026-07-17T08:08:23Z'
claude_response: null
codex-ops_response: codex-ops.md
codex_response: codex.md
cursor_response: null
patch_commit_sha: null
next_round: null
combined_verdict: proceed_after_patches
escalated_to_founder: false
review_protocol: 2
review_mode: full
review_counter:
  lifetime: 6
  epoch: 1
  epoch_round: 1
finding_families:
- family_id: fam-063c32423565fd88
  mechanism: status and doctor can observe mixed lifecycle generations because they
    do not participate in lifecycle serialization
  origin: unknown
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex-ops
- family_id: fam-58dd8e2ed8c0d2b5
  mechanism: bearer credential disk and wire representation
  origin: original
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex
- family_id: fam-59151b4a69e640a5
  mechanism: launchd and no-launchd lifecycle state convergence
  origin: original
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex
- family_id: fam-64c648d1288bdb65
  mechanism: capture-off service gating and synthetic fixture seeding
  origin: original
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex
- family_id: fam-7c73935a9092db29
  mechanism: authorization-to-bootstrap exact-artifact trust handoff
  origin: original
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex
- family_id: fam-b1c1dd448cd031dd
  mechanism: launchd discards the fallback diagnostic channels before bounded runtime
    logging is guaranteed
  origin: unknown
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex-ops
- family_id: fam-b4b7d9792da50b3f
  mechanism: persistent launchd disabled overrides are outside the transactional ownership
    and recovery model
  origin: unknown
  first_seen_round: 6
  latest_round: 6
  state: cut
  reviewers:
  - codex-ops
- family_id: fam-d1516500edd71225
  mechanism: trusted acquisition of the bundled Node and native runtime closure
  origin: original
  first_seen_round: 6
  latest_round: 6
  state: patched
  reviewers:
  - codex
round_diagnostics:
  new_family_ids:
  - fam-063c32423565fd88
  - fam-58dd8e2ed8c0d2b5
  - fam-59151b4a69e640a5
  - fam-64c648d1288bdb65
  - fam-7c73935a9092db29
  - fam-b1c1dd448cd031dd
  - fam-b4b7d9792da50b3f
  - fam-d1516500edd71225
  recurring_family_ids: []
  reopened_family_ids: []
  proof_failed_family_ids: []
  patch_introduced_family_ids: []
  closed_family_ids: []
  root_cause: scope_ambitious
sealed_spec_sha: null
---

# Combined findings

Reframe gate: fewer than two findings target patch-introduced mechanisms. The only recent mechanism selected for removal is persistent launchd disable/enable ownership; it is cut below rather than replaced with another recovery subsystem.

## Convergent findings

| # | Severity | Source | Where (primary) | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|

## Divergent findings (single-reviewer or non-overlapping primary `where`)

| # | Severity | Source | Where | Disposition | Patch SHA / rationale |
|---|---|---|---|---|---|
| 1 | HIGH | codex | Acceptance Criteria AC1, AC2, and AC6 | accepted — patch `fam-64c648d1288bdb65` | AC2 makes online capture typed 403 before body read; AC4/AC6 add only a manifest-bound idempotent stopped-service seed under both locks. |
| 2 | HIGH | codex | Acceptance Criteria AC3 and Out of Scope | accepted — patch `fam-d1516500edd71225` | AC3 pins the sole Node URL, exact upstream SHA-256, curl policy, license/native inventory, ABI load probes, and no-cache/host fallback. |
| 3 | HIGH | codex | Acceptance Criteria AC3 and AC6 | accepted — patch `fam-7c73935a9092db29` | AC6 adds external authorization readback, protected staging, literal pre-exec shasum checks, authorized-manifest CLI binding, and coherent-set substitution failure. |
| 4 | MEDIUM | codex | Acceptance Criteria AC4 and AC6 | accepted — patch `fam-59151b4a69e640a5` | AC4 names exact bootstrap/bootout/kickstart/kill/print vectors, exit mapping, deadlines, ready-FD schema, and process-group ownership; persistent disable is removed. |
| 5 | MEDIUM | codex | Acceptance Criteria AC2 and Tests | accepted — patch `fam-58dd8e2ed8c0d2b5` | AC2 fixes token representation at 32 random bytes → 43 unpadded base64url ASCII bytes plus LF and defines strict file/header/decoded comparison behavior. |
| 6 | HIGH | codex-ops | AC1 startup ordering and AC4 direct-launch plist/logging contract | accepted — patch `fam-b1c1dd448cd031dd` | AC1 opens the bounded startup sink first; every later fatal is typed/redacted, logger-open failure suppresses retry and is independently doctor-visible. |
| 7 | MEDIUM | codex-ops | AC4 lifecycle-lock contract and AC5 machine-readable status/doctor contract | accepted — patch `fam-063c32423565fd88` | Status/doctor hold a shared lifecycle lock for the full observation; a five-second contention emits schema-valid busy timeout exit 4. |
| 8 | MEDIUM | codex-ops | AC4 disable, reinstall, transaction, and uninstall semantics | accepted — mechanism cut `fam-b4b7d9792da50b3f` | `state_removed`: no managed persistent override; `behavior_removed`: no disable/enable command; `owners_removed`: no override receipt/recovery; `tests_removed`: replaced by absence+collision assertions; `remaining_invariants`: stop/restart/uninstall only. |

## Round diagnosis

- Root cause: `scope_ambitious`
- New families: `fam-063c32423565fd88, fam-58dd8e2ed8c0d2b5, fam-59151b4a69e640a5, fam-64c648d1288bdb65, fam-7c73935a9092db29, fam-b1c1dd448cd031dd, fam-b4b7d9792da50b3f, fam-d1516500edd71225`
- Recurring families: `none`
- Reopened families: `none`
- Proof-failed families: `none`
- Patch-introduced families: `none`
- Closed families: `none`

| Family | State | Origin | Mechanism |
|---|---|---|---|
| `fam-063c32423565fd88` | patched | unknown | status and doctor can observe mixed lifecycle generations because they do not participate in lifecycle serialization |
| `fam-58dd8e2ed8c0d2b5` | patched | original | bearer credential disk and wire representation |
| `fam-59151b4a69e640a5` | patched | original | launchd and no-launchd lifecycle state convergence |
| `fam-64c648d1288bdb65` | patched | original | capture-off service gating and synthetic fixture seeding |
| `fam-7c73935a9092db29` | patched | original | authorization-to-bootstrap exact-artifact trust handoff |
| `fam-b1c1dd448cd031dd` | patched | unknown | launchd discards the fallback diagnostic channels before bounded runtime logging is guaranteed |
| `fam-b4b7d9792da50b3f` | cut | unknown | persistent launchd disabled overrides are outside the transactional ownership and recovery model |
| `fam-d1516500edd71225` | patched | original | trusted acquisition of the bundled Node and native runtime closure |

## Convergence call

needs R7 — focus_hints: delta-verify all eight R6 families against the exact AC1–AC6 patch; especially prove no online fixture write, no host-Node fallback, no coherent asset substitution, no persistent launchctl override, no silent startup loop, and no mixed-generation doctor result.
