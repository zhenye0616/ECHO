# Product carve-out unknowns register (2026-07-10)

Strategist-compiled register of unknowns surrounding the `src/product/` carve (items 132/133) and the phased wedge rollout. Requested by founder ("list all the unknowns that i am not aware and the unknowns that i might be aware but not specify"), folded into the specs by reference per founder instruction. Items marked **[gates 132 promotion]** or **[folded into spec text]** are live spec constraints; the rest are pre-pilot decisions or standing risks that must NOT silently vanish.

## A. Unknowns the founder was likely not aware of

**A1 — Invisible runtime MCP dependency. [gates 132 promotion; folded into 132 Context as OPEN block]**
The import fence only sees static imports. Brain children (signals extraction, intake classifier, decision responder) receive `ECHO_MCP_URL` (default `http://127.0.0.1:38478/mcp`, `src/brain/brain.ts:827`) for retrieval + retrieval-correlation. `echoctl product daemon` starts no MCP server → on a standalone box brains fail retrievals or record misleading `zero_retrievals` (the recording-proxy documented blind spot). The carve can pass every AC and still ship a degraded extractor. Founder decision owed: (a) bundle a minimal MCP endpoint into the product daemon, or (b) explicit retrieval-less product mode with honest `capture_status` semantics. 132 AC2 amended once decided.

**A2 — Extraction quality on a cold db is untested.**
All live validation ran against the founder's db (89+ signals, months of cross-tool context). A fresh customer db holds only meeting atoms. If retrieval context is load-bearing (axiom #7 = the moat claim), the product module on a cold db is an untested product. The cold-reader gate tested foreign *reading*; there is no gate for cold *formation*. Candidate gate: run the loop against a scratch ECHO_HOME + fresh db on a real meeting before first customer-facing run.

**A3 — Brain binding is the founder's personal account.**
Brains run as codex/claude CLI children authenticated as the founder. Concierge hides this; it is (i) an unpriced per-customer cost, (ii) a ToS question (founder subscription on customer content), (iii) a hard blocker for any self-install. No spec owns this. Owed: a decision + item before phase 2.

**A4 — Port shapes have donor bias. [folded into 133 Context]**
`MeetingSource` will be extracted from Granola (pull polling, page_size≤30, no webhooks, transcript present at poll time); Zoom differs (OAuth app review, cloud-recording perms, transcript lands minutes–hours after the meeting). `ChatChannel` will be extracted from Slack Socket Mode — Slack-proprietary; the lab's self-hosted Mattermost has a different websocket/confirm model. 133's "every method cites an existing caller" rule guarantees Granola/Slack bias by construction. Treat 133's ports as provisional; budget a port-shape revision when the first real Zoom/Mattermost adapter lands.

**A5 — Multi-tenant concierge topology undefined.**
The pid lock only serializes one ECHO_HOME. Customer #2 concierge = second box, or second ECHO_HOME on one box (two pollers, two brains billing the founder), or shared db (contamination). Nothing specs which. Owed before customer #2.

**A6 — Public repo, license, and customer data.**
`src/product/` is world-readable and licensed as-is (check LICENSE before pilot pricing conversations). The secret-history-scan owed since the repo went public (2026-06-06) is still owed and compounds as customer-adjacent code/config moves. Customer meeting content will sit as atoms on founder-controlled hardware with no written data-handling/retention story; the Slack-backfill sensitivity lesson applies directly.

**A7 — Parked-spec staleness. [folded into 132 promotion gate]**
Pre-freeze demo work keeps mutating exactly the files 132 moves. Every merge between now and promotion makes 132's move inventory + 133's spec_refs staler, and `_followups.md`/other specs cite pre-move paths that break after the carve. Promotion protocol: re-verify the move inventory against then-current main, re-pin SHAs, and sweep `_followups.md` + in-flight specs for path references. Review convergence now happens at a SHA that will not be the build SHA.

## B. Unknowns the founder likely knows but has not specified

- **B1 — Rollout calendar.** When does the lab expect a working loop; do 133 + Zoom + Mattermost adapters have a semester/grant deadline; what gates phase 2 (self-install)? The carve is infrastructure for a rollout whose calendar doesn't exist yet.
- **B2 — Phase-1 operator location.** Founder's laptop vs dedicated box vs hosted (fly.io). Decides launchd vs long-lived shell vs container for the product daemon; 132 defers launchd, which is only correct if concierge means "founder's terminal."
- **B3 — Credentials custody.** Whose Granola/Slack/Linear credentials run the pilot — customer's handed over, or founder's pointed at their workspace? The plist-wipe failure mode lives here; most fragile part of concierge setup.
- **B4 — Windows.** First beta tester is on Windows; product daemon inherits macOS assumptions. Is the wedge rollout macOS-only for now? Silently decides who can be customer #2/#3.
- **B5 — Pricing + name.** $25/mo was priced for the dev-bundle persona; the meeting→decision loop sells to a lab PI / team lead. The ECHO hard-rename deadline now implicitly covers a module name customers will see.
- **B6 — Definition of done for phase 1.** V1 had "≥3/5 ask when can I pay?". The wedge rollout has no equivalent; recap-pilot decision requires burned-buyer + WTP screens before adapter build. Left unspecified, the carve becomes the goal instead of the customer.

## Disposition

- A1 → OPEN block in 132; blocks promotion; founder chooses (a)/(b).
- A7 → promotion-gate re-verify text in 132.
- A4 → provisional-ports note in 133.
- A2, A3, A5, A6, B1–B6 → this register is their tracking home; end-of-window synthesis turns ripe ones into backlog items. None block 132/133 review convergence.

## Founder decisions — 2026-07-10 review session (post-convergence)

- **A1 — RESOLVED: option (b), explicit retrieval-less product mode.** 132's OPEN block converted to RESOLVED; AC2 amended with the pinned retrieval-less clause (deliberate no-retrieval distinguishable from broken capture). Bundled-MCP deferred to self-install phase as its own spec + review. A2's cold-db test remains the empirical price check on this mode.
- **B2 — RESOLVED: dedicated box the founder controls.** Consequence: the `com.echo.product.daemon` launchd unit + install story (132 After Completion follow-on) moves from "someday" to "needed for pilot uptime" — spec it after 132 merges. Hosted (fly.io) not pursued for phase 1.
- **B3 — RESOLVED: founder's accounts/bots invited into the lab's workspaces.** Fastest start; accepted trade: murkier data custody (couples to A6 — the data-handling story must now cover "founder's account can see lab content") and pilot breaks if access is revoked. Revisit custody at self-install.
- **B4 — RESOLVED: macOS-only for phase 1.** The Windows beta tester waits on the daemon-lifecycle port; Windows is NOT on the pilot critical path. B2's dedicated box is a Mac.
- Still open: A2 (run the cold-db gate pre-pilot), A3 (brain account — needs an owning item before phase 2), A5 (before customer #2), A6 (secret-history-scan owed; data-retention story now urgent-adjacent given B3), B1 (rollout calendar), B5 (pricing + name), B6 (phase-1 definition of done).

## Part 2 addenda — client scope pin + deployment topology (founder session, 2026-07-10 afternoon)

- **Client-facing scope PINNED: meeting→brief loop only.** No dev-tool capture surfaces (claude/codex/cursor extractors) and no client-side Slack/Linear legs for now. Implementation: NOT a code change — the intake bridge is off-by-default/fail-closed and the responder is credential-gated, so a Granola-only config yields exactly poller→signals→brief. "Client profile" = product daemon + Granola key, nothing else enabled. Intake/decision legs remain founder-side product inside src/product/.
- **Deploy shape RESOLVED (T4): tagged tarballs, never a git checkout on the box.** npm pack → versioned echoctl tgz → install + restart; rollback = previous tarball; data (db, ECHO_HOME state) untouched by redeploys; no hot-fixes on the box, all fixes flow monorepo→pack→deploy. Repo separation REJECTED (kernel dual-maintenance + loss of orchestration-loop leverage); org repo stays the phase-2 clean-split target; optional one-way filtered mirror only if a pilot asks for source.
- **Product brain binding via Anthropic API key — new high-leverage item (resolves A3 + day-one killer #1).** Extraction currently spawns founder-logged-in claude/codex CLIs; client machines must not need them. @anthropic-ai/claude-agent-sdk already a dependency. Minimal client deployment becomes: node + tarball + GRANOLA_API_KEY + ANTHROPIC_API_KEY + launchd unit. Founder's own box can keep CLI auth short-term.
- **Must-verifies before box day:** (1) first-run backfill bound — is signals extraction cutoff-bounded like intake (item 128) or does a fresh box brain-blast the entire Granola history? (2) brain behavior when auth expires unattended (headless child hang vs fail-loud).
- Data/deployment unknowns map (T1-T12) discussed and held in session notes; T1 (product source allowlist) and T2 (sidecar classification: instance-local checkpoints NEVER cross machines; loop-state does) to be pinned in the 134 spec; T5 remote-write path decided at 134 spec time (ssh-first likely); loop-of-record = prod box, copies flow prod→dev only.
