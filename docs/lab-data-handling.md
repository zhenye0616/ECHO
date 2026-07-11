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

## Network egress (exactly two endpoints)

The meeting→brief loop makes outbound calls to exactly two external services:

1. **Granola API** — `https://public-api.granola.ai/v1`, to pull meeting notes/transcripts.
2. **The brain vendor** — today via a local CLI subprocess (`codex` / `claude`), which itself calls the vendor's API; the future path is a direct `ANTHROPIC_API_KEY` call.

Nothing else leaves the machine for the brief loop. Note: nothing in the code reads `HTTP_PROXY`/`HTTPS_PROXY`, so a corporate proxy or TLS-interception layer on a managed machine is an untested/likely-breaking regime for both endpoints.

## Local MCP surface

The daemon serves MCP on **`127.0.0.1:38478`** (loopback only, overridable via `--port`). It is bound to localhost, not exposed on the network, but any local process/user on the machine can reach it. Treat it as a local-trust boundary, not a remote one.

## Deletion story (honest)

There is **no selective delete** today. Because storage is append-only with no delete operation, the only way to remove captured data is to **delete the whole store** — `rm -rf ~/.echo` and the `echo.db` file (the documented "Full Removal" path). You cannot remove one meeting, one participant, or one note; it is all-or-nothing. Per-record forgetting (tombstone + audit) is a future item, not a current capability. Say this to the lab before capture, not after a deletion request.

## Residual public-repo exposure

The ECHO repo is public and has been since 2026-06-06. Any live-capture-derived content that was ever committed is world-readable and **may persist in clones, forks, and caches even after redaction or a history rewrite.** Redaction-at-HEAD and (if executed) `filter-repo` reduce future exposure and clean the canonical tree; neither can retract what was already published. This residual is real and is not closed by any action in this sprint; it is tracked in the WS2 exposure register.
