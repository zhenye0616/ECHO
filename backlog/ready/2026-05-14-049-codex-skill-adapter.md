---
id: 2026-05-14-049-codex-skill-adapter
title: Codex skill adapter — third sync target for `tools/sync-skills.sh` + vendor-neutralization of `skills/review-pending.md` body
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-14
blocked_by: []
task_state_ref: 2026-05-14-049-codex-skill-adapter
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  - tools/sync-skills.sh  # extend with codex target — directory wrapper + frontmatter transform + --check verification
  - adapters/codex/skills/  # NEW directory — tracked codex adapter target (mirror of canonical skills/ in codex's SKILL.md format)
  - skills/review-pending.md  # vendor-neutralize body — abstract subagent dispatch mechanism + binding-specific notes (Claude Code / codex)
  - .claude/commands/review-pending.md  # re-synced from canonical after the body change
  - tools/install-codex-adapters.sh  # NEW — one-time user setup helper to symlink adapters/codex/skills/* → ~/.codex/skills/*
  - tests/sync-skills/codex-adapter.test.ts  # NEW — byte-identity body, frontmatter transform, --check failure modes
  - AGENTS.md  # add codex skill discovery section (one paragraph + the install-codex-adapters.sh reference)
spec_refs:
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # the codex-as-builder binding adapter — established the per-skill binding-specific-notes pattern in skills/process-backlog.md that 049 extends to skills/review-pending.md
  - skills/process-backlog.md  # AC2 reference: the "Binding-specific notes — codex" section pattern this spec mirrors for review-pending
  - tools/sync-skills.sh  # AC1 target — header comment names "Codex / web ChatGPT: TBD (future: MCP echo_skill(name) tool, served from skills/)" — 049 makes this concrete via adapters/codex/skills/
  - skills/review-pending.md  # AC2 target — currently has Claude-Agent-tool-specific dispatch language that this spec abstracts
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # the cross-tool protocol decision; 049 operationalizes the third adapter target the decision anticipated
  - ~/.codex/skills/.system/skill-creator/SKILL.md  # codex's native skill anatomy reference (frontmatter shape, progressive disclosure design)

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

# Codex skill adapter

## Why this spec exists

ECHO's cross-tool collaboration protocol is hosted in `skills/<name>.md` (vendor-neutral, ECHO-namespaced). `tools/sync-skills.sh` fans those canonical files out to per-client adapter directories so every binding's skill discovery picks up byte-identical content. Today only one adapter target exists — `.claude/commands/<name>.md` for Claude Code (and reused by Cursor's Claude via Cursor's compatibility). The sync script's header comment explicitly anticipates `Codex / web ChatGPT: TBD (future: MCP echo_skill(name) tool, served from skills/)` as future work.

On 2026-05-14 the founder activated codex's native `skill-creator`, surfacing that Codex CLI v0.130.0 ships a first-class skill system at `~/.codex/skills/<name>/SKILL.md` with the directory-wrapped progressive-disclosure anatomy (`SKILL.md` + optional `agents/openai.yaml`, `scripts/`, `references/`, `assets/`). The "TBD" assumption that codex would need an MCP-served retrieval path is now obsolete — codex auto-discovers skills from a filesystem location, same shape as Claude Code, just at a different path with a slightly different frontmatter.

This serves north star (e2) directly. Today Cursor's Claude can use `/review-pending` because `.claude/commands/` is byte-identical to canonical. Codex cannot — there's no codex-side adapter. Wiring the third adapter target makes EVERY canonical skill cross-binding by construction, not by per-skill manual ports. It also closes the "codex strategist test" found gap that codex couldn't invoke ECHO skills via slash command — the friction observed empirically in the 048 cycle when codex strategist needed to be fed prompts inline rather than fire `/review-queue-watch`.

The work is narrow: add the adapter target + transform, vendor-neutralize ONE canonical skill body (`review-pending` — the most Claude-Agent-tool-coupled today) as the proof, defer remaining canonical-body neutralization to followups. The 047 pattern for codex-specific notes appended to vendor-neutral protocol bodies is the template.

## Acceptance Criteria

### AC1 — `tools/sync-skills.sh` extension: codex adapter target

- Add `adapters/codex/skills/` as the tracked codex-side adapter directory in the repo. Same role as `.claude/commands/` but for codex.
- For each canonical `skills/<name>.md` (excluding `using-superpowers.md` and `role-typed-task-state.md` — see Out of Scope), the sync writes:
  - `adapters/codex/skills/<name>/SKILL.md` with codex-required YAML frontmatter:
    - `name: <name>` (from canonical filename basename without `.md`)
    - `description: <canonical's description field>` (passthrough)
    - `metadata.short-description: <first 80 chars of description, truncated at last whole word>` (deterministic transform)
  - Body byte-identical to the canonical's body (everything below the closing `---` of canonical's frontmatter).
- Per-skill directory must contain ONLY `SKILL.md` for V1. `agents/openai.yaml` / `scripts/` / `references/` / `assets/` are out of scope (Risk R3 explains).
- `tools/sync-skills.sh --check` mode:
  - For each canonical skill, verify `adapters/codex/skills/<name>/SKILL.md` exists.
  - Verify body byte-identity (canonical body == adapter body below adapter's frontmatter).
  - Verify frontmatter has the three required keys with correct derivation.
  - Exit non-zero with a diagnostic if any check fails. Match the existing Claude Code adapter check shape.
- Default (no args) sync mode:
  - Creates `adapters/codex/skills/<name>/` directory if missing.
  - Writes `SKILL.md` (overwrite-safe — sync is the canonical operation).
  - Exits 0 on success; non-zero on any I/O failure.

### AC2 — Vendor-neutralize `skills/review-pending.md` body

- Replace Claude-specific dispatch language in the protocol body with vendor-neutral subagent-dispatch-primitive language. Concretely: "Spawn one `superpowers:code-reviewer` subagent per item, in parallel, via Agent tool calls" becomes "Dispatch one independent code-review process per item, in parallel, using your binding's subagent dispatch primitive."
- Add `## Binding-specific notes — Claude Code` section before `## Step C` (the synthesis step):
  - Names the Agent tool with `superpowers:code-reviewer` subagent_type as the Claude Code dispatch mechanism.
  - References `.claude/commands/review-pending.md` as the synced adapter.
- Add `## Binding-specific notes — codex` section adjacent to the Claude Code one:
  - Names `codex exec --sandbox workspace-write -C <repo> - < <per-item-prompt>` subprocess fan-out as the codex dispatch mechanism.
  - Each per-item codex exec produces a JSON-formatted review on stdout; orchestrator collects and synthesizes.
  - References `adapters/codex/skills/review-pending/SKILL.md` as the synced adapter target.
  - Notes that fan-out concurrency control = `&` + `wait` in a bash for-loop; suggests N ≤ 4 to avoid CPU saturation on the founder's machine.
- Mirror the 047 pattern in `skills/process-backlog.md` for the codex binding-specific notes section structure (header level, sandbox semantics, dogfooding journaling expectation).
- Re-sync via `tools/sync-skills.sh` so `.claude/commands/review-pending.md` and (post-AC1) `adapters/codex/skills/review-pending/SKILL.md` both reflect the new canonical body.

### AC3 — Tests

- Add `tests/sync-skills/codex-adapter.test.ts` (vitest):
  - **`materialized SKILL.md has codex-valid frontmatter`**: Run sync on a fixture canonical skill; assert `adapters/codex/skills/<name>/SKILL.md` exists; assert YAML parses; assert `name === basename`; assert `description === canonical.description`; assert `metadata.short-description` is non-empty and ≤80 chars.
  - **`body byte-identity holds`**: After sync, read canonical body (everything after closing `---`) and adapter body (everything after closing `---`); assert byte-for-byte equality.
  - **`--check passes on synced state`**: After sync, run `tools/sync-skills.sh --check`; assert exit 0; assert stderr empty.
  - **`--check fails on adapter body drift`**: After sync, mutate adapter body; run `--check`; assert exit non-zero; assert diagnostic names the drifted file.
  - **`--check fails on adapter frontmatter drift`**: After sync, mutate adapter frontmatter description; run `--check`; assert exit non-zero.
  - **`--check fails on missing adapter`**: Delete an adapter file; run `--check`; assert exit non-zero; assert diagnostic names the missing path.
- All tests use temporary fixture directories under `$TMPDIR` to avoid touching the real `adapters/codex/skills/`.
- Existing `npm run lint` + `npm run typecheck` + `tools/sync-skills.sh --check` remain clean post-change.

### AC4 — Deployment helper + AGENTS.md documentation

- Add `tools/install-codex-adapters.sh` (executable, mode 0755):
  - For each `adapters/codex/skills/<name>/` directory, create `~/.codex/skills/<name>` as a symlink pointing at the repo's `adapters/codex/skills/<name>/`.
  - On macOS/Linux, use `ln -snf "$REPO_ROOT/adapters/codex/skills/<name>" "$HOME/.codex/skills/<name>"` (force-overwrite-symlink semantics).
  - Refuse to overwrite a non-symlink existing path at `~/.codex/skills/<name>` (could be a manually-installed skill from `skill-installer`); exit non-zero with a clear message naming the conflicting path.
  - Idempotent: re-running on an already-symlinked target is a no-op (returns 0).
  - Dry-run mode: `--dry-run` prints planned operations without executing.
- Update `AGENTS.md` "Canonical Reads" section to add: "Codex skill discovery — if you are running as a codex binding and want ECHO's protocol skills to appear in your `/<name>` discovery, run `tools/install-codex-adapters.sh` once. This symlinks `adapters/codex/skills/*` into `~/.codex/skills/` so codex auto-discovers them at session start."

### AC5 — Materialize codex adapters in this commit

- Run `tools/sync-skills.sh` after AC1/AC2 implementation lands.
- Commit the resulting `adapters/codex/skills/<name>/SKILL.md` files for every canonical skill that's in-scope per AC1.
- These are tracked artifacts in the ECHO repo — version-controlled, reviewable in future cycles, and installable via `tools/install-codex-adapters.sh` or `codex` `skill-installer` from this GitHub repo path.
- After commit, `tools/sync-skills.sh --check` MUST return exit 0 clean.

## Out of Scope (Don't Drift)

- Do not vendor-neutralize ANY canonical `skills/<name>.md` other than `review-pending.md`. The remaining skills (`process-backlog.md` already has codex notes from 047; `review-queue-{codex,cursor,codex-ops,watch}.md`, `merge-and-cleanup.md`, `process-backlog-batch.md`, etc.) get their per-skill vendor-neutralization in followups, AFTER 049's pattern proves out.
- Do not include `using-superpowers.md` or `role-typed-task-state.md` in the codex adapter target. Both are ECHO-namespaced cold-start primers + schema docs, not slash-command-invokable workflows. They're read by file path, not via codex skill discovery. Including them would dilute codex's slash-command surface with non-actionable skills.
- Do not generate `agents/openai.yaml` UI metadata in V1. Codex's skill-creator marks this as RECOMMENDED, not required. Defer to a followup once the basic adapter target is wired.
- Do not generate `scripts/`, `references/`, or `assets/` subdirectories under `adapters/codex/skills/<name>/`. Each skill is a single `SKILL.md` for V1.
- Do not change `tools/sync-skills.sh`'s existing Claude Code adapter behavior (`.claude/commands/<name>.md` sync). The change is purely additive — codex adapter target is added; Claude Code adapter target preserved byte-for-byte.
- Do not modify `~/.codex/skills/.system/` (codex's built-in skills like `skill-creator`, `skill-installer`). Those are user-home, codex-owned; ECHO's adapter target is `~/.codex/skills/<name>` at the same level, never inside `.system/`.
- Do not implement the Claude-Agent-tool → codex-exec-fan-out mechanism in code. AC2 documents the codex-side mechanism in the canonical skill body; actual fan-out implementation (per-item codex exec subprocess orchestration, JSON output collection, synthesis) is a separate concern — the skill body PRESCRIBES it; codex following the prescription does the work. If implementing the codex-side fan-out turns out to need helper scripts, those land as a followup spec.
- Do not replace `.claude/commands/` with a different Claude Code adapter location. The directory naming is a Claude Code design choice ECHO inherits via Cursor compat; renaming would break Cursor's discovery.
- Do not modify any backlog item, wiki page, or `docs/` content outside the specifically-named files above.

## Risk Register

- **R1 — Codex frontmatter contract may evolve.** Today codex requires `name` + `description` + optional `metadata.short-description`. Future codex versions may add required fields (e.g., `version`, `requires`). Mitigation: `sync-skills.sh`'s codex frontmatter generation is a single function; bump as needed when codex's schema changes. The AC3 frontmatter-validity test pins the V1 expectation; failures on schema changes will surface as test failures, not silent breakage.
- **R2 — Codex auto-discovery may not honor symlinks.** `tools/install-codex-adapters.sh` uses symlinks for dev ergonomics (edit canonical → adapter updates → codex sees new content without manual install). If codex's session-start discovery resolves only real files, the symlink approach breaks. Mitigation: install script supports a `--copy` mode (or a separate `--copy` script) that copies adapter content to `~/.codex/skills/<name>/` instead of symlinking; documented as a fallback in AGENTS.md. Verify which mode codex prefers in AC4 smoke test.
- **R3 — Skill body length may exceed codex's <500-line target.** Codex's `skill-creator` recommends ≤500 lines per `SKILL.md` body for context-window hygiene. ECHO's `skills/review-pending.md` is currently ~150 lines; `skills/merge-and-cleanup.md` is the longest at ~250 lines. Both fit. If a future canonical skill exceeds 500 lines, the codex-side adapter would need the `references/` split codex documents — but V1 isn't blocked.
- **R4 — Two-codex reviewer roster (codex + codex-ops) loses cross-vendor signal.** This cycle deliberately uses same-vendor reviewers because the work is narrow (sync-script extension + documentation), the codex-ops lens specifically catches runtime/ops issues distinct from codex's procedural lens, and the cross-vendor pattern is proven by 047/048. If R2 verdict divergence is wider than expected, file as evidence that cross-vendor remains needed even for narrow specs.
- **R5 — Adapter content drift between sync runs.** If a builder manually edits `adapters/codex/skills/<name>/SKILL.md` without updating canonical, the next `--check` will flag it but the drift was visible to codex users in between. Mitigation: pre-commit hook (out of scope for V1) eventually; for now the AC3 `--check` test surfaces drift on every CI/local check run.

## Tests

- `tests/sync-skills/codex-adapter.test.ts` — six test cases per AC3.
- Verification commands at build time: `npm run lint`, `npm run typecheck`, targeted vitest for the new file, `tools/sync-skills.sh --check` (must return clean post-sync), `python3 tools/blocked.py` (must still select 049 or whatever's next).
- Smoke test (AC4): after `tools/install-codex-adapters.sh` runs, manually verify in a separate codex CLI session that `/review-pending` (or codex's slash-command surface) discovers the new skill. This is a one-shot human verification — log result in the builder run log; not a CI test.

## Definition of Done

- All ACs implemented.
- `npm run lint`, `npm run typecheck`, `tools/sync-skills.sh --check` all clean.
- New vitest cases pass.
- `adapters/codex/skills/<name>/SKILL.md` files materialized + committed for every canonical skill in-scope per AC1.
- `tools/install-codex-adapters.sh` is executable (mode 0755) + works idempotently against a clean `~/.codex/skills/`.
- AGENTS.md gains the codex-skill-discovery one-paragraph note.
- Builder smoke test recorded in the run log: codex CLI sees the synced skills + can trigger at least one (`review-pending`).

## After Completion (Strategist Notes)

- **Wiki promotion:** Create `wiki/surfaces/codex-skill-adapter` documenting the third adapter target + its install pattern. Update `wiki/operating-model/` to reflect that ECHO's cross-tool protocol now has three concrete adapter targets (Claude Code, Cursor's Claude via compat, codex). Regenerate `wiki/index.md` via `tools/wiki_index.py`. Update `.manifest.json`.
- **Followups to file**:
  - Extend vendor-neutralization pattern (AC2 shape) to remaining canonical skills: `merge-and-cleanup`, `review-queue-codex`, `review-queue-cursor`, `review-queue-codex-ops`, `review-queue-watch`, `process-backlog-batch`. Each is ≤1h friction-fix.
  - Generate `agents/openai.yaml` for each codex adapter — needed for nice UI labels in codex's skill list. Mirror of `scripts/init_skill.py` invocation in codex's skill-installer.
  - Pre-commit hook to enforce `tools/sync-skills.sh --check` clean on every commit touching `skills/` or `.claude/commands/` or `adapters/codex/skills/`.
  - Verify codex auto-discovery honors symlinks (R2). If not, switch install script default to copy mode.
  - When codex eventually supports project-local skill discovery (`<repo>/.codex/skills/` or similar), revisit whether the install-step symlink is still needed.
- **Retire from `_followups.md`**: this spec doesn't directly resolve a current 047 followup line; it serves the (e2) vendor-coverage gap at the skill-discovery layer for codex strategist. Note in the merge commit that 049 lands the third adapter target the cross-tool-protocol decision doc explicitly anticipated.
