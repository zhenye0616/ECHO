---
id: 2026-05-15-055-cursor-as-builder-paste-trigger
title: Cursor-as-builder binding — paste-trigger skill prose for IDE-mode builder (formalizes existing Cursor-domain delegation)
status: ready
priority: HIGH
estimate: 0.5d
created: 2026-05-15
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-05-15T23:33:16Z"
branch: "agent/cursor-as-builder-paste-trigger"
head_sha: "064f1ee67cb721c9c001bcf4e16c04420261e3d1"
pr_url: ""
task_state_ref: 2026-05-15-055-cursor-as-builder-paste-trigger
agent_notes: |
  AC1–AC4 complete. AC1: new "Binding-specific notes — Cursor's Claude (IDE-mode)" section appended to skills/process-backlog.md after the codex section, mirroring its shape (trigger mode, operator-enforced serialization, atomic-claim as sole sync primitive, ECHO_AGENT_ID resolution, MCP exposure, invariants reminder). AC2: tools/sync-skills.sh --check clean post-resync of both adapters. AC3: docs/cursor-builder-trigger.md (47 lines, sibling shape to docs/review-queue-setup.md) with the four-step paste-trigger ritual + pre-flight + failure modes; contains the spec-required ECHO_AGENT_ID and "one active Cursor builder per ECHO_AGENT_ID" grep phrases. AC4: schema-conforming builder.md (5 blocks, lint clean, 37-line body). Built by Claude Code binding (AC5 explicitly permits non-Cursor binding to claim; founder + strategist must file the dated 055-AC5-cursor-builder-run-by followup at merge time per the spec's "Durable reminder" clause). No protocol body changes; no wrapper; no schema changes.
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC1 — binding-specific section appended to vendor-neutral protocol skill
  - skills/process-backlog.md
  - .claude/commands/process-backlog.md       # synced from skills/ via tools/sync-skills.sh
  - adapters/codex/skills/process-backlog/SKILL.md  # synced from skills/ via tools/sync-skills.sh
  # AC3 — operator-facing paste-trigger documentation
  - docs/cursor-builder-trigger.md
  # AC4 — builder pointer the Cursor builder writes during claim (paths follow 046 AC1 task-state schema)
  - backlog/task-state/2026-05-15-055-cursor-as-builder-paste-trigger/builder.md
spec_refs:
  - backlog/complete/2026-05-13-047-codex-as-builder-binding-adapter.md  # Direct sibling. 047 added the codex-builder binding via a thin wrapper (`run-codex-builder.sh`); 055 adds the Cursor's-Claude binding via paste-trigger prose only — no wrapper, no schema change. AC1's "Binding-specific notes — Cursor's Claude (IDE-mode)" section mirrors the shape of 047's "Binding-specific notes — codex" section.
  - skills/process-backlog.md  # AC1 touch. Vendor-neutral protocol stays here. AC1 appends ONE binding-specific section for Cursor; no protocol changes.
  - skills/review-queue-cursor.md  # AC3 reference. Existing Cursor-binding skill (reviewer role) — established convention for IDE-mode skill prose. AC3 docs follow the same shape: founder pastes skill body into Cursor IDE chat; Cursor's Claude executes the protocol; founder observes.
  - raw/internal/decisions/2026-05-13-echo-skills-are-the-cross-tool-protocol.md  # The decision that skills/ is the cross-tool collaboration protocol. 055 operationalizes the third builder binding (after Claude Code in-session + codex via 047's wrapper).
  - wiki/operating-model/review-queue-protocol.md  # Diagram context — Cursor is already an IDE-mode reviewer in this protocol; 055 extends the same IDE-mode trigger ritual to the builder role.
review_notes: |
  Merged on 2026-05-16 via founder reconciliation. Merge commit: 92ca9b2.
  review_notes + C7 move + C4 followup re-applied in a follow-up fixup commit
  after the original C4/C6/C7 ops were silently dropped by
  `git rebase --rebase-merges` during cross-machine race recovery — see the
  fixup commit body for the post-mortem.

  Conflicts resolved:
  - backlog/task-state/2026-05-15-055-cursor-as-builder-paste-trigger/builder.md (add/add): took HEAD (main) wholesale. Main's version is the post-handoff state written by tools/task-state/patch-builder-state.py at the claimed→pending_review transition (handoff metadata + COMPLETE lifecycle marker + canonical_anchors.spec rewritten to pending_review/). The branch's 064f1ee version is the pre-handoff snapshot the agent wrote at claim time; the builder.md body itself documents this contract. The /review-pending sidecar predicted "no conflicts" because the reviewer subagent didn't notice that the patcher had run on main between the branch's fork-point and current main.

  C3.5 cross-vendor consult: codex @ proceed-as-proposed — no modifications. Codex independently inspected both index stages, confirmed the diff is exactly the three patcher-owned regions (frontmatter handoff metadata, lifecycle marker, spec anchor), confirmed the branch has no unique body content in locked_decisions/open_questions/dont_touch/reviews, and endorsed `git checkout --ours` for this file.

  Fixups applied:
  - Appended `055-AC5-cursor-builder-run-by: 2026-05-22` entry to backlog/_followups.md per the spec's "Durable reminder" clause (055 was built by the Claude Code binding, so the Cursor-as-builder dogfooding observation is deferred to a 7-day post-merge window).

  Fixups deferred to follow-up items: none.

  Verify: 970/991 tests pass (21 skipped, 74/75 test files passed) on the pre-rebase commit (7297aee). Lint and typecheck clean. tools/sync-skills.sh --check returns "OK: all adapters match canonical skills/". Live tip after rebase + 056 merge: 8e40c56 — also clean (986/1007, lint+typecheck+sync-skills all green).

  Follow-up items (non-blocking):
  - Future micro-spec documenting Claude Code-as-builder explicitly (currently the "implicit default"), so all three bindings are prose-documented symmetrically. File only if the implicit-default framing causes confusion.
  - Strategist conversation: promote 055's After-Completion targets to wiki/operating-model/review-queue-protocol.md and update memory feedback_delegate_cursor_work_to_cursor.md.
  - **NEW (from this incident)**: spec a guard in skills/merge-and-cleanup.md C11 rebase path — after `git rebase --rebase-merges` of a merge commit that carried C4/C6/C7 extras, the operator MUST re-stage those extras before continuing. Alternatively, restructure C11 to abort + restart rather than rebase. See `055-rebase-merges-drops-extras-postmortem` followup.
---

## Why this spec exists

**The vendor-agnostic pivot's third builder binding.** 047 shipped Codex-as-builder via a headless wrapper; Claude Code-as-builder has been the implicit default since the project started. Cursor's Claude has been the de-facto builder for Cursor-domain capture work since 029 (delegation pattern in memory `feedback_delegate_cursor_work_to_cursor.md`), but the binding is **prose-undocumented**: nothing in `skills/process-backlog.md` tells Cursor's Claude what to do differently from Claude Code, no operator-facing instruction tells the founder how to trigger a Cursor-builder run.

055 closes that gap with the smallest possible change: one new section in the vendor-neutral protocol skill (binding-specific notes for Cursor's Claude IDE-mode) + one short operator doc describing the paste-trigger ritual. **No wrapper. No launchd. No schema change.** Cursor IDE is not headless; the trigger is founder-paste-driven, same shape as Cursor's reviewer binding (`skills/review-queue-cursor.md`).

**Why this fills the matrix.** After 047, builder = `{Claude Code, codex}` at the binding layer (Cursor's Claude was operationally a builder but undocumented). After 055, builder = `{Claude Code, codex, Cursor's Claude}` with all three bindings prose-documented. This is one of the (b)-gate-lift criteria in the friction-first directive (every role vendor-agnostic at ≥2 bindings — builder now hits ≥3).

## Acceptance Criteria

**AC1 — `skills/process-backlog.md` gains a "Binding-specific notes — Cursor's Claude (IDE-mode)" section.**

- Append a single section at the end of `skills/process-backlog.md` (immediately AFTER the existing "Binding-specific notes — codex" section from 047, BEFORE any trailing failure-modes / index content). New section title: **"Binding-specific notes — Cursor's Claude (IDE-mode)"**. Content covers:
  - **Trigger mode:** founder paste-driven, not headless. The founder opens Cursor IDE, opens a chat with Cursor's Claude, and pastes the same vendor-neutral protocol body (or a one-line invocation that loads `skills/process-backlog.md`). Cursor's Claude reads `skills/` directly from the open repo — no adapter copy needed.
  - **Serialization is operator-enforced, not provided by Cursor.** Cursor IDE does NOT serialize multiple chats/windows on the same machine — they share the same `~/.echo/agent-id` and can both pass the builder protocol's "find claim by claimed_by" resume check, attaching to the same worktree and `builder.md`. That would create two live writers and break the single-owner invariant the no-CAS direct-commit contract assumes. **Rule:** run at most one Cursor builder per machine at a time. If you need parallel Cursor builders on DIFFERENT items, set a distinct `ECHO_AGENT_ID=<uuid4>` env var (or per-chat override) before invoking the protocol — that gives each chat its own writer identity. **Second-session recovery:** if a second Cursor chat is opened by mistake while the first is mid-claim, stop the second immediately — do NOT let it proceed, since the resume check will silently attach it to the first chat's claim.
  - **The atomic-claim git op is the only race-loser surface.** When operator rule above is followed, the single commit `ready/ → claimed/` push is the only synchronization primitive needed — if a Cursor builder races a Claude Code or codex builder on a different machine, only one push succeeds and the other observes the conflict on next `git pull`. The cross-machine case is naturally serialized by git; the same-machine case is operator-serialized per the rule above.
  - **ECHO_AGENT_ID resolution:** Cursor's Claude reads `~/.echo/agent-id` on first Bash call; if absent, generates a UUID4 and writes it. Same `~/.echo/agent-id` file shared with the codex builder per 047 AC1 — different *machines* have different IDs; same machine across all bindings gets one stable ID. **Concurrency caveat:** the shared default ID makes cross-binding concurrency look like a resume (same `claimed_by`) rather than a claim race. Per the operator-serialization rule above, do not run two builder bindings concurrently on the same machine with the shared default ID; if intentional parallelism is needed, set distinct `ECHO_AGENT_ID` per binding.
  - **MCP access:** Cursor's Claude sees ECHO MCP through Cursor's MCP configuration. Verify `mcp__echo__echo_ping` returns OK before claiming; if not, abort with a one-line note in the founder paste. Journal-by-proxy rule (CLAUDE.md, 046 AC6) does NOT apply — Cursor's Claude has its own MCP write path; it journals its own calls in-the-moment.
  - **Reminder:** journal discipline + drift-prevention rules apply identically. Cursor's Claude is no more or less prone to drift than Claude Code; the binding-specific notes do NOT relax any protocol invariant.
- Sync to `.claude/commands/process-backlog.md` and `adapters/codex/skills/process-backlog/SKILL.md` via `tools/sync-skills.sh`.
- **NO protocol changes.** Atomic-claim, worktree creation, test/lint/typecheck running, commit-and-push, move-to-pending-review — all unchanged. Only binding-specific notes appended.

**AC2 — `tools/sync-skills.sh --check` clean after AC1's edits.**

Per the current `tools/sync-skills.sh` behavior (lines 81-89, 196-215), the three adapters are NOT byte-identical: the Codex adapter intentionally rewrites frontmatter into codex-shaped YAML and `--check` compares the Markdown body plus a generated-frontmatter validation. The AC therefore tracks what the tool actually enforces:

- **Claude adapter (`.claude/commands/process-backlog.md`):** byte-identical to `skills/process-backlog.md` post-sync.
- **Codex adapter (`adapters/codex/skills/process-backlog/SKILL.md`):** Markdown body identical to `skills/process-backlog.md` post-sync; frontmatter validated against the codex adapter schema by `tools/sync-skills.sh --check`.
- Verified by running `tools/sync-skills.sh --check` and asserting exit 0.

**AC3 — `docs/cursor-builder-trigger.md` operator-facing instruction.**

- New short doc (~30-60 lines) covering:
  - **Pre-flight:** ECHO daemon running, ECHO MCP registered in Cursor's MCP config, `~/.echo/agent-id` file exists OR Cursor's Claude is allowed to create it on first run.
  - **Step-by-step paste-trigger:** (1) Open Cursor IDE on the founder's Project_echo repo. (2) Open a fresh chat with Cursor's Claude (no prior context). (3) Paste the contents of `skills/process-backlog.md` (or a one-line `Follow the protocol in skills/process-backlog.md` instruction if Cursor's Claude can read files autonomously). (4) Observe: Cursor's Claude announces which item it is claiming, pushes the atomic-claim commit, creates the worktree, etc.
  - **What success looks like:** `git show origin/main:backlog/claimed/<id>.md` returns the moved spec with `claimed_by: <ECHO_AGENT_ID>` populated AND `git log origin/main --oneline --grep "claim: <id>"` returns a matching commit. Do NOT rely on `git log --oneline -1 origin/main` — origin/main can advance from a reviewer/journal/spec commit immediately after the claim, false-failing the tip-commit check.
  - **Failure modes the founder should look for:** ECHO MCP unreachable (Cursor's Claude can't journal); atomic-claim race lost to another binding (Cursor's Claude reports the conflict and exits — no work lost, founder picks a different item); test failures on the worktree (founder reviews + decides whether to push to pending_review with `agent_notes` or rework).
  - **What NOT to do:** do NOT have two Cursor sessions claiming concurrently. Do NOT skip the journal discipline. Do NOT paste in-progress modifications to `skills/process-backlog.md` — paste the version from `main`.
- Sibling to existing `docs/review-queue-setup.md` shape.

**AC4 — Builder writes `backlog/task-state/<id>/builder.md` via direct commit, per 046 AC1 + 047 AC3.**

The Cursor builder follows the exact same writer-responsibilities table from 046 AC1: write initial `builder.md` on atomic claim, update on milestones, finalize on move-to-pending_review. Mechanism is plain `git add … && git commit && git push` (same as 047 AC3 — no CAS, single-owner invariant holds).

For 055's own builder.md (the spec is self-bootstrapping when claimed via a Cursor session): the builder writes the schema-conforming `builder.md` with `current_thesis: "claim of 2026-05-15-055-cursor-as-builder-paste-trigger"`, `locked_decisions` listing the ACs, `canonical_anchors` pointing at this spec + the agent branch.

**AC5 — Falsifiable dogfooding (observational, not a hard merge-gate).**

If Cursor's Claude claims 055 itself (recursive dogfooding), the merge-time journal entry serves as the proof point that the binding works end-to-end. If a different binding claims 055 (e.g., Claude Code, to avoid the recursion), AC5 instead requires ONE subsequent Cursor-as-builder run on any Cursor-domain item that produces a journal entry attributable to `builder = Cursor's Claude` within 7 days of 055 merging. This entry must:
- Cite the claimed item id
- Cite the resolved `ECHO_AGENT_ID`
- Confirm `builder.md` was written under `backlog/task-state/<id>/builder.md` with the 046 AC1 schema shape
- Confirm at least one ECHO MCP call was journaled in-the-moment from the Cursor session

Failure of AC5 (no Cursor-as-builder run within 7 days) is NOT a regression — file as a separate followup ("055 binding shipped but no production run yet"). The binding's correctness is verified by AC1+AC2+AC3 even without AC5 firing.

**Durable reminder (mandatory at merge time).** If 055 is claimed by a non-Cursor binding, the merge-time `review_notes` MUST cite a dated followup item in `backlog/_followups.md` of the form `055-AC5-cursor-builder-run-by: 2026-05-<merge_date+7>` so the 7-day window has a tracked deadline. Retire the followup entry when the qualifying Cursor builder journal entry lands; convert it to an open spec successor if 7 days elapse without a run.

## Tests

Verification commands the builder runs before move-to-pending_review:

```bash
# AC2 — sync hygiene
tools/sync-skills.sh --check                                       # exit 0

# AC4 — builder pointer lint
python3 tools/task-state/lint.py \
  backlog/task-state/2026-05-15-055-cursor-as-builder-paste-trigger/builder.md   # exit 0

# AC1 — section presence (grep is the cheapest assertion; full prose review is done by reviewers)
grep -q "Binding-specific notes — Cursor's Claude (IDE-mode)" skills/process-backlog.md
grep -q "Serialization is operator-enforced" skills/process-backlog.md

# AC3 — operator doc exists + key contract terms present
test -f docs/cursor-builder-trigger.md
grep -q "ECHO_AGENT_ID" docs/cursor-builder-trigger.md
grep -q "one active Cursor builder per ECHO_AGENT_ID" docs/cursor-builder-trigger.md
```

No vitest tests required — this is a docs-only spec; the assertions above are sufficient to gate the move-to-pending_review handoff. Reviewers cover the prose-quality dimension; mechanical contract terms are grep-checkable.

## Out of Scope (Don't Drift)

- **No headless Cursor wrapper.** Cursor IDE has no `claude -p`-equivalent today. If/when Cursor ships a headless reviewer/builder mode, file as a successor spec.
- **No changes to `skills/process-backlog.md` protocol body.** Only binding-specific notes appended. Atomic-claim, worktree, push-with-retry, move-to-pending_review semantics stay verbatim.
- **No schema changes.** No `reviewers.json`-style roster for builders; the builder role is identified by which binding executes `skills/process-backlog.md`, not by a config file.
- **No Claude-as-builder formalization.** Claude Code-as-builder already works in-session as the implicit default. Document it post-hoc if a future spec surfaces the need; not 055's scope.
- **No automated cross-binding race detection.** The atomic-claim git op is the only synchronization — if two bindings race, the loser observes the conflict on push. No new lock primitive.

## After Completion (Strategist Notes)

Post-merge wiki promotion:
- Update `wiki/operating-model/review-queue-protocol.md` (the diagram page just created) to add a "Builder bindings" subsection noting all three bindings (Claude Code in-session, codex via `run-codex-builder.sh`, Cursor's Claude via paste-trigger).
- Consider adding a `wiki/operating-model/builder-bindings.md` standalone page if the matrix grows (V1.6.x territory; defer until ≥1 additional binding lands).
- Update memory `feedback_delegate_cursor_work_to_cursor.md` to reference 055 as the canonical binding doc (rather than just an oral convention).
