# Hunt results — "pain, no fix yet" leads (cross-vendor agent message-bus)

**Date:** 2026-06-02
**Assignment source:** [`2026-06-01-office-hours-wedge-loop-and-alpha-persona`](../decisions/2026-06-01-office-hours-wedge-loop-and-alpha-persona.md)
**Screen used (refined by founder mid-hunt):** Find people who **complain or demand a fix** for the cross-vendor agent context problem (running ≥2 AI tools/agents from different vendors on one piece of work, becoming the manual "message bus") **but have NOT built a reliable workaround.** This *inverts* alpha-persona criterion #5 ("already duct-taped it"). The founder's call: people who already have a working duct-tape are **not the immediate customer** — the immediate customer is mid-frustration and openly shopping.

**Method:** three parallel hunts (Reddit, HN/forums/GitHub, X/Discord/Substack). Founder's verification rule applied: HN candidates I personally re-read on-page; Reddit was hard-blocked to me directly (verified by hunt agent via Redlib mirror — flagged); X/Discord largely invisible to web search (snippet-only — flagged).

---

## The meta-finding (read first)

This screen is **structurally hard to fill on the open web**, and *why* it's hard is itself signal. Almost everyone who feels this pain acutely **builds a bad workaround** (a markdown file, an overnight MCP hack, a Notepad context file) and then shows up in search as a *builder*, not a *complainer*. A Memory Store founder (HN) reported running 35 interviews + 90 surveys and found **"95% had already built workarounds for this problem (custom GPTs, claude.md templates, copy-paste workflows)."** So the pure "aching + zero workaround" voice is rare — but the *shopping-while-unhappy* voice (has a brittle hack, openly wants a real solution) is abundant. Both are below. The founder should decide whether "no fix" means "literally no hack" (small pool) or "no *reliable* fix, actively shopping" (large pool, includes brittle-hack-havers who say so).

---

## TIER 1 — personally verified on-page (HN), clean "asking the room, no fix"

**1. `arapkuliev` — Hacker News.** *Best single match.*
- "Ask HN: How do you manage context/memory across multiple AI tools?" — https://news.ycombinator.com/item?id=46885728
- Verbatim: *"I use Claude for some tasks, Cursor for coding, ChatGPT for research, and Perplexity for quick lookups. The problem is none of them know what I've discussed with the others. I find myself re-explaining the same context repeatedly, or copy-pasting from Notion docs... How are you managing shared context across tools?... Have you found any solutions that work well?"*
- Passes: four vendors, human-as-bus, explicitly asking the room, endorsed none of the markdown/MCP replies. Definitionally no reliable fix.

**2. `denis4inet` — Hacker News.**
- "Ask HN: What is the 'Control Plane' for local AI agents?" — https://news.ycombinator.com/item?id=47242849
- Verbatim: *"I've been running an increasing number of local coding agents (Claude Code, Codex CLI, OpenCode, etc.) and I've hit a wall: orchestration and state visibility... Has anyone seen a project that addresses the Control Plane problem for local agents?"*
- Passes: explicitly multi-vendor, says his GitHub-Issues hack is inadequate, asking for purpose-built tooling. Caveat: his framing leans orchestration/observability more than pure context-bus — adjacent, not dead-center.

## TIER 2 — verified via Redlib mirror by hunt agent (Reddit; I could not re-confirm directly — eyeball before outreach)

> Reddit is hard-blocked on every channel available to me. The hunt agent confirmed each quote/username against live thread text via a Redlib mirror, not reddit.com's own UI. Treat as strong-but-not-personally-reconfirmed.

**3. `rocinno` — r/codex** (posted ~last week, fresh). *Cleanest Reddit match.*
- https://www.reddit.com/r/codex/comments/1tpu3we/
- Verbatim: *"been using codex and claude code in parallel for a while, sometime i need to copy & paste chats between tools... is there a best practice to share chats / context between them...? would love to hear how you sovle this"*
- Passes: two vendors, manual copy-paste, asking for best practice, no solution adopted.

**4. `JournalistFew2794` — r/codex.**
- https://www.reddit.com/r/codex/comments/1t4aki8/
- Verbatim: *"I usually work on VS Code and have to open two different chats going back and forth copying and pasting manually... Claude Code: Planning... Codex: Executing... Gemini:... Is there a tool where in the same chat I just fork or subagent a specific task to a different LLM... without this being a manual process of opening, closing chats, copying, pasting...?"*
- Passes: names three vendors, self-describes as the manual relay, "is there a tool" — no fix.

**5. `chonkvandelay` — r/ClaudeCode.**
- https://www.reddit.com/r/ClaudeCode/comments/1teoq7q/
- Verbatim: *"my workaround is manually copying and pasting messages from one agent to the other... this manual bridging feels incomplete and inefficient... Is there an extension, tool, or existing framework that allows two independent agents... to communicate with each other directly?"*
- Passes: calls his own copy-paste a workaround that's "incomplete and inefficient," shopping for a real tool.

**6. `PsychologyPowerful66` — r/codex.**
- https://www.reddit.com/r/codex/comments/1szjl3u/
- Verbatim: *"I always end up copy-pasting one piece at a time into the chat... across different agents feels really tedious... Is there a tool that lets you assemble multiple clipboard items + a prompt template...? Or is everyone just doing this manually? Genuinely asking before I cobble something together for myself."*
- Passes: textbook — frustrated, multi-agent, shopping, explicitly has NOT built it yet.

**7. `chumsdock` — r/ClaudeCode.**
- https://www.reddit.com/r/ClaudeCode/comments/1s11k7r/
- Verbatim: *"the two agents actually doesn't share much info, unless you handoff some markdowns. I want they to talk to each other and share most of the context during one job... I don't really like that way [subagents/skills]. Any thoughts?"*
- Passes: explicitly rejects the markdown-handoff and subagent workarounds, wants real shared context, still asking.

**8. `Pitiful-Impression70` — r/ClaudeCode (comment).**
- https://www.reddit.com/r/ClaudeCode/comments/1rywrcb/
- Verbatim: *"right now im literally copy pasting summaries between agent sessions like some kind of human message bus and its absurd..."*
- Passes: uses the exact "human message bus" framing, calls it absurd, has implemented nothing — still hand-relaying.

## TIER 3 — borderline: real pain + shopping, but has a brittle hack (lower priority per founder's screen)

These have *a* workaround but are visibly unhappy with it and shopping for better. By the strict screen they're secondary; by the looser "no *reliable* fix" reading they qualify.

- **`MoreRest4524` — r/ClaudeCode** (https://www.reddit.com/r/ClaudeCode/comments/1rg2odm/): *"I needed a context that was shared between them all. Does such a thing exist? For fun last night I got Claude to create an mcp... It works well, but if there's an official / more mainstream solution I'd be interested."* — built an overnight MCP, not committed to it.
- **`kevinsync` — HN** (https://news.ycombinator.com/item?id=47575576, verified): runs Claude + Codex in a plan→validate→review loop; his "context layer" is *"just a text file in Notepad"* straddling a Mac and a Windows box. Coping, not solved.
- **`tharkun__` — HN** (https://news.ycombinator.com/item?id=45728114, verified): runs Claude + Codex; only fix is hand-maintaining a markdown file and re-feeding it after Claude auto-compacts and *"instantly goes a-wall stupid."* Unhappy duct-taper.
- **`nemath` — HN** (OP of https://news.ycombinator.com/item?id=46626639, verified): asked the best way to provide *continuous* context to a model and, when probed manual-vs-automated, replied *"Automated fashion would be what I'm curious on."* Real demand, but framed as general research, not a personal multi-vendor pain story. *(Correction: an earlier pass mis-attributed this quote to `_boffin_`, who was only the person probing — the demand is nemath's.)*
- **`sukit` — HN** (https://news.ycombinator.com/item?id=47573483, verified): *"Two parallel sessions already feel like my limit... my brain starts falling apart within minutes... I honestly feel like I'm falling behind."* No fix found — but his pain is single-vendor multi-session, softer on the cross-vendor clause.
- **`vilibara` — r/ClaudeAI** (https://www.reddit.com/r/ClaudeAI/comments/1rmgj02/, mirror-verified): nails cross-vendor fragmentation (*"Every conversation is siloed... Web conversations don't connect to IDE conversations"*) but frames it as conversation *history/search* and says he doesn't code — adjacent to the agent-to-agent wedge.

## TIER 4 — X snippets, UNVERIFIED (could not open tweets; for human triage only)

X and Discord are effectively closed to web search — tweets returned empty on x.com and dead nitter mirrors; public Discord logs aren't indexed. The persona's loudest cohort likely lives here and is **invisible by method, not absent.**
- **@nasermetani** — https://x.com/nasermetani/status/2012729289226273154 — snippet describes manually relaying between Codex and Claude Code ("explain it to Codex first, then send the refined explanation to CC"). Likely passes; unconfirmed.
- **@xanderai** (Xander Dunn) — https://x.com/xanderai/status/2027839306296135790 — heavy dual-vendor user (~50B tokens across Claude Code + Codex) noting coordination gaps between them. High-intensity persona; unknown whether he's built a fix.

---

## Explicitly EXCLUDED (already built/shipped a fix — not the immediate customer)
Cihat Gündüz/@Jeehut (TandemKit), Maggie Appleton (Ace, GitHub Next — competitor), u/offlinethinker (agentbus.org), and a long tail of HN/Reddit "I built a shared-state / control-plane / context-sync tool" posters (Orcha, Clauder, Roundtable MCP, ContextLedger, Chorus, echovault, OpenClaw, gate-based SQLite orchestrators, etc.). Great *messaging* sources; not leads.

## Honesty caveats
- Tier 1 quotes I personally read on HN. Tier 2 (Reddit) carries the hunt agent's Redlib-mirror verification only — **eyeball each before outreach;** usernames can change/delete. Tier 3 mixes verified-HN and mirror-Reddit. Tier 4 (X) is snippet-only and unverified.
- Per founder's standing rule, **no one was contacted** — this is sourcing only.
- Recommended first contacts if/when you reach out: `arapkuliev` (T1, verified, perfect fit) and `rocinno` / `PsychologyPowerful66` (T2, cleanest "shopping, hasn't built it" language). `/sales:draft-outreach` will research and draft into Gmail when you're ready.
