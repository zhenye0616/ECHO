---
name: using-echo-mcp
description: Use ECHO MCP to recover prior work, decisions, source context, and live cross-tool activity with disciplined trigger, fallback, and interpretation patterns.
type: skill
audience: customer
---

# Using ECHO MCP

ECHO is useful when the user expects you to remember work that happened in other AI clients, repos, commits, or sessions on this machine. Prefer a small retrieval chain, inspect the returned sources, then answer from evidence.

## Trigger Patterns

Use `find_clusters` first for open-ended recall:
- "Where did I leave off?", "what was I doing?", "catch me up", or a project reopened after a gap: call `find_clusters({})`. If you need bodies, call `get_atoms({atom_ids: cluster.atom_ids.slice(0, 50), prefer: "newest_first", format: "minimal"})`.
- "What did I do on Tuesday / today / last week?": call `find_clusters({since, until})` with explicit timezone in both timestamps (`Z` or `+HH:MM`). Then fetch only the relevant cluster's atom IDs.
- "What has been happening in this repo?": call `find_clusters({repo_path: "/absolute/repo/root", since, until})` only when the user asks for repo-scoped context. Otherwise ECHO is machine-scoped.

Use `search_memories` first for exact tokens:
- File paths, commit SHAs, issue IDs, branch names, error strings, exact phrases the user quotes.
- Good shape: `search_memories({query: "abc1234", repo_path: "/absolute/repo/root", limit: 10})`.
- `search_memories.query` is literal substring search, not semantic search. Paraphrases like "the auth decision" may return 0 even when the memory exists.

Use source/session helpers for tails and live work:
- `echo_resolve_mru({sources: ["cursor" | "claude_code" | "codex" | "git"], repo_path?})` returns a `search_memories`-ready `{source, filter}` descriptor. Spread the descriptor filter into `search_memories`.
- `wait_for_new_turns({sources, source_prefix?, since, timeout?, repo_path?})` blocks for new atoms and returns `turn_ids`; fetch bodies with `get_atoms`.
- `echo_ping({message?})` is only a connectivity check.

## Fallbacks On Empty Or Thin Results

1. Relax overly exact filters. If `source`, `source_prefix`, `metadata_match`, `repo_path`, or legacy `artifact_hint` made the call too narrow, remove the least important one and retry. `artifact_hint` applies only to `get_recent_work_context({artifact_hint: {provider, type, id}})`.
2. Widen the time window. No-arg `find_clusters` auto-expands from 4h to 24h, but if the user has been away longer, pass an explicit `since` such as the start of the relevant day or week.
3. If literal `search_memories` returns 0, reduce the query to exact tokens: path basename, SHA prefix, error code, role name, or quoted phrase. If the question is conceptual, switch to `find_clusters`.
4. If `find_clusters` returns a large generic cluster, narrow by date or `repo_path`, then fetch a small newest-first atom sample. Do not hydrate every atom by default.
5. If the split flow is not enough for an older client, use `get_recent_work_context({since, until, format: "skeleton" | "minimal", window_hours?, repo_path?})` as the all-in-one fallback. Prefer `find_clusters` + `get_atoms` for new work.

## Interpretation Discipline

Read the source fields before answering:
- `find_clusters.clusters[].source_breakdown` tells which tools contributed. Missing sources are signal.
- `rank_reason` explains why a cluster ranked highly; it is not proof that the cluster is the answer.
- Cross-project clusters are valid ECHO signal. Do not discard them unless the user explicitly asked for a repo-scoped answer.
- Cluster labels are generated summaries, not document titles. If the user asks about a label like "discussion about X", explain that it is ECHO metadata and inspect the cluster rather than searching for the label text.
- `warnings`, `result_caps.truncated`, `atom_ids_truncated`, `atoms_dropped`, and per-atom `truncations` are trust signals. Mention them when they affect confidence.

Use the right body-fetch:
- `get_atoms({atom_ids, fields?, format: "minimal", prefer?, view?})` fetches up to 50 IDs and may drop older or missing IDs under the response budget.
- Use `prefer: "newest_first"` for resume-style answers.
- `get_atom({id})` is the high-cost escape hatch for one atom when prior results show truncation. If it returns `atom_too_large_for_wire`, use the returned `source` path as the recovery pointer.

## Answering Rule

Do not present ECHO output as omniscient memory. Say what you found, from which sources, and whether retrieval was partial. If the first chain is thin, perform one disciplined fallback before asking the user for more clues.
