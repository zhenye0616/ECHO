# Granola API access model — empirical findings (2026-07-10)

Investigated by a read-only agent (docs sweep + live probes with the EchoBrain key) after the 2026-07-09 advisor meeting landed in private My Notes and was invisible to the poller. Full evidence table at bottom.

## The verdict

**The EchoBrain `grn_` key is workspace/team-scoped, bound to the single "EchoBrain team" space (spa_TxQ7AVnfH8RZ45). It cannot reach private "My Notes" — on any account, ever.** No query param unlocks it (include_private/scope/visibility all silently ignored); no admin cross-member endpoint exists (/me, /workspaces, /spaces/{id}/notes all 404). A meeting is API-visible iff it lives in a space the key is scoped to. Private My Notes is a structural dead zone.

## API surface (tiny)

GET /v1/notes (page_size ≤ 30), /v1/notes/{id}?include=transcript, /v1/spaces, /v1/folders. Nothing else. No webhooks found → end-of-meeting triggering must come from calendar end-time + aggressive polling, not push.

## Setup fix (n=1, founder)

1. **BEST: Granola app-side auto-assign** — route new meeting notes into the EchoBrain team space by default (calendar-based auto-share / folder default). Zero ongoing friction; verify the setting exists on the current plan.
2. Alternative: regenerate as a **personal key with "personal notes" scope** — reads all notes the key owner owns incl. My Notes; solves n=1 only. (Docs inconsistent on plan gating: Business vs Enterprise.)
3. Worst: status quo + manual move per meeting (today's failure mode).

## n=2 (lab pilot, advisor)

Zhen's key can never see the advisor's notes. Options: (a) advisor joins the workspace AND their meetings auto-assign to a shared/API-granted space — existing key works, no new creds; (b) advisor issues their own personal-scope key and the poller grows **multi-key support** (not built; V1.5+ item). Either way the invariant holds: note must land in a key-visible space. This goes on the pilot onboarding checklist.

## Evidence log (all read-only)

/notes → 3 notes, all team-space, hasMore:false; page_size=100 → 400; include_private/scope/visibility params ignored; folder_id filter works; /spaces → only spa_TxQ7AVnfH8RZ45; /folders → 4 (BIASLAB, Customer calls, legal, Team meetings); /me,/workspaces,/api-keys,/spaces/{id},/spaces/{id}/notes → 404. Docs: docs.granola.ai/introduction (personal vs workspace keys; workspace key = "public notes + spaces granted API access").
