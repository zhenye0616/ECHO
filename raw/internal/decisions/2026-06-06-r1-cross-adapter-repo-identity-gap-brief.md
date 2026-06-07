# Gap Brief — R1: Cross-adapter repo identity split

**Status:** investigation output (shared source of truth). This brief is the single input from which a test suite and a fix spec are derived *independently*. It states the **observed symptom, root cause, mechanism, blast radius, and the desired-behavior contract** — it deliberately contains **no fix implementation and no test code**.

**Converged by:** Claude (Opus 4.8) + Codex (independent root-cause), 2026-06-06. Both arrived at the identical mechanism and file:line evidence below.

---

## 1. Observed symptom (reproduced live)

`find_clusters(repo_path=/Users/zhenye/Desktop/Project_echo)` over a 4h window returned **two** clusters for the **same checkout in the same time window**:

- rank-1 `ctx_5b528bf1` — `source_breakdown {git:1, claude_code:4}`
- rank-2 `ctx_25ea6b68` — `source_breakdown {codex:1}`

A Codex atom about the same repo, in the same window, did **not** join the Claude/git cluster. In the followups taxonomy this is Root 1, "Cross-adapter repo identity split."

## 2. Root cause (one sentence)

Codex emits the repo artifact as the **normalized GitHub remote URL**, while Claude Code and git emit the same checkout as a **`local:<path>`** artifact, and the cluster engine unions atoms only on **exact `provider:type:id` equality** — so the same checkout fragments by *which tool captured it* rather than joining by *which repo it is*.

## 3. Mechanism (per source, with evidence)

For this checkout each source produces a different repo-artifact identity:

| Source | `provider` | repo-artifact `id` | Why |
|---|---|---|---|
| `claude_code` | `local` | `local:/Users/zhenye/Desktop/Project_echo` | The Claude adapter reads `metadata.git_state.origin_url` (`src/normalize/adapters/claude-code.ts:55`), but the git probe `probeGitState` (`src/capture/git-state.ts`) captures `head_sha`/`branch`/`dirty_count` and **never `origin_url`** — and the `GitState` type (`src/capture/extractors/_turn_meta.ts:25`) has no such field. So `buildRepoArtifact` falls back to local. |
| `codex` | `github` | `https://github.com/zhenye0616/ECHO` | The Codex extractor parses `payload.git.repository_url` → `metadata.git.origin_url` (`src/capture/extractors/codex.ts:164/788`); the adapter uses it (`src/normalize/adapters/codex.ts:53`). |
| `git` | `local` | `local:/Users/zhenye/Desktop/Project_echo` | The git watcher writes only `metadata.repo_root` (`src/capture/surfaces/git-watcher.ts:198`); the git adapter **hardcodes `repoArtifact(null, repoRoot)`** (`src/normalize/adapters/git.ts:52`). |

Shared constructor (`src/normalize/artifacts.ts:33`): a remote yields `provider`/`id` from the URL; an absent remote yields `provider="local"`, `id="local:<root>"`.

**The join:** the cluster engine's union key is exactly `${provider}:${type}:${id}` (`src/trace/cluster.ts:7`). Claude and git share `local:repo:local:/Users/zhenye/Desktop/Project_echo` → they bucket together and union into one component. Codex's `github:repo:https://github.com/zhenye0616/ECHO` is a different key → separate bucket → separate cluster.

**Note on visibility:** the repo artifact's role is `scope` (`src/trace/role.ts:13`), and scope/session-only edges are filtered out of the *visible* cluster edges (`src/trace/index.ts:134`). So the repo artifact **unions the component but does not appear as a visible edge** — correctness is observable as *shared cluster membership / source_breakdown*, not as a visible repo edge.

## 4. Blast radius (beyond repo-scope clustering)

The repo `id` is embedded into every derived artifact id:
- `fileArtifact` → `${repoId}::<rel>` (`src/normalize/artifacts.ts:80`)
- `branchArtifact` → `${repoId}::<branch>` (`:123`), `commitArtifact` → `${repoId}::<sha>` (`:132`)

So Codex's file artifacts are `https://github.com/...::<rel>` while Claude/git's are `local:/...::<rel>`. The divergence therefore breaks cross-tool joining **at file / branch / commit granularity too** — including the highest-signal "work" edge (two tools touching the *same file*), not just the weak repo-scope edge.

## 5. An already-consistent identity that the join ignores

Every repo-bearing source already captures `metadata.repo_root` consistently (Claude `src/capture/extractors/claude-code.ts:555`, Codex `:784`, git `git-watcher.ts:198`), and every repo artifact already stamps `locator = localRoot`. But `find_clusters(repo_path=...)` uses `repo_root` **only to filter candidates** (`src/mcp/internal/cluster-engine.ts:126`) — it is **not** the graph join key. The join key is the divergent `id`.

## 6. Desired-behavior contract (what both the tests and the fix must target)

For a single checkout **that has a shared git remote**, every repo-bearing capture source (`claude_code`, `codex`, `git`) must resolve the repo to the **same canonical repo-artifact identity — the normalized remote URL** — such that:

1. Atoms captured by **different tools** about the **same repo**, within the cluster time window, join into **one** cluster (observable via shared cluster membership / a single cluster whose `source_breakdown` spans the contributing tools).
2. Their **derived** file/branch/commit artifacts share the same canonical repo-id prefix (so same-file cross-tool work can join).
3. The canonical identity is **machine-independent**: it must still join when the same repo is checked out at a **different local path on a different machine/OS** (founder `/Users/...` vs a Windows beta tester `C:\...`). Local-path identity cannot satisfy this; the normalized remote URL can.

**Why capture-time:** read-time can normalize URL *spelling*, but it cannot reliably *invent* a missing remote URL from a local path. The canonical remote identity must be captured/enriched consistently at capture time for all repo-bearing sources.

## 7. Boundaries (explicitly NOT part of the contract)

- **Repos with no remote** fall back to a local identity and only join same-machine. Out of scope for cross-machine joining.
- **Historical atoms** already stored with old ids will not retroactively converge from a capture-time change. Irrelevant for a fresh install (the beta tester's corpus is fresh); read-time aliasing for legacy data is a separate, deferrable concern.
- This brief does not prescribe *which files change* (that is the fix spec's job) or *how correctness is asserted* (that is the test suite's job).
