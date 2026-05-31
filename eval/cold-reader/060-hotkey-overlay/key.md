# Key — 060-hotkey-overlay

**Decision:** 2026-05-17-060-hotkey-overlay-v0-raycast-dogfood · age @ run: ~2 weeks
**Committed record:** `backlog/complete/2026-05-17-060-hotkey-overlay-v0-raycast-dogfood.md` · branch commit `0857e346` · **merge `8b5c235` + fixup/overlay `426832a`** (both verified in git, both "with founder reconciliation")
**Query mode:** descriptive ("v0 hotkey overlay"), NOT a single exact token — partial alias-path probe

## Pre-registered ground-truth (4 facts)

| # | Fact | Truth |
|---|---|---|
| 1 | Decision | Build a **v0 hotkey overlay as a Raycast extension** (`tools/raycast-echo/`, one command "Search ECHO Context") for founder **dogfooding**; the **V1 overlay spec is deferred** until v0 surfaces friction. Clipboard-only delivery (↩ copy / ⌘↩ copy-paste); app-launch deferred to V1 |
| 2 | Reasoning | Dogfood the planned V1 hotkey-overlay surface cheaply *before* committing to the full V1 build; v0's dogfooding journal (≥10 uses / ≥3 days) becomes the V1 spec input. v0 deliberately reuses existing retrieval primitives — no new capture, no new MCP tool |
| 3 | Dissent | **CORRECTED post-run:** the initial `requested_reviewers: ["codex"]` was just round-1's roster — the per-round roster (043) added **Claude**. Real review ran **r1–r7 with BOTH codex + claude** (`backlog/reviews/2026-05-17-060…/r{1..7}/claude.md` all exist). **codex** drove heavy *implementability* findings (icon asset, mandatory format.test.ts, missing `source_app`/`Accept` header, Raycast API mistakes — `Clipboard.paste`/`useDebouncedValue`/`Toast.Style.Failure`, chronology-safe cluster selection); **Claude** raised only low-severity (taxonomy smudge re `tools/raycast-echo/` placement, dogfood-log repo context) then `proceed/0`. Direction (v0/Raycast) never contested |
| 4 | Disposition | Shipped — merged 2026-05-17 via founder reconciliation (clean merge); post-merge fixups: root `.gitignore` raycast-env.d.ts + root `tsconfig` exclude `tools/raycast-echo/**`. Now in `backlog/complete/`. (AC8 post-merge gate: ≥10 ⌘⇧E uses over ≥3 days → write the V1 overlay item) |

## Confabulation traps
- It's a **Raycast** decision two weeks before 081 *removed* Raycast — a weak reader may conflate the two, or report 081's removal as 060's disposition. The correct 060 disposition is "shipped the dogfood extension," NOT "removed." (Reader handled this correctly.)

## Results log
| Date | A (on) | B (off) | A−B | Failure mode | Notes |
|---|---|---|---|---|---|
| 2026-05-31 | 4/4 | 0/4 | 4 | none (beat the key on Fact 3) | Codex gpt-5.5, 12 ECHO calls, audit clean. Correctly recovered Claude-as-reviewer (r1–r7) + cited real merge `8b5c235`/`426832a`. Descriptive (non-token) query still recovered the thread |
