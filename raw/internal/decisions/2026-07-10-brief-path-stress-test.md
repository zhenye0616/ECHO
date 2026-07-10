<!-- Adversarially-verified stress test of the meeting→brief fast path.
36-agent workflow (5 dimension hunters → per-finding verification (default-refute) → synthesis),
2026-07-10. 30/30 findings confirmed against code, consolidated to 12 failure classes.
Input for: brief-generator backlog item + calendar-trigger item + pilot onboarding checklist. -->

# Stress-test report: meeting→brief fast path (brief-now.mjs + granola-poller/signals)

All 29 findings confirmed real; several are the same defect found from different angles — consolidated below into 12 distinct failure classes. Zero findings rejected as unreal.

## 1. Top 5 by pilot likelihood × severity

**#1 — Wrong-meeting targeting: argv-less brief-now silently briefs the PREVIOUS meeting.** Trigger is the default pilot flow (run 2 min post-meeting, before Granola publishes — already observed live, journaled in bd6993b4) and also fires on API 401/429/5xx, and permanently for private "My Notes" notes. `brief-now.mjs:36` falls back to newest stored summary with no freshness check; `poll.status`/`notes_ingested` never gated (:19-20). Retrying reinforces the wrong brief. *Guard: refuse argv-less mode unless the selected note's updated_at is within 30 min of now; print title + full local timestamp + attendees as a mandatory confirmation line; exit 1 on poll.status !== 'ok'.*

**#2 — Confident empty brief when extraction failed, was skipped, or never reached the target note.** `extraction.status` ('error', 'skipped: brain_unavailable' — the real f19dc419 class) is logged but never checked (brief-now.mjs:28-29); oldest-first `slice(0,5)` (granola-signals.ts:357/:718) means a backlog starves the just-ended meeting; result is empty **Decided:**/**Actions:** headers indistinguishable from a genuine zero-decision meeting. *Guard: hard-fail unless extraction.status === 'ok' AND a current-run manifest exists for the target note_id; render "no decisions recorded" only from a successful run with zero signals; extract the target note first, not the backlog.*

**#3 — Content freeze at first ingest: partial mid-meeting note locked in forever.** settleMs:0 (brief-now.mjs:25) ingests+extracts at maximum incompleteness; granola-poller.ts:632 never re-fetches an already-ingested id and the fingerprint (granola-signals.ts:391-395) hashes only frozen inputs, so late decisions and post-send corrections can NEVER enter ECHO — daemon path included (settle only delays extraction of the already-frozen atom). *Guard: re-ingest as a superseding atom when the API's live updated_at is newer than the stored atom's; include a content hash in the extraction fingerprint; minimum-viable: brief-now warns "snapshot taken pre-settle — verify against Granola doc".*

**#4 — Every action owner-stamped with the note owner.** Verified in live prod rows ("Actions (Zhen Ye): 1. Parth will call Clara…"). brief-now.mjs:55/:67/:81 use md5.owner for all actions; per-signal `metadata.owner` (granola-signals.ts:498) is dropped, and the extraction prompt never even requests owner. Fires on every multi-person meeting — the pilot's core case. *Guard: ask the brain for per-action owner in the prompt; render `s.metadata.owner ?? "unassigned"` per line; remove owner from the section header.*

**#5 — One transient failure poisons a note permanently, across both processes.** 3 failed attempts (a few seconds of codex blip, or systematic fenced-JSON output) write `last_failure_at` into the SHARED checkpoint; shouldExtractNote (:427-433) then blocks forever — no retry-after, no force flag, no reset tooling; brief-now and daemon blind each other. *Guard: retry after backoff (e.g. now − last_failure_at > 1h, capped attempts) + a `--force` flag in brief-now that clears the target note's checkpoint entry; strip markdown fences before JSON.parse.*

## 2. Remaining findings by dimension

**Content**
- Markdown/@channel injection: signal text and title interpolated raw into chat-bound markdown (brief-now.mjs:76/:79/:83) — garbled recap, mention risk. Guard: sanitize at render (collapse newlines, escape backticks, zero-width-break @channel/@here/@all).
- Long-transcript double-embedding: prompt contains transcript twice (granola-signals.ts:863-876) against a fixed 180s timeout — probabilistic timeout (observed 157s/180s at 125KB), then poisoned by #5. Guard: send one transcript representation; scale timeout with input size.

**Targeting**
- All-runs signal merge: dedupe_key embeds hash(content), so any second run (concurrent, superseding, or orphaned) puts duplicate/contradictory decisions in the brief. Guard: use the already-exported `filterToCurrentSignalRuns()` (item 115 AC1) — one-line fix.
- Timestamp-tie arbitrary pick + day-only header can't disambiguate back-to-back same-title meetings; adjacent RangeError crash on missing created_at. Guard: tie-break by created_at+note_id; render full local start time + attendees; validity-check the date. (Narrow: prod data shows ms-unique timestamps.)

**Infra**
- Unbounded Retry-After sleep: a 429 with Retry-After 3600 freezes brief-now for an hour with no user-facing notice. Guard: cap honored retryAfterMs (~30s), surface the wait.
- Fenced/annotated codex JSON burns 3 full brain runs then triggers #5. Guard: fence-strip/outermost-brace salvage; treat parse failures as non-retryable-at-brain-level.

**Concurrency**
- Poller checkpoint read-modify-write race (brief-now vs 60s daemon poll): double-ingest (no dedupe on append) + high-water-mark regression. Guard: lockfile or merge-on-write; dedupe_key uniqueness at ingest.
- Signals checkpoint mutual clobber: last-writer-wins erases the other's success entries → repeated multi-minute re-extraction + duplicate runs. Guard: same lock; or treat existing current-run manifest as sufficient skip.
- Double extraction window (per-process inFlight guards only) during the full brain-call duration → two supersedes:null runs; canonical resolver self-heals but brief-now's all-runs read does not. Guard: cross-process lock + current-run filter.
- Interrupt/append-failure orphan signals (atoms appended before manifest, non-atomic :750-776) visible forever to brief-now's raw query. Guard: transaction or manifest-first write + current-run filter.

**Delivery**
- No sensitivity guard between generation and send: argv-less pick sits adjacent to "EchoBrain Legal"/equity-negotiation notes in the live DB; human paste is the only gate. Guard (today): "REVIEW BEFORE SENDING — meeting: <title>" banner + owner-only output dir; (any auto-send future): note-identity ack + freshness gate + recipient⊆attendees check are hard prerequisites.
- UTC-day date render: any meeting after 5pm PDT gets tomorrow's date (~15% of real meetings, verified in prod). Guard: `toLocaleDateString('en-CA', {timeZone})` + Invalid-Date fallback.

## 3. Guard allocation

**Brief-generator backlog item (harden the script + its pipeline path):**
- Fail-loud gates: poll.status, extraction.status, current-run-manifest-exists-for-target (top-5 #1, #2)
- Freshness guard + mandatory title/local-time/attendees confirmation line (#1)
- `filterToCurrentSignalRuns()` instead of dedupe_key-over-all-runs (duplicates, orphans)
- Per-signal owner: prompt change + per-line render (#4)
- Re-ingest-on-newer-updated_at / content-hash-in-fingerprint (#3) — pipeline change, poller+signals
- Failure retry-after backoff + `--force` checkpoint clear (#5); fence-salvage parse
- Target-note-first extraction (or note_id-scoped worker run) instead of oldest-first batch
- Render hygiene: sanitization, local-TZ date, date-validity guard, tie-break
- Cross-process lockfile for both checkpoints; retryAfterMs cap
- "REVIEW BEFORE SENDING" banner on output

**Calendar-trigger item (the future meeting-ended trigger):**
- Calendar cross-check: assert "a meeting ended at T and a matching note became visible" — the only structural fix for the private-workspace/invisible-note class ("ECHO cannot see your meeting" stated, not inferred)
- Explicit meeting→note binding: trigger passes note_id/expected time window; retry-until-published loop replaces the human's premature manual run (dissolves most of #1 and #3's settleMs:0 pressure)
- Auto-send prerequisites (recipient⊆attendees or folder allowlist, note-identity ack, single-writer lock) live HERE, gated before any channel post ever ships

**Pilot-onboarding checklist (human procedure, this week):**
- Verify the Granola API key covers the workspace the advisor meetings land in (My Notes invisibility check) — do a test poll before the first real meeting
- Instruct: wait ~5 min after meeting end OR pass note_id explicitly; "stable across retries ≠ correct" for this build
- Instruct: eyeball title/date/attendees against the actual meeting before pasting; check Decided/Actions aren't empty when decisions were clearly made
- Document the recovery path: hand-edit/delete `~/.echo/state/granola-signals-checkpoint.json` entry if a meeting never extracts (until `--force` ships)
- Evening meetings: date in header may be off by one day until TZ fix lands
- Never paste a brief containing @channel/@here/code fences without reading it raw first
