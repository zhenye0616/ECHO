# Lab data handling and retention

**Date:** 2026-07-11 · **Status:** committed 2026-07-11 (WS2) · **Scope:** what the ECHO lab stores, where, custody, egress, and deletion — stated honestly

This describes the **current founder-operated lab reality**, not the future client product. It is written to be handed to the lab pilot's counterpart before any live capture. Where the honest answer is "we don't have that yet," it says so.

## What is stored, and where

- **Capture store:** one SQLite database, default `~/Library/Application Support/ECHO/echo.db` (overridable via `ECHO_DB_PATH` / `ECHO_DATA_DIR`). Holds captured events — meeting summaries/transcripts pulled from Granola, git/tool activity on the dev machine, and derived signals/decisions. Backed by `better-sqlite3`, WAL mode.
- **State sidecars:** `~/.echo/state/**` — poller checkpoints, high-water marks, the Granola key fallback (`granola.json`), decision/changeset drafts. `~/.echo/{skills,roles,workflows,adapters}` hold config, not capture.
- **Local disk only.** The WAL-mode database is unsafe on network filesystems; it must live on a local disk, never NFS/SMB/iCloud-synced paths.

## Append-only, no delete, unbounded growth (disclosure)

The storage backend is **INSERT-only**. The `Storage` contract is three operations — `append`, `query`, `count` — with **no `update` and no `delete`** (`src/storage/interface.ts`). Consequences to state plainly:

- Captured events are never rewritten and never removed in place. Corrections are new rows, not edits.
- The store **grows without bound**; there is no retention window, GC, or truncation today. Encryption-at-rest is not implemented (listed V1.5+).
- "Forgetting" is a designed-but-unbuilt future: it will be a tombstone row, not a real deletion. It does not exist yet.

## Custody

Under the current B3 lab arrangement, **the founder holds the accounts** used in the lab workspaces (Granola key, brain-vendor auth, any Slack/Linear credentials). The data captured into the lab store therefore sits under founder custody on the founder's (or a founder-controlled) machine. After a client is onboarded onto their own machine, that machine becomes the client's loop-of-record and custody shifts — but that endpoint is **not installable today** (see `docs/install-contracts.md`).

## Network egress (complete over ECHO-owned code — the full lab, not just the brief loop)

Contract A boots the full lab, so the honest inventory is every network boundary the lab's **own** code can reach, each with the condition that arms it. There are **six ECHO-owned integration classes**; every one is credential/flag-gated and fails closed when unconfigured. Code-verified 2026-07-11 (file:line evidence in the fixup commit). The inventory is **complete over ECHO-owned code — not over the vendor binaries ECHO launches** (see the note below the table). Within ECHO's own runtime, no telemetry, update checks, analytics, or runtime package installs exist.

| # | Endpoint | Fires when | What leaves the machine |
|---|---|---|---|
| 1 | Granola API (`public-api.granola.ai/v1`) | `GRANOLA_API_KEY` (or `~/.echo/state/granola.json`) present; **default-on** in the daemon | Only the Bearer key; meeting notes/transcripts flow IN |
| 2 | OpenAI, via the `codex` CLI subprocess | Any brain worker runs and the `codex` binary is present — **codex is the unconfigured default brain**, no enable flag | The extraction prompt: meeting signals + retrieved ECHO context — substantive content OUT |
| 3 | Anthropic, via the `claude` CLI subprocess | Only when a brain is explicitly set to `claude` (`ECHO_*_BRAIN`) | Same prompt content OUT |
| 4 | Anthropic API in-process (`api.anthropic.com`, Agent SDK) | `ECHO_INTAKE_AGENT_PROVIDER=claude` **and** `ANTHROPIC_API_KEY`; default provider is deterministic/no-network | Intake/meeting text OUT (budget-capped) |
| 5 | Slack (Web API + persistent Socket Mode WSS) | Responder process needs `ECHO_SLACK_APP_TOKEN`+`ECHO_SLACK_BOT_TOKEN`; daemon intake/drift workers need `ECHO_SLACK_BOT_TOKEN` plus their own enable flags (`ECHO_GRANOLA_INTAKE_ENABLED`, `ECHO_DRIFT_SWEEP_ENABLED`, both OFF by default) | Decision/brief/drift cards, intake seeds — decision content, contradicting quotes, meeting titles/URLs OUT; replies IN |
| 6 | Linear (`api.linear.app/graphql`) | `ECHO_LINEAR_INTAKE_ENABLED` or the full six-variable `LINEAR_*` set; OFF by default | Issue creation with meeting-derived fields OUT; issue id/url IN |

**Rows 2–3 are handoffs to externally controlled vendor CLIs.** ECHO spawns the `codex` and `claude` binaries as subprocesses; it does not own, ship, or sandbox them. ECHO can verify only what **it** writes to the subprocess's stdin — the extraction prompt named in the table. Everything past that boundary is the vendor's: the CLI's own network endpoints, proxy handling, telemetry, auto-update behavior, and any tool-use it performs are opaque to ECHO and cannot be bounded or verified here. The no-telemetry / no-update-check assurance above is scoped to ECHO's own code **only** and does not extend to those vendor binaries. (Row 4, the Agent SDK call, runs in-process inside ECHO's own runtime, so it *is* covered by the ECHO-owned assurance; rows 1, 5, and 6 are ECHO's own HTTP/WebSocket clients.)

**The meeting→brief wedge path uses only #1 + one brain (#2 by default — i.e., the default lab brief path sends meeting content to OpenAI via codex, not Anthropic).** Brief generation itself makes zero network calls; it composes from local state. Endpoints #4–#6 belong to the CEO Slack responder (a separate, manually-started process — the daemon does not boot it) and the two off-by-default daemon workers.

Note: nothing in ECHO's own code reads `HTTP_PROXY`/`HTTPS_PROXY`, so a corporate proxy or TLS-interception layer on a managed machine is an untested/likely-breaking regime for the **ECHO-owned HTTP/WebSocket integrations** (rows 1, 4, 5, 6). The Codex/Claude CLIs' proxy behavior (rows 2–3) is vendor-controlled and unknown — they may honor, ignore, or partially honor proxy env vars; ECHO makes no claim either way.

## Local MCP surface

The daemon serves MCP on **`127.0.0.1:38478`** (loopback only, overridable via `--port`). It is bound to localhost, not exposed on the network, but any local process/user on the machine can reach it. Treat it as a local-trust boundary, not a remote one.

## Deletion story (honest)

There is **no selective delete** today. Because storage is append-only with no delete operation, the only way to remove captured data is to delete **every** location that holds it — and the set is larger than one directory.

First **enumerate candidate ECHO launchd jobs and stop the confirmed ones** before deleting anything. `launchctl list | grep -i echo` produces **candidates only, not an ownership boundary** — an unrelated product's label can match the string. For EACH candidate, inspect the label, its plist, and the plist's program/`ProgramArguments` path, and confirm they point at this ECHO install (`echoctl`/its dist) before acting; then stop it with `echoctl daemon uninstall --label <label>`, or `launchctl bootout gui/$(id -u)/<label>` for a confirmed ECHO label echoctl does not manage. Never boot out a job on a name match alone. A machine may run more than the default `com.echo.daemon` — secondary or `com.echo.selftest.*` daemons each carry their own label, ECHO_HOME, database, and logs, and each confirmed one must be stopped, or WAL checkpointing recreates files mid-delete.

Then delete every location that holds data:

1. **The database, including WAL/SHM siblings.** Default `~/Library/Application Support/ECHO/echo.db` plus `echo.db-wal` and `echo.db-shm` (WAL mode means recent captures can live in the `-wal` file, not yet in the main db). If the install used a custom location (`ECHO_DB_PATH` / `--db-path`, or `ECHO_DATA_DIR` / `--data-dir`), delete that location instead — check the launchd plist / env before assuming the default.
2. **State sidecars:** `~/.echo/` — or the custom `ECHO_HOME` / `--home` if one was set — (poller checkpoints, high-water marks, the Granola key fallback, decision/changeset drafts, plus skills/roles/workflows/adapters config).
3. **Logs, plist, label:** `~/Library/Logs/echo/` (default `--log-dir`, files `echo-daemon.out.log` / `.err.log`) — daemon/worker logs can quote captured content in error paths. A custom `--log-dir` moves the logs; a custom `--plist-path` / `--label` moves the launchd plist (default `~/Library/LaunchAgents/<label>.plist`). Delete the label, plist path, and log dir **actually in use**, not the defaults.
4. **Generated briefs:** `echoctl brief` writes `brief-<note_id>.json` and `brief-<note_id>.md` into its `--out-dir`, which defaults to the directory the command was run from — there is no single canonical brief location, so deletion must chase every directory where briefs were generated.
5. **Any manual backups.** There is no automated backup today (register T9 open), but any operator-made copy of `echo.db` holds everything the original did; deletion must chase copies too.

You cannot remove one meeting, one participant, or one note; it is all-or-nothing. Per-record forgetting (tombstone + audit) is a future item, not a current capability. Say this to the lab before capture, not after a deletion request. (The install doc's "Full Removal" section mirrors this list.)

## Residual public-repo exposure

The ECHO repo is public and has been since 2026-06-06. Any live-capture-derived content that was ever committed is world-readable and **may persist in clones, forks, and caches even after redaction or a history rewrite.** Redaction-at-HEAD and (if executed) `filter-repo` reduce future exposure and clean the canonical tree; neither can retract what was already published. This residual is real and is not closed by any action in this sprint; it is tracked in the WS2 exposure register.
