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
| **`workspace`** | **`local`** | **`<canonical_root>`** — the canonicalized project root directory (join key `local:workspace:<canonical_root>`). **This is the same-machine scope/join artifact (096).** | — |
| `file` | `local_fs` | `<workspace_id>::<repo_relative_path>` if inside the canonical root; else `abs:<absolute_path>` | absolute path |
| `repo` | `github` / `gitlab` / `bitbucket` / `git` / `local` | **Fallback only (pre-096 / when `canonical_root` is absent).** `git_remote_normalized_url`, or `local:<root>` when no remote. The normalized remote URL still *exists* but as the non-join `context.ambient.git_alias` (see below), not the same-machine join key. | — |
| `branch` | `git` | `<workspace_id>::<branch_name>` | — |
| `commit` | `git` | `<workspace_id>::<sha>` | — |
| `url` | `web` | normalized URL (lowercased host; no fragment; `?utm_*`-only stripped) | raw URL |
| `conversation` | (provider) | `<provider>:<session_id>` | — |
| `thread` | (provider) | `<provider>:<thread_id>` | — |
| `channel` | (provider) | `<provider>:<channel_id>` | — |
| `person` | (provider) | `<provider>:<account_id>` if known; else `email:<lowercased_email>` | name string |
| `doc` | (provider) | `<provider>:<workspace>:<doc_id>` | — |

## Workspace Identity & Canonical-Root Discovery (096)

The same-machine join key is the **workspace** artifact — a directory, identified by its **canonical root**, computed at capture time and stamped as `metadata.canonical_root`. This is git-*optional*: it exists for git repos, local-only repos, and plain non-git folders alike, and it is **stable across `git init`** (init does not move the directory), so pre- and post-`git init` atoms in the same folder share one key and join.

**Canonical-root discovery** (`src/capture/workspace-root.ts`, `resolveCanonicalRoot`), bounded best-effort and never throwing out of capture:

1. **git toplevel** when inside a git work tree — via a git-only `gitToplevel(path)` primitive that returns `null` on any git failure and reuses the existing 1500 ms git-probe timeout. `probeGitState.repo_root` uses *this* primitive, never the fallback chain, so 095's `git_state` semantics are preserved.
2. else **walk up to the nearest project anchor** — `.git`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pnpm-workspace.yaml`.
3. else **the reported directory itself**.

Guards: never returns an ambient root (`$HOME`, `/`, `/tmp`, `/private/tmp`, fs-root) as a *discovered* root; the `$HOME` ascent ceiling applies only when the start path is under home (so outside-home and missing-`HOME` daemon contexts still walk up). All roots are canonicalized (realpath for symlinks; case-fold on case-insensitive filesystems) before forming the key.

**`git_alias` (the 095 enrichment, demoted).** The normalized git remote URL — which item 095 made all repo-bearing adapters capture — is retained, but as a **non-join attribute at `context.ambient.git_alias`**, never as a peer join `ArtifactRef`. It exists only to feed a future cross-machine merge (the invariant: *one active join key per join domain* — emitting both a `workspace:<root>` edge and a `github:<remote>` repo edge would reintroduce alias-splitting). On the same machine, two tools in one checkout join on the workspace key; the remote URL rides along as metadata.

## Why `provider` is Part of Identity

`(provider, type, id)` is the join triple, not just `id`. The provider namespace prevents collisions across systems — a `conversation` with id `s1` in claude-code is *not* the same artifact as a `conversation` with id `s1` in cursor, even if the local string happens to match. The [[work-trace|trace layer]] keys its artifact bucket on `${provider}:${type}:${id}` for exactly this reason.

## Helpers Shipped

```ts
// src/normalize/artifacts.ts
workspaceArtifact(canonicalRoot: string): ArtifactRef;   // (096) the same-machine scope/join artifact
fileArtifact(workspaceId: string | null, absPath: string, repoRoot?: string): ArtifactRef;
repoArtifact(remoteUrl: string | null, localRoot: string): ArtifactRef;   // fallback when canonical_root absent
branchArtifact(repoId: string, branch: string): ArtifactRef;
commitArtifact(repoId: string, sha: string): ArtifactRef;
conversationArtifact(provider: string, sessionId: string): ArtifactRef;
normalizeRemoteUrl(remote: string): string;   // now feeds context.ambient.git_alias, not the join key
// resolver lives in src/capture/workspace-root.ts: resolveCanonicalRoot(path) + gitToplevel(path)
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
| **Non-git folder / repo with no remote** | Joins **same-machine** via `local:workspace:<canonical_root>` (096). | **Closed for same-machine** — the workspace key is path-based and git-optional. |
| **`git init` mid-project** | Pre- and post-init atoms in the same folder share one workspace key → join. | Closed by 096 (init doesn't move the directory). |
| **Cross-machine, non-git** | Does **not** join across machines (path is machine-local). | **Accepted boundary** — cross-machine identity assumes git (the `git_alias` carries it); content-fingerprinting was deliberately cut. |
| **Cross-machine, git-backed** | The `git_alias` (normalized remote) is captured for a future cross-machine merge; the merge itself is not yet built. | Deferred — only the alias it needs is stored today. |
| Same repo cloned in **two locations (same machine)** | Each clone's atoms join within its own canonical root; cross-clone joining is the future cross-machine concern. | Same-machine correctness first. |
| File **outside any workspace root** (`~/Downloads`, `/tmp`) | `id = abs:<absolute_path>`. Move/rename produces a new identity. | V1 doesn't chase free-floating files. |
| File path **outside the canonical root / needs `..`** | Falls back to `abs:<absolute_path>`; never emits a `..`-bearing workspace file id. | Safety — keeps file ids machine-local-but-well-formed. |
| **Temporal path reuse** (delete + recreate at same path, `/tmp` reuse) | Can wrong-merge unrelated work. | Accepted residual — solving needs fingerprints/inodes, deliberately cut. |
| File **renamed within a repo** (`git mv x.ts y.ts`) | Treated as different artifacts. | Lineage chasing requires git rename detection at trace-build time — V2. |
| File outside repo root but with repo context known | `id = abs:<absolute_path>` (the `repoId` argument is null) | The id rule keys on whether the file lives under the supplied root. |

## Implications for the Trace Layer

The [[work-trace|trace layer]] groups atoms by exact identity. Two consequences:

1. **Same-file atoms across tools join automatically.** A Claude Code turn that referenced `<workspace>::src/types.ts` and a Cursor edit on `<workspace>::src/types.ts` share an artifact and get a `shared_artifact` edge. This is the V1.5 magic.
2. **Same-workspace atoms with no shared file artifact still join via the workspace artifact (096).** Multiple files in the same checkout that touch within the time window all share `local:workspace:<canonical_root>` — the scope artifact every repo-bearing adapter now emits (replacing the repo artifact's join role). This can be too aggressive; founder dogfooding observes this signal explicitly (the open `same_repo`/`same_workspace` edge-kind refinement below).

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
