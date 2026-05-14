---
task_id: 2026-05-14-049-codex-skill-adapter
role: strategist
writer: claude-strategist
last_updated: 2026-05-14T19:50:00Z
---

## current_thesis

Spec 049 drafted; awaiting claim. Friction-first compliance: serves (e2) vendor-agnostic-at-every-role at the SKILL DISCOVERY layer for codex. Today only Claude Code (via `.claude/commands/`) and Cursor's Claude (via Cursor's `.claude/commands/` compat) can invoke ECHO skills by name; codex strategist cannot, which the 048 cycle empirically surfaced as a friction (codex strategist had to be fed full skill bodies inline rather than fire `/review-queue-watch` etc.). 049 wires `~/.codex/skills/<name>/SKILL.md` as the third adapter target via `tools/sync-skills.sh` extension, tracked in repo at `adapters/codex/skills/`. Reviewer roster `["codex", "codex-ops"]` (founder-authorized two-codex test; loses cross-vendor signal in exchange for full-auto codex-side reviewer cycle).

## locked_decisions

- **Adapter location: `adapters/codex/skills/<name>/SKILL.md` (tracked in repo) + `tools/install-codex-adapters.sh` symlinks into `~/.codex/skills/<name>` (user-home deploy step).** Rejected alternatives: (a) sync directly to `~/.codex/skills/<name>/` — not git-tracked, can't be reviewed in ECHO pipeline; (b) MCP `echo_skill(name)` tool serving canonical content — overkill for V1 (codex now has native FS discovery, the original "TBD: MCP-served" assumption is obsolete); (c) treat `.claude/commands/` as the codex target too — codex's frontmatter shape requires a directory wrapper, not a flat .md file.
- **Frontmatter transform pinned to V1**: `name` (from filename), `description` (passthrough), `metadata.short-description` (first 80 chars of description, truncated at last word boundary). `agents/openai.yaml` UI metadata deferred to followup — codex marks it RECOMMENDED, not required. Rejected: generate full `agents/openai.yaml` in V1 → adds scope without unblocking codex discovery.
- **Scope limited to ONE canonical-body vendor-neutralization (`skills/review-pending.md`)**. Rejected: vendor-neutralize all skills in 049 → fan-out of changes, larger review surface, harder to converge in 1-2 rounds. The 047 pattern for codex binding-specific notes (additive section appended to vendor-neutral body) is the template; once review-pending proves it, others follow as followups.
- **Skip `using-superpowers.md` and `role-typed-task-state.md` from the codex adapter target**. Rejected: include all skills/ files → these are cold-start primers + schema docs, not slash-command-invokable workflows; including them dilutes codex's slash-command surface with non-actionable entries.
- **Reviewer roster `["codex", "codex-ops"]`** chosen by founder ("full auto mode with two codex reviewers till converge"). Rejected: keep `["codex", "cursor"]` (the 047/048 default) → would re-introduce the manual cursor-reviewer touchpoint or require Claude-orchestrator-fills-cursor pattern; the founder wants codex-side autonomy for this cycle. Trade: same-vendor reviewer pair loses the cross-vendor blindspot signal but the work is narrow (sync-script extension + one body edit) and codex-ops's runtime/ops lens IS distinct from codex's procedural lens.
- **Symlink-based install (not copy-based) for AC4** unless R2 forces switch. Symlinks give dev ergonomics (edit canonical → adapter regenerates via sync → codex sees new content with no manual install step). Copy fallback documented as a `--copy` flag if codex auto-discovery refuses symlinks.
- **No new helper scripts beyond `install-codex-adapters.sh`**. The codex-side fan-out mechanism in `review-pending` body is documented PRESCRIPTION; codex following the prescription does the work. If implementing the per-item codex-exec orchestration turns out to need a helper, it lands in a separate spec.

## open_questions

- None blocking. Builder should implement AC1-AC5 in order. R2 (symlink-vs-copy) is verifiable in AC4 smoke test — if codex CLI discovers symlinked skills correctly, ship symlink mode; if not, switch default to copy mode and document the symlink option as `--symlink` for future codex versions.

## dont_touch

- `wiki/` — strategist edits only, post-merge.
- `docs/BACKLOG.md` and `docs/STATUS.md` — strategist appends row for 049 at spec creation; no other edits in this cycle.
- Existing `.claude/commands/*.md` files OTHER than `review-pending.md` — the Claude Code adapter target is byte-stable; only review-pending.md re-syncs because AC2 edits its canonical.
- `~/.codex/skills/.system/` — codex's built-in skills; not ECHO's territory.
- All canonical `skills/<name>.md` files OTHER than `review-pending.md` — Out of Scope limits the vendor-neutralization to one skill per the friction-first scope-tightening principle.
- `tools/sync-skills.sh` Claude Code adapter behavior — purely additive change; existing Claude Code sync unchanged byte-for-byte.
- `backlog/pending_review/2026-05-14-048-...md` — that's a separate cycle awaiting `/review-pending` + merge; 049 doesn't touch it.

## canonical_anchors

- spec: backlog/ready/2026-05-14-049-codex-skill-adapter.md
- parent_spec: backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md
- protocol_decision: raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md
- codex_skill_anatomy_reference: ~/.codex/skills/.system/skill-creator/SKILL.md
- sync_script: tools/sync-skills.sh
- canonical_skill_being_neutralized: skills/review-pending.md
