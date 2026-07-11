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

## Network egress (complete conditional inventory — the full lab, not just the brief loop)

Contract A boots the full lab, so the honest inventory is every endpoint the lab *can* reach, each with the condition that arms it. There are **six conditional vendor endpoints**; every one is credential/flag-gated and fails closed when unconfigured. Code-verified 2026-07-11 (file:line evidence in the fixup commit); no telemetry, update checks, analytics, or runtime package installs exist anywhere in the runtime.

| # | Endpoint | Fires when | What leaves the machine |
|---|---|---|---|
| 1 | Granola API (`public-api.granola.ai/v1`) | `GRANOLA_API_KEY` (or `~/.echo/state/granola.json`) present; **default-on** in the daemon | Only the Bearer key; meeting notes/transcripts flow IN |
| 2 | OpenAI, via the `codex` CLI subprocess | Any brain worker runs and the `codex` binary is present — **codex is the unconfigured default brain**, no enable flag | The extraction prompt: meeting signals + retrieved ECHO context — substantive content OUT |
| 3 | Anthropic, via the `claude` CLI subprocess | Only when a brain is explicitly set to `claude` (`ECHO_*_BRAIN`) | Same prompt content OUT |
| 4 | Anthropic API in-process (`api.anthropic.com`, Agent SDK) | `ECHO_INTAKE_AGENT_PROVIDER=claude` **and** `ANTHROPIC_API_KEY`; default provider is deterministic/no-network | Intake/meeting text OUT (budget-capped) |
| 5 | Slack (Web API + persistent Socket Mode WSS) | Responder process needs `ECHO_SLACK_APP_TOKEN`+`ECHO_SLACK_BOT_TOKEN`; daemon intake/drift workers need `ECHO_SLACK_BOT_TOKEN` plus their own enable flags (`ECHO_GRANOLA_INTAKE_ENABLED`, `ECHO_DRIFT_SWEEP_ENABLED`, both OFF by default) | Decision/brief/drift cards, intake seeds — decision content, contradicting quotes, meeting titles/URLs OUT; replies IN |
| 6 | Linear (`api.linear.app/graphql`) | `ECHO_LINEAR_INTAKE_ENABLED` or the full six-variable `LINEAR_*` set; OFF by default | Issue creation with meeting-derived fields OUT; issue id/url IN |

**The meeting→brief wedge path uses only #1 + one brain (#2 by default — i.e., the default lab brief path sends meeting content to OpenAI via codex, not Anthropic).** Brief generation itself makes zero network calls; it composes from local state. Endpoints #4–#6 belong to the CEO Slack responder (a separate, manually-started process — the daemon does not boot it) and the two off-by-default daemon workers.

Note: nothing in the code reads `HTTP_PROXY`/`HTTPS_PROXY`, so a corporate proxy or TLS-interception layer on a managed machine is an untested/likely-breaking regime for all six endpoints.

## Local MCP surface

The daemon serves MCP on **`127.0.0.1:38478`** (loopback only, overridable via `--port`). It is bound to localhost, not exposed on the network, but any local process/user on the machine can reach it. Treat it as a local-trust boundary, not a remote one.

## Deletion story (honest)

There is **no selective delete** today. Because storage is append-only with no delete operation, the only way to remove captured data is to delete **every** location that holds it — and the set is larger than one directory:

1. **The database, including WAL/SHM siblings.** Default `~/Library/Application Support/ECHO/echo.db` plus `echo.db-wal` and `echo.db-shm` (WAL mode means recent captures can live in the `-wal` file, not yet in the main db). If the install used a custom location (`ECHO_DB_PATH` / `--db-path`, or `ECHO_DATA_DIR` / `--data-dir`), delete that location instead — check the launchd plist / env before assuming the default.
2. **State sidecars:** `~/.echo/` (poller checkpoints, high-water marks, the Granola key fallback, decision/changeset drafts, plus skills/roles/workflows/adapters config).
3. **Logs:** `~/Library/Logs/echo/` (default `--log-dir`) — daemon/worker logs can quote captured content in error paths.
4. **Any manual backups.** There is no automated backup today (register T9 open), but any operator-made copy of `echo.db` holds everything the original did; deletion must chase copies too.

Stop the daemon first (`echoctl daemon uninstall`), or WAL checkpointing can recreate files mid-delete. You cannot remove one meeting, one participant, or one note; it is all-or-nothing. Per-record forgetting (tombstone + audit) is a future item, not a current capability. Say this to the lab before capture, not after a deletion request. (The install doc's "Full Removal" section mirrors this list.)

## Residual public-repo exposure

The ECHO repo is public and has been since 2026-06-06. Any live-capture-derived content that was ever committed is world-readable and **may persist in clones, forks, and caches even after redaction or a history rewrite.** Redaction-at-HEAD and (if executed) `filter-repo` reduce future exposure and clean the canonical tree; neither can retract what was already published. This residual is real and is not closed by any action in this sprint; it is tracked in the WS2 exposure register.
