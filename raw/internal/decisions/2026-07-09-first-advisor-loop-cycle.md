# First real advisor-loop cycle — concierge run (2026-07-09)

**What happened:** the lab-pilot's first genuine meeting (founder + advisor, "Drone detection model — segmentation, memory bank matching, and demo readiness", not_e6mLksNNr7aqBv) ran the full loop same-day, stages 1→5 with 2/3/5 concierge per the canonical model: Granola capture → ingest 15:57 PDT → forced signal extraction (settleMs=0 one-shot; 6 decisions / 3 actions / 6 rationales, codex brain) → 9-line changeset card posted to the confirm channel (draft 8f40ef6c, item 130 tier-1 path) → strategist triage verdict (all NEW vs 8-decision ledger; verdict blocked from posting to thread by harness — delivered in-chat) → founder sent the post-meeting brief to the advisor via Mattermost BY HAND.

**Meeting-end → card ≈ 70 min**, dominated by human-side gates, not compute (extraction ~40s, card compile+post ~30s, classifier ~30s).

## Friction observed (in order hit)

1. **Account/workspace visibility:** the note initially landed OUTSIDE the EchoBrain Granola workspace — API key saw only 2 notes; founder had to move/share the note in-app. Pilot setup checklist item: whose account records, which workspace the note lands in. (The advisor's own meetings will live in THEIR account — unresolved for n=2.)
2. **Signal settle window:** 10-min settle + 5-min tick means ~15-min natural latency post-ingest; founder asked to force it. One-shot with settleMs=0 worked; a "meeting just ended, do it now" fast-path is a real UX need.
3. **External-attendee gate:** the 109 client-intake filter skips solo-attendee notes (advisor joined w/o calendar invite → sole attendee = founder → notes_seen 0). Bypassed with internalDomains=[]. At producer go-live this gate is WRONG for the decision-loop content class — routing by content class (canonical-model answer) supersedes attendee topology.
4. **Brief delivery is Mattermost**, not Slack — the pilot's channel (Zoom + self-hosted Mattermost per recap-pilot decision). Auto-brief needs a Mattermost adapter; today's brief was strategist-drafted, founder-pasted.

## Quality signal

- Classifier decision_type spread was GOOD this run (4 executable / 1 directional / 3 conditional / 1 negative — correct kill on keypoint-confidence), vs yesterday's all-executable flattening on the legal note. n=2; watch whether research meetings classify better than negotiation meetings.
- Extraction was faithful; the brief sent to the advisor was derived 1:1 from card lines — the human-readable render of what stage 4 would dispatch. Founder verdict implicit: sent unedited.

## Open

- Card 8f40ef6c still `pending` rev 1 — tier-2 edit pass + any ratification deferred (responder not brought up; confirm-after-edit gap unfixed; no Linear locally).
- Triage-stamp thread post requires explicit founder authorization per harness policy — fold into the go-live design (the stamp should be ON the card, not a thread reply).
