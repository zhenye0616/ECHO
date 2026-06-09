---
id: 2026-06-08-100-codex-adapter-freshness-check
title: "Codex skill-adapter freshness check — operator-side (install-echo-codex-skills.sh --check + echoctl doctor), NOT the merge gate"
status: proposed
priority: MEDIUM
estimate: 2h
created: 2026-06-08
blocked_by: []
task_state_ref: 2026-06-08-100-codex-adapter-freshness-check
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: ""
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
files_to_modify:
  - tools/install-echo-codex-skills.sh   # ADD a `--check` mode: discover managed Codex skill dirs via the `.echo-managed` sentinel (`managed_by=tools/install-echo-codex-skills.sh`), re-render each recorded `source` skill to a temp stage, compute content_sha, compare against the installed dir's `synced_content_sha256`; print each drifted/missing skill; exit non-zero iff ≥1 drift, exit 0 when all match OR when no managed install exists. Render/sentinel logic already exists (render_skill + the .echo-managed writer) — --check reuses it read-only.
  - src/cli/commands/doctor.ts           # ADD a codex-adapter-freshness check: shell out to `install-echo-codex-skills.sh --check`, add a structured field to DoctorReport, contribute `degraded` (NON-fatal, like syncLock.present) when drift is found — naming the stale skill(s) + the remediation command (`tools/install-echo-codex-skills.sh`); ok/skip line when clean or no managed install. Include the result in `--json`.
  - tools/install-echo-codex-skills.test.ts  # MODIFY/ADD — `--check` cases run in a disposable temp $HOME/.codex: clean install → exit 0; a hand-mutated installed SKILL.md → exit non-zero naming the skill; absent ~/.codex/skills → exit 0 "nothing to check". Cleanup trap; no writes to the operator's real ~/.codex. (existing test file at tests/sync-skills/install-echo-codex-skills.test.ts — extend it.)
  - tests/cli/doctor.test.ts             # MODIFY/ADD — assert doctor reports `degraded` with the stale-skill line when --check fails (mock/stub the shell-out), and ok/skip when it passes or no managed install. (confirm exact existing doctor test path during build; this is the doctor unit-test surface.)
spec_refs:
  - backlog/_followups.md                                   # R6.adapter_freshness — READ FIRST. This item is the "Generalize skill-adapter freshness gate to ALL client adapters" + "C2 adapter-drift detection for Codex-installer adapter" + "Stale Codex producer field" bullets, landed operator-side per the constraint below.
  - backlog/ready/2026-06-08-099-code-owned-sidecar-writer.md   # sibling — B was deliberately rescoped OUT of 099. Read 099's Out of Scope + After Completion: the codex consult HIGH that forced this split is the load-bearing constraint here.
  - tools/sync-skills.sh                                    # reference — the Claude-adapter `--check` analog already wired into check-coupled-invariants.sh. This item mirrors its absent-dir guard pattern for Codex, but lands in `echoctl doctor`, NOT the merge gate.
  - tools/install-echo-codex-skills.sh                      # reference — the installer + the `.echo-managed` sentinel it already writes (managed_by / source / synced_content_sha256); --check is a read-only twin of the install path.
  - src/cli/commands/doctor.ts                              # reference — DoctorReport shape + computeOverall: a new check contributes `degraded` exactly like `syncLock.present` / unprobed agents do today.
---

## Why

The codex consult on item 099 surfaced a **HIGH** layering finding: the Codex render target — `tools/install-echo-codex-skills.sh` rendering canonical `skills/*.md` into `~/.codex/skills/ECHO:<name>/SKILL.md` — has **no freshness check**. `tools/sync-skills.sh --check` (wired into `check-coupled-invariants.sh`) covers only the Claude adapters (`.claude/commands/` + `~/.claude/commands/`). That blind spot is exactly how a stale Codex `producer` template went undetected for ~11 days (the 087 root that 099 fixes on the writer side).

But the obvious fix — wiring `install-echo-codex-skills.sh --check` into `check-coupled-invariants.sh` alongside the Claude check — is **wrong**, and that's the whole reason B was split out of 099: `~/.codex/skills/` is **HOME-relative operator-local install cache**, not a repo-tracked artifact. Gating *merges* on it would make merges depend on one operator's machine state — a different operator (or CI, or a fresh checkout) with no Codex install, or a stale one, would fail the merge gate for reasons unrelated to the change under review. The Claude adapters can live in the merge gate because `.claude/commands/` is in-repo and the `~/.claude/commands/` copy is dir-existence-guarded; the Codex install is neither.

**Correct placement: operator-side selftest.** The freshness check belongs where operator-local state is legitimately inspected — `echoctl doctor` — backed by an `install-echo-codex-skills.sh --check` mode. doctor already models exactly this: non-fatal `degraded` sub-checks (`syncLock.present`, unprobed agents) that report operator-environment problems without claiming the system is broken. A stale Codex adapter is precisely that shape.

## Locked decisions

1. **Operator-side, never the merge gate** (099 codex consult HIGH). The check lives in `echoctl doctor` + the installer's own `--check`. `check-coupled-invariants.sh` and every CI/merge path stay untouched and HOME-independent. This boundary is the point of the item, not an implementation detail (AC4 guards it).
2. **Discovery by sentinel, namespace-agnostic.** `--check` scans `~/.codex/skills/*/.echo-managed` for `managed_by=tools/install-echo-codex-skills.sh` and re-renders each dir's recorded `source`. It does NOT assume the default `ECHO` namespace or hyphen name-style, so an operator who installed with `--namespace`/`--underscore-names` is still checked correctly.
3. **Absent install is a clean pass.** No `~/.codex/skills/`, or zero managed dirs → exit 0 with "nothing to check". A fresh machine, CI, or a non-Codex operator must never fail this check (mirrors `sync-skills.sh`'s `[ -d "$GLOBAL_DIR" ]` guard).
4. **doctor reports, the installer fixes.** On drift, doctor names the stale skill(s) and points the operator at `tools/install-echo-codex-skills.sh` (re-running the installer IS the fix). No auto-repair in this item; drift is `degraded`, not `broken`.

## Acceptance criteria

- **AC1 — `install-echo-codex-skills.sh --check`.** Discovers managed Codex skill dirs via the `.echo-managed` sentinel; for each, re-renders the recorded `source` skill to a temp stage and compares its content_sha against the installed dir's `synced_content_sha256` (and flags a managed dir whose `SKILL.md`/sentinel is missing or whose `source` no longer exists). Prints one line per drifted/missing skill (skill name + short reason). Exits non-zero iff ≥1 drift; exits 0 when every managed skill matches. The check is read-only — it never writes into `~/.codex`.
- **AC2 — absent-install guard.** When `~/.codex/skills/` does not exist, or exists but contains zero `managed_by=tools/install-echo-codex-skills.sh` dirs, `--check` prints `no managed Codex ECHO install; nothing to check` and exits 0 — no HOME write, no failure. Verified from a disposable temp `$HOME`.
- **AC3 — doctor integration.** `echoctl doctor` runs the check and adds a structured field to `DoctorReport`. Drift → `overall: 'degraded'` (non-fatal) with a human line naming the stale skill(s) and the remediation command; clean → an ok line; no managed install → a skip/ok line. `echoctl doctor --json` includes the structured result. The check failing to run (installer missing, shell error) degrades gracefully — it does not make doctor throw or report `broken`.
- **AC4 — merge gate untouched (the guard AC).** `tools/review-queue/check-coupled-invariants.sh` is not modified and gains no `~/.codex` dependency; no CI/merge path references the Codex install. A grep/assertion that `check-coupled-invariants.sh` contains no `.codex` reference is sufficient.
- **AC5 — tests.** `--check` is exercised in a **disposable temp `$HOME`/`~/.codex`** with a cleanup trap (clean install → exit 0; a hand-mutated installed `SKILL.md` → exit non-zero naming the skill; absent dir → exit 0), never touching the operator's real `~/.codex`. A doctor test asserts `degraded` + the stale-skill line when the check fails and ok/skip when it passes or there is no managed install (the shell-out may be stubbed).

## Out of Scope (Don't Drift)

- **Any wiring into `check-coupled-invariants.sh` or a CI/merge gate.** This is the codex-099-consult HIGH and the entire reason for the split — the check is operator-side only. (AC4 enforces.)
- **Auto-repair / `--fix`.** doctor reports and points at the installer; re-running the installer is the remediation. A `--fix` convenience is a separate follow-up if demand surfaces.
- **The Claude adapters** (`.claude/commands/`, `~/.claude/commands/`) — already covered by `sync-skills.sh --check` in the merge gate; not re-checked here.
- **`echo_skill()` render-at-use-time** — endgame, deferred per followups.
- **emit-sidecar.py / the sidecar `producer` field** — that is item 099 (deliverable A); this item is the adapter-freshness half only.
- **New sentinel fields or installer render changes** — `--check` consumes the existing `.echo-managed` sentinel as-is.

## After Completion (Strategist Notes)

- **`backlog/_followups.md` → R6.adapter_freshness:** mark **resolved** by this item: "Generalize skill-adapter freshness gate to ALL client adapters", "C2 adapter-drift detection for Codex-installer adapter", and "Stale Codex producer field" (the detection half — 099 closed the writer half). Record the resolved design: Claude adapters are gated in the merge invariant (repo-tracked); the Codex adapter is checked operator-side in `echoctl doctor` (HOME-relative), per the codex 099-consult HIGH. Cross-reference 099.
- **Wiki:** optionally add a one-line note to the operating-model adapter-freshness discussion capturing the split (repo-tracked adapters → merge gate; operator-local adapters → doctor). Not a product surface, so no new wiki page required.
