---
id: 2026-06-18-104-slack-meeting-context-capture
title: "Slack meeting-context capture — the meetings→founder leg of the n=2 loop, via Slack channel capture (NOT Granola; demand-gated behind 103)"
status: proposed
priority: MED
estimate: 2-4d (engineering) — after the demand gate clears
created: 2026-06-19
blocked_by: []
task_state_ref: 2026-06-18-104-slack-meeting-context-capture
requested_reviewers: ["codex", "codex-ops"]
claimed_by: ""
claimed_at: ""
branch: ""
head_sha: ""
pr_url: ""
agent_notes: ""
review_notes: ""
---

> **⛔ DEMAND-GATED (not feasibility) — DO NOT promote to `ready/` until AC0 clears.** Feasibility is
> high (Slack has a known API; in the V1 bundle; founder already in the channel). The open question is
> *demand*: the founder's revealed behavior says in-the-moment access-pain is **low**. Sequenced behind
> 103. (Gate is a non-item condition; see [[project_parked_specs_inbox_convention]].)

## Why

Split from item 103 (eng→CEO is 103); this is the **meetings→founder** leg of the n=2 context loop.

**Pivoted to Slack (2026-06-19) — away from the Granola API.** The revealed status-quo: the founder's
cofounder (CEO) **posts meeting notes to a Slack channel with a short distilled comment**, and the
founder **mostly reads the comment, rarely the full meeting.** Consequences:

- **The capture surface is Slack, not the Granola API.** This **eliminates the unverified-Granola-API
  risk** entirely (no feasibility probe). Slack has a documented API and is **already in the V1 bundle**
  (Cursor + Claude Code + GitHub + **Slack** + web AI). Bonus: it captures the **CEO's distillation** —
  the unit the founder actually consumes — for free.
- **Zero CEO action.** The CEO already posts to Slack; the founder's ECHO captures the channel the
  founder is **already a member of**, using the founder's **own** Slack token. No install, no
  folder-sharing, no behavior change, no federation.

**Demand is the thinnest in the sprint — be honest about it.** The founder's behavior shows the
*in-the-moment access-pain is LOW* (the comment works; he skips the raw meeting). The real, **untested**
value is **later-retrieval for decisions**: weeks later, mid eng/product decision, needing "what did the
client say about X / what did we promise," where **Slack search is poor and the comment was lossy.**
ECHO's value = a *queryable archive* of meeting context + the CEO's distillations, not in-the-moment
access (already solved). Whether that later-retrieval pain is real and recurring is what AC0 gates.

**Strategic bonus:** Slack is a V1-bundle capture surface anyway. 104 is the **first concrete driver**
for it, scoped to the meeting/sync channel(s), extensible to broader Slack capture later.

## Acceptance criteria

0. **AC0 — Demand gate (HARD; do NOT build before this clears).**
   - (a) **103's loop shows the pre-read/context-query behavior is real** — i.e., 103's DoD signal fires
     (the CEO self-serves / a sync skips the recap because a party arrived pre-loaded). If humans won't
     pre-read async context in the *validated* direction, the meetings→founder direction is moot.
   - (b) **Confirm later-retrieval is a recurring need** — the founder logs concrete instances (≥ a small
     threshold in a window) where he needed *past-meeting* context for a *current* decision and digging it
     out of Slack was painful. If access-pain stays low and reach-back is rare, **104 stays shelved** —
     the comment-in-Slack suffices.
   - (light feasibility note, not a gamble) confirm a Slack user/bot token with `channels:history` (or
     equivalent) is obtainable in the workspace for the scoped channel(s).
1. **AC1 — Slack atoms ingested + queryable.** Messages from the scoped channel(s) land as ECHO atoms
   (text, author, ts, thread, attachments incl. the meeting-notes doc + the CEO's comment), queryable via
   `search_memories`/`find_clusters`, organized by channel/thread/date.
2. **AC2 — Capture pipeline integration.** Slack flows through the existing pipeline as an **`api:slack`**
   surface (the `apis` category — empty today in `src/capture/sources.ts`; this would be its first member),
   including `search_memories(source_app='slack')` support (`src/mcp/util/source-app.ts` enum extension).
3. **AC3 — Scoped + privacy-sane.** Capture is scoped to the **explicitly-configured** meeting/sync
   channel(s), **not** the whole workspace by default. Founder-owned token; requires no other person's
   action. No `repo_root` on meeting atoms.

## Architecture (adapt ECHO's api-surface pattern; re-ground for Slack)

- Same **`api:` gate kind + `apis` allowlist category** the Granola consult identified
  (`wiki/architecture/capture-gate.md`, `capture-allowlist.md`); `CAPTURED_SOURCES.apis` is empty today
  (`src/capture/sources.ts`) — Slack would be its first member.
- **Ingestion:** Slack Web API polling (`conversations.history` with cursor + an `oldest`/checkpoint) is
  simplest for a scoped-channel archive; the Events API (webhook) is the push alternative. Decide at claim time.
- **Atom shape:** `source: "api:slack"`; append-only (one atom per message/edit); metadata: channel
  id/name, author, ts, thread_ts, permalink, has_attachment + attachment refs, workspace id. No `repo_root`.
- **Likely files_to_modify:** `src/capture/sources.ts` (+`'slack'` to `apis`),
  `src/capture/surfaces/slack-poller.ts`, `src/daemon/index.ts` (lifecycle),
  `src/normalize/adapters/slack.ts` + `dispatch.ts`, `src/mcp/util/source-app.ts` (enum), + tests.
- **⚠️ Needs its own architecture review for Slack specifics** (OAuth scopes, rate limits, threading,
  attachment fetch, message-edit/delete semantics vs append-only). The prior Codex consult was
  **Granola-specific** — its api-poller *pattern* carries over, but its surface claims do **not**.
  Send 104 to the review queue (or a fresh Slack-specific consult) before promoting to `ready/`.

## Out of Scope (Don't Drift)

- **The eng→CEO read-view + rationale capture** — item 103.
- **Granola API** — pivoted away (the data lands in Slack; no external-API gamble).
- **Whole-workspace Slack capture / Slack as a general surface** beyond the scoped channel(s) — extensible
  later, not in this item.
- **Federation / consent matrix / multi-party** — founder captures a channel he's already in with his own
  token; no one else acts.
- **Rewriting shipped-reality docs** until validated.

## spec_refs

- `backlog/proposed/2026-06-18-103-ceo-context-loop-n2.md` (the eng→CEO sibling this completes)
- `raw/internal/decisions/2026-06-18-office-hours-ceo-loop-rationale-capture.md` (design context, incl. the 06-19 wedge refinement + the Slack status-quo datapoint)
- `wiki/architecture/capture-pipeline.md`, `capture-gate.md`, `capture-allowlist.md`, `storage.md`
- `src/capture/sources.ts`, `src/mcp/util/source-app.ts`, `src/daemon/index.ts` (integration points)
- Prior Granola Codex consult (session `019ee109`, 2026-06-19) — **SUPERSEDED for the surface choice** (Slack, not Granola); its api-poller *pattern* still applies.

## After Completion (Strategist Notes)

- **If AC0's demand gate fails** (access-pain low, reach-back rare) → **shelve/close**; the Slack comment
  in-the-moment suffices and the meetings→founder leg isn't worth building. Record the negative result.
- **If it ships:** wiki home is a new `capture/` page for the Slack api-surface (a V1-bundle surface) +
  a `capture/per-app/slack-collected-data` field reference — after shipped + validated.
- Completes the bidirectional n=2 loop; revisit federation **only** if the loop cleared value.
- **NB (housekeeping):** item 103's `spec_refs` still points to the old `…-104-granola-capture-surface.md`
  filename — fix that pointer when folding the queued DoD upgrade into 103 post-review-convergence (batched
  to one safe 103 edit, to avoid racing the background reviewers).
