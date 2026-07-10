---
id: 2026-07-10-131-post-meeting-brief-generator-v0
title: "Post-meeting brief generator v0: harden the meeting→brief fast path around six root causes; canonical tool-agnostic brief object + markdown render as a CLI command"
status: complete
priority: HIGH
estimate: 2d
created: 2026-07-10
review_notes: |
  Merged on 2026-07-10 via strategist-run merge under founder standing
  authorization ("proceed" on the 131 full-auto loop, same pattern as 130).

  Conflicts resolved:
  - none (merge --no-ff clean; zero file overlap with main-side movement)

  C3.5 cross-vendor consult: none invoked

  Fixups applied:
  - none — reviewer verdict was merge as-is

  Fixups deferred to follow-up items (see backlog/_followups.md):
  - RC4 residual: cross-checkpoint manifest skip in shouldExtractNote
  - cosmetic FENCE ENOENT path tidy in writeCheckpointJsonWithLock
  - optional adoption of the rebound holdout suite as permanent regressions

  Verify: 2117/2117 tests pass (21 skipped, 1 todo); lint, typecheck,
  coupled-invariants, sync-skills clean post-merge on fresh install.

  HOLDOUT GATE (first use of the blind red-first discipline): 20-test suite
  written from the stress-test findings BEFORE the build, builder-blind on
  branch holdout/131-confirmation. Result at b58f558e: 19/20 green-equivalent
  (6 green on real seams pre-rebind; 12 prototype-copy tests rebound by the
  verifier to the shipped modules, all green; 1 stale-shape green on the real
  locked path; 1 genuine residual red OUT of committed AC4 scope — filed).
  Rebound suite preserved on the holdout branch (tests/holdout-131-rebound/).

  Review provenance: spec converged r1-r5 in the two-codex queue (reframe gate
  fired r2/r3/r4; the AC4 lock took three refinement rounds ending in the
  stage-fence-commit structural close). Build: single cycle, zero redos —
  the builder proactively covered packaging (130's lesson held). Final delta
  review verdict: merge as-is at b58f558ebebd0bcbf6893c8fea5dcda5404f3ef0.
blocked_by: []
spec_refs:
  - raw/internal/decisions/2026-07-10-brief-path-stress-test.md      # the agent-team findings this spec collapses — 30 verified failure modes, 12 classes; READ FIRST (HTML rendering: https://claude.ai/code/artifact/ea615495-b1b1-47db-8b3b-c140868df3ac)
  - raw/internal/prototypes/brief-now-prototype.mjs                  # reference implementation, ran live on the first advisor meeting 2026-07-09
  - raw/internal/decisions/2026-07-09-first-advisor-loop-cycle.md    # the live run + friction that motivated this
  - raw/external/precedents/granola-api-access-model.md              # API constraints: no webhooks, workspace-scoped keys, page_size<=30
  - raw/internal/decisions/2026-07-09-decision-loop-canonical-model.md # stage-5 backflow context; brief carries the carryover[] slot
  - src/capture/surfaces/granola-poller.ts                           # RC2 seam (ingest-once), RC4 seam (checkpoint)
  - src/enrich/granola-signals.ts                                    # RC2 fingerprint, RC3 filterToCurrentSignalRuns (item 115 AC1 — already exported), RC4 checkpoint, RC5 brain I/O
files_to_modify:
  # PROVISIONAL — builder refines, no scope expansion
  - src/cli/commands/brief.ts                        # NEW: `echoctl brief [--note <id>] [--force]`
  - src/enrich/post-meeting-brief.ts                 # NEW: target resolution, brief compile, renderers
  - src/capture/surfaces/granola-poller.ts           # RC2 re-ingest-on-newer-updated_at; RC4 checkpoint lock
  - src/enrich/granola-signals.ts                    # RC2 content-hash fingerprint; RC4 failure TTL; RC5 parse salvage + single embed + scaled timeout
  - tests/enrich/post-meeting-brief.test.ts          # NEW
  - tests/cli/brief-command.test.ts                  # NEW
  - backlog/_followups.md                             # AC3 rider ONLY — one appended line naming the item-130 bridge RC3 residual; no other edits
ready_content_sha: 084252b227bcc768f5333d60891971faa1853173e03f63fe88f7889330e63df7
claimed_by: "78D5AB0F-A8A3-4F01-BC2E-EB05961B2405"
claimed_at: "2026-07-10T05:47:26Z"
branch: "agent/post-meeting-brief-generator-v0"
head_sha: "b58f558ebebd0bcbf6893c8fea5dcda5404f3ef0"
pr_url: ""
agent_notes: |
  Implemented `echoctl brief` plus the Granola poller/signal hardening required by AC1-AC8. The branch also wires the command into the top-level CLI and updates the package manifest snapshot because those are required for the named command and shipped dist files to exist. Verification passed: focused brief tests, typecheck, lint, focused packaging tests, and `npm run test:product` (1848 passed, 21 skipped, 1 todo).
---

## Context

The meeting→brief fast path ran live end-to-end on the first lab-pilot advisor meeting (2026-07-09): Granola note → signal extraction → canonical brief JSON → markdown the founder pasted to the advisor unedited. The prototype works; a 36-agent stress test (spec_refs[0]) then confirmed 30 real failure modes against the code — all in freshness, failure-visibility, or shared state, none architectural. This item productizes the prototype as `echoctl brief` with the failure classes fixed **at their six root causes** rather than symptom-by-symptom. The calendar trigger, Mattermost delivery adapter, and any auto-send are explicitly follow-on items.

## The six root causes (each maps to one AC; finding numbers reference spec_refs[0])

- **RC1 — the brief trusts silently instead of verifying its target.** Newest-note fallback with no freshness/status contract produced a confident brief of the WRONG meeting live (top-5 #1) and renders confident empty briefs on failed/skipped extraction (top-5 #2).
- **RC2 — ingest-once semantics freeze content at first sight.** The poller never re-fetches an ingested note id and the extraction fingerprint hashes only frozen inputs, so late decisions and Granola's own revisions can never enter ECHO (top-5 #3).
- **RC3 — readers consume ALL extraction runs instead of the current run.** Duplicate/contradictory signals from concurrent or superseding runs, and orphaned partial runs, leak into the brief; `filterToCurrentSignalRuns()` already ships (item 115) and is simply not used.
- **RC4 — shared mutable state with no cross-process coordination or expiry.** Manual runs and the daemon share both checkpoints last-writer-wins (races, clobbers, double extraction), and three transient failures poison a note forever with no retry-after or reset (top-5 #5).
- **RC5 — brain I/O contract is brittle.** Fenced JSON burns all retries; the prompt embeds the transcript twice against a fixed 180s timeout (observed 157s/180s at 125KB).
- **RC6 — the render layer trusts extracted text and machine time.** Raw markdown/@mentions from note content pass into chat-bound output; UTC day-slice renders tomorrow's date for evening meetings (~15% of real meetings); every action is stamped with the NOTE owner, not its actual owner — verified live: "Actions (Zhen Ye): Parth will call Clara…" (top-5 #4).

## Acceptance Criteria

- **AC1 (target contract — RC1):** `echoctl brief` resolves its target note explicitly (`--note <id>`) or, argv-less, selects the newest note ONLY if its `updated_at` is within a freshness window (default 30 min; overridable). It hard-fails (nonzero exit, stated reason) when: the poll errors, extraction did not complete `ok` for the target, or no current-run manifest exists for the target note. The rendered brief always begins with a machine-emitted identity line — meeting title, LOCAL start time, attendee list — and ends with a "REVIEW BEFORE SENDING" banner. "No decisions recorded" renders only from a successful extraction that found zero decision/action signals.
- **AC2 (re-ingest — RC2):** when the Granola API reports `updated_at` newer than the stored atom's, the poller re-ingests the note as a superseding atom (append-only; existing dedupe_key chain semantics), and the extraction fingerprint incorporates a content hash so revised content re-extracts. **Read rule (pinned):** a shared resolver `resolveCurrentGranolaNoteAtoms(storage, note_id)` selects, per `granola_atom_type`, the atom with the newest `updated_at`, tie-broken by storage insertion order (event id); the poller's already-ingested check, the extraction note-selection, and the brief compiler all read through it. Test fixtures: old + superseding summary/transcript atoms coexist for one note_id → extraction and brief consume ONLY the superseding content (frozen-partial scenario driven end-to-end).
- **AC3 (current-run reads — RC3, brief path only):** the brief compiler consumes signals exclusively through `filterToCurrentSignalRuns()`; a note with two extraction runs (superseding or concurrent-orphan fixture) yields a brief with only the current run's signals, no duplicates. **Honest scope note:** this closes RC3 for the brief path only — the item-130 intake bridge (`runGranolaIntakeBridgeOnce`) also reads `derived:granola-signals` raw and stays exposed; touching it would breach the 130 fence. AC3 includes FILING the named follow-up (`backlog/_followups.md`: "item-130 bridge must read signals through filterToCurrentSignalRuns — RC3 residual") as part of this item's done-ness.
- **AC4 (shared-state coordination — RC4):** both granola checkpoints are updated under a **portable atomic lock directory** — `mkdir(<checkpoint>.lock)` as atomic create-or-fail (works on macOS today and win32 later; same primitive as `tools/backlog/run-codex-builder.sh`), holder metadata (pid + ISO timestamp) written inside, acquisition retry every 100ms up to 10s then fail-loud, stale-lock takeover when the holder timestamp is older than 60s. **Race-safe takeover (pinned, loosened):** tombstone rename ONLY clears the stale lock — a contender renames the stale lock dir to a contender-unique tombstone (`<checkpoint>.lock.stale-<uuid>`); after any such removal, ALL contenders simply re-enter the bounded mkdir acquisition loop and whoever mkdirs next wins (the renamer holds no special claim — mkdir remains the single mutual-exclusion primitive). **Owner-fenced commit protocol (pinned, exact order):** each holder writes an ownership token (uuid) into the lock. The checkpoint commit is: (1) STAGE — exclusively create the temp file INSIDE the owned lock dir (`<checkpoint>.lock/pending-<owner-token>-<uuid>`), write, close; (2) FENCE — re-read `<checkpoint>.lock`'s token, abort/retry acquisition on mismatch; (3) COMMIT — rename that in-lock source path onto the checkpoint. Because the source lives inside the lock dir, a stale-takeover tombstone rename after step 2 moves the pending file away with the lock and step 3 fails at syscall resolution — a paused old holder structurally cannot overwrite the new holder's checkpoint (the ordering stage-then-fence-then-rename is normative; fence-then-stage reopens the window). Abort paths best-effort unlink their temp; unknown/leftover `pending-*` files in a lock or tombstone dir are ignored and GC'd with the tombstone; release removes the lock only if the token matches. Builder note (carried risk): if win32 proves unable to rename a lock dir containing recently-closed temp handles, escalate for guarantee-narrowing — do not invent new machinery. Tests: interleaved RMW fixture loses no checkpoint entries; two simultaneous stale takers → exactly one replacement lock exists and both proceed safely via the loop; old-holder-resumes-after-takeover pause fixture (staged temp → token reread OK → PAUSE → takeover tombstones + reacquires → old holder's final rename fails with missing source) → checkpoint content stays new-holder-owned, asserted on content; and its release is a no-op on the new holder's lock. No new dependencies. Extraction failure entries carry a retry-after (default 1h, capped attempts) instead of permanent blocks, and `echoctl brief --force` clears the target note's failure entry.
- **AC5 (brain I/O — RC5):** brain output wrapped in markdown fences parses successfully (strip/salvage before JSON.parse; parse failure is not retried at brain level); the extraction prompt embeds the transcript once (sentinel-count test). **Timeout contract (pinned, first KiB reserved):** `timeoutMs = clamp(base + 1000 * max(0, ceil(prompt_chars / 1024) - 1), base, 600_000)` with `base` = existing `ECHO_GRANOLA_SIGNAL_BRAIN_TIMEOUT_MS` (default 180_000) and `prompt_chars` measured on the FINAL single-embed prompt string handed to the brain. Tests: prompt ≤ 1 KiB yields exactly `base`; a 125KiB prompt yields `base + 124_000ms`; the 600s cap holds.
- **AC6 (render integrity — RC6):** note-derived text is sanitized at render with EXACTLY these transforms — (T1) fence lines (``` with optional language tag) are removed and their block content is indented four spaces; (T2) inline backticks are replaced with typographic apostrophes (U+2019); (T3) `@channel`/`@here`/`@all`/`@everyone` get a zero-width space (U+200B) inserted after the `@`; dates render in the machine's local timezone with an invalid-date guard; each action line carries its own owner extracted per-action by the brain (prompt change), rendering "unassigned" when absent — the section header no longer claims a global owner.
- **AC7 (canonical brief object):** the command emits both artifacts: `brief-<note_id>.json` (schema: meeting{title,date,attendees,source{provider,note_id,url}}, decided[], actions[{text,owner,due}], context[], carryover[] reserved empty, provenance{extraction_run, generated_at}) and the markdown render, byte-stable given identical inputs. The JSON is the tool-agnostic contract; markdown is one renderer over it.
- **AC8 (prototype parity, machine-local):** a normalized comparator makes parity diffable WITHOUT committing meeting content to the public repo: compare the SETS `decided[].text` and `actions[].text` after normalization — trim, collapse all whitespace runs to one space, remove U+200B, map U+2019 and backtick both to apostrophe, drop four-space indents (i.e. exactly inverting/neutralizing AC6's T1–T3) — ignoring `owner`, all dates, ordering, and rendering. Implemented as an integration test that runs against local storage for the two real note_ids (`not_p5s4nnQgGDq52k`, `not_e6mLksNNr7aqBv`) and SKIPS (with a visible skip reason) when those notes are absent — machine-local by design, not a CI golden. Any decided/actions text delta fails; AC6-class deltas cannot fail it.

## Out of Scope (Don't Drift)

- Calendar-end-time trigger / retry-until-published loop (follow-on item; consumes AC1's target contract).
- Mattermost/Slack delivery adapters and ANY auto-send (auto-send prerequisites are recorded in spec_refs[0] §3 and gate a future item).
- Multi-key / advisor-account Granola polling (pilot onboarding handles via workspace membership; multi-key is V1.5+).
- Decision-changeset/card pipeline changes (item 130 owns that path; this item only reads signals).
- New mutable stores; brief history/versioning beyond the two emitted files.

## After Completion (Strategist Notes)

Wiki: new `surfaces/post-meeting-brief.md` (canonical brief object schema, render contract, the six root causes as design rationale) + update `capture/fs-watcher.md`? no — update `capture/per-app/granola` page if the re-ingest semantics change the collected-data contract. Retire `raw/internal/prototypes/brief-now-prototype.mjs` note in prototypes README (mark superseded). Follow-on items to spec: calendar trigger (guard allocation §"calendar-trigger item" in spec_refs[0]), Mattermost adapter, stage-2 triage stamps on the brief.
