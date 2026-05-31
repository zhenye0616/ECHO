# Cold Reader Test — foreign-agent retrieval-actionability eval

**What it proves:** can an agent that is *not you*, with *no priors*, retrieve enough signal from ECHO **alone** to act correctly on a cross-vendor decision it never witnessed? This is the **foreign-actionability** gate — the complement to 082's **label-relevance** gate (082 = founder-as-reader, hand-labeled, deterministic, in `eval/retrieval/`). See `raw/internal/decisions/2026-05-31-office-hours-cross-vendor-context-moat.md` for why this gates the moat (axiom #7).

This is the **v0 manual** version: low-friction, instruct + audit. Not a built harness. If it keeps earning its keep, systematize it as a backlog item citing 082 as precedent.

## How to run one rung

```bash
eval/cold-reader/run.sh <case-dir>     # e.g. eval/cold-reader/run.sh 060-hotkey-overlay
```

`run.sh` runs both arms through a fresh **empty** temp dir (nothing to grep), sandbox `read-only`, prompt from stdin, and tees outputs to `eval/cold-reader/results/<case>.{on,off}.out.txt`:

- **off arm** (`off.md`) — no ECHO, base knowledge only → the **floor** (B). Should score ~0.
- **on arm** (`on.md`) — ECHO MCP as the *only* tool → the **test** (A).

Then ask Claude (or any scoring agent that is **not** the reader and is **not** you): *"use echo to retrieve + score `<case>`."* The scorer:
1. Pulls both captured Codex sessions via ECHO (`search_memories`/`find_clusters`/`get_atom`).
2. **Audits** the on-run's `metadata.tool_calls` — it must be ECHO-only. Any shell/file read → run void, rerun.
3. Scores each arm against `key.md` (4 binary facts), **verifying every fact against objective git/repo ground truth** (the human key can be stale — see 081 Fact 4).
4. Reports **A, B, and A − B**, plus the failure mode: *honest-miss* ("INSUFFICIENT FROM ECHO") = safe; *confident confabulation* = kills the thesis.

## The signal is A − B, not A

The off arm establishes that the base model can't know your private decision. Any score the on arm earns above the floor is attributable to **retrieval**, not prior knowledge.

## Adding a rung

```bash
cp -r eval/cold-reader/_template eval/cold-reader/<id>-<slug>
# edit on.md / off.md: replace <SUBJECT> with the decision (name the artifact, don't leak the answer)
# write key.md from the COMMITTED record (complete/ item + git merge commit) — never from memory
eval/cold-reader/run.sh <id>-<slug>
```

## The recency-gradient battery (the real finding is the curve)

The battery probes two axes: **recency decay** (rungs 1–3) and **retrieval difficulty** (rungs 4–5, the real frontier).

| Rung | Case | Axis | Notes | Result |
|---|---|---|---|---|
| 1 | `081-raycast` | recency (~2d) | freshest; literal token "Raycast" | **A=4/4 B=0/4** (beat key, Fact 4) |
| 2 | `060-hotkey-overlay` | recency (~2wk) | descriptive query; codex+claude review | **A=4/4 B=0/4** (beat key, Fact 3) |
| 3 | `014-search-memories` | recency (~1mo) | oldest; founder review | **A=4/4 B=0/4** (beat key, Fact 3) |
| 4 | `014-paraphrase` | **alias path** | same target as rung 3, **zero token overlap** in query — probes the substring weakness 082 flags | not yet run |
| 5 | `surface-positioning-ephemeral` | **ephemeral source** | truth lives ONLY in 2026-05-31 chat, in NO committed git artifact — needs doc UNCOMMITTED at run time | not yet run |

Rungs 1–3 showed **no recency decay and zero confabulation** — but every query hit the substring sweet spot and every truth lived in a git-committed artifact. Rungs 4 (paraphrased query) and 5 (ephemeral-only source) attack exactly those two free passes. **That's where the moat verdict actually is.**

## Scoring rubric (per question, binary)

Names the **actual** decision · cites the **real** core reasoning · surfaces the **real** dissent (or correctly reports none existed) · states the **correct** disposition. 4/4 pass · 2–3 partial (note which fact) · 0–1 fail. Verify each against git/repo, not just the key.
