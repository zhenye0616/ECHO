---
id: 2026-05-29-082-retrieval-quality-eval-harness
title: "Retrieval quality eval harness -- journal/JSONL-grounded standard for signal-vs-noise"
status: ready
priority: HIGH
estimate: 1.5-2d
created: 2026-05-29
blocked_by: []
task_state_ref: 2026-05-29-082-retrieval-quality-eval-harness
requested_reviewers: ["codex", "codex-ops"]
files_to_modify:
  # AC1/AC2 -- human-readable standard + case schema. This is builder-owned docs, not docs/BACKLOG.md.
  - docs/retrieval-eval.md
  - eval/retrieval/schema.ts
  # AC3/AC5 -- deterministic, sanitized seed cases + fixtures. Do NOT commit unredacted private raw session logs.
  - eval/retrieval/cases/*.json
  - eval/retrieval/fixtures/*.jsonl
  # AC3/AC4/AC6 -- fixture extraction and in-process scorer/runner.
  - tools/retrieval-eval/build-fixture.ts
  - tools/retrieval-eval/run.ts
  # AC4/AC6 -- focused tests for schema, runner, metrics, budget, and failure output.
  - tests/retrieval-eval/*.test.ts
  # AC6 -- add an npm script only if the runner is implemented under tools/retrieval-eval/.
  - package.json
spec_refs:
  - CLAUDE.md  # Journal discipline and why dogfooding journals are a priority signal. The eval harness consumes journal-shaped cases but does not replace the journal.
  - backlog/_followups.md  # The recurring retrieval failures this spec turns into measurable cases: brittle paraphrase search, oversized atom recovery, stale/degraded source visibility, and silent loss.
  - wiki/architecture/local-daemon.md  # Product thesis: ECHO's IP is the silent middle -- selecting the right N fragments from thousands.
  - wiki/surfaces/mcp-search-memories.md  # Current public contract: literal substring search, exact tokens, no semantic/KNN promise. The eval must score current behavior honestly, not assume embeddings.
  - wiki/surfaces/mcp-find-clusters.md  # Discovery primitive + compact/signal-vs-noise precedent. The harness should exercise find_clusters as the default discovery path.
  - raw/internal/dogfooding/2026-05-08-v1-5-livetest-gaps.md  # Historical retrieval failure classes: stale Cursor, fs-watcher noise, skeleton spill, cross-tool clustering gaps, TZ warnings, degraded-source signal.
  - raw/internal/dogfooding/020-resolution-validation.md  # Precedent for hand-scored evals over real dogfooding traces; copy the discipline, not necessarily the exact shape.
  - src/storage/interface.ts  # CaptureEvent shape the fixtures must load into MemoryStorage.
  - src/storage/memory.ts  # In-process deterministic storage target for CI; no live daemon dependency.
  - src/mcp/tools/search-memories.ts  # Existing tool handler the harness should call directly; no production retrieval change in this item.
  - src/mcp/tools/find-clusters.ts  # Existing cluster retrieval handler; score top-rank and warning behavior here.
  - src/mcp/tools/get-atoms.ts  # Hydration handler; score whether primary evidence can be materialized inside the byte budget.
  - src/trace/rank.ts  # Rank signal context for cluster ordering; read-only unless a follow-on retrieval-fix spec is created.
  - raw/internal/decisions/2026-05-29-operator-context-layer-thesis.md  # Product framing: "serve the right slice, legibly" is the standard this eval makes falsifiable.
  - raw/internal/decisions/2026-05-29-office-hours-commoditize-agents-endgame.md  # Product/endgame thread used as one seed case for retrieval quality.

# --- agent-managed fields (filled in during run) ---
claimed_by:
claimed_at:
branch:
worktree:
head_sha:
pr_url:
agent_notes:
review_notes:
---

# 082 -- Retrieval quality eval harness

## Why this spec exists

Retrieval quality and signal-vs-noise are too broad to build against as slogans. The product-critical standard is narrower and testable:

> Good retrieval returns the primary evidence needed to answer, from the right scope, inside a small byte/call envelope, while making omissions, truncation, staleness, and source degradation explicit and keeping irrelevant or circular material out of the top context.

Today's dogfood proved both sides. Exact strategic anchors such as `signal-to-noise`, `right slice`, and `commoditize agents` recovered the intended May 29 product thread across Claude Code, Codex, git, and committed decisions. The founder's natural wording `signal vs noise` missed that thread and hit an older operational warning-quality atom. That is not a one-off UX annoyance; it is the core product risk. ECHO's moat is not "we captured lots of stuff." It is "we retrieve the right slice, legibly."

We may already be sitting on the ground truth: dogfooding journals label intent, tool inputs, returned shape, sources, verdict, and what felt missing; raw Claude/Codex JSONL carries source/timestamp/tool provenance; committed decisions/backlog/wiki artifacts carry durable answer truth. But raw JSONL is provenance truth, not relevance truth. This item creates the missing measurement layer that turns those materials into repeatable eval cases before any production retrieval/ranking change.

Friction-first compliance: this serves e1 directly. Founder-in-the-loop reduction depends on ECHO giving every AI surface the right prior context without the founder re-explaining or manually alias-steering. It also addresses the 2026-05-17 retrieval followups by converting recurring literal-search/stale-source/silent-loss failures into a gate.

## Acceptance Criteria

### AC1 — Define the retrieval-quality standard and metrics

Create `docs/retrieval-eval.md` with the exact scoring standard. The doc must define:

- **Evidence labels:** `required_primary`, `required_context`, `acceptable_context`, `noise`, and `forbidden_noise`.
- **Good retrieval:** primary evidence is present, top-ranked, scoped to the requested project/time/domain, hydratable within budget, and accompanied by explicit warnings for truncation/staleness/source gaps.
- **Signal vs noise:** signal is evidence that helps answer the intent; noise is irrelevant, wrong-project, stale-without-warning, circular/meta-summary standing in for primary work, or budget-consuming material that crowds out required evidence.
- **Non-goal:** final LLM prose quality. The V0 gate scores the evidence set and warnings first. Answer faithfulness can be a follow-on once retrieval evidence is measurable.

The metrics table must include these thresholds:

| Metric | Definition | Gate |
|---|---|---|
| `primary_recall` | Required-primary fixture refs returned and hydratable | P0 singleton must-haves = 1.00; suite >= 0.80 |
| `top_rank_success` | Primary evidence appears in first cluster or first 3 matches | true for every P0/P1 case |
| `weighted_precision_at_5` | primary=1, context=0.5, acceptable=0.25, noise=0 | >= 0.80 |
| `weighted_precision_overall` | Same weighting across the scored retrieved set | >= 0.70 |
| `signal_noise_ratio_at_10` | positive weight divided by noise count in top 10 | >= 4:1 |
| `forbidden_noise` | Circular/meta/wrong-project/stale-forbidden hits | 0 in top 10; 0 anywhere for P0 |
| `source_coverage` | Required lanes/artifacts present or explicitly warned missing | 100% P0; >= 95% suite |
| `loss_legibility` | Truncation/storage cap/TZ ambiguity/oversize/staleness warnings surfaced when applicable | 100% |
| `per_call_budget_bytes` | Serialized response envelope per tool call | hard <= 25KB; `find_clusters` target <= 10KB |
| `recipe_budget_bytes` | Total retrieved context per common intent | <= 50KB common; <= 75KB long-window consult |
| `call_efficiency` | Calls needed for common retrieval recipe | <= 3 common; <= 4 alias cases until alias layer exists |

Suite gate: all P0 cases pass, at least 90% of P1 cases pass, no hard budget violation, no P0 forbidden noise, and no silent-loss case.

### AC2 — Add a typed case schema for journal/JSONL-grounded evals

Add `eval/retrieval/schema.ts` exporting the case types and validation helpers used by the runner and tests. Use JSON case files, not YAML, to avoid a new parser dependency in V0.

Each case must carry:

- `id`, `priority` (`P0`/`P1`/`P2`), `intent`, `repo_path`, and `time_window`.
- `query_variants[]`, including the founder's natural wording when known and at least one exact-token/control variant when available.
- `tool_recipe[]`, with explicit tool name, params, and whether the step is discovery or hydration.
- `required_sources[]`, naming lanes/artifacts that must appear or be explicitly warned missing.
- Labeled fixture refs: `required_primary[]`, `required_context[]`, `acceptable_context[]`, `noise[]`, `forbidden_noise[]`.
- `must_warn[]` for expected warnings such as truncation, stale source, storage cap, local-offset ambiguity, degraded source, or oversized atom.
- `canonical_answer_facts[]`, used only to document why the primary refs are primary; the V0 scorer does not judge prose answers.
- `budgets`, with per-call bytes, total bytes, and max calls.
- `provenance`, pointing to dogfooding journal entries, raw JSONL session paths, committed artifacts, or notes that justify labels.

Labels must point to stable fixture refs, not storage-generated atom IDs. The runner is responsible for mapping fixture refs to the atom IDs assigned by `MemoryStorage` during each run.

### AC3 — Build deterministic sanitized fixtures from real provenance

Add `tools/retrieval-eval/build-fixture.ts` with two modes:

- **Committed fixture mode:** reads a case plus sanitized fixture events under `eval/retrieval/fixtures/*.jsonl` and validates that every labeled fixture ref exists. This is what CI and `npm test` use.
- **Local provenance mode:** optionally accepts explicit `--journal`, `--raw-jsonl`, and `--artifact` paths to regenerate or inspect a fixture on the founder's machine. It must not scan home directories, must not commit private raw JSONL content by default, and must emit a redaction reminder when writing fixtures.

Fixture events must be `CaptureEvent`-shaped except for an added stable `fixture_ref` field or metadata key. The builder may keep fixture refs outside `metadata` if the runner strips them before appending to `MemoryStorage`; the important invariant is that scored labels remain stable across random storage IDs.

Raw JSONL handling is intentionally modest: parse enough Claude/Codex JSONL to extract timestamp/source/content/provenance for the seed cases. Do not attempt a general import pipeline, do not mutate capture extractors, and do not treat raw JSONL as relevance labels. The relevance labels live in the case files.

### AC4 — Implement an in-process retrieval eval runner and scorer

Add `tools/retrieval-eval/run.ts` that:

- Loads case JSON and sanitized fixture JSONL.
- Appends fixture events into `MemoryStorage`.
- Runs the existing handlers directly (`searchMemories`, `findClusters`, `getAtoms`) according to the case's `tool_recipe`.
- Captures every tool response, warning, result cap, serialized byte size, and assigned atom ID.
- Normalizes returned atom IDs back to fixture refs before scoring.
- Hydrates candidate atoms when the recipe says hydration is required, then scores the hydrated evidence set.
- Emits deterministic JSON and Markdown summaries with per-case metric values, threshold pass/fail, missing primary refs, forbidden noise refs, budget totals, warnings expected vs observed, and top evidence refs.

No live daemon, MCP network call, browser/Raycast/overlay surface, embedding service, or LLM judge is allowed in CI mode. A future live-daemon dogfood mode may be a separate flag, but the default must be deterministic and isolated.

### AC5 — Seed the first case pack from the known product-critical failures

Create at least six cases and fixtures:

1. **`signal-vs-noise-alias` (P0):** founder wording `signal vs noise` should recover the May 29 "signal-to-noise / right slice" product thread. The older Cursor warning-quality atom is `forbidden_noise`.
2. **`neutrality-axis-alias` (P1):** "competition axis" should recover the "neutrality axis" decision thread and not drift into generic competitor notes.
3. **`what-shipped-today-needs-artifacts` (P0):** "what shipped today" must include git/backlog/task artifacts, not only chat summaries.
4. **`resume-after-clear-newest-first` (P0):** resume after context clear should prefer the newest meaningful cluster and hydrate newest-first atoms rather than old dense history.
5. **`generated-label-circular-retrieval` (P1):** generated Ask-ECHO/cluster labels are noise when the intent is the underlying primary work; they are acceptable only when the user explicitly asks for prior ECHO summaries.
6. **`stale-source-degraded-warning` (P0):** stale Cursor/source-prefix cases must either return fresh evidence or explicitly warn degraded/missing source coverage.

Each case must include at least two query variants: the natural wording and one control/exact-token variant. At least two cases must include cross-tool source requirements (for example Claude Code + Codex + git/artifact). At least two cases must include a `must_warn` assertion.

### AC6 — Wire a local command and failure output

Add `npm run eval:retrieval` if and only if it runs the deterministic in-process harness. The command should default to all committed cases and support:

- `--case <id>` for focused runs.
- `--format json|md` for machine or human output.
- `--update-fixtures` only in local provenance mode, never as part of tests.

Exit codes:

- `0`: all gates pass.
- `1`: cases ran but one or more gates failed.
- `2`: schema/fixture/provenance validation failed before scoring.

The Markdown output must be useful for backlog/review discussion: top failing metric first, then missing primary evidence, forbidden noise, warning gaps, budget/call counts, and the exact tool recipe that produced the result.

### AC7 — Keep production retrieval behavior unchanged

This item is measurement infrastructure only. The builder must not change ranking, query expansion, aliasing, storage, MCP wire shapes, source extraction, or result caps to make cases pass. If the harness exposes failing cases, that is an acceptable result. The correct handoff is: commit the harness, document failing metrics in `agent_notes`, and propose follow-on retrieval fixes after the standard is in place.

## Out of Scope (Don't Drift)

- No embeddings, semantic/KNN search, query expansion, alias layer, or reranker.
- No production changes under `src/mcp/tools/*`, `src/trace/*`, storage adapters, extractors, daemon server, Raycast, overlay, or browser extension.
- No new MCP tool and no live-daemon requirement for CI.
- No LLM-as-judge gate for V0.
- No broad scan of `~/.claude`, `~/.codex`, or arbitrary home-directory logs.
- No committing unredacted private raw session JSONL or full transcript bodies beyond the minimal sanitized fixture snippets needed for deterministic tests.
- No wiki edits before the item ships.
- No attempt to define all future retrieval quality. This is the first P0/P1 eval pack and runner.

## Risks

- Hand labels can encode strategist bias. Mitigation: cases must store provenance and reviewer-visible canonical answer facts; cross-vendor review checks the labels.
- Fixtures can become too synthetic. Mitigation: every seed case cites the journal/raw/artifact provenance it was derived from, and local provenance mode can regenerate/check samples on the founder machine.
- Literal query evals can overfit current tool limits. Mitigation: each case includes natural wording and exact-token controls; failures distinguish alias gap from evidence gap.
- Budget metrics can incentivize hiding evidence. Mitigation: recall, source coverage, and loss-legibility gates are hard gates alongside byte budgets.
- Circular retrieval is context-dependent. Mitigation: generated labels are forbidden only when the case intent asks for underlying primary work; they can be acceptable in summary-intent cases.
- Raw JSONL proves capture/provenance, not relevance. Mitigation: relevance labels live in reviewed case files, not inferred automatically from transcripts.

## Tests

- `tests/retrieval-eval/schema.test.ts` validates required fields, fixture-ref label integrity, budgets, priority values, and rejection of labels that reference missing fixture refs.
- `tests/retrieval-eval/scorer.test.ts` covers primary recall, top-rank success, weighted precision, signal/noise ratio, forbidden-noise failures, source coverage, warning gaps, byte budgets, and exit-code classification.
- `tests/retrieval-eval/run.test.ts` loads at least two real seed fixtures through `MemoryStorage`, calls the existing MCP handlers directly, normalizes atom IDs back to fixture refs, and snapshots the JSON summary shape without depending on random UUIDs.
- `tests/retrieval-eval/cases.test.ts` asserts all six seed cases load, each has at least two query variants, P0 cases declare required primary refs, and warning cases fail if the expected warning is absent.
- Verification command for the builder: `npm test -- tests/retrieval-eval`, `npm run typecheck`, `npm run lint`, `tools/sync-skills.sh --check`, `git diff --check`.

## After Completion (Strategist Notes)

- Promote the standard post-merge, not now. Likely wiki target: `wiki/architecture/retrieval-quality-eval.md` or a section under `wiki/architecture/local-daemon.md`, plus a link from `wiki/principles/context-as-moat.md`.
- Use the first run's failing cases to decide the next retrieval fix item. Likely candidates: semantic/alias expansion for high-value product vocabulary, field-scoped discovery fallback, or clearer degraded-source warnings.
- The 2026-05-17 `_followups.md` literal-paraphrase retrieval line is not "fixed" by this item; it is made measurable. Retire only the measurement/standard gap after this ships.
- Keep 081 reserved for the Raycast-removal item unlocked by 080's overlay dogfooding gate. This retrieval eval item deliberately uses 082.
