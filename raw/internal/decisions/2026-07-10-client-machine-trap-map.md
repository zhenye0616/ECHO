# Client-machine trap map (2026-07-10)

Code-grounded audit of every environment assumption in the meeting→brief client product — the answer to "what works on my machine but breaks on a fresh machine, including the traps I can't predict." Compiled from two full-path code sweeps (env/config/binary/path layer + first-run/workspace/timing/human layer); every entry carries file:line evidence. Companion to `2026-07-10-product-carve-unknowns-register.md`.

Legend: **[NEW]** = surfaced by this audit, previously unknown/unstated · **[known]** = founder already named it · **[half]** = suspected, now evidenced.

## 1. Binaries & runtimes

- **[known] Brain CLIs.** Extraction spawns `codex exec … --sandbox read-only --json -` or `claude --dangerously-skip-permissions -p` (`src/brain/brain.ts:122-143`); version-pinned expectations (codex-cli 0.137.0, Claude Code 2.1.183). Missing binary → preflight fails; signals worker degrades-and-retries per tick (`brain_unavailable`, `granola-signals.ts:1172-1184`) — NOT permanent, good. Missing auth → run errors surface as `extraction <reason>`. Resolution path: API-key brain binding item.
- **[half] Vendor login is explicitly not self-healable.** `docs/echoctl-install.md:22-29`: fresh install stays `doctor: degraded / auth-required` until a human runs `codex login`. The one step the install doc admits cannot be automated.
- **[NEW] Node ≥22 engines gate** + implicit reliance on global `fetch`/`AbortController`/`crypto.randomUUID`; `better-sqlite3` native binding must match node ABI/arch.
- **[NEW] Env-config parse errors permanently disable the worker** (bad `ECHO_CEO_BRAIN` value, non-absolute context repo path → `disabled` heartbeat, no retry — `granola-signals.ts:944-951, 1143-1161`), while missing-binary only degrades. A typo'd env var is WORSE than an absent binary.

## 2. Secrets & config (absence behavior is the trap)

- **[known] `GRANOLA_API_KEY`** (env, fallback `~/.echo/state/granola.json`): absent/invalid → **poller silently disabled** (`skipped/disabled`, `granola-poller.ts:996-1003`) but **`echoctl brief` throws loudly** (`brief.ts:94-98`). Split behavior: the daemon quietly does nothing; only the CLI complains. Key must match `/^grn_/` (`:18`).
- **[NEW] Key custody is plaintext** — env or `granola.json` file; no keychain anywhere in the product path.
- **[NEW] `ECHO_LOG_LEVEL` resolved once at module load** (`logging/index.ts:26,33`) — can't change verbosity on a running daemon.
- Tunables that exist but nobody will know about on a client box: `ECHO_GRANOLA_SIGNAL_BRAIN{,_TIMEOUT_MS}`, `ECHO_GRANOLA_SIGNAL_CONTEXT_REPO_PATH` (defaults to `process.cwd()` — **cwd-sensitive**, `granola-signals.ts:946-948`), `ECHO_MCP_URL`, `ECHO_HOME`, `ECHO_DATA_DIR`, `ECHO_DB_PATH`.

## 3. Filesystem

- **[NEW] `DEFAULT_GIT_REPOS = ['~/Desktop/Project_echo/']`** — the founder's desktop path is a hardcoded default (`capture/sources.ts:7`). Dev-capture side, not the brief loop, but it ships in the tarball's defaults: a full-daemon run on any other machine tries to watch a nonexistent founder path.
- **[half] darwin data dir hardcoded**: `~/Library/Application Support/ECHO` (`daemon/lifecycle.ts:44`); win32/linux branches exist but are untested in anger (known init.test.ts cross-platform suspicion).
- **[NEW] WAL-mode SQLite (`sqlite.ts:68-71`) is unsafe over network filesystems** — the box's db must live on a local disk, never NFS/SMB/iCloud-synced paths.
- Missing state dirs are self-healing (`mkdirSync recursive` before writes); ENOENT checkpoints = silent fresh start; **corrupt** checkpoint = hard `checkpoint_failed` (`granola-poller.ts:548`).
- **[NEW] Heartbeat writes are fail-soft/swallowed** (`worker-heartbeat.ts:64-72`) — observability itself degrades silently on a sick filesystem.

## 4. Local services

- **[known] Dead MCP default** `http://127.0.0.1:38478/mcp` (`brain.ts:827,1132`). Nuance from the sweep: the signals/brief path uses plain `runBrain` — the retrieval-capture proxy is only wired into the intake classifier — so the brief path's exposure is the inherited env default in brain children, resolved by 132's retrieval-less mode.
- **[known] PID lock** `<dataDir>/daemon.pid`; duplicate live PID → hard exit (`lifecycle.ts:71-89`).

## 5. Network egress

- Exactly two external endpoints for the client loop: `https://public-api.granola.ai/v1` (`granola-poller.ts:13` — overridable per options, **no env var**) and the brain vendor (via CLI today, API later). Corp proxy/TLS interception on a managed client machine hits both; nothing reads `HTTPS_PROXY`.
- Granola request timeout 15s, single rate-limit retry (Retry-After capped 30s), **page_size hard-capped at 30 by the API — >30 is HTTP 400, confirmed live** (`:17`).
- **[NEW] Pagination safety cap = 1,000 pages ≈ 30,000 notes** → `pagination_failed` on a giant workspace first-poll (`:888,911-916`).

## 6. Platform

- launchd for daemon management; POSIX process-group kill (`process.kill(-pid)`, `brain.ts:798-808`); `Atomics.wait` busy-sleep in the projects lock (`paths.ts:310-312`). All macOS/POSIX-fine, win32 aspirational — consistent with B4 (macOS-only phase 1).
- **[NEW] No TCC/Full-Disk-Access exposure in the client loop** — the meeting→brief path is 100% API-based; the only `~/Library` reads of other apps belong to the dev capture surfaces (Cursor/Claude/Codex paths), which the client profile never runs. One real macOS-permissions worry deleted.

## 7. Data state (first run) — the biggest NEW findings

- **[NEW — must-fix] The signals path has NO first-run cutoff.** Intake has a 7-day lookback (item 128, `granola-intake-candidates.ts:520`); signals queries ALL raw granola atoms with no `since` (`granola-signals.ts:791`). Fresh box + populated workspace = brain-extract the entire history.
- **[NEW — must-fix] Oldest-first starvation.** Extraction order sorts oldest-first (`granola-signals.ts:392`) at 5 notes/tick, 5-min ticks (~1 note/min throughput): on a backlogged fresh machine, **the meeting that just ended is LAST in line**. The demo-killing shape: install day + this-afternoon's meeting = brief unavailable for hours while 2019's notes extract.
- **[known] First-poll ingests the entire key-visible history** (`updated_after` absent when high-water-mark null, `granola-poller.ts:880-896`) — bounded only by workspace visibility and the 1,000-page cap.
- **[half] Poison pill:** 3 failed extraction attempts → note skipped forever until fingerprint change or `echoctl brief --force` (`granola-signals.ts:36,471-476,766-769`; `--force` wired at `brief.ts:135-137`). `--wait` is prescribed in the stress-test follow-ups but **not yet built**.

## 8. Account/workspace shape

- **[known, structural] The `grn_` key can NEVER see private "My Notes"** — no param unlocks it, no admin endpoint exists (`raw/external/precedents/granola-api-access-model.md:7,25`). The manual drag (BIASLAB) is not a founder quirk; it is the vendor's access model. **A client must be onboarded into "meetings live in the shared space" as a workflow habit, or the loop silently sees nothing.**
- **[NEW] Note-shape requirements for extraction:** a note needs BOTH a summary atom AND a transcript atom or it is dropped-with-warning, never extracted (`granola-signals.ts:364-380`); auto-target selection additionally requires a summary (`post-meeting-brief.ts:125`). A client whose Granola produces transcript-only artifacts (or who disables transcripts) gets structural silence.
- **[NEW] External-attendee gate:** solo/internal-only meetings can yield `notes_seen 0` — the founder bypassed with `internalDomains=[]` on the advisor call (`2026-07-09-first-advisor-loop-cycle.md:11`). A client running internal team meetings hits this immediately; the default assumes external-facing meetings.
- No webhooks (poll-only, 60s interval): end-of-meeting latency = poll + settle (10 min default) + tick (5 min) ≈ **~15 min worst-case before a brief is even attemptable** — founder shortcuts with settleMs=0 one-shots; a client won't know to.

## 9. Content shape

- **[NEW] English-only extraction prompt**, no language detection (`granola-signals.ts:984-1007`); `canonical_subject` demands English-orthography noun phrases.
- **[NEW] No transcript size cap** — summary + transcript embedded whole; timeout scales +1s/KiB to a 600s cap. A 3-hour client meeting is an untested regime (founder's observed max: 125KB ≈ 157s).
- Transcript parsing assumes `[start-end] Speaker: text` rendered lines (fallback: whole line, speaker='Speaker'); attendees accept strings or {name,email} objects, else render "unknown".

## 10. Human-operator knowledge (the concierge-in-your-head inventory)

Documented manual steps a client (or the box, unattended) would not know: the visibility drag; forcing settle (`settleMs=0` one-shot); external-attendee bypass (`internalDomains=[]`); hand-editing `granola-signals-checkpoint.json` to resurrect a poisoned note (pre-`--force` habit); `echoctl daemon restart` after every upgrade (no postinstall restart); `codex login` re-auth; verifying key-workspace coverage with a test poll before the first real meeting; eyeballing title/date/attendees before sending; never pasting a brief unread (evening-meeting date may be off by one day). Each of these is either an automation item, an error-message improvement, or a line in the onboarding doc — none may stay folklore.

## 11. Timing & cadence

- **[NEW, evidenced] All freshness/settle/high-water logic runs on the machine clock**, and the brief header renders in the **rendering machine's timezone/locale** (`post-meeting-brief.ts:122-142, 226-233`). Box TZ must match the meeting owner's TZ or evening meetings drift a day and freshness windows misjudge. For multi-TZ clients this is a real design gap, not a config nit.
- 30-min freshness window on argv-less brief; clock skew produces false "outside freshness window" rejections.

## 12. Cost & quota

- First-run blast radius ≈ one brain call per historical note, serialized ~1/min (see §7) — hours + real dollars on install day unless bounded.
- Rate limiting: single retry, then the note waits for the next tick; failure-retry 1h backoff, 3 strikes → poison pill (§7).

## What this map demands (proposed follow-ups)

1. **Signals first-run cutoff + newest-first ordering** (item 128's sibling, must land before ANY fresh-machine run — fixes §7's two must-fixes in one small spec).
2. **API-key brain binding** (named, not yet specced — no kanban item exists; correction 2026-07-11 — kills §1 entirely for clients).
3. **`--wait` flag** (already prescribed by the stress-test follow-ups; §8 latency).
4. **Client onboarding doc** distilled from §8/§10: workspace habit, key coverage test poll, internalDomains config, transcript requirement.
5. Box checklist inherits: local-disk db (§3 WAL), TZ set to meeting-owner TZ (§11), plaintext-key handling (§2).
