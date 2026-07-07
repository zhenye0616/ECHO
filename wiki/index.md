# ECHO Wiki — Index

Auto-generated from `.manifest.json` by `tools/wiki_index.py`. Do not edit by hand.

**Status:** 76 pages · 73 shipped · 2 planned

---

## Product — Strategic Decisions & Locked Scope

### Architecture

- [[stack-decision|Stack Decision]] — Why ECHO's daemon is TypeScript on Node.js for V1, with the Swift Accessibility shim deferred.

### Brand & Positioning

- [[brand-promise|Brand Promise]] — We don't make AI smarter. We make every AI smarter about you. Plus alternative formulations tested.

### Cohorts

- [[target-cohort-indie-ai-builders|Target Cohort: Indie AI Builders]] — V1 wedge: solo devs and small-team founders shipping AI tools. Strong founder-market-fit + warm distribution.
- [[three-cohort-comparison|Three-Cohort Comparison]] — Indie AI builders vs vibe coders vs solo SaaS founders. Why indie AI builders win the V1 wedge.

### Form Factor

- [[form-factor-decision|Form Factor Decision]] — Why no destination app. Browser extension + MCP server + hotkey overlay as the three thin presences.

### V1 Scope

- [[bundle-decision|Bundle Decision]] — V1 bundle: Cursor + Claude Code + GitHub + Slack + web AI extension. Why these 5; why not Zoom/email.
- [[echo-pro-coordinate-layer|ECHO Pro — Coordinate Layer]] — Customer-facing install boundary above the substrate — ~/.echo global home, role TOMLs, adapter sync, onboarding wizard, echoctl binary, packaged daemon. Design intent paid; shipped code has no billing (items 070-076).
- [[narrowest-v1-scope|Narrowest V1 Scope]] — L1 (passive ingestion) + L3 (summoned, Q&A + assembly) + minimal L5. Cut L2 and L4.
- [[tier-vs-vertical-slice|Tier-by-Tier vs Vertical Slice]] — Why building tier-by-tier (universal categories first) is wrong. Ship vertical slice across tiers instead.
- [[v1-spec|V1 Spec (Locked)]] — Final V1 scope: cohort, bundle, form factor, pricing, sequencing, non-goals, definition of done

---

## Principles — Active Commitments & Disciplines

### Architecture

- [[atomic-primitives-compose|Atomic Primitives, Compose]] — Each MCP tool does one thing. Compound 'do everything in one call' tools are anti-patterns. The V1.6 toolkit ships 8 atomic primitives composing via 1-2 extra MCP calls. Formalized via item 038.
- [[compose-not-capture|Compose, Don't Capture]] — ECHO ingests from tools that already capture; never builds its own capture surface for what others provide
- [[layer-above-saas|Layer Above SaaS]] — ECHO is additive to existing tools, never a replacement. The connective tissue between apps.
- [[sandboxed-capture|Sandboxed Capture]] — Capture enforced as code via the single gate chokepoint, now exercised in production by all four V1 capture surfaces.
- [[work-artifact-first-class|Work Artifact First Class]] — Repo as a first-class retrieval predicate. Every capture surface writes metadata.repo_root; every project-scoped retrieval tool accepts repo_path; cross-project bleed is structurally impossible. Landed via item 037.

### Brand & Positioning

- [[context-as-moat|Context as Moat]] — Compete on context, not capability. Adjacent to foundation models, structurally outside their wars.

### Form Factor

- [[ambient-form-factor|Ambient Form Factor]] — Browser extension + MCP server + hotkey overlay. No destination app. Three thin presences.
- [[clipboard-and-launch|Clipboard and Launch]] — Universal delivery mechanism: assemble context, copy to clipboard, open target app, user pastes.
- [[felt-not-seen|Felt, Not Seen]] — Ambient by default; visible on demand for trust. Product appears in the result, not the interface.

### V1 Scope

- [[drift-prevention|Drift Prevention]] — The discipline of not silently diverging V1 build from V1 spec. Five drift patterns + weekly audit.

---

## Architecture — The Durable Middle

### Architecture

- [[artifact-identity|Artifact Identity (the join-key contract)]] — Canonical (provider, type, id) rules that decide when two artifacts refer to the same thing — powers cross-source cluster joins.
- [[capture-allowlist|Capture Allowlist]] — Five-category allowlist (apps, domains, fs_paths, apis, git_repos) declared in src/capture/sources.ts; per-source PRs add entries.
- [[capture-gate|Capture Gate]] — Pure-function chokepoint at src/capture/gate.ts; five source kinds, six stable rejection codes, exhaustive test coverage.
- [[capture-pipeline|Capture Pipeline]] — Thin async seam joining gate to storage; processCandidate(event, storage) gates then appends; storage is dependency-injected.
- [[coord-active-trigger-and-role-emission|Coord active trigger + role emission (057b)]] — Producer-side of the coord layer: coord_invoke MCP tool (5-step path-resolver gate + causality-safe reviewer_invoked emission + pinned-request mode with bind_failed outcome), two-phase wrapper emission via coord-emit.sh, post-push hooks in strategist skills, daemon-side internal-emitter attribution model. Activates the substrate from 057a.
- [[coord-layer|Coord layer]] — Generic role↔role coordination substrate over the daemon — narrow append seam + role-typed deadline tracker + identity-gated single-writer lane. Spec 057 brainstorm + decomposition rationale; ships dormant until 057a substrate + 057b active trigger activate it. Parent overview page; substrate detail in coord-substrate-and-observability, producer-side in coord-active-trigger-and-role-emission.
- [[coord-substrate-and-observability|Coord substrate + observability (057a)]] — Daemon-side coord ledger: narrow coord_emit append seam, role-typed deadline config (ajv-validated coord-roles.json), single-actor deadline tracker with cache-hit-also-terminal fireMissedDeadline, durable boot replay + periodic reconciliation, on-demand coord_status, 100k-atom V1 perf contract. Ships dormant; 057b activates emission.
- [[group-session|Group Session]] — V1.6 cross-tool coordination pattern — AI clients work the same problem through ECHO's shared substrate via wait_for_new_turns subscriptions on each others' capture sources. Implements Goal A (synchronized human-driven); Goal C (autonomous group) deferred to V2+. First-call reliability gate (item 032) closes the resume-after-gap join pattern with structural guarantees.
- [[interface-layers|Interface Layers (1-5)]] — Five layers of user-ECHO communication. V1 ships L1, L3, minimal L5. L2 and L4 deferred.
- [[local-daemon|Local Daemon]] — Local Node process owning capture, gating, SQLite storage, and MCP retrieval. Single-instance via PID lock; loopback only.
- [[logger|Logger]] — Structured JSON-per-line logger; createLogger(source) bound to a subsystem; ECHO_LOG_LEVEL filters; one line per call to stdout.
- [[loop-observability|Loop Observability]] — The read-only health layer over ECHO's own loop: station model + doctor loop report (117), worker heartbeat artifacts (120), live loop dashboard (122), and card provenance trace incl. the recording-proxy retrieval-correlation house pattern (123).
- [[mcp-compact-view-projection|MCP Compact View Projection]] — Daemon-side field-hygiene projection (view: 'compact') for find_clusters + get_atoms — KEEP/DROP rules, composes with wire-shape caps, default 'rich' preserves byte-identical legacy output (item 064).
- [[normalization|Normalization (Read-Time)]] — Pure read-time layer that turns raw CaptureEvents into NormalizedContextEvent atoms via per-source adapters; storage stays raw.
- [[normalized-context-event|NormalizedContextEvent (the atom shape)]] — The joinable contract every read-path consumer speaks: schema_version 1, open vocabularies, observable hints, provenance to raw.
- [[signal-formation|Signal Formation (Station 2)]] — Granola signal extraction chassis: settle gate, fingerprint checkpoint, strict-JSON brain, verbatim quote anchoring, extractor_version/supersedes manifests, signal contract, skip observability.
- [[signal-window|Signal Window (getSignalWindow)]] — Internal seam: one windowed read of raw+derived context, full fidelity; event-time and append-order (late-arrival-safe) orderings; machine/company scope; canonical_subject loop filter.
- [[storage|Storage]] — Append-only Storage interface with MemoryStorage + SqliteStorage backends; WAL mode, migration runner, source_prefix + order + exclude_metadata_surface + before filters, composite (timestamp, id) ordering, canonical-Z timestamps.
- [[system-architecture|System Architecture (Minimum Component View)]] — Six components, three layers. Sources fan in; consumers fan out; the middle (gate + storage + MCP) is fixed. The whole system at a glance.
- [[timestamp-canonicalization|Timestamp Canonicalization]] — Single-chokepoint canonicalization at capture pipeline + idempotent migration on daemon startup; every events.timestamp row is canonical UTC Z form.
- [[work-trace|Work Trace (the trace layer)]] — Pure module that clusters normalized atoms into work threads via connected components; signal-bearing edge filter (role taxonomy), R1 open-loop resolution, span-inferred window_hours, format cap.

---

## Capture — Layer 1 Surfaces (Substrate's Left Edge)

### Architecture

- [[claude-code-extractor|Claude Code Extractor]] — Byte-offset tail of Claude Code session JSONL files, emitting one CaptureEvent per user/assistant turn pair.
- [[codex-extractor|Codex Extractor]] — Byte-offset tail of OpenAI Codex CLI session JSONL files; pairs user with assistant clusters and adds cwd, config, tool, reasoning, and git metadata.
- [[cursor-extractor|Cursor Extractor]] — Read-only SQLite extractor turning Cursor's globalStorage composer bubbles into per-turn user/assistant CaptureEvents. Capture degraded since 2026-05-01 — Cursor migrated to agentKv: schema; rewrite gated on cohort dogfooder, not scheduled for V1.6.
- [[fs-watcher|FS Watcher]] — First capture surface; chokidar-backed watcher emitting raw FS-event candidates under allowlisted paths, no parsing.
- [[git-capture|Git Capture]] — Hybrid chokidar+poll watcher that emits one CaptureEvent per new commit (message + diff) from allowlisted git repos.

---

## Capture / Per-App — Field-Level Data References

### Architecture

- [[claude-code-collected-data|Claude Code — Collected Data Reference]] — Field-by-field record of what ECHO reads from Claude Code's session JSONLs; user/assistant pairing, had_tool_use flag, ignored line types, empirical coverage gap on subagent JSONLs.
- [[codex-collected-data|Codex — Collected Data Reference]] — Field-by-field record of what ECHO reads from OpenAI Codex's session JSONLs; text, cwd, config, tool calls, reasoning summaries, git state, and ignored fields.
- [[cursor-collected-data|Cursor — Collected Data Reference]] — Field-by-field record of what ECHO reads from Cursor's legacy bubbleId: / composerData: schema, where it lives, and what it becomes in CaptureEvent. Capture degraded since 2026-05-01 — agentKv: migration not yet implemented.

---

## Surfaces — Layer 3 & Layer 5 (Substrate's Right Edge)

### Architecture

- [[audit-page|Audit Page]] *(planned)* — Minimal Layer 5 surface. See memories, manage permissions, forget. Settings menu, not destination.
- [[drift-alert|Drift Sweep v0 (Drift Alert)]] — Clocked contradiction detector: joins new Granola statements to confirmed team decisions on canonical_subject, strict-JSON judge, at-most-once Slack Acknowledge/Dismiss card to the owner.
- [[terminal-intake-card|Terminal Intake Card]] — Stdout surface rendering the Granola meeting -> signals -> classified decision-packet pipeline (stations 1-3) as a plain-text/ANSI card, zero Slack dependency; reuses the intake bridge verbatim with a stdout postSeed; canonical invocation npm run intake:terminal (121 entry guard).

### Form Factor

- [[browser-extension|Browser Extension]] — Already shipped. Captures web AI surfaces and web SaaS. Freemium. Funnel + thesis validator for V1.
- [[hotkey-overlay|Hotkey Overlay]] *(planned)* — System-wide summon. The Wispr Flow analog. Composer appears anywhere, returns context, disappears.
- [[hotkey-overlay-raycast|Hotkey Overlay (Raycast v0, retired)]] — RETIRED 2026-05-31 (item 081). Historical record of the v0 hotkey overlay shipped as a Raycast extension at tools/raycast-echo/ — search-context (060), ask-echo Q&A (062), sessions-as-objects (063), cluster resume singleflight (065), cold-start continuity hero (069). Removed in full once the Tauri desktop overlay became the operator surface; decisions migrated there, echo/recap retired without replacement.
- [[mcp-server|MCP Server]] — Local MCP server on 127.0.0.1:38478 exposing four tools (search_memories, get_recent_work_context, tail_session, echo_ping) to MCP-compliant AI clients over stateless StreamableHTTP; outputSchema + structuredContent + readOnlyHint on every tool.
- [[mcp-echo-resolve-mru|MCP echo_resolve_mru Tool]] — V1.6 RC2 MRU resolver — returns search_memories-ready descriptors {source, filter, phase?}; Cursor two-phase fallback (Phase 1 metadata.repo_root, Phase 2 legacy composer↔workspace registry); replaces tail_session compound modes. Item 038.
- [[mcp-find-clusters|MCP find_clusters Tool]] — V1.6 MCP discovery primitive — coherent work clusters as skeletons (atom_ids[], source_breakdown, ranks, open_loop_hints); cluster-gap controlled by window_hours; lookback by since/until. Item 032 adds no-args auto-expand (empty + single-source-recent triggers) and strict-partition demotion making prior-work clusters[0] a structural guarantee on resume-after-gap. Hard envelope ceiling 25kB; cheap.
- [[mcp-get-atom|MCP get_atom Tool]] — V1.6.1 MCP verbatim escape hatch (singular — counterpart to get_atoms plural). Returns one atom with content verbatim (no match_content clip) + metadata projected via reused projectMatch (per-key cap + tool_calls reshape) + embedding excluded. Three exit shapes: success / atom_too_large_for_wire (with source populated for JSONL fallback) / atom_not_found (distinct error). Closes Magic Moment M1-3 (long-turn elision recovery) end-to-end in-MCP — no shell, no JSONL fallback, no composer-id context required. R2 truncations-correctness fix: 'content' filtered from returned truncations after verbatim override.
- [[mcp-get-atoms|MCP get_atoms Tool]] — V1.6 MCP targeted body-fetch primitive — atom bodies by ID list (≤50), wire-shape projected through projectMatch; truncations[] trust signal on every atom; deterministic prefix-drop on 25kB overflow; item 032 adds prefer='newest_first' + missing-ID-end position + duplicate-collapse asymmetry for resume calls.
- [[mcp-recent-work-context|MCP get_recent_work_context Tool]] — DEPRECATED V1.5 MCP tool; survives in item 038 as a thin re-export shim. Cluster engine canonical home moved to src/mcp/internal/cluster-engine.ts; MCP-tool registration removal scheduled in the 2026-05-17 follow-up.
- [[mcp-search-memories|MCP search_memories Tool]] — V1 MCP retrieval tool — case-insensitive substring + filters; source_app enum + post-038 source (exact) + metadata_match (whitelisted keys workspace_id/composer_id/session_id/repo_root); post-037 repo_path; composite-cursor pagination; wire-shape projection.
- [[mcp-wait-for-new-turns|MCP wait_for_new_turns Tool]] — V1.6 MCP group-session subscription primitive — stateless long-poll on watched sources; post-038 IDs-only contract (returns turn_ids: string[], callers compose get_atoms/get_atom); post-037 repo_path; max 60s timeout; implements Goal A of group-session.
- [[echoctl-cli|echoctl CLI]] — Customer-facing CLI binary at tools/raycast-echo+dist/cli — subcommands init, doctor, run, daemon (install/start/stop/status/logs/uninstall), project (add/list/remove). Wraps launchd, drives onboarding wizard, dispatches workflows (items 074, 076).

---

## Research — Validation Work

### Validation

- [[extension-funnel-logic|Extension Funnel Logic]] — Extension and V1 are family, not pipeline. Gravitational conversion via shared thesis, not push-marketing.
- [[validation-experiments|Validation Experiments]] — Three experiments running parallel to substrate build: user interviews, landing page, concierge.
- [[wedge-vs-thesis-validation|Wedge vs Thesis Validation]] — Extension validates thesis (people pay for unified context). V1 must separately validate the dev wedge.

---

## Operating Model — Process Meta

### Architecture

- [[mcp-request-log-shutdown|MCP Request Log Shutdown Flush]] — Daemon graceful-shutdown flush of in-flight MCP request rows on SIGTERM with killed_during_shutdown status to mcp-shutdown.jsonl; P2 partial closure — non-graceful death deferred (item 067).

### Process

- [[adapter-freshness|Adapter freshness]] — Two-tier rendered-adapter freshness model. Repo-tracked adapters (.claude/commands/*) are gated in the merge invariant via sync-skills.sh --check; operator-local HOME-relative adapters (~/.codex/skills/ECHO:*) are checked operator-side in echoctl doctor via install-echo-codex-skills.sh --check (non-fatal degraded sub-check). Writer half (099): code-owned emit-sidecar.py + validate-sidecar.py over prose-template transcription. Decision rule: repo-tracked → merge gate; operator-local → doctor selftest. Items 099 + 100.
- [[automation-worktree-isolation|Automation worktree isolation (050)]] — Each automated role (reviewer, watcher, merger) runs in its own ephemeral $TMPDIR/echo-<role>-<uuid> worktree pinned to origin/main, eliminating the shared .git/index race surface. Replaces the prior sentinel-file lock convention which depended on every binding reading it. Unified ERR/EXIT cleanup; live checkout's .git/index is never written to by an automated tick.
- [[builder-bindings|Builder bindings]] — Three documented builder bindings — Claude Code (in-session via process-backlog skill), codex (headless via run-codex-builder.sh launchd wrapper), Cursor's Claude (IDE-mode via paste-trigger ritual). 055 closed the third-binding matrix. Add-a-binding recipe + cross-binding race semantics + operator-facing trigger differences.
- [[cross-tool-spec-review|Cross-Tool Spec Review]] — Multi-reviewer pattern (≥2 independent AI clients per round) for specs/code/strategy. Findings classes, strategist self-review checklist, verdict-convergence signal, evidence base from items 030+032.
- [[merge-protocol|Merge protocol]] — Founder-in-the-loop merge protocol for backlog/pending_review items. Pre-flight clean-tree check, ephemeral merger worktree (050 AC3), per-item C1-C11 loop with founder checkpoints at conflicts (C3), optional cross-vendor C3.5 consult (054), verify (C5), explicit founder live-checkout bringup at end of Step D. Thin pointer; canonical lives in skills/merge-and-cleanup.md.
- [[p1-atomic-state-transition|P1 — Atomic State Transition]] — Harness primitive that makes multi-step state moves crash-safe — single fsync'd index hop is the only legal observable transition. Worked example: process-backlog work-item stage move (item 066). Future consumer: merge-and-cleanup.
- [[review-queue-protocol|Review Queue Protocol]] — File-backed wire protocol for strategist↔reviewer handoffs — three artifacts (request.md, <reviewer>.md, combined.md), three loop exits, fresh-eyes-at-SHA invariant
- [[wave-1-2-3-retrospective|Wave 1-2-3 Retrospective]] — Process retrospective on items 001-015: where small items, atomic claim, and drift discipline paid off — and where they didn't.
