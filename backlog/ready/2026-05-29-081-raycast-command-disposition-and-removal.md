---
id: 2026-05-29-081-raycast-command-disposition-and-removal
title: "Raycast command disposition + removal (parity-gated, per-command)"
status: inbox            # PARKED — `inbox` is NOT a kanban stage and is NOT scanned by tools/blocked.py (STAGES = ready|claimed|pending_review|complete). This file lives in backlog/inbox/ so no agent can claim it. Promote backlog/inbox/ -> backlog/ready/ ONLY after the Claim Gate (AC1) fires AND the disposition table is locked (AC2).
priority: MED
estimate: 0.5-1d
created: 2026-05-29
blocked_by: []           # Intentionally empty. The AC8 gate is NOT machine-enforceable via blocked_by: tools/blocked.py rejects non-item-id refs (so `080-AC8` would fail --validate), and `080` alone is already in complete/ so it would auto-satisfy and make this claimable immediately. The real gate is the manual promotion gate in AC1 — do not fake a no-code gate item (codex consult 2026-05-29).
task_state_ref: ""
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:         # MAXIMAL (all-REMOVE) set, BUILDER-REMOVABLE ONLY. The strategist NARROWS this at promotion to match the LOCKED disposition table (a partial trim touches far fewer files). NEVER add wiki/** or docs/BACKLOG.md here — those are strategist-only and the atomic claim escalates if a builder lists them (see AC5).
  - tools/raycast-echo/**        # all-REMOVE: delete the whole extension. partial: delete ONLY each cleared command's entrypoint (src/<cmd>.tsx) + its own tests + its package.json command entry — and ONLY after the dependency map (AC4) proves no surviving command needs the deleted code.
  - tsconfig.json                # FULL-DIR removal ONLY: drop the "tools/raycast-echo/**/*" exclude (currently line ~23). Leave the "tools/echo-overlay/**/*" exclude.
  - eslint.config.js             # FULL-DIR removal ONLY: drop 'tools/raycast-echo/raycast-env.d.ts' from `ignores` (currently line ~7).
  - .gitignore                   # FULL-DIR removal ONLY: drop the 'tools/raycast-echo/raycast-env.d.ts' line (currently line ~49) and its comment.
  - tools/tail-mcp.sh            # COMMENT-ONLY: line ~4 names the Raycast per-session log path. Update/remove the stale comment. DO NOT delete this file — it tails the daemon's /mcp/recent-calls endpoint, not Raycast.
spec_refs:
  - backlog/complete/2026-05-29-080-decisions-desktop-overlay.md  # Parent. 080 AC8 is the post-merge founder dogfooding gate that "is the gate that unlocks item 081." 080 covers ONLY the `decisions` job (DecisionCard, SEE+JUMP); it does NOT replace `echo` or `recap`. "After Completion" filed this item as "remove the whole tools/raycast-echo/" — this spec REFINES that to parity-gated, per-command (founder + codex consult, 2026-05-29).
  - tools/raycast-echo/package.json  # The 3 commands under disposition: echo / recap / decisions.
  - tools/raycast-echo/src/lib  # Shared helpers (agent-runner, mcp, launch, format, sessions, since-resolver, system-prompt, recap-system-prompt, audit, agent-profiles). A PARTIAL trim MUST build a dependency map before deleting anything — the three commands share this directory (AC4).
  - tools/raycast-echo/src/lib/sessions.ts  # echo's DIRECT disuse-evidence artifact: LocalStorage keys echo.sessions.v1.row.* / echo.recent-asks / echo.sessions.v1.migrated. Recent rows = echo was used in the window.
  - tools/raycast-echo/src/recap.tsx  # recap runs with sessionLogEnabled:false and the recap system prompt states "single-shot and not persisted." recap leaves ~no artifacts, so its disuse is ATTESTATION-ONLY (absence of evidence proves little).
  - raw/internal/dogfooding/mcp-interactions-journal-2026-05.md  # Observation-window evidence source (literal `**Surface:**` markers). A DISCIPLINE artifact, NOT complete telemetry — corroborate with LocalStorage/log artifacts + founder attestation; never disposition on journal-count alone.
  - CLAUDE.md  # Operating model: wiki/** + docs/BACKLOG.md are strategist-only; a builder must not list them in files_to_modify.
  - wiki/surfaces/hotkey-overlay-raycast.md  # STRATEGIST-ONLY (read-only for builder): documents the shipped Raycast surface; retire/reconcile at wiki-promotion post-merge (AC5).
  - wiki/surfaces/hotkey-overlay.md  # STRATEGIST-ONLY (read-only for builder): cross-references Raycast; reconcile post-merge (AC5).
  - docs/BACKLOG.md  # STRATEGIST-ONLY (read-only for builder): Inbox row now + Ready/Done bookkeeping at promotion/merge (AC5).

# --- agent-managed fields (filled in during run) ---
claimed_by: ""
claimed_at: ""
branch: ""
worktree: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

# 081 — Raycast command disposition + removal (parity-gated, per-command)

> **PARKED IN INBOX — NOT CLAIMABLE YET.** This file is in `backlog/inbox/`, which `tools/blocked.py` does not scan. What is written here is the **framework** (the rules, predicates, and execution mechanics). The **disposition table (AC2) is locked by the strategist + founder at promotion time** — it cannot be locked today because zero post-overlay-install evidence exists yet (see "Evidence reality"). Promotion (`git mv` into `backlog/ready/` + finalize `files_to_modify`) happens only after AC1's gate fires.

## Why (the friction this closes)

Raycast (`tools/raycast-echo/`, items 060→078) was **deliberate scaffolding**: it let the DecisionCard primitive and the continuity/Q&A surfaces ship and get exercised before ECHO committed to a surface stack. Item 080 shipped the **Rust/Tauri desktop overlay** as the operator surface and explicitly filed 081 to retire the scaffolding. The founder's signal (2026-05-29): *"currently I have an overlay with rust and I like it more than raycast."* The direction is settled — Raycast goes.

But a blunt `rm -rf tools/raycast-echo/` is **a category error**, because the three Raycast commands are not equivalent and the overlay does not replace all of them:

- **`decisions`** (078) — the DecisionCard board. **The overlay replaces this**, and 080 AC8 is exactly the dogfooding proof that it carries the job.
- **`echo`** (062/063/065/069) — Ask Q&A + sessions-as-objects + cluster-resume + the cold-start Continue hero. **The overlay covers NONE of this**, and AC8 validates NONE of it.
- **`recap`** (077) — the A/B/D cognitive recap. A distinct, intentionally-ephemeral job with **no overlay equivalent**.

So removal is **parity-gated, per command**: a command is removed only when (a) its job is covered by another surface AND that replacement is dogfood-confirmed, or (b) evidence + founder attestation say the founder no longer relies on it. 081 **builds no replacement** — if `echo`/`recap` are still relied on, the matching command stays `KEEP-BLOCKED` and a separate replacement/retirement item is filed.

### Evidence reality (why the table can't be locked today)
At spec time the current-month dogfooding journal carries exactly **one** `**Surface:**` marker total — and it is `Recap`, not `Overlay`. Zero `Overlay` sessions, zero `Ask ECHO`/`echo` sessions. So: (1) **080 AC8 is not met** (the overlay hasn't been dogfooded at all yet), and (2) Raycast's own commands show near-zero *journal-visible* recent use — but the journal is a discipline artifact, not telemetry, so that absence is **not** sufficient evidence to delete (see AC3).

## What this is — and what it deliberately is NOT

**IS:** a per-command disposition (KEEP-BLOCKED / REMOVE-by-parity / REMOVE-by-disuse) locked by the strategist + founder from real evidence, followed by a mechanical removal of exactly the cleared commands (whole-extension delete when all three clear; otherwise a narrow partial trim).

**IS NOT:** building overlay (or any) replacements for `echo`/`recap` (that's a separate item if a command stays KEEP-BLOCKED); rewriting historical record; any change to the daemon / `src/mcp/**` / the overlay; relaxing 080 AC8; adding a surface; the *builder* deciding any disposition.

## Locked decisions (founder + codex consult, 2026-05-29)

1. **Direction is removal**, gated — not preservation-by-inertia. The default end state is "Raycast gone."
2. **Per-command disposition, not one blanket removal.** The three commands clear independently.
3. **`decisions` → REMOVE-by-parity**, eligible **only after 080 AC8 fires**.
4. **`echo` → default `KEEP-BLOCKED`.** It owns real, unreplaced jobs the overlay does not do and AC8 does not validate. It flips to REMOVE only via the AC3 disuse predicate (artifact + attestation), or once a separate replacement ships.
5. **`recap` → REMOVE-by-disuse, attestation-only** (its telemetry is intentionally thin; absence of artifacts proves little).
6. **The strategist owns the disposition table; no builder inference.** The table is locked in this spec before claim.
7. **Whole-extension delete only when all three clear.** Any `KEEP-BLOCKED` command → 081 is a deliberate *partial trim* (or does not promote at all).

## The disposition framework (AC2 — verdict cells locked at promotion)

| Command | Default verdict | Rule that decides it | Evidence required to set the verdict |
|---|---|---|---|
| `decisions` | REMOVE-by-parity | Overlay carries the job, dogfood-confirmed | 080 AC8 satisfied (cite the journal entries: ≥3 `**Surface:** Overlay` sessions across ≥2 calendar days, ≥1 dot-lit dive + founder note) |
| `echo` | **KEEP-BLOCKED** | Still relied on, no replacement | Flips to REMOVE only with the AC3 disuse predicate met (LocalStorage `echo.sessions.v1.row.*` / `echo.recent-asks` show no use in-window **and** founder attestation) OR a separate replacement ships |
| `recap` | REMOVE-by-disuse | Thin telemetry → attestation governs | Founder attestation only ("did not rely on Raycast `recap`; deletion OK"); corroborate with any `**Surface:** Recap` markers if present |

> Verdict cells read **"pending evidence"** until promotion. The strategist + founder fill them from real evidence at promotion, then `git mv` this file into `backlog/ready/`.

## The disuse predicate (AC3 — hardened; codex consult)

"Near-zero journal usage" alone is **too weak** — the journal is a discipline artifact, not complete telemetry. A command counts as **disused** (eligible for REMOVE-by-disuse) only when ALL hold:

1. **Fixed observation window** — minimum **2 working days** after the overlay is installed and in use, **with the Raycast extension still installed and available** (so non-use is a choice, not an artifact of unavailability).
2. **Direct artifact check where possible** — for `echo`: no fresh `echo.sessions.v1.row.*` / `echo.recent-asks` LocalStorage rows and no recent Raycast session-log mtimes in-window. For `recap`: not applicable (no persistence) → attestation carries the weight.
3. **Literal marker check** (corroborating, not sole): `rg '^\*\*Surface:\*\* Overlay$'` / `rg '^\*\*Surface:\*\* Recap$'` against the month shard — pinned literals, not `grep` globs that break on `*`.
4. **Explicit per-command founder attestation** — "I did not rely on Raycast `<command>` during this window; deletion is OK."
5. **No builder inference.** The strategist locks each verdict in AC2 before the item is claimable.

## Acceptance criteria

1. **AC1 — Claim gate (hard, manual).** This item is not claimable until **080 AC8 is satisfied** and cited (the specific journal entries). Promotion = strategist `git mv backlog/inbox/<this> backlog/ready/<this>` + finalize `files_to_modify` to match the locked table. (No `blocked_by` machine gate — see frontmatter note.)
2. **AC2 — Disposition table locked.** Every command in the AC2 table has a non-"pending" verdict, each backed by the evidence its rule requires, locked by the strategist + founder before claim.
3. **AC3 — Disuse predicate honored.** Any REMOVE-by-disuse verdict satisfies all five clauses of the disuse predicate, with the evidence recorded inline in the table or `agent_notes`.
4. **AC4 — Dependency map before any partial delete.** If the disposition is partial (≥1 `KEEP-BLOCKED`), the builder first produces a `src/lib/` (+ `src/components/`) dependency map showing which helpers each surviving command imports, and deletes only code no survivor needs. No survivor's import is broken.
5. **AC5 — Removal executed for cleared commands only; checks green; history immutable; strategist files held back.**
   - All-REMOVE → delete `tools/raycast-echo/` and clean the builder-removable config refs (`tsconfig.json` exclude, `eslint.config.js` ignore, `.gitignore` line) **only on full-dir removal**; fix the stale `tools/tail-mcp.sh` comment.
   - Partial → strip only the cleared commands from `package.json` + delete their entrypoints/tests per AC4; leave config refs intact while the directory survives.
   - Root `npm run typecheck` / `npm run lint` / `npm test` green after. (The removed extension has its own package; removing it must not break the root graph.)
   - **Historical artifacts are immutable** — never rewrite `raw/internal/agent-runs/**`, `backlog/task-state/**`, `backlog/complete/**`, or the journal archives.
   - **`wiki/**` and `docs/BACKLOG.md` are NOT touched by the builder.** Their reconciliation (retire/redirect `wiki/surfaces/hotkey-overlay-raycast.md`, fix cross-refs in `hotkey-overlay.md`, regenerate `.manifest.json` + `wiki/index.md`, update the BACKLOG row) is **strategist-handled post-merge** at wiki-promotion (see After Completion).
6. **AC6 — Journal the outcome.** Log the final disposition + what was removed/kept to the current month's dogfooding shard (this item touches code/removal, so it is journal-worthy regardless of MCP calls; if zero `mcp__echo__*` calls were made, the skip-rule applies and no MCP-discipline entry is required — record the disposition in `agent_notes` instead).

## Out of Scope (Don't Drift)

1. Building an overlay (or any) replacement for `echo` or `recap`. A `KEEP-BLOCKED` command → file a separate replacement/retirement item; do not expand 081.
2. Rewriting or pruning historical record (agent-runs, task-state, `backlog/complete/`, journal archives, or wiki pages that *document* shipped Raycast history as opposed to *active* pointers).
3. Any change to the daemon, `src/mcp/**`, the MCP transport, or `tools/echo-overlay/`.
4. Relaxing, re-interpreting, or re-running 080 AC8. AC8 is the parent's gate; 081 consumes it, it does not modify it.
5. Adding a new surface or command anywhere.
6. The builder deciding a disposition, inferring disuse, or promoting the item. Disposition + promotion are strategist + founder only.
7. Removing `tools/tail-mcp.sh` (daemon tailer, not Raycast) or the daemon's `/mcp/recent-calls` endpoint.

## After Completion (Strategist Notes)

Post-merge, the strategist:
- Retires or redirects `wiki/surfaces/hotkey-overlay-raycast.md` (the page documents a now-removed surface) and fixes cross-references in `wiki/surfaces/hotkey-overlay.md`; regenerates `.manifest.json` + `wiki/index.md` via `tools/wiki_index.py`.
- Updates `docs/BACKLOG.md`: move the 081 row out of Inbox, record the final disposition (which commands were removed vs kept), and — if any command stayed `KEEP-BLOCKED` — adds the follow-up replacement/retirement item to the Inbox.
- If the whole extension was removed, removes the Raycast surface from any "shipped surfaces" framing in `wiki/product/` / `wiki/surfaces/` so the wiki reflects shipped reality (the overlay is the operator surface; Raycast is retired scaffolding).

## Consult provenance

Design consulted with **codex** (read-only `codex exec`, 2026-05-29) before authoring — a design consult, not a review-queue tick. Codex's load-bearing corrections, all incorporated: (1) the three commands are not equivalent — `echo` defaults KEEP-BLOCKED; (2) "near-zero journal usage" is too weak — hardened the disuse predicate to artifact-check + attestation + no-builder-inference (AC3); (3) `blocked_by: 080-AC8` fails `tools/blocked.py` validation — park in Inbox with a manual gate instead (verified against `tools/blocked.py`); (4) strategist owns disposition, make partial-removal explicit, require a dependency map (AC2/AC4/AC7-OoS-6); (5) bottom line — ship the per-command-disposition restructure, not a blunt whole-extension delete. Reviewer roster for the formal cross-tool review at promotion: `["codex", "codex-ops"]`.
