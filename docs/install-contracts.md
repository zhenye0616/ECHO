# Install contracts — current vs target

**Date:** 2026-07-11 · **Status:** committed 2026-07-11 (WS5) · **Scope:** the two install contracts, kept explicitly separate

There are two contracts. One is a **diagnostic/lab install that exists today**. The other is the **client product endpoint that is not built and must never be presented as installable.** Conflating them is the exact drift the clarity sprint is closing. Under the clarity halt (G2 unsigned), this document is documentation only; it authorizes no build.

---

## CONTRACT A — Current pre-carve install (diagnostic / lab only)

**Status: installable today. This boots the FULL ECHO lab daemon, not a carved product.** Suitable for founder-operated lab use and clean-machine rehearsal, not for client delivery.

### Requirements

- **macOS only.** POSIX process-group kill, `Atomics.wait`, launchd, and the `~/Library/Application Support/ECHO` data dir are macOS/POSIX assumptions; the win32/linux branches are aspirational and untested in anger.
- **Node ≥ 22** (engines gate; relies on global `fetch`/`AbortController`/`crypto.randomUUID`; `better-sqlite3` native binding must match the Node ABI/arch).
- **`GRANOLA_API_KEY`** (env, or `~/.echo/state/granola.json`). Must match `/^grn_/`. Absent/invalid → the poller is **silently disabled** while `echoctl brief` throws loudly; the split is a real trap.
- **An installed and authenticated brain CLI** — Codex (`codex login`) or Claude Code — because extraction spawns `codex exec … --sandbox read-only` or `claude --dangerously-skip-permissions -p`. **Vendor login cannot be self-healed by the installer:** a fresh box stays `doctor: degraded / auth-required` until a human runs `codex login`. Version-pinned expectations exist (codex-cli 0.137.0, Claude Code 2.1.183).
- **launchd** manages the daemon; it serves MCP on `127.0.0.1:38478`.

### Install shape

`npm pack` → `npm install -g <tarball>` → `echoctl daemon install` → `echoctl init` → `echoctl doctor`, then `codex login` and re-check `doctor`. (Canonical steps: `docs/echoctl-install.md`.)

### Known operational caveats (from the trap map — must be conveyed, not left as folklore)

- **Shared-workspace habit.** A `grn_` key can NEVER see private "My Notes" — it is the vendor's access model, not a founder quirk. Meetings must live in a shared space the key can see, or the loop silently sees nothing.
- **Transcript pre-check.** A note needs BOTH a summary atom AND a transcript atom to be extracted; transcript-only or summary-only notes are dropped. Confirm the workspace produces both before the first real meeting.
- **Edit-before-poll freeze rule.** First ingest freezes content; verify title/date/attendees before relying on a brief. Evening meetings can render a day off if the box timezone ≠ the meeting owner's.
- **~20-min Granola latency floor.** Poll interval + settle (10 min default) + tick (5 min) ≈ ~15 min worst-case, ~20 min realistic, before a brief is even attemptable. The founder shortcuts this with `settleMs=0` one-shots; a client would not know to.
- **Plist-wipe trap on daemon reinstall.** PlistBuddy-added env keys (e.g. Slack tokens) in the launchd plist are **wiped by a daemon reinstall**; re-add them after any reinstall.
- **Restart after every upgrade.** There is no `postinstall` auto-restart; `echoctl daemon restart` (env reload = `bootout` + `bootstrap`, not `kickstart -k`) is required to load new bytes.
- **First-run blast radius.** The signals path has no first-run cutoff and extracts oldest-first at ~1 note/min — a populated workspace on a fresh box can spend hours (and real dollars) extracting history while today's meeting waits last in line. This is a known must-fix, not a configuration option.

---

## CONTRACT B — Target post-carve client product (NOT YET SHIPPED)

**Status: NOT BUILT. Never present as installable. Never hand a client a "Contract B" install.** This is the endpoint the graduation pipeline (`2026-07-11-team-product-graduation-pipeline.md`) exists to reach; today's candidate is formally DEV.

### Intended requirements (target, not current)

- **macOS** (phase 1 stays macOS-only).
- **Node** + a **versioned product package** — the build-once artifact, not the full-lab npm tarball.
- **`GRANOLA_API_KEY`** + **`ANTHROPIC_API_KEY`** — the target brain binding is a direct Claude Agent SDK call, removing the installed/authenticated brain-CLI requirement of Contract A. (The direct-SDK pattern already exists in `src/surfaces/ceo-slack-responder/intake-agent.ts` but is not yet wired to Granola extraction.)
- **A product launchd unit** distinct from any lab daemon label, with its own `ECHO_HOME`, database, port, and logs.
- **Product-only composition root** — boots only meeting input, extraction + API-key brain, the human gate, brief generation/delivery, local state, and health. It must not boot the lab worker set, dev-capture extractors, or Fleet/MCP orchestration; absence of config must fail closed.

### What separates B from A

Contract B requires the product composition root, runtime isolation, `tests/product/`, a build-once artifact with a recorded SHA-256, and every release-qualification matrix cell green — none of which exists today. No capability is client-facing merely because it ships in the current generic tarball. Installing a QUALIFIED artifact only *starts* client acceptance; CLIENT LIVE requires a real meeting, a useful brief, repeat use, and recovery ownership.

---

## Retired install docs

The three retired install docs (docs/SEND-TO-TESTER.md, docs/echo-init.customer.example.json via docs/echo-init.customer.example.README.md, and the scope banner on docs/echoctl-install.md) carry dated supersession banners pointing here, so the dead Machine-context product cannot be handed to a client by accident.
