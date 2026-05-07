---
status: shipped
topic: Architecture
subtopic: System Architecture
aliases:
  - Artifact Identity
  - Artifact Identity Policy
  - Canonical Artifact ID
  - Artifact ID
---

# Artifact Identity (the join-key contract)

## Definition

The artifact-identity policy is the rule that decides what makes two `artifacts[]` entries refer to *the same thing*. It is the single most load-bearing piece of the [[normalization|normalizer]] — the [[work-trace|trace layer]] joins clusters by exact match on `(provider, type, id)` triples, so any inconsistency in identity rules produces split or merged clusters. Helpers ship at `src/normalize/artifacts.ts`; future adapters read this page before defining new artifact types.

## The Policy Table

| `type` | `provider` | canonical `id` rule | fallback |
|---|---|---|---|
| `file` | `local_fs` | `<repo_id>::<repo_relative_path>` if inside a git repo; else `abs:<absolute_path>` | absolute path |
| `repo` | `github` / `gitlab` / `bitbucket` / `git` | `git_remote_normalized_url` (lowercased; `.git` stripped; `git@host:owner/repo` → `https://host/owner/repo`) | — |
| `repo` | `local` | `local:<absolute_root_path>` when no remote is configured | — |
| `branch` | `git` | `<repo_id>::<branch_name>` | — |
| `commit` | `git` | `<repo_id>::<sha>` | — |
| `url` | `web` | normalized URL (lowercased host; no fragment; `?utm_*`-only stripped) | raw URL |
| `conversation` | (provider) | `<provider>:<session_id>` | — |
| `thread` | (provider) | `<provider>:<thread_id>` | — |
| `channel` | (provider) | `<provider>:<channel_id>` | — |
| `person` | (provider) | `<provider>:<account_id>` if known; else `email:<lowercased_email>` | name string |
| `doc` | (provider) | `<provider>:<workspace>:<doc_id>` | — |

## Why `provider` is Part of Identity

`(provider, type, id)` is the join triple, not just `id`. The provider namespace prevents collisions across systems — a `conversation` with id `s1` in claude-code is *not* the same artifact as a `conversation` with id `s1` in cursor, even if the local string happens to match. The [[work-trace|trace layer]] keys its artifact bucket on `${provider}:${type}:${id}` for exactly this reason.

## Helpers Shipped

```ts
// src/normalize/artifacts.ts
fileArtifact(repoId: string | null, absPath: string, repoRoot?: string): ArtifactRef;
repoArtifact(remoteUrl: string | null, localRoot: string): ArtifactRef;
branchArtifact(repoId: string, branch: string): ArtifactRef;
commitArtifact(repoId: string, sha: string): ArtifactRef;
conversationArtifact(provider: string, sessionId: string): ArtifactRef;
normalizeRemoteUrl(remote: string): string;
```

`normalizeRemoteUrl` is the workhorse:

- `git@github.com:zhen/echo.git` → `https://github.com/zhen/echo`
- `https://github.com/zhen/echo.git/` → `https://github.com/zhen/echo`
- `https://GitHub.com/Zhen/Echo` → `https://github.com/Zhen/Echo` (host lowercased; path preserved)
- Trailing slashes stripped; `.git` stripped; non-recognized hosts pass through with provider `git`.

`fileArtifact` cooperates with `repoArtifact`: if the file path is inside the repo root, the file gets `<repo_id>::<rel-path>` and provider `local_fs`. Outside the repo, it falls back to `abs:<abs-path>`.

## Documented V1 Limitations

These edge cases produce known-imperfect joins; V1 accepts them rather than building lineage tracking:

| Situation | Behavior | Why |
|---|---|---|
| Repo with **no remote** | `id = local:<root_path>`. Moving the worktree breaks all cross-event joins. | V2 work; few V1 users have rootless repos. |
| Same repo cloned in **two locations** | Both clones produce the same `repo_id` (the remote URL). File `id`s join correctly across clones because they're repo-relative. | This is the *good* case — by design. |
| File **outside any repo** (`~/Downloads`, `/tmp`) | `id = abs:<absolute_path>`. Move/rename produces a new identity. | V1 doesn't chase free-floating files. |
| File **renamed within a repo** (`git mv x.ts y.ts`) | Treated as different artifacts. | Lineage chasing requires git rename detection at trace-build time — V2. |
| File outside repo root but with repo context known | `id = abs:<absolute_path>` (the `repoId` argument is null) | The id rule keys on whether the file lives under the supplied root. |

## Implications for the Trace Layer

The [[work-trace|trace layer]] groups atoms by exact identity. Two consequences:

1. **Same-file atoms across tools join automatically.** A Claude Code turn that referenced `<repo>::src/types.ts` and a Cursor edit on `<repo>::src/types.ts` share an artifact and get a `shared_artifact` edge. This is the V1.5 magic.
2. **Same-repo atoms with no shared file artifact still join via the repo artifact.** Multiple files in the same repo that touch within the time window all share `<repo_id>` (a `repo` artifact emitted by the git adapter and referenced indirectly by file artifacts). This can be too aggressive; founder dogfooding observes this signal explicitly.

If clusters feel too coarse, candidate refinements (V1.5+):

- Weight non-repo artifacts higher in cluster scoring.
- Downgrade repo-only edges to a separate `same_repo` edge kind so the trace layer can distinguish "literally the same file" from "same project."
- Add `temporal_near` and `same_conversation` edge kinds (already in the future-list).

## Adding a New Artifact Type

When a new adapter (V1.5+ — GitHub PRs, Slack messages, Notion docs) lands:

1. Pick a `type` and `provider` pair that doesn't already exist.
2. Define the canonical-id rule. Follow the pattern: `<provider>:<external-id>` is the V1 default for thread/channel/person/doc artifacts.
3. Add a documented edge case for renames/moves if relevant.
4. Add a helper to `src/normalize/artifacts.ts` if the rule is more than a one-line concat.
5. Update this page's policy table in the same PR.

The wiki page is the contract — adapters that disagree with the table are wrong.

## Related

- [[normalization]] — the layer that emits artifacts
- [[normalized-context-event]] — the schema field shape
- [[work-trace]] — the consumer that joins atoms by artifact identity
- [[storage]] — raw events live here; adapters never reach into storage to chase identity
