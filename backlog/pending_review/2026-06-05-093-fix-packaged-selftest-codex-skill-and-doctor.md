---
id: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
title: "Make the packaged `echoctl selftest --json` green from the installed tarball — second-hop Codex skills (WIR-06/SKILL-02), fix doctor mcp-reachability (DOC-02), replace the fixed capture-settle sleep with poll-until-recall"
status: proposed
priority: HIGH
estimate: 0.5d
created: 2026-06-05
blocked_by: []
task_state_ref: 2026-06-05-093-fix-packaged-selftest-codex-skill-and-doctor
requested_reviewers: ["codex", "codex-ops"]
ready_content_sha: b4e6343cf9202c635fe215646a8c8006bff77c9af03f1b6a01b3bd1642d3081f
files_to_modify:
  - src/echo-home/adapters/skill-sync.ts      # AC1 — second-hop Codex skills: render `<codexHome>/skills/<name>/SKILL.md` (directory + `name:` frontmatter format) from the shipped `assets/echo-skills/*.md`. Today this file has ZERO codex/SKILL.md references — the packaged install populates ~/.echo/skills/ and stops. (A new sibling adapter file under src/echo-home/adapters/ is acceptable if cleaner; wire it in adapter-sync.)
  - src/echo-home/adapter-sync.ts             # AC1 — invoke the second-hop for the codex agent profile during wiring, with the same atomic-write + marker discipline the other adapters use.
  - src/cli/commands/selftest.ts              # AC2 (DOC-02 fix if root cause is in selftest/doctor invocation) + AC3 (replace `sleep(4000)` at :609 with bounded poll-until-recall). Do NOT weaken any check to make it pass.
  - tests/echo-home/**                        # AC1/AC4 — unit tests for the Codex second-hop (rendered path, frontmatter, idempotent re-run); follow existing adapter test conventions.
spec_refs:
  - backlog/complete/2026-06-05-092-release-workflow-and-voting-ci.md   # parent — release workflow merged with selftest red; agent_notes carries the builder's escalation + diagnosis this spec is built on.
  - backlog/complete/2026-06-05-090-adopt-selftest-onboarding-harness.md  # grandparent — defines the selftest harness and check IDs.
  - raw/internal/agent-runs/2026-06-05-2026-06-05-092-release-workflow-and-voting-ci.md  # ground truth — packaged-install rehearsal output: failedIds ["WIR-06","SKILL-02","DOC-02"], passed 17, failed 3, skipped 3.
  - src/cli/commands/selftest.ts  # WIR-06 (:571 — `<codexHome>/skills/using-echo-mcp/SKILL.md` exists), SKILL-02 (:573 — `name:` frontmatter), DOC-02 (:643 — doctor exit 0 && daemon.mcpReachable===true), sleep(4000) (:609).
  - backlog/_followups.md  # 092-merge section — sleep(4000) history (filed at 090, did not land in 091, urgency now "before the gate becomes real").

# --- agent-managed fields (filled in during run) ---
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-05T23:36:10Z"
branch: "agent/fix-packaged-selftest-codex-skill-and-doctor"
worktree: "/Users/zhenye/Desktop/Project_echo--fix-packaged-selftest-codex-skill-and-doctor"
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# 093 — Fix the packaged selftest: Codex skill second-hop + doctor reachability + poll-until-recall

## Why

092 shipped the release pipeline, but its validation gate — install the packed tarball, run the shipped
`echoctl selftest --json` — is **correctly red**: `WIR-06`, `SKILL-02`, `DOC-02` fail from a clean
`echoctl-0.1.0-beta.1.tgz` install (092 builder rehearsal, escalated rather than drift past 092's AC6).
**No `v*` tag can validate until this is green.** This is the real Ring-1 blocker between us and handing
the Windows beta tester a tarball.

Diagnosis carried in from the 092 escalation (verified at spec time):

1. **WIR-06 / SKILL-02 (high confidence):** the tarball ships `assets/echo-skills/*.md` (flat files, pinned
   by 092's packed-manifest snapshot), and adapter-sync populates `~/.echo/skills/` — but **nothing performs
   the second hop** into Codex's skill format `<codexHome>/skills/using-echo-mcp/SKILL.md`.
   `src/echo-home/adapters/skill-sync.ts` contains zero codex/SKILL.md references. The dev machines pass
   these checks only because a dev-side tool (outside the packaged surface) did the hop historically.
2. **DOC-02 (medium confidence — diagnose first):** `echoctl doctor --json` under the packaged install
   either exits non-zero or reports `daemon.mcpReachable !== true`. Root cause NOT yet pinned; the builder's
   first task on this AC is diagnosis, not patching.

## Locked decisions

1. **Fix the product, not the check.** The selftest checks are the contract 090 established; none of them get
   weakened, skipped, or re-scoped to make the tarball pass. If a check is discovered to be *wrong* (asserting
   something the product should not promise), STOP and escalate — that is a founder decision.
2. **The second hop is an adapter responsibility.** Codex skill materialization happens inside the
   echo-home adapter layer (same atomic-write/marker/idempotency discipline as `codex-config.ts` /
   `claude-code-mcp.ts`), sourced from the shipped `assets/echo-skills/` — NOT from a dev-only script, NOT by
   adding new files to the tarball.
3. **Poll, don't sleep.** The `sleep(4000)` capture-settle (`selftest.ts:609`) becomes a bounded
   poll-until-recall loop (poll `search_memories` for the token until hit or timeout; fail with the timeout
   diagnostic). Originally filed at 090; explicitly in-scope here so the gate is trustworthy on slow CI
   runners before it ever becomes enforcing.
4. **Acceptance is the packaged rehearsal, not the dev tree.** The gate that matters: `npm pack` → install
   the tarball into a clean prefix → packaged `echoctl selftest --json` exits 0 with `failedIds: []`. Green
   `npm test` in the repo tree is necessary but NOT sufficient.

## Acceptance criteria

- **AC1 — Codex skill second-hop.** After `echoctl`-driven wiring from a clean tarball install,
  `<codexHome>/skills/using-echo-mcp/SKILL.md` exists with `name: using-echo-mcp` frontmatter —
  `WIR-06` and `SKILL-02` pass. The hop renders from the shipped `assets/echo-skills/using-echo-mcp.md`,
  is idempotent (re-run produces no spurious diff), uses the adapter layer's atomic-write + marker pattern,
  and is covered by unit tests (path, frontmatter, idempotency, missing-source behavior).
  **Missing-source contract** *(r2 codex F2)*: if the shipped source `assets/echo-skills/using-echo-mcp.md`
  is absent at wiring time, the second-hop is a **hard failure** with a diagnostic naming the missing path —
  NOT a silent/diagnostic skip (a packaged install without its shipped skill source is a broken artifact and
  must not wire "successfully"). Atomic-write discipline applies: on failure, NO partial SKILL.md and NO
  marker write (the target is either fully written or untouched). The unit test asserts the error surface
  AND the absence of partial target/marker writes.
- **AC2 — DOC-02 diagnosed and green.** Builder diagnoses WHY `doctor --json` fails reachability under the
  packaged install (candidates: port/home plumbing in the doctor invocation, daemon startup race in the
  sandbox, packaged-path resolution) and fixes the actual root cause. If diagnosis reveals a defect outside
  `files_to_modify` or larger than this item's estimate: STOP, write the diagnosis into `agent_notes`
  prefixed `BLOCKED:`, move to `pending_review/` — and that handoff is an **ESCALATION, not an
  acceptance-complete item** *(r1 codex F2)*: AC2/AC4 are explicitly NOT met, the reviewer must treat it as
  an escalation (disposition: re-scope, expand `files_to_modify` in a revised spec, or spin a successor)
  and must NOT review it as a merge candidate. Partial credit for a pinned root cause beats a drifted fix.
- **AC3 — poll-until-recall.** `selftest.ts:609`'s fixed `sleep(4000)` is replaced by a bounded poll loop
  (e.g. poll every 250–500ms up to a ceiling ≥ the old 4s; configurable ceiling acceptable). On timeout,
  CAP-02 fails with a diagnostic that says how long it waited. No other check's semantics change.
- **AC4 — packaged rehearsal is the gate (env-isolated, identity-checked).** From the repo at the builder's
  HEAD: `npm pack`, install the produced `.tgz` into a clean temp prefix, run the INSTALLED
  `echoctl selftest --json` → exit 0, `failedIds: []` (skips allowed as today). Record the JSON output in
  the run log. Two hardening contracts:
  - **Isolated runtime state** *(r1 codex F1 + codex-ops F1, convergent; concretized r2 codex F1)*: the
    rehearsal sets the four env vars the product actually honors (`selftest.ts:390-394`) — `HOME`,
    `USERPROFILE`, `ECHO_HOME`, `CODEX_HOME` — to fresh `mktemp -d` paths, cleaned up afterwards, so
    preexisting developer-machine state (an existing `~/.codex/skills`, a populated `~/.echo`) cannot
    satisfy WIR-06/SKILL-02. Daemon isolation: `selftest` spawns its own throwaway daemon with
    `ECHO_MCP_PORT=0` (random port; `selftest.ts:142-143`) — the rehearsal env must NOT override
    `ECHO_MCP_PORT` to the live daemon's port, so DOC-02 cannot false-pass by contacting a preexisting
    daemon. Normative command skeleton (exact paths/layout may vary; the recorded values are the contract):

    ```bash
    RUNTIME=$(mktemp -d) && PREFIX=$(mktemp -d)
    npm pack                                            # → echoctl-<version>.tgz
    npm install -g --prefix "$PREFIX" ./echoctl-<version>.tgz
    HOME="$RUNTIME/home" USERPROFILE="$RUNTIME/home" \
    ECHO_HOME="$RUNTIME/echo" CODEX_HOME="$RUNTIME/codex" \
      "$PREFIX/bin/echoctl" selftest --json             # absolute clean-prefix bin path
    ```
  - **Binary identity** *(r1 codex-ops F2)*: invoke the installed CLI by the clean prefix's absolute bin
    path (NOT bare `echoctl` / `npx` PATH resolution, which can silently exercise the repo/dev CLI) and
    record the resolved executable path in the run log.
  **Run-log record (required fields)** *(r2 codex F1)*: the resolved absolute bin path actually executed;
  the four env-var values (`HOME`, `USERPROFILE`, `ECHO_HOME`, `CODEX_HOME`); confirmation `ECHO_MCP_PORT`
  was NOT set/overridden; the tarball filename + its SHA-256; and the full `selftest --json` output.
  This is the builder-executable proof; it must be in the run log before handoff.
- **AC5 — repo suite green.** `npm test`, `npm run lint`, `npm run typecheck` green. New unit tests from AC1
  included. No existing test deleted or weakened.
- **AC6 — no drift (lifecycle carve-out as in 092).** ONLY the second-hop adapter work, the DOC-02 root-cause
  fix, the poll loop, and their tests. NO `files`-allowlist edits, NO `release.yml`/`ci.yml` changes, NO
  asset-stripping, NO test-suite split, NO version bumps or tags. Builder-protocol lifecycle edits
  (claim, pending_review move, agent_notes/head_sha, run log) are explicitly allowed.

## Out of Scope (Don't Drift) — successors

1. Cutting the first `v0.1.0-beta.1` tag and the real GH-matrix validation run — founder action after this merges.
2. The tarball-strip decision (`assets/echo-roles/**`, `assets/echo-workflows/**`, review-queue config) — flagged founder decision, its own spec.
3. Test-suite split (product vs `tests/review-queue/**`) + `tests/cli/init.test.ts` cross-platform investigation — separate item.
4. The flake friction item (real-daemon/concurrency full-suite flakes) — separate item.
5. AC3-of-092's real enforcement gate (aggregate `all-green` job) — blocked on GitHub plan regardless.

## After Completion (Strategist Notes)

- This unblocks the first real release: founder tags `v0.1.0-beta.1`, `release.yml` builds/validates/publishes,
  and the Windows beta tester install path goes live. The post-merge Windows GH-matrix questions from 092
  (`release.yml:106-107` doctor spawn, `:92` version equality) get answered by that first run.
- Fold the outcome into the queued 090+091+092 wiki page (one capability: onboarding harness → compat →
  release pipeline → green packaged selftest); update `.manifest.json` + regen `wiki/index.md`.
- If AC2's diagnosis escalated instead of fixed: triage the root cause into its own item before tagging.
