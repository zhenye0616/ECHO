---
id: 2026-06-02-084-install-profile-split
title: "`echoctl init` install-profile split — customer-default vs dogfood-opt-in (stop the coord-surface leak onto customer machines)"
status: ready
priority: HIGH
estimate: 1-1.5d
created: 2026-06-02
blocked_by:
  - 2026-06-01-083-init-registers-claude-code-mcp
task_state_ref: 2026-06-02-084-install-profile-split
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - src/cli/commands/init.ts                       # AC1 — add `--profile customer|dogfood` flag + answer-file `profile` field; thread the resolved profile into wire/skill-sync; persist it. SHARED SEAM with 083 (init.ts) → this item is blocked_by 083; build after 083 merges.
  - src/echo-home/adapters/skill-sync.ts           # AC2 — filter the first-hop copy (assets/echo-skills/ → ~/.echo/skills/) by each skill's `audience` frontmatter against the active profile, so dogfood-only skills never land on a customer machine.
  - src/echo-home/adapter-sync.ts                  # AC2/AC2b/AC3 — syncAll threads the profile to skill-sync + gates role/workflow sync (customer skips, represented as successful no-op so computeOverallOk stays true), and drives the AC2b prune on customer profile.
  - src/cli/inverse/skill-files.ts                 # AC2b — REUSE 074's echo-owned-skill removal (marker-gated) to prune dogfood-only hop-1/hop-2 skills on a customer install. (Builder confirms exact 074 inverse-module names; this is the removal discipline, not a new mechanism.)
  - tests/echo-home/adapter-sync.test.ts           # AC7 — customer-skip is a successful no-op (not undefined→failure); dogfood preserves today's role/workflow behavior; AC2b prune of seeded stale artifacts.
  - src/echo-home/paths.ts                         # AC4 — add `profile: "customer" | "dogfood"` to the onboarding.json schema (+ Ajv validator); default-absent tolerated for pre-084 installs.
  - src/echo-home/wizard/wire.ts                   # AC1 — accept + forward the profile to syncAll (the wizard already owns the wire orchestration).
  - src/cli/commands/doctor.ts                     # AC5 — doctor reports the active profile.
  - assets/echo-skills/using-echo-mcp.md           # AC2 — add `audience: customer` frontmatter.
  - assets/echo-skills/using-echo-coord.md         # AC2 — add `audience: dogfood` frontmatter.
  - tools/foreign-install-smoke.sh                 # AC6 — assert a default (customer) install lands ONLY using-echo-mcp (no /using-echo-coord, no roles, no workflows). SHARED SEAM with 083 (smoke) → blocked_by 083.
  - tests/echo-home/adapters/skill-sync.test.ts    # AC7 — audience filtering by profile.
  - tests/cli/init.test.ts                         # AC7 — flag parse + default + persistence + re-run-respects-recorded-profile.
  - tests/cli/doctor.test.ts                       # AC7 — doctor surfaces the profile.

spec_refs:
  - backlog/{ready,pending_review,complete}/2026-06-01-083-init-registers-claude-code-mcp.md  # SHARED SEAMS: 083 also edits init.ts + foreign-install-smoke.sh + docs/echoctl-install.md. 084 is blocked_by 083 so the builder works on top of 083's merged init.ts/smoke, not in parallel.
  - src/echo-home/adapters/skill-sync.ts  # THE mechanism: two-hop copy (assets/echo-skills/*.md → ~/.echo/skills/ → per-vendor commands dir), NOT role-gated today → both using-echo-* land as slash-commands on every machine. This is the leak 084 closes.
  - src/echo-home/adapter-sync.ts  # syncAll orchestrator: calls skill-sync + role-sync + workflow-sync. The profile gate lives here + in skill-sync.
  - src/echo-home/adapters/role-sync.ts  # 072's role TOML sync (assets/echo-roles/ → ~/.echo/roles/). Customer profile skips this (J5).
  - src/echo-home/adapters/workflow-sync.ts  # 075's workflow sync (assets/echo-workflows/ → ~/.echo/workflows/). Customer profile skips this (J5).
  - src/echo-home/paths.ts  # 070's onboarding.json schema + ECHO_HOME_PATHS; the `profile` field lands here.
  - src/cli/commands/init.ts  # 074's init: TTY prompts + answer-file (`--answer-file`) path. The `--profile` flag + answer-file `profile` field land here.
  - raw/internal/decisions/2026-05-25-echo-pro-paid-coord-layer-design.md  # the 070-075 coord-layer design this profiles; §"slash-command pollution" is the originating concern.
  - backlog/{ready,pending_review,complete}/2026-05-26-076-packaged-echoctl-install-boundary.md  # 076 set the tarball `files` allowlist (ships BOTH audiences). 084 does NOT change what ships — it filters at INSTALL time (see Locked #1).

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

## Why (the friction this closes)

`echoctl init` has **one install path: everything goes to everyone.** Skill-sync's two-hop copy (`assets/echo-skills/*.md` → `~/.echo/skills/` → each vendor's commands dir) is not role-gated, so on *any* machine BOTH `using-echo-mcp` and `using-echo-coord` land as slash-commands, and roles + the `change-review` workflow drop into `~/.echo/`. There's no notion of *who* is installing.

That means a customer/alpha machine (where the coordination pipeline is meaningless — they don't have `backlog/`, the review-queue scripts, or the multi-agent loop) gets the founder's full dogfood surface, including a `/using-echo-coord` command. On **2026-05-27** this was named a **product-shape bug** and the agreed fix was an **install-profile split** (customer-default vs dogfood-opt-in); it was specced in conversation but never built. The n=1 concierge install (Tue 2026-06-02) surfaces it live: the coworker would see coord surface that's off-message for the personal-context-layer positioning. (A one-build pack-time trim is the throwaway stopgap for *tomorrow*; this item is the durable fix.)

## What this is — and what it deliberately is NOT

A **friction-fix**: teach `init` *who it's installing for* and ship a different agent-facing coordination surface per profile. It is NOT a new product surface, NOT a capability/ACL system, NOT a change to what the tarball ships.

## Locked decisions (founder, 2026-05-27 + 2026-06-02)

1. **Filter at INSTALL time, not pack time.** The tarball still ships BOTH audiences (a dogfood install must be able to use `using-echo-coord`); 084 gates what `init` *installs/wires onto the machine*. (The pack-time exclusion of `using-echo-coord` is a separate one-build throwaway for tomorrow — explicitly NOT this item.)
2. **Default `customer` for FRESH installs; persist + respect on re-run.** A fresh install (no `profile` recorded in `onboarding.json`) defaults to `customer`. If a profile is already recorded, re-running `init` defaults to the recorded value — so the founder's existing dogfood machine is NOT silently downgraded. The founder sets `--profile dogfood` once and it sticks.
3. **Customer = substrate + retrieval only.** Customer profile syncs ONLY `audience: customer` skills (`using-echo-mcp`); it does NOT sync `using-echo-coord`, the coord roles (strategist/reviewer/builder), or the `change-review` workflow. Dogfood profile = today's full behavior.
4. **Profile gates the AGENT-FACING surface only, not the daemon.** The daemon's coord MCP tools (`coord_emit`/`coord_invoke`/`coord_status`) stay registered regardless of profile — they're invisible substrate (nothing advertises them to an agent except the `using-echo-coord` skill, which IS gated). Gating the daemon is out of scope.

## Judgment calls (flagged for r1 reviewers)

- **J1 — selector: `--profile` flag (+ persist) vs auto-detection.** Lean: explicit `echoctl init --profile customer|dogfood` + answer-file `profile` field, persisted in onboarding.json; default per Locked #2. Auto-detection (source-repo-present → dogfood) is magic and brittle — reject unless a reviewer makes a strong case.
- **J2 — `audience` frontmatter tag vs directory split.** Lean: add `audience: customer|dogfood` frontmatter to each shipped skill and filter in skill-sync. Lighter than restructuring into `assets/echo-skills/{customer,internal}/`; precedent = 074's `<!-- echo-owned-skill -->` first-line marker.
- **J3 — filter at hop-1 (don't land dogfood skills in `~/.echo/skills/` at all on customer) vs hop-2 (land but don't command-ify).** Lean hop-1: a customer machine never has the coord skill on disk. Cleaner and leaves no half-state.
- **J4 — unknown/legacy `audience` (a skill with no tag).** Lean: untagged skill defaults to `customer` (safe — visible everywhere as today), so adding the field is non-breaking; only `using-echo-coord` is explicitly `dogfood`.
- **J5 — customer roles/workflows: skip sync entirely vs sync-but-inert.** Lean: skip entirely (strategist/reviewer/builder + `change-review` are meaningless without the pipeline). Reviewers confirm whether any customer-useful workflow should survive (none today).
- **J6 — prune scope + safety (AC2b).** Lean: prune ONLY echo-owned `audience: dogfood` artifacts, gated by the 074 echo-owned marker / `cli/inverse/*` discipline — never touch user-authored files in `~/.echo/skills`, `~/.echo/roles`, `~/.echo/workflows`, or vendor command dirs. Reviewers confirm the marker covers all three artifact types (skills definitely; roles/workflows may need an equivalent ownership check — flag if 072/075 didn't mark them, in which case prune keys on the known shipped asset names instead).

## Acceptance criteria

- **AC1 — profile selector + persistence.** `echoctl init` accepts `--profile customer|dogfood` (and an answer-file `profile` field). Resolution: explicit flag > recorded `onboarding.json` profile > default `customer` (Locked #2). The resolved profile is written to `onboarding.json` (AC4). Re-running `init` on a machine with a recorded profile and no flag does NOT change it.
- **AC2 — skill audience filter.** Skills carry `audience: customer|dogfood` frontmatter (`using-echo-mcp` = customer, `using-echo-coord` = dogfood; untagged ⇒ customer per J4). A `customer` install syncs only `audience: customer` skills onto the machine (J3 hop-1); a `dogfood` install syncs all. No `/using-echo-coord` command exists after a customer install.
- **AC2b — reprofile/stale cleanup (codex r1 F1 + codex-ops r1 F4, convergent HIGH).** Sync is write/noop-oriented and leaves stale targets, so filtering future copies is NOT sufficient: a machine with a prior all-surface/dogfood install (or a dogfood→customer switch) would keep `~/.echo/skills/using-echo-coord.md`, its hop-2 vendor command, and `~/.echo/{roles,workflows}/` contents, and `init --profile customer` would return success while the coord surface SURVIVES. A `customer` install MUST therefore **prune** echo-owned `audience: dogfood` artifacts already present: hop-1 (`~/.echo/skills/`) AND hop-2 (vendor command dirs) skills, plus echo-owned coord roles/workflows. Removal is gated by the existing echo-owned marker (074's `<!-- echo-owned-skill -->` + the `cli/inverse/*` removal discipline) so **user-authored files are never deleted**. A subsequent `--profile dogfood` re-init restores the full surface.
- **AC3 — role/workflow gate.** A `customer` install does NOT sync coord roles (`~/.echo/roles/`) or workflows (`~/.echo/workflows/`); a `dogfood` install syncs both (today's behavior). (J5.) The customer skip MUST be represented in `syncAll`'s result as a **successful skipped/no-op** (NOT an `undefined` `workflowsResult`/`roles` that `computeOverallOk` reads as failure — codex r1 F3 + codex-ops r1 F6): a correct customer install exits 0 / `doctor` healthy, never degraded for skipping coord sync.
- **AC4 — onboarding.json schema + deterministic missing-profile rule (codex r1 F2 + codex-ops r1 F5, convergent MEDIUM).** `onboarding.json` gains a `profile` field (+ Ajv validator). The missing-profile resolution is a **single deterministic rule keyed on whether `onboarding.json` pre-existed THIS init run** (captured from `ensureEchoHome()`'s created-vs-existed signal BEFORE profile resolution, since `ensureEchoHome` writes the file before resolution): **(a) no onboarding file before init ⇒ fresh ⇒ `customer`; (b) an existing valid schema-v1 onboarding file lacking `profile` ⇒ legacy ⇒ `dogfood`** (back-compat: the founder's existing machine keeps its full surface; emit a one-line migration note). This removes the builder-discretion ambiguity — the two states must NOT collapse to one. doctor consumes the field (AC5).
- **AC5 — doctor reports profile.** `echoctl doctor` shows the active profile in its output.
- **AC6 — smoke asserts the customer surface, incl. stale-artifact prune.** `tools/foreign-install-smoke.sh`: (i) a default/customer install hard-asserts ONLY `using-echo-mcp` landed in the agent commands dir and `~/.echo/{roles,workflows}/` got no coord roles/workflows — mechanical non-zero fail on any leak; (ii) **seed the sandbox with stale dogfood artifacts** (`~/.echo/skills/using-echo-coord.md` + a hop-2 vendor command + a role + a workflow), run a customer install, and hard-assert they are **removed** (proves AC2b); (iii) a `--profile dogfood` invocation asserts the full surface still lands.
- **AC7 — tests green.** New/updated tests for AC1–AC5 + AC2b pass, including: `adapter-sync.test.ts` proving customer-skip is a successful no-op (not failure) while dogfood preserves today's role/workflow behavior; the prune of seeded stale dogfood skills/roles/workflows on a reprofile run; and both AC4 branches (no onboarding file ⇒ customer; pre-084 file without `profile` ⇒ dogfood). Full `npm test` + typecheck green.
- **AC8 — no scope drift.** No file outside `files_to_modify` is touched; the Out-of-Scope list is honored.

## Out of Scope (Don't Drift)

1. **No change to what the tarball ships** — `package.json` `files` still ships BOTH audiences (Locked #1). The pack-time `using-echo-coord` exclusion is the separate one-build throwaway, NOT this item.
2. **No third "orchestrator" profile** — the wedge-is-the-loop "coord IS the product for orchestrators" future is deferred; V1 is exactly two profiles.
3. **No gating of the daemon's coord MCP tools** (`coord_emit`/`coord_invoke`/`coord_status`) — substrate stays whole (Locked #4).
4. **No per-skill capability/ACL system** — `audience` is a single coarse tag, not a permission model.
5. **No remote / multi-machine profile management or sync.**
6. **No auto-detection of profile** unless a reviewer overturns J1 — explicit flag + persistence only.
7. **Do not reorder or re-architect 083's MCP-registration work** — 084 builds ON TOP of merged 083 (`blocked_by`); touch the shared `init.ts`/smoke seams minimally.

## After Completion (Strategist Notes)

- Once 084 ships, the **pack-time B-tactical trim is obsolete** — every pack is correct by construction. Note this in `docs/echoctl-install.md`'s install section (a `--profile` line) when promoting.
- The founder runs `echoctl init --profile dogfood` once on his own machine to keep the full coordination surface; document that in the dogfooding setup notes.
- Wiki: fold the profile concept into the echoctl/onboarding page alongside 076's install-boundary, only post-shipment.
- If the "orchestrator profile" (coord-as-product) ever graduates per wedge-is-the-loop, it's a NEW profile value + spec, not a reopening of this item.

## Consult provenance

Originating decision: 2026-05-27 install-profile-split (sessions `5c6b839c` + codex consults `019e676d`/`019e67bc` — "internal coord skills stay dogfood-only"), retrieved via ECHO on 2026-06-02 and independently reproduced by a codex ECHO consult (both converged: the `/using-echo-coord` leak is the unbuilt install-profile-split). Sized as the durable fix behind the tomorrow-only pack-time trim. Blocked on 083 (shared `init.ts`/smoke seams).
