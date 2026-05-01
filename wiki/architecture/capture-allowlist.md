---
status: shipped
topic: Architecture
subtopic: Storage
aliases:
  - Capture Allowlist
  - CAPTURED_SOURCES
---

# Capture Allowlist

## Definition

The capture allowlist is the single canonical declaration of *what ECHO is allowed to observe*. It lives at `src/capture/sources.ts` as the constant `CAPTURED_SOURCES`, organized into five categories: `apps`, `domains`, `fs_paths`, `apis`, `git_repos`. Every capture surface ECHO ships — browser extension, Accessibility shim, file watchers, git watcher, API connectors — consults this file to know what is in-scope. The [[capture-gate]] is the runtime chokepoint that enforces it.

## The Five Categories

| Category | Match | Example |
|---|---|---|
| `apps` | Exact bundle ID | `com.todesktop.230313mzl4w4u92` (Cursor) |
| `domains` | Exact host (no subdomain wildcarding for V1) | `app.slack.com` |
| `fs_paths` | Prefix match after `~` expansion on both sides | `~/Library/Application Support/Cursor/User/workspaceStorage/` |
| `apis` | Exact name | `github` |
| `git_repos` | Exact match after `~` expansion + trailing-slash normalization | `~/Desktop/Project_echo/` |

Each category is paired with a typed predicate (`isAllowedApp`, `isAllowedDomain`, `isAllowedPath`, `isAllowedApi`, `isAllowedRepo`) that the gate calls. Predicates accept `unknown` and runtime-guard against malformed inputs — the boundary is defended at the type *and* runtime layers.

## The Empty-Initial Commitment (and How It Has Held)

`CAPTURED_SOURCES` shipped with all categories empty at item 003. The commitment was: **entries land alongside the capture surface that consumes them, in the same per-source PR, never speculatively in advance.** That commitment has held through items 009–012.

There is no remote config, no feature flag, no runtime mutation path. A change to the allowlist requires a commit, which is reviewable. Neither agents nor the founder can sneak sources in via a config edit.

## What's in the Allowlist Today

As of items 009–012:

- **`fs_paths`** — three entries:
  - `~/Library/Application Support/Cursor/User/workspaceStorage/` (per-workspace state, used for inferring the workspace_id of a composer)
  - `~/Library/Application Support/Cursor/User/globalStorage/` (where Cursor composer chat content actually lives)
  - `~/.claude/projects/` (Claude Code's append-only JSONL transcripts)
- **`git_repos`** — one entry:
  - `~/Desktop/Project_echo/` — the founder's dogfooding repo
- **`apps`, `domains`, `apis`** — still empty. Native-app capture (macOS Accessibility) and API connectors (GitHub, Slack) are V1.5+; the browser extension uses its own `host_permissions` manifest, not this list.

The canonical list is `CAPTURED_SOURCES` in `src/capture/sources.ts` — this page reflects it but does not replace it.

## Per-Source Decision History

Every entry in the allowlist traces back to a backlog item. The "why this path" reasoning lives there.

| Entry | Added by | Notes |
|---|---|---|
| `~/Library/Application Support/Cursor/User/workspaceStorage/` | `2026-04-30-009` (FS watcher), refined by `2026-04-30-010` | Workspace state — used to infer composer→workspace mapping. See [[cursor-extractor]]. |
| `~/Library/Application Support/Cursor/User/globalStorage/` | `2026-04-30-010` (Cursor extractor) | Where chat *content* lives. Drift-note 2026-04-30 corrected the original assumption that workspace storage held content. See [[cursor-extractor]]. |
| `~/.claude/projects/` | `2026-04-30-009` (FS watcher), refined by `2026-04-30-011` | Claude Code transcripts (`*.jsonl`, append-only). See [[claude-code-extractor]]. |
| `git_repos` category itself | `2026-04-30-012` (git capture) | Fifth category. Repos are not directories of files — commits are first-class events. Exact-match after `~` expansion and trailing-slash normalization. See [[git-capture]]. |
| `~/Desktop/Project_echo/` | `2026-04-30-012` | The dogfooding repo. Each additional repo is its own per-repo PR. |

## Why This Shape

Three properties matter:

1. **Auditability.** The audit page (Layer 5, V1 minimal) renders this file's contents verbatim. Users don't take our word for "what does ECHO see?" — they read the file. One source of truth, no divergence.
2. **Type safety.** `CAPTURED_SOURCES` is declared `as const`, so `Source` is a discriminated union derived from the constant's literal keys. Adding an entry to `apps` extends the union automatically; misspelling a bundle ID at a callsite is a compile error.
3. **Reviewability.** Allowlist changes appear in `git log` and PR diffs alongside the integration that needs them. The blast radius of a single commit equals the surface it adds, never more.

## What the Allowlist Is Not

- **Not a permissions UI.** The audit page surfaces the contents read-only; per-source consent toggles ("user disables Slack temporarily") are a separate later item.
- **Not user-configurable at runtime.** No JSON load, no env-var override. The constant is the contract.
- **Not pattern-based.** No subdomain wildcarding, no globs, no regex. Exact / prefix only for V1. Adds clarity at the cost of verbosity — a reasonable trade in a security-critical chokepoint.
- **Not per-user.** Single allowlist for all users in V1. Persona / per-user allowlists are V1.5+.

## Related

- [[sandboxed-capture]] — the broader principle this implements
- [[capture-gate]] — the runtime enforcer
- [[storage]] — accepts only events that pass the gate
- [[audit-page]] — renders this file for users
- [[drift-prevention]] — empty-initial is itself a drift safeguard
- [[fs-watcher]] — first surface to populate `fs_paths`
- [[cursor-extractor]] — added `globalStorage`
- [[claude-code-extractor]] — refined `~/.claude/projects/` usage
- [[git-capture]] — introduced the `git_repos` category
