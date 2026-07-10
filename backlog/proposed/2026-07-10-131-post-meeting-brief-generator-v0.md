---
id: 2026-07-10-131-post-meeting-brief-generator-v0
title: "Post-meeting brief generator v0: harden the meeting→brief fast path around six root causes; canonical tool-agnostic brief object + markdown render as a CLI command"
status: proposed
priority: HIGH
estimate: 2d
created: 2026-07-10
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
- **AC2 (re-ingest — RC2):** when the Granola API reports `updated_at` newer than the stored atom's, the poller re-ingests the note as a superseding atom (append-only; existing dedupe_key chain semantics), and the extraction fingerprint incorporates a content hash so revised content re-extracts. A note ingested mid-write and later revised produces a brief reflecting the revision (test drives exactly the frozen-partial scenario).
- **AC3 (current-run reads — RC3):** the brief compiler consumes signals exclusively through `filterToCurrentSignalRuns()`; a note with two extraction runs (superseding or concurrent-orphan fixture) yields a brief with only the current run's signals, no duplicates.
- **AC4 (shared-state coordination — RC4):** both granola checkpoints are updated under a cross-process file lock (flock or equivalent); a manual run concurrent with a daemon tick loses no checkpoint entries (test: interleaved RMW fixture). Extraction failure entries carry a retry-after (default 1h, capped attempts) instead of permanent blocks, and `echoctl brief --force` clears the target note's failure entry.
- **AC5 (brain I/O — RC5):** brain output wrapped in markdown fences parses successfully (strip/salvage before JSON.parse; parse failure is not retried at brain level); the extraction prompt embeds the transcript once; the brain timeout scales with input size (pinned formula or config).
- **AC6 (render integrity — RC6):** note-derived text is sanitized at render (backticks/code fences neutralized; `@channel`/`@here`/`@all` zero-width-broken); dates render in the machine's local timezone with an invalid-date guard; each action line carries its own owner extracted per-action by the brain (prompt change), rendering "unassigned" when absent — the section header no longer claims a global owner.
- **AC7 (canonical brief object):** the command emits both artifacts: `brief-<note_id>.json` (schema: meeting{title,date,attendees,source{provider,note_id,url}}, decided[], actions[{text,owner,due}], context[], carryover[] reserved empty, provenance{extraction_run, generated_at}) and the markdown render, byte-stable given identical inputs. The JSON is the tool-agnostic contract; markdown is one renderer over it.
- **AC8 (prototype parity):** on the two real meetings already in storage (EchoBrain Legal, drone-detection), the hardened command reproduces briefs whose decided/actions content matches the prototype's output modulo the AC6 fixes (owner lines, local dates, sanitization) — no content regression.

## Out of Scope (Don't Drift)

- Calendar-end-time trigger / retry-until-published loop (follow-on item; consumes AC1's target contract).
- Mattermost/Slack delivery adapters and ANY auto-send (auto-send prerequisites are recorded in spec_refs[0] §3 and gate a future item).
- Multi-key / advisor-account Granola polling (pilot onboarding handles via workspace membership; multi-key is V1.5+).
- Decision-changeset/card pipeline changes (item 130 owns that path; this item only reads signals).
- New mutable stores; brief history/versioning beyond the two emitted files.

## After Completion (Strategist Notes)

Wiki: new `surfaces/post-meeting-brief.md` (canonical brief object schema, render contract, the six root causes as design rationale) + update `capture/fs-watcher.md`? no — update `capture/per-app/granola` page if the re-ingest semantics change the collected-data contract. Retire `raw/internal/prototypes/brief-now-prototype.mjs` note in prototypes README (mark superseded). Follow-on items to spec: calendar trigger (guard allocation §"calendar-trigger item" in spec_refs[0]), Mattermost adapter, stage-2 triage stamps on the brief.
