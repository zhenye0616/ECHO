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
  - src/echo-home/adapter-sync.ts                  # AC3 — syncAll threads the profile to skill-sync + gates role/workflow sync (customer skips, represented as a successful no-op so computeOverallOk stays true).
  - tests/echo-home/adapter-sync.test.ts           # AC7 — customer-skip is a successful no-op (not undefined→failure); dogfood preserves today's role/workflow behavior.
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
- **J6 — RESOLVED (r2): reprofile auto-prune DROPPED.** r1 added an AC2b auto-prune of stale dogfood artifacts; r2 found it generated its own bug surface (the `cli/inverse` helper is `skills.ts` not `skill-files.ts`; hop-2 removal compares against a hop-1 source that the prune itself deletes first; and **roles/workflows carry no ownership marker**, so marker-gated deletion is impossible and name-based deletion risks user data-loss). Per removal-over-deeper-patching discipline AND because the reprofile case **cannot occur in V1** (the n=1 coworker is a fresh machine; the founder stays dogfood via AC4(b)), the prune is removed and the guarantee narrowed to **fresh** customer installs (OoS#1b). This was codex r1 F1's own sanctioned alternative ("or explicitly narrow the promise to fresh installs"). No file-deletion mechanism ships in 084 → no data-loss surface.

## Acceptance criteria

- **AC1 — profile selector + persistence.** `echoctl init` accepts `--profile customer|dogfood` (and an answer-file `profile` field). Resolution: explicit flag > recorded `onboarding.json` profile > default `customer` (Locked #2). The resolved profile is written to `onboarding.json` (AC4). Re-running `init` on a machine with a recorded profile and no flag does NOT change it.
- **AC2 — skill audience filter (FRESH install).** Skills carry `audience: customer|dogfood` frontmatter (`using-echo-mcp` = customer, `using-echo-coord` = dogfood; untagged ⇒ customer per J4). A `customer` install syncs only `audience: customer` skills onto the machine (J3 hop-1); a `dogfood` install syncs all. **On a fresh customer install no `/using-echo-coord` command is ever created** (the guarantee is fresh-install scoped — reprofile cleanup is explicitly OoS, see OoS#1b, per codex r2 F1's sanctioned "narrow the promise to fresh installs" disposition).
- **AC3 — role/workflow gate.** A `customer` install does NOT sync coord roles (`~/.echo/roles/`) or workflows (`~/.echo/workflows/`); a `dogfood` install syncs both (today's behavior). (J5.) The customer skip MUST be represented in `syncAll`'s result as a **successful skipped/no-op** (NOT an `undefined` `workflowsResult`/`roles` that `computeOverallOk` reads as failure — codex r1 F3 + codex-ops r1 F6): a correct customer install exits 0 / `doctor` healthy, never degraded for skipping coord sync.
- **AC4 — onboarding.json schema + deterministic missing-profile rule, resolved+persisted before any fallible step (codex r1 F2 + codex-ops r1 F5; hardened per codex-ops r2 F3).** `onboarding.json` gains a `profile` field (+ Ajv validator). Resolution order is load-bearing: capture `had_onboarding_before_init` (does `onboarding.json` exist?) **before** `ensureEchoHome()` runs, then resolve and **persist `profile` atomically into the freshly-scaffolded onboarding.json BEFORE any fallible sync/wire step** — so an interrupted fresh install never leaves a valid profile-less file that a rerun would misread as legacy. The deterministic rule: **(a) no onboarding file before init ⇒ fresh ⇒ `customer`; (b) an existing valid schema-v1 onboarding file lacking `profile` ⇒ legacy ⇒ `dogfood`** (back-compat: the founder's existing machine keeps its full surface; emit a one-line migration note). The two states must NOT collapse. doctor consumes the field (AC5).
- **AC5 — doctor reports profile.** `echoctl doctor` shows the active profile in its output.
- **AC6 — smoke asserts the FRESH customer surface + the no-flip-on-rerun invariant.** `tools/foreign-install-smoke.sh`: (i) a default/customer install hard-asserts ONLY `using-echo-mcp` landed in the agent commands dir and `~/.echo/{roles,workflows}/` got no coord roles/workflows — mechanical non-zero fail on any leak; (ii) **re-running `init` (no flag) on that customer machine stays customer** (does NOT flip to dogfood / reinstall coord surface — the AC4 persistence invariant); (iii) a `--profile dogfood` invocation asserts the full surface lands.
- **AC7 — tests green.** New/updated tests for AC1–AC5 pass, including: `adapter-sync.test.ts` proving customer-skip is a successful no-op (not failure) while dogfood preserves today's role/workflow behavior; **both AC4 branches** (no onboarding file ⇒ customer; valid pre-084 file without `profile` ⇒ dogfood); and the **partial-scaffold regression** (onboarding.json scaffolded but profile not yet persisted, e.g. an init interrupted mid-run → the next run still resolves customer, not dogfood). Full `npm test` + typecheck green.
- **AC8 — no scope drift.** No file outside `files_to_modify` is touched; the Out-of-Scope list is honored.

## Out of Scope (Don't Drift)

1. **No change to what the tarball ships** — `package.json` `files` still ships BOTH audiences (Locked #1). The pack-time `using-echo-coord` exclusion is the separate one-build throwaway, NOT this item.
1b. **No reprofile/stale-artifact auto-prune (r2 removal).** The clean-surface guarantee is **fresh customer installs only**. Switching an EXISTING install from dogfood→customer does NOT auto-delete leftover coord skills/roles/workflows — `init` ships no file-deletion path (the data-loss risk + the missing roles/workflows ownership marker make auto-prune unsafe for V1, and the case cannot occur for the n=1 coworker or the founder). To convert an existing machine, run `echoctl uninstall` then re-init `--profile customer`. A safe reprofile cleanup (with a real ownership predicate for roles/workflows) is a **filed followup**, not this item.
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
- **File the reprofile-cleanup followup** in `backlog/_followups.md` (per OoS#1b): a safe dogfood→customer prune needs a real ownership predicate for roles/workflows (072/075 don't stamp one today) + correct hop-2-before-hop-1 removal order against the packaged asset — deferred out of 084 to keep V1 free of a file-deletion path. Low priority (no V1 user hits it).

## Consult provenance

Originating decision: 2026-05-27 install-profile-split (sessions `5c6b839c` + codex consults `019e676d`/`019e67bc` — "internal coord skills stay dogfood-only"), retrieved via ECHO on 2026-06-02 and independently reproduced by a codex ECHO consult (both converged: the `/using-echo-coord` leak is the unbuilt install-profile-split). Sized as the durable fix behind the tomorrow-only pack-time trim. Blocked on 083 (shared `init.ts`/smoke seams).
