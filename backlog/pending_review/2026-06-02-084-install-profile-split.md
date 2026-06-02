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
  - src/echo-home/wizard/run-wizard.ts             # AC1 — the public `Wizard.wire()` API init.ts calls is declared here; its `Pick<WireOpts,...>` must accept + forward `profile` to wireAgents() (else passing profile from init.ts is a typecheck failure). codex r4 F1.
  - src/cli/commands/doctor.ts                     # AC5 — doctor reports the active profile (JSON/report-model side).
  - src/cli/io/render.ts                           # AC5 — render the profile in `renderDoctorReport()` text output (codex/codex-ops r3: text path is silent otherwise + AC8 forbids touching it if unlisted).
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
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-06-02T08:31:53Z"
branch: "agent/install-profile-split"
worktree: "/Users/zhenye/Desktop/Project_echo--install-profile-split"
head_sha: "f144bb4c0a8e15371c61ea8b410da77e32ed8f4a"
pr_url: ""
agent_notes: |
  Implemented `echoctl init` install profiles on `agent/install-profile-split` at `f144bb4c0a8e15371c61ea8b410da77e32ed8f4a`: CLI/answer-file/recorded/default profile resolution, onboarding persistence + profile-less warning, customer skill filtering, customer role/workflow no-op skips, dogfood full-surface preservation, doctor profile output, and smoke-script assertions.
  Verification: focused profile vitest (4 files / 70 tests), `npm run typecheck`, `npm run lint`, full `npm test` (142 files passed / 1 skipped; 1505 tests passed / 21 skipped), `npm run build:cli`, `bash -n tools/foreign-install-smoke.sh`, and `git diff --check` passed. Full foreign-install smoke was not executed because the script hardcodes `$HOME/Desktop/Project_echo`, which would exercise main rather than the sibling feature worktree.
review_notes: ""
---

## Why (the friction this closes)

`echoctl init` has **one install path: everything goes to everyone.** Skill-sync's two-hop copy (`assets/echo-skills/*.md` → `~/.echo/skills/` → each vendor's commands dir) is not role-gated, so on *any* machine BOTH `using-echo-mcp` and `using-echo-coord` land as slash-commands, and roles + the `change-review` workflow drop into `~/.echo/`. There's no notion of *who* is installing.

That means a customer/alpha machine (where the coordination pipeline is meaningless — they don't have `backlog/`, the review-queue scripts, or the multi-agent loop) gets the founder's full dogfood surface, including a `/using-echo-coord` command. On **2026-05-27** this was named a **product-shape bug** and the agreed fix was an **install-profile split** (customer-default vs dogfood-opt-in); it was specced in conversation but never built. The n=1 concierge install (Tue 2026-06-02) surfaces it live: the coworker would see coord surface that's off-message for the personal-context-layer positioning. (A one-build pack-time trim is the throwaway stopgap for *tomorrow*; this item is the durable fix.)

## What this is — and what it deliberately is NOT

A **friction-fix**: teach `init` *who it's installing for* and ship a different agent-facing coordination surface per profile. It is NOT a new product surface, NOT a capability/ACL system, NOT a change to what the tarball ships.

## Locked decisions (founder, 2026-05-27 + 2026-06-02)

1. **Filter at INSTALL time, not pack time.** The tarball still ships BOTH audiences (a dogfood install must be able to use `using-echo-coord`); 084 gates what `init` *installs/wires onto the machine*. (The pack-time exclusion of `using-echo-coord` is a separate one-build throwaway for tomorrow — explicitly NOT this item.)
2. **Missing recorded profile ⇒ `customer`, unconditionally; founder opts into dogfood explicitly (persisted + respected).** No `profile` recorded ⇒ `customer` — with NO inference from onboarding state (the r1–r3 "infer legacy from `completed`/`agents`" discriminator was removed in r4 after it kept generating crash-window findings; see J7). The founder sets `--profile dogfood` ONCE; it persists and every later no-flag re-init respects it. To avoid a SILENT downgrade of a pre-084 machine, init emits a LOUD one-line warning when it defaults an existing-but-profile-less onboarding file to customer (telling the founder to re-run `--profile dogfood`). Universal-customer-default means **no fresh install can ever flip to dogfood on a crash/retry** — the whole partial-scaffold class is dissolved.
3. **Customer = substrate + retrieval only.** Customer profile syncs ONLY `audience: customer` skills (`using-echo-mcp`); it does NOT sync `using-echo-coord`, the coord roles (strategist/reviewer/builder), or the `change-review` workflow. Dogfood profile = today's full behavior.
4. **Profile gates the AGENT-FACING surface only, not the daemon.** The daemon's coord MCP tools (`coord_emit`/`coord_invoke`/`coord_status`) stay registered regardless of profile — they're invisible substrate (nothing advertises them to an agent except the `using-echo-coord` skill, which IS gated). Gating the daemon is out of scope.

## Judgment calls (flagged for r1 reviewers)

- **J1 — selector: `--profile` flag (+ persist) vs auto-detection.** Lean: explicit `echoctl init --profile customer|dogfood` + answer-file `profile` field, persisted in onboarding.json; default per Locked #2. Auto-detection (source-repo-present → dogfood) is magic and brittle — reject unless a reviewer makes a strong case.
- **J2 — `audience` frontmatter tag vs directory split.** Lean: add `audience: customer|dogfood` frontmatter to each shipped skill and filter in skill-sync. Lighter than restructuring into `assets/echo-skills/{customer,internal}/`; precedent = 074's `<!-- echo-owned-skill -->` first-line marker.
- **J3 — filter at hop-1 (don't land dogfood skills in `~/.echo/skills/` at all on customer) vs hop-2 (land but don't command-ify).** Lean hop-1: a customer machine never has the coord skill on disk. Cleaner and leaves no half-state.
- **J4 — unknown/legacy `audience` (a skill with no tag).** Lean: untagged skill defaults to `customer` (safe — visible everywhere as today), so adding the field is non-breaking; only `using-echo-coord` is explicitly `dogfood`.
- **J5 — customer roles/workflows: skip sync entirely vs sync-but-inert.** Lean: skip entirely (strategist/reviewer/builder + `change-review` are meaningless without the pipeline). Reviewers confirm whether any customer-useful workflow should survive (none today).
- **J7 — RESOLVED (r4): legacy-inference discriminator DROPPED.** r1–r3 tried to infer "is this the founder's legacy install?" from onboarding state (file-presence → then `completed`/`agents`) so a no-flag re-init wouldn't downgrade him. Every refinement surfaced a new crash window (r2 atomic-ordering, r3 `completed`/agents, r4 mid-wire agents-before-completion). Removed: missing profile ⇒ `customer` unconditionally (AC4); the founder opts into dogfood explicitly + a loud warning prevents silent downgrade. No state-inference → no crash window → the partial-scaffold class is gone. (Removal-over-deeper-patching: the convenience of auto-detecting the founder's intent wasn't worth a tail of ordering bugs.)
- **J6 — RESOLVED (r2): reprofile auto-prune DROPPED.** r1 added an AC2b auto-prune of stale dogfood artifacts; r2 found it generated its own bug surface (the `cli/inverse` helper is `skills.ts` not `skill-files.ts`; hop-2 removal compares against a hop-1 source that the prune itself deletes first; and **roles/workflows carry no ownership marker**, so marker-gated deletion is impossible and name-based deletion risks user data-loss). Per removal-over-deeper-patching discipline AND because the reprofile case **cannot occur in V1** (the n=1 coworker is a fresh machine; the founder stays dogfood via AC4(b)), the prune is removed and the guarantee narrowed to **fresh** customer installs (OoS#1b). This was codex r1 F1's own sanctioned alternative ("or explicitly narrow the promise to fresh installs"). No file-deletion mechanism ships in 084 → no data-loss surface.

## Acceptance criteria

- **AC1 — profile selector + persistence + explicit precedence (hardened per codex-ops r3 F3).** `echoctl init` accepts `--profile customer|dogfood` and an answer-file `profile` field. **Resolution precedence (highest wins): CLI `--profile` > answer-file `profile` > recorded `onboarding.json` profile > `customer` default (AC4 — unconditional, no inference).** The resolved profile is written to `onboarding.json` (AC4). Re-running `init` with no flag/answer-file profile on a machine with a recorded profile does NOT change it. A scripted no-TTY install passing `profile: dogfood` in its answer file MUST come up dogfood (not silently customer) — covered by an answer-file test (AC7).
- **AC2 — skill audience filter (FRESH install).** Skills carry `audience: customer|dogfood` frontmatter (`using-echo-mcp` = customer, `using-echo-coord` = dogfood; untagged ⇒ customer per J4). A `customer` install syncs only `audience: customer` skills onto the machine (J3 hop-1); a `dogfood` install syncs all. **On a fresh customer install no `/using-echo-coord` command is ever created** (the guarantee is fresh-install scoped — reprofile cleanup is explicitly OoS, see OoS#1b, per codex r2 F1's sanctioned "narrow the promise to fresh installs" disposition).
- **AC3 — role/workflow gate.** A `customer` install does NOT sync coord roles (`~/.echo/roles/`) or workflows (`~/.echo/workflows/`); a `dogfood` install syncs both (today's behavior). (J5.) The customer skip MUST be represented in `syncAll`'s result as a **successful skipped/no-op** (NOT an `undefined` `workflowsResult`/`roles` that `computeOverallOk` reads as failure — codex r1 F3 + codex-ops r1 F6): a correct customer install exits 0 / `doctor` healthy, never degraded for skipping coord sync.
- **AC4 — onboarding.json schema + universal-customer-default for missing profile (discriminator REMOVED in r4 per codex-ops r4 F1).** `onboarding.json` gains a `profile` field (+ Ajv validator); the resolved profile is persisted there. **When no `profile` is recorded, resolve `customer` — UNCONDITIONALLY**, with no inference from `completed`/`agents`/file-presence. Rationale: every attempted discriminator collided with a crash window (`ensureEchoHome` writes the file before init persists profile; `wire()` writes `agents` before completion — so "interrupted fresh customer" and "legacy install" can present identically), and each refinement surfaced a new window (r2→r3→r4). Universal-customer-default has no window to misread: a fresh customer install interrupted at ANY point re-resolves `customer` on retry; it can never flip to dogfood. Back-compat (no SILENT downgrade): when an existing onboarding file lacks `profile` and neither `--profile` nor an answer-file profile was given, init emits a LOUD one-line warning — "defaulted to `customer`; re-run `echoctl init --profile dogfood` to restore the full coordination surface." The founder opts in once; AC1 then respects the recorded value. doctor consumes the field (AC5).
- **AC5 — doctor reports profile (text + JSON).** `echoctl doctor` shows the active profile in BOTH its JSON report (`doctor.ts`) and its human text output (`renderDoctorReport()` in `src/cli/io/render.ts` — added to `files_to_modify` per codex r3 F1 + codex-ops r3 F2; without it the text path stays silent and the first support check can't tell `customer` from `dogfood`). The doctor test asserts the text path, not only JSON/model state.
- **AC6 — smoke asserts the FRESH customer surface + no-flip invariant.** `tools/foreign-install-smoke.sh`: (i) a default/customer install hard-asserts ONLY `using-echo-mcp` landed in the agent commands dir and `~/.echo/{roles,workflows}/` got no coord roles/workflows — mechanical non-zero fail on any leak; (ii) **re-running `init` (no flag) on that customer machine stays customer** (per AC4 universal-customer-default + recorded-profile respect — never flips to dogfood); (iii) a `--profile dogfood` invocation asserts the full surface lands.
- **AC7 — tests green.** New/updated tests for AC1–AC5 pass, including: `adapter-sync.test.ts` proving customer-skip is a successful no-op (not failure) while dogfood preserves today's role/workflow behavior; **the AC1 precedence chain** incl. a no-TTY answer-file `profile: dogfood` install coming up dogfood (not customer); **AC4 universal-customer-default** — any missing-`profile` onboarding state (no file; bare scaffold; `completed:true`+agents without profile; mid-wire `completed:false`+agents without profile) ALL resolve `customer` (no flip to dogfood at any crash point), and a recorded `dogfood` is respected on re-run; **the pre-084 loud-warning path** (existing profile-less file + no flag ⇒ customer WITH the restore warning); and the **doctor text-output** profile assertion (AC5). Full `npm test` + typecheck green.
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
